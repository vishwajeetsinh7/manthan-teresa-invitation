"use client";

import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { timing } from "@/src/config/timing";
import sprite from "@/public/doves/dove-sprite.json";
import perch from "@/public/doves/dove-perch.json";

/**
 * Two white doves for the wax seal. Once the seal has landed on the card they fly up from the
 * bottom of the card (one from each side, wings beating), come down onto the seal's top and
 * land there, facing each other: the landing pose, settling, then sitting. When both sit, the
 * card's wording starts ("invite:doves-seated"; the card waits for it). Seated they breathe,
 * sway a little on their feet, and now and then one coos (dips its head), lifts its wings or
 * gives a little shuffle. They stay on the seal (its press, the card's parallax) every frame.
 *
 * - Flying: public/doves/dove-sprite.webp (scripts/build-dove-sprite.mjs), frames in one row,
 *   its beak at `sprite.anchor`. Perched: public/doves/dove-perch.webp
 *   (scripts/build-dove-perch.mjs), 4 frames with the feet on the same pixel. The flying bird
 *   hands over to the landing pose beak on beak, at the same size.
 * - A frame is shown by sliding a strip inside a clip box (transforms only).
 * - One requestAnimationFrame loop for both; paused off-screen or in a hidden tab.
 * - Reduced motion: both simply sit on the seal.
 */
const D = timing.doves;
const SRC = "/doves/dove-sprite.webp";
const PSRC = "/doves/dove-perch.webp";
const N = sprite.frameCount;
const PN = perch.frameCount;
const PERCH = { LANDING: 0, LANDED: 1, SITTING: 2, COOING: 3 };
/** the landing pose's beak tip in a perched frame (where the flying bird's beak hands over) */
const LANDING_BEAK = { x: 384, y: 258 };

declare global {
  interface Window {
    /** set once both doves sit on the seal (cleared as each reveal starts) */
    __dovesSeated?: boolean;
  }
}

