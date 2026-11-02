"use client";
/* eslint-disable @next/next/no-img-element -- pre-sized WebP cut-outs, decoded by hand before they show */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { gsap, useGSAP } from "@/src/lib/gsap";
import { timing } from "@/src/config/timing";
import { enableMotion, onShake } from "@/src/lib/motion";
import manifest from "@/public/scenes/garba-dance/manifest.json";
import layout from "@/src/config/scenes/garba-dance.json";
import { ParticlePool, createIdle, createParticles, gateIdle, makeScene, playOnArrival, stageVars, useDebug, useSceneAssets, zOf, type Layout, type Manifest } from "./engine";

/**
 * Garba / Dance Night — "Raas to Remix". One stage, two looks, one beat:
 *
 *  - GARBA: six dancers revolve (anticlockwise from above) round a glowing
 *    garbo, dipping on 1 and 3, clicking dandiyas in pairs on 2 and 4 (sparks),
 *    a skirt-flaring lift every other bar; the dhol player keeps the beat (gold ripples);
 *    bunting, a mirror toran and three lanterns sway overhead.
 *  - THE DROP: the tempo climbs, the ring speeds out, the garbo's flame flares
 *    and a ball of light rises from it to become the disco ball; the sky turns
 *    plum, the truss drops in, the spotlights snap on one by one, the floor
 *    lights ripple on and the dance crew jumps in; the DJ rises at the back.
 *  - DANCE: the disco ball turns (reflections sweep the stage), four beams
 *    swing in patterns, the floor chases on the beat, the crew dance, notes
 *    float from the speakers, confetti every 8 beats.
 *  - THE RETURN: the disco ball sinks back into the garbo, and the garba comes back.
 *
 * Everything moves to one beat clock on the shared ticker. It loops (24 beats
 * each look) and the "Garba ✦ Dance" toggle switches at once; taps make
 * people hop, switch looks (the garbo / the disco ball), ripple the floor, send
 * notes (the dhol, the DJ) or burst petals / confetti; a shake sets off a
 * blast. Lights fade (never strobe). Reduced motion: the two masters' layouts,
 * still, cross-fading on the toggle.
 *
 * Built on the shared scene engine (./engine). Pieces:
 * scripts/scenes/garba-dance.config.mjs; layout: src/config/scenes/garba-dance.json.
 * ?debug=1 shows the master of the look on screen behind the stage.
 */
const SC = makeScene(manifest as unknown as Manifest, layout as Layout, 0);
const { url, box, byId, P, point, ASPECT } = SC;
const S = timing.sections.garba;

type Meta = {
  floor: { x: number; y: number; r: number; squash: number };
  ring: { x: number; y: number; rx: number; ry: number; w: number; back: number };
  arch: { x: number; y: number; w: number; bottom: number };
  ball: { x: number; y: number; r: number };
};
const META = (layout as unknown as { meta: { stage: Meta } }).meta.stage;
const MASTERS = (manifest as unknown as { masters: Record<string, { src: string; aspect: number }> }).masters;
const RING = META.ring;
const FLOOR = META.floor;

/* ── the garba ring ───────────────────────────────────────────────────── */
const DANCERS = ["dancer-bride", "dancer-groom", "dancer-gujarati", "dancer-kerala", "dancer-mustard", "dancer-pink"];
/** the pairs that click (trailing, leading) */
const PAIRS: [number, number][] = [
  [0, 1],
  [2, 3],
  [4, 5],
];
const sheetW = (n: string) => (P[n] as unknown as { sw: number }).sw;
/** each dancer's size at the front (% of the stage width / height): one scale for all, as on their sheet */
const DW = DANCERS.map((n) => (RING.w * sheetW(n)) / sheetW("dancer-bride"));
const DH = DANCERS.map((n, i) => DW[i] / P[n].aspect / ASPECT);
/** where each sits on the ring (°, 0 = nearest us): pairs a third of the ring apart, the front kept clear */
const BASE = DANCERS.map((_, i) => 60 + 120 * Math.floor(i / 2) + (i % 2 ? S.pairGap / 2 : -S.pairGap / 2));
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
/** a point on the ring (angle °, radius × the ring): stage %, depth (−1 far … 1 near), scale */
function ringPose(deg: number, R: number) {
  const a = (deg * Math.PI) / 180;
  const depth = Math.cos(a);
  return {
    x: RING.x + RING.rx * R * Math.sin(a),
    y: RING.y + RING.ry * R * depth,
    depth,
    s: RING.back + ((1 - RING.back) * (depth + 1)) / 2,
  };
}
/** z-index by depth: the garbo (500) between the far and the near dancers */
const zDepth = (depth: number) => 500 + Math.round(depth * 100) + (depth >= 0 ? 1 : -1);

/* ── the lights ───────────────────────────────────────────────────────── */
/** the string lights (master px, 1024 × 1536): cubic curves draped across the top */
const STRINGS: number[][][] = [
  [[-20, 58], [290, 300], [734, 300], [1044, 58]],
  [[-20, 262], [140, 340], [330, 340], [512, 268]],
  [[512, 268], [694, 340], [884, 340], [1044, 262]],
  [[70, 150], [330, 400], [694, 400], [954, 150]],
];
const BULBS = STRINGS.flatMap((c, si) => {
  const n = si === 0 ? 26 : si === 3 ? 20 : 12;
  return Array.from({ length: n }, (_, k) => {
    const t = (k + 0.5) / n;
    const u = 1 - t;
    return [0, 1].map((d) => u * u * u * c[0][d] + 3 * u * u * t * c[1][d] + 3 * u * t * t * c[2][d] + t * t * t * c[3][d]) as [number, number];
  });
});
/** the floor's light rings (share of the floor radius, count, square or dot), inner first */
const FLOOR_RINGS = [
  { r: 0.47, n: 16, sq: true },
  { r: 0.65, n: 22, sq: false },
  { r: 0.82, n: 28, sq: true },
];
const LIGHT_COLORS = ["#ff5fa2", "#ffc65a", "#b56cff"];
/** the four beams: colour, and where each points when still (° to the right of straight down) */
const BEAMS = [
  { c: "rgb(255 63 164 / 0.55)", a: 14 },
  { c: "rgb(255 198 90 / 0.55)", a: 5 },
  { c: "rgb(181 108 255 / 0.55)", a: -5 },
  { c: "rgb(255 122 154 / 0.55)", a: -14 },
];
/** where the beams land: the floor's middle depth */
const POOL_Y = FLOOR.y - 2;

const KINDS = {
  sparks: ["spark-1", "spark-2", "spark-3"],
  sparkles: ["sparkle-1", "sparkle-2", "sparkle-3", "sparkle-4"],
  confetti: ["confetti-1", "confetti-2", "confetti-3", "confetti-4", "confetti-5", "confetti-6", "confetti-7", "confetti-8"],
  notes: ["note-1", "note-2", "note-3", "note-4"],
  petals: ["petal-marigold-1", "petal-marigold-2", "petal-marigold-3", "petal-rose-1", "petal-rose-2", "petal-rose-3"],
};
const ITEM_PIECES = SC.ITEMS.map((i) => i.piece);
const RUNTIME = [...new Set([...ITEM_PIECES, ...DANCERS, "floor", "garbo-holes", "diya-flame-1", ...Object.values(KINDS).flat()])].map(url);

