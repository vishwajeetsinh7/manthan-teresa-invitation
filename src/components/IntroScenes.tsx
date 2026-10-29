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

/* ── Scene 2: envelope video → hands off to the reveal ──────────────
 * `revealBeforeEnd` seconds before the end, onReveal() fires and the card
 * starts building ON TOP of the still-playing video (its ending is white),
 * so the two feel like one continuous shot. onFinish() fires when the
 * video ends and it can unmount.                                        */
type VideoProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  veilRef: RefObject<HTMLDivElement | null>;
  playing: boolean;
  showSkip: boolean;
  onStarted: () => void;
  onReveal: () => void;
  onFinish: () => void;
};

export function VideoScene({ videoRef, veilRef, playing, showSkip, onStarted, onReveal, onFinish }: VideoProps) {
  const skipRef = useRef<HTMLButtonElement>(null);
  const revealed = useRef(false);
  const done = useRef(false);

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

  // Skip / error: flash to white, then reveal from the white veil
  const jumpToReveal = (dur: number) => {
    if (revealed.current) return finish();
    const veil = veilRef.current;
    if (!veil) return finish();
    gsap.to(veil, { opacity: 1, duration: dur, ease: "power1.in", onComplete: finish });
  };

  // Watch playback each frame
  useEffect(() => {
    if (!playing) return;
    const v = videoRef.current;
    if (!v) return;
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
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onTime);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useGSAP(
    () => {
      if (showSkip && skipRef.current) {
        gsap.to(skipRef.current, { opacity: 1, duration: 0.6, delay: timing.video.skipAppearsAfter });
      }
    },
    { dependencies: [showSkip] },
  );

  return (
    <div className="video-scene">
      <video
        ref={videoRef}
        playsInline
        preload="auto"
        poster={assets.video.poster}
        disablePictureInPicture
        onPlaying={onStarted}
        onError={() => playing && jumpToReveal(0.3)}
        aria-label="An envelope opening"
      >
        <source src={assets.video.webm} type='video/webm; codecs="vp9, opus"' />
        <source src={assets.video.mp4} type="video/mp4" />
      </video>
      {showSkip && (
        <button ref={skipRef} type="button" className="skip-btn" onClick={() => jumpToReveal(timing.video.skipFade)}>
          Skip
        </button>
      )}
    </div>
  );
}
