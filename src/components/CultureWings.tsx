"use client";
/* eslint-disable @next/next/no-img-element -- pre-sized WebP cut-outs, decoded before they show */

/**
 * The culture "side wings" of the opening card: Kerala (the bride's family) down the left edge,
 * Gujarat (the groom's family) down the right — backwaters and a houseboat, palms, a jasmine
 * strand and a brass lamp, Kathakali with a nilavilakku, uruli and pookalam; a temple stepwell
 * with its flag, kites, latkans and a lantern, a garba couple with a garbo; flowers in both
 * bottom corners and water with lotuses along the bottom.
 *
 * They sweep in from the screen edges as the card starts its reveal (the card dispatches
 * "invite:card-reveal"), then idle gently (CSS loops, a waving flag on a canvas, drifting
 * petals). Everything is placed in px from the card's real size: top pieces from the top,
 * bottom pieces from the bottom, the scenery and palms by height. The card text is sacred: each
 * piece's painted outline is checked against every text line, band by band; a side shrinks (to
 * no less than minScale) and then any piece still in the way moves outward. Re-checked on resize.
 *
 * Kathakali's eye glances and the garba click are whole-piece swaps of aligned edits; they run
 * only once those edits exist (see scripts/scenes/culture.config.mjs).
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { gsap } from "@/src/lib/gsap";
import { timing } from "@/src/config/timing";
import { CITEMS, CP, CULTURE_KINDS, CULTURE_MASTER, cultureImages, cultureUrl, type CultureItem } from "@/src/config/culture";
import { createParticles } from "./scenes/engine";

const S = timing.culture;
const rnd = gsap.utils.random;

/* ── where each piece belongs ─────────────────────────────────────────── */
const TOP = new Set(["jasmine-strand", "brass-lamp", "latkan-short", "latkan-long", "lantern", "kite-1", "kite-2", "kite-3"]);
const MID = new Set(["backwaters-view", "temple-stepwell", "palm-1", "palm-2", "houseboat", "flag"]);
const isWater = (id: string) => /^(water-strip|leaf-|lotus-|bud-|fdiya-)/.test(id);
type Side = "left" | "right" | "water";
const sideOf = (it: CultureItem): Side => (isWater(it.id) ? "water" : it.x < 50 ? "left" : "right");
/** scenery that melts into the parchment on its inner side (share of its width) */
const SOFT: Record<string, number> = { "backwaters-view": 0.36, "temple-stepwell": 0.22 };

/** the idle loop of each piece (CSS): kind, period (s), amplitude, phase */
type Idle = { k: "sway" | "drift" | "kite" | "breathe" | "bob"; dur: number; amp?: number; delay?: number };
const IDLE: Record<string, Idle> = {
  "palm-1": { k: "sway", dur: 6, amp: 1.5 },
  "palm-2": { k: "sway", dur: 7, amp: 1.5, delay: -2.3 },
  houseboat: { k: "drift", dur: 14 },
  "kite-1": { k: "kite", dur: 7 },
  "kite-2": { k: "kite", dur: 8, delay: -3.1 },
  "kite-3": { k: "kite", dur: 9, delay: -5.4 },
  "jasmine-strand": { k: "sway", dur: 5.2, amp: 2 },
  "latkan-short": { k: "sway", dur: 5.6, amp: 2, delay: -1.4 },
  "latkan-long": { k: "sway", dur: 6.1, amp: 2, delay: -3.2 },
  "brass-lamp": { k: "sway", dur: 4.4, amp: 3, delay: -0.8 },
  lantern: { k: "sway", dur: 4.9, amp: 3, delay: -2.6 },
  kathakali: { k: "breathe", dur: 4.3 },
  "garba-couple": { k: "bob", dur: 0.6, amp: 2 },
  "lotus-a": { k: "bob", dur: 3.1, amp: 3 },
  "lotus-b": { k: "bob", dur: 3.7, amp: 3, delay: -1.1 },
  "lotus-c": { k: "bob", dur: 4.3, amp: 3, delay: -2.2 },
  "lotus-d": { k: "bob", dur: 3.4, amp: 3, delay: -0.6 },
  "bud-a": { k: "bob", dur: 2.9, amp: 2.5, delay: -1.7 },
  "bud-b": { k: "bob", dur: 3.3, amp: 2.5, delay: -0.4 },
  "leaf-a": { k: "bob", dur: 4.9, amp: 2, delay: -2 },
  "leaf-b": { k: "bob", dur: 5.3, amp: 2, delay: -0.9 },
  "leaf-c": { k: "bob", dur: 5.8, amp: 2, delay: -3.3 },
  "fdiya-a": { k: "bob", dur: 3.6, amp: 2.5, delay: -1.2 },
  "fdiya-b": { k: "bob", dur: 4.1, amp: 2.5, delay: -2.8 },
};

