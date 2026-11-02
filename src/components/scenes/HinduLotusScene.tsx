"use client";
/* eslint-disable @next/next/no-img-element -- pre-sized WebP cut-outs, decoded by hand before they show */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { gsap, useGSAP } from "@/src/lib/gsap";
import { timing } from "@/src/config/timing";
import { enableMotion, motionActive, onShake } from "@/src/lib/motion";
import { onOrient } from "@/src/lib/tilt";
import manifest from "@/public/scenes/hindu-wedding-lotus/manifest.json";
import layout from "@/src/config/scenes/hindu-wedding-lotus.json";
import { DebugMaster, ParticlePool, createIdle, createParticles, gateIdle, makeScene, playOnArrival, stageVars, useDebug, useSceneAssets, zOf, type Layout, type Manifest, type Particle } from "./engine";
import { LotusPetals, buildPetals, petalTransform, petalZ, pose, type Petal, type View } from "./lotus3d";

/**
 * The Hindu wedding on a heavenly lotus — "Swarg Kamal". Clouds sail in from
 * both sides and a whirl of flowers spins into the heart of the sky; a great
 * lotus rises from the clouds as a bud and opens (its petals in 3D, each in
 * its place); a floral arch builds itself from flying flowers; a golden canopy
 * floats down and its crown of petals fans open; its jasmine strands unroll. The havan kund rises from the
 * lotus heart and the fire is lit, the pandit takes his seat, the diyas settle
 * on four petal tips; the couple appear, wedded, and the diyas light one by
 * one; jasmine and petals rain.
 *
 * Then it lives: the lotus's petals lean slowly in and out, a wave round the
 * flower (they never turn: turning, they swapped places and glitched); the
 * crown's petals sway, the stage and the canopy float, clouds drift (and lean with the
 * phone's tilt, as does the camera), buds and floating diyas rise, the arch
 * sheds a petal now and then, the fire flickers and the pandit offers ghee.
 *
 * Guests can play: tap the lotus (a ripple runs round it), the canopy, the arch (petals fall), a cloud (it
 * drifts away and back), the fire (it flares), a diya (it jumps), a strand
 * (it swings), or anywhere else (a burst of flowers). Shake the phone (after
 * the "Shake to shower blessings" pill): a wave runs round the lotus, the clouds puff
 * out, petals storm down from the canopy. Taps never block scrolling.
 *
 * No halo, glow or light rays behind anyone: the only warm light near the
 * people is the firelight.
 *
 * The lotus art: scripts/scenes/hindu-wedding-lotus.config.mjs; the layout:
 * src/config/scenes/hindu-wedding-lotus.json (fitted to its master). The 3D
 * lotus: ./lotus3d. ?debug=1 shows the master.
 */
const SC = makeScene(manifest as unknown as Manifest, layout as Layout, 0);
const { url, box, byId, point } = SC;
const S = timing.sections.lotus;
const ACT = S.acts;
const CAM = S.camera;
const A = SC.ASPECT;
const META = (layout as unknown as { meta: { lotus: { stage: G; crown: G; rangoli: { x: number; y: number; r: number; squash: number } } } }).meta.lotus;
type G = { x: number; y: number; r: number; tilt: number };
const P = SC.P as Record<string, { aspect: number; points?: Record<string, number[]> }>;
const aspectOf = (piece: string) => P[piece].aspect;

const KINDS = {
  petals: ["petal-red-1", "petal-red-2", "petal-red-3", "petal-red-4", "petal-pink-1", "petal-pink-2", "petal-pink-3", "petal-pink-4"],
  rain: ["tuberose-1", "tuberose-2", "tuberose-3", "tuberose-4", "petal-pink-1", "petal-pink-3", "petal-red-2", "petal-marigold-1"],
  tap: ["petal-red-1", "petal-red-3", "petal-pink-2", "petal-pink-4", "petal-marigold-1", "petal-marigold-2", "petal-marigold-3", "tuberose-1", "tuberose-2", "tuberose-3"],
  ambient: ["petal-pink-1", "petal-pink-3", "petal-red-2", "tuberose-1", "tuberose-3", "petal-marigold-2"],
  sparks: ["spark-1", "spark-2", "spark-3", "spark-4", "spark-5"],
  sparkles: ["sparkle-1", "sparkle-2", "sparkle-3", "sparkle-4"],
  fires: ["fire-1", "fire-2", "fire-3"],
  flames: ["diya-flame-1", "diya-flame-2", "diya-flame-3"],
};
const ALL_PETAL_PIECES = [...S.stageRings, ...S.crownRings].map((r) => r.piece);
const RUNTIME = [
  ...new Set([...SC.ITEMS.map((i) => i.piece), ...ALL_PETAL_PIECES, "lotus-floor", "lotus-painted", "diya", "ghee-drop", ...Object.values(KINDS).flat()]),
].map(url);

// where things are
const ST = META.stage;
const CR = META.crown;
/** the crown's still fan of petals (layout items crown-b… behind the kalash, crown-f… in front) */
const CROWN_FAN = SC.ITEMS.filter((i) => /^crown-[bf]\d/.test(i.id));
const FIRE = point("havan-kund", "fire");
const kund = box(byId["havan-kund"]);
const FIRE_W = kund.w * 0.6;
const WICK = (P.diya.points as Record<string, number[]>).wick;
const DIYA_W = 5.2; // % of the stage width
const ARCH_PTS = Array.from({ length: 24 }, (_, i) => point("arch", `a${i}`));
const STRANDS = SC.ITEMS.filter((i) => i.id.startsWith("strand-"));
const CLOUDS = SC.ITEMS.filter((i) => i.id.startsWith("cloud-"));
const FLOATERS = SC.ITEMS.filter((i) => /^(bud|fdiya)-/.test(i.id));
/** how each lotus is seen: centre, radius, the camera's tilt; z: the people / the kalash sit at
 *  this depth — nearer petals in front of them, farther ones behind */
