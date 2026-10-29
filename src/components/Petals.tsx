"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/src/lib/gsap";
import { timing } from "@/src/config/timing";
import { assets } from "@/src/config/assets";
import { AssetImage } from "./AssetImage";
import { PetalPlaceholder } from "./art/Placeholders";

/** A few petals drifting down with tumble and sway. */
export function Petals({ count }: { count: number }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const box = root.current!;
      const W = box.clientWidth;
      const H = box.clientHeight;
      const [minFall, maxFall] = timing.ambient.petalFall;
      const r = gsap.utils.random;

      box.querySelectorAll<HTMLElement>(".petal").forEach((p, i) => {
        const inner = p.querySelector<HTMLElement>(".petal-inner")!;

        const fall = (first: boolean) => {
          const dur = r(minFall, maxFall);
          gsap.set(p, { x: r(0.05, 0.95) * W, y: -40, rotation: r(0, 360), opacity: 0 });
          gsap
            .timeline({ delay: first ? i * 1.4 + r(0, 1.2) : r(0, 2), onComplete: () => fall(false) })
            .to(p, { y: H + 40, rotation: `+=${r(120, 300)}`, x: `+=${r(-60, 60)}`, duration: dur, ease: "none" }, 0)
            .to(p, { opacity: r(0.7, 0.95), duration: 1.2, ease: "power1.out" }, 0)
            .to(p, { opacity: 0, duration: 1.5, ease: "power1.in" }, dur - 1.5);
        };
        fall(true);

        // Sway + 3D flutter on the inner element.
        // Perspective is SET once, never tweened: tweening it from 0 made tiny
        // petals project into huge streaks ("laser" lines) on every cycle.
        // The flip also stays within ±55° so a petal never turns edge-on
        // and collapses into a thin bright sliver.
        const tilt = timing.ambient.petalFlutterDeg * (i % 2 ? 1 : -1);
        gsap.set(inner, { transformPerspective: 600, rotationY: -tilt, rotationX: r(-20, 20) });
        gsap.to(inner, { x: r(14, 26), duration: r(2.2, 3.4), ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(inner, {
          rotationY: tilt,
          rotationX: r(-30, 30),
          duration: r(1.8, 3),
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="petals" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const kind = i % 3;
        const size = 13 + ((i * 7) % 9);
        return (
          <div key={i} className="petal" style={{ width: `calc(var(--u) * ${size})`, height: `calc(var(--u) * ${size * 1.2})` }}>
            <div className="petal-inner" style={{ position: "relative" }}>
              <AssetImage src={assets.petals[kind]} alt="" sizes="48px" fallback={<PetalPlaceholder kind={kind} />} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
