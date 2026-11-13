"use client";

import { Fragment, useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { timing } from "@/src/config/timing";
import sprite from "@/public/doves/dove-sprite.json";
import perch from "@/public/doves/dove-perch.json";

/**
 * Two white doves in the side margins of the card, beside the names, both
 * facing the couple. They fly in once the names are written ("invite:names-done"),
 * hover a moment (flapping, bobbing on the downstroke, drifting), then fly up to
 * the wax seal and land on it, one each side of its top, facing each other: the
 * landing pose, settling, then sitting — now and then one coos (dips its head) or
 * lifts its wings. They stay on the seal as it moves (its parallax). Leaving the
 * first page ("invite:page") they take off and fly up and away; coming back, they
 * fly in again from the sides and settle on the seal again.
 *
 * - Perched: public/doves/dove-perch.webp (scripts/build-dove-perch.mjs): 4 frames
 *   (landing, landed, sitting, cooing) with the feet on the same pixel. The flying
 *   bird hands over to the landing pose beak on beak, at the same size.
 *
 * - Sprite: public/doves/dove-sprite.webp (built by scripts/build-dove-sprite.mjs),
 *   frames in one row; a frame is shown by sliding the strip inside a clip box,
 *   so every change is a transform (no repaints, no layout reads in the loop).
 * - Size: fits the free gutter between the card edge and the widest text line the
 *   dove could reach (in any frame, with bob/drift), keeping `clearance` px away.
 * - One requestAnimationFrame loop for both; paused off-screen or in a hidden tab.
 * - Reduced motion: both doves sit still on the wings-level frame.
 */
const D = timing.doves;
const SRC = "/doves/dove-sprite.webp";
const PSRC = "/doves/dove-perch.webp";
const PN = perch.frameCount;
/** the landing pose's beak tip in a perched frame (where the flying bird's beak hands over) */
const LANDING_BEAK = { x: 384, y: 258 };
const PERCH = { LANDING: 0, LANDED: 1, SITTING: 2, COOING: 3 };
const N = sprite.frameCount;
const C = sprite.content; // the bird's tight box inside a frame (sprite px)

const FW = sprite.frameWidth;
const P = sprite.profile; // the bird's outline over all frames, in bands of rows

/** wording a dove must never touch: text (measured by its ink) and gold line art */
const TEXT = [".name .shimmer", ".relation", ".parents", ".together", ".invite", ".joiner-word"];
const ART = [".joiner", ".name-flourish", ".divider-1", ".divider-2"];

type Box = { l: number; r: number; t: number; b: number };
type Layout = { scale: number; x: [number, number]; y: number; visible: boolean };

let ctx: CanvasRenderingContext2D | null = null;
/** where the letters actually are (line boxes are much taller than the ink of a script font) */
function inkBox(el: HTMLElement, cr: DOMRect): Box | null {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rect = range.getBoundingClientRect();
  if (!rect.width) return null;
  const box = { l: rect.left - cr.left, r: rect.right - cr.left, t: rect.top - cr.top, b: rect.bottom - cr.top };
  ctx ??= document.createElement("canvas").getContext("2d");
  const cs = getComputedStyle(el);
  let text = (el.textContent ?? "").trim();
  if (!ctx || !text) return box;
  if (cs.textTransform === "uppercase") text = text.toUpperCase();
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const m = ctx.measureText(text);
  if (!m.fontBoundingBoxAscent) return box; // older engines: keep the line box
  // the range's box is the font's content area: its top is baseline − font ascent
  const baseline = box.t + m.fontBoundingBoxAscent;
  return {
    l: Math.min(box.l, box.l - m.actualBoundingBoxLeft),
    r: Math.max(box.r, box.l + m.actualBoundingBoxRight),
    t: baseline - m.actualBoundingBoxAscent,
    b: baseline + m.actualBoundingBoxDescent,
  };
}

function measure(card: HTMLElement): Layout {
  const cr = card.getBoundingClientRect();
  const W = cr.width;
  const word = card.querySelector(".joiner-word");
  const wr = word?.getBoundingClientRect();
  const cy = wr ? wr.top + wr.height / 2 - cr.top : cr.height * 0.45;

  const boxes: Box[] = [];
  for (const sel of TEXT) card.querySelectorAll<HTMLElement>(`.content ${sel}`).forEach((el) => {
    const b = inkBox(el, cr);
    if (b) boxes.push(b);
  });
  for (const sel of ART) card.querySelectorAll<HTMLElement>(`.content ${sel}`).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width) boxes.push({ l: r.left - cr.left, r: r.right - cr.left, t: r.top - cr.top, b: r.bottom - cr.top });
  });

  const slack = 2; // content parallax shifts the wording by ~1 px
  const motionY = D.bob + D.driftY + D.glideSink + slack;
  const motionX = D.driftX + slack;

  /* For a bird scale s: every band of the bird's outline (all frames, grown by
     its bob/drift/glide) must stay `clearance` px from every text box beside it.
     That bounds how far in each dove may sit; it fits if that leaves room
     between the screen edge and the text.                                 */
  const fit = (s: number, y: number) => {
    const ey = y - (C.y + C.height / 2) * s;
    const minL = -C.x * s + 1; // left bird's feathers stay on screen
    let maxL = minL + 24; // …and near its edge when nothing is beside it
    const maxR = W - (FW - C.x) * s - 1; // mirrored right bird
    let minR = maxR - 24;
    let hit = false;
    P.rows.forEach((row, k) => {
      if (!row) return;
      const y0 = ey + k * P.band * s - motionY - D.clearance / 2;
      const y1 = ey + (k + 1) * P.band * s + motionY + D.clearance / 2;
      for (const b of boxes) {
        if (b.b < y0 || b.t > y1) continue;
        if (!hit) {
          maxL = Infinity;
          minR = -Infinity;
          hit = true;
        }
        maxL = Math.min(maxL, b.l - D.clearance - motionX - row[1] * s);
        // mirrored: the band's left edge comes from its right-most feather
        minR = Math.max(minR, b.r + D.clearance + motionX - (FW - row[1]) * s);
      }
    });
    return { ok: maxL >= minL && minR <= maxR, xL: (minL + maxL) / 2, xR: (minR + maxR) / 2 };
  };

  /* The biggest bird (by width, up to maxWidth) that fits. Centred on the
     "with" line when it can be; the line below ("Manthan Patel") is wide and
     close, so the doves may rise up to `lift` px to find room. Not touching
     the text wins over minWidth: in a tight spot they get smaller (or hide
     below 40 px). */
  const widest = (y: number) => {
    let lo = 39;
    let hi: number = D.maxWidth;
    if (fit(hi / C.width, y).ok) return hi;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (fit(mid / C.width, y).ok) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  const tries: { w: number; dy: number }[] = [];
  for (let dy = 0; dy <= D.lift; dy += 2) tries.push({ w: widest(cy - dy), dy });
  const top = Math.max(...tries.map((t) => t.w));
  // stay as close to the "with" line as possible: the first spot whose bird is
  // nearly as big as the biggest possible (and at least minWidth when it can be)
  const enough = Math.min(top, Math.max(D.minWidth, top - 12));
  const best = tries.find((t) => t.w >= enough) ?? { w: 0, dy: 0 };
  if (best.w < 40) return { scale: 40 / C.width, x: [0, 0], y: 0, visible: false };
  const s = best.w / C.width;
  const y = cy - best.dy;
  const f = fit(s, y);
  return { scale: s, x: [f.xL, f.xR], y: y - (C.y + C.height / 2) * s, visible: true };
}

