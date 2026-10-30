"use client";
/* eslint-disable @next/next/no-img-element -- pre-sized WebP cut-outs, decoded by hand before they show */

/**
 * The shared engine behind the event scenes (Mehndi, Haldi, …): illustrated
 * cut-outs placed from a layout config, assembled by a GSAP timeline as the
 * event's page arrives, then idling gently.
 *
 *  - pieces + pivots + extras: public/scenes/<event>/manifest.json
 *    (scripts/build-scene-assets.mjs)
 *  - layout: src/config/scenes/<event>.json — per item x, y (the piece's
 *    pivot, % of the stage), w (% of stage width), z, flip, rot, group
 *  - assets lazy-load and decode before anything shows; ?debug=1 shows the
 *    master art at 40% behind the stage
 *  - one shared ticker for particles; idle loops pause off-screen / in a hidden tab
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { gsap, ScrollTrigger } from "@/src/lib/gsap";

export type Piece = { src: string; w: number; h: number; aspect: number; pivot: number[]; [extra: string]: unknown };
export type Item = { id: string; piece: string; x: number; y: number; w: number; z: number; flip?: boolean; rot?: number; group?: string };
export type Layout = { aspect: number; items: Item[]; groups?: Record<string, { z?: number; pivot?: number[] }> };
export type Manifest = { name: string; master?: string; pieces: Record<string, unknown> };
export type Region = { x: number; y: number; r: number; name?: string; piece?: string };

export function makeScene(manifest: Manifest, layout: Layout, headroom: number) {
  const dir = `/scenes/${manifest.name}/`;
  const P = manifest.pieces as Record<string, Piece>;
  const ITEMS = layout.items;
  const ASPECT = layout.aspect; // stage height / width
  const url = (name: string) => dir + P[name].src;
  /** where an item sits: % of the stage, from its pivot */
  const box = (it: Item) => {
    const m = P[it.piece];
    const h = it.w / m.aspect / ASPECT;
    const px = it.flip ? 1 - m.pivot[0] : m.pivot[0];
    return { left: it.x - px * it.w, top: it.y - m.pivot[1] * h, w: it.w, h, origin: `${px * 100}% ${m.pivot[1] * 100}%` };
  };
  const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<string, Item>;
  /** a named point of an item's piece (e.g. a pour spout), in % of the stage */
  const point = (id: string, name: string) => {
    const it = byId[id];
    const b = box(it);
    const pt = (P[it.piece].points as Record<string, number[]>)[name];
    const fx = it.flip ? 1 - pt[0] : pt[0];
    return { x: b.left + b.w * fx, y: b.top + b.h * pt[1] };
  };
  return { dir, P, ITEMS, ASPECT, url, box, byId, point, master: manifest.master ? dir + manifest.master : null, headroom };
}
export type Scene = ReturnType<typeof makeScene>;

/** load + decode every piece as the scene approaches; false until all are ready */
export function useSceneAssets(wrap: RefObject<HTMLElement | null>, scrollerRef: RefObject<HTMLElement | null>, urls: string[]) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let started = false;
    const load = () => {
      if (started) return;
      started = true;
      io.disconnect();
      Promise.all(
        urls.map((u) => {
          const im = new Image();
          im.src = u;
          return im.decode().catch(() => {});
        }),
      ).then(() => setReady(true));
    };
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && load(), { root: scrollerRef.current, rootMargin: "150% 0px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollerRef]);
  return ready;
}

