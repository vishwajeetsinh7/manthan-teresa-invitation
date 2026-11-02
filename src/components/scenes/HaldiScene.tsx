"use client";
/* eslint-disable @next/next/no-img-element -- pre-sized WebP cut-outs, decoded by hand before they show */

import { useRef, type CSSProperties, type RefObject } from "react";
import { gsap, useGSAP } from "@/src/lib/gsap";
import { timing } from "@/src/config/timing";
import { motionActive, onShake } from "@/src/lib/motion";
import { onTilt } from "@/src/lib/tilt";
import manifest from "@/public/scenes/haldi/manifest.json";
import layout from "@/src/config/scenes/haldi.json";
import {
  DebugMaster,
  ParticlePool,
  Reveal,
  SceneItems,
  createIdle,
  createParticles,
  gateIdle,
  makeScene,
  playOnArrival,
  revealTween,
  stageVars,
  useDebug,
  useHangingTilt,
  useSceneAssets,
  zOf,
  type Layout,
  type Manifest,
  type Region,
} from "./engine";

/**
 * The Haldi scene, "The Golden Swing": curtains part on a canopy of marigold
 * strands and umbrellas; the couple's swing descends from the beam; the
 * pookalam blooms, props settle, and haldi lands on the couple in soft dabs.
 * Then it idles — the swing a real pendulum, strands swaying — and a little
 * boy with a pichkari pops in now and then to squirt the couple.
 *
 * Shake the phone (or tap the swing) and the swing goes back and up, away from
 * us, then comes forward and down towards us — a damped pendulum in depth
 * (rotateX about the beam, in perspective) that settles over a few swings. A
 * strong push puffs turmeric from the seat, shakes marigold petals off the
 * beam and sets the umbrellas dancing. Upside down, shakes leave it alone.
 *
 * Built on the shared scene engine (./engine), placed like the Mehndi scene:
 * in the bottom part of the Haldi page, assembling (timed) as the page
 * arrives. Pieces from scripts/build-scene-assets.mjs (scripts/scenes/haldi.config.mjs);
 * layout in src/config/scenes/haldi.json. ?debug=1 shows the master.
 */
const SC = makeScene(manifest as unknown as Manifest, layout as Layout, 0.1);
const { url, box, byId, ITEMS, point } = SC;
const S = timing.sections.haldi;
const DABS = (manifest.pieces["couple-clean"] as unknown as { dabs: Region[] }).dabs;

const KINDS = {
  petals: ["petal-marigold-1", "petal-marigold-2", "petal-marigold-3", "petal-marigold-4", "petal-white-1", "petal-white-2", "petal-white-3", "petal-white-4"],
  rare: ["marigold-1", "marigold-2", "marigold-3"],
  drops: ["drop-1", "drop-2", "drop-3", "drop-4", "drop-5", "drop-6"],
  splats: ["splat-1", "splat-2", "splat-3", "splat-4"],
  sparkles: ["sparkle-1", "sparkle-2", "sparkle-3", "sparkle-4"],
};
const RUNTIME = [...new Set([...ITEMS.map((i) => i.piece), ...DABS.map((d) => d.piece!), "puff-1", "puff-2", "puff-3", ...Object.values(KINDS).flat()])].map(url);
const SH = S.swingShake;
/** the "shake to swing" hint shows once per guest */
const HINT_KEY = "invite:shake-hint";

// the swing hangs from the beam's bar, midway between its ropes
const beamBox = box(byId["beam"]);
const BAR_Y = beamBox.top + beamBox.h * 0.3;
const ROPES = ["rope-1", "rope-2"].map((id) => ({ x: byId[id].x, top: box(byId[id]).top }));
const PIVOT = { x: (ROPES[0].x + ROPES[1].x) / 2, y: BAR_Y };