/** flames: named points of a piece, and the flame's width as a share of the piece */
const FLAMES: Record<string, { pts: string[]; w: number }> = {
  "brass-lamp": { pts: ["w1", "w2", "w3", "w4"], w: 0.075 },
  nilavilakku: { pts: ["w1", "w2", "w3", "w4"], w: 0.08 },
  garbo: { pts: ["flame"], w: 0.17 },
  "temple-stepwell": { pts: ["d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9"], w: 0.02 },
  "diya-1": { pts: ["wick"], w: 0.22 },
  "diya-2": { pts: ["wick"], w: 0.22 },
};
/** water that shimmers: a region of a piece (two named corner points; the whole piece if none) */
const WATER_REGION: Record<string, [string, string] | null> = { "backwaters-view": ["water0", "water1"], "temple-stepwell": ["water0", "water1"], "water-strip": null };

/** sprite moments: an edit swapped in whole over its base (only when its pieces exist) */
const SWAPS = [
  { id: "eyes-left", base: "kathakali", piece: "kathakali-eyes-left" },
  { id: "eyes-right", base: "kathakali", piece: "kathakali-eyes-right" },
  { id: "click", base: "garba-couple", piece: "garba-click" },
].filter((s) => CP[s.piece]?.align);

/* ── geometry ─────────────────────────────────────────────────────────── */
type Rect = { left: number; right: number; top: number; bottom: number };
type Placed = { it: CultureItem; side: Side; left: number; top: number; w: number; h: number; ox: number; oy: number };
type Fit = { scale: Record<Side, number>; nudge: Record<string, number>; dy: Record<string, number> };
/** pieces that move together (the houseboat sits on the backwaters' water) */
const LINKED: Record<string, string> = { houseboat: "backwaters-view" };

/** every piece in card px, for a card W × H, a scale per side and per-piece outward nudges */
function placeAll(W: number, H: number, fit: Fit) {
  const k = W / 1024;
  const out: Record<string, Placed> = {};
  for (const it of CITEMS) {
    const pc = CP[it.piece];
    if (!pc || it.id === "flag") continue;
    const side = sideOf(it);
    const s = fit.scale[side];
    const mw = (it.w / 100) * 1024;
    const mh = it.h ? (it.h / 100) * 1536 : mw / pc.aspect;
    const mx = (it.x / 100) * 1024;
    const my = (it.y / 100) * 1536;
    const w = mw * k * s;
    const h = mh * k * s;
    const px = side === "left" ? mx * k * s : side === "right" ? W - (1024 - mx) * k * s : mx * k;
    const py = TOP.has(it.id) ? my * k * s : MID.has(it.id) ? (my / 1536) * H : H - (1536 - my) * k * s;
    const ox = it.flip ? 1 - pc.pivot[0] : pc.pivot[0];
    const oy = pc.pivot[1];
    const dy = fit.dy?.[LINKED[it.id] ?? it.id] ?? 0;
    out[it.id] = { it, side, left: px - ox * w + (fit.nudge[it.id] ?? 0), top: py - oy * h + dy, w, h, ox, oy };
  }
  // the flag stands on the temple's shikhara
  const t = out["temple-stepwell"];
  const fl = CITEMS.find((i) => i.id === "flag");
  const ft = CP["temple-stepwell"]?.points?.flagTop;
  if (t && fl && ft && CP.flag) {
    const pc = CP.flag;
    const w = (fl.w / 100) * W * fit.scale.right;
    const h = w / pc.aspect;
    const tx = t.left + ft[0] * t.w;
    const ty = t.top + ft[1] * t.h;
    out.flag = { it: fl, side: "right", left: tx - pc.pivot[0] * w, top: ty + h * 0.04 - pc.pivot[1] * h, w, h, ox: pc.pivot[0], oy: pc.pivot[1] };
  }
  return out;
}

