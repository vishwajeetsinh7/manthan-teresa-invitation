"use client";

import { useRef, useState, useEffect, type RefObject } from "react";
import { gsap, useGSAP, SplitText } from "@/src/lib/gsap";
import { invitation as C } from "@/src/content/invitation";
import { timing } from "@/src/config/timing";
import { assets } from "@/src/config/assets";
import { AssetImage } from "./AssetImage";
import { VelvetDefs, VelvetDrape } from "./art/VelvetDrape";
import {
  SealPlaceholder,
  FlowerBudPlaceholder,
  FlowerOpenPlaceholder,
  LeafPlaceholder,
} from "./art/Placeholders";
import { CornerVine, TailVine, Divider, Flourish, NameFlourish, Chevron } from "./art/LineArt";
import { Petals } from "./Petals";
import { GoldDust } from "./GoldDust";

const u = (n: number) => `calc(var(--u) * ${n})`;
const V = timing.velvet;
/** leaf image frame is 420 × 800 (stem at bottom-centre) */
const LEAF_RATIO = 420 / 800;
/** how far leaves reach out from under their flower (1 = lengths as listed) */
const LEAF_SCALE = 1.3;

/* ── Flower placement (units = px on the 390-wide canvas) ──────────── */
// kinds: 0 burgundy rose · 1 blush rose · 2 ivory rose · 3 raspberry ranunculus
type LeafSpec = { kind: number; rot: number; len: number };
type FlowerSpec = { kind: number; x: number; y: number; size: number; rot: number; leaves: LeafSpec[] };
/** x, y = where the bud's base sits; rot = lean (0 = upright) */
type BudSpec = { x: number; y: number; size: number; rot: number };

// Around the seal (cluster box 300 × 150, seal centre at 150, 72; radius 50).
// Flowers tuck slightly behind the seal like a corsage.
const SEAL_FLOWERS: FlowerSpec[] = [
  { kind: 0, x: 92, y: 84, size: 76, rot: -10, leaves: [{ kind: 0, rot: -64, len: 52 }, { kind: 1, rot: -112, len: 40 }] },
  { kind: 2, x: 209, y: 84, size: 72, rot: 12, leaves: [{ kind: 2, rot: 64, len: 52 }, { kind: 3, rot: 112, len: 40 }] },
  { kind: 1, x: 121, y: 130, size: 48, rot: -18, leaves: [{ kind: 4, rot: -150, len: 34 }] },
  { kind: 3, x: 181, y: 131, size: 44, rot: 20, leaves: [{ kind: 0, rot: 150, len: 32 }] },
  { kind: 1, x: 42, y: 74, size: 34, rot: -30, leaves: [{ kind: 1, rot: -96, len: 28 }] },
  { kind: 3, x: 259, y: 75, size: 31, rot: 30, leaves: [{ kind: 2, rot: 96, len: 26 }] },
];
const SEAL_BUDS: BudSpec[] = [
  { x: 70, y: 52, size: 34, rot: -48 },
  { x: 232, y: 54, size: 32, rot: 46 },
];

// Bottom-left corner cluster (box 150 × 120); bottom-right is mirrored over the velvet
const CORNER_FLOWERS: FlowerSpec[] = [
  { kind: 1, x: 54, y: 76, size: 82, rot: -8, leaves: [{ kind: 0, rot: -38, len: 58 }, { kind: 2, rot: 28, len: 50 }, { kind: 3, rot: 70, len: 40 }] },
  { kind: 0, x: 118, y: 100, size: 54, rot: 14, leaves: [{ kind: 4, rot: 60, len: 40 }] },
  { kind: 2, x: 20, y: 28, size: 40, rot: -25, leaves: [{ kind: 1, rot: -10, len: 32 }] },
];
const CORNER_BUDS: BudSpec[] = [{ x: 96, y: 66, size: 36, rot: 22 }];