export function useDebug() {
  return useMemo(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1", []);
}

/** the master art behind the stage (?debug=1); the stage is the master plus headroom on top */
export function DebugMaster({ scene }: { scene: Scene }) {
  if (!scene.master) return null;
  const top = (scene.headroom / scene.ASPECT) * 100;
  return <img className="ms-debug" src={scene.master} alt="" style={{ top: `${top}%`, height: `${(1.5 / scene.ASPECT) * 100}%` }} />;
}

/** every layout item, back to front; items of a group (e.g. the swing) move as one */
export function SceneItems({
  scene,
  extra,
  exclude,
  groupExtra,
}: {
  scene: Scene;
  extra?: (it: Item) => ReactNode;
  exclude?: (it: Item) => boolean;
  /** more content inside a group (drawn behind its items) */
  groupExtra?: (name: string) => ReactNode;
}) {
  const groups = new Map<string, Item[]>();
  const loose: Item[] = [];
  for (const it of scene.ITEMS) {
    if (exclude?.(it)) continue;
    if (it.group) groups.set(it.group, [...(groups.get(it.group) ?? []), it]);
    else loose.push(it);
  }
  const render = (it: Item) => {
    const b = scene.box(it);
    const imgStyle: CSSProperties = {};
    const t = [it.flip ? "scaleX(-1)" : "", it.rot ? `rotate(${it.rot}deg)` : ""].join(" ").trim();
    if (t) imgStyle.transform = t;
    return (
      <div
        key={it.id}
        className="ms-item"
        data-id={it.id}
        style={{ left: `${b.left}%`, top: `${b.top}%`, width: `${b.w}%`, height: `${b.h}%`, zIndex: it.z, transformOrigin: b.origin }}
      >
        <img src={scene.url(it.piece)} alt="" draggable={false} style={t ? imgStyle : undefined} />
        {extra?.(it)}
      </div>
    );
  };
  return (
    <>
      {loose.map(render)}
      {[...groups].map(([name, its]) => (
        <div key={name} className="ms-group" data-group={name} style={{ zIndex: Math.min(...its.map((i) => i.z)) }}>
          {groupExtra?.(name)}
          {its.map(render)}
        </div>
      ))}
    </>
  );
}

/**
 * A radial-wipe reveal of an overlay (henna on palms, haldi on cheeks): a soft
 * circle grows from the region's centre while the art inside counter-scales,
 * so the art stays put and only its visible circle widens (transforms only).
 * `aspect` = the host piece's width / height; the region is in its fractions.
 */
export function Reveal({ src, region, aspect }: { src: string; region: Region; aspect: number }) {
  const { x, y, r } = region;
  const rh = r * aspect; // the radius as a share of the piece's height
  return (
    <div className="ms-reveal" data-region={region.name} style={{ left: `${(x - r) * 100}%`, top: `${(y - rh) * 100}%`, width: `${2 * r * 100}%`, height: `${2 * rh * 100}%` }}>
      <div className="ms-reveal-wipe">
        <img
          src={src}
          alt=""
          style={{
            width: `${100 / (2 * r)}%`,
            height: `${100 / (2 * rh)}%`,
            left: `${(-(x - r) / (2 * r)) * 100}%`,
            top: `${(-(y - rh) / (2 * rh)) * 100}%`,
            transformOrigin: `${x * 100}% ${y * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
/** add a reveal's wipe to a timeline (works reversed too) */
export function revealTween(tl: gsap.core.Timeline, el: Element, at: number, duration: number) {
  const wipe = el.querySelector<HTMLElement>(".ms-reveal-wipe")!;
  const img = el.querySelector<HTMLElement>("img")!;
  const s = { v: 0.02 };
  tl.fromTo(
    s,
    { v: 0.02 },
    {
      v: 1,
      duration,
      ease: "power2.inOut",
      onUpdate: () => {
        gsap.set(wipe, { scale: s.v });
        gsap.set(img, { scale: 1 / s.v });
      },
    },
    at,
  );
}

/* ── particles: one shared ticker for the whole scene ─────────────────── */
export type Particle = {
  el: HTMLImageElement;
  on: boolean;
  tag: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** gravity (px/s²) */
  g: number;
  r: number;
  vr: number;
  sw: number;
  f: number;
  ph: number;
  t: number;
  life: number;
  s: number;
  /** gone below this y */
  floor: number;
  /** bounce once at this y (water drops landing), then fade */
  land: number;
};
export function createParticles(pool: HTMLImageElement[], H: () => number, url: (n: string) => string) {
  const rnd = gsap.utils.random;
  const parts: Particle[] = pool.map((el) => ({ el, on: false, tag: "", x: 0, y: 0, vx: 0, vy: 0, g: 0, r: 0, vr: 0, sw: 0, f: 0, ph: 0, t: 0, life: 0, s: 1, floor: 0, land: Infinity }));
  const spawn = (src: string, x: number, y: number, o: Partial<Particle> = {}) => {
    const p = parts.find((q) => !q.on);
    if (!p) return null;
    Object.assign(p, { on: true, tag: "", x, y, vx: 0, vy: 20, g: 0, r: rnd(0, 360), vr: rnd(-40, 40), sw: rnd(6, 14), f: rnd(0.6, 1.2), ph: rnd(0, 6), t: 0, life: 6, s: rnd(0.75, 1.1), floor: H() * 0.97, land: Infinity }, o);
    if (p.el.getAttribute("src") !== url(src)) p.el.src = url(src);
    return p;
  };
  const tick = (_t: number, dms: number) => {
    const dt = Math.min(0.05, dms / 1000);
    for (const p of parts) {
      if (!p.on) continue;
      p.t += dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      if (p.y >= p.land && p.vy > 0) {
        // a tiny bounce where it lands, then it fades
        p.y = p.land;
        p.vy *= -0.28;
        p.vx *= 0.5;
        p.land = Infinity;
        p.life = Math.min(p.life, p.t + 0.45);
      }
      const sway = Math.sin(p.t * p.f * Math.PI * 2 + p.ph) * p.sw;
      const fadeIn = Math.min(1, p.t / 0.25);
      const fadeOut = Math.min(1, (p.life - p.t) / 0.5, (p.floor - p.y) / (H() * 0.06));
      const a = Math.max(0, Math.min(fadeIn, fadeOut));
      p.el.style.transform = `translate3d(${(p.x + sway).toFixed(1)}px,${p.y.toFixed(1)}px,0) rotate(${p.r.toFixed(1)}deg) scale(${p.s})`;
      p.el.style.opacity = a.toFixed(3);
      if (p.t > p.life || p.y > p.floor) {
        p.on = false;
        p.el.style.opacity = "0";
      }
    }
  };
  let ticking = false;
  const setTicking = (on: boolean) => {
    if (on && !ticking) gsap.ticker.add(tick);
    if (!on && ticking) gsap.ticker.remove(tick);
    ticking = on;
  };
  const count = (tag: string) => parts.filter((p) => p.on && p.tag === tag).length;
  return { parts, spawn, setTicking, count };
}
export function ParticlePool({ n = 22 }: { n?: number }) {
  return (
    <div className="ms-particles">
      {Array.from({ length: n }, (_, i) => (
        <img key={i} className="ms-particle" alt="" />
      ))}
    </div>
  );
}

/* ── idle: a paused-able timeline, spawners, and visibility gating ───── */
export function createIdle() {
  const rnd = gsap.utils.random;
  const idle = gsap.timeline({ paused: true });
  /** call fn every min–max seconds (inside the idle timeline, so it pauses with it) */
  const every = (min: number, max: number, fn: () => void, first?: number) => {
    const loop = () => {
      fn();
      idle.add(gsap.delayedCall(rnd(min, max), loop), idle.time());
    };
    idle.add(gsap.delayedCall(first ?? rnd(min, max), loop), idle.time());
  };
  return { idle, every };
}

/**
 * Run the idle (and the particle ticker) only while the stage is on screen
 * and the tab is visible. `onShow` fires when the stage comes back into view.
 */
export function gateIdle(stage: HTMLElement, idle: gsap.core.Timeline, setTicking: (on: boolean) => void, started: () => boolean, onShow?: () => void) {
  let onScreen = false;
  const run = () => {
    const go = started() && onScreen && !document.hidden;
    if (go) idle.play();
    else idle.pause();
    setTicking(go);
  };
  const io = new IntersectionObserver(([e]) => {
    const was = onScreen;
    onScreen = e.isIntersecting;
    run();
    if (!was && onScreen) onShow?.();
  });
  io.observe(stage);
  const onVis = () => run();
  document.addEventListener("visibilitychange", onVis);
  return {
    run,
    dispose: () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      setTicking(false);
      idle.kill();
    },
  };
}

/**
 * Play the assembly (laid out over `T` timeline units) in `seconds` once the
 * stage's top reaches `startAt` of the screen — i.e. as the event's page
 * glides in — and back out (faster) if the guest returns up.
 */
export function playOnArrival(o: {
  tl: gsap.core.Timeline;
  stage: HTMLElement;
  scroller: HTMLElement;
  T: number;
  seconds: number;
  reverseSpeed: number;
  startAt: string;
  onComplete: () => void;
  onLeaveBack?: () => void;
}) {
  const speed = o.T / o.seconds;
  o.tl.eventCallback("onComplete", o.onComplete);
  const play = () => o.tl.timeScale(speed).play();
  return ScrollTrigger.create({
    trigger: o.stage,
    scroller: o.scroller,
    start: `top ${o.startAt}`,
    onEnter: play,
    onEnterBack: play,
    onLeaveBack: () => {
      o.onLeaveBack?.();
      o.tl.timeScale(speed * o.reverseSpeed).reverse();
    },
  });
}

/** a wrapper style for a scene's stage (its height:width ratio, for the shared CSS) */
export const stageVars = (aspect: number): CSSProperties => ({ ["--sa" as string]: aspect }) as CSSProperties;