const STAGE_VIEW: View = { x: ST.x, y: ST.y, R: ST.r, tilt: ST.tilt, z: 400, zSpread: 80 };
const CROWN_VIEW: View = { x: CR.x, y: CR.y, R: CR.r, tilt: CR.tilt, z: 400, zSpread: 80 };
const KC = Math.cos((ST.tilt * Math.PI) / 180);
/** a petal tip (R units from the centre) → stage % */
const tipAt = (v: View, t: { x: number; y: number }) => ({ x: v.x + t.x * v.R, y: v.y + (t.y * v.R) / A });

/** a flat piece placed from the layout */
function Pc({ id, z, className, children, style }: { id: string; z?: number; className?: string; children?: ReactNode; style?: CSSProperties }) {
  const it = byId[id];
  const b = box(it);
  const t = it.flip ? "scaleX(-1)" : undefined;
  return (
    <div
      className={`ms-item${className ? ` ${className}` : ""}`}
      data-id={id}
      data-rot={it.rot}
      style={{ left: `${b.left}%`, top: `${b.top}%`, width: `${b.w}%`, height: `${b.h}%`, zIndex: z ?? zOf(it.z), transformOrigin: b.origin, ...(it.rot ? { transform: `rotate(${it.rot}deg)` } : {}), ...style }}
    >
      <img src={url(it.piece)} alt="" draggable={false} style={t ? { transform: t } : undefined} />
      {children}
    </div>
  );
}