/** how far a piece must move outward to clear the obstacles (its painted outline, band by band) */
function overlapOf(p: Placed, obs: Rect[], W: number) {
  const pc = CP[p.it.piece];
  if (!pc.prof || p.it.id === "water-strip") return 0;
  const dir = p.side === "left" ? -1 : p.side === "right" ? 1 : p.left + p.w / 2 < W / 2 ? -1 : 1;
  const soft = SOFT[p.it.id] ?? 0;
  const MX = 8;
  const MY = 10;
  let need = 0;
  pc.prof.forEach((band, b) => {
    if (!band) return;
    const a0 = p.it.flip ? 1 - band[1] : band[0];
    const a1 = p.it.flip ? 1 - band[0] : band[1];
    let x0 = p.left + a0 * p.w;
    let x1 = p.left + a1 * p.w;
    // the softened inner side is see-through: only what is still mostly solid counts
    if (soft) {
      if (dir < 0) x1 = Math.min(x1, p.left + p.w * (1 - soft * 0.6));
      else x0 = Math.max(x0, p.left + p.w * soft * 0.6);
    }
    if (x1 <= x0) return;
    const y0 = p.top + (b / 16) * p.h;
    const y1 = p.top + ((b + 1) / 16) * p.h;
    for (const r of obs) {
      if (y1 < r.top - MY || y0 > r.bottom + MY) continue;
      if (dir < 0 && x1 > r.left - MX && x0 < r.right) need = Math.max(need, x1 - (r.left - MX));
      if (dir > 0 && x0 < r.right + MX && x1 > r.left) need = Math.max(need, r.right + MX - x0);
    }
  });
  return need * dir;
}

/** the side scales and nudges that keep every piece off the text */
function fitAround(W: number, H: number, obs: Rect[]): Fit {
  const fit: Fit = { scale: { left: 1, right: 1, water: 1 }, nudge: {}, dy: {} };
  for (const side of ["left", "right"] as const) {
    for (let s = 1; s >= S.minScale - 1e-6; s -= 0.05) {
      fit.scale[side] = +s.toFixed(2);
      const pl = placeAll(W, H, fit);
      if (!Object.values(pl).some((p) => p.side === side && overlapOf(p, obs, W) !== 0)) break;
    }
  }
  // the scenery and palms (placed by height) may also slide up or down a little, to where the
  // text is narrowest, before they move outward (the houseboat goes with its backwaters)
  const u = W / 390;
  for (const id of ["backwaters-view", "temple-stepwell", "palm-1", "palm-2"]) {
    let best = { need: Infinity, dy: 0 };
    for (let d = -70; d <= 70; d += 5) {
      fit.dy[id] = d * u;
      const pl = placeAll(W, H, fit);
      const ids = [id, ...Object.keys(LINKED).filter((k) => LINKED[k] === id)];
      const need = Math.max(...ids.filter((k) => pl[k]).map((k) => Math.abs(overlapOf(pl[k], obs, W))));
      if (need < best.need - 0.5 || (Math.abs(need - best.need) <= 0.5 && Math.abs(d) < Math.abs(best.dy))) best = { need, dy: d };
    }
    fit.dy[id] = best.dy * u;
  }
  const pl = placeAll(W, H, fit);
  for (const p of Object.values(pl)) {
    const n = overlapOf(p, obs, W);
    if (n) fit.nudge[p.it.id] = n;
  }
  // linked pieces keep together: both move as far as the one that needs most
  for (const [a, b] of Object.entries(LINKED)) {
    const n = [fit.nudge[a] ?? 0, fit.nudge[b] ?? 0].sort((x, y) => Math.abs(y) - Math.abs(x))[0];
    if (n) fit.nudge[a] = fit.nudge[b] = n;
  }
  // the flag goes where its temple goes
  if (fit.nudge["temple-stepwell"]) fit.nudge.flag = fit.nudge["temple-stepwell"];
  return fit;
}

/** the card text (and the seal's roses, the scroll hint): line by line, in card px */
function measureText(card: HTMLElement): Rect[] {
  const cr = card.getBoundingClientRect();
  const out: Rect[] = [];
  const add = (r: DOMRect) => r.width > 1 && r.height > 1 && out.push({ left: r.left - cr.left, right: r.right - cr.left, top: r.top - cr.top, bottom: r.bottom - cr.top });
  card.querySelectorAll(".content .together, .content .name, .content .relation, .content .parents, .content .joiner-word, .content .invite, .content .tagline, .content .venue").forEach((el) => {
    const rg = document.createRange();
    rg.selectNodeContents(el);
    for (const r of rg.getClientRects()) add(r);
  });
  card.querySelectorAll(".content .date-block, .content .divider, .content .scroll-hint, .content .seal-wrap, .content .joiner .flourish, .content .name-flourish, .seal-cluster .flower-bloom, .seal-cluster .rosebud").forEach((el) => add(el.getBoundingClientRect()));
  return out;
}