const mirror = <T extends { x: number; rot: number }>(s: T): T => ({ ...s, x: 150 - s.x, rot: -s.rot });
const CORNER_FLOWERS_BR: FlowerSpec[] = CORNER_FLOWERS.map((f, i) => ({
  ...mirror(f),
  kind: [2, 3, 1][i],
  leaves: f.leaves.map((l) => ({ ...l, rot: -l.rot })),
}));
const CORNER_BUDS_BR: BudSpec[] = CORNER_BUDS.map(mirror);

function Flower({ spec }: { spec: FlowerSpec }) {
  const { kind, x, y, size, rot, leaves } = spec;
  return (
    <div className="flower" style={{ left: u(x - size / 2), top: u(y - size / 2), width: u(size), height: u(size) }}>
      {leaves.map((l, i) => (
        <div key={i} className="flower-leaf" data-rot={l.rot} style={{ width: u(l.len * LEAF_SCALE * LEAF_RATIO), height: u(l.len * LEAF_SCALE) }}>
          <AssetImage src={assets.leaves[l.kind]} alt="" sizes="64px" fallback={<LeafPlaceholder kind={l.kind} />} />
        </div>
      ))}
      <div className="flower-bloom" data-rot={rot}>
        <div className="flower-spin">
          <AssetImage src={assets.flowers[kind]} alt="" sizes="96px" fallback={<FlowerOpenPlaceholder kind={kind} />} />
        </div>
      </div>
    </div>
  );
}

function Bud({ spec }: { spec: BudSpec }) {
  const { x, y, size, rot } = spec;
  return (
    <div className="rosebud" data-rot={rot} style={{ left: u(x - size / 2), top: u(y - size), width: u(size), height: u(size) }}>
      <AssetImage src={assets.rosebud} alt="" sizes="48px" fallback={<FlowerBudPlaceholder kind={0} />} />
    </div>
  );
}

type Props = {
  active: boolean;
  veilRef: RefObject<HTMLDivElement | null>;
  tiltRef: RefObject<boolean>;
  onScrollHint: () => void;
};

