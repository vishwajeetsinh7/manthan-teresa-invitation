"use client";

import Image from "next/image";
import { useEffect, useRef, type RefObject } from "react";
import { gsap, useGSAP } from "@/src/lib/gsap";
import { invitation as C } from "@/src/content/invitation";
import { timing } from "@/src/config/timing";
import { assets } from "@/src/config/assets";

/* ── Scene 1: envelope poster + "Tap to open" ──────────────────────── */
export function TapScene({ onTap, leaving }: { onTap: () => void; leaving: boolean }) {
  const root = useRef<HTMLButtonElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        ".tap-label",
        { opacity: 0.7, scale: 0.98 },
        { opacity: 1, scale: 1, duration: timing.tap.pulse / 2, ease: "sine.inOut", yoyo: true, repeat: -1 },
      );
      gsap.fromTo(
        ".tap-shimmer",
        { xPercent: -60 },
        { xPercent: 60, duration: 2.4, ease: "power1.inOut", repeat: -1, repeatDelay: timing.tap.shimmerEvery - 2.4 },
      );
    },
    { scope: root },
  );

  useGSAP(
    () => {
      if (leaving) gsap.to(".tap-label, .tap-shimmer", { opacity: 0, duration: 0.3, overwrite: true });
    },
    { dependencies: [leaving], scope: root },
  );

  return (
    <button ref={root} type="button" className="tap-scene" onClick={onTap} aria-label="Tap to open the invitation">
      <Image
        className="poster"
        src={assets.video.poster}
        alt="A burgundy velvet envelope sealed with a gold wax seal"
        fill
        sizes="(min-width: 768px) 430px, 100vw"
        preload
        unoptimized
      />
      <span className="tap-shimmer" aria-hidden />
      <span className="tap-label">
        <span className="tap-ring" aria-hidden />
        {C.tapToOpen}
      </span>
    </button>
  );
}

/* ── The new wax seal, laid exactly over the video's gold seal ───────
 * The video (720 × 1280, cropped to fill the screen) has its seal centred
 * at (357, 588), about 202 px across, perfectly still until ~2.9 s; then a
 * burst of light at ~3.0 s, it shrinks away by ~3.25 s and the flaps open.
 * This overlay covers it (CSS mirrors the video's crop, see .video-seal),
 * presses in when tapped, and follows the video's own clock to glow at ~1 s
 * and vanish into that burst — so the video seems to have our seal.       */
export function VideoSeal({ videoRef, opened }: { videoRef: RefObject<HTMLVideoElement | null>; opened: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  // tap: the seal presses in and springs back, a sheen crosses it
  useGSAP(
    () => {
      if (!opened) return;
      gsap
        .timeline()
        .to(".vs-press", { scale: 0.9, duration: 0.1, ease: "power2.in" })
        .to(".vs-press", { scale: 1, duration: 0.75, ease: "elastic.out(1, 0.45)" })
        .fromTo(".vs-sheen", { "--sheen": "-120%" }, { "--sheen": "120%", duration: 0.8, ease: "power2.inOut" }, 0.05);
      navigator.vibrate?.(12);
    },
    { dependencies: [opened], scope: root },
  );

  // follow the video's clock (stays in sync even if playback stutters)
  useEffect(() => {
    if (!opened || !root.current) return;
    const v = videoRef.current;
    if (!v) return;
    const q = gsap.utils.selector(root);
    const T = timing.video.seal;
    const tl = gsap
      .timeline({ paused: true })
      // the video's seal glows around 1 s — ours glows with it
      .to(q(".vs-glow"), { opacity: 0.85, scale: 1.1, duration: 0.35, ease: "sine.out" }, T.glowAt)
      .to(q(".vs-glow"), { opacity: 0.2, scale: 1, duration: 0.7, ease: "sine.inOut" }, T.glowAt + 0.35)
      // into the burst of light: swell, flare…
      .to(q(".vs-sync"), { scale: 1.08, duration: 0.15, ease: "power2.out" }, T.burstAt)
      .to(q(".vs-glow"), { opacity: 1, scale: 1.6, duration: 0.18, ease: "power2.out" }, T.burstAt)
      // …then shrink away a step ahead of the video's own seal, so it never peeks out
      .to(q(".vs-sync"), { scale: 0.42, duration: 0.2, ease: "power2.in" }, T.burstAt + 0.15)
      .to(q(".vs-sync"), { scale: 0, opacity: 0, duration: 0.22, ease: "power2.in" }, T.burstAt + 0.35)
      .to(q(".vs-glow"), { opacity: 0, duration: 0.3 }, T.burstAt + 0.2);
    let raf = 0;
    const sync = () => {
      tl.time(Math.min(v.currentTime, tl.duration()));
      if (v.currentTime < tl.duration()) raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);
    const onTime = () => tl.time(Math.min(v.currentTime, tl.duration()));
    v.addEventListener("timeupdate", onTime);
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("timeupdate", onTime);
      tl.kill();
    };
  }, [opened, videoRef]);

  return (
    <div ref={root} className="video-seal" aria-hidden>
      <div className="vs-sync">
        <div className="vs-glow" />
        <div className="vs-shadow" />
        <div className="vs-press">
          <Image src={assets.seal} alt="" fill unoptimized preload sizes="160px" draggable={false} />
          <div className="vs-sheen" />
        </div>
      </div>
    </div>
  );
}