const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

export function CultureWings({ cardRef, reduced }: { cardRef: RefObject<HTMLElement | null>; reduced: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ W: number; H: number; fit: Fit } | null>(null);
  const [ready, setReady] = useState(false);
  const debug = useMemo(() => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("debug") : null), []);

  /* decode every image first */
  useEffect(() => {
    let live = true;
    const all = cultureImages.map((u) => {
      const im = new Image();
      im.src = u;
      return im.decode().catch(() => {});
    });
    Promise.race([Promise.all(all), new Promise((r) => setTimeout(r, 4000))]).then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);

  /* measure the card and its text; fit the wings round it (again on every resize) */
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const W = card.clientWidth;
        const H = card.clientHeight;
        if (!W || !H) return;
        setSize({ W, H, fit: fitAround(W, H, measureText(card)) });
      });
    };
    document.fonts?.ready.then(measure).catch(measure);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(card);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [cardRef]);

  const placed = useMemo(() => (size ? placeAll(size.W, size.H, size.fit) : null), [size]);

  /* ── the entrance, the loops, the flag, the petals ─────────────────── */
  const started = useRef(false);
  useEffect(() => {
    const el = root.current;
    const card = cardRef.current;
    if (!el || !card || !placed || !ready) return;
    const q = gsap.utils.selector(el);
    const item = (id: string) => q(`[data-id="${id}"]`)[0] as HTMLElement | undefined;
    const enter = (id: string) => item(id)?.querySelector<HTMLElement>(".cu-e") ?? null;
    const enters = (ids: string[]) => ids.map(enter).filter(Boolean) as HTMLElement[];
    const W = () => card.clientWidth;
    const H = () => card.clientHeight;
    const u = () => W() / 390;
    const cleanups: (() => void)[] = [];

    /* the flag: thin vertical strips, displaced by a wave from the pole to the tip */
    const flagCv = q(".cu-flag-cv")[0] as HTMLCanvasElement | undefined;
    const flagImg = new Image();
    flagImg.src = cultureUrl("flag");
    const cloth = CP.flag?.points?.cloth?.[0] ?? 0.03;
    let flagT = 0;
    let flagOn = true;
    const drawFlag = (t: number) => {
      if (!flagCv || !flagImg.complete || !flagImg.naturalWidth) return;
      const ctx = flagCv.getContext("2d");
      if (!ctx) return;
      const cw = flagCv.width;
      const ch = flagCv.height;
      const iw = flagImg.naturalWidth;
      const ih = flagImg.naturalHeight;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(flagImg, 0, 0, cloth * iw, ih, 0, 0, cloth * cw, ch);
      const N = 40;
      const A = ch * 0.07;
      for (let i = 0; i < N; i++) {
        const u0 = cloth + ((1 - cloth) * i) / N;
        const u1 = cloth + ((1 - cloth) * (i + 1)) / N;
        const along = (i + 0.5) / N; // 0 at the pole … 1 at the tip
        const dy = A * along * Math.sin(Math.PI * 2 * (along * 1.3 - t / 0.95));
        ctx.drawImage(flagImg, u0 * iw, 0, (u1 - u0) * iw + 1, ih, u0 * cw, dy, (u1 - u0) * cw + 1, ch);
      }
    };
    const sizeFlag = () => {
      if (!flagCv) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      flagCv.width = Math.round(flagCv.clientWidth * dpr);
      flagCv.height = Math.round(flagCv.clientHeight * dpr);
      drawFlag(flagT);
    };
    flagImg.decode().then(sizeFlag).catch(() => {});
    sizeFlag();

    /* drifting petals: jasmine buds and frangipani from the top left, marigold and rose from the top right */
    const pool = q(".cu-particle") as HTMLImageElement[];
    const parts = createParticles(pool, H, cultureUrl);
    let maxParts: number = S.maxParticles;

    /* run only while the card is on screen and the tab visible; shed work on a slow phone */
    let visible = true;
    let live = false;
    let frames = 0;
    let fpsT = 0;
    let slowFor = 0;
    const tick = (_t: number, dms: number) => {
      const dt = Math.min(0.05, dms / 1000);
      if (flagOn) {
        flagT += dt;
        drawFlag(flagT);
      }
      frames++;
      fpsT += dt;
      if (fpsT >= 1) {
        slowFor = frames / fpsT < S.minFps ? slowFor + 1 : 0;
        frames = 0;
        fpsT = 0;
        if (slowFor >= 2 && !el.dataset.lite) {
          el.dataset.lite = "1";
          flagOn = false;
          maxParts = Math.ceil(S.maxParticles / 2);
        }
      }
    };
    let ticking = false;
    const run = () => {
      const go = live && visible && !document.hidden;
      el.toggleAttribute("data-paused", !go);
      if (go && !ticking) gsap.ticker.add(tick);
      if (!go && ticking) gsap.ticker.remove(tick);
      ticking = go;
      parts.setTicking(go);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      run();
    });
    io.observe(card);
    const onVis = () => run();
    document.addEventListener("visibilitychange", onVis);
    cleanups.push(() => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      gsap.ticker.remove(tick);
      parts.setTicking(false);
    });

    /** a small scheduler that waits while paused */
    const every = (min: number, max: number, fn: () => void, first?: number) => {
      let call: gsap.core.Tween | null = null;
      const loop = () => {
        if (live && visible && !document.hidden) fn();
        call = gsap.delayedCall(rnd(min, max), loop);
      };
      call = gsap.delayedCall(first ?? rnd(min, max), loop);
      cleanups.push(() => call?.kill());
    };

    /** a little burst of gold sparkles at a point (card px) */
    const sparkles = q(".cu-spark") as HTMLElement[];
    let sk = 0;
    const burst = (x: number, y: number, n = 4, spread = 16) => {
      for (let i = 0; i < n; i++) {
        const s = sparkles[sk++ % sparkles.length];
        gsap.set(s, { x: x + rnd(-spread, spread) * u(), y: y + rnd(-spread, spread) * u() });
        gsap.fromTo(s, { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: rnd(0.6, 1), opacity: 1, rotation: 45, duration: 0.22 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.35 }], ease: "sine.inOut", delay: i * 0.04, overwrite: true });
      }
    };
    const at = (id: string, fx: number, fy: number) => {
      const p = placed[id];
      return { x: p.left + fx * p.w, y: p.top + fy * p.h };
    };

    /** a sprite moment: an aligned edit swapped in whole for a moment */
    const swap = (id: string, ms: number, delay = 0) => {
      const s = q(`.cu-swap[data-swap="${id}"]`)[0] as HTMLElement | undefined;
      if (!s) return;
      gsap.delayedCall(delay, () => {
        s.style.visibility = "visible";
        gsap.delayedCall(ms / 1000, () => (s.style.visibility = "hidden"));
      });
    };
    const glance = () => {
      const r = Math.random();
      if (r < 0.6) {
        swap("eyes-left", 600);
        swap("eyes-right", 600, 0.6);
      } else swap(r < 0.8 ? "eyes-left" : "eyes-right", 600);
    };
    const click = () => {
      if (!SWAPS.some((s) => s.id === "click")) return;
      swap("click", 160);
      swap("click", 160, 0.28);
      const c = at("garba-couple", 0.5, 0.12);
      gsap.delayedCall(0.05, () => burst(c.x, c.y, 4, 10));
      gsap.delayedCall(0.33, () => burst(c.x, c.y, 4, 10));
    };

    const startLoops = () => {
      el.dataset.live = "1";
      live = true;
      run();
      every(1.2, 2.4, () => {
        if (parts.count("cu") >= maxParts) return;
        const left = Math.random() < 0.5;
        const kinds = left ? CULTURE_KINDS.left : CULTURE_KINDS.right;
        const x = left ? rnd(0, 0.3) * W() : rnd(0.7, 1) * W();
        parts.spawn(gsap.utils.random(kinds), x, -0.03 * H(), { tag: "cu", vx: (left ? 1 : -1) * rnd(3, 12) * u(), vy: rnd(16, 26) * u(), g: 0, life: 22, s: rnd(0.6, 0.95), sw: rnd(8, 16), f: rnd(0.25, 0.5) });
      }, 0.6);
      // mirror-work on the latkans catches the light
      every(1.1, 2.2, () => {
        const id = Math.random() < 0.5 ? "latkan-long" : "latkan-short";
        if (!placed[id]) return;
        const p = at(id, rnd(0.3, 0.7), rnd(0.1, 0.85));
        burst(p.x, p.y, 1, 2);
      }, 1.5);
      if (SWAPS.some((s) => s.id.startsWith("eyes"))) every(S.eyesEvery[0], S.eyesEvery[1], glance);
      if (SWAPS.some((s) => s.id === "click")) every(S.clickEvery[0], S.clickEvery[1], click);
    };

    /* reduced motion: the finished wings, still, the flames lit */
    if (reduced) {
      el.dataset.still = "1";
      drawFlag(0);
      return () => cleanups.forEach((f) => f());
    }

    /* ── the entrance (seconds from the card's appearance) ── */
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
    const flamesOf = (ids: string[]) => ids.flatMap((id) => [...(item(id)?.querySelectorAll<HTMLElement>(".cu-flame") ?? [])]);
    gsap.set(q(".cu-e"), { autoAlpha: 0 });
    gsap.set(q(".cu-flame"), { scale: 0, autoAlpha: 0 });
    gsap.set(q(".cu-glow"), { opacity: 0 });
    // 0.0 — 0.8  the scenery slides in from both edges
    tl.fromTo(enters(["backwaters-view"]), { x: () => -40 * u(), autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8 }, 0);
    tl.fromTo(enters(["temple-stepwell"]), { x: () => 40 * u(), autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8 }, 0);
    // 0.2 — 0.9  the water rises along the bottom; lotuses and leaves pop up
    tl.fromTo(enters(["water-strip"]), { y: () => 30 * u(), autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6 }, 0.2);
    tl.fromTo(enters(CITEMS.filter((i) => /^(leaf-|lotus-|bud-|fdiya-)/.test(i.id)).map((i) => i.id)), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.45, ease: "back.out(2.2)", stagger: 0.04 }, 0.35);
    // 0.4 — 1.2  palms grow, kites float up (strings draw), the flag unfurls
    tl.fromTo(enters(["palm-1", "palm-2"]), { scaleY: 0, autoAlpha: 0 }, { scaleY: 1, autoAlpha: 1, duration: 0.8, ease: "back.out(1.5)", stagger: 0.12 }, 0.4);
    ["kite-1", "kite-2", "kite-3"].forEach((id, i) => {
      const e = enter(id);
      if (!e) return;
      tl.fromTo(e, { y: () => H() * 0.35, x: () => (i - 1) * 20 * u(), autoAlpha: 0, rotation: -15 }, { y: 0, x: 0, autoAlpha: 1, rotation: 0, duration: 0.8, ease: "sine.out" }, 0.4 + i * 0.1);
    });
    tl.fromTo(q(".cu-string path"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, ease: "none", stagger: 0.1 }, 0.6);
    tl.fromTo(enters(["flag"]), { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: 0.7, ease: "power2.out" }, 0.5);
    // 0.6 — 1.4  the houseboat drifts in; strands, lamp and lantern drop and swing; flames light
    tl.fromTo(enters(["houseboat"]), { x: () => -60 * u(), autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8, ease: "power2.out" }, 0.6);
    tl.fromTo(enters(["jasmine-strand", "latkan-short", "latkan-long"]), { scaleY: 0, autoAlpha: 0 }, { scaleY: 1, autoAlpha: 1, duration: 0.5, ease: "power2.out", stagger: 0.08 }, 0.6);
    tl.fromTo(enters(["jasmine-strand", "latkan-short", "latkan-long"]), { rotation: 0 }, { keyframes: [{ rotation: 5, duration: 0.25 }, { rotation: -3, duration: 0.3 }, { rotation: 0, duration: 0.3 }], ease: "sine.inOut", stagger: 0.08 }, 1.0);
    tl.fromTo(enters(["brass-lamp", "lantern"]), { y: () => -40 * u(), autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: "power2.out", stagger: 0.1 }, 0.7);
    tl.fromTo(enters(["brass-lamp", "lantern"]), { rotation: 0 }, { keyframes: [{ rotation: -6, duration: 0.25 }, { rotation: 4, duration: 0.3 }, { rotation: 0, duration: 0.3 }], ease: "sine.inOut", stagger: 0.1 }, 1.0);
    tl.to(flamesOf(["brass-lamp"]), { scale: 1, autoAlpha: 1, duration: 0.3, ease: "back.out(2)", stagger: 0.06 }, 1.25);
    tl.to(q('[data-id="lantern"] .cu-glow'), { opacity: 1, duration: 0.6 }, 1.25);
    // 1.0 — 1.8  Kathakali rises; the garba couple twirl in; the props pop and light
    tl.fromTo(enters(["kathakali"]), { y: () => 40 * u(), autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, 1.0);
    tl.fromTo(enters(["garba-couple"]), { y: () => 40 * u(), autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, 1.0);
    tl.fromTo(enters(["garba-couple"]), { scaleX: 1 }, { keyframes: [{ scaleX: -1, duration: 0.3 }, { scaleX: 1, duration: 0.3 }], ease: "sine.inOut" }, 1.05);
    tl.fromTo(enters(["nilavilakku", "uruli", "pookalam", "garbo"]), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.5, ease: "back.out(2)", stagger: 0.08 }, 1.2);
    tl.to(flamesOf(["nilavilakku", "garbo", "fdiya-a", "fdiya-b"]), { scale: 1, autoAlpha: 1, duration: 0.3, ease: "back.out(2)", stagger: 0.05 }, 1.55);
    tl.to(flamesOf(["temple-stepwell"]), { scale: 1, autoAlpha: 1, duration: 0.3, ease: "back.out(2)", stagger: 0.04 }, 1.3);
    tl.to(q('[data-id="garbo"] .cu-glow'), { opacity: 1, duration: 0.6 }, 1.65);
    // 1.6 — 2.2  the corner flowers bloom from their corners
    tl.fromTo(enters(["flowers-left"]), { scale: 0.6, rotation: -8, autoAlpha: 0 }, { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.6, ease: "back.out(1.6)" }, 1.6);
    tl.fromTo(enters(["flowers-right"]), { scale: 0.6, rotation: 8, autoAlpha: 0 }, { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.6, ease: "back.out(1.6)" }, 1.65);
    // 2.2 — 2.8  the first sprite moment (once the edits exist)
    tl.call(() => {
      if (SWAPS.some((s) => s.id.startsWith("eyes"))) {
        swap("eyes-left", 400);
        swap("eyes-right", 400, 0.4);
      }
      click();
    }, undefined, 2.2);
    tl.call(startLoops, undefined, 2.3);
    // the flag waves (and particles fly) from the start
    tl.call(() => {
      live = true;
      run();
    }, undefined, 0.5);

    const play = () => {
      if (started.current) {
        tl.progress(1);
        return;
      }
      started.current = true;
      gsap.delayedCall(S.enterAt / timing.speed, () => tl.play(0));
    };
    // the card dispatches this as its reveal starts (and marks itself, in case it came first)
    if (card.dataset.reveal) play();
    window.addEventListener("invite:card-reveal", play);
    cleanups.push(() => {
      window.removeEventListener("invite:card-reveal", play);
      tl.kill();
    });
    if (process.env.NODE_ENV !== "production") (window as unknown as { __cultureTl: gsap.core.Timeline }).__cultureTl = tl;
    return () => cleanups.forEach((f) => f());
  }, [placed, ready, reduced, cardRef]);

  if (!placed || !size) return <div ref={root} className="cu-wings" aria-hidden />;

  return (
    <div ref={root} className="cu-wings" aria-hidden style={{ ["--cu-u" as string]: `${size.W / 390}px` } as CSSProperties}>
      {debug === "1" && <img className="cu-debug" src={CULTURE_MASTER} alt="" style={{ top: 0, width: "100%" }} />}
      {Object.values(placed)
        .sort((a, b) => a.it.z - b.it.z)
        .map((p) => (
          <PieceView key={p.it.id} p={p} />
        ))}
      {CULTURE_KINDS.sparkles.concat(CULTURE_KINDS.sparkles).map((n, i) => (
        <img key={`s${i}`} className="cu-spark" src={cultureUrl(n)} alt="" />
      ))}
      <div className="cu-particles">
        {Array.from({ length: S.maxParticles }, (_, i) => (
          <img key={i} className="cu-particle" alt="" />
        ))}
      </div>
    </div>
  );
}