export function RevealCard({ active, veilRef, tiltRef, onScrollHint }: Props) {
  const card = useRef<HTMLElement>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [ambient, setAmbient] = useState(false);
  // Card only mounts after the tap (client-side), so reading matchMedia here is safe
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  // Make sure the web fonts are loaded before measuring / splitting text
  useEffect(() => {
    const el = card.current;
    if (!el) return;
    const fam = (sel: string) => getComputedStyle(el.querySelector(sel)!).fontFamily;
    const loads = [
      document.fonts.load(`50px ${fam(".name")}`),
      document.fonts.load(`600 12px ${fam(".together")}`),
      document.fonts.load(`italic 14px ${fam(".relation")}`),
    ];
    const timeout = new Promise((r) => setTimeout(r, 3000));
    let live = true;
    Promise.race([Promise.all(loads).then(() => document.fonts.ready), timeout]).then(() => live && setFontsReady(true));
    return () => {
      live = false;
    };
  }, []);

  useGSAP(
    (_ctx, contextSafe) => {
      if (!active || !fontsReady || !card.current) return;
      const root = card.current;
      const q = gsap.utils.selector(root);
      const veil = veilRef.current;
      const R = timing.reveal;
      const A = timing.ambient;
      const rotOf = (_i: number, el: HTMLElement) => +el.dataset.rot!;

      /* Reduced motion: simple fade to the final state */
      if (reduced) {
        gsap.set(q(".seal-shadow"), { opacity: 1 });
        gsap.set(q(".flower-leaf"), { xPercent: -50, rotation: rotOf });
        gsap.set(q(".flower-bloom, .rosebud"), { rotation: rotOf });
        gsap.set(q(".date-gem"), { rotation: 45 });
        gsap.set(q(".wipe"), { "--wipe": "0%" });
        gsap.set(q(".scroll-hint"), { opacity: 1 });
        gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: R.reducedFade });
        if (veil) gsap.to(veil, { opacity: 0, duration: R.reducedFade, ease: "power1.out" });
        root.dataset.armed = "1";
        return;
      }

      /* ── Initial states (the card is invisible until these are set) ── */
      gsap.set(q(".paper"), { opacity: 0 });
      gsap.set(q(".paper-inner"), { scale: R.paper.scaleFrom, transformOrigin: "50% 45%" });
      gsap.set(q(".drape-tl .drape-in"), { xPercent: -105, yPercent: -105, rotation: -9, transformOrigin: "0 0" });
      gsap.set(q(".drape-br .drape-in"), { xPercent: 105, yPercent: 105, rotation: -9, transformOrigin: "100% 100%" });
      gsap.set(q(".vine .draw, .divider .draw, .flourish .draw"), { drawSVG: "0%" });
      gsap.set(q(".vine .pop, .divider .pop, .flourish .pop"), { scale: 0, transformOrigin: "50% 50%" });
      gsap.set(q(".vine g > .pop"), { transformOrigin: "0% 50%" });
      gsap.set(q(".seal"), { opacity: 0, scale: 1.4, y: -40 });
      gsap.set(q(".seal-shadow"), { opacity: 0, scale: 0.55 });
      gsap.set(q(".seal-ring"), { opacity: 0, scale: 0.9 });
      gsap.set(q(".seal-sheen"), { "--sheen": "-120%" });
      // unfurl: starts as a tight, turned-in core and opens outward
      gsap.set(q(".flower-bloom"), {
        opacity: 0,
        scale: 0.25,
        rotation: (_i: number, el: HTMLElement) => +el.dataset.rot! - R.flowers.turn,
        clipPath: "circle(16% at 50% 50%)",
      });
      gsap.set(q(".flower-leaf"), { xPercent: -50, opacity: 0, scale: 0.4, rotation: 0 });
      gsap.set(q(".rosebud"), {
        opacity: 0,
        scale: 0.2,
        rotation: (_i: number, el: HTMLElement) => +el.dataset.rot! * 1.6,
        transformOrigin: "50% 100%",
      });
      // mask is 3× wide with a feather at 33–40%: 60% = fully hidden, 0% = fully shown
      gsap.set(q(".wipe"), { "--wipe": "60%" });
      gsap.set(q(".name-flourish .draw"), { drawSVG: "0%" });
      gsap.set(q(".name-flourish .dot"), { scale: 0, transformOrigin: "50% 50%" });
      gsap.set(q(".fade-up"), { opacity: 0, y: 12, filter: "blur(4px)" });
      gsap.set(q(".joiner-word"), { opacity: 0, y: 6 });
      gsap.set(q(".scroll-hint"), { opacity: 0, y: 8 });
      gsap.set(q(".date-month"), { opacity: 0, y: 8 });
      gsap.set(q(".date-rule"), { scaleX: 0 });
      gsap.set(q(".date-num"), { yPercent: 110 });
      gsap.set(q(".date-wk"), { opacity: 0, y: 4 });
      gsap.set(q(".date-gem"), { scale: 0, rotation: 0 });
      gsap.set(q(".venue"), { opacity: 0, y: 10, filter: "blur(4px)" });

      // "TOGETHER WITH OUR FAMILIES": tracking tightens 0.6em → 0.25em,
      // done with transforms on each letter (no layout during animation)
      const togetherEl = q(".together")[0] as HTMLElement;
      const split = SplitText.create(togetherEl, { type: "chars", charsClass: "char" });
      const em = parseFloat(getComputedStyle(togetherEl).fontSize);
      const mid = (split.chars.length - 1) / 2;
      gsap.set(split.chars, { opacity: 0, x: (i: number) => (i - mid) * em * 0.35 });

      root.dataset.armed = "1";

      /* ── Master timeline ── */
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      tl.timeScale(timing.speed);

      // 0.0  cream paper settles in over the white end of the video
      tl.to(q(".paper"), { opacity: 1, duration: R.paper.fadeIn, ease: "power1.inOut" }, R.paper.at);
      if (veil) tl.to(veil, { opacity: 0, duration: R.paper.whiteFade, ease: "power1.inOut" }, R.paper.at);
      tl.to(q(".paper-inner"), { scale: 1, duration: R.paper.scaleDur, ease: "power2.out" }, R.paper.at);

      // 0.6  velvet drapes
      tl.to(q(".drape-in"), { xPercent: 0, yPercent: 0, rotation: 0, duration: R.drapes.dur, ease: "power3.out" }, R.drapes.at);

      // 1.2  gold vines draw, leaves pop along them
      tl.to(q(".vine .draw"), { drawSVG: "100%", duration: R.vines.dur, ease: "power1.inOut", stagger: 0.12 }, R.vines.at);
      tl.to(
        q(".vine .pop"),
        { scale: 1, duration: R.vines.leafDur, ease: "back.out(2.2)", stagger: R.vines.leafStagger },
        R.vines.at + 0.35,
      );

      // 1.6  wax seal drops, presses, sends a gold ripple, then a sheen
      const S = R.seal;
      const land = S.at + S.drop;
      tl.to(q(".seal"), { opacity: 1, duration: S.drop * 0.6, ease: "power1.out" }, S.at);
      tl.to(q(".seal"), { y: 0, scale: 0.96, duration: S.drop, ease: "power2.in" }, S.at);
      tl.to(q(".seal"), { scale: 1, duration: S.press, ease: "back.out(3)" }, land);
      tl.to(q(".seal-shadow"), { opacity: 1, scale: 1, duration: S.drop + S.press, ease: "power2.out" }, S.at + 0.1);
      tl.call(() => navigator.vibrate?.(15), undefined, land);
      q(".seal-ring").forEach((ring, i) => {
        tl.fromTo(
          ring,
          { opacity: 0.85, scale: 0.95 },
          { opacity: 0, scale: 1.9 + i * 0.35, duration: S.ringDur, ease: "power2.out", immediateRender: false },
          land + i * 0.14,
        );
      });
      tl.to(q(".seal-sheen"), { "--sheen": "120%", duration: S.sheenDur, ease: "power2.inOut" }, land + S.press + S.sheenDelay);

      // 2.0  flowers unfurl from the centre while turning open; leaves fan out
      const F = R.flowers;
      // seal corsage first, then the corner bouquets
      [...q(".seal-cluster .flower"), ...q(".corner-cluster .flower")].forEach((fl, i) => {
        const t = F.at + i * F.stagger;
        const bloom = fl.querySelector(".flower-bloom");
        tl.to(bloom, { opacity: 1, duration: 0.3, ease: "none" }, t);
        tl.to(bloom, { rotation: `+=${F.turn}`, duration: F.dur, ease: "power3.out" }, t);
        tl.to(bloom, { scale: 1, duration: F.dur, ease: "back.out(1.5)" }, t);
        tl.to(bloom, { clipPath: "circle(75% at 50% 50%)", duration: F.dur * 0.85, ease: "power2.out" }, t + 0.05);
        tl.set(bloom, { clipPath: "none" }, t + F.dur);
        tl.to(
          fl.querySelectorAll(".flower-leaf"),
          { opacity: 1, scale: 1, rotation: rotOf, duration: F.leafDur, ease: "power3.out", stagger: 0.06 },
          t + 0.1,
        );
      });

      // 2.5  rosebuds spring up from their base
      tl.to(
        q(".rosebud"),
        { opacity: 1, scale: 1, rotation: rotOf, duration: R.buds.dur, ease: "elastic.out(1, 0.55)", stagger: R.buds.stagger },
        R.buds.at,
      );

      // 2.8  TOGETHER WITH OUR FAMILIES
      tl.to(split.chars, { opacity: 1, x: 0, duration: R.together.dur, ease: "power3.out", stagger: { each: 0.018, from: "center" } }, R.together.at);

      // 3.1  divider draws outward from its diamond
      const drawDivider = (sel: string, at: number, dur: number) => {
        tl.to(q(`${sel} .diamond`), { scale: 1, duration: 0.45, ease: "back.out(2.5)" }, at);
        tl.to(q(`${sel} .draw`), { drawSVG: "100%", duration: dur, ease: "power2.out" }, at + 0.12);
        tl.to(q(`${sel} .pop:not(.diamond)`), { scale: 1, duration: 0.3, ease: "back.out(2)" }, at + 0.1);
      };
      drawDivider(".divider-1", R.divider1.at, R.divider1.dur);

      const write = (sel: string, at: number, dur: number) =>
        tl.to(q(sel), { "--wipe": "0%", duration: dur, ease: "power1.inOut" }, at);
      const fadeUp = (sel: string, at: number, dur: number, stagger = 0.12) =>
        tl.to(q(sel), { opacity: 1, y: 0, filter: "blur(0px)", duration: dur, ease: "power2.out", stagger }, at);

      // 3.4  names written in like a pen
      // gold swash under a name: strokes grow from the centre outward as the pen lifts
      const swash = (sel: string, at: number) => {
        tl.to(q(`${sel} .draw`), { drawSVG: "100%", duration: R.flourish.dur, ease: "power2.inOut", stagger: R.flourish.stagger }, at);
        tl.to(q(`${sel} .dot`), { scale: 1, duration: 0.35, ease: "back.out(3)", stagger: 0.08 }, at + R.flourish.dur * 0.8);
      };

      write(".bride-name", R.bride.at, R.bride.write);
      swash(".flourish-bride", R.bride.at + R.bride.write * R.flourish.afterWrite);
      fadeUp(".bride-meta", R.brideParents.at, R.brideParents.dur);

      tl.to(q(".joiner-word"), { opacity: 1, y: 0, duration: R.joiner.dur, ease: "power2.out" }, R.joiner.at);
      tl.to(q(".flourish .draw"), { drawSVG: "100%", duration: R.joiner.dur + 0.3, ease: "power2.out" }, R.joiner.at + 0.1);
      tl.to(q(".flourish .pop"), { scale: 1, duration: 0.3, ease: "back.out(2)" }, R.joiner.at + R.joiner.dur);

      write(".groom-name", R.groom.at, R.groom.write);
      swash(".flourish-groom", R.groom.at + R.groom.write * R.flourish.afterWrite);
      fadeUp(".groom-meta", R.groomParents.at, R.groomParents.dur);

      drawDivider(".divider-2", R.divider2.at, R.divider2.dur);
      fadeUp(".invite", R.invite.at, R.invite.dur);
      write(".tagline-wipe", R.tagline.at, R.tagline.write);
      // ~9s  date block: rules draw out from the month, numbers rise in one by one
      const Dt = R.details;
      tl.to(q(".date-month"), { opacity: 1, y: 0, duration: Dt.dur, ease: "power2.out" }, Dt.at);
      tl.to(q(".date-rule"), { scaleX: 1, duration: Dt.dur, ease: "power3.out" }, Dt.at + 0.1);
      tl.to(q(".date-num"), { yPercent: 0, duration: Dt.dur, ease: "power4.out", stagger: Dt.stagger }, Dt.at + 0.25);
      tl.to(q(".date-wk"), { opacity: 1, y: 0, duration: 0.6, stagger: Dt.stagger }, Dt.at + 0.45);
      tl.to(q(".date-gem"), { scale: 1, rotation: 45, duration: 0.5, ease: "back.out(3)", stagger: Dt.stagger }, Dt.at + 0.5);
      tl.to(q(".venue"), { opacity: 1, y: 0, filter: "blur(0px)", duration: Dt.dur, ease: "power2.out" }, Dt.at + 0.75);
      tl.to(q(".scroll-hint"), { opacity: 1, y: 0, duration: R.scrollHint.dur }, R.scrollHint.at);
      tl.set(q(".fade-up, .venue"), { clearProps: "filter" });

      /* ── Ambient loop ── */
      const cleanups: (() => void)[] = [];

      const startAmbient = contextSafe!(() => {
        setAmbient(true);

        // Each flower is alive on its own: a slow circular drift (the whole
        // flower + leaves), a gentle rocking sway and a breath (the bloom).
        const unit = Math.min(root.clientWidth, root.clientHeight * 0.5625) / 390;
        const rnd = gsap.utils.random;
        const flowersInOrder = [...q(".seal-cluster .flower"), ...q(".corner-cluster .flower")];
        flowersInOrder.forEach((fl, i) => {
          const bloom = fl.querySelector<HTMLElement>(".flower-bloom")!;
          const dir = i % 2 ? 1 : -1;

          // circle of radius r that passes through the resting point, so it starts without a jump
          const r = rnd(A.orbitRadius[0], A.orbitRadius[1]) * unit;
          const setX = gsap.quickSetter(fl, "x", "px");
          const setY = gsap.quickSetter(fl, "y", "px");
          const orbit = { a: 0 };
          gsap.to(orbit, {
            a: Math.PI * 2 * dir,
            duration: rnd(A.orbitPeriod[0], A.orbitPeriod[1]),
            ease: "none",
            repeat: -1,
            onUpdate: () => {
              setX(r * (Math.cos(orbit.a) - 1));
              setY(r * Math.sin(orbit.a));
            },
          });

          gsap.to(bloom, {
            rotation: `+=${dir * A.swayDeg}`,
            duration: rnd(3.2, 5),
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: rnd(0, 1.5),
          });
          gsap.to(bloom, {
            scale: A.breatheScale,
            duration: A.breatheDur,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: (i * 0.73) % A.breatheDur,
          });
        });

        // Tap a flower: it twirls and throws a little burst of gold sparks
        const twirl = contextSafe!((bloom: HTMLElement) => {
          const spin = bloom.querySelector<HTMLElement>(".flower-spin")!;
          if (gsap.isTweening(spin)) return;
          const dir = Math.random() > 0.5 ? 1 : -1;
          gsap
            .timeline()
            .to(spin, { rotation: `+=${360 * dir}`, duration: A.twirlDur, ease: "power3.inOut" }, 0)
            .to(spin, { scale: 1.18, duration: A.twirlDur * 0.35, ease: "power2.out" }, 0)
            .to(spin, { scale: 1, duration: A.twirlDur * 0.65, ease: "elastic.out(1, 0.5)" }, A.twirlDur * 0.35);

          const host = bloom.parentElement!;
          const size = bloom.clientWidth;
          for (let s = 0; s < A.sparks; s++) {
            const spark = document.createElement("span");
            spark.className = "spark";
            host.appendChild(spark);
            const ang = (s / A.sparks) * Math.PI * 2 + rnd(-0.3, 0.3);
            const dist = size * rnd(0.55, 0.9);
            gsap.fromTo(
              spark,
              { x: 0, y: 0, scale: rnd(0.6, 1.1), opacity: 1 },
              {
                x: Math.cos(ang) * dist,
                y: Math.sin(ang) * dist,
                scale: 0,
                opacity: 0,
                duration: rnd(0.7, 1.1),
                ease: "power3.out",
                delay: A.twirlDur * 0.15,
                onComplete: () => spark.remove(),
              },
            );
          }
          navigator.vibrate?.(8);
        });
        const onTap = (e: Event) => twirl(e.currentTarget as HTMLElement);
        q(".flower-bloom").forEach((b) => b.addEventListener("click", onTap));
        cleanups.push(() => q(".flower-bloom").forEach((b) => b.removeEventListener("click", onTap)));
        // one unprompted twirl of the big rose, so guests discover they can tap
        const first = q(".seal-cluster .flower-bloom")[0] as HTMLElement | undefined;
        if (first) gsap.delayedCall(A.hintTwirlAfter, () => twirl(first));
        // buds nod gently from their base
        q(".rosebud").forEach((el, i) => {
          const base = +(el as HTMLElement).dataset.rot!;
          gsap.fromTo(
            el,
            { rotation: base - A.budSwayDeg },
            { rotation: base + A.budSwayDeg, duration: 3.2 + i * 0.4, ease: "sine.inOut", yoyo: true, repeat: -1 },
          );
        });

        // gold shimmer across the script lines every ~8s
        gsap
          .timeline({ repeat: -1, repeatDelay: Math.max(0, A.shimmerEvery - A.shimmerDur), delay: 1.2 })
          .fromTo(
            q(".shimmer"),
            { "--shine": "120%" },
            { "--shine": "-20%", duration: A.shimmerDur, ease: "power1.inOut", stagger: 0.3 },
          );

        // parallax: device tilt, with mouse / touch-drag fallback
        const layers = q("[data-depth]").map((el) => {
          const d = parseFloat((el as HTMLElement).dataset.depth!) * A.parallaxPx;
          return {
            d,
            x: gsap.quickTo(el, "x", { duration: 0.9, ease: "power3" }),
            y: gsap.quickTo(el, "y", { duration: 0.9, ease: "power3" }),
          };
        });
        const apply = (nx: number, ny: number) => {
          for (const l of layers) {
            l.x(nx * l.d);
            l.y(ny * l.d);
          }
        };
        const clamp = gsap.utils.clamp(-1, 1);
        let usingTilt = false;

        const onTilt = (e: DeviceOrientationEvent) => {
          if (e.gamma == null || e.beta == null) return;
          usingTilt = true;
          apply(clamp(e.gamma / 25), clamp((e.beta - 40) / 25));
        };
        if (tiltRef.current) {
          window.addEventListener("deviceorientation", onTilt);
          cleanups.push(() => window.removeEventListener("deviceorientation", onTilt));
        }

        let start: { x: number; y: number } | null = null;
        const onDown = (e: PointerEvent) => {
          if (e.pointerType !== "mouse") start = { x: e.clientX, y: e.clientY };
        };
        const onMove = (e: PointerEvent) => {
          if (usingTilt) return;
          if (e.pointerType === "mouse") {
            const r = root.getBoundingClientRect();
            apply(clamp(((e.clientX - r.left) / r.width) * 2 - 1), clamp(((e.clientY - r.top) / r.height) * 2 - 1));
          } else if (start) {
            apply(clamp((e.clientX - start.x) / 120), clamp((e.clientY - start.y) / 160));
          }
        };
        const onUp = () => {
          start = null;
          if (!usingTilt) apply(0, 0);
        };
        root.addEventListener("pointerdown", onDown);
        root.addEventListener("pointermove", onMove);
        root.addEventListener("pointerup", onUp);
        root.addEventListener("pointercancel", onUp);
        root.addEventListener("pointerleave", onUp);
        cleanups.push(() => {
          root.removeEventListener("pointerdown", onDown);
          root.removeEventListener("pointermove", onMove);
          root.removeEventListener("pointerup", onUp);
          root.removeEventListener("pointercancel", onUp);
          root.removeEventListener("pointerleave", onUp);
        });
      });
      tl.call(startAmbient);

      tl.play(0);
      // dev only: scrub from the console, e.g. __revealTl.pause().seek(4)
      if (process.env.NODE_ENV !== "production") (window as unknown as { __revealTl: gsap.core.Timeline }).__revealTl = tl;

      return () => cleanups.forEach((fn) => fn());
    },
    { dependencies: [active, fontsReady, reduced], scope: card },
  );

  return (
    <section ref={card} className="card" aria-label="Wedding invitation">
      <h1 className="sr-only">
        {C.bride.name} &amp; {C.groom.name} — {C.dateLine}
      </h1>

      {/* Paper: the same seamless sheet that continues under every section
          below (no parallax, so the two always line up) */}
      <div className="layer paper" aria-hidden>
        <div className="paper-inner" />
      </div>

      {/* Velvet corners — fixed in place (no parallax); only the fabric
          pattern flows inside them */}
      <VelvetDefs />
      <div className="layer drape drape-tl" aria-hidden>
        <div className="drape-in">
          <VelvetDrape variant="tl" tile={assets.velvetTile} tileU={V.tileU} flowSeconds={V.flowSeconds} sheenSeconds={V.sheenSeconds} />
        </div>
      </div>
      <div className="layer drape drape-br" aria-hidden>
        <div className="drape-in">
          <VelvetDrape variant="br" tile={assets.velvetTile} tileU={V.tileU} flowSeconds={V.flowSeconds} sheenSeconds={V.sheenSeconds} />
        </div>
      </div>

      {/* Gold vines (hug the drapes, so they stay fixed too) */}
      <div className="layer vine vine-tl" aria-hidden>
        <CornerVine />
      </div>
      <div className="layer vine vine-br" aria-hidden>
        <TailVine />
      </div>

      {ambient && !reduced && <GoldDust count={timing.ambient.dustParticles} />}

      {/* Corner flowers */}
      <div className="corner-cluster corner-bl layer" aria-hidden>
        {CORNER_BUDS.map((b, i) => (
          <Bud key={`b${i}`} spec={b} />
        ))}
        {CORNER_FLOWERS.map((f, i) => (
          <Flower key={i} spec={f} />
        ))}
      </div>
      <div className="corner-cluster corner-br layer" aria-hidden>
        {CORNER_BUDS_BR.map((b, i) => (
          <Bud key={`b${i}`} spec={b} />
        ))}
        {CORNER_FLOWERS_BR.map((f, i) => (
          <Flower key={i} spec={f} />
        ))}
      </div>

      {/* Wording */}
      <div className="content" data-depth="0.15">
        <div className="seal-cluster" data-depth="0.5" aria-hidden>
          {SEAL_BUDS.map((b, i) => (
            <Bud key={`b${i}`} spec={b} />
          ))}
          {SEAL_FLOWERS.map((f, i) => (
            <Flower key={i} spec={f} />
          ))}
          <div className="seal-wrap">
            <div className="seal-shadow" />
            <span className="seal-ring" />
            <span className="seal-ring" />
            <div className="seal">
              <AssetImage src={assets.seal} alt="" sizes="110px" fallback={<SealPlaceholder />} />
              <div className="seal-sheen" />
            </div>
          </div>
        </div>

        <span className="grow" />
        <p className="caps together">{C.together}</p>
        <Divider className="divider divider-1" />

        <span className="grow" />
        <p className="script name">
          <span className="wipe bride-name">
            <span className="shimmer">{C.bride.name}</span>
          </span>
        </p>
        <NameFlourish className="flourish-bride" />
        <p className="relation fade-up bride-meta">{C.bride.relation}</p>
        <p className="parents fade-up bride-meta">{C.bride.parents}</p>

        <div className="joiner">
          <Flourish />
          <span className="script joiner-word">{C.joiner}</span>
          <Flourish mirror />
        </div>

        <p className="script name">
          <span className="wipe groom-name">
            <span className="shimmer">{C.groom.name}</span>
          </span>
        </p>
        <NameFlourish className="flourish-groom" />
        <p className="relation fade-up groom-meta">{C.groom.relation}</p>
        <p className="parents fade-up groom-meta">{C.groom.parents}</p>

        <span className="grow" />
        <Divider className="divider divider-2" />
        <p className="caps invite fade-up">{C.inviteLine}</p>
        <p className="script tagline">
          <span className="wipe tagline-wipe">
            <span className="shimmer">{C.tagline}</span>
          </span>
        </p>

        <span className="grow" />
        <div className="details">
          <p className="sr-only">{C.dateLine}</p>
          <div className="date-block" aria-hidden>
            <div className="date-head">
              <span className="date-rule" />
              <span className="date-month">
                {C.dates.month} <span className="date-dot">·</span> {C.dates.year}
              </span>
              <span className="date-rule" />
            </div>
            <div className="date-days">
              {C.dates.days.map((d, i) => (
                <div key={d.day} className="date-day-wrap">
                  {i > 0 && <span className="date-gem" />}
                  <div className="date-day">
                    <span className="date-wk">{d.weekday}</span>
                    <span className="date-num-mask">
                      <span className="date-num">{d.day}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="venue">
            <svg className="venue-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
              <circle cx="12" cy="9.5" r="2.4" />
            </svg>
            {C.venueLine}
          </p>
        </div>
        <span className="grow" />
        <button type="button" className="scroll-hint" onClick={onScrollHint} aria-label="Scroll to event details">
          {C.scrollHint}
          <Chevron />
        </button>
      </div>

      {ambient && !reduced && <Petals count={timing.ambient.petals} />}
    </section>
  );
}
