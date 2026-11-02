"use client";
/* eslint-disable @next/next/no-img-element -- pre-sized WebP cut-outs, decoded by hand before they show */

import { useRef, type CSSProperties, type RefObject } from "react";
import { gsap, useGSAP } from "@/src/lib/gsap";
import { timing } from "@/src/config/timing";
import manifest from "@/public/scenes/church-wedding/manifest.json";
import layout from "@/src/config/scenes/church-wedding.json";
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
  zOf,
  type Item,
  type Layout,
  type Manifest,
} from "./engine";

/**
 * The church wedding scene, "The Aisle": the church appears (altar, windows,
 * the flower arch, the bells), the pews fill with guests row by row and the
 * candles are lit, the runner unrolls and the priest rises in behind the
 * altar. The flower girl walks up the aisle scattering petals; then, in a beam
 * of light from the cross, the couple appear at the altar: he ties the minnu
 * (a golden glint at her neck), then slips the ring on her finger (a bright
 * glint, petals from the arch). The bells ring and they walk back down the
 * aisle arm in arm; the flower girl and the ring bearer come in at the front
 * under a shower of petals and gold. Then it idles (bells sway, candles
 * flicker, light through the windows, the flower girl's petals).
 *
 * Walking up or down the aisle is drawn in perspective: a figure's size follows
 * how far up the floor its feet are (full size at the front, ALTAR.scale at the
 * altar). Each pose change happens where both poses stand in the same place at
 * the same size, short, under a glint.
 *
 * Built on the shared scene engine (./engine). Pieces:
 * scripts/scenes/church-wedding.config.mjs; layout:
 * src/config/scenes/church-wedding.json. ?debug=1 shows the master.
 */
const SC = makeScene(manifest as unknown as Manifest, layout as Layout, 0.15);
const { url, box, byId, ITEMS, point } = SC;
const S = timing.sections.church;
const ACT = S.acts;

const KINDS = {
  petals: ["petal-white-1", "petal-white-2", "petal-white-3", "petal-white-4", "petal-pink-1", "petal-pink-2", "petal-pink-3", "petal-pink-4"],
  ambient: ["petal-white-1", "petal-pink-2", "petal-white-3", "petal-pink-4", "gyp-1", "gyp-2", "gyp-3", "leaf-gold-1", "leaf-gold-3"],
  sparkles: ["sparkle-1", "sparkle-2", "sparkle-3", "sparkle-4"],
  flames: ["flame-1", "flame-2", "flame-3"],
};
const RUNTIME = [...new Set([...ITEMS.map((i) => i.piece), ...Object.values(KINDS).flat()])].map(url);

/* ── the aisle in perspective ─────────────────────────────────────────── */
const CW = byId["couple-walk"]; // full size, at the front
const CA = byId["couple-altar-a"]; // at the altar
/** a figure's size where its feet are at y (stage %): 1 at the front, ALTAR_SCALE at the altar */
const YF = CW.y;
const YA = CA.y;
const ALTAR_SCALE = (CA.w / SC.P[CA.piece].aspect) / (CW.w / SC.P[CW.piece].aspect); // (by height)
const sAt = (y: number) => 1 - ((YF - y) / (YF - YA)) * (1 - ALTAR_SCALE);
/** behind the back pews at the altar; once past them, in front of the pews and their bouquets */
const ROW0 = byId["pew-l1"].y;
const zAt = (y: number) => zOf(y < ROW0 ? 3.75 : 6.5);

const NECK = point("couple-altar-a", "neck");
const RING = point("couple-altar-b", "ring");
const CANDLES = ITEMS.filter((i) => i.id.startsWith("candle-"));
const wickOf = (it: Item) => (manifest.pieces[it.piece as "candle-tall"] as unknown as { points: { wick: number[] } }).points.wick;

