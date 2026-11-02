"use client";
/* eslint-disable @next/next/no-img-element -- pre-sized WebP cut-outs, decoded by hand before they show */

import { useMemo, useRef, type CSSProperties, type RefObject } from "react";
import { gsap, useGSAP } from "@/src/lib/gsap";
import { timing } from "@/src/config/timing";
import manifest from "@/public/scenes/mehndi/manifest.json";
import layout from "@/src/config/scenes/mehndi.json";
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
 * The Mehndi scene: the bride and the groom on their cushions. A round carpet
 * spins open and lands, the bride rises in, the toran drops, the groom slides
 * in on his cushion pointing at her palm, the props arrive and henna blooms on
 * her palms. Then the hidden initial: he leans in, a script letter draws
 * itself on her palm in gold and settles into her henna, a heart rises
 * between them and he puts his hand on his heart. Then it idles gently.
 *
 * Built on the shared scene engine (./engine). Pieces, pivots, the lamp's
 * flame anchors, the henna palms and the groom's two aligned poses come from
 * scripts/build-scene-assets.mjs (scripts/scenes/mehndi.config.mjs); where
 * everything sits is src/config/scenes/mehndi.json, fitted to master-v2.
 * ?debug=1 shows the master.
 */
const SC = makeScene(manifest as unknown as Manifest, layout as Layout, 0);
const { url, box, byId, ITEMS, point } = SC;
const S = timing.sections.scene;

const PARTICLE_KINDS = {
  ambient: ["petal-marigold-1", "petal-marigold-2", "petal-marigold-3", "petal-marigold-4", "petal-rose-1", "petal-rose-2", "petal-rose-3", "petal-rose-4", "jasmine-1", "jasmine-2", "jasmine-3", "jasmine-4"],
  rare: ["marigold-1", "marigold-2", "marigold-3"],
  petals: ["petal-marigold-1", "petal-marigold-2", "petal-rose-3", "petal-rose-4", "petal-marigold-4", "petal-rose-1"],
  sparkles: ["sparkle-1", "sparkle-2", "sparkle-3", "sparkle-4"],
};

/** the round carpet (falls back to the old flat rug if carpet.png was not built) */
const HAS_CARPET = "carpet" in manifest.pieces && !!byId["carpet"];
const hidden = (id: string) => id === "carpet" || (HAS_CARPET && id === "rug");
/** everything the stage shows (bride-henna is only used to build the palms) */
const RUNTIME = [
  ...new Set([...ITEMS.filter((i) => !(HAS_CARPET && i.id === "rug")).map((i) => i.piece), "bride-palms", "flame-1", "flame-2", "flame-3", ...Object.values(PARTICLE_KINDS).flat()]),
].map(url);

/* ── the hidden initial: hand-lettered script strokes (not a font), drawn in order ── */
const LETTERS: Record<string, string[]> = {
  M: [
    "M3 49 C9 47 13 37 17 27 C21 17 25 8 29 8 C32 8 31 19 30 30 C29.4 38 29 45 29.5 49",
    "M29.5 49 C33 39 38 24 43 14 C46 8 50 6 52 9 C54 13 51 28 50.5 38",
    "M50.5 38 C50 45 51 50 55 50 C58 50 61 47 62 44",
  ],
};
const LETTER = LETTERS[S.hiddenInitial] ?? LETTERS.M;
const HENNA = "#7B3418";
const HEART = "M12 21 C12 21 3 14.6 3 8.7 C3 5.5 5.4 3 8.4 3 C10 3 11.3 3.8 12 5 C12.7 3.8 14 3 15.6 3 C18.6 3 21 5.5 21 8.7 C21 14.6 12 21 12 21 Z";

// where things are (stage %)
const PALM = point("bride", "palm");
const PALM_W = (point("bride", "palmEdge").x - PALM.x) * 2;
const TIP = point("groom", "fingertip");
const HEART_AT = { x: (TIP.x + PALM.x) / 2 + 1, y: PALM.y - 4 };
const GROOM_HEART = point("groom-b", "heart");

