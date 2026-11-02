"use client";
/* eslint-disable @next/next/no-img-element -- pre-sized WebP cut-outs, decoded by hand before they show */

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { gsap, useGSAP } from "@/src/lib/gsap";
import { timing } from "@/src/config/timing";
import { enableMotion, motionActive, onShake } from "@/src/lib/motion";
import manifest from "@/public/scenes/hindu-wedding/manifest.json";
import layout from "@/src/config/scenes/hindu-wedding.json";
import {
  DebugMaster,
  ParticlePool,
  SceneItems,
  createIdle,
  createParticles,
  gateIdle,
  makeScene,
  playOnArrival,
  stageVars,
  useDebug,
  useSceneAssets,
  type Layout,
  type Manifest,
  type Particle,
} from "./engine";

/**
 * The Hindu wedding scene: the mandap builds, the havan kund rises onto its
 * platform and the sacred fire is lit, the pandit takes his seat beside it.
 * Then the couple appear, wedded, hand in hand (sparkles, petals from the
 * canopy), the four diyas light one by one and a blessing of petals falls. Then it
 * idles: a living fire (three flickering flame layers, glow, sparks, smoke),
 * the pandit's ghee offerings, swaying swags, petals.
 *
 * Guests can play with it once it has assembled: a tap showers flowers from
 * the tap (on the fire: a flare; on a swag or the canopy's bells: they swing;
 * on a diya: its flame jumps), and a "Shake to shower blessings" pill turns
 * on shaking the phone (or showers blessings itself where there is no shake).
 * Taps never block scrolling (touch-action: pan-y; a finger that moved is a scroll).
 *
 * Built on the shared scene engine (./engine). Pieces:
 * scripts/scenes/hindu-wedding.config.mjs; layout: src/config/scenes/hindu-wedding.json,
 * fitted to master-v2. ?debug=1 shows the master.
 */
const SC = makeScene(manifest as unknown as Manifest, layout as Layout, 0.15);
const { url, box, byId, ITEMS, point } = SC;
const S = timing.sections.hindu;
const ACT = S.acts;

const KINDS = {
  petals: ["petal-red-1", "petal-red-2", "petal-red-3", "petal-red-4", "petal-pink-1", "petal-pink-2", "petal-pink-3", "petal-pink-4"],
  tap: ["petal-red-1", "petal-red-3", "petal-pink-2", "petal-pink-4", "petal-marigold-1", "petal-marigold-2", "petal-marigold-3", "tuberose-1", "tuberose-2", "tuberose-3"],
  ambient: ["petal-red-1", "petal-red-3", "petal-pink-2", "petal-pink-4", "tuberose-1", "tuberose-2", "tuberose-3", "tuberose-4"],
  sparks: ["spark-1", "spark-2", "spark-3", "spark-4", "spark-5"],
  sparkles: ["sparkle-1", "sparkle-2", "sparkle-3", "sparkle-4"],
  fires: ["fire-1", "fire-2", "fire-3"],
  flames: ["diya-flame-1", "diya-flame-2", "diya-flame-3"],
};
/** pieces that are not in this story any more (no pheras, no varmala, no antarpat: only the
 *  wedded couple, shown as they are) */
const UNUSED = /^(groom-|bride-|varmala-|couple-walk|antarpat)/;
const RUNTIME = [...new Set([...ITEMS.filter((i) => !UNUSED.test(i.id)).map((i) => i.piece), "ghee-drop", ...Object.values(KINDS).flat()])].map(url);

// the sacred fire on the kund
const FIRE = point("havan-kund", "fire");
const CF = byId["couple-final"];
const kund = box(byId["havan-kund"]);
const FIRE_W = kund.w * 0.62;
const DIYAS = ITEMS.filter((i) => i.id.startsWith("diya-"));
const WICK = (manifest.pieces.diya as unknown as { points: { wick: number[] } }).points.wick;
// the canopy's underside (petals fall from along it)
const canopyBox = box(byId["canopy"]);
const CANOPY_UNDER = canopyBox.top + canopyBox.h * 0.8;
/** the flame layers: back (fire-1, full), middle (fire-2, 85 %, a touch to the side), front (fire-3, 70 %) */
const LAYERS = [
  { w: 100, left: 0, first: 0 },
  { w: 85, left: 11, first: 1 },
  { w: 70, left: 15, first: 2 },
];