export function ChurchWeddingScene({ scrollerRef, style, reduce, page }: { scrollerRef: RefObject<HTMLDivElement | null>; style: CSSProperties; reduce: boolean; page: string }) {
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

      const girlBack = item("girl-back");
      const altarA = item("couple-altar-a");
      const altarB = item("couple-altar-b");
      const walk = item("couple-walk");
      const kids = [item("girl-front"), item("ring-boy")];
      const bells = items("bell-");
      const glow = q(".cw-glow")[0];
      const holy = q(".cw-holy")[0];
      // hidden until their moment (the timeline below brings each in)
      gsap.set([girlBack, altarA, altarB, walk, ...kids], { autoAlpha: 0 });
      gsap.set(q(".cw-flame"), { scale: 0, autoAlpha: 0 });
      gsap.set([holy, q(".cw-glint")], { autoAlpha: 0 });

      const twinkle = (targets: Element[], at: number, stagger = 0.08) =>
        tl.fromTo(targets, { scale: 0, opacity: 0, rotation: 0 }, { keyframes: [{ scale: 1, opacity: 1, rotation: 45, duration: 0.3 }, { scale: 0, opacity: 0, rotation: 90, duration: 0.4 }], stagger }, at);
      const ring = (at: number) => {
        bells.forEach((b, i) =>
          tl.to(b, { keyframes: [{ rotation: 16, duration: 0.16 }, { rotation: -12, duration: 0.2 }, { rotation: 8, duration: 0.18 }, { rotation: -4, duration: 0.16 }, { rotation: 0, duration: 0.14 }], ease: "sine.inOut" }, at + i * 0.07),
        );
        twinkle(q(".cw-ring img"), at + 0.1, 0.06);
      };
      /** petals from a basket (a point, % of the stage) */
      const toss = (at: { x: number; y: number }, n: number, dir: number, spread = 1) => {
        const p = px(at);
        for (let i = 0; i < n; i++)
          spawn(gsap.utils.random(KINDS.petals), p.x, p.y, { vx: dir * rnd(25, 70) * k() * spread, vy: -rnd(40, 95) * k() * spread, g: 150 * k(), s: rnd(0.4, 0.62), life: rnd(2, 2.8), sw: rnd(3, 7) });
      };
      /** white and blush petals from along the flower arch */
      const archPetals = (n: number) => {
        const ab = box(byId["arch"]);
        for (let i = 0; i < n; i++)
          spawn(gsap.utils.random(KINDS.petals), ((ab.left + ab.w * rnd(0.08, 0.92)) / 100) * W(), ((ab.top + ab.h * rnd(0.35, 0.7)) / 100) * H(), {
            vy: rnd(12, 30) * k(),
            vx: rnd(-14, 14) * k(),
            g: 35 * k(),
            s: rnd(0.4, 0.6),
            life: rnd(2.6, 3.4),
            sw: rnd(4, 8),
          });
      };
      /** a soft golden glint at a point: a glow swells and fades, with sparkles */
      const glint = (sel: string, at: number, size = 1) => {
        const g = q(`${sel} .cw-glint`)[0];
        tl.fromTo(g, { autoAlpha: 0, scale: 0.3 }, { keyframes: [{ autoAlpha: 1, scale: size, duration: 0.3, ease: "power2.out" }, { autoAlpha: 0, scale: size * 1.3, duration: 0.7, ease: "sine.in" }] }, at);
        twinkle(q(`${sel} img`), at + 0.05, 0.06);
      };

      /**
       * Walk a figure along the floor from one spot to another (feet, stage %), its size
       * following the perspective; `base` = its size in the layout, in front units.
       * Returns where its basket / any point is at that moment.
       */
      const walker = (el: HTMLElement, it: Item, base: number) => {
        const state = { x: it.x, y: it.y, s: 1 };
        let lastZ = -1;
        const place = (xx: number, yy: number, bob: number) => {
          const s = sAt(yy) / base;
          state.x = xx;
          state.y = yy;
          state.s = s;
          const z = zAt(yy);
          gsap.set(el, { x: ((xx - it.x) / 100) * W(), y: ((yy - it.y) / 100) * H() - bob * k() * s, scale: s, ...(z !== lastZ ? { zIndex: z } : {}) });
          lastZ = z;
        };
        const go = (from: { x: number; y: number }, to: { x: number; y: number }, at: number, duration: number, steps: number, ease = "power1.inOut") => {
          const pr = { p: 0 };
          const e = gsap.parseEase(ease);
          tl.fromTo(
            pr,
            { p: 0 },
            {
              p: 1,
              duration,
              ease: "none",
              immediateRender: false,
              onUpdate: () => {
                const t = e(pr.p);
                place(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, Math.abs(Math.sin(pr.p * Math.PI * steps)) * 2.4);
              },
            },
            at,
          );
        };
        /** a point of this figure's piece, where the figure is now */
        const at = (name: string) => {
          const p = point(it.id, name);
          return { x: state.x + (p.x - it.x) * state.s, y: state.y + (p.y - it.y) * state.s };
        };
        return { place, go, at };
      };

      /* ── the story (timed, in seconds) ─────────────────────────────── */
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      let t = 0;

      // 1. the church appears: the hall glows in, windows light up, the altar, the arch blooms, the bells drop in
      tl.fromTo(item("backdrop"), { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 1, ease: "power2.out" }, t);
      tl.fromTo(items("window-"), { opacity: 0, y: () => H() * 0.02 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.12 }, t + 0.2);
      tl.fromTo(q(".cw-beam"), { opacity: 0 }, { opacity: 1, duration: 1.2, stagger: 0.15 }, t + 0.4);
      tl.fromTo([item("altar-back"), item("altar-table")], { opacity: 0, y: () => H() * 0.05 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08 }, t + 0.3);
      tl.fromTo(items("stand-"), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.8)", stagger: 0.1 }, t + 0.55);
      tl.fromTo(CANDLES.map((c) => item(c.id)), { opacity: 0, y: () => H() * 0.03 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06 }, t + 0.6);
      tl.fromTo(item("arch"), { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.4)" }, t + 0.7);
      tl.fromTo(bells, { opacity: 0, y: () => -H() * 0.04, rotation: -18 }, { opacity: 1, y: 0, rotation: 0, duration: 0.7, ease: "back.out(2)", stagger: 0.08 }, t + 0.95);
      t += ACT.church;

      // 2. the pews fill, row by row from the back (each with its guests and bouquet); the candles light
      const NROWS = ITEMS.filter((i) => /^pew-l\d$/.test(i.id)).length;
      for (let i = 0; i < NROWS; i++) {
        const r = i + 1;
        tl.fromTo(item(`pew-l${r}`), { opacity: 0, x: () => -W() * 0.2 }, { opacity: 1, x: 0, duration: 0.55, ease: "power3.out" }, t + i * 0.13);
        tl.fromTo(item(`pew-r${r}`), { opacity: 0, x: () => W() * 0.2 }, { opacity: 1, x: 0, duration: 0.55, ease: "power3.out" }, t + i * 0.13);
        tl.fromTo([item(`bouquet-l${r}`), item(`bouquet-r${r}`)], { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.2)" }, t + 0.35 + i * 0.13);
      }
      CANDLES.forEach((c, i) => {
        const flame = q(`[data-id="${c.id}"] .cw-flame`)[0];
        tl.fromTo(flame, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.4, ease: "back.out(2)" }, t + 0.7 + i * 0.12);
      });
      t += ACT.aisle;

      // 3. the runner unrolls down the aisle; the priest rises in behind the altar table
      gsap.set(item("runner"), { transformOrigin: "50% 0%" });
      tl.fromTo(item("runner"), { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.8, ease: "power2.inOut" }, t);
      tl.fromTo(items("scatter-"), { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.03 }, t + 0.6);
      tl.fromTo(item("priest"), { opacity: 0, y: () => H() * 0.03 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, t + 0.25);
      t += ACT.runner;

      // 4. the flower girl walks up the aisle (smaller and smaller), leaving petals on the runner,
      //    and fades out near the altar steps
      const gfBase = sAt(byId["girl-front"].y); // the children's layout size is their size at the front
      const girl = walker(girlBack, byId["girl-back"], gfBase);
      const girlFrom = { x: 50, y: 97 };
      const girlTo = { x: 49, y: YA + 5 };
      tl.fromTo(girlBack, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, t);
      girl.go(girlFrom, girlTo, t, ACT.girl - 0.1, 8);
      for (let i = 0; i < 6; i++) tl.call(() => toss(girl.at("basket"), 2, -1, 0.6), undefined, t + 0.2 + i * 0.28);
      tl.to(girlBack, { autoAlpha: 0, duration: 0.4 }, t + ACT.girl - 0.45);
      t += ACT.girl;

      // 5. the couple appear: a soft beam of light falls from the cross onto the altar steps, and in
      //    it they rise gently into place; the beam softens
      tl.fromTo(holy, { autoAlpha: 0, scaleY: 0.4 }, { keyframes: [{ autoAlpha: 1, scaleY: 1, duration: 0.45, ease: "power2.out" }, { autoAlpha: 0.35, duration: 0.7, ease: "sine.inOut" }] }, t);
      tl.fromTo(glow, { opacity: 0, scale: 0.6 }, { opacity: 0.8, scale: 1, duration: 0.6, ease: "sine.out" }, t + 0.1);
      tl.fromTo(altarA, { autoAlpha: 0, y: () => 12 * k() }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" }, t + 0.25);
      t += ACT.couple;

      // 6. the minnu: a golden glint and sparkles at her neck, a soft glow
      glint(".cw-minnu", t + 0.15, 1);
      t += ACT.minnu;

      // 7. the rings: the ring pose (short cross-fade, under the glint); a bright glint and a little
      //    ring of sparkles on her finger; petals from the flower arch
      tl.to(altarA, { autoAlpha: 0, duration: 0.25, ease: "sine.inOut" }, t + 0.1);
      tl.fromTo(altarB, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: "sine.inOut" }, t + 0.1);
      glint(".cw-ringpt", t + 0.3, 1.2);
      tl.fromTo(q(".cw-ringpt .cw-sparkring i"), { scale: 0, opacity: 0 }, { keyframes: [{ scale: 1, opacity: 1, duration: 0.25 }, { scale: 1.6, opacity: 0, duration: 0.45 }], stagger: 0.03 }, t + 0.35);
      tl.call(() => archPetals(14), undefined, t + 0.6);
      t += ACT.rings;

      // 8. the bells ring; at the altar they turn to us (a short cross-fade into the walking pose,
      //    under a twinkle) and walk back down the aisle arm in arm, growing nearer
      ring(t);
      const couple = walker(walk, CW, 1);
      const cwAltar = { x: CA.x, y: YA };
      couple.go(cwAltar, cwAltar, t + 0.3, 0.01, 0); // (placed at the altar before it shows)
      tl.to(altarB, { autoAlpha: 0, duration: 0.3, ease: "sine.inOut" }, t + 0.35);
      tl.to(walk, { autoAlpha: 1, duration: 0.3, ease: "sine.inOut" }, t + 0.35);
      tl.to(holy, { autoAlpha: 0, duration: 0.6 }, t + 0.35);
      twinkle(q(".cw-vow img"), t + 0.35);
      couple.go(cwAltar, { x: CW.x, y: CW.y }, t + 0.6, ACT.recessional - 0.6, 9, "power1.inOut");
      t += ACT.recessional;

      // 9. the finale: the flower girl skips in from the left, the ring bearer walks in from the
      //    right; petals shower from the arch and her basket, gold confetti and sparkles over the couple
      tl.fromTo(kids[0], { x: () => -W() * 0.3, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out" }, t);
      tl.fromTo(kids[0], { y: 0 }, { y: () => -5 * k(), duration: 0.13, ease: "sine.out", yoyo: true, repeat: 5 }, t);
      tl.fromTo(kids[1], { x: () => W() * 0.3, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, t + 0.1);
      tl.fromTo(kids[1], { y: 0 }, { y: () => -2.5 * k(), duration: 0.16, ease: "sine.inOut", yoyo: true, repeat: 5 }, t + 0.1);
      tl.fromTo(
        q(".cw-shower img"),
        { y: 0, opacity: 0, rotation: () => rnd(-60, 60) },
        { keyframes: [{ opacity: 1, duration: 0.2 }, { y: () => H() * rnd(0.45, 0.65), rotation: () => rnd(-260, 260), duration: 1.4 }, { opacity: 0, duration: 0.3 }], ease: "sine.inOut", stagger: 0.07 },
        t + 0.1,
      );
      tl.call(() => {
        toss(point("girl-front", "basket"), 5, 1, 0.8);
        const b = box(CW);
        for (let i = 0; i < 8; i++)
          spawn(gsap.utils.random(["leaf-gold-1", "leaf-gold-2", "leaf-gold-3", "leaf-gold-4"]), ((b.left + b.w * rnd(0.1, 0.9)) / 100) * W(), ((b.top - 2) / 100) * H(), { vy: rnd(20, 40) * k(), vx: rnd(-10, 10) * k(), g: 30 * k(), s: rnd(0.35, 0.55), life: rnd(2.2, 3), sw: rnd(4, 8) });
      }, undefined, t + 0.6);
      twinkle(q(".cw-bless img"), t + 0.4, 0.12);
      t += ACT.finale;

      /* ── idle ─────────────────────────────────────────────────────────── */
      const { idle, every } = createIdle();
      let idleStarted = false;
      const startIdle = () => {
        if (idleStarted) return;
        idleStarted = true;
        // the bells sway a little, now and then one rings
        bells.forEach((b, i) => idle.fromTo(b, { rotation: -2.5 }, { rotation: 2.5, duration: rnd(1.6, 2.1), ease: "sine.inOut", yoyo: true, repeat: -1 }, i * 0.3));
        // candles flicker, out of phase
        q(".cw-flame").forEach((f) => idle.to(f, { scaleY: () => rnd(0.86, 1.1), opacity: () => rnd(0.82, 1), duration: () => rnd(0.08, 0.18), repeat: -1, repeatRefresh: true }, rnd(0, 0.3)));
        // light through the windows breathes; the altar glow too
        q(".cw-beam").forEach((b, i) => idle.fromTo(b, { opacity: 1 }, { opacity: 0.55, duration: rnd(2.6, 3.4), ease: "sine.inOut", yoyo: true, repeat: -1 }, i * 1.3));
        idle.fromTo(glow, { opacity: 0.55 }, { opacity: 0.85, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 }, 0);
        // everyone breathes (from the feet)
        for (const el of [walk, ...kids, item("priest")]) idle.fromTo(el, { scaleY: 1 }, { scaleY: 1.006, duration: rnd(1.75, 2.25), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 2));
        // the flower girl tosses a few petals now and then; petals drift gently from the arch
        every(S.toss[0], S.toss[1], () => toss(point("girl-front", "basket"), Math.round(rnd(2, 4)), 1, 0.8));
        every(2.5, 4, () => archPetals(1));
        // ambient petals, baby's breath and gold leaves drifting down (8 at most); sparkles near the couple
        every(1.1, 2, () => {
          if (count("ambient") >= S.maxAmbient) return;
          spawn(gsap.utils.random(KINDS.ambient), rnd(0.06, 0.94) * W(), -0.02 * H(), { tag: "ambient", vy: rnd(15, 24) * k(), vx: rnd(-4, 4), life: 14, s: rnd(0.45, 0.7) });
        });
        const sparks = q(".ms-spark");
        let si = 0;
        every(1.6, 3, () => {
          const sp = sparks[si++ % sparks.length];
          const b = box(CW);
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

  const cw = box(CW);
  const arch = box(byId["arch"]);
  const ca = box(CA);
  const bellsBox = box(byId["bell-2"]);
  const bellRow = box(byId["bell-2"]);
  const wl = box(byId["window-l"]);
  const wr = box(byId["window-r"]);

  return (
    <div ref={wrap} className="ms-wrap cw-scene" data-page={page} data-reduce={reduce || undefined} style={{ ...style, ...stageVars(SC.ASPECT) }} aria-hidden>
      <div className="ms-stage" data-ready={ready || undefined}>
        {debug && <DebugMaster scene={SC} />}
        {ready && (
          <>
            <SceneItems
              scene={SC}
              extra={(it) =>
                it.id.startsWith("candle-") ? (
                  <div className="cw-flame" style={{ left: `${wickOf(it)[0] * 100}%`, top: `${wickOf(it)[1] * 100}%` }}>
                    <span className="cw-flame-glow" />
                    <img src={url(KINDS.flames[CANDLES.indexOf(it) % 3])} alt="" />
                  </div>
                ) : null
              }
            />
            {/* soft light falling from the windows, and the altar's glow */}
            <div className="cw-beam" style={{ left: `${wl.left + wl.w * 0.5}%`, top: `${wl.top + wl.h * 0.15}%` }} />
            <div className="cw-beam cw-beam-r" style={{ left: `${wr.left + wr.w * 0.5}%`, top: `${wr.top + wr.h * 0.15}%` }} />
            <div className="cw-glow" style={{ left: `${CA.x}%`, top: `${ca.top + ca.h * 0.55}%` }} />
            {/* the beam of light from the cross onto the altar steps (where the couple appear) */}
            <div className="cw-holy" style={{ left: `${CA.x}%`, top: `${bellsBox.top}%`, height: `${YA - bellsBox.top + 1}%`, width: `${ca.w * 1.15}%` }} />
            {/* the minnu (at her neck) and the ring (on her finger): a glow and sparkles; a little ring of sparkles */}
            <div className="cw-point cw-minnu" style={{ left: `${NECK.x}%`, top: `${NECK.y}%` }}>
              <span className="cw-glint" />
              {[0, 1, 2, 3].map((i) => (
                <img key={i} src={url(KINDS.sparkles[i])} alt="" style={{ left: `${[-70, 75, -10, 30][i]}%`, top: `${[-30, -50, -110, 80][i]}%` }} />
              ))}
            </div>
            <div className="cw-point cw-ringpt" style={{ left: `${RING.x}%`, top: `${RING.y}%` }}>
              <span className="cw-glint" />
              <span className="cw-sparkring">
                {Array.from({ length: 8 }, (_, i) => (
                  <i key={i} style={{ left: `${50 + 75 * Math.cos((i * Math.PI) / 4)}%`, top: `${50 + 75 * Math.sin((i * Math.PI) / 4)}%` }} />
                ))}
              </span>
              {[0, 1, 2].map((i) => (
                <img key={i} src={url(KINDS.sparkles[i + 1])} alt="" style={{ left: `${[-80, 70, -5][i]}%`, top: `${[-40, -60, 75][i]}%` }} />
              ))}
            </div>
            {/* sparkles: the bells, the vows, the blessing */}
            <div className="cw-ring" style={{ left: "50%", top: `${bellRow.top + bellRow.h}%` }}>
              {[0, 1, 2].map((i) => (
                <img key={i} src={url(KINDS.sparkles[i])} alt="" style={{ left: `${[-40, 40, 0][i]}%`, top: `${[0, -10, 40][i]}%` }} />
              ))}
            </div>
            <div className="cw-vow" style={{ left: `${CA.x}%`, top: `${ca.top + ca.h * 0.3}%` }}>
              {[0, 1, 2].map((i) => (
                <img key={i} src={url(KINDS.sparkles[i + 1])} alt="" style={{ left: `${[-30, 30, 0][i]}%`, top: `${[0, -20, -60][i]}%` }} />
              ))}
            </div>
            <div className="cw-bless" style={{ left: `${CW.x}%`, top: `${cw.top + cw.h * 0.2}%` }}>
              {[0, 1, 2, 3].map((i) => (
                <img key={i} src={url(KINDS.sparkles[i])} alt="" style={{ left: `${[-60, 55, -30, 30][i]}%`, top: `${[0, 10, -50, -40][i]}%` }} />
              ))}
            </div>
            <div className="cw-shower" style={{ top: `${arch.top + arch.h * 0.3}%` }}>
              {Array.from({ length: 10 }, (_, i) => (
                <img key={i} src={url(KINDS.petals[i % KINDS.petals.length])} alt="" style={{ left: `${22 + i * 6}%` }} />
              ))}
            </div>
            {[0, 1, 2].map((i) => (
              <img key={`sp${i}`} className="ms-spark" src={url(KINDS.sparkles[i + 1])} alt="" />
            ))}
            <ParticlePool n={34} />
          </>
        )}
      </div>
    </div>
  );
}