/* ── Scene 2: envelope video → hands off to the reveal ──────────────
 * `revealBeforeEnd` seconds before the end, onReveal() fires and the card
 * starts building ON TOP of the still-playing video (its ending is white),
 * so the two feel like one continuous shot. onFinish() fires when the
 * video ends and it can unmount.                                        */
type VideoProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  veilRef: RefObject<HTMLDivElement | null>;
  playing: boolean;
  onStarted: () => void;
  onReveal: () => void;
  onFinish: () => void;
};

export function VideoScene({ videoRef, veilRef, playing, onStarted, onReveal, onFinish }: VideoProps) {
  const revealed = useRef(false);
  const done = useRef(false);
  const started = useRef(false);

  const reveal = () => {
    if (revealed.current) return;
    revealed.current = true;
    const v = videoRef.current;
    if (v) gsap.to(v, { volume: 0, duration: timing.video.audioFade, ease: "none" }); // ignored on iOS
    onReveal();
  };

  const finish = () => {
    if (done.current) return;
    done.current = true;
    reveal();
    videoRef.current?.pause();
    onFinish();
  };

  // Error / safety nets: flash to white, then reveal from the white veil.
  // The reveal is started by a plain timer, not by the fade finishing, so a
  // slow/throttled animation frame can never leave the guest stuck.
  const jumping = useRef(false);
  const jumpToReveal = (dur: number) => {
    if (revealed.current) return finish();
    if (jumping.current) return;
    jumping.current = true;
    const veil = veilRef.current;
    if (veil) gsap.to(veil, { opacity: 1, duration: dur, ease: "power1.in" });
    window.setTimeout(() => {
      if (veil) {
        gsap.killTweensOf(veil);
        gsap.set(veil, { opacity: 1 });
      }
      finish();
    }, dur * 1000 + 40);
  };

  // remember if every <source> failed (can happen before the tap)
  const sourcesFailed = useRef(false);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sources = v.querySelectorAll("source");
    const last = sources[sources.length - 1];
    const onFail = () => (sourcesFailed.current = true);
    last?.addEventListener("error", onFail);
    return () => last?.removeEventListener("error", onFail);
  }, [videoRef]);

  // Watch playback each frame
  useEffect(() => {
    if (!playing) return;
    const v = videoRef.current;
    if (!v) return;
    // nothing playable at all → open straight away
    if (sourcesFailed.current || v.error || v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      jumpToReveal(0.3);
      return;
    }
    let raf = 0;
    /** returns true once the video is over */
    const check = () => {
      const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
      if (dur && v.currentTime >= Math.max(0, dur - timing.video.revealBeforeEnd)) reveal();
      if (v.ended || (dur && v.currentTime >= dur - 0.04)) {
        finish();
        return true;
      }
      return false;
    };
    // frame-accurate when frames run; `timeupdate` backs it up if rAF is throttled
    const loop = () => {
      if (!check()) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onTime = () => void check();
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onTime);

    /* Safety nets — the invitation must open even if the video doesn't:
       1. it never starts (slow network, codec, in-app browser quirks)
       2. it freezes part-way (stall, interrupted by the OS)
       3. none of its sources can be played                              */
    const { startTimeout, stallTimeout } = timing.video;
    const startTimer = window.setTimeout(() => {
      if (!started.current && !revealed.current) jumpToReveal(0.4);
    }, startTimeout * 1000);

    let lastT = -1;
    let lastMove = performance.now();
    const stallTimer = window.setInterval(() => {
      if (!started.current || done.current) return;
      if (v.currentTime !== lastT) {
        lastT = v.currentTime;
        lastMove = performance.now();
        return;
      }
      if (v.paused && !v.ended) v.play().catch(() => {}); // e.g. paused by the OS
      if (performance.now() - lastMove > stallTimeout * 1000) jumpToReveal(0.4);
    }, 500);

    const sources = v.querySelectorAll("source");
    const lastSource = sources[sources.length - 1];
    const onSourceError = () => jumpToReveal(0.3);
    lastSource?.addEventListener("error", onSourceError);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(startTimer);
      window.clearInterval(stallTimer);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onTime);
      lastSource?.removeEventListener("error", onSourceError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  return (
    <div className="video-scene">
      <video
        ref={videoRef}
        playsInline
        muted // silent: the background song is the only sound
        preload="auto"
        poster={assets.video.poster}
        disablePictureInPicture
        onPlaying={() => {
          started.current = true;
          onStarted();
        }}
        onError={() => playing && jumpToReveal(0.3)}
        aria-label="An envelope opening"
      >
        {/* MP4 (H.264) first: hardware-decoded on every iPhone and Android */}
        <source src={assets.video.mp4} type="video/mp4" />
        <source src={assets.video.webm} type='video/webm; codecs="vp9, opus"' />
      </video>
    </div>
  );
}
