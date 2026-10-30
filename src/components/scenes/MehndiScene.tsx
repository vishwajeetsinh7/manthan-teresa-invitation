"use client";
/* eslint-disable @next/next/no-img-element -- pre-sized WebP cut-outs, decoded by hand before they show */

import { useMemo, useRef, type CSSProperties, type RefObject } from "react";
import { gsap, useGSAP } from "@/src/lib/gsap";
import { timing } from "@/src/config/timing";
import manifest from "@/public/scenes/mehndi/manifest.json";
import layout from "@/src/config/scenes/mehndi.json";
import {
  DebugMaster,
  ParticlePool,
  Reveal,
  SceneItems,
  createIdle,
  createParticles,
  gateIdle,
  makeScene,
  playOnArrival,
  revealTween,
  stageVars,
  useDebug,
  useSceneAssets,
  type Layout,
  type Manifest,
  type Region,
} from "./engine";

/**
 * The Mehndi scene: illustrated cut-outs that assemble as the Mehndi page
 * arrives (one swipe, ~3 s), then idle gently. Built on the shared scene
 * engine (./engine). Pieces, pivots, the lamp's flame anchors and the henna
 * palms come from scripts/build-scene-assets.mjs; where everything sits is
 * src/config/scenes/mehndi.json (stage %, tweakable). ?debug=1 shows the master.
 */
const SC = makeScene(manifest as unknown as Manifest, layout as Layout, 0.15);
const { url, box, byId, ITEMS } = SC;
const S = timing.sections.scene;

const PARTICLE_KINDS = {
  ambient: ["petal-marigold-1", "petal-marigold-2", "petal-marigold-3", "petal-marigold-4", "petal-rose-1", "petal-rose-2", "petal-rose-3", "petal-rose-4", "jasmine-1", "jasmine-2", "jasmine-3", "jasmine-4"],
  rare: ["marigold-1", "marigold-2", "marigold-3"],
  petals: ["petal-marigold-1", "petal-marigold-2", "petal-rose-3", "petal-rose-4", "petal-marigold-4", "petal-rose-1"],
  sparkles: ["sparkle-1", "sparkle-2", "sparkle-3", "sparkle-4"],
};
/** everything the stage shows (bride-henna is only used to build the palms) */
const RUNTIME = [...new Set([...ITEMS.map((i) => i.piece), "bride-palms", "flame-1", "flame-2", "flame-3", ...Object.values(PARTICLE_KINDS).flat()])].map(url);

