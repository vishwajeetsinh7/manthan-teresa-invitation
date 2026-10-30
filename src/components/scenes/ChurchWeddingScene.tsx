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
 * The church wedding scene, "The Aisle": the church builds (altar, flower arch,
 * bells, windows), the runner rolls down the aisle between the pews and the
 * candles are lit; the groom waits at the altar while the flower girl and then
 * the bride on her father's arm walk up the aisle. At the altar the groom lays
 * the manthrakodi over her shoulders, the bells ring, and they walk back down
 * the aisle together between the bridesmaids under a shower of petals. Then it
 * idles (bells sway, candles flicker, light through the windows, petals).
 *
 * Walking up or down the aisle is drawn in perspective: a figure's size follows
 * how far up the floor its feet are (full size at the front, ~0.42 at the altar).
 * Every pose change happens where both poses stand in the same place at the
 * same size, under a glow, the cloth or a sparkle.
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
const VEIL = byId["couple-veil"]; // at the altar
/** a figure's size where its feet are at y (stage %): 1 at the front, ALT at the altar */
const YF = CW.y;
const YA = VEIL.y;
const ALTAR_SCALE = 0.42;
const sAt = (y: number) => 1 - ((YF - y) / (YF - YA)) * (1 - ALTAR_SCALE);
/** the pew rows' front edges: a walker passing one is drawn in front of it */
const ROWS = ["pew-l1", "pew-l2", "pew-l3"].map((id) => byId[id].y);
const zAt = (y: number) => zOf(y < ROWS[0] ? 3.95 : y < ROWS[1] ? 4.6 : y < ROWS[2] ? 5.6 : 6.5);

