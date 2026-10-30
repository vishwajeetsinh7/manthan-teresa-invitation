"use client";
/* eslint-disable @next/next/no-img-element -- pre-sized WebP cut-outs, decoded by hand before they show */

import { useRef, type CSSProperties, type RefObject } from "react";
import { gsap, useGSAP } from "@/src/lib/gsap";
import { timing } from "@/src/config/timing";
import manifest from "@/public/scenes/hindu-wedding/manifest.json";
import layout from "@/src/config/scenes/hindu-wedding.json";
import {
  DebugMaster,
  ParticlePool,
  SceneItems,
  createIdle,
  createParticles,
  gateIdle,
  makeScene,
  playOnArrival,
  stageVars,
  useDebug,
  useSceneAssets,
  type Layout,
  type Manifest,
} from "./engine";

/**
 * The Hindu wedding scene, "Four Rounds of Fire": the mandap builds, the
 * sacred fire is lit, the antarpat is lowered and the couple see each other,
 * they exchange varmalas and come together hand in hand while the four
 * diyas light one by one. A blessing of petals ends it; then it idles (the fire,
 * the pandit's ghee offerings, flickering diyas, swaying swags, petals).
 *
 * Built on the shared scene engine (./engine), placed like the other scenes
 * (bottom part of its page; the story plays, timed, as the page arrives).
 * Pieces: scripts/scenes/hindu-wedding.config.mjs; layout:
 * src/config/scenes/hindu-wedding.json. ?debug=1 shows the master.
 */
const SC = makeScene(manifest as unknown as Manifest, layout as Layout, 0.15);
const { url, box, byId, ITEMS, point } = SC;
const S = timing.sections.hindu;

const KINDS = {
  petals: ["petal-red-1", "petal-red-2", "petal-red-3", "petal-red-4", "petal-pink-1", "petal-pink-2", "petal-pink-3", "petal-pink-4"],
  ambient: ["petal-red-1", "petal-red-3", "petal-pink-2", "petal-pink-4", "tuberose-1", "tuberose-2", "tuberose-3", "tuberose-4"],
  sparks: ["spark-1", "spark-2", "spark-3", "spark-4", "spark-5"],
  sparkles: ["sparkle-1", "sparkle-2", "sparkle-3", "sparkle-4"],
  fires: ["fire-1", "fire-2", "fire-3"],
  flames: ["diya-flame-1", "diya-flame-2", "diya-flame-3"],
};
const RUNTIME = [...new Set([...ITEMS.filter((i) => i.id !== "couple-walk").map((i) => i.piece), "ghee-drop", ...Object.values(KINDS).flat()])].map(url);

// the sacred fire, and the phera path round it (back point = where the couple stand)
const FIRE = point("havan-kund", "fire");
const CF = byId["couple-final"];
const kund = box(byId["havan-kund"]);
const FIRE_W = kund.w * 0.6;
const DIYAS = ITEMS.filter((i) => i.id.startsWith("diya-"));
const ACT = S.acts;

