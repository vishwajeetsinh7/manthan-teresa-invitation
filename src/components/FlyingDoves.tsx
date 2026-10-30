"use client";

import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { timing } from "@/src/config/timing";
import sprite from "@/public/doves/dove-sprite.json";

/**
 * Two white doves in the side margins of the card, beside the names, both
 * facing the couple. They fly in once the names are written ("invite:names-done"),
 * then hover: flapping (each at its own rate), bobbing on the downstroke,
 * drifting slowly, and now and then gliding on level wings. Leaving the first
 * page ("invite:page") they fly up and away; coming back, they fly in again
 * from the sides.
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
    const showFrame = (k: number, i: number) => {
      strips[i].style.transform = `translate3d(${(-k * 100) / N}%,0,0)`;
    };
    const pos = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const setPos = (i: number, x: number, y: number) => {
      pos[i].x = x;
      pos[i].y = y;
      els[i].style.transform = `translate3d(${x}px,${y}px,0)${i ? " scaleX(-1)" : ""}`;
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
      exitFrom: { x: 0, y: 0 },
      gone: false,
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
            setPos(d.i, d.exitFrom.x + away * 70 * e, d.exitFrom.y + (topY - d.exitFrom.y) * e);
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
    const ready = img.decode().catch(() => undefined);

    const begin = () => {
      if (begun || disposed) return;
      ready.then(() => {
        if (disposed) return;
        place();
        box.dataset.on = "";
        if (reduce) {
          els.forEach((_, i) => {
            showFrame(sprite.glideFrame, i);
            setPos(i, layout!.x[i], layout!.y);
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
        });
        run();
      }
    };
    window.addEventListener("invite:page", onPage);
    if (reduce) begin();

    const ro = new ResizeObserver(() => {
      if (!box.hasAttribute("data-on")) return;
      place();
      if (reduce && layout) els.forEach((_, i) => setPos(i, layout!.x[i], layout!.y));
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
        <div key={i} className={`dove ${i ? "dove-r" : "dove-l"}`}>
          <div className="dove-clip">
            {/* eslint-disable-next-line @next/next/no-img-element -- a sprite strip, positioned by transform */}
            <img className="dove-strip" src={SRC} alt="" draggable={false} decoding="async" />
          </div>
        </div>
      ))}
    </div>
  );
}