export function MehndiScene({ scrollerRef, style, reduce }: { scrollerRef: RefObject<HTMLDivElement | null>; style: CSSProperties; reduce: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const ready = useSceneAssets(wrap, scrollerRef, RUNTIME);
  const debug = useDebug();

  useGSAP(
    () => {
      if (!ready || reduce) return;
      const scroller = scrollerRef.current;
      const root = wrap.current;
      if (!scroller || !root) return;
      const q = gsap.utils.selector(root);
      const stage = q(".ms-stage")[0] as HTMLElement;
      const item = (id: string) => q(`[data-id="${id}"]`)[0] as HTMLElement;
      const W = () => stage.clientWidth;
      const H = () => stage.clientHeight;
      const k = () => stage.clientWidth / 390; // px per design px
      const rnd = gsap.utils.random;

      /* ── assembly ─────────────────────────────────────────────────────── */
      let assembled = false;
      let lastRun = -Infinity;
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      const T = 100; // the timeline is laid out in % of the assembly

      // 0–15 %: the rug opens from the centre, the bride rises in, her shadow warms
      const rug = item("rug");
      gsap.set(rug, { transformOrigin: "50% 60%" });
      tl.fromTo(rug, { scaleX: 0.12, scaleY: 0.3, opacity: 0 }, { scaleX: 1, scaleY: 1, opacity: 1, duration: 13, ease: "power3.out" }, 0)
        .fromTo(q(".ms-shadow"), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 12 }, 2)
        .fromTo(item("bride"), { y: () => 30 * k(), opacity: 0 }, { y: 0, opacity: 1, duration: 12, ease: "power3.out" }, 3);

      // 15–35 %: the toran — the cord draws, the strands drop in one by one and settle
      const strands = ITEMS.filter((i) => i.id.startsWith("toran-")).map((i) => item(i.id));
      tl.fromTo(q(".ms-cord-path"), { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 9, ease: "power2.inOut" }, 14);
      tl.fromTo(q(".ms-cord-bead"), { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 3, ease: "back.out(3)", stagger: 0.8 }, 17);
      strands.forEach((s, i) => tl.fromTo(s, { y: () => -H() * 0.32, opacity: 0 }, { y: 0, opacity: 1, duration: 8, ease: "back.out(1.7)" }, 16 + i * 2.2));

      // 35–60 %: the friends glide in from the sides with a soft walking bob; banana plants grow
      const walk = (el: HTMLElement, from: number, at: number) => {
        tl.fromTo(el, { x: () => from * W(), opacity: 0 }, { x: 0, opacity: 1, duration: 23, ease: "power3.out" }, at);
        tl.fromTo(el, { y: 0 }, { y: () => -4 * k(), duration: 2.6, ease: "sine.inOut", repeat: 7, yoyo: true }, at);
      };
      walk(item("friend-gujarati"), -0.6, 35);
      walk(item("friend-kerala"), 0.6, 37);
      for (const id of ["banana-left", "banana-right"])
        tl.fromTo(item(id), { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 20, ease: "power3.out" }, id.endsWith("left") ? 38 : 41);

      // 60–85 %: the front props slide in; the lamp lights as it settles
      const slide = (id: string, fx: number, fy: number, at: number) =>
        tl.fromTo(item(id), { x: () => fx * W(), y: () => fy * H(), opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 14, ease: "power3.out" }, at);
      slide("dholak", -0.45, 0.1, 60);
      slide("uruli", -0.35, 0.14, 63);
      slide("lamp", 0.4, 0, 62);
      slide("bolster", 0.45, 0.03, 66);
      slide("cone-basket", 0, 0.22, 69);
      tl.fromTo(q(".ms-flame"), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 6, ease: "back.out(2)", stagger: 0.7 }, 76);

      // 85–100 %: henna blooms on her palms (a radial wipe), petals and sparkles burst around her
      q(".ms-reveal").forEach((el, i) => revealTween(tl, el, 86 + i * 1.5, 9));
      q(".ms-burst img").forEach((p, i, all) => {
        const a = (i / all.length) * Math.PI * 2 + rnd(-0.3, 0.3);
        const r = rnd(0.12, 0.2);
        tl.fromTo(
          p,
          { x: 0, y: 0, scale: 0.3, opacity: 0, rotation: 0 },
          {
            keyframes: [
              { opacity: 1, scale: 1, duration: 3 },
              { x: () => Math.cos(a) * r * W(), y: () => Math.sin(a) * r * W() + 0.05 * W(), rotation: rnd(-200, 200), duration: 8 },
              { opacity: 0, duration: 3 },
            ],
            ease: "power2.out",
          },
          87 + (i % 3) * 0.4,
        );
      });
      tl.fromTo(q(".ms-burst-spark"), { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 3 }, { scale: 0, opacity: 0, rotation: 90, duration: 4 }], stagger: 0.9 }, 89);
      if (tl.duration() < T) tl.to({}, { duration: T - tl.duration() });
      gsap.set(item("flower-girl"), { opacity: 0 });

      /* ── idle: alive but calm ─────────────────────────────────────────── */
      const { idle, every } = createIdle();
      const { spawn, setTicking, count } = createParticles(q(".ms-particle") as HTMLImageElement[], H, url);
      let idleStarted = false;

      const startIdle = () => {
        if (idleStarted) return;
        idleStarted = true;
        // strands: pendulum sway about their loop, each with its own period and phase
        strands.forEach((s) => idle.fromTo(s, { rotation: -rnd(2, 3) }, { rotation: rnd(2, 3), duration: rnd(1.4, 2), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 1.5)));
        // banana plants: a slow sway from the pot
        for (const id of ["banana-left", "banana-right"]) idle.fromTo(item(id), { rotation: -1 }, { rotation: 1, duration: rnd(2.6, 3), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 2));
        // characters breathe (from the feet)
        for (const id of ["bride", "friend-gujarati", "friend-kerala"])
          idle.fromTo(item(id), { scaleY: 1 }, { scaleY: 1.006, duration: rnd(1.75, 2.25), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 2));
        // lamp flames: cycle the three shapes, flicker, glow
        q(".ms-flame").forEach((f) => {
          const imgs = f.querySelectorAll("img");
          const glow = f.querySelector(".ms-glow");
          idle.to(f, { scaleY: () => rnd(0.86, 1.12), scaleX: () => rnd(0.92, 1.06), duration: () => rnd(0.09, 0.18), ease: "sine.inOut", repeat: -1, repeatRefresh: true }, rnd(0, 0.3));
          idle.to(glow, { opacity: () => rnd(0.5, 0.95), scale: () => rnd(0.9, 1.15), duration: () => rnd(0.12, 0.25), repeat: -1, repeatRefresh: true }, 0);
          let n = 0;
          every(0.12, 0.26, () => {
            n = (n + 1) % imgs.length;
            imgs.forEach((im, j) => gsap.to(im, { opacity: j === n ? 1 : 0, duration: 0.08, overwrite: "auto" }));
          });
        });
        // the Kerala friend lets petals fall from her fingers over the plate
        const kb = box(byId["friend-kerala"]);
        every(3, 5, () => {
          const n = Math.round(rnd(1, 3));
          for (let i = 0; i < n; i++)
            spawn(gsap.utils.random(PARTICLE_KINDS.petals), ((kb.left + kb.w * S.fingers[0]) / 100) * W() + rnd(-4, 4), ((kb.top + kb.h * S.fingers[1]) / 100) * H(), {
              vy: rnd(22, 34) * k(),
              vx: rnd(-6, 6),
              life: rnd(2.2, 3),
              s: rnd(0.45, 0.6),
              sw: rnd(3, 6),
            });
        });
        // ambient: petals, jasmine buds, the odd marigold drift down (8 at most)
        every(1.2, 2.2, () => {
          if (count("ambient") >= S.maxAmbient) return;
          const kind = Math.random() < 0.12 ? gsap.utils.random(PARTICLE_KINDS.rare) : gsap.utils.random(PARTICLE_KINDS.ambient);
          spawn(kind, rnd(0.05, 0.95) * W(), -0.04 * H(), { tag: "ambient", vy: rnd(16, 26) * k(), vx: rnd(-4, 4), life: 14, s: rnd(0.5, 0.8) * (kind.startsWith("marigold") ? 0.8 : 1) });
        });
        // sparkles twinkle near the lamp and around the bride
        const sparks = q(".ms-spark");
        let si = 0;
        every(1.2, 2.6, () => {
          const sp = sparks[si++ % sparks.length];
          const nearLamp = Math.random() < 0.5;
          const b = box(byId[nearLamp ? "lamp" : "bride"]);
          gsap.set(sp, { left: `${b.left + b.w * rnd(0.1, 0.9)}%`, top: `${b.top + b.h * (nearLamp ? rnd(0, 0.25) : rnd(0.05, 0.45))}%` });
          gsap.fromTo(sp, { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.45 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.5 }], ease: "sine.inOut" });
        });
        gate.run();
      };

      // the flower girl runs across the front, petals spilling from her basket
      const girl = item("flower-girl");
      const runGirl = () => {
        lastRun = performance.now();
        const gb = box(byId["flower-girl"]);
        const dash = gsap.timeline();
        dash
          .fromTo(girl, { x: () => -W() * 0.8, opacity: 1 }, { x: () => W() * 0.85, duration: S.girlRun, ease: "sine.inOut" }, 0)
          .fromTo(girl, { y: 0 }, { y: () => -5 * k(), duration: 0.16, ease: "sine.out", yoyo: true, repeat: Math.round(S.girlRun / 0.16) }, 0)
          .fromTo(girl, { rotation: -1.5 }, { rotation: 1.5, duration: 0.32, ease: "sine.inOut", yoyo: true, repeat: Math.round(S.girlRun / 0.32) }, 0)
          .set(girl, { opacity: 0 });
        const spill = () => {
          const gx = (gb.left / 100) * W() + (gsap.getProperty(girl, "x") as number);
          const gy = (gb.top / 100) * H();
          spawn(gsap.utils.random(PARTICLE_KINDS.petals), gx + (gb.w / 100) * W() * S.basket[0], gy + (gb.h / 100) * H() * S.basket[1], {
            vy: rnd(30, 50) * k(),
            vx: rnd(-30, -10) * k(),
            life: rnd(1.4, 2),
            s: rnd(0.4, 0.55),
          });
        };
        for (let t = 0.25; t < S.girlRun - 0.3; t += 0.14) dash.call(spill, undefined, t);
        idle.add(dash, idle.time());
      };

      // idle only while on screen; back in view after a while → the flower girl runs again
      const gate = gateIdle(stage, idle, setTicking, () => idleStarted, () => {
        if (assembled && performance.now() - lastRun > S.girlEvery * 1000) runGirl();
      });
      playOnArrival({
        tl,
        stage,
        scroller,
        T,
        seconds: S.assemble,
        reverseSpeed: S.reverseSpeed,
        startAt: S.startAt,
        onComplete: () => {
          assembled = true;
          startIdle();
          if (performance.now() - lastRun > S.girlEvery * 1000) runGirl();
        },
        onLeaveBack: () => (assembled = false),
      });
      return () => gate.dispose();
    },
    { dependencies: [ready, reduce], scope: wrap },
  );

  const bride = byId["bride"];
  const bb = box(bride);
  const brideAspect = SC.P[bride.piece].aspect; // w / h
  const palms = (manifest.pieces["bride-plain"] as unknown as { palms: Region[] }).palms;
  const flames = (manifest.pieces.lamp as unknown as { flames: { x: number; y: number; h: number }[] }).flames;
  const cord = useMemo(() => {
    // the gold cord through every strand's loop, sagging a little between them
    const pts = ITEMS.filter((i) => i.id.startsWith("toran-")).map((t) => [t.x, t.y * SC.ASPECT] as const);
    let d = `M0 ${(pts[0][1] - 1.2).toFixed(2)}`;
    let prev: readonly [number, number] = [0, pts[0][1] - 1.2];
    for (const p of [...pts, [100, pts[pts.length - 1][1] - 1.2] as const]) {
      d += ` Q${((prev[0] + p[0]) / 2).toFixed(2)} ${(Math.max(prev[1], p[1]) + 2.2).toFixed(2)} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
      prev = p;
    }
    return { d, pts };
  }, []);

  return (
    <div ref={wrap} className="ms-wrap" data-page="mehndi" data-reduce={reduce || undefined} style={{ ...style, ...stageVars(SC.ASPECT) }} aria-hidden>
      <div className="ms-stage" data-ready={ready || undefined}>
        {debug && <DebugMaster scene={SC} />}
        {ready && (
          <>
            <div className="ms-shadow" />
            <svg className="ms-cord" viewBox={`0 0 100 ${100 * SC.ASPECT}`} preserveAspectRatio="none">
              <path className="ms-cord-path" d={cord.d} />
              {cord.pts.map(([x, y], i) => (
                <circle key={i} className="ms-cord-bead" cx={x} cy={y} r={0.7} />
              ))}
            </svg>
            <SceneItems
              scene={SC}
              extra={(it) =>
                it.id === "bride" ? (
                  palms.map((p, i) => <Reveal key={i} src={url("bride-palms")} region={p} aspect={brideAspect} />)
                ) : it.id === "lamp" ? (
                  flames.map((f, i) => (
                    <div key={i} className="ms-flame" style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, height: `${f.h * 140}%` }}>
                      <span className="ms-glow" />
                      {["flame-1", "flame-2", "flame-3"].map((n, j) => (
                        <img key={n} src={url(n)} alt="" style={{ opacity: j === 0 ? 1 : 0 }} />
                      ))}
                    </div>
                  ))
                ) : null
              }
            />
            {/* henna burst around the bride */}
            <div className="ms-burst" style={{ left: `${bride.x}%`, top: `${bb.top + bb.h * 0.32}%` }}>
              {Array.from({ length: 9 }, (_, i) => (
                <img key={i} src={url(PARTICLE_KINDS.petals[i % PARTICLE_KINDS.petals.length])} alt="" />
              ))}
              {[0, 1, 2].map((i) => (
                <img key={`s${i}`} className="ms-burst-spark" src={url(PARTICLE_KINDS.sparkles[i])} alt="" style={{ left: `${[-60, 70, 10][i]}%`, top: `${[-40, -20, -90][i]}%` }} />
              ))}
            </div>
            {/* idle sparkles and the particle pool (one shared ticker) */}
            {[0, 1, 2].map((i) => (
              <img key={`sp${i}`} className="ms-spark" src={url(PARTICLE_KINDS.sparkles[i + 1])} alt="" />
            ))}
            <ParticlePool />
          </>
        )}
      </div>
    </div>
  );
}