export function MehndiScene({ scrollerRef, style, reduce }: { scrollerRef: RefObject<HTMLDivElement | null>; style: CSSProperties; reduce: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const ready = useSceneAssets(wrap, scrollerRef, RUNTIME);
  const debug = useDebug();
  // the toran strands swing to follow the phone's tilt
  useHangingTilt(wrap, '[data-id^="toran-"]', ready && !reduce);

  useGSAP(
    () => {
      if (!ready || reduce) return;
      const scroller = scrollerRef.current;
      const root = wrap.current;
      if (!scroller || !root) return;
      const q = gsap.utils.selector(root);
      const stage = q(".ms-stage")[0] as HTMLElement;
      const item = (id: string) => q(`[data-id="${id}"]`)[0] as HTMLElement;
      const W = () => stage.clientWidth;
      const H = () => stage.clientHeight;
      const k = () => stage.clientWidth / 390; // px per design px
      const rnd = gsap.utils.random;
      const { spawn, setTicking, count } = createParticles(q(".ms-particle") as HTMLImageElement[], H, url);

      /* ── assembly: the carpet (0–15 %) in S.carpetSeconds, the rest (15–93 %) in S.assemble
            seconds, then the hidden initial ── */
      let assembled = false;
      let lastRun = -Infinity;
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      const C = S.carpetSeconds;
      const u = S.assemble / 78; // seconds per % after the carpet
      const at = (pct: number) => (pct <= 15 ? (pct / 15) * C : C + (pct - 15) * u);
      const dur = (pct: number) => pct * u;
      const cd = (pct: number) => (pct / 15) * C; // within the carpet's act

      const groomA = item("groom");
      const groomB = item("groom-b");
      const grooms = [groomA, groomB];
      gsap.set(groomB, { autoAlpha: 0 });

      // 0–15 %: the carpet spins open from its centre, lifts a little, floats down and lands
      const carpet = q(".mh-carpet")[0] as HTMLElement | undefined;
      if (HAS_CARPET && carpet) {
        const spins = q(".mh-carpet-spin");
        // (one slow turn and a little more, easing out — then it keeps turning slowly while idle)
        tl.fromTo(carpet, { scale: 0.15, opacity: 0 }, { scale: 1, duration: cd(12), ease: "power2.out" }, 0);
        tl.to(carpet, { opacity: 1, duration: cd(2), ease: "none" }, 0);
        tl.fromTo(spins, { rotation: -420 }, { rotation: 0, duration: cd(14.5), ease: "power2.out" }, 0);
        tl.fromTo(carpet, { y: 0 }, { y: () => -12 * k(), duration: cd(6), ease: "sine.out" }, cd(1));
        tl.to(carpet, { y: 0, duration: cd(8), ease: "back.out(1.3)" }, cd(7));
        // on landing: petals fly out from its edge along the oval; a ring of gold dust spreads
        tl.call(() => carpetPetals(), undefined, cd(14));
        tl.fromTo(q(".mh-dust"), { scale: 0.92, opacity: 0 }, { keyframes: [{ opacity: 0.9, scale: 1, duration: 0.15 }, { opacity: 0, scale: 1.16, duration: 0.85, ease: "power2.out" }] }, cd(14));
      } else {
        const rug = item("rug");
        gsap.set(rug, { transformOrigin: "50% 60%" });
        tl.fromTo(rug, { scaleX: 0.12, scaleY: 0.3, opacity: 0 }, { scaleX: 1, scaleY: 1, opacity: 1, duration: cd(13), ease: "power3.out" }, 0);
      }
      tl.fromTo(q(".ms-shadow"), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: dur(10) }, at(12));

      // 15–25 %: the bride rises in on her cushion
      tl.fromTo(item("bride"), { y: () => 30 * k(), opacity: 0 }, { y: 0, opacity: 1, duration: dur(10), ease: "power3.out" }, at(15));

      // 25–38 %: the toran — the cord draws, the strands drop in one by one and settle
      const strands = ITEMS.filter((i) => i.id.startsWith("toran-")).map((i) => item(i.id));
      tl.fromTo(q(".ms-cord-path"), { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: dur(8), ease: "power2.inOut" }, at(25));
      tl.fromTo(q(".ms-cord-bead"), { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: dur(3), ease: "back.out(3)", stagger: dur(0.6) }, at(27));
      strands.forEach((s, i) => tl.fromTo(s, { y: () => -H() * 0.32, opacity: 0 }, { y: 0, opacity: 1, duration: dur(6.5), ease: "back.out(1.7)" }, at(26 + i * 1)));

      // 38–60 %: the groom slides in from the right on his cushion (pointing), easing to a soft stop
      //          with a tiny settle; the banana plants grow
      tl.fromTo(grooms, { x: () => W() * 0.62 }, { x: 0, duration: dur(19), ease: "back.out(1.15)" }, at(38));
      tl.fromTo(groomA, { opacity: 0 }, { opacity: 1, duration: dur(3), ease: "none" }, at(38));
      for (const id of ["banana-left", "banana-right"])
        tl.fromTo(item(id), { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: dur(18), ease: "power3.out" }, at(id.endsWith("left") ? 39 : 42));

      // 60–85 %: the front props slide in; the lamp lights as it settles
      const slide = (id: string, fx: number, fy: number, pct: number) =>
        tl.fromTo(item(id), { x: () => fx * W(), y: () => fy * H(), opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: dur(14), ease: "power3.out" }, at(pct));
      slide("dholak", -0.45, 0.1, 60);
      slide("uruli", -0.35, 0.14, 63);
      slide("lamp", 0.4, 0, 62);
      slide("bolster", 0.45, 0.03, 66);
      slide("cone-basket", 0, 0.22, 69);
      tl.fromTo(q(".ms-flame"), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: dur(6), ease: "back.out(2)", stagger: dur(0.7) }, at(76));

      // 85–93 %: henna blooms on her palms (a radial wipe), petals and sparkles burst around her
      q(".ms-reveal").forEach((el, i) => revealTween(tl, el, at(85.5 + i * 1.2), dur(6.5)));
      q(".ms-burst img:not(.ms-burst-spark)").forEach((p, i, all) => {
        const a = (i / all.length) * Math.PI * 2 + rnd(-0.3, 0.3);
        const r = rnd(0.12, 0.2);
        tl.fromTo(
          p,
          { x: 0, y: 0, scale: 0.3, opacity: 0, rotation: 0 },
          {
            keyframes: [
              { opacity: 1, scale: 1, duration: dur(2) },
              { x: () => Math.cos(a) * r * W(), y: () => Math.sin(a) * r * W() + 0.05 * W(), rotation: rnd(-200, 200), duration: dur(6) },
              { opacity: 0, duration: dur(2) },
            ],
            ease: "power2.out",
          },
          at(86 + (i % 3) * 0.4),
        );
      });
      tl.fromTo(q(".ms-burst-spark"), { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: dur(2.5) }, { scale: 0, opacity: 0, rotation: 90, duration: dur(3) }], stagger: dur(0.8) }, at(87.5));

      // 93–100 %: the hidden initial
      const t0 = at(93);
      const letter = q(".mh-initial")[0];
      const goldLine = q(".mh-initial-gold .mh-line");
      const goldInk = q(".mh-initial-gold .mh-ink");
      const henna = q(".mh-initial-henna")[0];
      gsap.set(letter, { autoAlpha: 0, scale: 2.4 });
      gsap.set(henna, { opacity: 0 });
      // 1. he leans in towards her, about his cushion
      tl.to(grooms, { rotation: -2, duration: 0.5, ease: "sine.inOut" }, t0);
      // 2. on her palm a script letter draws itself, stroke by stroke, in glowing gold (big enough to read)…
      tl.to(letter, { autoAlpha: 1, duration: 0.15 }, t0 + 0.3);
      LETTER.forEach((_, i) => tl.fromTo([goldLine[i], goldInk[i]], { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.34, ease: "power1.inOut" }, t0 + 0.3 + i * 0.3));
      // 3. …then settles into her palm in henna brown, with a gold glint and sparkles
      tl.to(letter, { scale: 1, duration: 0.55, ease: "power2.inOut" }, t0 + 1.35);
      tl.to(henna, { opacity: 0.85, duration: 0.45 }, t0 + 1.5);
      tl.to(q(".mh-initial-gold"), { opacity: 0, duration: 0.45 }, t0 + 1.55);
      tl.fromTo(q(".mh-palm-sparks img"), { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.25 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.35 }], stagger: 0.07 }, t0 + 1.75);
      // 4. a little heart pops up between them and floats away; 5. he straightens (and, if the
      //    config says "b", puts his hand to his heart; "a" keeps him pointing at her palm)
      const heart = q(".mh-heart")[0];
      tl.fromTo(heart, { scale: 0, y: 0, opacity: 0 }, { keyframes: [{ scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2.6)" }, { y: () => -H() * 0.12, opacity: 0, duration: 1, ease: "sine.in" }] }, t0 + 1.8);
      tl.to(grooms, { rotation: 0, duration: 0.4, ease: "sine.inOut" }, t0 + 1.8);
      if (S.groomFinal === "b") {
        tl.to(groomA, { autoAlpha: 0, duration: 0.28, ease: "sine.inOut" }, t0 + 1.9);
        tl.to(groomB, { autoAlpha: 1, duration: 0.28, ease: "sine.inOut" }, t0 + 1.9);
      }
      tl.fromTo(q(S.groomFinal === "b" ? ".mh-heart-sparks img" : ".mh-tip-sparks img"), { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.22 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.3 }], stagger: 0.08 }, t0 + 2.1);
      tl.to({}, { duration: 0.01 }, t0 + S.initialSeconds);
      gsap.set(item("flower-girl"), { opacity: 0 });

      /** petals thrown out from the carpet's edge as it lands (along the oval) */
      const carpetPetals = () => {
        const c = byId["carpet"];
        const rx = ((c.w * RIM_SHARE) / 200) * W();
        const ry = rx * Math.cos((S.carpetTilt * Math.PI) / 180);
        const cx = (c.x / 100) * W();
        const cy = (c.y / 100) * H();
        const n = Math.round(rnd(10, 14));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rnd(-0.2, 0.2);
          const v = rnd(60, 95) * k();
          spawn(gsap.utils.random(PARTICLE_KINDS.petals), cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, {
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v * 0.35 - rnd(30, 55) * k(),
            g: 110 * k(),
            s: rnd(0.4, 0.6),
            life: rnd(1.6, 2.2),
            sw: rnd(3, 6),
          });
        }
      };

      /* ── idle: alive but calm ─────────────────────────────────────────── */
      const { idle, every } = createIdle();
      let idleStarted = false;
      const twinkle = (els: Element[]) =>
        gsap.fromTo(els, { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.3 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.4 }], stagger: 0.08 });

      const startIdle = () => {
        if (idleStarted) return;
        idleStarted = true;
        // strands: pendulum sway about their loop, each with its own period and phase
        strands.forEach((s) => idle.fromTo(s, { rotation: -rnd(2, 3) }, { rotation: rnd(2, 3), duration: rnd(1.4, 2), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 1.5)));
        // banana plants: a slow sway from the pot
        for (const id of ["banana-left", "banana-right"]) idle.fromTo(item(id), { rotation: -1 }, { rotation: 1, duration: rnd(2.6, 3), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 2));
        // the bride and the groom breathe (from their cushions)
        idle.fromTo(item("bride"), { scaleY: 1 }, { scaleY: 1.006, duration: rnd(1.75, 2.25), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 2));
        idle.fromTo(grooms, { scaleY: 1 }, { scaleY: 1.006, duration: rnd(1.9, 2.3), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 2));
        // now and then he leans towards her, and back
        every(S.lean[0], S.lean[1], () => gsap.to(grooms, { keyframes: [{ rotation: -1.5, duration: 0.8 }, { rotation: 0, duration: 0.8 }], ease: "sine.inOut" }));
        // a small heart rises between them
        const hearts = q(".mh-heart-idle");
        let hi = 0;
        every(S.hearts[0], S.hearts[1], () => {
          const h = hearts[hi++ % hearts.length];
          gsap.fromTo(h, { scale: 0.4, y: 0, x: 0, opacity: 0 }, { keyframes: [{ scale: 0.8, opacity: 0.9, duration: 0.4, ease: "back.out(2)" }, { y: () => -H() * 0.1, x: () => rnd(-4, 4) * k(), opacity: 0, duration: 1.6, ease: "sine.in" }] });
        }, 3);
        // a soft sweep of gold light across the letter
        const glint = q(".mh-glint-grad")[0];
        every(S.glint * 0.9, S.glint * 1.1, () => {
          gsap.fromTo(glint, { attr: { x1: -30, x2: -6 } }, { attr: { x1: 66, x2: 90 }, duration: 1.3, ease: "sine.inOut" });
        }, 2);
        // the carpet keeps turning, slowly
        if (S.carpetIdleSpin) idle.to(q(".mh-carpet-spin"), { rotation: "+=360", duration: S.carpetSpinSeconds, ease: "none", repeat: -1 }, 0);
        // lamp flames: cycle the three shapes, flicker, glow
        q(".ms-flame").forEach((f) => {
          const imgs = f.querySelectorAll("img");
          const glow = f.querySelector(".ms-glow");
          idle.to(f, { scaleY: () => rnd(0.86, 1.12), scaleX: () => rnd(0.92, 1.06), duration: () => rnd(0.09, 0.18), ease: "sine.inOut", repeat: -1, repeatRefresh: true }, rnd(0, 0.3));
          idle.to(glow, { opacity: () => rnd(0.5, 0.95), scale: () => rnd(0.9, 1.15), duration: () => rnd(0.12, 0.25), repeat: -1, repeatRefresh: true }, 0);
          let n = 0;
          every(0.12, 0.26, () => {
            n = (n + 1) % imgs.length;
            imgs.forEach((im, j) => gsap.to(im, { opacity: j === n ? 1 : 0, duration: 0.08, overwrite: "auto" }));
          });
        });
        // ambient: petals, jasmine buds, the odd marigold drift down (8 at most)
        every(1.2, 2.2, () => {
          if (count("ambient") >= S.maxAmbient) return;
          const kind = Math.random() < 0.12 ? gsap.utils.random(PARTICLE_KINDS.rare) : gsap.utils.random(PARTICLE_KINDS.ambient);
          spawn(kind, rnd(0.05, 0.95) * W(), -0.04 * H(), { tag: "ambient", vy: rnd(16, 26) * k(), vx: rnd(-4, 4), life: 14, s: rnd(0.5, 0.8) * (kind.startsWith("marigold") ? 0.8 : 1) });
        });
        // sparkles twinkle near the lamp and around the couple
        const sparks = q(".ms-spark");
        let si = 0;
        every(1.2, 2.6, () => {
          const sp = sparks[si++ % sparks.length];
          const where = Math.random();
          const b = box(byId[where < 0.4 ? "lamp" : where < 0.75 ? "bride" : "groom-b"]);
          gsap.set(sp, { left: `${b.left + b.w * rnd(0.1, 0.9)}%`, top: `${b.top + b.h * (where < 0.4 ? rnd(0, 0.25) : rnd(0.05, 0.45))}%` });
          gsap.fromTo(sp, { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.45 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.5 }], ease: "sine.inOut" });
        });
        // the odd twinkle on the letter in her palm
        every(7, 11, () => twinkle(q(".mh-palm-sparks img").slice(0, 2)), 5);
        gate.run();
      };

      // the flower girl runs across the front, petals spilling from her basket
      const girl = item("flower-girl");
      const runGirl = () => {
        lastRun = performance.now();
        const gb = box(byId["flower-girl"]);
        const dash = gsap.timeline();
        dash
          .fromTo(girl, { x: () => -W() * 0.8, opacity: 1 }, { x: () => W() * 0.85, duration: S.girlRun, ease: "sine.inOut" }, 0)
          .fromTo(girl, { y: 0 }, { y: () => -5 * k(), duration: 0.16, ease: "sine.out", yoyo: true, repeat: Math.round(S.girlRun / 0.16) }, 0)
          .fromTo(girl, { rotation: -1.5 }, { rotation: 1.5, duration: 0.32, ease: "sine.inOut", yoyo: true, repeat: Math.round(S.girlRun / 0.32) }, 0)
          .set(girl, { opacity: 0 });
        const spill = () => {
          const gx = (gb.left / 100) * W() + (gsap.getProperty(girl, "x") as number);
          const gy = (gb.top / 100) * H();
          spawn(gsap.utils.random(PARTICLE_KINDS.petals), gx + (gb.w / 100) * W() * S.basket[0], gy + (gb.h / 100) * H() * S.basket[1], {
            vy: rnd(30, 50) * k(),
            vx: rnd(-30, -10) * k(),
            life: rnd(1.4, 2),
            s: rnd(0.4, 0.55),
          });
        };
        for (let t = 0.25; t < S.girlRun - 0.3; t += 0.14) dash.call(spill, undefined, t);
        idle.add(dash, idle.time());
      };

      // idle only while on screen; back in view after a while → the flower girl runs again
      // (particles fly during the assembly too: the carpet's petals)
      const gate = gateIdle(stage, idle, (on) => setTicking(on || tl.isActive()), () => idleStarted, () => {
        if (assembled && performance.now() - lastRun > S.girlEvery * 1000) runGirl();
      });
      setTicking(true);
      const total = tl.duration();
      playOnArrival({
        tl,
        stage,
        scroller,
        T: total,
        seconds: total,
        reverseSpeed: S.reverseSpeed,
        startAt: S.startAt,
        onComplete: () => {
          assembled = true;
          startIdle();
          if (performance.now() - lastRun > S.girlEvery * 1000) runGirl();
        },
        onLeaveBack: () => {
          // going back up: stop the idle (it restarts once the scene has assembled again)
          assembled = false;
          idle.clear();
          idleStarted = false;
          gate.run();
        },
      });
      return () => gate.dispose();
    },
    { dependencies: [ready, reduce], scope: wrap },
  );

  const bride = byId["bride"];
  const bb = box(bride);
  const brideAspect = SC.P[bride.piece].aspect; // w / h
  const palms = (manifest.pieces["bride-plain"] as unknown as { palms: Region[] }).palms;
  const flames = (manifest.pieces.lamp as unknown as { flames: { x: number; y: number; h: number }[] }).flames;
  const cord = useMemo(() => {
    // the gold cord through every strand's loop, sagging a little between them
    const pts = ITEMS.filter((i) => i.id.startsWith("toran-")).map((t) => [t.x, t.y * SC.ASPECT] as const);
    let d = `M0 ${(pts[0][1] - 1.2).toFixed(2)}`;
    let prev: readonly [number, number] = [0, pts[0][1] - 1.2];
    for (const p of [...pts, [100, pts[pts.length - 1][1] - 1.2] as const]) {
      d += ` Q${((prev[0] + p[0]) / 2).toFixed(2)} ${(Math.max(prev[1], p[1]) + 2.2).toFixed(2)} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
      prev = p;
    }
    return { d, pts };
  }, []);
  const letterW = PALM_W * 0.8; // its final size in her palm (stage %)

  return (
    <div ref={wrap} className="ms-wrap mh-scene" data-page="mehndi" data-final={S.groomFinal} data-reduce={reduce || undefined} style={{ ...style, ...stageVars(SC.ASPECT) }} aria-hidden>
      <div className="ms-stage" data-ready={ready || undefined}>
        {debug && <DebugMaster scene={SC} />}
        {ready && (
          <>
            <div className="ms-shadow" />
            <svg className="ms-cord" viewBox={`0 0 100 ${100 * SC.ASPECT}`} preserveAspectRatio="none">
              <path className="ms-cord-path" d={cord.d} />
              {cord.pts.map(([x, y], i) => (
                <circle key={i} className="ms-cord-bead" cx={x} cy={y} r={0.7} />
              ))}
            </svg>
            {HAS_CARPET && <Carpet />}
            <SceneItems
              scene={SC}
              exclude={(it) => hidden(it.id)}
              extra={(it) =>
                it.id === "bride" ? (
                  palms.map((p, i) => <Reveal key={i} src={url("bride-palms")} region={p} aspect={brideAspect} />)
                ) : it.id === "lamp" ? (
                  flames.map((f, i) => (
                    <div key={i} className="ms-flame" style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, height: `${f.h * 140}%` }}>
                      <span className="ms-glow" />
                      {["flame-1", "flame-2", "flame-3"].map((n, j) => (
                        <img key={n} src={url(n)} alt="" style={{ opacity: j === 0 ? 1 : 0 }} />
                      ))}
                    </div>
                  ))
                ) : null
              }
            />
            {/* the hidden initial in her palm: gold while it draws, then henna (and a glint now and then) */}
            <svg className="mh-initial" viewBox="0 0 64 56" style={{ left: `${PALM.x}%`, top: `${PALM.y}%`, width: `${letterW}%` }}>
              <defs>
                <linearGradient className="mh-glint-grad" id="mh-glint" gradientUnits="userSpaceOnUse" x1="-30" y1="0" x2="-6" y2="0">
                  <stop offset="0" stopColor="#fff3c4" stopOpacity="0" />
                  <stop offset="0.5" stopColor="#fff3c4" stopOpacity="0.95" />
                  <stop offset="1" stopColor="#fff3c4" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g className="mh-initial-henna" stroke={HENNA}>
                {LETTER.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>
              <g className="mh-initial-glint" stroke="url(#mh-glint)">
                {LETTER.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>
              <g className="mh-initial-gold">
                {LETTER.map((d, i) => (
                  <path key={`l${i}`} className="mh-line" d={d} />
                ))}
                {LETTER.map((d, i) => (
                  <path key={`i${i}`} className="mh-ink" d={d} />
                ))}
              </g>
            </svg>
            <div className="mh-palm-sparks" style={{ left: `${PALM.x}%`, top: `${PALM.y}%` }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <img key={i} src={url(PARTICLE_KINDS.sparkles[i % 4])} alt="" style={{ left: `${[-90, 110, 10, -50, 70][i]}%`, top: `${[-40, -10, -120, 70, 80][i]}%` }} />
              ))}
            </div>
            {/* hearts between them: one for the moment, two for the idle */}
            {[0, 1, 2].map((i) => (
              <svg key={i} className={i === 0 ? "mh-heart" : "mh-heart mh-heart-idle"} viewBox="0 0 24 24" style={{ left: `${HEART_AT.x}%`, top: `${HEART_AT.y}%` }}>
                <path d={HEART} />
                <path className="mh-heart-shine" d="M7.2 6.4 C6 6.8 5.3 7.9 5.4 9.2" />
              </svg>
            ))}
            <div className="mh-heart-sparks mh-tip-sparks" style={{ left: `${TIP.x}%`, top: `${TIP.y}%` }}>
              {[0, 1, 2].map((i) => (
                <img key={i} src={url(PARTICLE_KINDS.sparkles[i + 1])} alt="" style={{ left: `${[-80, 90, 10][i]}%`, top: `${[-20, -40, 90][i]}%` }} />
              ))}
            </div>
            <div className="mh-heart-sparks" style={{ left: `${GROOM_HEART.x}%`, top: `${GROOM_HEART.y}%` }}>
              {[0, 1, 2].map((i) => (
                <img key={i} src={url(PARTICLE_KINDS.sparkles[i + 1])} alt="" style={{ left: `${[-80, 90, 10][i]}%`, top: `${[-20, -40, 90][i]}%` }} />
              ))}
            </div>
            {/* henna burst around the bride */}
            <div className="ms-burst" style={{ left: `${bride.x}%`, top: `${bb.top + bb.h * 0.32}%` }}>
              {Array.from({ length: 9 }, (_, i) => (
                <img key={i} src={url(PARTICLE_KINDS.petals[i % PARTICLE_KINDS.petals.length])} alt="" />
              ))}
              {[0, 1, 2].map((i) => (
                <img key={`s${i}`} className="ms-burst-spark" src={url(PARTICLE_KINDS.sparkles[i])} alt="" style={{ left: `${[-60, 70, 10][i]}%`, top: `${[-40, -20, -90][i]}%` }} />
              ))}
            </div>
            {/* idle sparkles and the particle pool (one shared ticker) */}
            {[0, 1, 2].map((i) => (
              <img key={`sp${i}`} className="ms-spark" src={url(PARTICLE_KINDS.sparkles[i + 1])} alt="" />
            ))}
            <ParticlePool />
          </>
        )}
      </div>
    </div>
  );
}

/* ── the carpet: a flat circle tilted into master-v2's oval (rotateX), spun in its own plane
      (rotateZ inside the tilt) so the oval never changes; a darker copy 3 px lower is its edge ── */
const RIM = (manifest.pieces as unknown as Record<string, { points?: Record<string, number[]> }>).carpet?.points;
const RIM_SHARE = RIM ? RIM.rimR[0] - RIM.rimL[0] : 0.9;
function Carpet() {
  const c = byId["carpet"];
  const b = box(c);
  const piv = SC.P[c.piece].pivot;
  const origin = `${piv[0] * 100}% ${piv[1] * 100}%`;
  const tilt = `rotateX(${S.carpetTilt}deg)`;
  const rimW = c.w * RIM_SHARE;
  const layer = (edge: boolean) => (
    <div className={edge ? "mh-carpet-layer mh-carpet-edge" : "mh-carpet-layer"} style={{ transformOrigin: origin, transform: edge ? `translateY(3px) ${tilt}` : tilt }}>
      <div className="mh-carpet-spin" style={{ transformOrigin: origin }}>
        <img src={url(c.piece)} alt="" draggable={false} />
      </div>
    </div>
  );
  return (
    <>
      <div className="mh-carpet" style={{ left: `${b.left}%`, top: `${b.top}%`, width: `${b.w}%`, height: `${b.h}%`, zIndex: zOf(c.z), perspectiveOrigin: origin, transformOrigin: origin }}>
        {layer(true)}
        {layer(false)}
      </div>
      <div
        className="mh-dust"
        style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${rimW}%`, aspectRatio: `${1 / Math.cos((S.carpetTilt * Math.PI) / 180)}`, zIndex: zOf(c.z) + 1 }}
      />
    </>
  );
}