export function SeatedDoves({ cardRef }: { cardRef: RefObject<HTMLElement | null> }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const box = root.current;
    if (!card || !box) return;
    const flyEls = [...box.querySelectorAll<HTMLElement>(".dove")];
    const flyStrips = [...box.querySelectorAll<HTMLElement>(".dove-strip")];
    const sits = [...box.querySelectorAll<HTMLElement>(".dove-sit")];
    const sitStrips = [...box.querySelectorAll<HTMLElement>(".dove-sit-strip")];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;

    const showFrame = (k: number, i: number) => {
      flyStrips[i].style.transform = `translate3d(${(-k * 100) / N}%,0,0)`;
    };
    const showPerch = (k: number, i: number) => {
      sitStrips[i].style.transform = `translate3d(${(-k * 100) / PN}%,0,0)`;
    };
    /** flying bird or sitting bird (or neither) */
    const show = (i: number, what: "fly" | "sit" | "none") => {
      flyEls[i].style.visibility = what === "fly" ? "visible" : "hidden";
      sits[i].style.visibility = what === "sit" ? "visible" : "hidden";
    };

    /** the seal as it is now (its drop and press included), and how visible it is */
    const sealNow = () => {
      const seal = card.querySelector<HTMLElement>(".seal") ?? card.querySelector<HTMLElement>(".seal-wrap");
      const cr = card.getBoundingClientRect();
      const r = seal?.getBoundingClientRect();
      let alpha = 1;
      for (let el: HTMLElement | null = seal ?? null; el && el !== card; el = el.parentElement) alpha *= Number(getComputedStyle(el).opacity) || 0;
      return {
        Dm: r?.width || 100,
        cx: r ? r.left + r.width / 2 - cr.left : card.clientWidth / 2,
        cy: r ? r.top + r.height / 2 - cr.top : 80,
        alpha: seal ? alpha : 1,
      };
    };
    type Seal = ReturnType<typeof sealNow>;
    /** where dove i sits on the seal: its frame's top-left, scale, feet and the landing beak */
    const spotOf = (i: number, s: Seal) => {
      const P = D.perch;
      const sp = (s.Dm * P.size) / perch.bodyWidth;
      const dx = s.Dm * P.spread;
      const fx = s.cx + (i ? dx : -dx);
      const fy = s.cy - Math.sqrt(Math.max(0, (s.Dm * P.radius) ** 2 - dx * dx)) + s.Dm * P.sink;
      const feetX = (i ? perch.frameWidth - perch.feet.x : perch.feet.x) * sp;
      const left = fx - feetX;
      const top = fy - perch.feet.y * sp;
      const beak = { x: left + (i ? perch.frameWidth - LANDING_BEAK.x : LANDING_BEAK.x) * sp, y: top + LANDING_BEAK.y * sp };
      return { sp, left, top, feetX, beak };
    };
    let sitScale = 0;
    /** a dove on the seal: its feet on the rim; lifted (px) and leaning (deg) about its feet */
    const placeSit = (i: number, s: Seal, lift = 0, lean = 0) => {
      const p = spotOf(i, s);
      if (Math.abs(p.sp - sitScale) > 1e-4) {
        sitScale = p.sp;
        box.style.setProperty("--sit-w", `${perch.frameWidth * p.sp}px`);
        box.style.setProperty("--sit-h", `${perch.frameHeight * p.sp}px`);
      }
      sits[i].style.transformOrigin = `${p.feetX}px ${perch.feet.y * p.sp}px`;
      sits[i].style.transform = `translate3d(${p.left}px,${p.top - lift}px,0) rotate(${i ? -lean : lean}deg)${i ? " scaleX(-1)" : ""}`;
      sits[i].style.opacity = s.alpha.toFixed(3);
    };

    /* the flying bird: its box is the sprite frame at scale `fs` (set when the flight starts);
       it is moved by its top-left and scaled by k about its centre */
    let fs = 0.1;
    const setFly = (i: number, x: number, y: number, k: number) => {
      flyEls[i].style.transform = `translate3d(${x}px,${y}px,0) scale(${i ? -k : k},${k})`;
    };
    /** the top-left that puts the flying bird's beak at (bx, by) at extra scale k */
    const topLeftFor = (i: number, bx: number, by: number, k: number) => {
      const w = sprite.frameWidth * fs;
      const h = sprite.frameHeight * fs;
      const ax = i ? w - sprite.anchor.x * fs : sprite.anchor.x * fs;
      return { x: bx - w / 2 - (ax - w / 2) * k, y: by - h / 2 - (sprite.anchor.y * fs - h / 2) * k };
    };

    /* per-dove state */
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const doves = [0, 1].map((i) => ({
      i,
      /** "" waiting for the seal; "fly" on the way up; "land"; "sit" */
      mode: "" as "" | "fly" | "land" | "sit",
      at: 0, // since (s)
      phase: i * 0.37, // wingbeat 0…1
      frame: -1,
      perchFrame: -1,
      from: { x: 0, y: 0 },
      nextMove: 0,
      until: 0,
      hopAt: -1,
      seed: i * 1.9,
    }));

    let raf = 0;
    let clock = 0;
    let last = 0;
    let running = false;
    let begun = false;
    let onScreen = true;
    let flightAt = -1; // when the flights start (s), once the seal has landed
    let seated = false;

    const startFlights = (s: Seal) => {
      fs = spotOf(0, s).sp;
      box.style.setProperty("--dove-w", `${sprite.frameWidth * fs}px`);
      box.style.setProperty("--dove-h", `${sprite.frameHeight * fs}px`);
      const W = card.clientWidth;
      const H = card.clientHeight;
      for (const d of doves) {
        d.mode = "fly";
        d.at = clock + d.i * D.rightDelay;
        // from below the card, one each side
        d.from = { x: W * (d.i ? 0.84 : 0.16), y: H + sprite.frameHeight * fs * D.startScale * 0.6 };
        const tl = topLeftFor(d.i, d.from.x, d.from.y, D.startScale);
        setFly(d.i, tl.x, tl.y, D.startScale);
        show(d.i, "fly");
      }
    };

    const advance = (dt: number) => {
      clock += dt;
      const s = sealNow();
      // the flights start once the seal has landed (fully there)
      if (flightAt < 0 && doves[0].mode === "" && s.alpha > 0.99) flightAt = clock + D.afterSeal;
      if (flightAt >= 0 && clock >= flightAt && doves[0].mode === "") startFlights(s);

      for (const d of doves) {
        if (d.mode === "fly") {
          if (clock < d.at) continue;
          // wings beat all the way
          d.phase = (d.phase + dt / D.beat[d.i]) % 1;
          const f = Math.floor(d.phase * N) % N;
          if (f !== d.frame) {
            showFrame(f, d.i);
            d.frame = f;
          }
          // up from below on a curve, coming down onto the seal from just above it
          const p = Math.min(1, (clock - d.at) / D.flight);
          const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
          const b = spotOf(d.i, s).beak;
          const a = d.from;
          const u = card.clientWidth / 390;
          const c1 = { x: a.x + (b.x - a.x) * 0.15, y: a.y - (a.y - b.y) * 0.6 };
          const c2 = { x: b.x + (d.i ? 1 : -1) * 46 * u, y: b.y - 40 * u };
          const m = 1 - e;
          const bx = m * m * m * a.x + 3 * m * m * e * c1.x + 3 * m * e * e * c2.x + e * e * e * b.x;
          const by = m * m * m * a.y + 3 * m * m * e * c1.y + 3 * m * e * e * c2.y + e * e * e * b.y;
          const k = D.startScale + (1 - D.startScale) * e;
          const tl = topLeftFor(d.i, bx, by, k);
          setFly(d.i, tl.x, tl.y, k);
          if (p >= 1) {
            // touch down: the landing pose takes over, beak on beak
            d.mode = "land";
            d.at = clock;
            d.perchFrame = -1;
            showPerch(PERCH.LANDING, d.i);
            placeSit(d.i, s, 3);
            show(d.i, "sit");
          }
          continue;
        }
        if (d.mode === "land") {
          const lt = clock - d.at;
          const f = lt < D.landHold[0] ? PERCH.LANDING : lt < D.landHold[0] + D.landHold[1] ? PERCH.LANDED : PERCH.SITTING;
          if (f !== d.perchFrame) {
            showPerch(f, d.i);
            d.perchFrame = f;
          }
          placeSit(d.i, s, f === PERCH.LANDING ? 3 * (1 - lt / D.landHold[0]) : 0);
          if (f === PERCH.SITTING) {
            d.mode = "sit";
            d.at = clock;
            d.nextMove = clock + rnd(D.cooEvery[0], D.cooEvery[1]) * (d.i ? 1.3 : 0.6);
          }
          continue;
        }
        if (d.mode === "sit") {
          // now and then: a coo (head dips), a wing-lift, or a little shuffle
          let f = PERCH.SITTING;
          if (clock < d.until) f = d.perchFrame;
          else if (clock >= d.nextMove) {
            const r = Math.random();
            if (r < 0.55) {
              f = PERCH.COOING;
              d.until = clock + D.cooHold;
            } else if (r < 0.8) {
              f = PERCH.LANDED;
              d.until = clock + 0.4;
            } else d.hopAt = clock;
            d.nextMove = clock + rnd(D.cooEvery[0], D.cooEvery[1]);
          }
          if (f !== d.perchFrame) {
            showPerch(f, d.i);
            d.perchFrame = f;
          }
          // breathing, a gentle sway on its feet, and the shuffle (two quick little lifts)
          const breathe = 0.6 * Math.sin((2 * Math.PI * clock) / (3.1 + d.i * 0.4) + d.seed);
          const lean = 1.4 * Math.sin((2 * Math.PI * clock) / (5.3 + d.i * 0.7) + d.seed * 2);
          let hop = 0;
          if (d.hopAt >= 0) {
            const h = (clock - d.hopAt) / 0.5;
            if (h >= 1) d.hopAt = -1;
            else hop = 3 * Math.abs(Math.sin(2 * Math.PI * h));
          }
          placeSit(d.i, s, breathe + hop, lean);
        }
      }
      // both seated → the card may write its wording
      if (!seated && doves.every((d) => d.mode === "sit")) {
        seated = true;
        window.__dovesSeated = true;
        window.dispatchEvent(new Event("invite:doves-seated"));
      }
    };
    const step = (now: number) => {
      advance(Math.min(0.1, last ? (now - last) / 1000 : 0));
      last = now;
      raf = requestAnimationFrame(step);
    };
    // dev only: step by hand from the console (the preview pane counts as a hidden tab)
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __doves: object }).__doves = { tick: (ms: number) => advance(ms / 1000), clock: () => clock };
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

    // both sprites are decoded before they show
    const ready = Promise.all(
      [SRC, PSRC].map((src) => {
        const im = new Image();
        im.src = src;
        return im.decode().catch(() => undefined);
      }),
    );

    /** the card's reveal starts (again, on a replay): the doves wait below for the seal */
    const begin = () => {
      if (disposed) return;
      window.__dovesSeated = false;
      seated = false;
      flightAt = -1;
      doves.forEach((d) => {
        d.mode = "";
        d.frame = -1;
        d.perchFrame = -1;
        d.hopAt = -1;
        show(d.i, "none");
      });
      begun = true;
      ready.then(() => {
        if (disposed) return;
        box.dataset.on = "";
        if (reduce) {
          const s = { ...sealNow(), alpha: 1 };
          doves.forEach((d) => {
            d.mode = "sit";
            showPerch(PERCH.SITTING, d.i);
            placeSit(d.i, s);
            show(d.i, "sit");
          });
          seated = true;
          window.__dovesSeated = true;
          window.dispatchEvent(new Event("invite:doves-seated"));
          return;
        }
        run();
      });
    };
    window.addEventListener("invite:card-reveal", begin);
    // (the card may have started before this mounted)
    if (card.dataset.reveal === "1") begin();

    const ro = new ResizeObserver(() => {
      if (reduce && box.hasAttribute("data-on")) {
        const s = { ...sealNow(), alpha: 1 };
        doves.forEach((d) => placeSit(d.i, s));
      }
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
      window.removeEventListener("invite:card-reveal", begin);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      io.disconnect();
    };
  }, [cardRef]);

  return (
    <div ref={root} className="doves" style={{ "--dove-n": N } as CSSProperties} aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="dove-pair">
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
        </div>
      ))}
    </div>
  );
}