export function HinduWeddingScene({ scrollerRef, style, reduce, page }: { scrollerRef: RefObject<HTMLDivElement | null>; style: CSSProperties; reduce: boolean; page: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const ready = useSceneAssets(wrap, scrollerRef, RUNTIME);
  const debug = useDebug();
  const [pillLabel, setPillLabel] = useState("Shake to shower blessings");

  useGSAP(
    () => {
      if (!ready || reduce) return;
      const scroller = scrollerRef.current;
      const root = wrap.current;
      if (!scroller || !root) return;
      const q = gsap.utils.selector(root);
      const stage = q(".ms-stage")[0] as HTMLElement;
      const item = (id: string) => q(`[data-id="${id}"]`)[0] as HTMLElement;
      const items = (prefix: string) => ITEMS.filter((i) => i.id.startsWith(prefix) && !UNUSED.test(i.id)).map((i) => item(i.id));
      const W = () => stage.clientWidth;
      const H = () => stage.clientHeight;
      const k = () => stage.clientWidth / 390;
      const rnd = gsap.utils.random;
      const px = (p: { x: number; y: number }) => ({ x: (p.x / 100) * W(), y: (p.y / 100) * H() });
      const main = createParticles(q(".ms-particles:not(.hw-tap-pool) .ms-particle") as HTMLImageElement[], H, url);
      const tapPool = createParticles(q(".hw-tap-pool .ms-particle") as HTMLImageElement[], H, url);
      const { spawn, count } = main;

      const fire = q(".hw-fire")[0] as HTMLElement;
      const glow = q(".hw-fire-glow")[0] as HTMLElement;
      const wash = q(".hw-fire-wash")[0] as HTMLElement;
      const final = item("couple-final");
      const pill = q(".hw-pill")[0] as HTMLElement;
      const swags = [item("swag-wide"), item("swag-narrow")];
      gsap.set(final, { autoAlpha: 0 });
      gsap.set(q(".hw-diya-flame"), { scale: 0, autoAlpha: 0 });
      gsap.set([fire, glow, wash], { autoAlpha: 0 });
      gsap.set(pill, { autoAlpha: 0, y: 6 });

      const sparkBurst = (at: { x: number; y: number }, n: number, spread = 1) => {
        for (let i = 0; i < n; i++)
          spawn(gsap.utils.random(KINDS.sparks), at.x + rnd(-4, 4), at.y, {
            vx: rnd(-40, 40) * k() * spread,
            vy: -rnd(40, 90) * k() * spread,
            g: 60 * k(),
            r: rnd(-30, 30),
            vr: 0,
            sw: 0,
            s: rnd(0.4, 0.75),
            life: rnd(0.6, 1.1),
          });
      };
      const twinkle = (els: Element[], stagger = 0.08) =>
        gsap.fromTo(els, { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.3 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.4 }], stagger });

      /** petals and florets falling from along the canopy's edge */
      const canopyShower = (n: number) => {
        const y = (CANOPY_UNDER / 100) * H();
        for (let i = 0; i < n; i++)
          spawn(gsap.utils.random(KINDS.ambient), ((canopyBox.left + canopyBox.w * rnd(0.05, 0.95)) / 100) * W(), y + rnd(-4, 4) * k(), {
            vy: rnd(18, 40) * k(),
            vx: rnd(-8, 8) * k(),
            g: 30 * k(),
            s: rnd(0.45, 0.7),
            life: rnd(3.2, 4.2),
            sw: rnd(4, 9),
          });
      };
      /** the fire grows (~1.25×) for half a second, with a spark burst and a glow pulse */
      const flare = () => {
        gsap.fromTo(fire, { scale: 1 }, { scale: 1.25, duration: 0.25, ease: "power2.out", yoyo: true, repeat: 1, overwrite: "auto" });
        gsap.fromTo([glow, wash], { scale: 1 }, { scale: 1.18, duration: 0.25, yoyo: true, repeat: 1, overwrite: "auto" });
        sparkBurst(px(FIRE), Math.round(rnd(6, 9)));
      };
      /** sway something by a CSS variable on its picture (GSAP owns the piece's own transform) */
      const kick = (el: Element, amp: number) =>
        gsap.to(el, {
          keyframes: [{ "--kick": amp, duration: 0.2 }, { "--kick": -amp * 0.7, duration: 0.35 }, { "--kick": amp * 0.4, duration: 0.35 }, { "--kick": -amp * 0.15, duration: 0.3 }, { "--kick": 0, duration: 0.3 }],
          ease: "sine.inOut",
          overwrite: "auto",
        });

      /* ── the story (timed, in seconds) ─────────────────────────────── */
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      let t = 0;

      // 1. the mandap builds
      tl.fromTo(item("platform"), { y: () => H() * 0.15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, t);
      tl.fromTo(items("pillar-l").concat(items("pillar-r")), { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.8, ease: "power3.out" }, t + 0.15);
      tl.fromTo(items("pillar-back"), { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.8, ease: "power3.out" }, t + 0.3);
      tl.fromTo(item("canopy"), { y: () => -H() * 0.18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, t + 0.7);
      tl.fromTo(swags, { y: () => -H() * 0.08, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "back.out(1.6)", stagger: 0.1 }, t + 0.95);
      t += ACT.mandap;

      // 2. the pots land, the kund rises onto the platform and the fire is lit there; the pandit
      //    slides in from the right and settles beside it
      const stacks = ["pot-l", "pot-r"].map((p) => items(p));
      stacks[0].forEach((pot, j) => tl.fromTo([pot, stacks[1][j]], { y: () => -H() * 0.25, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32, ease: "back.out(2.4)" }, t + j * 0.1));
      tl.fromTo(item("havan-kund"), { y: () => H() * 0.06, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, t + 0.25);
      tl.fromTo(fire, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.55, ease: "back.out(1.8)" }, t + 0.75);
      tl.fromTo([glow, wash], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7 }, t + 0.75);
      tl.call(() => sparkBurst(px(FIRE), 8), undefined, t + 0.8);
      tl.fromTo(item("pandit"), { x: () => W() * 0.55, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, ease: "back.out(1.2)" }, t + 0.5);
      tl.fromTo([item("kalash"), item("thali")], { y: () => H() * 0.12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", stagger: 0.1 }, t + 0.8);
      tl.fromTo(items("diya-"), { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)", stagger: 0.08 }, t + 1.0);
      tl.fromTo(items("scatter-"), { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.03 }, t + 1.1);
      t += ACT.ritual;

      // 3. the couple appear, wedded, hand in hand — rising gently into place in a soft glow of
      //    sparkles, petals falling from the canopy
      tl.fromTo(final, { autoAlpha: 0, y: () => H() * 0.025 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.out" }, t);
      tl.fromTo(q(".hw-sight img"), { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.3 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.4 }], stagger: 0.08 }, t + 0.45);
      tl.call(() => canopyShower(10), undefined, t + 0.5);
      t += ACT.couple;

      // 6. together: the knot sparkles, the four diyas light one by one
      tl.fromTo(q(".hw-knot img"), { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.3 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.4 }], stagger: 0.07 }, t + 0.1);
      DIYAS.forEach((d, i) => {
        const at = t + 0.5 + i * 0.35;
        const flame = q(`[data-id="${d.id}"] .hw-diya-flame`)[0];
        tl.fromTo(flame, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.45, ease: "back.out(2)" }, at);
        tl.call(() => {
          const b = box(d);
          sparkBurst(px({ x: b.left + b.w * WICK[0], y: b.top + b.h * WICK[1] }), 4, 0.5);
        }, undefined, at);
      });
      t += ACT.together;

      // 7. blessing: petals shower from the canopy, the fire flares, sparkles round the couple
      tl.fromTo(
        q(".hw-shower img"),
        { y: 0, opacity: 0, rotation: () => rnd(-60, 60) },
        { keyframes: [{ opacity: 1, duration: 0.2 }, { y: () => H() * rnd(0.4, 0.6), rotation: () => rnd(-260, 260), duration: 1.3 }, { opacity: 0, duration: 0.3 }], ease: "sine.inOut", stagger: 0.07 },
        t + 0.2,
      );
      tl.call(() => flare(), undefined, t + 0.25);
      tl.fromTo(q(".hw-bless img"), { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.35 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.45 }], stagger: 0.12 }, t + 0.4);
      t += ACT.blessing;

      /* ── the living fire: three flame layers, each flickering on smoothed random noise; their
            shapes cross-fade; the glow and the warm wash follow; sparks rise, now and then a pop ── */
      const layers = q(".hw-flame-layer").map((el, i) => ({
        el,
        imgs: [...el.querySelectorAll("img")] as HTMLElement[],
        shape: LAYERS[i].first,
        cur: { sy: 1, sx: 1, sk: 0, op: 1 },
        to: { sy: 1, sx: 1, sk: 0, op: 1 },
        next: 0,
        nextShape: rnd(0.3, 0.6),
      }));
      let fireOn = false; // on screen (and the story or the idle running)
      let clock = 0;
      let sparkAcc = 0;
      let nextPop = 3;
      const fireTick = (_t: number, dms: number) => {
        if (!fireOn || fire.style.visibility === "hidden") return;
        const dt = Math.min(0.05, dms / 1000);
        clock += dt;
        const ease = 1 - Math.exp(-dt * 14);
        let sum = 0;
        for (const L of layers) {
          if (clock >= L.next) {
            L.to = { sy: rnd(0.9, 1.12), sx: rnd(0.95, 1.05), sk: rnd(-4, 4), op: rnd(0.85, 1) };
            L.next = clock + 1 / rnd(6, 10);
          }
          if (clock >= L.nextShape) {
            L.shape = (L.shape + 1 + Math.round(rnd(0, 1))) % 3;
            L.imgs.forEach((im, j) => (im.style.opacity = j === L.shape ? "1" : "0"));
            L.nextShape = clock + rnd(0.3, 0.6);
          }
          const c = L.cur;
          c.sy += (L.to.sy - c.sy) * ease;
          c.sx += (L.to.sx - c.sx) * ease;
          c.sk += (L.to.sk - c.sk) * ease;
          c.op += (L.to.op - c.op) * ease;
          L.el.style.transform = `scale(${c.sx.toFixed(3)},${c.sy.toFixed(3)}) skewX(${c.sk.toFixed(2)}deg)`;
          L.el.style.opacity = c.op.toFixed(3);
          sum += c.sy;
        }
        const s = (sum / layers.length - 0.9) / 0.22; // 0 … 1 with the flicker
        glow.style.setProperty("--flick", (0.62 + 0.38 * s).toFixed(3));
        wash.style.setProperty("--flick", (0.5 + 0.5 * s).toFixed(3));
        // sparks: 1–3 a second, rising with a sway; every few seconds a little pop
        sparkAcc += dt * rnd(1, 3);
        if (sparkAcc >= 1) {
          sparkAcc -= 1;
          const at = px(FIRE);
          spawn(gsap.utils.random(KINDS.sparks), at.x + rnd(-6, 6) * k(), at.y - 4 * k(), { vx: rnd(-8, 8) * k(), vy: -rnd(28, 55) * k(), g: 6 * k(), r: 0, vr: 0, sw: rnd(4, 9), f: rnd(1, 2), s: rnd(0.35, 0.6), life: rnd(0.9, 1.4) });
        }
        if (clock >= nextPop) {
          nextPop = clock + rnd(3, 6);
          sparkBurst(px(FIRE), Math.round(rnd(5, 8)));
        }
      };
      gsap.ticker.add(fireTick);

      /* ── idle ─────────────────────────────────────────────────────────── */
      const { idle, every } = createIdle();
      let idleStarted = false;
      let assembled = false;
      const startIdle = () => {
        if (idleStarted) return;
        idleStarted = true;
        assembled = true;
        q(".hw-smoke").forEach((sm, i) =>
          idle.fromTo(sm, { y: 0, opacity: 0, scale: 0.6 }, { keyframes: [{ opacity: 1, duration: 1.4 }, { y: () => -H() * 0.16, x: () => rnd(-6, 6) * k(), scale: 1.7, opacity: 0, duration: 2.6 }], repeat: -1, ease: "sine.out" }, i * 1.3),
        );
        // the pandit's offering: a ghee drop arcs from his ladle into the fire, which flares
        every(S.offering[0], S.offering[1], () => {
          const from = px(point("pandit", "ladle"));
          const to = px(FIRE);
          const T = 0.6;
          const g = 600 * k();
          spawn("ghee-drop", from.x, from.y, { vx: (to.x - from.x) / T, vy: (to.y - from.y) / T - 0.5 * g * T, g, r: 0, vr: 0, sw: 0, s: 0.6, life: T });
          gsap.delayedCall(T, flare);
        }, 2.5);
        // diyas flicker, out of phase; the swags sway from their ends; the couple breathe
        q(".hw-diya-flame").forEach((f) => idle.to(f, { scaleY: () => rnd(0.85, 1.12), opacity: () => rnd(0.8, 1), duration: () => rnd(0.08, 0.18), repeat: -1, repeatRefresh: true }, rnd(0, 0.3)));
        swags.forEach((sw) => idle.fromTo(sw, { rotation: -1.5 }, { rotation: 1.5, duration: rnd(1.6, 2.1), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 1)));
        idle.fromTo(final, { scaleY: 1 }, { scaleY: 1.006, duration: rnd(1.75, 2.25), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 2));
        // ambient petals and tuberose (8 at most); sparkles near the couple
        every(1.1, 2, () => {
          if (count("ambient") >= S.maxAmbient) return;
          spawn(gsap.utils.random(KINDS.ambient), rnd(0.06, 0.94) * W(), -0.02 * H(), { tag: "ambient", vy: rnd(15, 24) * k(), vx: rnd(-4, 4), life: 14, s: rnd(0.45, 0.7) });
        });
        const sparks = q(".ms-spark");
        let si = 0;
        every(1.6, 3, () => {
          const sp = sparks[si++ % sparks.length];
          const b = box(CF);
          gsap.set(sp, { left: `${b.left + b.w * rnd(0.15, 0.85)}%`, top: `${b.top + b.h * rnd(0.05, 0.5)}%` });
          gsap.fromTo(sp, { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.45 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.5 }], ease: "sine.inOut" });
        });
        // the blessings pill fades in under the stage
        gsap.to(pill, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" });
        gate.run();
      };

      /* ── taps: flowers from the tap; the fire flares; swags and bells swing; a diya jumps ──
            (never blocks scrolling: pan-y, no preventDefault, a finger that moved is a scroll) */
      let down: { x: number; y: number } | null = null;
      const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
      const onCancel = () => (down = null);
      const tapBurst = (at: { x: number; y: number }, n: number) => {
        // at most S.tapMax on screen: the oldest fade early
        const live = tapPool.parts.filter((p: Particle) => p.on).sort((a: Particle, b: Particle) => b.t / b.life - a.t / a.life);
        live.slice(0, Math.max(0, live.length + n - S.tapMax)).forEach((p: Particle) => (p.life = Math.min(p.life, p.t + 0.3)));
        for (let i = 0; i < n; i++) {
          const a = rnd(0, Math.PI * 2);
          const v = rnd(50, 110) * k();
          tapPool.spawn(gsap.utils.random(KINDS.tap), at.x, at.y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40 * k(), g: 120 * k(), vr: rnd(-200, 200), sw: rnd(3, 8), s: rnd(0.45, 0.7), life: rnd(2, 2.8) });
        }
      };
      const onUp = (e: PointerEvent) => {
        const d = down;
        down = null;
        if (!d || !assembled || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return;
        const r = stage.getBoundingClientRect();
        const sx = ((e.clientX - r.left) / r.width) * 100;
        const sy = ((e.clientY - r.top) / r.height) * 100;
        const inBox = (b: { left: number; top: number; w: number; h: number }, pad = 0) => sx >= b.left - pad && sx <= b.left + b.w + pad && sy >= b.top - pad && sy <= b.top + b.h + pad;
        // the fire
        const fh = (FIRE_W * 0.9) / SC.ASPECT;
        if (inBox({ left: FIRE.x - FIRE_W / 2, top: FIRE.y - fh, w: FIRE_W, h: fh + 2 }, 2)) return flare();
        // a diya: its flame jumps brighter
        const diya = DIYAS.find((dd) => inBox(box(dd), 1.5));
        if (diya) {
          const f = q(`[data-id="${diya.id}"] .hw-diya-flame`)[0];
          gsap.fromTo(f, { "--jump": 1 }, { keyframes: [{ "--jump": 1.6, duration: 0.12 }, { "--jump": 1, duration: 0.28 }], ease: "power2.out" });
          return;
        }
        // the canopy's bells (its lower band) or a swag: they swing hard; a bell sends out a gold ripple
        const cb = canopyBox;
        const onBells = sx >= cb.left && sx <= cb.left + cb.w && sy >= cb.top + cb.h * 0.6 && sy <= cb.top + cb.h + 1.5;
        const swag = swags.find((sw) => inBox(box(byId[sw.dataset.id!])));
        if (onBells || swag) {
          (swag ? [swag] : swags).forEach((sw) => kick(sw, 10));
          if (onBells) {
            const ring = q(".hw-ripple")[0];
            gsap.set(ring, { left: `${sx}%`, top: `${sy}%` });
            gsap.fromTo(ring, { scale: 0.2, opacity: 0.9 }, { scale: 1.6, opacity: 0, duration: 0.7, ease: "power2.out" });
          }
          return;
        }
        // anywhere else: a burst of petals and florets from the tap, drifting down; a few sparkles
        tapBurst(px({ x: sx, y: sy }), Math.round(rnd(8, 12)));
        gsap.set(q(".hw-tap-sparks"), { left: `${sx}%`, top: `${sy}%` });
        twinkle(q(".hw-tap-sparks img").slice(0, Math.round(rnd(2, 3))), 0.06);
      };
      stage.addEventListener("pointerdown", onDown);
      stage.addEventListener("pointerup", onUp);
      stage.addEventListener("pointercancel", onCancel);

      /* ── shake to shower blessings (switched on by the pill) ── */
      let lastShower = -1e9;
      const hits: number[] = [];
      const shower = () => {
        const now = performance.now();
        if (now - lastShower < S.shake.cooldown * 1000) return;
        lastShower = now;
        // the whole mandap gives a short wobble from its base; the swags swing hard; petals fall
        // from along the canopy's edge; the fire flares
        gsap.fromTo(
          stage,
          { rotation: 0 },
          { keyframes: [{ rotation: 1.5, duration: 0.13 }, { rotation: -1.1, duration: 0.17 }, { rotation: 0.7, duration: 0.16 }, { rotation: -0.35, duration: 0.16 }, { rotation: 0, duration: 0.18 }], ease: "sine.inOut", transformOrigin: "50% 92%", overwrite: "auto" },
        );
        swags.forEach((sw, i) => gsap.delayedCall(i * 0.06, () => kick(sw, 10)));
        canopyShower(Math.round(rnd(30, 40)));
        flare();
        navigator.vibrate?.(14);
      };
      let unShake = () => {};
      const shakeOn = () => {
        unShake();
        unShake = onShake(
          () => {
            if (!assembled) return;
            const now = performance.now();
            hits.push(now);
            while (hits.length && now - hits[0] > S.shake.window * 1000) hits.shift();
            if (hits.length >= S.shake.hits) {
              hits.length = 0;
              shower();
            }
          },
          S.shake.threshold,
          0,
        );
      };
      let mode: "ask" | "shake" | "button" = "ask";
      const say = (label: string) => {
        setPillLabel(label);
        gsap.delayedCall(3, () => setPillLabel("Shake to shower blessings"));
      };
      const onPill = () => {
        if (!assembled) return;
        if (mode === "button") return shower();
        if (mode === "shake") return say("Shake your phone ✨");
        // (iOS: the permission prompt must come from inside this tap)
        enableMotion().then((ok) => {
          if (ok) shakeOn();
          // allowed — but does the phone actually report motion? (desktops have the API, no sensor)
          gsap.delayedCall(0.7, () => {
            if (ok && motionActive()) {
              mode = "shake";
              say("Shake your phone ✨");
            } else {
              mode = "button";
              shower();
            }
          });
        });
      };
      pill.addEventListener("click", onPill);

      // the idle, the fire and the particles run only while the stage is on screen and the tab
      // visible; the pill hides when the stage leaves the screen
      const gate = gateIdle(
        stage,
        idle,
        (on) => {
          const go = on || tl.isActive();
          main.setTicking(go);
          tapPool.setTicking(go);
          fireOn = go;
          if (assembled) gsap.to(pill, { autoAlpha: on ? 1 : 0, duration: 0.3, overwrite: "auto" });
        },
        () => idleStarted,
      );
      main.setTicking(true);
      tapPool.setTicking(true);
      fireOn = true;
      playOnArrival({
        tl,
        stage,
        scroller,
        T: t,
        seconds: t,
        reverseSpeed: S.reverseSpeed,
        startAt: S.startAt,
        onComplete: startIdle,
        onLeaveBack: () => {
          // going back up: stop the idle and the interactions (they return once it has played again)
          idle.clear();
          idleStarted = false;
          assembled = false;
          gsap.to(pill, { autoAlpha: 0, duration: 0.2, overwrite: "auto" });
          gate.run();
        },
      });
      return () => {
        gate.dispose();
        gsap.ticker.remove(fireTick);
        tapPool.setTicking(false);
        unShake();
        stage.removeEventListener("pointerdown", onDown);
        stage.removeEventListener("pointerup", onUp);
        stage.removeEventListener("pointercancel", onCancel);
        pill.removeEventListener("click", onPill);
      };
    },
    { dependencies: [ready, reduce], scope: wrap },
  );

  // reduced motion: taps and the pill fade a few petals in and out, in place (no movement)
  useEffect(() => {
    const root = wrap.current;
    if (!ready || !reduce || !root) return;
    const stage = root.querySelector<HTMLElement>(".ms-stage")!;
    const pill = root.querySelector<HTMLElement>(".hw-pill")!;
    const still = (sx: number, sy: number, n: number, spread: number) => {
      for (let i = 0; i < n; i++) {
        const im = document.createElement("img");
        im.src = url(KINDS.tap[Math.floor(Math.random() * KINDS.tap.length)]);
        im.alt = "";
        im.className = "hw-still";
        im.style.left = `${sx + (Math.random() - 0.5) * spread}%`;
        im.style.top = `${sy + (Math.random() - 0.5) * spread * 0.6}%`;
        im.style.rotate = `${Math.round(Math.random() * 360)}deg`;
        stage.appendChild(im);
        im.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 1800 }).onfinish = () => im.remove();
      }
    };
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      const d = down;
      down = null;
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return;
      const r = stage.getBoundingClientRect();
      still(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100, 4, 10);
    };
    const onPill = () => still(50, CANOPY_UNDER + 6, 8, 60);
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointerup", onUp);
    pill.addEventListener("click", onPill);
    return () => {
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointerup", onUp);
      pill.removeEventListener("click", onPill);
    };
  }, [ready, reduce]);

  const cf = box(CF);
  const knot = point("couple-final", "knot");

  return (
    <div ref={wrap} className="ms-wrap hw-scene" data-page={page} data-reduce={reduce || undefined} style={{ ...style, ...stageVars(SC.ASPECT) }}>
      <div className="ms-stage" data-ready={ready || undefined} aria-hidden>
        {debug && <DebugMaster scene={SC} />}
        {ready && (
          <>
            <SceneItems
              scene={SC}
              exclude={(it) => UNUSED.test(it.id)}
              extra={(it) =>
                it.id.startsWith("diya-") ? (
                  <div className="hw-diya-flame" style={{ left: `${WICK[0] * 100}%`, top: `${WICK[1] * 100 + 2}%` }}>
                    <span className="hw-flame-glow" />
                    <img src={url(KINDS.flames[Number(it.id.slice(5)) % 3])} alt="" />
                  </div>
                ) : null
              }
            />
            {/* the sacred fire on the kund: three flame layers, its glow, a warm wash over the couple and the pandit, faint smoke */}
            <div className="hw-fire-wash" style={{ left: `${FIRE.x}%`, top: `${FIRE.y}%`, width: `${FIRE_W * 5}%` }} />
            <div className="hw-fire-glow" style={{ left: `${FIRE.x}%`, top: `${FIRE.y}%`, width: `${FIRE_W * 2.6}%` }} />
            <div className="hw-fire" style={{ left: `${FIRE.x}%`, top: `${FIRE.y + 1.2}%`, width: `${FIRE_W}%` }}>
              {LAYERS.map((L, i) => (
                <div key={i} className="hw-flame-layer" style={{ width: `${L.w}%`, left: `${L.left}%` }}>
                  {KINDS.fires.map((n, j) => (
                    <img key={n} src={url(n)} alt="" style={{ opacity: j === L.first ? 1 : 0 }} />
                  ))}
                </div>
              ))}
              {[0, 1, 2].map((i) => (
                <span key={i} className="hw-smoke" style={{ left: `${28 + i * 18}%` }} />
              ))}
            </div>
            {/* sparkles: first sight, the knot, the blessing, a tap; a bell's ripple */}
            <div className="hw-sight" style={{ left: `${CF.x}%`, top: `${cf.top + cf.h * 0.3}%` }}>
              {[0, 1, 2].map((i) => (
                <img key={i} src={url(KINDS.sparkles[i])} alt="" style={{ left: `${[-30, 30, 0][i]}%`, top: `${[0, -20, -60][i]}%` }} />
              ))}
            </div>
            <div className="hw-knot" style={{ left: `${knot.x}%`, top: `${knot.y}%` }}>
              {[0, 1, 2].map((i) => (
                <img key={i} src={url(KINDS.sparkles[i + 1])} alt="" style={{ left: `${[-25, 25, 0][i]}%`, top: `${[0, -10, -40][i]}%` }} />
              ))}
            </div>
            <div className="hw-bless" style={{ left: `${CF.x}%`, top: `${cf.top + cf.h * 0.2}%` }}>
              {[0, 1, 2, 3].map((i) => (
                <img key={i} src={url(KINDS.sparkles[i])} alt="" style={{ left: `${[-60, 55, -30, 30][i]}%`, top: `${[0, 10, -50, -40][i]}%` }} />
              ))}
            </div>
            <div className="hw-tap-sparks">
              {[0, 1, 2].map((i) => (
                <img key={i} src={url(KINDS.sparkles[i])} alt="" style={{ left: `${[-90, 80, -10][i]}%`, top: `${[-40, -60, 70][i]}%` }} />
              ))}
            </div>
            <span className="hw-ripple" />
            <div className="hw-shower" style={{ top: `${canopyBox.top + canopyBox.h * 0.85}%` }}>
              {Array.from({ length: 10 }, (_, i) => (
                <img key={i} src={url(KINDS.petals[i % KINDS.petals.length])} alt="" style={{ left: `${14 + i * 7.6}%` }} />
              ))}
            </div>
            {[0, 1, 2].map((i) => (
              <img key={`sp${i}`} className="ms-spark" src={url(KINDS.sparkles[i + 1])} alt="" />
            ))}
            {/* sparks, ambient petals and the blessing showers; the guests' tap flowers have their own */}
            <ParticlePool n={64} />
            <div className="ms-particles hw-tap-pool">
              {Array.from({ length: S.tapMax }, (_, i) => (
                <img key={i} className="ms-particle" alt="" />
              ))}
            </div>
          </>
        )}
      </div>
      {ready && (
        <button type="button" className="hw-pill" aria-label={pillLabel}>
          {pillLabel}
        </button>
      )}
    </div>
  );
}
