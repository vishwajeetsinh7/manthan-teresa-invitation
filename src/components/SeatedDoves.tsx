"use client";

import { useEffect, useRef, type RefObject } from "react";
import { timing } from "@/src/config/timing";
import perch from "@/public/doves/dove-perch.json";

/**
 * Two white doves seated on the wax seal, one each side of its top, facing each other. They
 * are already there: they come down with the seal as it drops onto the card (riding it, fading
 * in with it) and never fly. While seated they breathe, sway a little on their feet, now and
 * then one coos (dips its head), lifts its wings or gives a little shuffle.
 *
 * - Sprite: public/doves/dove-perch.webp (scripts/build-dove-perch.mjs): 4 frames (landing,
 *   landed, sitting, cooing) with the feet on the same pixel; a frame is shown by sliding the
 *   strip inside a clip box.
 * - They follow the seal itself (its drop, its press, the card's parallax) every frame.
 * - One requestAnimationFrame loop for both; paused off-screen or in a hidden tab.
 * - Reduced motion: both sit still.
 */
const D = timing.doves;
const SRC = "/doves/dove-perch.webp";
const PN = perch.frameCount;
const PERCH = { LANDING: 0, LANDED: 1, SITTING: 2, COOING: 3 };

export function SeatedDoves({ cardRef }: { cardRef: RefObject<HTMLElement | null> }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const box = root.current;
    if (!card || !box) return;
    const sits = [...box.querySelectorAll<HTMLElement>(".dove-sit")];
    const strips = [...box.querySelectorAll<HTMLElement>(".dove-sit-strip")];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;

    const showPerch = (k: number, i: number) => {
      strips[i].style.transform = `translate3d(${(-k * 100) / PN}%,0,0)`;
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
    let sitScale = 0;
    /** a dove on the seal: its feet on the rim; lifted (px) and leaning (deg) about its feet */
    const placeSit = (i: number, s: ReturnType<typeof sealNow>, lift = 0, lean = 0) => {
      const P = D.perch;
      const sp = (s.Dm * P.size) / perch.bodyWidth;
      if (Math.abs(sp - sitScale) > 1e-4) {
        sitScale = sp;
        box.style.setProperty("--sit-w", `${perch.frameWidth * sp}px`);
        box.style.setProperty("--sit-h", `${perch.frameHeight * sp}px`);
      }
      const dx = s.Dm * P.spread;
      const fx = s.cx + (i ? dx : -dx);
      const fy = s.cy - Math.sqrt(Math.max(0, (s.Dm * P.radius) ** 2 - dx * dx)) + s.Dm * P.sink;
      const feetX = (i ? perch.frameWidth - perch.feet.x : perch.feet.x) * sp;
      const left = fx - feetX;
      const top = fy - perch.feet.y * sp;
      sits[i].style.transformOrigin = `${feetX}px ${perch.feet.y * sp}px`;
      sits[i].style.transform = `translate3d(${left}px,${top - lift}px,0) rotate(${i ? -lean : lean}deg)${i ? " scaleX(-1)" : ""}`;
      sits[i].style.opacity = s.alpha.toFixed(3);
    };

    /* per-dove state */
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const doves = [0, 1].map((i) => ({
      i,
      frame: -1,
      nextMove: 0,
      until: 0,
      /** the little shuffle on its feet: since (s), or -1 */
      hopAt: -1,
      seed: i * 1.9,
    }));

    let raf = 0;
    let clock = 0;
    let last = 0;
    let running = false;
    let begun = false;
    let onScreen = true;

    const advance = (dt: number) => {
      clock += dt;
      const s = sealNow();
      for (const d of doves) {
        // now and then: a coo (head dips), a wing-lift, or a little shuffle
        let f = PERCH.SITTING;
        if (clock < d.until) f = d.frame;
        else if (clock >= d.nextMove) {
          const r = Math.random();
          if (r < 0.55) {
            f = PERCH.COOING;
            d.until = clock + D.cooHold;
          } else if (r < 0.8) {
            f = PERCH.LANDED;
            d.until = clock + 0.4;
          } else {
            d.hopAt = clock;
          }
          d.nextMove = clock + rnd(D.cooEvery[0], D.cooEvery[1]);
        }
        if (f !== d.frame) {
          showPerch(f, d.i);
          d.frame = f;
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

    // the sprite is decoded before they show
    const img = new Image();
    img.src = SRC;
    const ready = img.decode().catch(() => undefined);

    /* the card's reveal starts (the seal is about to drop): they sit on it from the start */
    const begin = () => {
      if (begun || disposed) return;
      begun = true;
      ready.then(() => {
        if (disposed) return;
        box.dataset.on = "";
        doves.forEach((d) => {
          showPerch(PERCH.SITTING, d.i);
          d.frame = PERCH.SITTING;
          // the first moves come a little apart
          d.nextMove = clock + rnd(D.cooEvery[0], D.cooEvery[1]) * (d.i ? 1.3 : 0.6);
        });
        if (reduce) {
          const s = sealNow();
          doves.forEach((d) => placeSit(d.i, { ...s, alpha: 1 }));
          return;
        }
        advance(0);
        run();
      });
    };
    window.addEventListener("invite:card-reveal", begin);
    window.addEventListener("invite:names-done", begin);
    // (the card may have started before this mounted)
    if (card.querySelector(".seal") && Number(getComputedStyle(card.querySelector(".seal")!).opacity) > 0) begin();

    const ro = new ResizeObserver(() => {
      if (reduce && box.hasAttribute("data-on")) {
        const s = sealNow();
        doves.forEach((d) => placeSit(d.i, { ...s, alpha: 1 }));
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
      window.removeEventListener("invite:names-done", begin);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      io.disconnect();
    };
  }, [cardRef]);

  return (
    <div ref={root} className="doves" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="dove-sit">
          <div className="dove-clip">
            {/* eslint-disable-next-line @next/next/no-img-element -- a sprite strip, positioned by transform */}
            <img className="dove-sit-strip" src={SRC} alt="" draggable={false} decoding="async" />
          </div>
        </div>
      ))}
    </div>
  );
}
