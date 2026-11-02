"use client";
/* eslint-disable @next/next/no-img-element -- pre-sized WebP cut-outs */

/**
 * A lotus for the scene engine, drawn the way a painter draws one: every petal
 * faces us (so none is ever seen edge-on, as a sliver), but sits on a ring
 * seen in perspective — its base on an ellipse, leaning outward the way it
 * would on a real flower, nearer petals a little bigger and in front, farther
 * ones behind. Turning the ring moves every petal round the ellipse, so it
 * reads as a 3D flower turning.
 *
 * Geometry in units of the lotus radius (R = 1). The camera's tilt gives the
 * ellipse (kc = cos tilt: how flat the ring looks; ks = sin tilt: how upright
 * things stand). One shared stacking: each petal's z-index follows its depth,
 * so the people (at a fixed z) stand inside the flower — the near petals in
 * front of them, the far ones behind.
 */
import type { CSSProperties } from "react";

export type RingSpec = { piece: string; n: number; lite?: number; r: number; h: number; drop?: number; lean: number; offset: number };
export type Petal = { key: string; ring: number; i: number; n: number; piece: string; theta: number; r: number; h: number; drop: number; lean: number; s: number; aspect: number };
export type View = {
  /** the lotus centre (stage %) and radius (% of the stage width) */
  x: number;
  y: number;
  R: number;
  /** the camera's tilt onto it (°) */
  tilt: number;
  /** z-index at the ring's middle depth, and how much depth spreads it */
  z: number;
  zSpread: number;
};

const seeded = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** every petal of the rings (lite: the reduced counts) */
export function buildPetals(rings: readonly RingSpec[], aspectOf: (piece: string) => number, seed: number, lite = false): Petal[] {
  const rnd = seeded(seed);
  return rings.flatMap((ring, ri) => {
    const n = lite && ring.lite ? ring.lite : ring.n;
    return Array.from({ length: n }, (_, i) => ({
      key: `${ri}-${i}`,
      ring: ri,
      i,
      n,
      piece: ring.piece,
      theta: ((i + ring.offset) / n) * 360,
      r: ring.r,
      h: ring.h,
      drop: ring.drop ?? 0,
      lean: ring.lean + (rnd() * 2 - 1) * 3,
      s: 1 + (rnd() * 2 - 1) * 0.04,
      aspect: aspectOf(ring.piece),
    }));
  });
}

const rad = (d: number) => (d * Math.PI) / 180;

/**
 * Where a petal at ring angle a (°; 0 = nearest us) with lean L (°) is drawn: its base (R units,
 * from the centre, on screen), its rotation (° from upright), its scale (x, y), its depth (−1 far …
 * 1 near), its tip (R units) and brightness.
 */
export function pose(p: Petal, a: number, lean: number, tilt: number) {
  const ar = rad(a);
  const kc = Math.cos(rad(tilt));
  const ks = Math.sin(rad(tilt));
  const sa = Math.sin(ar);
  const ca = Math.cos(ar);
  const bx = -p.r * sa;
  const by = p.r * ca * kc + p.drop * ks; // (grows from below the floor)
  const ps = (1 + 0.12 * ca * p.r) * p.s; // nearer, a little bigger
  const L = rad(lean);
  const dx = -sa * Math.sin(L);
  const dy = ca * Math.sin(L) * kc - Math.cos(L) * ks;
  const len = Math.hypot(dx, dy) || 1;
  const rot = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const sy = 0.62 + 0.38 * Math.min(1, len); // leaning towards / away from us: a little foreshortened
  const tl = p.h * ps * sy;
  // lit from the upper left; the inside faces (far half) a touch darker
  const lb = 0.965 + 0.0815 * (sa - ca);
  const light = Math.round((ca < 0 ? lb * 0.9 : lb) * 50) / 50;
  return { bx, by, rot, sx: ps, sy: ps * sy, depth: ca * p.r, tip: { x: bx + (dx / len) * tl, y: by + (dy / len) * tl }, light };
}

/** the petal's inline transform (offsets in stage widths, via the scene's --sw) */
export function petalTransform(v: View, q: ReturnType<typeof pose>) {
  const fx = (q.bx * v.R) / 100;
  const fy = (q.by * v.R) / 100;
  return `translate(calc(var(--sw) * ${fx.toFixed(4)}), calc(var(--sw) * ${fy.toFixed(4)})) rotate(${q.rot.toFixed(2)}deg) scale(${q.sx.toFixed(3)}, ${q.sy.toFixed(3)})`;
}
/** its z-index: by depth, never level with the floor / the centre piece (at v.z) */
export const petalZ = (v: View, q: ReturnType<typeof pose>) => Math.round(v.z + q.depth * v.zSpread) + (q.depth >= 0 ? 1 : -1);

/**
 * The petals of one lotus, as flat elements in the scene's stacking (no wrapper of their own,
 * so the people can sit between them). Drawn at ring angle `spin` (the ticker takes over).
 */
export function LotusPetals({ view, petals, url, spin = 0, className }: { view: View; petals: Petal[]; url: (piece: string) => string; spin?: number; className: string }) {
  return (
    <>
      {petals.map((p) => {
        const q = pose(p, p.theta + spin, p.lean, view.tilt);
        const w = p.h * p.aspect * view.R; // % of the stage width
        const st: CSSProperties = {
          left: `${view.x}%`,
          top: `${view.y}%`,
          width: `${w}%`,
          marginLeft: `${-w / 2}%`,
          marginTop: `${-(p.h * view.R)}%`,
          aspectRatio: p.aspect,
          transform: petalTransform(view, q),
          zIndex: petalZ(view, q),
        };
        return (
          <div key={p.key} className={`lt-petal ${className}`} data-p={p.key} data-ring={p.ring} style={st}>
            <img src={url(p.piece)} alt="" draggable={false} style={{ filter: `brightness(${q.light})` }} />
          </div>
        );
      })}
    </>
  );
}