/** one piece: placed (px) › entrance (GSAP) › idle (CSS) › its picture and extras */
function PieceView({ p }: { p: Placed }) {
  const { it } = p;
  const pc = CP[it.piece];
  const idle = IDLE[it.id];
  const origin = `${pct(p.ox)} ${pct(p.oy)}`;
  const soft = SOFT[it.id];
  const placeStyle: CSSProperties = { left: p.left, top: p.top, width: p.w, height: p.h, zIndex: Math.round(it.z * 10) };
  if (soft) {
    const g = p.side === "left" ? `linear-gradient(to right, #000 ${(1 - soft) * 100}%, transparent 100%)` : `linear-gradient(to left, #000 ${(1 - soft) * 100}%, transparent 100%)`;
    placeStyle.maskImage = g;
    placeStyle.WebkitMaskImage = g;
  }
  const idleStyle: CSSProperties = { transformOrigin: origin };
  if (idle) Object.assign(idleStyle, { ["--d" as string]: `${idle.dur}s`, ["--a" as string]: `${idle.amp ?? 0}`, animationDelay: `${idle.delay ?? 0}s` });
  const flames = FLAMES[it.piece];
  const region = it.piece in WATER_REGION ? WATER_REGION[it.piece] : undefined;
  const flip = it.flip ? { transform: "scaleX(-1)" } : undefined;
  return (
    <div className="cu-p" data-id={it.id} data-side={p.side} style={placeStyle}>
      <div className="cu-e" style={{ transformOrigin: it.id === "flag" ? `${pct(CP.flag?.points?.cloth?.[0] ?? 0)} 50%` : origin }}>
        <div className={`cu-i${idle ? ` cu-${idle.k}` : ""}`} style={idleStyle}>
          {it.id === "flag" ? <canvas className="cu-flag-cv" /> : <img src={cultureUrl(it.piece)} alt="" draggable={false} style={flip} />}
          {it.id === "lantern" && pc.points?.glow && <span className="cu-glow cu-glow-lantern" style={{ left: pct(pc.points.glow[0]), top: pct(pc.points.glow[1]) }} />}
          {it.id === "garbo" && CP["garbo-holes"] && <img className="cu-glow cu-holes" src={cultureUrl("garbo-holes")} alt="" />}
          {region !== undefined && <Shimmer p={p} region={region} />}
          {flames?.pts.map((name, i) => {
            const pt = pc.points?.[name];
            if (!pt) return null;
            return (
              <span key={name} className="cu-flame" style={{ left: pct(it.flip ? 1 - pt[0] : pt[0]), top: pct(pt[1]), width: pct(flames.w), ["--fd" as string]: `${0.9 + ((i * 0.37) % 0.6)}s`, animationDelay: `${-i * 0.23}s` } as CSSProperties}>
                <span className="cu-flame-glow" />
                <img src={cultureUrl(CULTURE_KINDS.flames[i % 3])} alt="" />
              </span>
            );
          })}
          {it.id.startsWith("kite-") && pc.points?.string && <KiteString p={p} at={pc.points.string} />}
          {SWAPS.filter((s) => s.base === it.piece).map((s) => {
            const al = CP[s.piece].align!;
            return <img key={s.id} className="cu-swap" data-swap={s.id} src={cultureUrl(s.piece)} alt="" style={{ left: pct(al.x), top: pct(al.y), width: pct(al.w), height: pct(al.h) }} />;
          })}
        </div>
      </div>
    </div>
  );
}

