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
import { gsap, ScrollTrigger } from "@/src/lib/gsap";
import { timing } from "@/src/config/timing";
import { CITEMS, CP, CULTURE_KINDS, CULTURE_MASTER, cultureImages, cultureUrl, type CultureItem } from "@/src/config/culture";
import { createParticles } from "./scenes/engine";

const S = timing.culture;
const rnd = gsap.utils.random;

/* ── where each piece belongs ─────────────────────────────────────────── */
const TOP = new Set(["jasmine-strand", "brass-lamp", "latkan-short", "latkan-long", "lantern"]);
const MID = new Set(["backwaters-view", "temple-stepwell", "palm-1", "palm-2", "houseboat", "flag", "kite-1", "kite-2", "kite-3"]);
const isWater = (id: string) => /^(water-strip|leaf-|lotus-|bud-|fdiya-)/.test(id);
type Side = "left" | "right" | "water";
const sideOf = (it: CultureItem): Side => (isWater(it.id) ? "water" : it.x < 50 ? "left" : "right");
/** scenery that would melt into the parchment on its inner side (share of its width) */
const SOFT: Record<string, number> = {}; // (none: the scenes keep their painted edges, not faded)

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
type Fit = { scale: Record<Side, number>; nudge: Record<string, number>; dy: Record<string, number>; gs: Record<string, number> };
/** scenes: an anchor and what rides with it (the houseboat on the backwaters' water); a scene
 *  shrinks about its anchor's pivot, slides and moves as one (the flag goes with its temple) */
const GROUPS: Record<string, string[]> = { "backwaters-view": ["backwaters-view", "houseboat"], "temple-stepwell": ["temple-stepwell"] };
const groupOf = (id: string) => (id === "flag" ? "temple-stepwell" : (Object.keys(GROUPS).find((g) => GROUPS[g].includes(id)) ?? id));
/** hanging pieces: they may hang lower, on a longer cord, to clear the buttons and the seal's roses */
const HANG = new Set(["jasmine-strand", "brass-lamp", "latkan-short", "latkan-long", "lantern"]);