export function HinduLotusScene({ scrollerRef, style, reduce, page }: { scrollerRef: RefObject<HTMLDivElement | null>; style: CSSProperties; reduce: boolean; page: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const ready = useSceneAssets(wrap, scrollerRef, RUNTIME);
  const debug = useDebug();
  const [pillLabel, setPillLabel] = useState("Shake to shower blessings");
  /** 0: full; 1: fewer petals, no breathing; 2: the painted lotus (a slow phone) */
  const [quality, setQuality] = useState(S.lotusMode === "painted" ? 2 : 0);
  const assembledOnce = useRef(false);
  const painted = quality >= 2;
  const stagePetals = useMemo(() => buildPetals(S.stageRings, aspectOf, 11, quality >= 1), [quality]);
  // the crown is a still, hand-placed fan now (CROWN_FAN), not a turning ring
  const crownPetals = useMemo<Petal[]>(() => [], []);
  const diyaPetals = useMemo(() => {
    const outer = stagePetals.filter((p) => p.piece === "petal-outer");
    return S.diyaPetals.map((i) => outer[Math.round((i / 14) * outer.length) % outer.length]);
  }, [stagePetals]);

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
      const k = () => stage.clientWidth / 390;
      const rnd = gsap.utils.random;
      const px = (p: { x: number; y: number }) => ({ x: (p.x / 100) * W(), y: (p.y / 100) * H() });
      const main = createParticles(q(".ms-particles:not(.lt-tap-pool) .ms-particle") as HTMLImageElement[], H, url);
      const tapPool = createParticles(q(".lt-tap-pool .ms-particle") as HTMLImageElement[], H, url);
      const { spawn, count } = main;

      const stageGroup = q(".lt-stagegroup")[0] as HTMLElement;
      const canopyGroup = q(".lt-canopy")[0] as HTMLElement;
      const fire = q(".hw-fire")[0] as HTMLElement;
      const glow = q(".hw-fire-glow")[0] as HTMLElement;
      const pill = q(".hw-pill")[0] as HTMLElement;
      const couple = item("couple-final");
      const arch = item("arch");
      const archImg = arch.querySelector("img") as HTMLElement;
      const rim = [item("canopy-rim"), item("kalash-finial")];
      const strands = STRANDS.map((s) => item(s.id));
      const clouds = CLOUDS.map((c) => item(c.id));
      const floaters = FLOATERS.map((f) => item(f.id));
      const diyas = q(".lt-diya");
      const diyaFlames = q(".lt-diya .hw-diya-flame");
      const props = [item("pandit"), item("havan-kund"), item("kalash"), item("thali")];

      /* ── the two lotuses: every petal placed each frame on its ring (spin, open, breathing, ripple) ── */
      const lotusOf = (cls: string, petals: Petal[], view: View, dir: number, seconds: number, rings: number) => {
        const els = petals.map((pt) => {
          const el = q(`.${cls}[data-p="${pt.key}"]`)[0] as HTMLElement;
          return { p: pt, el, img: el.querySelector("img") as HTMLElement, lastB: -1, lastZ: -1 };
        });
        return { els, view, dir, rate: 360 / seconds, phi: 0, extra: { v: 0 }, mult: { v: 1 }, on: { v: 0 }, open: Array.from({ length: rings }, () => ({ v: 0 })), rip: -1e9 };
      };
      const lotuses = painted ? [] : [lotusOf("lt-stage", stagePetals, STAGE_VIEW, 1, S.stageSpinSeconds, S.stageRings.length)];
      const stageL = lotuses[0] ?? null;
      const crownL = lotusOf("lt-crown", crownPetals, CROWN_VIEW, -1, S.crownSpinSeconds, S.crownRings.length);
      lotuses.push(crownL);
      type L = ReturnType<typeof lotusOf>;
      let breathe = false;
      /** a petal's lean now: closed (−12°, a bud) → its own, staggered round the ring; breathing; a ripple */
      const leanOf = (L: L, pt: Petal, a: number) => {
        const o = L.open[pt.ring].v;
        const qv = Math.min(1, Math.max(0, o * 1.5 - (pt.i / pt.n) * 0.5));
        const oe = 1 - (1 - qv) * (1 - qv);
        let lean = -12 + (pt.lean + 12) * oe;
        // the slow wave: each petal leans out and back in, one after another round the flower
        if (breathe) lean += S.petalSway.amp * Math.sin((clock * Math.PI * 2) / S.petalSway.seconds - (a * Math.PI) / 90);
        const an = (((a % 360) + 360) % 360) / 360;
        const rt = clock - L.rip - an * 0.6;
        if (rt > 0 && rt < 0.7) lean += 8 * Math.sin((Math.PI * rt) / 0.7);
        return lean;
      };
      /** open a lotus ring (from a bud) over `dur` s */
      const openRing = (L: L, ring: number, at: number, dur: number) => tl.fromTo(L.open[ring], { v: 0 }, { v: 1, duration: dur, ease: "power1.inOut" }, at);

      /* ── the ticker: spins, light, hand-over, the diyas on their petal tips, floats, parallax, fire ── */
      let tadj = 0;
      let tadjTo = 0;
      let cloudX = 0;
      let cloudXTo = 0;
      let base: { beta: number; gamma: number } | null = null;
      const unOrient = onOrient((o) => {
        if (!base) base = o;
        tadjTo = gsap.utils.clamp(-1, 1, (o.beta - base.beta) / 20) * CAM.tiltNudge;
        cloudXTo = gsap.utils.clamp(-1, 1, (o.gamma - base.gamma) / 20);
      });
      const fireLayers = q(".hw-flame-layer").map((el, i) => ({ el, imgs: [...el.querySelectorAll("img")] as HTMLElement[], shape: i, cur: { sy: 1, sx: 1, sk: 0, op: 1 }, to: { sy: 1, sx: 1, sk: 0, op: 1 }, next: 0, nextShape: 0.4 }));
      let clock = 0;
      let sparkAcc = 0;
      let nextPop = 3;
      let running = true;
      let frames = 0;
      let fpsT = 0;
      let slowFor = 0;
      let idleStarted = false;
      let assembled = false;
      const noFallback = new URLSearchParams(location.search).has("nofallback");
      const fireTick = (dt: number) => {
        if (fire.style.visibility === "hidden") return;
        const ease = 1 - Math.exp(-dt * 14);
        let sum = 0;
        for (const L of fireLayers) {
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
        glow.style.setProperty("--flick", (0.6 + 0.4 * ((sum / fireLayers.length - 0.9) / 0.22)).toFixed(3));
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
      const tick = (_t: number, dms: number) => {
        if (!running) return;
        const dt = Math.min(0.05, dms / 1000);
        clock += dt;
        tadj += (tadjTo - tadj) * Math.min(1, dt * 3);
        cloudX += (cloudXTo - cloudX) * Math.min(1, dt * 3);
        root.style.setProperty("--tadj", `${tadj.toFixed(2)}deg`);
        root.style.setProperty("--cloudx", cloudX.toFixed(3));
        for (const L of lotuses) {
          // still: the petals never turn round the ring (turning, they swapped places in front of
          // and behind each other); they only lean in and out (leanOf)
          const ang = 0;
          const tilt = L.view.tilt + (L === crownL ? tadj * 0.3 : tadj);
          for (const e of L.els) {
            const a = e.p.theta + ang;
            const pz = pose(e.p, a, leanOf(L, e.p, a), tilt);
            e.el.style.transform = petalTransform(L.view, pz);
            const z = petalZ(L.view, pz);
            if (z !== e.lastZ) {
              e.lastZ = z;
              e.el.style.zIndex = String(z);
            }
            if (pz.light !== e.lastB) {
              e.lastB = pz.light;
              e.img.style.filter = `brightness(${pz.light})`;
            }
          }
        }
        // the four diyas ride on their petals' tips (in front of the people on the near half)
        if (stageL) {
          const ang = 0;
          diyas.forEach((d, i) => {
            const pt = diyaPetals[i];
            const a = pt.theta + ang;
            const pz = pose(pt, a, leanOf(stageL, pt, a), ST.tilt + tadj);
            const at = tipAt(STAGE_VIEW, pz.tip);
            d.style.left = `${at.x.toFixed(2)}%`;
            d.style.top = `${at.y.toFixed(2)}%`;
            d.style.zIndex = String(petalZ(STAGE_VIEW, pz) + 1);
          });
        }
        // the stage and the canopy float, out of phase
        stageGroup.style.translate = `0 ${(4 * k() * Math.sin((clock * Math.PI * 2) / 6)).toFixed(2)}px`;
        canopyGroup.style.translate = `0 ${(3 * k() * Math.sin((clock * Math.PI * 2) / 7 + 2)).toFixed(2)}px`;
        fireTick(dt);
        // a slow phone: shed petals, then the painted lotus (only once it idles)
        if (idleStarted && !document.hidden && !noFallback) {
          frames++;
          fpsT += dms / 1000;
          if (fpsT >= 1) {
            const fps = frames / fpsT;
            frames = 0;
            fpsT = 0;
            slowFor = fps < S.minFps ? slowFor + 1 : 0;
            if (slowFor >= 2 && quality < 2) {
              slowFor = 0;
              assembledOnce.current = true;
              setQuality((v) => Math.min(2, v + 1));
            }
          }
        }
      };
      gsap.ticker.add(tick);

      const sparkBurst = (at: { x: number; y: number }, n: number, spread = 1) => {
        for (let i = 0; i < n; i++)
          spawn(gsap.utils.random(KINDS.sparks), at.x + rnd(-4, 4), at.y, { vx: rnd(-40, 40) * k() * spread, vy: -rnd(40, 90) * k() * spread, g: 60 * k(), r: rnd(-30, 30), vr: 0, sw: 0, s: rnd(0.4, 0.75), life: rnd(0.6, 1.1) });
      };
      const twinkle = (els: Element[], stagger = 0.08) =>
        gsap.fromTo(els, { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.3 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.4 }], stagger });
      const flare = () => {
        gsap.fromTo(fire, { scale: 1 }, { scale: 1.25, duration: 0.25, ease: "power2.out", yoyo: true, repeat: 1, overwrite: "auto" });
        gsap.fromTo(glow, { scale: 1 }, { scale: 1.18, duration: 0.25, yoyo: true, repeat: 1, overwrite: "auto" });
        sparkBurst(px(FIRE), Math.round(rnd(6, 9)));
      };
      /** flowers falling from points (stage %) */
      const fall = (pts: { x: number; y: number }[], n: number, kinds = KINDS.rain, speed = 1) => {
        for (let i = 0; i < n; i++) {
          const p = px(gsap.utils.random(pts));
          spawn(gsap.utils.random(kinds), p.x + rnd(-4, 4) * k(), p.y, { vy: rnd(14, 34) * k() * speed, vx: rnd(-10, 10) * k(), g: 30 * k(), s: rnd(0.42, 0.66), life: rnd(2.8, 3.8), sw: rnd(4, 9) });
        }
      };
      const rimPts = Array.from({ length: 12 }, (_, i) => ({ x: CR.x + (i / 11 - 0.5) * CR.r * 1.8, y: CR.y + 3 }));
      const strandTips = STRANDS.map((s) => {
        const b = box(s);
        return { x: s.x, y: b.top + b.h };
      });
      /** swing a strand from its loop (a decaying sway) */
      const swing = (el: Element, amp: number) =>
        gsap.to(el, { keyframes: [{ rotation: amp, duration: 0.25 }, { rotation: -amp * 0.7, duration: 0.4 }, { rotation: amp * 0.4, duration: 0.4 }, { rotation: -amp * 0.15, duration: 0.35 }, { rotation: 0, duration: 0.35 }], ease: "sine.inOut", overwrite: "auto" });
      /** a wave round a lotus: each petal leans a little further and back, one after another */
      const ripple = (L: L) => {
        L.rip = clock;
      };

      /* ── hidden until their moment ── */
      gsap.set([couple, ...props, ...strands, ...rim, fire, glow, ...diyas, ...floaters], { autoAlpha: 0 });
      gsap.set(diyaFlames, { scale: 0, autoAlpha: 0 });
      gsap.set(pill, { autoAlpha: 0, y: 6 });
      gsap.set(strands, { scaleY: 0, transformOrigin: "50% 0%" });
      gsap.set(stageGroup, { transformOrigin: `${ST.x}% ${ST.y}%` });

      /* ── the story (timed, in seconds) ─────────────────────────────── */
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      let t = 0;

      // 1. the clouds sail in from the left and the right; a whirl of flowers spins into the
      //    heart of the sky
      clouds.forEach((c, i) => {
        const fromLeft = CLOUDS[i].x < 50;
        tl.fromTo(c, { x: () => (fromLeft ? -1 : 1) * W() * rnd(0.55, 0.8), autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: rnd(0.9, 1.3), ease: "power3.out" }, t + i * 0.06);
      });
      q(".lt-whirl img").forEach((el, i, all) => {
        const a0 = (i / all.length) * Math.PI * 2;
        const pr = { p: 0 };
        const c = px({ x: ST.x, y: ST.y - 4 });
        tl.fromTo(
          pr,
          { p: 0 },
          {
            p: 1,
            duration: 1.2,
            ease: "power1.in",
            onUpdate: () => {
              const r = (1 - pr.p) * W() * 0.75;
              const a = a0 + pr.p * Math.PI * 2.4;
              gsap.set(el, { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r * 0.6, rotation: pr.p * 400, scale: 1 - pr.p * 0.8, opacity: pr.p < 0.1 ? pr.p * 10 : pr.p > 0.85 ? (1 - pr.p) / 0.15 : 1 });
            },
          },
          t + (i % 8) * 0.03,
        );
      });
      t += ACT.arrive;

      // 2. the stage lotus rises from the clouds as a closed bud and opens in slow motion — the
      //    lower petals curl down first, then the outer, then the inner — turning 120° clockwise
      tl.fromTo(stageGroup, { scale: 0.35, y: () => H() * 0.08, autoAlpha: 0 }, { scale: 1, y: 0, autoAlpha: 1, duration: ACT.bloom, ease: "power2.out" }, t - 0.2);
      if (stageL) {
        [0, 1, 2].forEach((ring, j) => openRing(stageL, ring, t + j * 0.35, ACT.bloom - 0.6));
        tl.fromTo(q(".lt-floor"), { opacity: 0 }, { opacity: 1, duration: 0.8 }, t + 0.4);
      }
      t += ACT.bloom;

      // 3. the arch builds itself: 24 flowers fly in on curves to its line and settle; it shows
      //    from both feet upward, meeting at the top; one quick gold glint
      q(".lt-archfly img").forEach((el, i) => {
        const to = px(ARCH_PTS[i]);
        const from = { x: (i % 2 ? 1.15 : -0.15) * W(), y: rnd(0.1, 0.9) * H() };
        const mid = { x: (from.x + to.x) / 2 + rnd(-0.2, 0.2) * W(), y: Math.min(from.y, to.y) - rnd(0.05, 0.2) * H() };
        const pr = { p: 0 };
        tl.fromTo(
          pr,
          { p: 0 },
          {
            p: 1,
            duration: 0.75,
            ease: "power2.out",
            onUpdate: () => {
              const u = pr.p;
              const x = (1 - u) * (1 - u) * from.x + 2 * (1 - u) * u * mid.x + u * u * to.x;
              const y = (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * mid.y + u * u * to.y;
              gsap.set(el, { x, y, rotation: (1 - u) * 300, opacity: 1 });
            },
          },
          t + (Math.min(i, 23 - i) / 12) * 0.35,
        );
        tl.to(el, { opacity: 0, duration: 0.35 }, t + 0.95);
      });
      tl.fromTo(archImg, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.75, ease: "power2.inOut" }, t + 0.45);
      tl.fromTo(archImg, { filter: "brightness(1)" }, { keyframes: [{ filter: "brightness(1.3)", duration: 0.15 }, { filter: "brightness(1)", duration: 0.35 }] }, t + 1.15);
      t += ACT.arch;

      // 4. the canopy floats down and settles; its lotus crown opens, turning 120° anticlockwise;
      //    the jasmine strands unroll one by one, with a little swing
      tl.fromTo(canopyGroup, { y: () => -H() * 0.2 }, { y: 0, duration: 0.9, ease: "back.out(1.4)" }, t);
      tl.to(rim, { autoAlpha: 1, duration: 0.35 }, t);
      // the crown's petals open out from the middle, each from upright to its lean
      const fan = q(".lt-fan") as HTMLElement[];
      fan.forEach((el) => {
        const rot = +(el.dataset.rot ?? 0);
        tl.fromTo(el, { autoAlpha: 0, scale: 0.3, rotation: 0 }, { autoAlpha: 1, scale: 1, rotation: rot, duration: 0.8, ease: "back.out(1.6)" }, t + 0.2 + (Math.abs(rot) / 60) * 0.35);
      });
      [0, 1].forEach((ring, j) => openRing(crownL, ring, t + 0.25 + j * 0.2, 1.0));
      strands.forEach((s, i) => {
        tl.to(s, { autoAlpha: 1, duration: 0.05 }, t + 0.7 + i * 0.1);
        tl.to(s, { scaleY: 1, duration: 0.45, ease: "power2.out" }, t + 0.7 + i * 0.1);
        tl.fromTo(s, { rotation: 0 }, { keyframes: [{ rotation: 3, duration: 0.2 }, { rotation: -2, duration: 0.25 }, { rotation: 0, duration: 0.2 }], ease: "sine.inOut" }, t + 1.1 + i * 0.1);
      });
      t += ACT.canopy;

      // 5. the havan kund rises from the lotus heart and the fire is lit; the pandit takes his
      //    seat; the diyas settle on their petal tips; the kalash and the thali
      tl.fromTo(item("havan-kund"), { y: () => H() * 0.04, scale: 0.6, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.6, ease: "back.out(1.6)" }, t);
      tl.fromTo(fire, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.5, ease: "back.out(1.8)" }, t + 0.45);
      tl.fromTo(glow, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, t + 0.45);
      tl.call(() => sparkBurst(px(FIRE), 8), undefined, t + 0.5);
      tl.fromTo(item("pandit"), { y: () => H() * 0.03, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out" }, t + 0.3);
      tl.fromTo(diyas, { autoAlpha: 0, "--drop": "-24px" }, { autoAlpha: 1, "--drop": "0px", duration: 0.5, ease: "bounce.out", stagger: 0.1 }, t + 0.5);
      tl.fromTo([item("kalash"), item("thali")], { scale: 0.7, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.45, ease: "back.out(2)", stagger: 0.1 }, t + 0.7);
      t += ACT.setup;

      // 6. the couple appear, wedded, hand in hand; a ring of petals bursts out across the lotus
      tl.fromTo(couple, { y: () => H() * 0.02, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: "power2.out" }, t);
      tl.call(() => {
        const c = px(ST);
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          const v = rnd(90, 130) * k();
          spawn(gsap.utils.random(KINDS.petals), c.x, c.y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.3 - 20 * k(), g: 40 * k(), s: rnd(0.4, 0.6), life: rnd(1.4, 1.9), sw: rnd(2, 5) });
        }
      }, undefined, t + 0.5);
      t += ACT.couple;

      // 7. the four diyas on the petal tips light one by one
      diyaFlames.forEach((f, i) => {
        tl.fromTo(f, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.4, ease: "back.out(2)" }, t + 0.1 + i * 0.35);
        tl.call(() => {
          const r = diyas[i].getBoundingClientRect();
          const s = stage.getBoundingClientRect();
          sparkBurst({ x: r.left + r.width / 2 - s.left, y: r.top - s.top }, 4, 0.5);
        }, undefined, t + 0.1 + i * 0.35);
      });
      t += ACT.diyas;

      // 8. the blessing: jasmine and petals rain from the strand tips and the arch; a wave runs
      //    round the lotus; the fire flares
      tl.call(() => fall([...strandTips, ...ARCH_PTS.slice(4, 20)], 26), undefined, t + 0.1);
      tl.call(flare, undefined, t + 0.3);
      if (stageL) tl.call(() => ripple(stageL), undefined, t + 0.2);
      t += ACT.blessing;

      /* ── idle ─────────────────────────────────────────────────────────── */
      const { idle, every } = createIdle();
      const startIdle = () => {
        if (idleStarted) return;
        idleStarted = true;
        assembled = true;
        assembledOnce.current = true;
        breathe = true;
        // the crown's petals sway slowly from their bases, each a little out of step
        fan.forEach((el, i) => {
          const rot = +(el.dataset.rot ?? 0);
          idle.fromTo(el, { rotation: rot - 2.5 }, { rotation: rot + 2.5, duration: rnd(3.2, 4.4), ease: "sine.inOut", yoyo: true, repeat: -1 }, i * 0.35);
        });
        // clouds drift (the nearer, the further and faster)
        clouds.forEach((c, i) => {
          const near = CLOUDS[i].z > 7;
          const d = (near ? rnd(22, 30) : rnd(15, 20)) * k();
          idle.fromTo(c, { x: -d }, { x: d, duration: near ? rnd(12, 15) : rnd(16, 20), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 4));
        });
        // the strands sway from their loops
        strands.forEach((s) => idle.fromTo(s, { rotation: -2 }, { rotation: 2, duration: rnd(1.8, 2.6), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 2)));
        // buds and floating diyas rise slowly round the stage and come round again
        floaters.forEach((f, i) =>
          idle.fromTo(f, { y: 0, autoAlpha: 0 }, { keyframes: [{ autoAlpha: 1, duration: 2 }, { y: () => -H() * rnd(0.12, 0.2), x: () => rnd(-10, 10) * k(), duration: 9 }, { autoAlpha: 0, duration: 2 }], ease: "sine.inOut", repeat: -1 }, i * 1.6),
        );
        // the arch sheds a petal now and then
        every(6, 9, () => fall(ARCH_PTS, 1, KINDS.petals, 0.6), 3);
        // smoke, the pandit's offering, diyas flicker, the couple breathe
        q(".hw-smoke").forEach((sm, i) => idle.fromTo(sm, { y: 0, opacity: 0, scale: 0.6 }, { keyframes: [{ opacity: 1, duration: 1.4 }, { y: () => -H() * 0.12, scale: 1.7, opacity: 0, duration: 2.6 }], repeat: -1, ease: "sine.out" }, i * 1.3));
        every(S.offering[0], S.offering[1], () => {
          const from = px(point("pandit", "ladle"));
          const to = px(FIRE);
          const T = 0.6;
          const g = 600 * k();
          spawn("ghee-drop", from.x, from.y, { vx: (to.x - from.x) / T, vy: (to.y - from.y) / T - 0.5 * g * T, g, r: 0, vr: 0, sw: 0, s: 0.6, life: T });
          gsap.delayedCall(T, flare);
        }, 2.5);
        q(".lt-diya .hw-diya-flame, .lt-floater-flame").forEach((f) => idle.to(f, { scaleY: () => rnd(0.85, 1.12), opacity: () => rnd(0.8, 1), duration: () => rnd(0.08, 0.18), repeat: -1, repeatRefresh: true }, rnd(0, 0.3)));
        idle.fromTo(couple, { scaleY: 1 }, { scaleY: 1.006, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1 }, 0.5);
        // a few petals drifting down through the sky (8 at most)
        every(1.4, 2.4, () => {
          if (count("ambient") >= S.maxAmbient) return;
          spawn(gsap.utils.random(KINDS.ambient), rnd(0.06, 0.94) * W(), -0.02 * H(), { tag: "ambient", vy: rnd(14, 22) * k(), vx: rnd(-4, 4), life: 14, s: rnd(0.42, 0.62) });
        });
        gsap.to(pill, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" });
        gate.run();
      };

      /* ── taps (never blocking scrolling: pan-y, no preventDefault, a moved finger is a scroll) ── */
      let down: { x: number; y: number } | null = null;
      const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
      const onCancel = () => (down = null);
      const tapBurst = (at: { x: number; y: number }, n: number) => {
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
        const inB = (b: { left: number; top: number; w: number; h: number }, pad = 0) => sx >= b.left - pad && sx <= b.left + b.w + pad && sy >= b.top - pad && sy <= b.top + b.h + pad;
        // the fire
        const fh = (FIRE_W * 0.9) / A;
        if (inB({ left: FIRE.x - FIRE_W / 2, top: FIRE.y - fh, w: FIRE_W, h: fh + 2 }, 2)) return flare();
        // a diya: its flame jumps
        const dIdx = diyas.findIndex((dd) => {
          const b = dd.getBoundingClientRect();
          return Math.hypot(e.clientX - (b.left + b.width / 2), e.clientY - (b.top + b.height / 2)) < Math.max(18, b.width);
        });
        if (dIdx >= 0) {
          gsap.fromTo(diyaFlames[dIdx], { "--jump": 1 }, { keyframes: [{ "--jump": 1.6, duration: 0.12 }, { "--jump": 1, duration: 0.28 }], ease: "power2.out" });
          return;
        }
        // a strand: it swings
        const sIdx = STRANDS.findIndex((s) => inB(box(s), 1.5));
        if (sIdx >= 0) return void swing(strands[sIdx], 9);
        // a cloud (the nearest first): it drifts away and floats back
        const cIdx = [...CLOUDS.keys()].sort((a, b) => CLOUDS[b].z - CLOUDS[a].z).find((i) => inB(box(CLOUDS[i])));
        if (cIdx !== undefined) {
          const away = CLOUDS[cIdx].x < 50 ? -1 : 1;
          gsap.to(clouds[cIdx], { keyframes: [{ xPercent: away * 12, duration: 0.5, ease: "power2.out" }, { xPercent: 0, duration: 1.4, ease: "sine.inOut" }], overwrite: false });
          return;
        }
        // the canopy: its petals ripple and it spins faster (anticlockwise)
        const cb = box(byId["canopy-rim"]);
        if (sx >= cb.left && sx <= cb.left + cb.w && sy >= CR.y - 13 && sy <= cb.top + cb.h) return ripple(crownL);
        // the arch (not its open middle): petals fall from it
        const ab = box(byId["arch"]);
        const inMiddle = Math.abs(sx - byId["arch"].x) < ab.w * 0.3 && sy > ab.top + ab.h * 0.22;
        if (inB(ab) && !inMiddle) return fall(ARCH_PTS, Math.round(rnd(6, 10)), KINDS.petals, 0.9);
        // the stage lotus: a ripple runs round it and it spins faster
        if (stageL && Math.abs(sx - ST.x) < ST.r * 1.25 && sy > ST.y - 9 && sy < ST.y + (ST.r * 0.9) / A) {
          ripple(stageL);
          tapBurst(px({ x: sx, y: sy }), 4);
          return;
        }
        // anywhere else: a burst of flowers and a few sparkles
        tapBurst(px({ x: sx, y: sy }), Math.round(rnd(8, 12)));
        gsap.set(q(".hw-tap-sparks"), { left: `${sx}%`, top: `${sy}%` });
        twinkle(q(".hw-tap-sparks img").slice(0, Math.round(rnd(2, 3))), 0.06);
      };
      stage.addEventListener("pointerdown", onDown);
      stage.addEventListener("pointerup", onUp);
      stage.addEventListener("pointercancel", onCancel);

      /* ── shake to shower blessings: the lotuses whirl (opposite ways), the clouds puff out and
            drift back, petals storm down from the canopy, the fire flares, the strands swing ── */
      let lastShower = -1e9;
      const hits: number[] = [];
      const shower = () => {
        const now = performance.now();
        if (now - lastShower < S.shake.cooldown * 1000) return;
        lastShower = now;
        if (stageL) ripple(stageL);
        clouds.forEach((c, i) => {
          const out = CLOUDS[i].x < 50 ? -1 : 1;
          gsap.to(c, { keyframes: [{ xPercent: out * 16, scale: 1.06, duration: 0.35, ease: "power2.out" }, { xPercent: 0, scale: 1, duration: 1.6, ease: "sine.inOut" }], overwrite: false });
        });
        fall(rimPts, Math.round(rnd(32, 40)), [...KINDS.rain, ...KINDS.petals], 1.2);
        strands.forEach((s, i) => gsap.delayedCall(i * 0.05, () => swing(s, 12)));
        flare();
        navigator.vibrate?.([20, 40, 20]);
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
        enableMotion().then((ok) => {
          if (ok) shakeOn();
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

      // everything runs only while the stage is on screen and the tab visible
      const gate = gateIdle(
        stage,
        idle,
        (on) => {
          const go = on || tl.isActive();
          running = go;
          main.setTicking(go);
          tapPool.setTicking(go);
          if (assembled) gsap.to(pill, { autoAlpha: on ? 1 : 0, duration: 0.3, overwrite: "auto" });
        },
        () => idleStarted,
      );
      main.setTicking(true);
      tapPool.setTicking(true);
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
          idle.clear();
          idleStarted = false;
          assembled = false;
          breathe = false;
          for (const L of lotuses) L.on.v = 0;
          gsap.to(pill, { autoAlpha: 0, duration: 0.2, overwrite: "auto" });
          gate.run();
        },
      });
      // rebuilt for a slower phone after it had assembled: straight to the end, idling
      if (assembledOnce.current) {
        tl.progress(1, true);
        for (const L of lotuses) {
          L.on.v = 1;
          L.open.forEach((o) => (o.v = 1));
        }
        startIdle();
      }
      return () => {
        gate.dispose();
        gsap.ticker.remove(tick);
        tapPool.setTicking(false);
        unShake();
        unOrient();
        stage.removeEventListener("pointerdown", onDown);
        stage.removeEventListener("pointerup", onUp);
        stage.removeEventListener("pointercancel", onCancel);
        pill.removeEventListener("click", onPill);
      };
    },
    { dependencies: [ready, reduce, quality], scope: wrap },
  );

  // reduced motion: taps and the pill fade a few petals in and out, in place
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
    const onPill = () => still(50, CR.y + 8, 8, 60);
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointerup", onUp);
    pill.addEventListener("click", onPill);
    return () => {
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointerup", onUp);
      pill.removeEventListener("click", onPill);
    };
  }, [ready, reduce]);

  // the diyas' still positions (reduced motion; and before the ticker takes over)
  const diyaAt = diyaPetals.map((pt) => {
    const pz = pose(pt, pt.theta, pt.lean, ST.tilt);
    return { ...tipAt(STAGE_VIEW, pz.tip), z: petalZ(STAGE_VIEW, pz) + 1 };
  });
  // the painted lotus: its floor (centre at 50 % / 54.5 % of the picture, 36.4 % of its width
  // across) on the stage lotus's floor
  const paintedW = ST.r / 0.364;
  const paintedBox = { x: ST.x, y: ST.y - (0.545 * paintedW) / P["lotus-painted"].aspect / A, w: paintedW };

  return (
    <div ref={wrap} className="ms-wrap hw-scene lt-scene" data-page={page} data-reduce={reduce || undefined} data-quality={quality} style={{ ...style, ...stageVars(SC.ASPECT) }}>
      <div className="ms-stage" data-ready={ready || undefined} aria-hidden>
        {debug && <DebugMaster scene={SC} />}
        {ready && (
          <>
            {/* far sky: small clouds, a bud and a floating diya far off */}
            {CLOUDS.filter((c) => c.z < 2).map((c) => (
              <Pc key={c.id} id={c.id} className="lt-cloud" />
            ))}
            {FLOATERS.filter((f) => f.z < 2).map((f) => (
              <Pc key={f.id} id={f.id} className="lt-floater">
                {f.id.startsWith("fdiya") && <FloaterFlame piece={f.piece} />}
              </Pc>
            ))}

            {/* the arch, standing on the back edge of the lotus floor */}
            <Pc id="arch" />

            {/* the canopy: strands, the crown's back petals, the kalash, its front petals, the rim */}
            <div className="lt-canopy">
              {STRANDS.map((s) => (
                <Pc key={s.id} id={s.id} z={200} className="lt-strand" />
              ))}
              <LotusPetals className="lt-crown" view={CROWN_VIEW} petals={crownPetals} url={url} />
              {CROWN_FAN.filter((c) => c.id.startsWith("crown-b")).map((c) => (
                <Pc key={c.id} id={c.id} z={300} className="lt-crown lt-fan" />
              ))}
              <Pc id="kalash-finial" z={400} />
              {CROWN_FAN.filter((c) => c.id.startsWith("crown-f")).map((c) => (
                <Pc key={c.id} id={c.id} z={450} className="lt-crown lt-fan" />
              ))}
              <Pc id="canopy-rim" z={600} />
            </div>

            {/* mid clouds, under the lotus */}
            {CLOUDS.filter((c) => c.z >= 2 && c.z < 6).map((c) => (
              <Pc key={c.id} id={c.id} className="lt-cloud" />
            ))}

            {/* the stage: back petals + floor, the people and the ritual pieces, front petals, diyas */}
            <div className="lt-stagegroup">
              {painted ? (
                <div className="lt-painted" style={{ left: `${paintedBox.x - paintedBox.w / 2}%`, top: `${paintedBox.y}%`, width: `${paintedBox.w}%` }}>
                  <img src={url("lotus-painted")} alt="" draggable={false} />
                </div>
              ) : (
                <>
                  <LotusPetals className="lt-stage" view={STAGE_VIEW} petals={stagePetals} url={url} />
                  {/* the floor: the mandala seen at the camera's angle (the near petals rise over its edge) */}
                  <div className="lt-floor" style={{ left: `${ST.x - ST.r}%`, top: `${ST.y - (ST.r * KC) / A}%`, width: `${ST.r * 2}%`, aspectRatio: 1 / KC, zIndex: 400 }}>
                    <img src={url("lotus-floor")} alt="" draggable={false} />
                  </div>
                </>
              )}
              <Pc id="couple-final" z={430} />
              <Pc id="pandit" z={432} />
              <Pc id="havan-kund" className="lt-kund" />
              <Pc id="kalash" z={470} />
              <Pc id="thali" z={470} />
              <div className="hw-fire-glow" style={{ left: `${FIRE.x}%`, top: `${FIRE.y}%`, width: `${FIRE_W * 2.2}%` }} />
              <div className="hw-fire" style={{ left: `${FIRE.x}%`, top: `${FIRE.y + 1}%`, width: `${FIRE_W}%` }}>
                {[{ w: 100, l: 0 }, { w: 85, l: 11 }, { w: 70, l: 15 }].map((L, i) => (
                  <div key={i} className="hw-flame-layer" style={{ width: `${L.w}%`, left: `${L.l}%` }}>
                    {KINDS.fires.map((n, j) => (
                      <img key={n} src={url(n)} alt="" style={{ opacity: j === i ? 1 : 0 }} />
                    ))}
                  </div>
                ))}
                {[0, 1, 2].map((i) => (
                  <span key={i} className="hw-smoke" style={{ left: `${28 + i * 18}%` }} />
                ))}
              </div>
              {painted ? (
                <div className="lt-painted lt-painted-front" style={{ left: `${paintedBox.x - paintedBox.w / 2}%`, top: `${paintedBox.y}%`, width: `${paintedBox.w}%` }}>
                  <img src={url("lotus-painted")} alt="" draggable={false} />
                </div>
              ) : (
                null
              )}
              {diyaAt.map((d, i) => (
                <div key={i} className="lt-diya" style={{ left: `${painted ? [16, 38, 62, 84][i] : d.x}%`, top: `${painted ? 72.5 : d.y}%`, zIndex: painted ? 500 : d.z, width: `${DIYA_W}%` }}>
                  <div className="lt-diya-in">
                    <img src={url("diya")} alt="" draggable={false} />
                    <div className="hw-diya-flame" style={{ left: `${WICK[0] * 100}%`, top: `${WICK[1] * 100 + 2}%` }}>
                      <span className="hw-flame-glow" />
                      <img src={url(KINDS.flames[i % 3])} alt="" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* the cloud bank the lotus rests in (in front of its base), and the near clouds, on top */}
            {CLOUDS.filter((c) => c.z >= 6).map((c) => (
              <Pc key={c.id} id={c.id} className="lt-cloud lt-near" />
            ))}
            {FLOATERS.filter((f) => f.z >= 2).map((f) => (
              <Pc key={f.id} id={f.id} className="lt-floater">
                {f.id.startsWith("fdiya") && <FloaterFlame piece={f.piece} />}
              </Pc>
            ))}

            {/* flying flowers: the opening whirl, the arch's 24 */}
            <div className="lt-fly lt-whirl">
              {Array.from({ length: 32 }, (_, i) => (
                <img key={i} src={url(KINDS.tap[i % KINDS.tap.length])} alt="" />
              ))}
            </div>
            <div className="lt-fly lt-archfly">
              {ARCH_PTS.map((_, i) => (
                <img key={i} src={url(["petal-red-1", "tuberose-1", "petal-marigold-1", "tuberose-3"][i % 4])} alt="" />
              ))}
            </div>
            <div className="hw-tap-sparks">
              {[0, 1, 2].map((i) => (
                <img key={i} src={url(KINDS.sparkles[i])} alt="" style={{ left: `${[-90, 80, -10][i]}%`, top: `${[-40, -60, 70][i]}%` }} />
              ))}
            </div>
            <ParticlePool n={64} />
            <div className="ms-particles lt-tap-pool">
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

/** a floating diya's small flame (at its wick) */
function FloaterFlame({ piece }: { piece: string }) {
  const w = (P[piece].points as Record<string, number[]>).wick;
  return (
    <div className="lt-floater-flame" style={{ left: `${w[0] * 100}%`, top: `${w[1] * 100}%` }}>
      <img src={url("diya-flame-1")} alt="" />
    </div>
  );
}
