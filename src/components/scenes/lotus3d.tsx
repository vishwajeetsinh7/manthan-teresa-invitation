"use client";
/* eslint-disable @next/next/no-img-element -- pre-sized WebP cut-outs */

/**
 * A 3D lotus for the scene engine: rings of upright petals standing on a disc,
 * seen by one camera that looks down at it (CSS perspective + rotateX), the
 * whole ring turning in its own plane (rotateZ inside the tilt).
 *
 * Each petal: ring angle θ → out to the ring's radius → leaned outward about
 * its base (rotateX), with a little random lean and size. Fake light: brighter
 * facing the upper left, darker on the inside faces (the far half).
 *
 * People have to stand INSIDE the flower, so the petals are drawn twice: a
 * BACK copy (behind the people, with the floor) and a FRONT copy (over them)
 * whose petals only show on the near half — the scene's ticker hands each
 * petal from one to the other as the ring turns (frontOpacity).
 *
 * Geometry is in units of the lotus radius (R = 1). In the page, the disc is a
 * square `.lt-tilt` box 2R wide, centred on the lotus, in a stage-sized `.lt-3d`
 * box whose perspective-origin is the lotus centre.
 */
import type { CSSProperties, ReactNode } from "react";

export type RingSpec = { piece: string; n: number; lite?: number; r: number; h: number; lean: number; offset: number };
export type Petal = { key: string; ring: number; i: number; n: number; piece: string; theta: number; r: number; h: number; lean: number; s: number; aspect: number };

/** a small seeded random (the same petals every time) */
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
      lean: ring.lean + (rnd() * 2 - 1) * 3,
      s: 1 + (rnd() * 2 - 1) * 0.04,
      aspect: aspectOf(ring.piece),
    }));
  });
}

const rad = (d: number) => (d * Math.PI) / 180;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** how much of a petal at ring angle a (°, 0 = nearest us) the FRONT copy shows */
export const frontOpacity = (a: number) => smooth(-0.12, 0.22, Math.cos(rad(a)));
/** how far a petal at ring angle a turns its face to the camera (about its spine) */
export const petalTwist = (a: number, max: number) => Math.round(Math.sin(rad(a)) * max / 2) * 2;
/** its brightness: lit from the upper left; the inside faces (far half) a little darker */
export const petalLight = (a: number) => {
  const s = Math.sin(rad(a));
  const c = Math.cos(rad(a));
  const b = 0.965 + 0.0815 * (s - c);
  return Math.round((c < 0 ? b * 0.88 : b) * 50) / 50;
};

/**
 * Where a point of the ring lands on screen: (x, y) in R units from the lotus centre, for a
 * point at (along, up) of a petal (along = out from its base, up = above the disc, R units)
 * at ring angle a; the ring tilted by `tilt`° and seen with perspective P (R units).
 */
export function project(a: number, along: number, up: number, tilt: number, P: number) {
  const Y = along;
  const x = -Y * Math.sin(rad(a));
  const y = Y * Math.cos(rad(a));
  const T = rad(tilt);
  const y2 = y * Math.cos(T) - up * Math.sin(T);
  const z2 = y * Math.sin(T) + up * Math.cos(T);
  const k = P / (P - z2);
  return { x: x * k, y: y2 * k, near: Math.cos(rad(a)) };
}
/** a petal's tip, out from the centre and up from the disc (R units) */
export const tipOf = (p: Petal) => ({ along: p.r + p.h * p.s * Math.sin(rad(p.lean)), up: p.h * p.s * Math.cos(rad(p.lean)) });

/** the inline transform of a petal's ring slot (θ, out to its radius) */
const slot = (p: Petal) => `rotateZ(${p.theta.toFixed(2)}deg) translateY(${((p.r / p.h) * 100).toFixed(2)}%)`;

/**
 * One copy of a lotus: the tilted disc (with `floor` inside it, if given) and its petals.
 * `spin`: the ring's angle (°) to draw it at before the ticker takes over (and in reduced motion).
 */
export function Lotus3D({
  className,
  centre,
  radius,
  aspect,
  tilt,
  perspective,
  petals,
  url,
  copy,
  spin = 0,
  twist = 0,
  floor,
  style,
}: {
  className: string;
  /** the lotus centre, stage % */
  centre: { x: number; y: number };
  /** its radius, % of the stage width */
  radius: number;
  /** the stage's height / width */
  aspect: number;
  tilt: number;
  /** × the stage width */
  perspective: number;
  petals: Petal[];
  url: (piece: string) => string;
  copy: "back" | "front";
  spin?: number;
  /** petalTwist's max (°) */
  twist?: number;
  floor?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`lt-3d ${className}`}
      data-copy={copy}
      style={{ perspectiveOrigin: `${centre.x}% ${centre.y}%`, perspective: `calc(var(--sw) * ${perspective})`, ["--tilt" as string]: `${tilt}deg`, ...style }}
    >
      <div className="lt-tilt" style={{ left: `${centre.x - radius}%`, top: `${centre.y - radius / aspect}%`, width: `${radius * 2}%` }}>
        {floor}
        <div className="lt-spin" style={{ transform: `rotateZ(${spin}deg)` }}>
          {petals.map((p) => {
            const a = p.theta + spin;
            const hPct = p.h * 50; // % of the disc (2R)
            const wPct = hPct * p.aspect;
            return (
              <div
                key={p.key}
                className="lt-petal"
                data-p={p.key}
                data-ring={p.ring}
                style={{ left: `${50 - wPct / 2}%`, top: `${50 - hPct}%`, width: `${wPct}%`, height: `${hPct}%`, transform: slot(p), opacity: copy === "front" ? frontOpacity(a) : undefined }}
              >
                <div
                  className="lt-lean"
                  style={{ ["--lean" as string]: `${p.lean.toFixed(2)}deg`, ["--tw" as string]: `${petalTwist(a, twist)}deg`, ["--s" as string]: p.s.toFixed(3), animationDelay: `${(-(p.theta / 360) * 10).toFixed(2)}s` } as CSSProperties}
                >
                  <img src={url(p.piece)} alt="" draggable={false} style={{ filter: `brightness(${petalLight(a)})` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