export function HinduWeddingScene({ scrollerRef, style, reduce, page }: { scrollerRef: RefObject<HTMLDivElement | null>; style: CSSProperties; reduce: boolean; page: string }) {
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
      const items = (prefix: string) => ITEMS.filter((i) => i.id.startsWith(prefix)).map((i) => item(i.id));
      const W = () => stage.clientWidth;
      const H = () => stage.clientHeight;
      const k = () => stage.clientWidth / 390;
      const rnd = gsap.utils.random;
      const px = (p: { x: number; y: number }) => ({ x: (p.x / 100) * W(), y: (p.y / 100) * H() });
      const { spawn, setTicking, count } = createParticles(q(".ms-particle") as HTMLImageElement[], H, url);
      const fire = q(".hw-fire")[0] as HTMLElement;

      const groomA = item("groom-a");
      const groomB = item("groom-b");
      const brideA = item("bride-a");
      const brideB = item("bride-b");
      const gujA = item("gujarati-a");
      const gujB = item("gujarati-b");
      const kerA = item("kerala-a");
      const kerB = item("kerala-b");
      const antar = item("antarpat");
      const final = item("couple-final");
      // hidden until their moment (the timeline below brings each in)
      gsap.set([groomA, groomB, brideA, brideB, gujA, kerA, gujB, kerB, antar, final, item("varmala-1"), item("varmala-2")], { autoAlpha: 0 });
      gsap.set(q(".hw-diya-flame"), { scale: 0, autoAlpha: 0 });

      const sparkBurst = (at: { x: number; y: number }, n: number, spread = 1) => {
        for (let i = 0; i < n; i++)
          spawn(gsap.utils.random(KINDS.sparks), at.x + rnd(-4, 4), at.y, {
            vx: rnd(-40, 40) * k() * spread,
            vy: -rnd(40, 90) * k() * spread,
            g: 60 * k(),
            r: rnd(-30, 30),
            vr: 0,
            sw: 0,
            s: rnd(0.4, 0.75),
            life: rnd(0.6, 1.1),
          });
      };

      /* ── the story (timed, in seconds) ─────────────────────────────── */
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      let t = 0;

      // 1. the mandap builds
      tl.fromTo(item("platform"), { y: () => H() * 0.15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, t);
      tl.fromTo(items("pillar-l").concat(items("pillar-r")), { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.8, ease: "power3.out" }, t + 0.15);
      tl.fromTo(items("pillar-back"), { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.8, ease: "power3.out" }, t + 0.3);
      tl.fromTo(item("canopy"), { y: () => -H() * 0.18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, t + 0.7);
      tl.fromTo([item("swag-narrow"), item("swag-wide")], { y: () => -H() * 0.08, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "back.out(1.6)", stagger: 0.1 }, t + 0.95);
      t += ACT.mandap;

      // 2. pots land one by one (largest first), the kund rises and the fire is lit, the pandit arrives
      const stacks = ["pot-l", "pot-r"].map((p) => items(p));
      stacks[0].forEach((pot, j) =>
        tl.fromTo([pot, stacks[1][j]], { y: () => -H() * 0.25, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32, ease: "back.out(2.4)" }, t + j * 0.12),
      );
      tl.fromTo(item("havan-kund"), { y: () => H() * 0.08, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, t + 0.3);
      tl.fromTo(fire, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.8)" }, t + 0.8);
      tl.fromTo(q(".hw-fire-glow"), { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.7 }, t + 0.8);
      tl.call(() => sparkBurst(px(FIRE), 8), undefined, t + 0.85);
      tl.fromTo(item("pandit"), { x: () => W() * 0.5, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, t + 0.5);
      tl.fromTo([item("kalash"), item("thali")], { y: () => H() * 0.12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", stagger: 0.1 }, t + 0.7);
      tl.fromTo(items("diya-"), { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)", stagger: 0.08 }, t + 0.9);
      tl.fromTo(items("scatter-"), { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.03 }, t + 1.0);
      t += ACT.ritual;

      // 3. the antarpat: the friends hold it up from BEHIND the cloth (as it is really done) — the
      //    Kerala friend's raised hand (image-left) takes the left end of the rod, the Gujarati
      //    friend's (image-right) the right end, so both stand hidden behind the cloth with only
      //    their hands on the rod. Groom and bride walk in either side of it, clear of everyone.
      //    (each figure shows at once as it starts moving — no slow see-through fade)
      const rodL = point("antarpat", "rodL");
      const rodR = point("antarpat", "rodR");
      const holdAt = (id: string, rod: { x: number; y: number }) => {
        const h = point(id, "hand");
        return { x: () => ((rod.x - h.x) / 100) * W(), y: () => ((rod.y - h.y) / 100) * H() };
      };
      const kerHold = holdAt("kerala-a", rodL);
      const gujHold = holdAt("gujarati-a", rodR);
      const slideIn = (el: HTMLElement, at0: { x: () => number; y: () => number }, from: number, at: number) => {
        tl.fromTo(el, { x: () => at0.x() + from * W(), y: at0.y, autoAlpha: 0 }, { x: at0.x, duration: 0.85, ease: "power3.out" }, at);
        tl.to(el, { autoAlpha: 1, duration: 0.12 }, at);
      };
      slideIn(kerA, kerHold, -0.6, t);
      slideIn(gujA, gujHold, 0.6, t);
      // the cloth unrolls down from the rod as they arrive, hiding them behind it
      gsap.set(antar, { transformOrigin: "50% 0%" });
      tl.fromTo(antar, { scaleY: 0, autoAlpha: 0 }, { scaleY: 1, autoAlpha: 1, duration: 0.55, ease: "power2.out" }, t + 0.45);
      const walkIn = (el: HTMLElement, from: number, at: number) => {
        tl.fromTo(el, { x: () => from * W(), autoAlpha: 0 }, { x: 0, duration: 1.1, ease: "power2.out" }, at);
        tl.to(el, { autoAlpha: 1, duration: 0.15 }, at);
        tl.fromTo(el, { y: 0 }, { y: () => -3 * k(), duration: 0.18, ease: "sine.inOut", yoyo: true, repeat: 5 }, at);
      };
      walkIn(groomA, -0.45, t + 0.95);
      walkIn(brideA, 0.45, t + 1.0);
      tl.set([groomB, brideB], { x: 0 }, t + 0.95);
      t += ACT.antarpat;

      // 4. first sight: the friends let go and slip away as the cloth drops; then they come back in
      //    from the sides with their thalis
      tl.to([kerA, gujA], { autoAlpha: 0, duration: 0.18 }, t);
      tl.to(antar, { y: () => H() * 0.35, rotation: 6, autoAlpha: 0, duration: 0.9, ease: "power2.in" }, t + 0.08);
      tl.fromTo(gujB, { x: () => -0.5 * W(), autoAlpha: 0 }, { x: 0, duration: 0.9, ease: "power3.out" }, t + 0.5);
      tl.fromTo(kerB, { x: () => 0.5 * W(), autoAlpha: 0 }, { x: 0, duration: 0.9, ease: "power3.out" }, t + 0.5);
      tl.to([gujB, kerB], { autoAlpha: 1, duration: 0.12 }, t + 0.5);
      tl.fromTo(q(".hw-sight img"), { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.3 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.4 }], stagger: 0.08 }, t + 0.4);
      t += ACT.sight;

      // 5. varmala: they step closer; the garlands fly to each other's necks while they switch pose
      const step = 0.15; // to ~35 % and ~65 %
      tl.to([groomA, groomB], { x: () => step * W(), duration: 0.6, ease: "power2.inOut" }, t);
      tl.to([brideA, brideB], { x: () => -step * W(), duration: 0.6, ease: "power2.inOut" }, t);
      const fly = (id: string, from: { x: number; y: number }, to: { x: number; y: number }, at: number) => {
        const it = byId[id];
        const el = item(id);
        const dx = (p: { x: number }) => ((p.x - it.x) / 100) * W();
        const dy = (p: { y: number }) => ((p.y - it.y) / 100) * H();
        tl.fromTo(el, { x: () => dx(from), y: () => dy(from), autoAlpha: 0, rotation: 0 }, { autoAlpha: 1, duration: 0.12 }, at);
        tl.to(el, { x: () => dx(to), duration: 0.85, ease: "power1.inOut" }, at);
        tl.to(el, { keyframes: [{ y: () => Math.min(dy(from), dy(to)) - H() * 0.08, duration: 0.42, ease: "power2.out" }, { y: () => dy(to), duration: 0.43, ease: "power2.in" }] }, at);
        tl.to(el, { autoAlpha: 0, duration: 0.15 }, at + 0.85);
      };
      const shift = (p: { x: number; y: number }, by: number) => ({ x: p.x + by * 100, y: p.y });
      fly("varmala-1", shift(point("groom-a", "hands"), step), shift(point("bride-b", "neck"), -step), t + 0.6);
      fly("varmala-2", shift(point("bride-a", "hands"), -step), shift(point("groom-b", "neck"), step), t + 0.6);
      // the pose switch hides under the flying garlands
      tl.to([groomA, brideA], { autoAlpha: 0, duration: 0.25 }, t + 0.95);
      tl.to([groomB, brideB], { autoAlpha: 1, duration: 0.25 }, t + 0.95);
      tl.call(() => tossFrom("both", 6), undefined, t + 1.2);
      t += ACT.varmala;

      // 6. together: they step in to stand hand in hand (the pose change hides in the step),
      //    the knot sparkles, and the four diyas light one by one
      tl.to(groomB, { x: () => ((CF.x - 9 - byId["groom-b"].x) / 100) * W(), duration: 0.6, ease: "power2.inOut" }, t);
      tl.to(brideB, { x: () => ((CF.x + 9 - byId["bride-b"].x) / 100) * W(), duration: 0.6, ease: "power2.inOut" }, t);
      tl.to([groomB, brideB], { autoAlpha: 0, duration: 0.22 }, t + 0.38);
      tl.fromTo(final, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22 }, t + 0.38);
      tl.fromTo(q(".hw-knot img"), { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.3 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.4 }], stagger: 0.07 }, t + 0.55);
      DIYAS.forEach((d, i) => {
        const at = t + 0.9 + i * 0.35;
        const flame = q(`[data-id="${d.id}"] .hw-diya-flame`)[0];
        tl.fromTo(flame, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.45, ease: "back.out(2)" }, at);
        tl.call(() => {
          const b = box(d);
          const wick = (manifest.pieces.diya as unknown as { points: { wick: number[] } }).points.wick;
          sparkBurst(px({ x: b.left + b.w * wick[0], y: b.top + b.h * wick[1] }), 4, 0.5);
        }, undefined, at);
      });
      t += ACT.together;

      // 7. blessing: petals shower from the canopy, the fire flares, sparkles round the couple
      tl.fromTo(
        q(".hw-shower img"),
        { y: 0, opacity: 0, rotation: () => rnd(-60, 60) },
        { keyframes: [{ opacity: 1, duration: 0.2 }, { y: () => H() * rnd(0.4, 0.6), rotation: () => rnd(-260, 260), duration: 1.3 }, { opacity: 0, duration: 0.3 }], ease: "sine.inOut", stagger: 0.07 },
        t + 0.2,
      );
      tl.fromTo(fire, { scale: 1 }, { scale: 1.3, duration: 0.3, ease: "power2.out", yoyo: true, repeat: 1 }, t + 0.25);
      tl.call(() => sparkBurst(px(FIRE), 8), undefined, t + 0.3);
      tl.fromTo(q(".hw-bless img"), { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.35 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.45 }], stagger: 0.12 }, t + 0.4);
      t += ACT.blessing;

      /* ── idle ─────────────────────────────────────────────────────────── */
      const { idle, every } = createIdle();
      let idleStarted = false;
      const tossFrom = (who: "gujarati" | "kerala" | "both", n: number) => {
        for (const w of who === "both" ? (["gujarati", "kerala"] as const) : [who]) {
          const at = px(point(`${w}-b`, "thali"));
          const dir = w === "gujarati" ? 1 : -1;
          for (let i = 0; i < n; i++)
            spawn(gsap.utils.random(KINDS.petals), at.x, at.y, { vx: dir * rnd(40, 90) * k(), vy: -rnd(50, 110) * k(), g: 160 * k(), s: rnd(0.45, 0.7), life: rnd(2, 2.8), sw: rnd(3, 7) });
        }
      };
      const startIdle = () => {
        if (idleStarted) return;
        idleStarted = true;
        // the fire: its three shapes cross-fade, it wobbles, its glow pulses; sparks and faint smoke rise
        const fires = q(".hw-fire > img");
        let fi = 0;
        every(0.18, 0.32, () => {
          fi = (fi + 1) % fires.length;
          fires.forEach((f, j) => gsap.to(f, { opacity: j === fi ? 1 : 0, duration: 0.22, overwrite: "auto" }));
        });
        idle.to(fire, { scaleY: () => rnd(0.94, 1.07), skewX: () => rnd(-2.5, 2.5), duration: () => rnd(0.18, 0.32), ease: "sine.inOut", repeat: -1, repeatRefresh: true }, 0);
        idle.to(q(".hw-fire-glow"), { opacity: () => rnd(0.65, 1), scale: () => rnd(0.92, 1.08), duration: () => rnd(0.25, 0.45), ease: "sine.inOut", repeat: -1, repeatRefresh: true }, 0);
        every(0.5, 1, () => sparkBurst(px(FIRE), 1));
        q(".hw-smoke").forEach((s, i) => idle.fromTo(s, { y: 0, opacity: 0, scale: 0.6 }, { keyframes: [{ opacity: 1, duration: 1.2 }, { y: () => -H() * 0.16, scale: 1.6, opacity: 0, duration: 2.4 }], repeat: -1, ease: "sine.out" }, i * 1.2));
        // the pandit's offering: a ghee drop arcs from the ladle into the fire, which flares
        every(S.offering[0], S.offering[1], () => {
          const from = px(point("pandit", "ladle"));
          const to = px(FIRE);
          const T = 0.6;
          const g = 600 * k();
          spawn("ghee-drop", from.x, from.y, { vx: (to.x - from.x) / T, vy: (to.y - from.y) / T - 0.5 * g * T, g, r: 0, vr: 0, sw: 0, s: 0.6, life: T });
          gsap.delayedCall(T, () => {
            gsap.fromTo(fire, { scale: 1 }, { scale: 1.15, duration: 0.25, ease: "power2.out", yoyo: true, repeat: 1 });
            sparkBurst(to, Math.round(rnd(5, 8)));
          });
        }, 2.5);
        // diyas flicker, out of phase
        q(".hw-diya-flame").forEach((f) => idle.to(f, { scaleY: () => rnd(0.85, 1.12), opacity: () => rnd(0.8, 1), duration: () => rnd(0.08, 0.18), repeat: -1, repeatRefresh: true }, rnd(0, 0.3)));
        // swags sway from their ends
        for (const id of ["swag-wide", "swag-narrow"]) idle.fromTo(item(id), { rotation: -1.5 }, { rotation: 1.5, duration: rnd(1.6, 2.1), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 1));
        // everyone breathes (from the feet)
        for (const id of ["couple-final", "gujarati-b", "kerala-b"]) idle.fromTo(item(id), { scaleY: 1 }, { scaleY: 1.006, duration: rnd(1.75, 2.25), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 2));
        // a friend tosses a few petals now and then
        every(S.toss[0], S.toss[1], () => tossFrom(Math.random() < 0.5 ? "gujarati" : "kerala", Math.round(rnd(2, 4))));
        // ambient petals and tuberose (8 at most); sparkles near the couple
        every(1.1, 2, () => {
          if (count("ambient") >= S.maxAmbient) return;
          spawn(gsap.utils.random(KINDS.ambient), rnd(0.06, 0.94) * W(), -0.02 * H(), { tag: "ambient", vy: rnd(15, 24) * k(), vx: rnd(-4, 4), life: 14, s: rnd(0.45, 0.7) });
        });
        const sparks = q(".ms-spark");
        let si = 0;
        every(1.6, 3, () => {
          const sp = sparks[si++ % sparks.length];
          const b = box(CF);
          gsap.set(sp, { left: `${b.left + b.w * rnd(0.15, 0.85)}%`, top: `${b.top + b.h * rnd(0.05, 0.5)}%` });
          gsap.fromTo(sp, { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.45 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.5 }], ease: "sine.inOut" });
        });
        gate.run();
      };

      // particles fly during the story too, not only once it idles
      const gate = gateIdle(stage, idle, (on) => setTicking(on || tl.isActive()), () => idleStarted);
      setTicking(true);
      playOnArrival({
        tl,
        stage,
        scroller,
        T: t,
        seconds: t,
        reverseSpeed: S.reverseSpeed,
        startAt: S.startAt,
        onComplete: startIdle,
        onLeaveBack: () => {
          // going back up: stop the idle (it restarts once the story has played again)
          idle.clear();
          idleStarted = false;
          gate.run();
        },
      });
      return () => gate.dispose();
    },
    { dependencies: [ready, reduce], scope: wrap },
  );

  const diyaPiece = manifest.pieces.diya as unknown as { points: { wick: number[] } };
  const cf = box(CF);
  const canopy = box(byId["canopy"]);
  const knot = point("couple-final", "knot");

  return (
    <div ref={wrap} className="ms-wrap hw-scene" data-page={page} data-reduce={reduce || undefined} style={{ ...style, ...stageVars(SC.ASPECT) }} aria-hidden>
      <div className="ms-stage" data-ready={ready || undefined}>
        {debug && <DebugMaster scene={SC} />}
        {ready && (
          <>
            <SceneItems
              scene={SC}
              exclude={(it) => it.id === "couple-walk"}
              extra={(it) =>
                it.id.startsWith("diya-") ? (
                  <div className="hw-diya-flame" style={{ left: `${diyaPiece.points.wick[0] * 100}%`, top: `${diyaPiece.points.wick[1] * 100 + 2}%` }}>
                    <span className="hw-flame-glow" />
                    <img src={url(KINDS.flames[Number(it.id.slice(5)) % 3])} alt="" />
                  </div>
                ) : null
              }
            />
            {/* the sacred fire on the kund, its glow lighting the couple, faint smoke */}
            <div className="hw-fire-glow" style={{ left: `${FIRE.x}%`, top: `${FIRE.y}%`, width: `${FIRE_W * 2.6}%` }} />
            <div className="hw-fire" style={{ left: `${FIRE.x}%`, top: `${FIRE.y + 1.2}%`, width: `${FIRE_W}%` }}>
              {KINDS.fires.map((n, i) => (
                <img key={n} src={url(n)} alt="" style={{ opacity: i === 0 ? 1 : 0 }} />
              ))}
              {[0, 1, 2].map((i) => (
                <span key={i} className="hw-smoke" style={{ left: `${30 + i * 18}%` }} />
              ))}
            </div>
            {/* sparkles: first sight, the knot, the blessing */}
            <div className="hw-sight" style={{ left: "50%", top: `${cf.top + cf.h * 0.3}%` }}>
              {[0, 1, 2].map((i) => (
                <img key={i} src={url(KINDS.sparkles[i])} alt="" style={{ left: `${[-30, 30, 0][i]}%`, top: `${[0, -20, -60][i]}%` }} />
              ))}
            </div>
            <div className="hw-knot" style={{ left: `${knot.x}%`, top: `${knot.y}%` }}>
              {[0, 1, 2].map((i) => (
                <img key={i} src={url(KINDS.sparkles[i + 1])} alt="" style={{ left: `${[-25, 25, 0][i]}%`, top: `${[0, -10, -40][i]}%` }} />
              ))}
            </div>
            <div className="hw-bless" style={{ left: `${CF.x}%`, top: `${cf.top + cf.h * 0.2}%` }}>
              {[0, 1, 2, 3].map((i) => (
                <img key={i} src={url(KINDS.sparkles[i])} alt="" style={{ left: `${[-60, 55, -30, 30][i]}%`, top: `${[0, 10, -50, -40][i]}%` }} />
              ))}
            </div>
            <div className="hw-shower" style={{ top: `${canopy.top + canopy.h * 0.85}%` }}>
              {Array.from({ length: 10 }, (_, i) => (
                <img key={i} src={url(KINDS.petals[i % KINDS.petals.length])} alt="" style={{ left: `${14 + i * 7.6}%` }} />
              ))}
            </div>
            {[0, 1, 2].map((i) => (
              <img key={`sp${i}`} className="ms-spark" src={url(KINDS.sparkles[i + 1])} alt="" />
            ))}
            <ParticlePool n={30} />
          </>
        )}
      </div>
    </div>
  );
}