export function FlyingDoves({ cardRef }: { cardRef: RefObject<HTMLElement | null> }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const box = root.current;
    if (!card || !box) return;
    const els = [...box.querySelectorAll<HTMLElement>(".dove")];
    const strips = [...box.querySelectorAll<HTMLElement>(".dove-strip")];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let layout: Layout | null = null;
    let disposed = false;

    const place = () => {
      layout = measure(card);
      box.style.setProperty("--dove-w", `${sprite.frameWidth * layout.scale}px`);
      box.style.setProperty("--dove-h", `${sprite.frameHeight * layout.scale}px`);
      box.dataset.fit = layout.visible ? "" : "none";
    };
    const sits = [...box.querySelectorAll<HTMLElement>(".dove-sit")];
    const sitStrips = [...box.querySelectorAll<HTMLElement>(".dove-sit-strip")];
    const showFrame = (k: number, i: number) => {
      strips[i].style.transform = `translate3d(${(-k * 100) / N}%,0,0)`;
    };
    const showPerch = (k: number, i: number) => {
      sitStrips[i].style.transform = `translate3d(${(-k * 100) / PN}%,0,0)`;
    };
    const pos = [
      { x: 0, y: 0, k: 1 },
      { x: 0, y: 0, k: 1 },
    ];
    /** the flying bird: its box's top-left (x, y) at its own extra scale k (about its centre) */
    const setPos = (i: number, x: number, y: number, k = 1) => {
      pos[i].x = x;
      pos[i].y = y;
      pos[i].k = k;
      els[i].style.transform = `translate3d(${x}px,${y}px,0) scale(${i ? -k : k},${k})`;
    };
    /** the flying bird's beak (the sprite's anchor) in card px, for a top-left and a scale */
    const beakOf = (i: number, x: number, y: number, k: number) => {
      const s = layout!.scale;
      const w = sprite.frameWidth * s;
      const h = sprite.frameHeight * s;
      const ax = i ? w - sprite.anchor.x * s : sprite.anchor.x * s;
      return { x: x + w / 2 + (ax - w / 2) * k, y: y + h / 2 + (sprite.anchor.y * s - h / 2) * k };
    };
    /** …and the top-left that puts its beak at (bx, by) at scale k */
    const topLeftFor = (i: number, bx: number, by: number, k: number) => {
      const s = layout!.scale;
      const w = sprite.frameWidth * s;
      const h = sprite.frameHeight * s;
      const ax = i ? w - sprite.anchor.x * s : sprite.anchor.x * s;
      return { x: bx - w / 2 - (ax - w / 2) * k, y: by - h / 2 - (sprite.anchor.y * s - h / 2) * k };
    };
    /** where each dove sits on the seal now (it follows the seal), its scale, and its beak when landing */
    const sealSpot = (i: number) => {
      const seal = card.querySelector(".seal-wrap");
      const cr = card.getBoundingClientRect();
      const r = seal?.getBoundingClientRect();
      const Dm = r?.width || 100;
      const cx = r ? r.left + r.width / 2 - cr.left : card.clientWidth / 2;
      const cy = r ? r.top + r.height / 2 - cr.top : 80;
      const P = D.perch;
      const sp = (Dm * P.size) / perch.bodyWidth;
      const dx = Dm * P.spread;
      const fx = cx + (i ? dx : -dx);
      const fy = cy - Math.sqrt(Math.max(0, (Dm * P.radius) ** 2 - dx * dx)) + Dm * P.sink;
      const fw = perch.frameWidth * sp;
      const left = fx - (i ? perch.frameWidth - perch.feet.x : perch.feet.x) * sp;
      const top = fy - perch.feet.y * sp;
      const beak = { x: left + (i ? perch.frameWidth - LANDING_BEAK.x : LANDING_BEAK.x) * sp, y: top + LANDING_BEAK.y * sp };
      return { left, top, sp, fw, beak };
    };
    let sitScale = 0;
    /** the perched bird on the seal (a little breathing while it sits) */
    const placeSit = (i: number, lift = 0) => {
      const s = sealSpot(i);
      if (Math.abs(s.sp - sitScale) > 1e-4) {
        sitScale = s.sp;
        box.style.setProperty("--sit-w", `${perch.frameWidth * s.sp}px`);
        box.style.setProperty("--sit-h", `${perch.frameHeight * s.sp}px`);
      }
      sits[i].style.transform = `translate3d(${s.left}px,${s.top - lift}px,0)${i ? " scaleX(-1)" : ""}`;
    };
    /** fly bird or sitting bird */
    const show = (i: number, sitting: boolean) => {
      els[i].style.visibility = sitting ? "hidden" : "";
      sits[i].style.visibility = sitting ? "visible" : "hidden";
    };

    /* per-dove state */
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const doves = [0, 1].map((i) => ({
      i,
      start: -1, // time the fly-in starts (s, loop clock)
      phase: i * 0.37, // wingbeat phase 0…1
      frame: -1,
      nextGlide: 0,
      wantGlide: false,
      glideFrom: -1,
      glideFor: 0,
      seed: i * 1.7,
      /** where the fly-in starts (null = beyond the card edge, a little high) */
      from: null as null | { x: number; y: number },
      exitAt: -1, // flying away since (s, loop clock)
      exitFrom: { x: 0, y: 0, k: 1 },
      gone: false,
      /** on the way to the seal / on it: "seal" (flying there), "land", "sit"; since (s) */
      mode: "" as "" | "seal" | "land" | "sit",
      modeAt: 0,
      sealFrom: { x: 0, y: 0 },
      perchFrame: -1,
      nextCoo: 0,
      cooUntil: 0,
      /** how long it hovers after flying in before it goes to the seal */
      hover: D.perchAfter as number,
    }));
    let page = 0; // which page the guest is on (from the pager)

    /* the loop: one rAF for both doves; runs only while visible */
    let raf = 0;
    let clock = 0; // seconds of animation (frozen while paused)
    let last = 0;
    let running = false;
    let begun = false;
    let onScreen = true;

    /** move both doves on by dt seconds (transforms only; no layout reads) */
    const advance = (dt: number) => {
      clock += dt;
      const L = layout;
      if (L) {
        for (const d of doves) {
          if (d.gone || d.start < 0 || clock < d.start) continue;
          const t = clock - d.start;
          if (d.exitAt < 0 && d.mode === "land") {
            // the landing pose, then settling, then sitting
            const lt = clock - d.modeAt;
            const f = lt < D.landHold[0] ? PERCH.LANDING : lt < D.landHold[0] + D.landHold[1] ? PERCH.LANDED : PERCH.SITTING;
            if (f !== d.perchFrame) {
              showPerch(f, d.i);
              d.perchFrame = f;
            }
            placeSit(d.i, f === PERCH.LANDING ? 3 * (1 - lt / D.landHold[0]) : 0);
            if (f === PERCH.SITTING) {
              d.mode = "sit";
              d.modeAt = clock;
              d.nextCoo = clock + rnd(D.cooEvery[0], D.cooEvery[1]) * (d.i ? 1.3 : 0.7);
            }
            continue;
          }
          if (d.exitAt < 0 && d.mode === "sit") {
            // sitting: breathing; now and then it coos (dips its head) or lifts its wings
            let f = PERCH.SITTING;
            if (clock < d.cooUntil) f = d.perchFrame;
            else if (clock >= d.nextCoo) {
              f = Math.random() < 0.8 ? PERCH.COOING : PERCH.LANDED;
              d.cooUntil = clock + (f === PERCH.COOING ? D.cooHold : 0.35);
              d.nextCoo = clock + rnd(D.cooEvery[0], D.cooEvery[1]);
            }
            if (f !== d.perchFrame) {
              showPerch(f, d.i);
              d.perchFrame = f;
            }
            placeSit(d.i, 0.6 * Math.sin((2 * Math.PI * (clock - d.modeAt)) / (3.1 + d.i * 0.4)));
            continue;
          }
          const tx = L.x[d.i];
          const ty = L.y;
          // wingbeat: frame from phase; held on the level frame while gliding
          let gliding = false;
          if (d.glideFrom >= 0) {
            const g = clock - d.glideFrom;
            if (g < d.glideFor) gliding = true;
            else {
              d.glideFrom = -1;
              d.nextGlide = clock + rnd(D.glideEvery[0], D.glideEvery[1]);
            }
          }
          // flying away: wings beat faster
          if (!gliding) d.phase = (d.phase + dt / (D.beat[d.i] * (d.exitAt >= 0 ? 0.75 : 1))) % 1;
          let frame = gliding ? sprite.glideFrame : Math.floor(d.phase * N) % N;
          if (!gliding && d.wantGlide && frame === sprite.glideFrame) {
            d.wantGlide = false;
            d.glideFrom = clock;
            d.glideFor = rnd(D.glideHold[0], D.glideHold[1]);
            d.phase = (sprite.glideFrame + 0.5) / N;
            frame = sprite.glideFrame;
          }
          if (frame !== d.frame) {
            showFrame(frame, d.i);
            d.frame = frame;
          }

          if (d.exitAt >= 0) {
            // up and away, out over the top, accelerating
            const p = Math.min(1, (clock - d.exitAt) / D.exit);
            const e = p * p;
            const away = d.i === 0 ? -1 : 1;
            const topY = -sprite.frameHeight * L.scale - 40;
            setPos(d.i, d.exitFrom.x + away * 70 * e, d.exitFrom.y + (topY - d.exitFrom.y) * e, d.exitFrom.k);
            if (p >= 1) {
              d.gone = true;
              setPos(d.i, d.i ? card.clientWidth + 400 : -400, topY);
            }
            continue;
          }
          if (t < D.enter) {
            // fly in from beyond the card edge on a slight arc, easing out
            const p = t / D.enter;
            const e = 1 - Math.pow(1 - p, 3);
            const fx = d.from ? d.from.x : d.i === 0 ? -sprite.frameWidth * L.scale - 12 : card.clientWidth + 12;
            const fy = d.from ? d.from.y : ty - 46;
            const x = fx + (tx - fx) * e;
            const y = fy + (ty - fy) * e - 16 * Math.sin(Math.PI * e);
            setPos(d.i, x, y);
            if (p > 0.98) d.nextGlide = clock + rnd(D.glideEvery[0], D.glideEvery[1]);
            continue;
          }
          if (d.mode === "seal") {
            const p = Math.min(1, (clock - d.modeAt) / D.toSeal);
            const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
            const spot = sealSpot(d.i);
            const kEnd = spot.sp / L.scale;
            const a = d.sealFrom;
            const b = spot.beak;
            const u = card.clientWidth / 390;
            const c1 = { x: a.x, y: a.y - (a.y - b.y) * 0.55 };
            const c2 = { x: b.x + (a.x - b.x) * 0.45, y: b.y - 36 * u };
            const m = 1 - e;
            const bx = m * m * m * a.x + 3 * m * m * e * c1.x + 3 * m * e * e * c2.x + e * e * e * b.x;
            const by = m * m * m * a.y + 3 * m * m * e * c1.y + 3 * m * e * e * c2.y + e * e * e * b.y;
            const k = 1 + (kEnd - 1) * e;
            const tl = topLeftFor(d.i, bx, by, k);
            setPos(d.i, tl.x, tl.y, k);
            if (p >= 1) {
              // touch down: the landing pose takes over, beak on beak
              d.mode = "land";
              d.modeAt = clock;
              d.perchFrame = -1;
              showPerch(PERCH.LANDING, d.i);
              placeSit(d.i, 3);
              show(d.i, true);
            }
            continue;
          }
          // after a moment of hovering, off to the seal
          if (t >= D.enter + d.hover && d.mode === "" && !gliding) {
            d.mode = "seal";
            d.modeAt = clock;
            d.sealFrom = beakOf(d.i, pos[d.i].x, pos[d.i].y, pos[d.i].k);
            continue;
          }
          // hover: bob on the downstroke, slow drift, sink a little while gliding
          if (!d.wantGlide && d.glideFrom < 0 && clock >= d.nextGlide && d.nextGlide > 0) d.wantGlide = true;
          const [px, py] = D.driftPeriod[d.i];
          const bob = gliding ? 0 : -D.bob * Math.max(0, Math.sin(2 * Math.PI * d.phase));
          const sink = gliding ? D.glideSink * Math.sin((Math.PI * (clock - d.glideFrom)) / d.glideFor) : 0;
          const dx = D.driftX * Math.sin((2 * Math.PI * t) / px + d.seed);
          const dy = D.driftY * Math.sin((2 * Math.PI * t) / py + d.seed * 2);
          setPos(d.i, tx + dx, ty + dy + bob + sink);
        }
      }
    };
    const step = (now: number) => {
      advance(Math.min(0.1, last ? (now - last) / 1000 : 0));
      last = now;
      raf = requestAnimationFrame(step);
    };
    // dev only: step by hand from the console (the preview pane counts as a hidden tab)
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __doves: object }).__doves = { tick: (ms: number) => advance(ms / 1000), layout: () => layout, clock: () => clock };
    }
    const run = () => {
      const should = begun && onScreen && !document.hidden && !reduce;
      if (should && !running) {
        running = true;
        last = 0;
        raf = requestAnimationFrame(step);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    // the sprite is decoded before anything moves
    const img = new Image();
    img.src = SRC;
    const pimg = new Image();
    pimg.src = PSRC;
    const ready = Promise.all([img.decode(), pimg.decode()]).catch(() => undefined);

    const begin = () => {
      if (begun || disposed) return;
      ready.then(() => {
        if (disposed) return;
        place();
        box.dataset.on = "";
        if (reduce) {
          [0, 1].forEach((i) => {
            showPerch(PERCH.SITTING, i);
            placeSit(i);
            show(i, true);
          });
          return;
        }
        els.forEach((_, i) => setPos(i, i ? card.clientWidth + 400 : -400, layout!.y));
        doves[0].start = clock + 0.02;
        doves[1].start = clock + 0.02 + D.rightDelay;
        // already on another page: they wait out of sight and fly in on the way back
        if (page !== 0) doves.forEach((d) => (d.gone = true));
        begun = true;
        run();
      });
    };
    window.addEventListener("invite:names-done", begin);

    /* leaving the first page → fly up and away; back to it → fly in from the sides */
    const onPage = (e: Event) => {
      const { from, to } = (e as CustomEvent<{ from: number; to: number }>).detail;
      page = to;
      if (!begun || reduce) return;
      if (from === 0 && to !== 0) {
        doves.forEach((d) => {
          if (d.gone || d.exitAt >= 0) return;
          if (d.mode === "land" || d.mode === "sit") {
            const spot = sealSpot(d.i);
            const k = spot.sp / layout!.scale;
            const tl = topLeftFor(d.i, spot.beak.x, spot.beak.y, k);
            setPos(d.i, tl.x, tl.y, k);
            show(d.i, false);
          }
          d.mode = "";
          d.exitAt = clock + d.i * 0.12;
          d.exitFrom = { ...pos[d.i] };
          d.wantGlide = false;
          d.glideFrom = -1;
        });
      } else if (to === 0) {
        doves.forEach((d) => {
          // still on screen mid-way out: turn back from where it is; otherwise from the side
          d.from = d.exitAt >= 0 && !d.gone ? { ...pos[d.i] } : null;
          d.gone = false;
          d.exitAt = -1;
          d.start = clock + 0.15 + d.i * D.rightDelay;
          d.wantGlide = false;
          d.glideFrom = -1;
          d.nextGlide = 0;
          d.mode = "";
          d.hover = D.perchAgain;
          show(d.i, false);
        });
        run();
      }
    };
    window.addEventListener("invite:page", onPage);
    if (reduce) begin();

    const ro = new ResizeObserver(() => {
      if (!box.hasAttribute("data-on")) return;
      place();
      if (reduce && layout) [0, 1].forEach((i) => placeSit(i));
    });
    ro.observe(card);
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      run();
    });
    io.observe(box);
    const onVis = () => run();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("invite:names-done", begin);
      window.removeEventListener("invite:page", onPage);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      io.disconnect();
    };
  }, [cardRef]);

  return (
    <div ref={root} className="doves" style={{ "--dove-n": N } as CSSProperties} aria-hidden>
      {[0, 1].map((i) => (
        <Fragment key={i}>
          <div className={`dove ${i ? "dove-r" : "dove-l"}`}>
            <div className="dove-clip">
              {/* eslint-disable-next-line @next/next/no-img-element -- a sprite strip, positioned by transform */}
              <img className="dove-strip" src={SRC} alt="" draggable={false} decoding="async" />
            </div>
          </div>
          <div className="dove-sit">
            <div className="dove-clip">
              {/* eslint-disable-next-line @next/next/no-img-element -- a sprite strip, positioned by transform */}
              <img className="dove-sit-strip" src={PSRC} alt="" draggable={false} decoding="async" />
            </div>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