/** a soft band of light moving across a piece's water (clipped to the painted water) */
function Shimmer({ p, region }: { p: Placed; region: [string, string] | null }) {
  const pc = CP[p.it.piece];
  const a = region ? pc.points?.[region[0]] : [0, 0];
  const b = region ? pc.points?.[region[1]] : [1, 1];
  if (!a || !b) return null;
  const [l, t, r, bt] = [a[0], a[1], b[0], b[1]];
  const mask = `url(${cultureUrl(p.it.piece)})`;
  const st: CSSProperties = {
    left: pct(l),
    top: pct(t),
    width: pct(r - l),
    height: pct(bt - t),
    maskImage: mask,
    WebkitMaskImage: mask,
    maskSize: `${p.w}px ${p.h}px`,
    WebkitMaskSize: `${p.w}px ${p.h}px`,
    maskPosition: `${-l * p.w}px ${-t * p.h}px`,
    WebkitMaskPosition: `${-l * p.w}px ${-t * p.h}px`,
  };
  return (
    <span className="cu-shimmer" style={st}>
      <span className="cu-band" />
    </span>
  );
}

/** a kite's string: from its tail down past the right edge (moves with the kite) */
function KiteString({ p, at }: { p: Placed; at: number[] }) {
  const sx = at[0] * p.w;
  const sy = at[1] * p.h;
  const ex = sx + p.w * 1.6;
  const ey = sy + p.h * 2.4;
  return (
    <svg className="cu-string" width={p.w} height={p.h} viewBox={`0 0 ${p.w} ${p.h}`} aria-hidden>
      <path d={`M${sx} ${sy} Q${sx + p.w * 0.1} ${sy + p.h * 1.6} ${ex} ${ey}`} pathLength={1} strokeDasharray="1" />
    </svg>
  );
}