/** every piece in card px, for a card W × H and a fit (side scales, scene scales, slides, nudges) */
function placeAll(W: number, H: number, f: Fit) {
  // (a fit saved before a field existed — e.g. across a hot reload — still works)
  const fit: Fit = { scale: f.scale ?? { left: 1, right: 1, water: 1 }, nudge: f.nudge ?? {}, dy: f.dy ?? {}, gs: f.gs ?? {} };
  const k = W / 1024;
  const raw: Record<string, { it: CultureItem; side: Side; px: number; py: number; w: number; h: number; ox: number; oy: number }> = {};
  for (const it of CITEMS) {
    const pc = CP[it.piece];
    if (!pc || it.id === "flag") continue;
    const side = sideOf(it);
    const s = fit.scale[side];
    const mw = (it.w / 100) * 1024;
    const mh = it.h ? (it.h / 100) * 1536 : mw / pc.aspect;
    const mx = (it.x / 100) * 1024;
    const my = (it.y / 100) * 1536;
    raw[it.id] = {
      it,
      side,
      px: side === "left" ? mx * k * s : side === "right" ? W - (1024 - mx) * k * s : mx * k,
      py: TOP.has(it.id) ? my * k * s : MID.has(it.id) ? (my / 1536) * H : H - (1536 - my) * k * s,
      w: mw * k * s,
      h: mh * k * s,
      ox: it.flip ? 1 - pc.pivot[0] : pc.pivot[0],
      oy: pc.pivot[1],
    };
  }
  // a scene shrinks about its anchor's pivot
  for (const [g, ids] of Object.entries(GROUPS)) {
    const gs = fit.gs[g] ?? 1;
    const A = raw[g];
    if (!A || gs === 1) continue;
    const [ax, ay] = [A.px, A.py];
    for (const id of ids) {
      const r = raw[id];
      if (!r) continue;
      r.px = ax + (r.px - ax) * gs;
      r.py = ay + (r.py - ay) * gs;
      r.w *= gs;
      r.h *= gs;
    }
  }
  const out: Record<string, Placed> = {};
  for (const [id, r] of Object.entries(raw)) {
    const key = groupOf(id);
    out[id] = { it: r.it, side: r.side, left: r.px - r.ox * r.w + (fit.nudge[key] ?? 0), top: r.py - r.oy * r.h + (fit.dy[key] ?? 0), w: r.w, h: r.h, ox: r.ox, oy: r.oy };
  }
  // the flag stands on the temple's shikhara
  const t = out["temple-stepwell"];
  const fl = CITEMS.find((i) => i.id === "flag");
  const ft = CP["temple-stepwell"]?.points?.flagTop;
  if (t && fl && ft && CP.flag) {
    const pc = CP.flag;
    const w = (fl.w / 100) * W * fit.scale.right * (fit.gs["temple-stepwell"] ?? 1);
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

/** how much of a box stays on the card, side to side (0 … 1) */
const onCard = (left: number, w: number, W: number) => Math.max(0, Math.min(W, left + w) - Math.max(0, left)) / w;

/** the scales, slides and nudges that keep every piece off the text — and the scenes whole */
function fitAround(W: number, H: number, obs: Rect[]): Fit {
  const fit: Fit = { scale: { left: 1, right: 1, water: 1 }, nudge: {}, dy: {}, gs: {} };
  const u = W / 390;
  const scenic = (id: string) => groupOf(id) in GROUPS || id.startsWith("palm-");
  // 1. each side shrinks (to minScale) for its figures, props, kites and hanging pieces
  for (const side of ["left", "right"] as const) {
    for (let s = 1; s >= S.minScale - 1e-6; s -= 0.05) {
      fit.scale[side] = +s.toFixed(2);
      const pl = placeAll(W, H, fit);
      if (!Object.values(pl).some((p) => p.side === side && !scenic(p.it.id) && !HANG.has(p.it.id) && overlapOf(p, obs, W) !== 0)) break;
    }
  }
  // 2. hanging pieces may hang lower (never higher) to clear the buttons, the roses and the text
  for (const id of HANG) {
    let best = { need: Infinity, d: 0 };
    for (let d = 0; d <= 110; d += 4) {
      fit.dy[id] = d * u;
      const p = placeAll(W, H, fit)[id];
      if (!p) break;
      const need = Math.abs(overlapOf(p, obs, W));
      if (need < best.need - 0.5) best = { need, d };
      if (need === 0) break;
    }
    fit.dy[id] = best.d * u;
  }
  // 3. each scene shrinks and slides to where the text leaves the most room, kept whole on the
  //    card, clear of the figure below it and of the top
  for (const g of Object.keys(GROUPS)) {
    let best = { score: -Infinity, gs: 1, d: 0 };
    for (let gs = 1; gs >= 0.5 - 1e-6; gs -= 0.05) {
      for (let d = -150; d <= 150; d += 6) {
        fit.gs[g] = gs;
        fit.dy[g] = d * u;
        const pl = placeAll(W, H, fit);
        const A = pl[g];
        if (!A) continue;
        const fig = pl[A.side === "left" ? "kathakali" : "garba-couple"];
        if (fig && A.top + A.h > fig.top + fig.h * 0.3) continue;
        if (A.top < H * 0.16) continue;
        const ids = [...GROUPS[g], ...(g === "temple-stepwell" ? ["flag"] : [])].filter((id) => pl[id]);
        const need = Math.max(...ids.map((id) => Math.abs(overlapOf(pl[id], obs, W))));
        const shift = A.side === "left" ? -need : need;
        const vis = Math.min(...GROUPS[g].filter((id) => pl[id]).map((id) => onCard(pl[id].left + shift, pl[id].w, W)));
        const score = gs * gs * vis ** 3 - (Math.abs(d) / 390) * 0.15;
        if (score > best.score) best = { score, gs, d };
      }
    }
    fit.gs[g] = +best.gs.toFixed(2);
    fit.dy[g] = best.d * u;
  }
  // 4. the palms (placed by height) may slide up or down a little
  for (const id of ["palm-1", "palm-2"]) {
    let best = { need: Infinity, d: 0 };
    for (let d = -70; d <= 70; d += 5) {
      fit.dy[id] = d * u;
      const p = placeAll(W, H, fit)[id];
      if (!p) break;
      const need = Math.abs(overlapOf(p, obs, W));
      if (need < best.need - 0.5 || (Math.abs(need - best.need) <= 0.5 && Math.abs(d) < Math.abs(best.d))) best = { need, d };
    }
    fit.dy[id] = best.d * u;
  }
  // 5. anything still in the way moves outward (a scene as one, as far as its member that needs most)
  const pl = placeAll(W, H, fit);
  for (const p of Object.values(pl)) {
    const n = overlapOf(p, obs, W);
    const key = groupOf(p.it.id);
    if (n && Math.abs(n) > Math.abs(fit.nudge[key] ?? 0)) fit.nudge[key] = n;
  }
  return fit;
}

/** the card text, the seal and its roses, the scroll hint and the top buttons: line by line, in
 *  card px, as they finally sit (the reveal's own offsets taken out) */
function measureText(card: HTMLElement): Rect[] {
  const cr = card.getBoundingClientRect();
  const out: Rect[] = [];
  const own = (el: Element) => ({ x: Number(gsap.getProperty(el, "x")) || 0, y: Number(gsap.getProperty(el, "y")) || 0 });
  const add = (r: DOMRect, o = { x: 0, y: 0 }) =>
    r.width > 1 && r.height > 1 && out.push({ left: r.left - cr.left - o.x, right: r.right - cr.left - o.x, top: r.top - cr.top - o.y, bottom: r.bottom - cr.top - o.y });
  card.querySelectorAll(".content .name, .content .relation, .content .parents, .content .joiner-word, .content .invite, .content .tagline, .content .venue").forEach((el) => {
    const rg = document.createRange();
    rg.selectNodeContents(el);
    const o = own(el);
    for (const r of rg.getClientRects()) add(r, o);
  });
  // "TOGETHER WITH OUR FAMILIES" is split into letters that start spread apart
  card.querySelectorAll(".content .together").forEach((el) => {
    const chars = el.querySelectorAll(".char");
    if (!chars.length) {
      const rg = document.createRange();
      rg.selectNodeContents(el);
      for (const r of rg.getClientRects()) add(r);
    } else chars.forEach((c) => add(c.getBoundingClientRect(), own(c)));
  });
  card.querySelectorAll(".content .date-block, .content .divider, .content .scroll-hint, .content .seal-wrap, .content .joiner .flourish, .content .name-flourish, .seal-cluster .flower").forEach((el) => add(el.getBoundingClientRect()));
  // the replay and music buttons (only while the card is at the top of the page)
  if (Math.abs(cr.top) < 4) document.querySelectorAll(".controls .ctrl").forEach((el) => add(el.getBoundingClientRect()));
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
    // first once the fonts are in (the text's final size), then only when the card changes size
    let lastW = 0;
    let lastH = 0;
    const onResize = () => {
      if (card.clientWidth === lastW && card.clientHeight === lastH) return;
      lastW = card.clientWidth;
      lastH = card.clientHeight;
      measure();
    };
    const ro = new ResizeObserver(onResize);
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      onResize();
      ro.observe(card);
    });
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
    const fx = createParticles(q(".cu-fx") as HTMLImageElement[], H, cultureUrl);
    const rings = q(".cu-ring") as HTMLElement[];
    let ringI = 0;
    /** a ripple ring spreading on the water at (x, y), w wide */
    const ripple = (x: number, y: number, w: number, delay = 0) => {
      const g = rings[ringI++ % rings.length];
      gsap.set(g, { x, y, width: w, height: w * 0.3, xPercent: -50, yPercent: -50 });
      gsap.fromTo(g, { scale: 0.25, opacity: 0.9 }, { scale: 1.5, opacity: 0, duration: 1.8, ease: "sine.out", delay, overwrite: true });
    };
    /** where a water piece meets the water (its base) */
    const baseOf = (id: string) => {
      const pp = placed[id];
      return pp ? { x: pp.left + pp.w / 2, y: pp.top + pp.h * 0.9, w: pp.w } : null;
    };
    /** a small rising spark (an ember, a mote of light) */
    const ember = (x: number, y: number, slow = false) =>
      fx.spawn(gsap.utils.random(CULTURE_KINDS.sparkles), x, y, {
        vx: rnd(-6, 6) * u(),
        vy: -rnd(slow ? 9 : 18, slow ? 16 : 32) * u(),
        g: 0,
        r: 0,
        vr: rnd(-80, 80),
        sw: rnd(2, 6),
        f: rnd(0.4, 0.8),
        s: rnd(slow ? 0.18 : 0.25, slow ? 0.32 : 0.45),
        life: rnd(slow ? 2.4 : 1.1, slow ? 3.4 : 1.7),
      });
    /** petals thrown out from a point (the corner flowers opening, into the uruli) */
    const toss = (x: number, y: number, n: number, kinds: string[], dir: number, spread = 1) => {
      for (let i = 0; i < n; i++)
        parts.spawn(gsap.utils.random(kinds), x, y, { vx: dir * rnd(25, 70) * u() * spread, vy: -rnd(40, 80) * u() * spread, g: 140 * u(), life: rnd(1.4, 2.2), s: rnd(0.45, 0.7), sw: rnd(3, 7) });
    };
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
      fx.setTicking(go);
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
      fx.setTicking(false);
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
      // the water: ripples spread round the lotuses; motes of light rise from it now and then
      const waterIds = CITEMS.filter((i) => /^(lotus-|bud-|fdiya-)/.test(i.id)).map((i) => i.id);
      every(1.6, 3.2, () => {
        const b = baseOf(gsap.utils.random(waterIds));
        if (b) ripple(b.x, b.y, b.w * 1.8);
      }, 0.8);
      every(0.7, 1.3, () => {
        const wtr = placed["water-strip"];
        if (wtr && fx.count("") < 14) ember(rnd(0.08, 0.92) * W(), wtr.top + wtr.h * rnd(0.45, 0.85), true);
      }, 0.4);
      // the garbo breathes embers out of its mouth
      every(0.5, 1.1, () => {
        const g = placed.garbo;
        const pt = CP.garbo?.points?.flame;
        if (g && pt) ember(g.left + pt[0] * g.w + rnd(-3, 3) * u(), g.top + pt[1] * g.h);
      }, 0.3);
      // the garba couple: a dandiya beat now and then — two little hops, sparks at their sticks
      every(4, 6, () => {
        const e = enter("garba-couple");
        if (!e) return;
        gsap.to(e, { keyframes: [{ y: -5 * u(), duration: 0.13, ease: "power2.out" }, { y: 0, duration: 0.15, ease: "power2.in" }, { y: -4 * u(), duration: 0.12, ease: "power2.out" }, { y: 0, duration: 0.16, ease: "power2.in" }], overwrite: "auto" });
        for (const [fx0, fy0, dl] of [[0.32, 0.03, 0.08], [0.6, 0.06, 0.36]] as const) {
          const pt = at("garba-couple", fx0, fy0);
          gsap.delayedCall(dl, () => burst(pt.x, pt.y, 3, 6));
        }
      }, 2.5);
      // Kathakali bows a little, a glint at his folded hands
      every(6, 9, () => {
        const e = enter("kathakali");
        if (!e) return;
        gsap.to(e, { keyframes: [{ rotation: 2.4, duration: 0.8, ease: "sine.inOut" }, { rotation: 0, duration: 0.9, ease: "sine.inOut" }], overwrite: "auto" });
        const h = at("kathakali", 0.55, 0.32);
        gsap.delayedCall(0.55, () => burst(h.x, h.y, 2, 5));
      }, 4);
      // the pookalam twinkles; the corner flowers let a petal go now and then
      every(2.5, 4.5, () => {
        const p = at("pookalam", rnd(0.2, 0.8), rnd(0.3, 0.7));
        burst(p.x, p.y, 1, 3);
      }, 2);
      every(4, 7, () => {
        const left = Math.random() < 0.5;
        const f = at(left ? "flowers-left" : "flowers-right", left ? rnd(0.35, 0.7) : rnd(0.3, 0.65), rnd(0.15, 0.35));
        toss(f.x, f.y, 1, left ? CULTURE_KINDS.left : CULTURE_KINDS.right, left ? 1 : -1, 0.5);
      }, 3);
      if (SWAPS.some((s) => s.id.startsWith("eyes"))) every(S.eyesEvery[0], S.eyesEvery[1], glance);
      if (SWAPS.some((s) => s.id === "click")) every(S.clickEvery[0], S.clickEvery[1], click);
    };

    /* reduced motion: the finished wings, still, the flames lit */
    if (reduced) {
      el.dataset.still = "1";
      drawFlag(0);
      return () => cleanups.forEach((f) => f());
    }

    /* ── the entrance: on the card's own reveal beats (where the velvet corners, the vines,
          the corner roses and the rosebuds used to come in), at the card's speed ── */
    const B = S.enterAt; // where the velvet corners came in
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
    tl.timeScale(timing.speed);
    const flamesOf = (ids: string[]) => ids.flatMap((id) => [...(item(id)?.querySelectorAll<HTMLElement>(".cu-flame") ?? [])]);
    gsap.set(q(".cu-e"), { autoAlpha: 0 });
    gsap.set(q(".cu-flame"), { scale: 0, autoAlpha: 0 });
    gsap.set(q(".cu-glow"), { opacity: 0 });
    // 0.6  the scenery glides in from both edges (as the velvet did); the water rises; the
    //      houseboat drifts in on it; the flag unfurls on the temple
    tl.fromTo(enters(["backwaters-view"]), { x: () => -70 * u(), autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 1.4, ease: "power3.out" }, B);
    tl.fromTo(enters(["temple-stepwell"]), { x: () => 70 * u(), autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 1.4, ease: "power3.out" }, B);
    tl.fromTo(enters(["water-strip"]), { y: () => 26 * u(), autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.3, ease: "power3.out" }, B + 0.1);
    tl.fromTo(enters(["houseboat"]), { x: () => -50 * u(), autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 1.6, ease: "power2.out" }, B + 0.35);
    tl.fromTo(enters(["flag"]), { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: 0.8, ease: "power2.out" }, B + 1.1);
    // 1.2  (as the vines drew) the palms grow from their bases; the strands and lamps drop in and
    //      settle with a swing; the kites rise on the breeze and their strings draw out
    tl.fromTo(enters(["palm-2", "palm-1"]), { scaleY: 0.2, autoAlpha: 0 }, { scaleY: 1, autoAlpha: 1, duration: 1.1, ease: "power3.out", stagger: 0.15 }, B + 0.6);
    tl.fromTo(enters(["jasmine-strand", "latkan-short", "latkan-long"]), { scaleY: 0, autoAlpha: 0 }, { scaleY: 1, autoAlpha: 1, duration: 0.9, ease: "power2.out", stagger: 0.12 }, B + 0.7);
    tl.fromTo(enters(["brass-lamp", "lantern"]), { y: () => -30 * u(), autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: "power2.out", stagger: 0.12 }, B + 0.85);
    tl.fromTo(enters(["jasmine-strand", "latkan-short", "latkan-long", "brass-lamp", "lantern"]), { rotation: 0 }, { keyframes: [{ rotation: 4, duration: 0.35 }, { rotation: -2.5, duration: 0.4 }, { rotation: 0, duration: 0.4 }], ease: "sine.inOut", stagger: 0.08 }, B + 1.45);
    ["kite-1", "kite-2", "kite-3"].forEach((id, i) => {
      const e = enter(id);
      if (e) tl.fromTo(e, { y: () => 50 * u(), autoAlpha: 0, rotation: -10 }, { y: 0, autoAlpha: 1, rotation: 0, duration: 1.3, ease: "sine.out" }, B + 0.9 + i * 0.18);
    });
    tl.fromTo(q(".cu-string path"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: "none", stagger: 0.18 }, B + 1.2);
    // 2.0  (as the corner roses unfurled) the corner flowers open out from their corners, turning
    const unfurl = (id: string, corner: string, turn: number, at: number) => {
      const e = enter(id);
      if (!e) return;
      tl.fromTo(e, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "none" }, at);
      tl.fromTo(e, { rotation: turn, scale: 0.4 }, { rotation: 0, scale: 1, duration: 1.15, ease: "back.out(1.4)" }, at);
      tl.fromTo(e, { clipPath: `circle(12% at ${corner})` }, { clipPath: `circle(150% at ${corner})`, duration: 1.0, ease: "power2.out" }, at + 0.05);
      tl.set(e, { clipPath: "none" }, at + 1.1);
    };
    unfurl("flowers-left", "0% 100%", -18, B + 1.4);
    unfurl("flowers-right", "100% 100%", 18, B + 1.52);
    // the water: a sweep of golden light runs across it as it settles
    const sweep = q(".cu-sweep")[0] as HTMLElement | undefined;
    const wtr = placed["water-strip"];
    if (sweep && wtr) {
      gsap.set(sweep, { left: wtr.left, top: wtr.top + wtr.h * 0.3, width: wtr.w, height: wtr.h * 0.7 });
      tl.fromTo(sweep.firstElementChild, { xPercent: -120 }, { xPercent: 260, duration: 1.6, ease: "sine.inOut" }, B + 0.9);
      tl.fromTo(sweep, { opacity: 0 }, { keyframes: [{ opacity: 1, duration: 0.3 }, { opacity: 1, duration: 1.0 }, { opacity: 0, duration: 0.3 }] }, B + 0.9);
    }
    // 2.5  (as the rosebuds sprang) the lotuses rise out of the water and open, each sending a
    //      ripple; the leaves spread; the floating diyas bob up
    const lotusIds = CITEMS.filter((i) => /^(lotus-|bud-)/.test(i.id)).map((i) => i.id);
    lotusIds.forEach((id, i) => {
      const e = enter(id);
      if (!e) return;
      const at0 = B + 1.85 + i * 0.12;
      tl.fromTo(e, { y: () => 12 * u(), scaleX: 0.5, scaleY: 0.15, autoAlpha: 0 }, { y: 0, scaleX: 1, scaleY: 1, autoAlpha: 1, duration: 1.0, ease: "elastic.out(1, 0.6)" }, at0);
      tl.call(() => {
        const b = baseOf(id);
        if (b) ripple(b.x, b.y, b.w * 2);
      }, undefined, at0 + 0.05);
    });
    tl.fromTo(enters(CITEMS.filter((i) => /^leaf-/.test(i.id)).map((i) => i.id)), { scale: 0.2, rotation: -25, autoAlpha: 0 }, { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.9, ease: "back.out(1.6)", stagger: 0.1 }, B + 1.75);
    tl.fromTo(enters(["fdiya-a", "fdiya-b"]), { y: () => 14 * u(), autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: "back.out(2)", stagger: 0.15 }, B + 2.2);
    // the corner flowers throw a few petals as they open
    tl.call(() => {
      const l = at("flowers-left", 0.55, 0.2);
      const rr = at("flowers-right", 0.45, 0.2);
      toss(l.x, l.y, 5, CULTURE_KINDS.left, 1);
      toss(rr.x, rr.y, 5, CULTURE_KINDS.right, -1);
    }, undefined, B + 1.9);
    // 2.3  Kathakali rises into place and bows; the garba couple rise and step to the beat
    tl.fromTo(enters(["kathakali"]), { y: () => 34 * u(), autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.0, ease: "power3.out" }, B + 1.7);
    tl.to(enters(["kathakali"]), { keyframes: [{ rotation: 3, duration: 0.5, ease: "sine.inOut" }, { rotation: 0, duration: 0.6, ease: "sine.inOut" }] }, B + 2.75);
    tl.call(() => {
      const h = at("kathakali", 0.55, 0.32);
      burst(h.x, h.y, 3, 6);
    }, undefined, B + 3.0);
    tl.fromTo(enters(["garba-couple"]), { y: () => 34 * u(), autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, B + 1.85);
    tl.to(enters(["garba-couple"]), { keyframes: [{ y: () => -6 * u(), duration: 0.14, ease: "power2.out" }, { y: 0, duration: 0.16, ease: "power2.in" }, { y: () => -5 * u(), duration: 0.13, ease: "power2.out" }, { y: 0, duration: 0.17, ease: "power2.in" }] }, B + 2.8);
    tl.call(() => {
      for (const [fx0, fy0] of [[0.32, 0.03], [0.6, 0.06]] as const) {
        const pt = at("garba-couple", fx0, fy0);
        burst(pt.x, pt.y, 4, 8);
      }
    }, undefined, B + 2.9);
    // the props: the pookalam spreads from its centre like rangoli being laid; the uruli sets
    // down and petals drop into it; the nilavilakku rises; the garbo bounces down
    const pk = enter("pookalam");
    if (pk) {
      tl.fromTo(pk, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, B + 2.0);
      tl.fromTo(pk, { clipPath: "ellipse(0% 0% at 50% 55%)", scale: 0.85 }, { clipPath: "ellipse(75% 80% at 50% 55%)", scale: 1, duration: 1.1, ease: "power2.out" }, B + 2.0);
      tl.set(pk, { clipPath: "none" }, B + 3.15);
    }
    tl.fromTo(enters(["uruli"]), { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, ease: "back.out(2)" }, B + 2.15);
    tl.call(() => {
      const ur = placed.uruli;
      if (!ur) return;
      for (let i = 0; i < 5; i++)
        parts.spawn(gsap.utils.random([...CULTURE_KINDS.left, ...CULTURE_KINDS.right]), ur.left + ur.w * rnd(0.25, 0.75), ur.top - 30 * u(), { vx: rnd(-6, 6) * u(), vy: rnd(10, 25) * u(), g: 160 * u(), life: 0.55, s: rnd(0.35, 0.55), sw: 2 });
    }, undefined, B + 2.5);
    tl.fromTo(enters(["nilavilakku"]), { y: () => 20 * u(), scaleY: 0.8, autoAlpha: 0 }, { y: 0, scaleY: 1, autoAlpha: 1, duration: 0.8, ease: "back.out(1.6)" }, B + 2.05);
    tl.fromTo(enters(["garbo"]), { y: () => -36 * u(), autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: "bounce.out" }, B + 2.1);
    // 3.1  the lamps light, one wick after another, each with a spark; the lantern and the garbo
    //      glow, and the garbo breathes its first embers
    tl.to(flamesOf(["brass-lamp", "temple-stepwell"]), { scale: 1, autoAlpha: 1, duration: 0.35, ease: "back.out(2)", stagger: 0.04 }, B + 2.5);
    flamesOf(["nilavilakku", "garbo", "fdiya-a", "fdiya-b"]).forEach((f, i) => {
      const at0 = B + 2.75 + i * 0.12;
      tl.to(f, { scale: 1, autoAlpha: 1, duration: 0.35, ease: "back.out(2.4)" }, at0);
      tl.call(() => {
        const r0 = f.getBoundingClientRect();
        const cr = card.getBoundingClientRect();
        burst(r0.left - cr.left + r0.width / 2, r0.top - cr.top, 2, 4);
      }, undefined, at0 + 0.05);
    });
    tl.to(q('[data-id="lantern"] .cu-glow, [data-id="garbo"] .cu-glow'), { opacity: 1, duration: 0.8 }, B + 2.6);
    tl.call(() => {
      const g = placed.garbo;
      const pt = CP.garbo?.points?.flame;
      if (g && pt) for (let i = 0; i < 5; i++) gsap.delayedCall(i * 0.12, () => ember(g.left + pt[0] * g.w, g.top + pt[1] * g.h));
    }, undefined, B + 3.0);
    // the first sprite moment (once the edits exist), then the loops
    tl.call(() => {
      if (SWAPS.some((s) => s.id.startsWith("eyes"))) {
        swap("eyes-left", 400);
        swap("eyes-right", 400, 0.4);
      }
      click();
    }, undefined, B + 3.2);
    tl.call(startLoops, undefined, B + 3.3);
    // the flag waves (and petals fly) from the start
    tl.call(() => {
      live = true;
      run();
    }, undefined, B);

    const play = () => {
      if (started.current) {
        tl.progress(1);
        return;
      }
      started.current = true;
      tl.play(0);
    };
    /* scrolling down off the card: the bottom pieces slide away sideways (Kerala to the left,
       Gujarat to the right, the lotuses and diyas to their nearer edge, the water sinks away),
       and come back as the guest scrolls up again (scrubbed with the scroll) */
    const scroller = card.closest(".scroller") as HTMLElement | null;
    if (scroller) {
      const away = gsap.timeline({ paused: true, defaults: { ease: "sine.in" } });
      const bottomIds = CITEMS.filter((i) => !TOP.has(i.id) && !MID.has(i.id)).map((i) => i.id);
      for (const id of bottomIds) {
        const p = placed[id];
        const e = item(id);
        if (!p || !e) continue;
        // lower pieces leave first, a little ahead of the higher ones
        const at0 = Math.max(0, (1 - (p.top + p.h) / H()) * 0.6);
        if (id === "water-strip") {
          away.to(e, { y: () => p.h * 0.9, autoAlpha: 0, duration: 1 }, 0.15);
          continue;
        }
        const left = p.side === "left" || (p.side === "water" && p.left + p.w / 2 < W() / 2);
        away.to(e, { x: () => (left ? -(p.left + p.w + 24 * u()) : W() - p.left + 24 * u()), rotation: left ? -6 : 6, duration: 1 }, at0);
      }
      // the light effects on the water go with it
      away.to(q(".cu-ring, .cu-fx-pool, .cu-sweep"), { autoAlpha: 0, duration: 0.4 }, 0);
      const st = ScrollTrigger.create({
        trigger: card,
        scroller,
        start: "top top",
        end: () => `+=${card.clientHeight * S.awayDistance}`,
        scrub: S.awayScrub,
        animation: away,
      });
      cleanups.push(() => {
        st.kill();
        away.kill();
      });
    }

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
      {Array.from({ length: 8 }, (_, i) => (
        <span key={`r${i}`} className="cu-ring" />
      ))}
      <div className="cu-sweep">
        <span />
      </div>
      <div className="cu-particles cu-fx-pool">
        {Array.from({ length: 18 }, (_, i) => (
          <img key={i} className="cu-fx" alt="" />
        ))}
      </div>
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
        {HANG.has(it.id) && p.top + p.oy * p.h > 2 && <span className="cu-cord" style={{ left: pct(p.ox), top: -p.top, height: p.top + p.oy * p.h }} />}
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