/** stars in the dance sky (seeded, so server and client agree) */
const STARS = Array.from({ length: 36 }, (_, i) => {
  const r = (k: number) => {
    const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  return { x: 4 + r(1) * 92, y: 3 + r(2) * 55, s: 0.5 + r(3) * 0.9, d: 1.6 + r(4) * 2.4, dl: -r(5) * 4 };
});

/** the disco ball's centre and radius inside its piece (shares of its box) */
const DB = P["disco-ball"].points as unknown as { ball: number[]; edge: number[] };
const DB_R = DB.edge[0] - DB.ball[0];

/** sizes of the flame on the garbo (share of the garbo's height) */
const FLAME_H = 0.24;

export function GarbaDanceScene({ scrollerRef, style, reduce, page }: { scrollerRef: RefObject<HTMLDivElement | null>; style: CSSProperties; reduce: boolean; page: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const ready = useSceneAssets(wrap, scrollerRef, RUNTIME);
  const debug = useDebug();
  const nofallback = useRef(typeof window !== "undefined" && new URLSearchParams(window.location.search).has("nofallback"));
  /** reduced motion: the look on show (the toggle cross-fades) */
  const [still, setStill] = useState<"garba" | "dance">("garba");

  useGSAP(
    () => {
      if (!ready || reduce) return;
      const scroller = scrollerRef.current;
      const root = wrap.current;
      if (!scroller || !root) return;
      const q = gsap.utils.selector(root);
      const stage = q(".ms-stage")[0] as HTMLElement;
      const toggleBtn = root.querySelector<HTMLButtonElement>(".gd-toggle")!;
      const item = (id: string) => q(`[data-id="${id}"]`)[0] as HTMLElement;
      const inner = (id: string) => item(id).querySelector<HTMLElement>(".gd-in")!;
      const rnd = gsap.utils.random;
      let W = stage.clientWidth;
      let H = stage.clientHeight;
      const k = () => W / 390;
      const px = (p: { x: number; y: number }) => ({ x: (p.x / 100) * W, y: (p.y / 100) * H });
      const { spawn, setTicking, count } = createParticles(q(".ms-particle") as HTMLImageElement[], () => H, url);

      /* ── elements ─────────────────────────────────────────────────── */
      const sky = q(".gd-sky")[0] as HTMLElement;
      const skyD = q(".gd-skyd") as HTMLElement[];
      const lightsCv = q(".gd-lights")[0] as HTMLCanvasElement;
      const floorCv = q(".gd-floorlights")[0] as HTMLCanvasElement;
      const planeSpin = q(".gd-plane-spin")[0] as HTMLElement;
      const floorBase = q(".gd-floorbase")[0] as HTMLElement;
      const garbo = item("garbo");
      const garboIn = inner("garbo");
      const flame = q(".gd-flame")[0] as HTMLElement;
      const holes = q(".gd-holes")[0] as HTMLElement;
      const garboPool = q(".gd-pool-garbo")[0] as HTMLElement;
      const dhol = item("dhol-player");
      const dholIn = inner("dhol-player");
      const dholRing = q(".gd-dhol-ring")[0] as HTMLElement;
      const dholGlow = q(".gd-dhol-glow")[0] as HTMLElement;
      const bunting = item("bunting");
      const toran = item("toran");
      const lanterns = ["lantern-l", "lantern-c", "lantern-r"].map(item);
      const decorIn = [inner("bunting"), inner("toran"), ...["lantern-l", "lantern-c", "lantern-r"].map(inner)];
      const cores = q(".gd-core") as HTMLElement[];
      const truss = item("truss");
      const disco = item("disco-ball");
      const discoIn = inner("disco-ball");
      const djBoy = item("dj-boy");
      const djBoyIn = inner("dj-boy");
      const djCon = item("dj-console");
      const cones = q(".gd-cone") as HTMLElement[];
      const beams = q(".gd-beam") as HTMLElement[];
      const pools = q(".gd-pool-beam") as HTMLElement[];
      const dots = q(".gd-dot") as HTMLElement[];
      const lightBall = q(".gd-lightball")[0] as HTMLElement;
      const facets = q(".gd-facet") as HTMLElement[];
      const hemSparks = q(".gd-hem img") as HTMLElement[];
      const sparkEls = q(".gd-spark") as HTMLElement[];
      const glintEls = q(".gd-glint") as HTMLElement[];
      const CREW = ["crew-couple", "crew-gujarati", "crew-kerala", "crew-flowergirl"];
      const crew = CREW.map((id) => ({ id, el: item(id), in: inner(id), tw: 0, tap: 0, flip: !!byId[id].flip }));
      const crewEls = crew.map((c) => c.el);
      const decorEls = [bunting, toran, ...lanterns, ...(q(".gd-lstring") as HTMLElement[])];
      const danceEls = [truss, disco, djBoy, djCon, ...crewEls];

      /* ── state ────────────────────────────────────────────────────── */
      /** continuous values the transitions tween and the ticker reads */
      const st = {
        sky: 0, // 0 garba … 1 dance
        ringSpeed: 1,
        ringR: 1,
        flame: 1,
        flameOn: 0,
        bulbs: 0, // share of the string-light bulbs lit (the assembly)
        b0: 0,
        b1: 0,
        b2: 0,
        b3: 0,
        floorOn: 0, // the floor-light rings, switched on from the centre
        reflect: 0,
        center: 0, // the beams turned to the floor's centre (shake)
        pulseAt: -1e9, // a centre-out floor pulse (shake)
      };
      const beamOn = () => [st.b0, st.b1, st.b2, st.b3];
      const D = DANCERS.map((n, i) => ({
        n,
        i,
        outer: q(`.gd-dancer[data-d="${i}"]`)[0] as HTMLElement,
        in: q(`.gd-dancer[data-d="${i}"] .gd-in`)[0] as HTMLElement,
        img: q(`.gd-dancer[data-d="${i}"] img`)[0] as HTMLElement,
        out: 0, // 0 in the ring … 1 gone (spiralled off)
        spin: 0, // whole twirls (an in-place turn per unit)
        turn: 0, // the bar-end turn (0 → 1)
        dip: 0,
        close: 0, // the pair closing in (°)
        tip: { x: 0, y: 0 },
        bx: { x: 0, y: 0, w: 0, h: 0 },
        lastZ: -1,
        lastB: -1,
        hidden: false,
      }));
      const ring = { phi: 0 };
      const clock = { bpm: S.bpm.garba as number, beat: 0, n: -1, on: false };
      let mode: "garba" | "dance" = "garba";
      let busy = false;
      let live = false;
      let modeBeats = 0;
      let T = 0;
      let lite = 0; // 0 … 3: how much it has shed for a slow phone
      let cur: gsap.core.Timeline | null = null;

      const setLook = (m: "garba" | "dance") => {
        root.setAttribute("data-mode", m);
        toggleBtn.setAttribute("aria-pressed", String(m === "dance"));
        toggleBtn.setAttribute("aria-label", m === "dance" ? "Switch to the garba" : "Switch to the dance floor");
      };

      /* ── hidden until their moment ────────────────────────────────── */
      gsap.set([...danceEls, lightBall, ...beams, ...pools, ...dots], { autoAlpha: 0 });
      gsap.set(disco, { transformOrigin: `${DB.ball[0] * 100}% ${DB.ball[1] * 100}%` });

      /* ── canvases: the string lights (stage) and the floor lights (on the floor plane) ── */
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const lctx = lightsCv.getContext("2d")!;
      const fctx = floorCv.getContext("2d")!;
      const sprite = (color: string, size = 64) => {
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const g = c.getContext("2d")!;
        const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gr.addColorStop(0, "rgba(255,255,255,1)");
        gr.addColorStop(0.18, color);
        gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr;
        g.fillRect(0, 0, size, size);
        return c;
      };
      const bulbGlow = sprite("rgba(255,205,120,0.85)");
      const floorGlow = LIGHT_COLORS.map((c) => sprite(c));
      const whiteGlint = sprite("rgba(255,250,235,0.9)");
      const sizeCanvases = () => {
        W = stage.clientWidth;
        H = stage.clientHeight;
        lightsCv.width = Math.round(W * dpr);
        lightsCv.height = Math.round(H * dpr);
        const fw = Math.round(((FLOOR.r * 2) / 100) * W * dpr);
        floorCv.width = fw;
        floorCv.height = fw;
        floorDirty = true;
      };
      let floorDirty = true;
      const bulbV = BULBS.map(() => 0);
      const drawLights = (dt: number) => {
        const sx = (W / 1024) * dpr;
        lctx.clearRect(0, 0, lightsCv.width, lightsCv.height);
        // the wires
        lctx.strokeStyle = "rgba(150,104,40,0.85)";
        lctx.lineWidth = Math.max(1, 1.6 * sx);
        lctx.beginPath();
        for (const c of STRINGS) {
          lctx.moveTo(c[0][0] * sx, c[0][1] * sx);
          lctx.bezierCurveTo(c[1][0] * sx, c[1][1] * sx, c[2][0] * sx, c[2][1] * sx, c[3][0] * sx, c[3][1] * sx);
        }
        lctx.stroke();
        // the bulbs: a warm shimmer (garba) / a chase on the beat (dance); lit one by one at first
        const step = Math.floor(clock.beat * 2);
        const nOn = st.bulbs * BULBS.length;
        const gs = 34 * sx;
        BULBS.forEach(([bx, by], i) => {
          const garba = 0.78 + 0.2 * Math.sin(T * 2.1 + i * 0.9);
          const dance = (i + step) % 4 === 0 ? 1 : 0.32;
          const target = (i < nOn ? 1 : 0) * (garba * (1 - st.sky) + dance * st.sky);
          bulbV[i] += (target - bulbV[i]) * (1 - Math.exp(-dt / (target > bulbV[i] ? 0.06 : 0.16)));
          const v = bulbV[i];
          if (v < 0.02) return;
          lctx.globalAlpha = v * 0.75;
          lctx.drawImage(bulbGlow, bx * sx - gs / 2, by * sx - gs / 2, gs, gs);
          lctx.globalAlpha = Math.min(1, 0.4 + v);
          lctx.fillStyle = "#fff1c8";
          lctx.beginPath();
          lctx.arc(bx * sx, by * sx, 3.6 * sx, 0, Math.PI * 2);
          lctx.fill();
        });
        lctx.globalAlpha = 1;
      };
      // the floor lights: rings of squares and dots on the floor itself (they turn with it, seen at its tilt)
      const floorV = FLOOR_RINGS.map((r) => new Float32Array(r.n));
      const floorGlints: { a: number; t: number }[] = [];
      const drawFloor = (dt: number) => {
        const on = st.floorOn;
        if (on <= 0.001 && !floorGlints.length) {
          if (floorDirty) {
            fctx.clearRect(0, 0, floorCv.width, floorCv.height);
            floorDirty = false;
          }
          return;
        }
        floorDirty = true;
        const S2 = floorCv.width;
        const c = S2 / 2;
        fctx.clearRect(0, 0, S2, S2);
        const beat = clock.beat;
        const f = beat - Math.floor(beat);
        const pattern = Math.floor(beat / 4) % 3;
        const pulse = T - st.pulseAt;
        FLOOR_RINGS.forEach((R, ri) => {
          const ringOn = clamp(on * 3 - ri, 0, 1);
          if (ringOn <= 0) {
            floorV[ri].fill(0);
            return;
          }
          const vals = floorV[ri];
          const run = beat * 4 * (ri % 2 ? -1 : 1);
          const size = (R.sq ? 0.03 : 0.022) * S2;
          for (let i = 0; i < R.n; i++) {
            let tg = 0.24;
            if (lite >= 3) tg = 0.5;
            else if (pulse < 1.1) tg = Math.max(tg, Math.exp(-((pulse * 1.6 - ri / 2) ** 2) / 0.03));
            else if (pattern === 0) {
              const d = (((i - run) % R.n) + R.n) % R.n;
              tg = d < 1 ? 1 : d < 3 ? 0.55 : tg;
            } else if (pattern === 1) tg = Math.max(tg, Math.exp(-((f * 1.4 - ri / 2) ** 2) / 0.03));
            else tg = (ri + Math.floor(beat)) % 2 === 0 ? 0.95 : tg;
            vals[i] += (tg - vals[i]) * (1 - Math.exp(-dt / (tg > vals[i] ? 0.06 : 0.16)));
            const a = (i / R.n) * Math.PI * 2 + ri * 0.3;
            const x = c + Math.cos(a) * R.r * c;
            const y = c + Math.sin(a) * R.r * c;
            const v = vals[i] * ringOn;
            fctx.globalAlpha = v * 0.9;
            const g = size * 3.4;
            fctx.drawImage(floorGlow[i % 3], x - g / 2, y - g / 2, g, g);
            fctx.globalAlpha = Math.min(1, v * 1.2);
            fctx.fillStyle = i % 3 === 1 ? "#ffe3a0" : i % 3 === 0 ? "#ffc2dc" : "#e5ccff";
            if (R.sq) {
              fctx.save();
              fctx.translate(x, y);
              fctx.rotate(a + Math.PI / 4);
              fctx.fillRect(-size / 2, -size / 2, size, size);
              fctx.restore();
            } else {
              fctx.beginPath();
              fctx.arc(x, y, size / 2, 0, Math.PI * 2);
              fctx.fill();
            }
          }
        });
        // the floor's mirror dots catching the light
        for (let gi = floorGlints.length - 1; gi >= 0; gi--) {
          const g = floorGlints[gi];
          g.t += dt;
          const life = g.t / 0.6;
          if (life >= 1) {
            floorGlints.splice(gi, 1);
            continue;
          }
          const x = c + Math.cos(g.a) * 0.905 * c;
          const y = c + Math.sin(g.a) * 0.905 * c;
          const s = S2 * 0.07 * Math.sin(life * Math.PI);
          fctx.globalAlpha = Math.sin(life * Math.PI);
          fctx.drawImage(whiteGlint, x - s / 2, y - s / 2, s, s);
        }
        fctx.globalAlpha = 1;
      };

      /* ── little effects ───────────────────────────────────────────── */
      let sparkI = 0;
      let glintI = 0;
      /** a dandiya spark (scales in and fades) with a few tiny sparkles round it (px in the stage) */
      const spark = (x: number, y: number, n = 4) => {
        const el = sparkEls[sparkI++ % sparkEls.length];
        gsap.set(el, { x, y, rotation: rnd(0, 360) });
        gsap.fromTo(el, { scale: 0.25, opacity: 1 }, { scale: 1.15, opacity: 0, duration: 0.5, ease: "power2.out", overwrite: true });
        for (let i = 0; i < n; i++) glint(x + rnd(-22, 22) * k(), y + rnd(-18, 18) * k(), 0.6);
      };
      /** a tiny gold twinkle */
      const glint = (x: number, y: number, s = 1) => {
        const el = glintEls[glintI++ % glintEls.length];
        gsap.set(el, { x, y });
        gsap.fromTo(el, { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: s, opacity: 1, rotation: 45, duration: 0.2 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.3 }], ease: "sine.inOut", overwrite: true });
      };
      /** mirror-work catching the light: a few twinkles on the dancers' outfits */
      const outfitGlints = (n: number) => {
        const vis = D.filter((d) => d.out < 0.2);
        for (let i = 0; i < n && vis.length; i++) {
          const d = vis[Math.floor(rnd(0, vis.length - 0.001))];
          glint(d.bx.x + d.bx.w * rnd(-0.28, 0.28), d.bx.y + d.bx.h * rnd(0.38, 0.85), 0.5);
        }
      };
      const notes = (at: { x: number; y: number }, n: number) => {
        for (let i = 0; i < n; i++)
          spawn(gsap.utils.random(KINDS.notes), at.x + rnd(-8, 8) * k(), at.y, { vx: rnd(-18, 18) * k(), vy: -rnd(38, 70) * k(), g: -8 * k(), vr: rnd(-30, 30), r: rnd(-15, 15), s: rnd(0.6, 0.9), life: rnd(1.3, 1.8), sw: rnd(3, 6) });
      };
      const confetti = (n: number, from?: { x: number; y: number }) => {
        const m = lite >= 1 ? Math.ceil(n / 2) : n;
        for (let i = 0; i < m; i++) {
          const at = from ?? { x: rnd(0.05, 0.95) * W, y: -0.02 * H };
          spawn(gsap.utils.random(KINDS.confetti), at.x + (from ? rnd(-10, 10) * k() : 0), at.y, {
            tag: "confetti",
            vx: (from ? rnd(-90, 90) : rnd(-18, 18)) * k(),
            vy: (from ? -rnd(80, 160) : rnd(40, 85)) * k(),
            g: (from ? 220 : 26) * k(),
            vr: rnd(-320, 320),
            sw: rnd(8, 18),
            f: rnd(0.8, 1.6),
            s: rnd(0.55, 0.95),
            life: rnd(3.6, 5),
          });
        }
      };
      const petals = (at: { x: number; y: number }, n: number) => {
        for (let i = 0; i < n; i++)
          spawn(gsap.utils.random(KINDS.petals), at.x, at.y, { vx: rnd(-80, 80) * k(), vy: -rnd(60, 130) * k(), g: 160 * k(), vr: rnd(-160, 160), s: rnd(0.55, 0.85), life: rnd(1.8, 2.6), sw: rnd(4, 9) });
      };
      const sparkBlast = () => {
        for (let i = 0; i < 3; i++) gsap.delayedCall(i * 0.12, () => spark(rnd(0.2, 0.8) * W, rnd(0.25, 0.55) * H, 5));
      };

      /* ── the beat ─────────────────────────────────────────────────── */
      const click = (p: [number, number]) => {
        const tr = D[p[0]];
        const ld = D[p[1]];
        gsap.fromTo([tr, ld], { close: 0 }, { close: S.clickClose, duration: 0.15, ease: "power2.out", yoyo: true, repeat: 1, repeatDelay: 0.08, overwrite: "auto" });
        gsap.delayedCall(0.15, () => {
          if (tr.out > 0.2 || ld.out > 0.2) return;
          spark((tr.tip.x + ld.tip.x) / 2, (tr.tip.y + ld.tip.y) / 2, Math.round(rnd(3, 5)));
        });
      };
      const garbaBeat = (n: number) => {
        const b = n % 4;
        // the dhol player: a bob on every beat; a gold ripple from the dhol and a pulse on 1 and 3
        gsap.fromTo(dholIn, { y: 0 }, { y: -3 * k(), duration: 0.11, ease: "sine.out", yoyo: true, repeat: 1, overwrite: true });
        if (b === 0 || b === 2) {
          gsap.fromTo(dholRing, { scale: 0.35, opacity: 0.95 }, { scale: 1.9, opacity: 0, duration: 0.75, ease: "power1.out", overwrite: true });
          gsap.fromTo(dholGlow, { scale: 1.03, opacity: 0.9 }, { scale: 1, opacity: 0.35, duration: 0.35, ease: "sine.out", overwrite: true });
        }
        if (!live) return;
        if (b === 0 || b === 2) D.forEach((d) => gsap.fromTo(d, { dip: 0 }, { dip: 1, duration: 0.12, ease: "sine.out", yoyo: true, repeat: 1, overwrite: "auto" }));
        // beat 4 of every second bar: a quick turn in place (the skirts flare)
        if (n % 8 === 7) D.forEach((d) => gsap.fromTo(d, { turn: 0 }, { turn: 1, duration: 0.5, ease: "sine.inOut", overwrite: "auto" }));
        else if (b === 1 || b === 3) PAIRS.forEach(click);
        outfitGlints(Math.round(rnd(3, 5)));
      };
      const coneAt = ["coneL", "coneR"].map((nm) => point("dj-console", nm));
      const danceBeat = (n: number) => {
        gsap.fromTo(cones, { scale: 0.6, opacity: 0.85 }, { scale: 1.7, opacity: 0, duration: 0.45, ease: "power1.out", overwrite: true });
        const cn = coneAt[n % 2];
        notes(px(cn), Math.round(rnd(1, 2)));
        if (n % 8 === 0) {
          // the couple's twirl accent, a ring of sparkles round her hem
          gsap.fromTo(crew[0], { tw: 0 }, { tw: 1, duration: 0.55, ease: "sine.inOut", overwrite: "auto" });
          gsap.fromTo(hemSparks, { scale: 0, opacity: 0 }, { keyframes: [{ scale: 1, opacity: 1, duration: 0.2 }, { scale: 0.4, opacity: 0, duration: 0.45 }], stagger: 0.03, overwrite: true });
        }
        if (n % 8 === 4) confetti(Math.round(rnd(S.confetti[0], S.confetti[1])));
        // the disco ball's facets and the floor's mirror dots twinkle
        const fc = facets[n % facets.length];
        gsap.fromTo(fc, { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.2 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.35 }], overwrite: true });
        if (st.floorOn > 0.5) for (let i = 0; i < 2; i++) floorGlints.push({ a: Math.floor(rnd(0, 24)) * ((Math.PI * 2) / 24), t: 0 });
      };
      const onBeat = (n: number) => {
        modeBeats++;
        if (!busy) {
          if (mode === "garba") garbaBeat(n);
          else danceBeat(n);
        }
        if (S.autoLoop && live && !busy && modeBeats >= S.modeBeats) toggle();
      };

      /* ── the transitions ──────────────────────────────────────────── */
      const flameAt = point("garbo", "flame");
      const ballAt = { x: META.ball.x, y: META.ball.y };
      /** the light's curve from the flame up to the disco ball (stage %) */
      const curve = (p: number, from = flameAt, to = ballAt, bend = -20) => {
        const c = { x: (from.x + to.x) / 2 + bend, y: (from.y + to.y) / 2 };
        const u = 1 - p;
        return { x: u * u * from.x + 2 * u * p * c.x + p * p * to.x, y: u * u * from.y + 2 * u * p * c.y + p * p * to.y };
      };
      const ENTRY: Record<string, number> = { "crew-couple": 0.7, "crew-gujarati": -0.6, "crew-kerala": 0.6, "crew-flowergirl": -0.6 };
      const djDrop = () => H * 0.12;

      const drop = () => {
        busy = true;
        mode = "dance";
        modeBeats = 0;
        setLook("dance");
        const T2 = gsap.timeline({
          onComplete: () => {
            busy = false;
            cur = null;
            afterSwitch();
          },
        });
        cur = T2;
        // 1. the tempo climbs, the ring speeds up and widens
        T2.to(clock, { bpm: S.bpm.drop, duration: 1.2, ease: "sine.inOut" }, 0);
        T2.to(st, { ringSpeed: 2.6, ringR: 1.25, duration: 1.2, ease: "power1.in" }, 0);
        // 2. the flame flares; 3. a ball of light lifts from it and rises to the disco ball's place
        T2.to(st, { flame: 1.6, duration: 0.35, ease: "power2.out" }, 0.2);
        const lb = { p: 0 };
        T2.set(lightBall, { autoAlpha: 1 }, 0.5);
        T2.fromTo(
          lb,
          { p: 0 },
          {
            p: 1,
            duration: 1.3,
            ease: "power1.inOut",
            onUpdate: () => {
              const at = px(curve(lb.p));
              gsap.set(lightBall, { x: at.x, y: at.y, scale: 0.18 + 0.82 * lb.p });
            },
          },
          0.5,
        );
        T2.to(st, { flameOn: 0, flame: 0.4, duration: 0.3 }, 0.6);
        // 4. the sky turns plum, the stars come out; the garba decor lifts away; the truss drops in
        T2.to(st, { sky: 1, duration: 1.4, ease: "sine.inOut" }, 0.6);
        T2.to(decorEls, { y: () => -H * 0.45, duration: 0.8, ease: "power2.in", stagger: 0.05 }, 0.7);
        T2.set(decorEls, { autoAlpha: 0 }, 1.6);
        T2.fromTo(truss, { y: () => -H * 0.3, autoAlpha: 1 }, { y: 0, duration: 0.9, ease: "back.out(1.7)" }, 1.0);
        // 5. the light becomes the disco ball; the spotlights snap on, left to right, on the beat
        T2.fromTo(disco, { autoAlpha: 0, scale: 0.8, x: 0, y: 0 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2.4)" }, 1.8);
        T2.to(lightBall, { autoAlpha: 0, scale: 1.25, duration: 0.45 }, 1.85);
        T2.to(st, { reflect: 1, duration: 0.8 }, 2.0);
        const bt = 60 / S.bpm.drop;
        (["b0", "b1", "b2", "b3"] as const).forEach((b, i) => {
          T2.to(st, { [b]: 1, duration: 0.18, ease: "sine.out" }, 2.0 + i * bt);
          T2.to(pools[i], { autoAlpha: 1, duration: 0.25 }, 2.0 + i * bt);
          T2.set(beams[i], { autoAlpha: 1 }, 2.0 + i * bt);
        });
        // 6. the dancers spiral out and twirl off the sides; the garbo sinks; the dhol player walks off
        D.forEach((d, i) => T2.to(d, { out: 1, spin: "+=2", duration: 1.2, ease: "power2.in" }, 0.9 + i * 0.08));
        T2.to(garboIn, { yPercent: 100, duration: 0.8, ease: "power2.in" }, 1.2);
        T2.to(dhol, { x: () => -W * 0.5, duration: 1.3, ease: "power1.in" }, 0.8);
        T2.fromTo(dhol, { y: 0 }, { y: () => -4 * k(), duration: 0.16, yoyo: true, repeat: 7, ease: "sine.inOut" }, 0.8);
        T2.set(dhol, { autoAlpha: 0 }, 2.1);
        // 7. the floor lights ripple on from the centre
        T2.to(st, { floorOn: 1, duration: 0.8, ease: "sine.inOut" }, 2.2);
        T2.to(clock, { bpm: S.bpm.dance, duration: 0.8, ease: "sine.inOut" }, 2.3);
        // 8. the crew jumps in from the sides; the DJ rises at the back
        crew.forEach((c, i) => {
          const at = 2.4 + i * 0.1;
          T2.fromTo(c.el, { x: () => W * ENTRY[c.id], autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.7, ease: "back.out(1.3)" }, at);
          T2.fromTo(c.el, { y: 0 }, { y: () => -H * 0.05, duration: 0.35, ease: "power2.out", yoyo: true, repeat: 1 }, at);
        });
        T2.fromTo([djCon, djBoy], { y: djDrop, autoAlpha: 1 }, { y: 0, duration: 0.7, ease: "back.out(1.5)" }, 2.6);
        T2.set(st, { ringSpeed: 1, ringR: 1 }, 3.4);
      };

      const ret = () => {
        busy = true;
        mode = "garba";
        modeBeats = 0;
        setLook("garba");
        const T2 = gsap.timeline({
          onComplete: () => {
            busy = false;
            cur = null;
            gsap.set(disco, { autoAlpha: 0, x: 0, y: 0, scale: 1 });
            afterSwitch();
          },
        });
        cur = T2;
        T2.to(clock, { bpm: S.bpm.garba, duration: 2.4, ease: "sine.inOut" }, 0);
        // 1. the disco ball sinks along a curve into the garbo, which rises from the floor; the flame relights
        const dp = { p: 0 };
        T2.fromTo(
          dp,
          { p: 0 },
          {
            p: 1,
            duration: 1.25,
            ease: "power1.inOut",
            onUpdate: () => {
              const at = curve(1 - dp.p);
              gsap.set(disco, { x: ((at.x - ballAt.x) / 100) * W, y: ((at.y - ballAt.y) / 100) * H, scale: 1 - 0.8 * dp.p });
            },
          },
          0,
        );
        T2.to(disco, { autoAlpha: 0, duration: 0.35 }, 0.95);
        T2.fromTo(garboIn, { yPercent: 100 }, { yPercent: 0, duration: 0.9, ease: "power2.out" }, 0.5);
        T2.fromTo(st, { flame: 0.3 }, { flame: 1, flameOn: 1, duration: 0.45, ease: "back.out(2)" }, 1.2);
        // 2. the spotlights go off one by one, the truss lifts away, the floor fades outside in, the sky warms
        (["b0", "b1", "b2", "b3"] as const).forEach((b, i) => {
          T2.to(st, { [b]: 0, duration: 0.2 }, 0.15 + i * 0.18);
          T2.to(pools[i], { autoAlpha: 0, duration: 0.25 }, 0.15 + i * 0.18);
        });
        T2.set(beams, { autoAlpha: 0 }, 1.0);
        T2.to(st, { reflect: 0, duration: 0.5 }, 0.1);
        T2.to(truss, { y: () => -H * 0.3, duration: 0.7, ease: "power2.in" }, 0.9);
        T2.set(truss, { autoAlpha: 0 }, 1.6);
        T2.to(st, { floorOn: 0, duration: 0.9, ease: "sine.inOut" }, 0.3);
        T2.to(st, { sky: 0, duration: 1.4, ease: "sine.inOut" }, 0.4);
        // 3. the crew dances off; the DJ sinks out
        crew.forEach((c, i) => T2.to(c.el, { x: () => W * ENTRY[c.id], autoAlpha: 0, duration: 0.6, ease: "power2.in" }, 0.3 + i * 0.08));
        T2.to([djCon, djBoy], { y: djDrop, duration: 0.6, ease: "power2.in" }, 0.3);
        T2.set([djCon, djBoy], { autoAlpha: 0 }, 0.95);
        // 4. the decor drops back in; the dhol player walks in from the left
        T2.fromTo(decorEls, { y: () => -H * 0.45, autoAlpha: 1 }, { y: 0, duration: 0.8, ease: "back.out(1.3)", stagger: 0.06 }, 1.1);
        T2.fromTo(dhol, { x: () => -W * 0.5, autoAlpha: 1 }, { x: 0, duration: 1.2, ease: "power1.out" }, 1.2);
        T2.fromTo(dhol, { y: 0 }, { y: () => -4 * k(), duration: 0.15, yoyo: true, repeat: 7, ease: "sine.inOut" }, 1.2);
        // 5. the dancers spiral back into the ring, slowing to the garba
        T2.fromTo(st, { ringSpeed: 2.4, ringR: 1 }, { ringSpeed: 1, duration: 1.8, ease: "power2.out" }, 1.4);
        D.forEach((d, i) => T2.fromTo(d, { out: 1 }, { out: 0, spin: "+=2", duration: 1.0, ease: "power2.out" }, 1.4 + i * 0.1));
      };
      /** a tap on the toggle while it is switching: switch again once it has landed */
      let queued = false;
      const afterSwitch = () => {
        if (!queued) return;
        queued = false;
        toggle();
      };
      const toggle = (fromTap = false) => {
        if (!live) return;
        if (busy) {
          if (fromTap) queued = !queued;
          return;
        }
        if (mode === "garba") drop();
        else ret();
      };

      /** straight back to the garba (going back up the page): no transition left half-way */
      const snapGarba = () => {
        cur?.kill();
        cur = null;
        busy = false;
        queued = false;
        live = false;
        mode = "garba";
        modeBeats = 0;
        setLook("garba");
        clock.on = false;
        clock.bpm = S.bpm.garba;
        ring.phi = 0;
        Object.assign(st, { sky: 0, ringSpeed: 1, ringR: 1, flame: 1, flameOn: 1, b0: 0, b1: 0, b2: 0, b3: 0, floorOn: 0, reflect: 0, center: 0 });
        gsap.set([...danceEls, lightBall, ...beams, ...pools], { autoAlpha: 0, x: 0, y: 0 });
        gsap.set(disco, { scale: 1 });
        gsap.set(decorEls, { autoAlpha: 1, y: 0 });
        gsap.set(dhol, { autoAlpha: 1, x: 0, y: 0 });
        gsap.set(garboIn, { yPercent: 0 });
        D.forEach((d) => Object.assign(d, { out: 0, turn: 0, dip: 0, close: 0 }));
      };

      /* ── the ticker: the beat, the ring, the lights ───────────────── */
      let frames = 0;
      let fpsT = 0;
      let slowFor = 0;
      let lastSky = -1;
      const beamA = BEAMS.map((b) => b.a);
      const lens = [1, 2, 3, 4].map((i) => point("truss", `lens${i}`));
      const ballPx = () => px(ballAt);
      const DOTS = dots.map((_, i) => ({ rx: rnd(0.18, 0.62), ry: rnd(0.22, 0.7), w: rnd(0.12, 0.3) * (i % 2 ? 1 : -1), ph: rnd(0, Math.PI * 2), a: rnd(0.35, 0.8) }));
      const tick = (_t: number, dms: number) => {
        const dt = Math.min(0.05, dms / 1000);
        T += dt;
        // a slow phone sheds work, step by step
        frames++;
        fpsT += dt;
        if (fpsT >= 1) {
          slowFor = frames / fpsT < S.minFps && !nofallback.current ? slowFor + 1 : 0;
          frames = 0;
          fpsT = 0;
          if (slowFor >= 2 && lite < 3) {
            lite++;
            slowFor = 0;
            root.setAttribute("data-lite", String(lite));
          }
        }
        // the beat clock
        if (clock.on) {
          clock.beat += (dt * clock.bpm) / 60;
          const nb = Math.floor(clock.beat);
          while (clock.n < nb) onBeat(++clock.n);
        }
        const beat = clock.beat;
        const f = beat - Math.floor(beat);

        // the sky (and everything plum) cross-fades
        if (Math.abs(st.sky - lastSky) > 0.002) {
          lastSky = st.sky;
          const o = st.sky.toFixed(3);
          skyD.forEach((e) => (e.style.opacity = o));
        }

        /* the garba ring: round the garbo, nearer = bigger and in front, the far side mirrored */
        if (live) ring.phi += ((dt * 360) / (S.barsPerTurn * 4)) * (clock.bpm / 60) * st.ringSpeed;
        for (const d of D) {
          const vis = 1 - d.out;
          if (vis <= 0.002) {
            if (!d.hidden) {
              d.outer.style.opacity = "0";
              d.hidden = true;
            }
            continue;
          }
          d.hidden = false;
          const R = st.ringR * (1 + d.out * 1.6);
          const ang = BASE[d.i] + ring.phi + (d.i % 2 ? -d.close : d.close) + d.out * 110;
          const qp = ringPose(ang, R);
          // flat 2D: always as drawn (never mirrored); the bar-end "turn" is a skirt flare with a lift,
          // a twirl (spin) a little hop with a sway
          const flare = 1 + 0.05 * Math.sin(Math.PI * d.turn);
          const sf = d.spin - Math.floor(d.spin);
          const jump = -10 * k() * Math.sin(Math.PI * sf) - 4 * k() * Math.sin(Math.PI * d.turn);
          const rot = 6 * Math.sin(2 * Math.PI * sf);
          const sx = flare;
          const sy = 1 - 0.02 * d.dip;
          const dx = ((qp.x - RING.x) / 100) * W;
          const dy = ((qp.y - RING.y) / 100) * H;
          d.outer.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${qp.s.toFixed(3)})`;
          d.in.style.transform = `translateY(${(4 * k() * d.dip + jump).toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
          d.outer.style.opacity = vis.toFixed(3);
          const z = zDepth(qp.depth);
          if (z !== d.lastZ) {
            d.lastZ = z;
            d.outer.style.zIndex = String(z);
          }
          const br = Math.round((0.92 + (0.08 * (qp.depth + 1)) / 2) * 100) / 100;
          if (br !== d.lastB) {
            d.lastB = br;
            d.img.style.filter = br < 1 ? `brightness(${br})` : "";
          }
          // the stick tips and the box, for sparks and glints (px)
          const pc = P[d.n];
          const pt = (pc.points as Record<string, number[]>).sticks;
          const wpx = (DW[d.i] / 100) * W * qp.s;
          const hpx = (DH[d.i] / 100) * H * qp.s;
          const fx = (qp.x / 100) * W;
          const fy = (qp.y / 100) * H;
          d.tip.x = fx + (pt[0] - pc.pivot[0]) * wpx * sx;
          d.tip.y = fy + (pt[1] - pc.pivot[1]) * hpx * sy + jump;
          d.bx = { x: fx, y: fy - pc.pivot[1] * hpx, w: wpx, h: hpx };
        }

        /* the garbo's flame (smoothed noise), its holes and its pool of light */
        const nz = 0.5 * Math.sin(T * 13.1) + 0.3 * Math.sin(T * 7.3 + 1) + 0.2 * Math.sin(T * 23.7 + 2);
        flame.style.transform = `scale(${(st.flame * (1 - 0.04 * nz)).toFixed(3)},${(st.flame * (1 + 0.08 * nz)).toFixed(3)})`;
        flame.style.opacity = st.flameOn.toFixed(3);
        holes.style.opacity = (st.flameOn * (0.62 + 0.22 * nz)).toFixed(3);
        garboPool.style.opacity = (st.flameOn * (0.75 + 0.12 * nz) * (1 - st.sky * 0.8)).toFixed(3);

        /* the garba decor sways (a wave along the bunting and toran; the lanterns swing from their loops) */
        if (st.sky < 0.999 || busy) {
          decorIn[0].style.transform = `rotate(${(1.5 * Math.sin(T * 1.25)).toFixed(2)}deg) skewX(${(0.8 * Math.sin(T * 1.25 + 1.3)).toFixed(2)}deg)`;
          decorIn[1].style.transform = `rotate(${(1.2 * Math.sin(T * 1.05 + 0.8)).toFixed(2)}deg) skewX(${(0.6 * Math.sin(T * 1.05 + 2)).toFixed(2)}deg)`;
          for (let i = 0; i < 3; i++) decorIn[2 + i].style.transform = `rotate(${(3 * Math.sin(T * 1.6 + i * 1.7)).toFixed(2)}deg)`;
          cores.forEach((c, i) => (c.style.opacity = (0.7 + 0.18 * Math.sin(T * 5.3 + i * 2) + 0.1 * nz).toFixed(3)));
        }

        /* the dance */
        if (mode === "dance" || busy) {
          // the disco ball: a slow pendulum on its chain
          discoIn.style.transform = `rotate(${(2 * Math.sin((T * Math.PI * 2) / 3.4)).toFixed(2)}deg)`;
          // its reflections sweep the stage on turning paths round it
          if (st.reflect > 0.001) {
            const bc = ballPx();
            dots.forEach((el, i) => {
              const o = DOTS[i];
              if (lite >= 1 && i % 2) {
                el.style.opacity = "0";
                return;
              }
              const a = o.ph + T * o.w;
              el.style.transform = `translate(${(bc.x + Math.cos(a) * o.rx * W).toFixed(1)}px,${(bc.y + Math.sin(a) * o.ry * H + o.ry * H * 0.55).toFixed(1)}px)`;
              el.style.opacity = (st.reflect * o.a).toFixed(3);
            });
          } else dots.forEach((el) => (el.style.opacity = "0"));
          // the four beams swing in patterns: together, crossing, fanning out (2 bars each)
          const bar = Math.floor(beat / 4) % 8;
          const ph = Math.sin((Math.PI * 2 * beat) / 4);
          const on = beamOn();
          const fc = px({ x: FLOOR.x, y: POOL_Y });
          BEAMS.forEach((bm, i) => {
            const sw = S.beamSwing;
            let tg = bm.a + sw * ph;
            if (bar === 2 || bar === 3) tg = bm.a + sw * ph * (i % 2 ? -1 : 1);
            else if (bar === 4 || bar === 5) tg = bm.a * 1.6 + sw * ph * ((i - 1.5) / 1.5);
            const L = px(lens[i]);
            const toC = (Math.atan2(L.x - fc.x, fc.y - L.y) * 180) / Math.PI;
            tg = tg + (toC - tg) * st.center;
            beamA[i] += (tg - beamA[i]) * (1 - Math.exp(-dt / 0.18));
            const a = beamA[i];
            beams[i].style.transform = `translate(${L.x.toFixed(1)}px,${L.y.toFixed(1)}px) rotate(${a.toFixed(2)}deg)`;
            beams[i].style.opacity = (on[i] * (0.82 + 0.12 * Math.cos(f * Math.PI * 2))).toFixed(3);
            // its pool on the floor, where it lands
            const hx = L.x - Math.tan((a * Math.PI) / 180) * (fc.y - L.y);
            pools[i].style.transform = `translate(${hx.toFixed(1)}px,${fc.y.toFixed(1)}px)`;
            pools[i].style.opacity = (on[i] * 0.75).toFixed(3);
          });
          // the crew, each to the beat
          /** a tap: a hop (px) */
          const tapHop = (c: (typeof crew)[number]) => -12 * k() * Math.sin(Math.PI * (c.tap - Math.floor(c.tap)));
          const hop = Math.abs(Math.sin(Math.PI * f));
          const land = Math.exp(-f * 9);
          const [couple, guj, ker, girl] = crew;
          {
            const b2 = beat % 2;
            const flare = 1 + 0.04 * Math.exp(-b2 * 5);
            const tw = Math.sin(Math.PI * couple.tw);
            couple.in.style.transform = `translateY(${tapHop(couple).toFixed(1)}px) rotate(${(3 * Math.sin((Math.PI * 2 * beat) / 4)).toFixed(2)}deg) scale(${(flare * (1 + 0.05 * tw)).toFixed(3)},${(1 - 0.12 * tw).toFixed(3)})`;
          }
          guj.in.style.transform = `translateY(${(-6 * k() * hop + tapHop(guj)).toFixed(1)}px) rotate(${(2 * Math.sin((Math.PI * 2 * beat) / 4)).toFixed(2)}deg) scale(${(1 + 0.02 * land).toFixed(3)},${(1 - 0.03 * land).toFixed(3)})`;
          {
            const b4 = beat % 4;
            const bounce = b4 < 1 ? Math.sin(Math.PI * b4) : 0;
            ker.in.style.transform = `translateY(${(-5 * k() * bounce + tapHop(ker)).toFixed(1)}px) rotate(${(3 * Math.sin((Math.PI * beat) / 2)).toFixed(2)}deg)`;
          }
          {
            // hops, and a big twirly hop (arms swaying) on the last beat of every bar
            const b4 = beat % 4;
            const big = Math.sin(Math.PI * clamp(b4 - 3, 0, 1));
            girl.in.style.transform = `translateY(${(-8 * k() * hop - 8 * k() * big + tapHop(girl)).toFixed(1)}px) rotate(${(8 * Math.sin(2 * Math.PI * clamp(b4 - 3, 0, 1))).toFixed(2)}deg)`;
          }
          // the DJ nods (from the waist)
          djBoyIn.style.transform = `translateY(${(2 * k() * hop).toFixed(1)}px) rotate(${(2 * Math.sin(Math.PI * beat)).toFixed(2)}deg)`;
        }

        drawLights(dt);
        drawFloor(dt);
      };

      /* ── the assembly (the page arrives): garba look ──────────────── */
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      tl.fromTo(sky, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 1 }, 0);
      tl.fromTo(lightsCv, { y: () => -H * 0.06, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "back.out(1.6)" }, 0.3);
      tl.fromTo(st, { bulbs: 0 }, { bulbs: 1, duration: 1.2, ease: "none" }, 0.6);
      tl.fromTo(floorBase, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 1.0);
      tl.fromTo(planeSpin, { rotation: -360, scale: 0.2, autoAlpha: 0 }, { rotation: 0, scale: 1, autoAlpha: 1, duration: 1.3, ease: "power3.out" }, 1.0);
      tl.fromTo(garboIn, { yPercent: 100 }, { yPercent: 0, duration: 0.8 }, 2.1);
      tl.fromTo(st, { flameOn: 0, flame: 0.3 }, { flameOn: 1, flame: 1, duration: 0.5, ease: "back.out(2)" }, 2.8);
      tl.fromTo([bunting, toran], { y: () => -H * 0.25, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: "back.out(1.4)", stagger: 0.12 }, 2.2);
      tl.fromTo(q(".gd-lstring"), { scaleY: 0, autoAlpha: 0 }, { scaleY: 1, autoAlpha: 1, duration: 0.6, stagger: 0.12 }, 2.4);
      tl.fromTo(lanterns, { rotation: -28, y: () => -H * 0.2, autoAlpha: 0 }, { rotation: 0, y: 0, autoAlpha: 1, duration: 1.1, ease: "elastic.out(1, 0.5)", stagger: 0.12 }, 2.5);
      tl.fromTo(dhol, { x: () => -W * 0.45, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 1.2, ease: "power1.out" }, 3.0);
      tl.fromTo(dhol, { y: 0 }, { y: () => -4 * k(), duration: 0.15, yoyo: true, repeat: 7, ease: "sine.inOut" }, 3.0);
      // the beat starts (the dhol's ripples)
      tl.call(() => {
        clock.on = !tl.reversed();
      }, undefined, 3.9);
      // the dancers twirl into the ring one by one
      D.forEach((d, i) => tl.fromTo(d, { out: 1, spin: 0 }, { out: 0, spin: 2, duration: 0.9, ease: "power2.out" }, 4.0 + i * 0.32));
      const T_END = 4.0 + 5 * 0.32 + 0.9;

      /* ── idle: drifting petals in the garba ───────────────────────── */
      const { idle, every } = createIdle();
      every(1.2, 2, () => {
        if (mode !== "garba" || busy || count("ambient") >= S.maxAmbient) return;
        spawn(gsap.utils.random(KINDS.petals), rnd(0.06, 0.94) * W, -0.02 * H, { tag: "ambient", vy: rnd(14, 24) * k(), vx: rnd(-5, 5), life: 14, s: rnd(0.45, 0.7) });
      });

      /* ── taps (once it has assembled): never in the way of scrolling ── */
      let down: { x: number; y: number } | null = null;
      const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
      const onCancel = () => (down = null);
      const hitOf = (el: HTMLElement, cx: number, cy: number, shrink = 0.2) => {
        const im = el.querySelector("img");
        if (!im) return false;
        const r = im.getBoundingClientRect();
        const ix = r.width * shrink;
        return cx > r.left + ix && cx < r.right - ix && cy > r.top + r.height * 0.04 && cy < r.bottom;
      };
      const zOfEl = (el: HTMLElement) => +(el.style.zIndex || getComputedStyle(el).zIndex) || 0;
      const ripple = (x: number, y: number) => {
        const el = document.createElement("span");
        el.className = "gd-ripple";
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        stage.appendChild(el);
        gsap.fromTo(el, { scale: 0.08, opacity: 0.95 }, { scale: 1, opacity: 0, duration: 1, ease: "power1.out", onComplete: () => el.remove() });
      };
      const onUp = (e: PointerEvent) => {
        const d0 = down;
        down = null;
        if (!d0 || Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 10 || !live) return;
        const r = stage.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        type Hit = { el: HTMLElement; go: () => void };
        const cands: Hit[] = [];
        if (mode === "garba" && !busy) {
          D.forEach((d) => d.out < 0.2 && cands.push({ el: d.outer, go: () => gsap.to(d, { spin: "+=1", duration: 0.7, ease: "power2.inOut", overwrite: "auto" }) }));
          cands.push({ el: garbo, go: () => toggle(true) });
          cands.push({ el: dhol, go: () => notes(px(point("dhol-player", "dhol")), 6) });
        }
        if (mode === "dance" && !busy) {
          crew.forEach((c) => cands.push({ el: c.el, go: () => gsap.to(c, { tap: "+=1", duration: 0.7, ease: "power2.inOut", overwrite: "auto" }) }));
          cands.push({ el: disco, go: () => toggle(true) });
          cands.push({ el: djBoy, go: () => coneAt.forEach((c) => notes(px(c), 3)) });
          cands.push({ el: djCon, go: () => coneAt.forEach((c) => notes(px(c), 3)) });
        }
        const hit = cands.filter((c) => hitOf(c.el, e.clientX, e.clientY, c.el === disco || c.el === garbo ? 0.1 : 0.22)).sort((a, b) => zOfEl(b.el) - zOfEl(a.el))[0];
        if (hit) return hit.go();
        // the floor: a ring of light ripples out on it
        const fc = px({ x: FLOOR.x, y: FLOOR.y });
        const rx = (FLOOR.r / 100) * W;
        if (((x - fc.x) / rx) ** 2 + ((y - fc.y) / (rx * FLOOR.squash)) ** 2 < 1) return ripple(x, y);
        // anywhere else: petals (garba) or confetti (dance)
        if (mode === "garba") petals({ x, y }, Math.round(rnd(8, 12)));
        else confetti(Math.round(rnd(12, 16)), { x, y });
      };
      stage.addEventListener("pointerdown", onDown);
      stage.addEventListener("pointerup", onUp);
      stage.addEventListener("pointercancel", onCancel);

      /* ── shake: a blast of confetti and sparks ────────────────────── */
      let lastBlast = -1e9;
      const hits: number[] = [];
      const blast = () => {
        const now = performance.now();
        if (now - lastBlast < S.shake.cooldown * 1000 || !live) return;
        lastBlast = now;
        confetti(24);
        sparkBlast();
        if (mode === "garba") PAIRS.forEach(click);
        else {
          gsap.fromTo(st, { center: 0 }, { center: 1, duration: 0.35, ease: "power2.out", yoyo: true, repeat: 1, repeatDelay: 0.7, overwrite: "auto" });
          st.pulseAt = T;
        }
        navigator.vibrate?.([20, 40, 20]);
      };
      const unShake = onShake(
        () => {
          const now = performance.now();
          hits.push(now);
          while (hits.length && now - hits[0] > S.shake.window * 1000) hits.shift();
          if (hits.length >= S.shake.hits) {
            hits.length = 0;
            blast();
          }
        },
        S.shake.threshold,
        0,
      );
      // the toggle: switches now (and restarts the auto timer); its first tap asks iOS for motion
      let asked = false;
      const onToggle = () => {
        if (!asked) {
          asked = true;
          enableMotion();
        }
        toggle(true);
      };
      toggleBtn.addEventListener("click", onToggle);

      /* ── run only while on screen (and the tab visible) ───────────── */
      let ticking = false;
      const setTick = (on: boolean) => {
        if (on && !ticking) gsap.ticker.add(tick);
        if (!on && ticking) gsap.ticker.remove(tick);
        ticking = on;
        setTicking(on);
      };
      const ro = new ResizeObserver(sizeCanvases);
      ro.observe(stage);
      sizeCanvases();
      const gate = gateIdle(stage, idle, setTick, () => true);
      setTick(true);
      playOnArrival({
        tl,
        stage,
        scroller,
        T: T_END,
        seconds: S.assemble,
        reverseSpeed: S.reverseSpeed,
        startAt: S.startAt,
        onComplete: () => {
          live = true;
          modeBeats = 0;
          gsap.to(toggleBtn, { autoAlpha: 1, duration: 0.4 });
        },
        onLeaveBack: () => {
          snapGarba();
          gsap.to(toggleBtn, { autoAlpha: 0, duration: 0.2 });
        },
      });
      return () => {
        gate.dispose();
        setTick(false);
        ro.disconnect();
        cur?.kill();
        unShake();
        stage.removeEventListener("pointerdown", onDown);
        stage.removeEventListener("pointerup", onUp);
        stage.removeEventListener("pointercancel", onCancel);
        toggleBtn.removeEventListener("click", onToggle);
      };
    },
    { dependencies: [ready, reduce], scope: wrap },
  );

  // reduced motion: taps fade a few petals / confetti in and out, in place
  useEffect(() => {
    const root = wrap.current;
    if (!ready || !reduce || !root) return;
    const stage = root.querySelector<HTMLElement>(".ms-stage")!;
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      const d = down;
      down = null;
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return;
      const r = stage.getBoundingClientRect();
      const kinds = root.getAttribute("data-mode") === "dance" ? KINDS.confetti : KINDS.petals;
      for (let i = 0; i < 4; i++) {
        const im = document.createElement("img");
        im.src = url(kinds[Math.floor(Math.random() * kinds.length)]);
        im.alt = "";
        im.className = "hw-still";
        im.style.left = `${((e.clientX - r.left) / r.width) * 100 + (Math.random() - 0.5) * 10}%`;
        im.style.top = `${((e.clientY - r.top) / r.height) * 100 + (Math.random() - 0.5) * 6}%`;
        im.style.rotate = `${Math.round(Math.random() * 360)}deg`;
        stage.appendChild(im);
        im.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 1800 }).onfinish = () => im.remove();
      }
    };
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointerup", onUp);
    return () => {
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointerup", onUp);
    };
  }, [ready, reduce]);

  /* ── markup ─────────────────────────────────────────────────────────── */
  const ar = META.arch;
  const archH = ar.bottom - ar.y; // % of the stage height
  const archRound = ((ar.w / 2) * 1) / ((archH * ASPECT) / 1); // the round top's height as a share of the arch's
  const lookOf = (id: string) => (["dhol-player", "garbo", "bunting", "toran", "lantern-l", "lantern-c", "lantern-r"].includes(id) ? "garba" : "dance");

  /** a layout item: the outer box (entrances, exits) and an inner one (the dance moves) */
  const piece = (id: string, children?: ReactNode, className = "") => {
    const it = byId[id];
    const b = box(it);
    return (
      <div
        key={id}
        className={`ms-item gd-item ${className}`}
        data-id={it.id}
        data-look={lookOf(it.id)}
        style={{ left: `${b.left}%`, top: `${b.top}%`, width: `${b.w}%`, height: `${b.h}%`, zIndex: zOf(it.z), transformOrigin: b.origin }}
      >
        <div className="gd-in" style={{ transformOrigin: b.origin }}>
          <img src={url(it.piece)} alt="" draggable={false} style={it.flip ? { transform: "scaleX(-1)" } : undefined} />
          {children}
        </div>
      </div>
    );
  };
  /** a named point of an item's piece, inside its box (%) */
  const local = (id: string, name: string) => {
    const it = byId[id];
    const pt = (P[it.piece].points as Record<string, number[]>)[name];
    return { left: `${(it.flip ? 1 - pt[0] : pt[0]) * 100}%`, top: `${pt[1] * 100}%` };
  };
  const flameAsp = P["diya-flame-1"].aspect;
  const garboAsp = P["garbo"].aspect;
  const djBottom = box(byId["dj-console"]);

  return (
    <div
      ref={wrap}
      className="ms-wrap hw-scene gd-scene"
      data-page={page}
      data-reduce={reduce || undefined}
      data-mode={reduce ? still : "garba"}
      style={{ ...style, ...stageVars(SC.ASPECT) }}
    >
      <div className="ms-stage" data-ready={ready || undefined} aria-hidden>
        {debug && MASTERS && (["garba", "dance"] as const).map((m) => <img key={m} className="ms-debug gd-debug" data-m={m} src={SC.dir + MASTERS[m].src} alt="" />)}
        {ready && (
          <>
            {/* the sky arch: maroon to marigold (garba), plum with stars (dance) */}
            <div
              className="gd-sky"
              style={{ left: `${ar.x}%`, top: `${ar.y}%`, width: `${ar.w}%`, height: `${archH}%`, borderRadius: `50% 50% 0 0 / ${(archRound * 100).toFixed(2)}% ${(archRound * 100).toFixed(2)}% 0 0` }}
            >
              <div className="gd-sky-g" />
              <div className="gd-sky-d gd-skyd" data-look="dance" />
              <div className="gd-stars gd-skyd" data-look="dance">
                {STARS.map((s, i) => (
                  <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.s}%`, ["--d" as string]: `${s.d}s`, ["--dl" as string]: `${s.dl}s` }} />
                ))}
              </div>
            </div>
            <canvas className="gd-lights" />
            {/* the floor: a soft ground, and the round floor seen at the camera's tilt (its lights on it) */}
            <div className="gd-floorclip">
              <div className="gd-floorbase" style={{ left: `${FLOOR.x}%`, top: `${FLOOR.y}%`, width: `${FLOOR.r * 2.5}%` }}>
                <div className="gd-floorbase-d gd-skyd" data-look="dance" />
              </div>
              <div className="gd-plane" style={{ left: `${FLOOR.x}%`, top: `${FLOOR.y}%`, width: `${FLOOR.r * 2}%`, ["--sq" as string]: FLOOR.squash }}>
                <div className="gd-plane-spin">
                  <img src={url("floor")} alt="" draggable={false} />
                  <canvas className="gd-floorlights" data-look="dance" />
                </div>
              </div>
            </div>
            <div className="gd-pool gd-pool-garbo" data-look="garba" style={{ left: `${RING.x}%`, top: `${RING.y}%`, width: `${RING.rx * 2.6}%` }} />
            {BEAMS.map((b, i) => (
              <div key={`p${i}`} className="gd-pool gd-pool-beam" data-look="dance" style={{ ["--c" as string]: b.c }} />
            ))}

            {/* garba */}
            {piece(
              "dhol-player",
              <>
                <span className="gd-dhol-glow" style={local("dhol-player", "dhol")} />
                <span className="gd-dhol-ring" style={local("dhol-player", "dhol")} />
              </>,
            )}
            {piece(
              "garbo",
              <>
                <img className="gd-holes" src={url("garbo-holes")} alt="" draggable={false} />
                <div className="gd-flame" style={{ ...local("garbo", "flame"), height: `${FLAME_H * 100}%`, width: `${((FLAME_H * flameAsp) / garboAsp) * 100}%` }}>
                  <span className="gd-flame-glow" />
                  <img src={url("diya-flame-1")} alt="" draggable={false} />
                </div>
              </>,
              "gd-garbo",
            )}
            {DANCERS.map((n, i) => {
              const p0 = ringPose(BASE[i], 1);
              const pv = P[n].pivot;
              const origin = `${pv[0] * 100}% ${pv[1] * 100}%`;
              const dx = (p0.x - RING.x) / 100;
              const dy = ((p0.y - RING.y) / 100) * ASPECT;
              return (
                <div
                  key={n}
                  className="gd-dancer"
                  data-d={i}
                  data-look="garba"
                  style={{
                    left: `${RING.x - DW[i] * pv[0]}%`,
                    top: `${RING.y - DH[i] * pv[1]}%`,
                    width: `${DW[i]}%`,
                    height: `${DH[i]}%`,
                    transformOrigin: origin,
                    transform: `translate(calc(var(--sw) * ${dx.toFixed(4)}), calc(var(--sw) * ${dy.toFixed(4)})) scale(${p0.s.toFixed(3)})`,
                    zIndex: zDepth(p0.depth),
                  }}
                >
                  <div className="gd-in" style={{ transformOrigin: origin }}>
                    <img src={url(n)} alt="" draggable={false} />
                  </div>
                </div>
              );
            })}
            {(["lantern-l", "lantern-c", "lantern-r"] as const).map((id) => (
              <span key={`str-${id}`} className="gd-lstring" data-look="garba" style={{ left: `${byId[id].x}%`, height: `${byId[id].y}%` }} />
            ))}
            {(["lantern-l", "lantern-c", "lantern-r"] as const).map((id) => piece(id, <span className="gd-core" style={local(id, "core")} />))}
            {piece("toran")}
            {piece("bunting")}

            {/* dance */}
            <div className="gd-djgroup" style={{ clipPath: `inset(-20% -20% ${(100 - (djBottom.top + djBottom.h)).toFixed(2)}% -20%)` }}>
              {piece("dj-boy")}
              {piece(
                "dj-console",
                <>
                  <span className="gd-cone" style={local("dj-console", "coneL")} />
                  <span className="gd-cone" style={local("dj-console", "coneR")} />
                </>,
              )}
            </div>
            {piece("crew-gujarati")}
            {piece(
              "crew-couple",
              <span className="gd-hem" style={local("crew-couple", "hem")}>
                {Array.from({ length: 8 }, (_, i) => (
                  <img key={i} src={url(KINDS.sparkles[i % 4])} alt="" style={{ left: `${50 + 50 * Math.cos((i * Math.PI) / 4)}%`, top: `${50 + 22 * Math.sin((i * Math.PI) / 4)}%` }} />
                ))}
              </span>,
            )}
            {piece("crew-flowergirl")}
            {piece("crew-kerala")}
            {BEAMS.map((b, i) => (
              <div key={`b${i}`} className="gd-beam" data-look="dance" style={{ ["--c" as string]: b.c, ["--a" as string]: `${b.a}deg` }} />
            ))}
            <div className="gd-dots" data-look="dance">
              {Array.from({ length: S.reflections }, (_, i) => (
                <span key={i} className="gd-dot" style={{ ["--c" as string]: ["#ffd88a", "#ff9fc8", "#c7a2ff"][i % 3] }} />
              ))}
            </div>
            {piece("truss")}
            {piece(
              "disco-ball",
              <span className="gd-ball" style={{ left: `${(DB.ball[0] - DB_R) * 100}%`, top: `${(DB.ball[1] - DB_R * P["disco-ball"].aspect) * 100}%`, width: `${DB_R * 200}%` }}>
                <i className="gd-band" />
                {[0, 1, 2, 3, 4].map((i) => (
                  <img key={i} className="gd-facet" src={url(KINDS.sparkles[i % 4])} alt="" style={{ left: `${[30, 64, 44, 22, 70][i]}%`, top: `${[28, 36, 62, 52, 66][i]}%` }} />
                ))}
              </span>,
            )}
            <span className="gd-lightball" style={{ width: `${META.ball.r * 2}%` }} />

            {/* sparks and twinkles, then the particles */}
            <div className="gd-fx">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <img key={`s${i}`} className="gd-spark" src={url(KINDS.sparks[i % 3])} alt="" />
              ))}
              {Array.from({ length: 18 }, (_, i) => (
                <img key={`g${i}`} className="gd-glint" src={url(KINDS.sparkles[i % 4])} alt="" />
              ))}
            </div>
            <ParticlePool n={60} />
          </>
        )}
      </div>
      <button
        type="button"
        className="hw-pill gd-toggle"
        aria-pressed={reduce ? still === "dance" : false}
        aria-label={reduce && still === "dance" ? "Switch to the garba" : "Switch to the dance floor"}
        onClick={reduce ? () => setStill((m) => (m === "garba" ? "dance" : "garba")) : undefined}
      >
        <span className="gd-t-g">Garba</span>
        <span className="gd-t-x" aria-hidden>
          ✦
        </span>
        <span className="gd-t-d">Dance</span>
      </button>
    </div>
  );
}
