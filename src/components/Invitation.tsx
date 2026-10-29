"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/src/lib/gsap";
import { invitation as C } from "@/src/content/invitation";
import { timing } from "@/src/config/timing";
import { assets } from "@/src/config/assets";
import { TapScene, VideoScene } from "./IntroScenes";
import { RevealCard } from "./RevealCard";
import { Sections } from "./Sections";
import { DesktopNote } from "./DesktopNote";
import { moods, type MoodName } from "@/src/config/moods";

type Phase = "tap" | "video" | "reveal";

type DOEWithPermission = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

export function Invitation() {
  const [phase, setPhase] = useState<Phase>("tap");
  const [videoStarted, setVideoStarted] = useState(false);
  const [videoDone, setVideoDone] = useState(false);
  const [run, setRun] = useState(0);
  const [musicOn, setMusicOn] = useState(true);

  const veilRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef(false);

  /* Scene 1 tap: everything iOS needs a user gesture for happens here */
  const handleTap = () => {
    if (phase !== "tap") return;
    const v = videoRef.current;

    // 1) video with sound
    if (v) {
      v.muted = false;
      v.currentTime = 0;
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => {
          // video can't play at all → go straight to the reveal
          if (veilRef.current) gsap.set(veilRef.current, { opacity: 1 });
          setPhase("reveal");
          setVideoDone(true);
        });
      });
    }

    // 2) unlock background music for later (muted play → pause)
    const a = audioRef.current;
    if (a) {
      a.muted = true;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
          a.muted = false;
        })
        .catch(() => {
          a.muted = false;
        });
    }

    // 3) device tilt permission (iOS 13+); other browsers don't ask
    const DOE = (typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined) as DOEWithPermission | undefined;
    if (DOE?.requestPermission) {
      DOE.requestPermission()
        .then((s) => (tiltRef.current = s === "granted"))
        .catch(() => (tiltRef.current = false));
    } else {
      tiltRef.current = !!DOE;
    }

    setPhase("video");
  };

  /* Background music: fades in once the invitation reveals */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (phase === "reveal" && musicOn) {
      a.volume = 0;
      a.play()
        .then(() => gsap.to(a, { volume: timing.music.volume, duration: timing.music.fadeIn, ease: "none" }))
        .catch(() => {});
    } else {
      gsap.killTweensOf(a);
      a.pause();
    }
  }, [phase, musicOn]);

  /* Controls fade in with the reveal */
  useGSAP(
    () => {
      if (phase === "reveal" && controlsRef.current) {
        gsap.fromTo(controlsRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 1.2 });
      }
    },
    { dependencies: [phase] },
  );

  const replay = () => {
    scrollerRef.current?.scrollTo({ top: 0 });
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (veilRef.current) gsap.set(veilRef.current, { opacity: 0 });
    setVideoStarted(false);
    setVideoDone(false);
    setRun((r) => r + 1);
    setPhase("tap");
  };

  const scrollToDetails = () => {
    const s = scrollerRef.current;
    if (s) s.scrollTo({ top: s.clientHeight, behavior: "smooth" });
  };

  return (
    <main className="stage">
      <div className="stage-backdrop" aria-hidden />

      <div className="phone">
        <div ref={scrollerRef} className="scroller" data-scroll={phase === "reveal" ? "on" : "off"}>
          {phase !== "tap" && (
            <>
              <RevealCard
                key={`card-${run}`}
                active={phase === "reveal"}
                veilRef={veilRef}
                tiltRef={tiltRef}
                onScrollHint={scrollToDetails}
              />
              <Sections key={`sec-${run}`} scrollerRef={scrollerRef} enabled={phase === "reveal"} />
            </>
          )}
        </div>

        {/* event moods: colour glow driven by scroll (see Sections) */}
        {(Object.keys(moods) as MoodName[]).map((m) => (
          <div key={m} className={`mood-glow mood-${m}`} data-mood={m} aria-hidden />
        ))}

        {phase === "reveal" && (
          <div ref={controlsRef} className="controls" style={{ opacity: 0 }}>
            <button
              type="button"
              className="ctrl"
              onClick={replay}
              aria-label="Replay the opening"
              title="Replay intro"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                <path d="M4 12a8 8 0 1 0 2.4-5.7" />
                <path d="M4 4v4.5h4.5" />
              </svg>
            </button>
            <button
              type="button"
              className="ctrl"
              onClick={() => setMusicOn((m) => !m)}
              aria-label={musicOn ? "Turn music off" : "Turn music on"}
              aria-pressed={musicOn}
              title={musicOn ? "Music off" : "Music on"}
            >
              {musicOn ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                  <path d="M9 18V5l11-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="17" cy="16" r="3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                  <path d="M9 18V5l11-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="17" cy="16" r="3" />
                  <path d="M3 3l18 18" />
                </svg>
              )}
            </button>
          </div>
        )}

        {!videoDone && (
          <VideoScene
            key={`vid-${run}`}
            videoRef={videoRef}
            veilRef={veilRef}
            playing={phase !== "tap"}
            showSkip={phase === "video"}
            onStarted={() => setVideoStarted(true)}
            onReveal={() => setPhase("reveal")}
            onFinish={() => setVideoDone(true)}
          />
        )}

        {(phase === "tap" || (phase === "video" && !videoStarted)) && (
          <TapScene key={`tap-${run}`} onTap={handleTap} leaving={phase !== "tap"} />
        )}

        <div ref={veilRef} className="white-veil" aria-hidden />

        <audio ref={audioRef} src={assets.music} loop preload="none" />
      </div>

      <DesktopNote />

      <div className="rotate-note" role="alert">
        <svg className="rotate-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="15" y="6" width="18" height="36" rx="3.5" />
          <path d="M22 37h4" strokeLinecap="round" />
        </svg>
        <p style={{ fontFamily: "var(--font-script)", fontSize: 34, color: "var(--gold-light)" }}>{C.rotateNote}</p>
        <p style={{ opacity: 0.8 }}>{C.rotateSub}</p>
      </div>
    </main>
  );
}