const KODI_TO = point("couple-veil", "bride");
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

      const groom = item("groom");
      const brideFather = item("bride-father");
      const girlBack = item("girl-back");
      const veil = item("couple-veil");
      const kodiPose = item("couple-kodi");
      const kodi = item("kodi");
      const walk = item("couple-walk");
      const maids = [item("bridesmaid-pink"), item("bridesmaid-kerala")];
      const kids = [item("girl-front"), item("ring-boy")];
      const bells = items("bell-");
      const glow = q(".cw-glow")[0];
      // hidden until their moment (the timeline below brings each in)
      gsap.set([groom, brideFather, girlBack, veil, kodiPose, kodi, walk, ...maids, ...kids], { autoAlpha: 0 });
      gsap.set(q(".cw-flame"), { scale: 0, autoAlpha: 0 });

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
          return { x: state.x + (p.x - it.x) * state.s, y: state.y + ((p.y - it.y) * state.s) };
        };
        return { place, go, at };
      };

      /* ── the story (timed, in seconds) ─────────────────────────────── */
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      let t = 0;

      // 1. the church builds: the hall glows in, windows, altar, flower stands, the arch, the bells, the priest
      tl.fromTo(item("backdrop"), { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 1, ease: "power2.out" }, t);
      tl.fromTo(items("window-"), { opacity: 0, y: () => H() * 0.02 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.12 }, t + 0.2);
      tl.fromTo(q(".cw-beam"), { opacity: 0 }, { opacity: 1, duration: 1.2, stagger: 0.15 }, t + 0.4);
      tl.fromTo([item("altar-back"), item("altar-table")], { opacity: 0, y: () => H() * 0.05 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08 }, t + 0.3);
      tl.fromTo(items("stand-"), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.8)", stagger: 0.1 }, t + 0.55);
      tl.fromTo(CANDLES.map((c) => item(c.id)), { opacity: 0, y: () => H() * 0.03 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06 }, t + 0.6);
      tl.fromTo(item("arch"), { opacity: 0, y: () => -H() * 0.08 }, { opacity: 1, y: 0, duration: 0.7, ease: "back.out(1.4)" }, t + 0.7);
      tl.fromTo(bells, { opacity: 0, y: () => -H() * 0.04, rotation: -18 }, { opacity: 1, y: 0, rotation: 0, duration: 0.7, ease: "back.out(2)", stagger: 0.08 }, t + 0.95);
      tl.fromTo(item("priest"), { opacity: 0, y: () => H() * 0.04 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, t + 1.0);
      t += ACT.church;

      // 2. the aisle: the runner rolls down towards us, the pews slide in (back rows first), each
      //    with its bouquet; the candles are lit one by one
      gsap.set(item("runner"), { transformOrigin: "50% 0%" });
      tl.fromTo(item("runner"), { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.9, ease: "power2.inOut" }, t);
      tl.fromTo(items("scatter-"), { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.03 }, t + 0.7);
      [1, 2, 3].forEach((r, i) => {
        tl.fromTo(item(`pew-l${r}`), { opacity: 0, x: () => -W() * 0.22 }, { opacity: 1, x: 0, duration: 0.6, ease: "power3.out" }, t + 0.15 + i * 0.16);
        tl.fromTo(item(`pew-r${r}`), { opacity: 0, x: () => W() * 0.22 }, { opacity: 1, x: 0, duration: 0.6, ease: "power3.out" }, t + 0.15 + i * 0.16);
        tl.fromTo([item(`bouquet-l${r}`), item(`bouquet-r${r}`)], { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2.2)" }, t + 0.55 + i * 0.16);
      });
      CANDLES.forEach((c, i) => {
        const flame = q(`[data-id="${c.id}"] .cw-flame`)[0];
        tl.fromTo(flame, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.4, ease: "back.out(2)" }, t + 0.8 + i * 0.12);
      });
      t += ACT.aisle;

      // 3. the groom comes to the altar and waits, looking down the aisle
      tl.fromTo(groom, { x: () => -W() * 0.16, autoAlpha: 0 }, { x: 0, duration: 0.9, ease: "power2.out" }, t);
      tl.to(groom, { autoAlpha: 1, duration: 0.2 }, t);
      tl.fromTo(groom, { y: 0 }, { y: () => -1.5 * k(), duration: 0.15, ease: "sine.inOut", yoyo: true, repeat: 5 }, t);
      t += ACT.groom;

      // 4. the procession: the flower girl first, scattering petals, then the bride on her
      //    father's arm, both walking away from us up the aisle (smaller and smaller)
      const gfBase = sAt(byId["girl-front"].y); // the children's layout size is their size at the front
      const girl = walker(girlBack, byId["girl-back"], gfBase);
      const girlFrom = { x: 50, y: 97 };
      const girlTo = { x: 47, y: 63 };
      tl.fromTo(girlBack, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, t);
      girl.go(girlFrom, girlTo, t, 2.3, 9);
      for (let i = 0; i < 7; i++) tl.call(() => toss(girl.at("basket"), 2, -1, 0.7), undefined, t + 0.2 + i * 0.3);
      // she steps aside to her seat at the front and is gone
      tl.to(girlBack, { autoAlpha: 0, duration: 0.4 }, t + 2.3);

      const BF = byId["bride-father"];
      const bride = walker(brideFather, BF, 1);
      const bfBride = point("bride-father", "bride");
      // ends with the bride exactly where she stands in the vows pose
      const bfTo = { x: KODI_TO.x - (bfBride.x - BF.x) * ALTAR_SCALE, y: YA };
      const bfFrom = { x: bfTo.x - 1.5, y: 93 };
      tl.fromTo(brideFather, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }, t + 0.7);
      bride.go(bfFrom, bfTo, t + 0.7, 2.6, 8);
      t += ACT.procession;

      // 5. the vows: at the altar they turn to each other in a warm glow, the bells ring; the
      //    groom lays the manthrakodi over her shoulders and it falls into its drape
      tl.fromTo(glow, { opacity: 0, scale: 0.6 }, { keyframes: [{ opacity: 1, scale: 1, duration: 0.5 }, { opacity: 0.55, duration: 1.4 }], ease: "sine.inOut" }, t);
      tl.to([groom, brideFather], { autoAlpha: 0, duration: 0.5, ease: "sine.inOut" }, t + 0.15);
      tl.fromTo(veil, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "sine.inOut" }, t + 0.15);
      ring(t + 0.3);
      // the cloth floats down onto her shoulders
      const kd = byId["kodi"];
      const kdx = () => ((KODI_TO.x - kd.x) / 100) * W();
      const kdy = () => ((KODI_TO.y - kd.y) / 100) * H();
      gsap.set(kodi, { transformOrigin: "50% 0%" });
      tl.fromTo(kodi, { x: kdx, y: () => kdy() - H() * 0.09, scaleY: 0.3, scaleX: 0.85, rotation: -8, autoAlpha: 0 }, { y: kdy, scaleY: 1, scaleX: 1, rotation: 0, duration: 0.9, ease: "power2.out" }, t + 0.9);
      tl.to(kodi, { autoAlpha: 1, duration: 0.25 }, t + 0.9);
      // … and unfurls into its drape as she is seen wearing it
      tl.to(kodi, { scaleY: 1.9, autoAlpha: 0, duration: 0.5, ease: "power1.in" }, t + 1.75);
      tl.to(veil, { autoAlpha: 0, duration: 0.45, ease: "sine.inOut" }, t + 1.8);
      tl.fromTo(kodiPose, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: "sine.inOut" }, t + 1.75);
      twinkle(q(".cw-vow img"), t + 1.95);
      ring(t + 2.0);
      t += ACT.vows;

      // 6. the recessional: they turn to us and walk down the aisle arm in arm, growing nearer,
      //    between the bridesmaids (arms raised, tossing petals); the children wait at the front
      const couple = walker(walk, CW, 1);
      const cwAltar = { x: byId["couple-kodi"].x, y: YA };
      couple.go(cwAltar, cwAltar, t, 0.01, 0); // (placed at the altar before it shows)
      tl.to(kodiPose, { autoAlpha: 0, duration: 0.35, ease: "sine.inOut" }, t + 0.05);
      tl.to(walk, { autoAlpha: 1, duration: 0.35, ease: "sine.inOut" }, t + 0.05);
      twinkle(q(".cw-vow img"), t + 0.05);
      couple.go(cwAltar, { x: CW.x, y: CW.y }, t + 0.35, 2.6, 9, "power1.inOut");
      tl.fromTo(maids[0], { x: () => -W() * 0.3, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, t + 0.2);
      tl.fromTo(maids[1], { x: () => W() * 0.3, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, t + 0.25);
      for (const at of [1.1, 1.7, 2.3])
        tl.call(() => {
          toss(point("bridesmaid-pink", "basket"), 3, 1);
          toss(point("bridesmaid-kerala", "basket"), 3, -1);
        }, undefined, t + at);
      tl.fromTo(kids[0], { x: () => -W() * 0.25, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out" }, t + 1.7);
      tl.fromTo(kids[1], { x: () => W() * 0.25, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out" }, t + 1.9);
      t += ACT.recessional;

      // 7. blessing: petals shower from the arch, the bells ring, sparkles round the couple
      tl.fromTo(
        q(".cw-shower img"),
        { y: 0, opacity: 0, rotation: () => rnd(-60, 60) },
        { keyframes: [{ opacity: 1, duration: 0.2 }, { y: () => H() * rnd(0.45, 0.65), rotation: () => rnd(-260, 260), duration: 1.4 }, { opacity: 0, duration: 0.3 }], ease: "sine.inOut", stagger: 0.07 },
        t + 0.1,
      );
      ring(t + 0.15);
      twinkle(q(".cw-bless img"), t + 0.4, 0.12);
      t += ACT.blessing;

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
        for (const el of [walk, ...maids, ...kids, item("priest")]) idle.fromTo(el, { scaleY: 1 }, { scaleY: 1.006, duration: rnd(1.75, 2.25), ease: "sine.inOut", yoyo: true, repeat: -1 }, rnd(0, 2));
        // a bridesmaid tosses a few petals now and then
        every(S.toss[0], S.toss[1], () => (Math.random() < 0.5 ? toss(point("bridesmaid-pink", "basket"), Math.round(rnd(2, 4)), 1) : toss(point("bridesmaid-kerala", "basket"), Math.round(rnd(2, 4)), -1)));
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
  const altar = box(byId["altar-back"]);
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
            <div className="cw-glow" style={{ left: `${KODI_TO.x - 3}%`, top: `${altar.top + altar.h * 0.85}%` }} />
            {/* sparkles: the bells, the vows, the blessing */}
            <div className="cw-ring" style={{ left: "50%", top: `${bellRow.top + bellRow.h}%` }}>
              {[0, 1, 2].map((i) => (
                <img key={i} src={url(KINDS.sparkles[i])} alt="" style={{ left: `${[-40, 40, 0][i]}%`, top: `${[0, -10, 40][i]}%` }} />
              ))}
            </div>
            <div className="cw-vow" style={{ left: `${KODI_TO.x - 3}%`, top: `${KODI_TO.y}%` }}>
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