export function HaldiScene({ scrollerRef, style, reduce, page }: { scrollerRef: RefObject<HTMLDivElement | null>; style: CSSProperties; reduce: boolean; page: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const ready = useSceneAssets(wrap, scrollerRef, RUNTIME);
  const debug = useDebug();
  // the hanging strands swing to follow the phone's tilt
  useHangingTilt(wrap, '[data-id^="strand-"]', ready && !reduce);

  useGSAP(
    () => {
      if (!ready || reduce) return;
      const scroller = scrollerRef.current;
      const root = wrap.current;
      if (!scroller || !root) return;
      const q = gsap.utils.selector(root);
      const stage = q(".ms-stage")[0] as HTMLElement;
      const item = (id: string) => q(`[data-id="${id}"]`)[0] as HTMLElement;
      const items = (prefix: string) => ITEMS.filter((i) => i.id.startsWith(prefix)).map((i) => item(i.id));
      const W = () => stage.clientWidth;
      const H = () => stage.clientHeight;
      const k = () => stage.clientWidth / 390;
      const rnd = gsap.utils.random;
      const px = (pt: { x: number; y: number }) => ({ x: (pt.x / 100) * W(), y: (pt.y / 100) * H() });
      const swing = q('[data-group="swing"]')[0] as HTMLElement;
      gsap.set(swing, { transformOrigin: `${PIVOT.x}% ${PIVOT.y}%` });

      /* ── assembly (T = 100 units, played in S.assemble seconds) ───────── */
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      const T = 100;

      // 0–16 %: the closed curtains part over a warm glow — gathering up as they go, they slide away
      //          behind the tied-back curtains (which sit in front of them until they are gone, then
      //          go back to their own layer, behind everyone, before anyone arrives)
      const panels = [item("panel-left"), item("panel-right")];
      const sides = [item("curtain-left"), item("curtain-right")];
      gsap.set(sides, { zIndex: 320 });
      gsap.set(panels[0], { transformOrigin: "0% 0%" });
      gsap.set(panels[1], { transformOrigin: "100% 0%" });
      tl.fromTo(q(".hs-glow"), { opacity: 1, scale: 0.6 }, { opacity: 0, scale: 1.4, duration: 16, ease: "power2.out" }, 0)
        .fromTo(panels[0], { x: 0, scaleX: 1 }, { x: () => -W() * 0.5, scaleX: 0.72, duration: 15, ease: "power3.inOut" }, 0.5)
        .fromTo(panels[1], { x: 0, scaleX: 1 }, { x: () => W() * 0.5, scaleX: 0.72, duration: 15, ease: "power3.inOut" }, 0.5)
        // the tied-back curtains stir as the panels slide in behind them
        .fromTo(sides, { skewX: 0 }, { keyframes: [{ skewX: 0.9, duration: 3 }, { skewX: -0.4, duration: 3 }, { skewX: 0, duration: 3 }], ease: "sine.inOut" }, 9)
        // (and fade softly as they go, so no strip of them is left peeking past the tie-backs)
        .to(panels, { autoAlpha: 0, duration: 5, ease: "power1.in" }, 11)
        .set(sides, { zIndex: zOf(byId["curtain-left"].z) }, 16);

      // 12–32 %: the beam lowers and settles; strands and umbrellas drop in; the swing descends
      tl.fromTo(item("beam"), { y: () => -H() * 0.16, opacity: 0 }, { y: 0, opacity: 1, duration: 7, ease: "power3.out" }, 12);
      [...items("strand-"), ...items("umbrella-")].forEach((el, i) =>
        tl.fromTo(el, { y: () => -H() * 0.2, opacity: 0 }, { y: 0, opacity: 1, duration: 6, ease: "back.out(1.8)" }, 15 + i * 1.3),
      );
      tl.fromTo(swing, { y: () => -H() * 0.55, opacity: 0 }, { y: 0, opacity: 1, duration: 10, ease: "power3.out" }, 19)
        .fromTo(swing, { rotation: 4 }, { rotation: 0, duration: 8, ease: "power2.inOut" }, 25)
        .fromTo(q(".hs-shadow"), { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 10 }, 24);

      // 32–55 %: banana plants grow; the pookalam blooms
      for (const id of ["banana-left", "banana-right"]) tl.fromTo(item(id), { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 16, ease: "power3.out" }, id.endsWith("left") ? 33 : 36);
      const pook = item("pookalam");
      tl.fromTo(pook, { clipPath: "ellipse(0% 0% at 50% 50%)", scale: 0.92 }, { clipPath: "ellipse(52% 52% at 50% 50%)", scale: 1, duration: 14, ease: "power2.out" }, 38);
      q(".hs-pop img").forEach((p, i, all) => {
        const a = -Math.PI * (0.15 + (0.7 * i) / Math.max(1, all.length - 1));
        tl.fromTo(
          p,
          { x: 0, y: 0, opacity: 0, scale: 0.4, rotation: 0 },
          { keyframes: [{ opacity: 1, scale: 1, duration: 2 }, { x: () => Math.cos(a) * W() * 0.12, y: () => Math.sin(a) * W() * 0.08, rotation: rnd(-180, 180), duration: 5 }, { opacity: 0, duration: 2 }] },
          44 + i * 0.6,
        );
      });

      // 55–78 %: props settle — matkis drop with a bounce, basket from the left, urli rises, haldi bowl from the right
      tl.fromTo(item("matkis"), { y: () => -H() * 0.18, opacity: 0 }, { y: 0, opacity: 1, duration: 8, ease: "back.out(1.6)" }, 55)
        .fromTo(item("basket"), { x: () => -W() * 0.45, opacity: 0 }, { x: 0, opacity: 1, duration: 10, ease: "power3.out" }, 57)
        .fromTo(item("urli"), { y: () => H() * 0.12, opacity: 0 }, { y: 0, opacity: 1, duration: 10, ease: "power3.out" }, 59)
        .fromTo(item("haldi-bowl"), { x: () => W() * 0.4, opacity: 0 }, { x: 0, opacity: 1, duration: 10, ease: "power3.out" }, 61);
      items("scatter-").forEach((el, i) =>
        tl.fromTo(el, { y: () => -H() * 0.1, opacity: 0, rotation: rnd(-90, 90) }, { y: 0, opacity: 1, rotation: 0, duration: 6, ease: "power2.out" }, 64 + i * 0.9),
      );

      // 78–100 %: the haldi moment — haldi lands in dabs, a puff bursts, petals shower
      q(".ms-reveal").forEach((el, i) => {
        revealTween(tl, el, 80 + i * 2.4, 4.5);
        const sp = el.parentElement!.querySelector<HTMLElement>(`.hs-dab-splat[data-i="${i}"]`);
        if (sp) tl.fromTo(sp, { scale: 0, opacity: 0, rotation: rnd(-40, 40) }, { keyframes: [{ scale: 1, opacity: 1, duration: 1.4 }, { scale: 1.2, opacity: 0, duration: 2.2 }] }, 80 + i * 2.4);
      });
      tl.fromTo(q(".hs-puff"), { scale: 0.3, opacity: 0.9 }, { scale: 1.2, opacity: 0, duration: 8, ease: "power2.out" }, 90)
        .fromTo(q(".hs-burst-spark"), { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 2.5 }, { scale: 0, opacity: 0, rotation: 90, duration: 3 }], stagger: 0.8 }, 91);
      q(".hs-shower img").forEach((p, i) =>
        tl.fromTo(
          p,
          { y: 0, opacity: 0, rotation: rnd(-60, 60) },
          { keyframes: [{ opacity: 1, duration: 1 }, { y: () => H() * rnd(0.35, 0.55), rotation: rnd(-260, 260), duration: 9 }, { opacity: 0, duration: 1.5 }], ease: "sine.inOut" },
          88 + i * 0.9,
        ),
      );
      // the turmeric handprint stamps beside "Wear yellow" (once; it stays)
      tl.call(
        () => {
          const st = document.querySelector<SVGElement>('[data-stamp="haldi-hand"]');
          if (!st || st.dataset.shown) return;
          st.dataset.shown = "1";
          gsap.fromTo(st, { scale: 1.6, opacity: 0, rotation: -24 }, { scale: 1, opacity: 0.75, rotation: -12, duration: 0.45, ease: "back.out(2.2)" });
        },
        undefined,
        86,
      );
      if (tl.duration() < T) tl.to({}, { duration: T - tl.duration() });
      gsap.set(item("boy"), { autoAlpha: 0 });

      /* ── idle ─────────────────────────────────────────────────────────── */
      const { idle, every } = createIdle();
      const { spawn, setTicking, count } = createParticles(q(".ms-particle") as HTMLImageElement[], H, url);
      let idleStarted = false;
      let assembled = false;
      // the swing: a real pendulum about the beam (sine of a steady phase); `amp` can jolt
      const amp = { v: S.swingAmp };
      const osc = { p: 0 };

      const startIdle = () => {
        if (idleStarted) return;
        idleStarted = true;
        idle.to(osc, {
          p: 1,
          duration: S.swingPeriod,
          ease: "none",
          repeat: -1,
          onUpdate: () => gsap.set(swing, { rotation: amp.v * Math.sin(osc.p * Math.PI * 2) }),
        }, 0);
        // strands and umbrellas: little pendulums from their tops; umbrellas slowly "turn"
        [...items("strand-"), ...items("umbrella-")].forEach((el) => {
          const a = rnd(1.5, 3);
          idle.fromTo(el, { rotation: -a }, { rotation: a, duration: rnd(1.3, 2.1), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 1.5));
        });
        items("umbrella-").forEach((el) => idle.fromTo(el, { scaleX: 1 }, { scaleX: 0.97, duration: rnd(1.6, 2.4), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 1)));
        // curtains billow softly from the top
        for (const id of ["curtain-left", "curtain-right"]) idle.fromTo(item(id), { skewX: -0.6 }, { skewX: 0.6, duration: rnd(2.8, 3.2), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 2));
        // banana plants sway from the base; everyone breathes (from their feet / the seat)
        for (const id of ["banana-left", "banana-right"]) idle.fromTo(item(id), { rotation: -1 }, { rotation: 1, duration: rnd(2.5, 3), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 2));
        idle.fromTo(item("couple"), { scaleY: 1 }, { scaleY: 1.006, duration: rnd(1.75, 2.25), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 2));
        // ambient: petals drifting (8 at most), the odd marigold
        every(1.1, 2, () => {
          if (count("ambient") >= S.maxAmbient) return;
          const kind = Math.random() < 0.1 ? gsap.utils.random(KINDS.rare) : gsap.utils.random(KINDS.petals);
          spawn(kind, rnd(0.06, 0.94) * W(), -0.03 * H(), { tag: "ambient", vy: rnd(15, 24) * k(), vx: rnd(-4, 4), life: 14, s: rnd(0.5, 0.8) * (kind.startsWith("marigold") ? 0.75 : 1) });
        });
        // sparkles near the couple
        const sparks = q(".ms-spark");
        let si = 0;
        every(1.6, 3, () => {
          const sp = sparks[si++ % sparks.length];
          const b = box(byId["couple"]);
          gsap.set(sp, { left: `${b.left + b.w * rnd(0.15, 0.85)}%`, top: `${b.top + b.h * rnd(0.05, 0.5)}%` });
          gsap.fromTo(sp, { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.45 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.5 }], ease: "sine.inOut" });
        });
        // the little boy: first soon after assembly, then every 20–25 s while in view
        every(S.boyEvery[0], S.boyEvery[1], boyVisit, S.boyFirst);
        // sunlight through the curtains, slowly breathing
        idle.fromTo(sun, { opacity: 0.45 }, { opacity: 0.8, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 }, 0);
        // the first time on a phone that can shake: a small "shake to swing" hint
        gsap.delayedCall(2.5, () => {
          if (!motionActive()) return;
          try {
            if (localStorage.getItem(HINT_KEY)) return;
            localStorage.setItem(HINT_KEY, "1");
          } catch {
            return;
          }
          gsap.fromTo(q(".hs-hint"), { autoAlpha: 0, y: 6 }, { keyframes: [{ autoAlpha: 1, y: 0, duration: 0.5 }, { autoAlpha: 1, duration: 3 }, { autoAlpha: 0, duration: 0.6 }] });
        });
        gate.run();
      };

      /* ── the swing in depth: a damped pendulum (θ, °) pushed by shakes / taps ── */
      const pend = { a: 0, v: 0, armed: false };
      const w0 = (2 * Math.PI) / SH.period;
      const shadow = q(".hs-shadow")[0] as HTMLElement;
      const swingPuff = q(".hs-swing-puff")[0] as HTMLElement;
      const sun = q(".hs-sun")[0] as HTMLElement;
      const umbrellas = items("umbrella-");
      let upsideDown = false;
      const unTilt = onTilt(({ angle, strength }) => (upsideDown = strength > 0.5 && Math.abs(angle) > 120));
      let lastA = 0;
      const step = (_t: number, dms: number) => {
        if (!assembled || idle.paused()) return;
        if (Math.abs(pend.a) < 0.02 && Math.abs(pend.v) < 0.05) {
          if (pend.a !== 0) {
            pend.a = pend.v = 0;
            gsap.set(swing, { rotationX: 0 });
            gsap.set(shadow, { scale: 1, y: 0, opacity: 1 });
          }
          return;
        }
        const dt = Math.min(0.05, dms / 1000);
        const acc = -w0 * w0 * (180 / Math.PI) * Math.sin((pend.a * Math.PI) / 180) - SH.damping * pend.v;
        pend.v += acc * dt;
        pend.a += pend.v * dt;
        // (pushed past its furthest: it stops there softly and falls back)
        if (Math.abs(pend.a) > SH.maxAngle) {
          pend.a = Math.sign(pend.a) * SH.maxAngle;
          pend.v = 0;
        }
        // + = towards us (nearer, lower); − = away (further, higher): rotateX about the beam
        gsap.set(swing, { rotationX: pend.a });
        // the seat's shadow on the floor follows it
        gsap.set(shadow, { scale: 1 + pend.a / 70, y: (pend.a / 100) * H() * 0.25, opacity: 1 - Math.abs(pend.a) / 50 });
        // at its furthest towards us after a strong push: a turmeric puff from the seat, the sun brightens
        if (pend.armed && pend.v < 0 && pend.a > 8 && lastA <= pend.a + 0.5) {
          pend.armed = false;
          gsap.fromTo(swingPuff, { scale: 0.3, opacity: 0.9, y: 0 }, { scale: 1.15, opacity: 0, y: () => H() * 0.04, duration: 1.2, ease: "power2.out" });
          gsap.fromTo(sun, { opacity: 0.6 }, { opacity: 1, duration: 0.3, yoyo: true, repeat: 1, ease: "sine.inOut" });
        }
        lastA = pend.a;
      };
      gsap.ticker.add(step);
      /** push the swing away from us (it then comes back towards us); k01: 0 … 1 strength */
      const push = (k01: number, speed?: number) => {
        if (!assembled) return;
        pend.v -= speed ?? SH.push[0] + (SH.push[1] - SH.push[0]) * k01;
        if (k01 < 0.6) return;
        // a strong push: the puff is armed, petals shake off the beam, the umbrellas dance, a buzz
        pend.armed = true;
        navigator.vibrate?.(12);
        const n = Math.round(rnd(5, 8));
        for (let i = 0; i < n; i++)
          spawn(gsap.utils.random([...KINDS.petals.slice(0, 4), ...KINDS.rare]), rnd(0.2, 0.8) * W(), (BAR_Y / 100) * H() + rnd(0, 6), {
            vy: rnd(10, 30) * k(),
            vx: rnd(-10, 10) * k(),
            g: 40 * k(),
            life: rnd(3, 4),
            s: rnd(0.4, 0.6),
          });
        umbrellas.forEach((u, i) =>
          gsap.to(u, {
            keyframes: [{ "--kick": 7 * (i % 2 ? -1 : 1), duration: 0.25 }, { "--kick": -4, duration: 0.4 }, { "--kick": 2, duration: 0.4 }, { "--kick": 0, duration: 0.5 }],
            ease: "sine.inOut",
            delay: i * 0.08,
          }),
        );
      };
      const unShake = onShake(
        (m) => {
          if (upsideDown) return; // upside down: leave the swing alone
          push(Math.min(1, Math.max(0, (m - SH.threshold) / (SH.strong - SH.threshold))));
        },
        SH.threshold,
        SH.cooldown,
      );
      // no sensors (desktop) or no permission: a tap on the swing pushes it
      const onTap = () => push(0.7, SH.tapPush);
      const coupleEl = item("couple");
      coupleEl.addEventListener("click", onTap);

      /* the comic beat: in from the right, plant, squirt the couple, the swing jolts, flip, out */
      const boy = item("boy");
      const boyPuff = q(".hs-boy-puff")[0] as HTMLElement;
      const boyVisit = () => {
        if (!assembled) return;
        const v = gsap.timeline();
        const run = (from: number, to: number, dur: number) =>
          v.fromTo(boy, { x: () => from * W() }, { x: () => to * W(), duration: dur, ease: from > to ? "power2.out" : "power2.in" }).fromTo(
            boy,
            { y: 0 },
            { y: () => -4 * k(), duration: 0.13, ease: "sine.out", yoyo: true, repeat: Math.round(dur / 0.13) | 1 },
            "<",
          );
        v.set(boy, { autoAlpha: 1, scaleX: 1, rotation: 0 });
        run(0.55, 0, 1.1);
        // plant the feet, the pichkari recoils
        v.to(boy, { x: () => 4 * k(), duration: 0.09, ease: "power2.out", yoyo: true, repeat: 1 }, "+=0.25");
        v.call(() => {
          const at = px(point("boy", "nozzle"));
          const n = Math.round(rnd(6, 8));
          for (let i = 0; i < n; i++)
            spawn(gsap.utils.random(KINDS.drops), at.x, at.y, {
              vx: -rnd(140, 230) * k(),
              vy: -rnd(30, 90) * k(),
              g: 480 * k(),
              vr: 0,
              r: rnd(-30, 30),
              sw: 0,
              s: rnd(0.35, 0.6),
              life: 2.2,
              land: at.y + H() * rnd(0.04, 0.14),
            });
          gsap.set(boyPuff, { left: `${(at.x / W()) * 100}%`, top: `${(at.y / H()) * 100}%` });
          gsap.fromTo(boyPuff, { scale: 0.2, opacity: 0.85, x: 0 }, { scale: 0.9, opacity: 0, x: () => -0.12 * W(), duration: 1.1, ease: "power2.out" });
          // the swing jolts a bit bigger for one cycle
          gsap.timeline().to(amp, { v: S.swingAmp * 1.7, duration: 0.35, ease: "power2.out" }).to(amp, { v: S.swingAmp, duration: S.swingPeriod, ease: "power2.inOut" });
        }, undefined, "-=0.1");
        // a beat to admire his work, then flip and run back out to the right
        v.set(boy, { scaleX: -1 }, "+=0.7");
        run(0, 0.6, 1);
        v.set(boy, { autoAlpha: 0, scaleX: 1 });
        idle.add(v, idle.time());
      };

      const gate = gateIdle(stage, idle, setTicking, () => idleStarted);
      playOnArrival({
        tl,
        stage,
        scroller,
        T,
        seconds: S.assemble,
        reverseSpeed: S.reverseSpeed,
        startAt: S.startAt,
        onComplete: () => {
          assembled = true;
          startIdle();
        },
        onLeaveBack: () => {
          // going back up: stop the idle (it restarts once the scene has assembled again)
          assembled = false;
          idle.clear();
          idleStarted = false;
          amp.v = S.swingAmp;
          pend.a = pend.v = 0;
          pend.armed = false;
          gsap.set(swing, { rotationX: 0 });
          gsap.set(boy, { autoAlpha: 0, x: 0, scaleX: 1 });
          gate.run();
        },
      });
      return () => {
        gate.dispose();
        gsap.ticker.remove(step);
        unShake();
        unTilt();
        coupleEl.removeEventListener("click", onTap);
      };
    },
    { dependencies: [ready, reduce], scope: wrap },
  );

  const couple = byId["couple"];
  const cb = box(couple);
  const coupleAspect = SC.P[couple.piece].aspect;
  const pook = box(byId["pookalam"]);

  return (
    <div ref={wrap} className="ms-wrap hs-scene" data-page={page} data-reduce={reduce || undefined} style={{ ...style, ...stageVars(SC.ASPECT) }} aria-hidden>
      <div className="ms-stage" data-ready={ready || undefined} style={{ perspectiveOrigin: `${PIVOT.x}% ${PIVOT.y}%` }}>
        {debug && <DebugMaster scene={SC} />}
        {ready && (
          <>
            <div className="hs-shadow" style={{ left: `${cb.left + cb.w * 0.05}%`, width: `${cb.w * 0.9}%`, top: `${pook.top + pook.h * 0.05}%`, height: `${pook.h * 0.55}%` }} />
            <SceneItems
              scene={SC}
              groupExtra={(name) =>
                name === "swing" ? (
                  // plain twisted cord from the beam's bar down to each flower-wrapped rope
                  // (and the turmeric puff from the seat, which swings with it)
                  <>
                    <img className="hs-swing-puff" src={url("puff-3")} alt="" style={{ left: `${couple.x}%`, top: `${cb.top + cb.h * 0.62}%` }} />
                    <svg className="hs-cords" viewBox={`0 0 100 ${100 * SC.ASPECT}`} preserveAspectRatio="none">
                    {ROPES.map((r, i) => (
                      <g key={i}>
                        <line x1={r.x} y1={BAR_Y * SC.ASPECT} x2={r.x} y2={(r.top + 0.6) * SC.ASPECT} className="hs-cord" />
                        <line x1={r.x} y1={BAR_Y * SC.ASPECT} x2={r.x} y2={(r.top + 0.6) * SC.ASPECT} className="hs-cord-twist" />
                      </g>
                    ))}
                    </svg>
                  </>
                ) : null
              }
              extra={(it) =>
                it.id === "couple"
                  ? DABS.map((d, i) => (
                      <div key={d.name}>
                        <Reveal src={url(d.piece!)} region={d} aspect={coupleAspect} />
                        <img
                          className="hs-dab-splat"
                          data-i={i}
                          src={url(KINDS.splats[i % KINDS.splats.length])}
                          alt=""
                          style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%` }}
                        />
                      </div>
                    ))
                  : null
              }
            />
            {/* the opening glow, the pookalam's popping petals, the haldi puff and shower */}
            <div className="hs-glow" />
            <div className="hs-sun" />
            <div className="hs-pop" style={{ left: `${byId["pookalam"].x}%`, top: `${byId["pookalam"].y}%` }}>
              {["petal-marigold-1", "petal-white-2", "petal-marigold-3", "petal-white-4", "petal-marigold-2"].map((n, i) => (
                <img key={i} src={url(n)} alt="" />
              ))}
            </div>
            <img className="hs-puff" src={url("puff-1")} alt="" style={{ left: `${couple.x}%`, top: `${cb.top + cb.h * 0.22}%` }} />
            {[0, 1, 2].map((i) => (
              <img
                key={`bs${i}`}
                className="hs-burst-spark"
                src={url(KINDS.sparkles[i])}
                alt=""
                style={{ left: `${couple.x + [-14, 12, -2][i]}%`, top: `${cb.top + cb.h * [0.1, 0.18, 0.02][i]}%` }}
              />
            ))}
            <div className="hs-shower">
              {Array.from({ length: 8 }, (_, i) => (
                <img key={i} src={url(KINDS.petals[i])} alt="" style={{ left: `${8 + i * 11.5}%` }} />
              ))}
            </div>
            <img className="hs-boy-puff" src={url("puff-2")} alt="" />
            {[0, 1, 2].map((i) => (
              <img key={`sp${i}`} className="ms-spark" src={url(KINDS.sparkles[i + 1])} alt="" />
            ))}
            <ParticlePool n={26} />
            <p className="hs-hint">
              <svg viewBox="0 0 24 24" aria-hidden>
                <rect x="7" y="3" width="10" height="18" rx="2.2" />
                <path d="M3.5 9 C2.5 11 2.5 13 3.5 15 M20.5 9 C21.5 11 21.5 13 20.5 15" />
              </svg>
              shake to swing
            </p>
          </>
        )}
      </div>
    </div>
  );
}
