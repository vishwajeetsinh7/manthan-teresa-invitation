"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/src/lib/gsap";
import { invitation as C } from "@/src/content/invitation";
import { timing } from "@/src/config/timing";
import { assets } from "@/src/config/assets";
import { AssetImage } from "./AssetImage";
import { Divider, ScheduleThread, buildThread } from "./art/LineArt";
import { FlowerOpenPlaceholder } from "./art/Placeholders";
import { EVENT_ICONS, HENNA_CONE, LotusDivider, MEHNDI_MANDALA, SvgArt, type EventIconName } from "./art/svgArt";
import { moods, defaultThemeColor, type MoodName } from "@/src/config/moods";
import { SOFT_BLUR } from "@/src/lib/device";
import mehndiSprite from "@/public/mehndi/mehndi-sprite.json";

function Countdown() {
  const target = new Date(C.countdownTo).getTime();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (left === 0) return <p className="section-title">{C.countdown.done}</p>;

  const s = left == null ? null : Math.floor(left / 1000);
  const cells: [string, number | null][] = [
    [C.countdown.labels.days, s == null ? null : Math.floor(s / 86400)],
    [C.countdown.labels.hours, s == null ? null : Math.floor((s % 86400) / 3600)],
    [C.countdown.labels.minutes, s == null ? null : Math.floor((s % 3600) / 60)],
    [C.countdown.labels.seconds, s == null ? null : s % 60],
  ];
  return (
    <div className="countdown" role="timer" aria-live="off">
      {cells.map(([label, v]) => (
        <div key={label} className="count-cell">
          <div className="count-num">{v == null ? "–" : String(v).padStart(2, "0")}</div>
          <div className="count-label">{label}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Colour the phone's browser bars (status bar / Safari toolbar).
 * - theme-color meta: Android Chrome and iOS Safari up to 18
 * - --chrome (body + full-screen fixed .stage background): iOS 26 Safari,
 *   which ignores theme-color and samples those backgrounds instead
 */
function setBrowserChrome(color: string) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = color;
  document.documentElement.style.setProperty("--chrome", color);
}

type EventFlower = { kind: number; tint?: string };
const SCHEDULE = C.events;
/** the vine: one node per event, spaced a few vine-waves apart (about a screen) */
const THREAD = buildThread(SCHEDULE.length, timing.sections.wavesPerGap);
/** node positions as a share of the vine height */
const NODE = THREAD.nodes.map((n) => n / THREAD.height);

/**
 * One rose that travels down the vine to whichever event is in focus,
 * rolling as it goes and turning into that event's flower on arrival.
 * It holds one stacked layer per event; only the focused one is visible.
 */
function TravellingRose() {
  return (
    <div className="t-traveler" aria-hidden>
      <div className="t-traveler-pop">
        {SCHEDULE.map((e, i) => {
          const f = ("flower" in e ? e.flower : { kind: i % 4 }) as EventFlower;
          return (
            <div key={i} className="t-flower" data-tint={f.tint}>
              <AssetImage src={assets.flowers[f.kind]} alt="" sizes="80px" fallback={<FlowerOpenPlaceholder kind={f.kind} />} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The Mehndi ceremony: a friend applying henna to the bride, a 12-frame
 * sprite (built by scripts/build-mehndi-sprite.mjs). Frames are stepped by a
 * CSS animation that only runs while Mehndi is in focus (.is-focus), so it
 * costs nothing the rest of the time.
 */
function MehndiScene() {
  const m = mehndiSprite;
  return (
    <div
      className="t-scene"
      aria-hidden
      style={{ aspectRatio: `${m.frameWidth} / ${m.frameHeight}`, "--n": m.frameCount, "--loop": `${m.frameCount / m.fps}s` } as CSSProperties}
    >
      <div className="t-scene-clip">
        {/* eslint-disable-next-line @next/next/no-img-element -- a sprite strip, stepped by transform */}
        <img className="t-scene-strip" src="/mehndi/mehndi-sprite.webp" alt="" draggable={false} decoding="async" fetchPriority="low" />
      </div>
    </div>
  );
}

/**
 * Every event's date, in one format: the day sits in a gold medallion and
 * rolls up like a calendar reel; weekday and month are tracked in beside it.
 * Without JS (or with reduced motion) the reels already show the right day.
 */
function EventDate({ day, weekday, month }: { day: string; weekday: string; month: string }) {
  const digits = day.padStart(2, "0").split("").map(Number);
  return (
    <p className="t-when">
      <span className="sr-only">
        {weekday}, {day} {month} {C.dates.year}
      </span>
      <span className="t-medal" aria-hidden>
        <svg className="t-ring" viewBox="0 0 44 44">
          <circle className="t-ring-line" cx="22" cy="22" r="20.5" transform="rotate(-90 22 22)" />
          <circle className="t-ring-dots" cx="22" cy="22" r="17.2" />
          <g className="t-gem-orbit">
            <path className="t-gem" d="M22 -0.6 L24.1 1.5 L22 3.6 L19.9 1.5 Z" />
          </g>
        </svg>
        <span className="t-day">
          {digits.map((d, k) => {
            // tens: 0…d ; ones: a full turn 0…9 then 0…d, so it spins before landing
            const list = k === 0 ? Array.from({ length: d + 1 }, (_, n) => n) : [...Array(10).keys(), ...Array.from({ length: d + 1 }, (_, n) => n)];
            const to = list.length - 1;
            return (
              <span key={k} className="t-reel-mask">
                <span className="t-reel" data-to={to} style={{ transform: `translateY(${(-to / list.length) * 100}%)` }}>
                  {list.map((n, j) => (
                    <span key={j}>{n}</span>
                  ))}
                </span>
              </span>
            );
          })}
        </span>
      </span>
      <span className="t-when-txt" aria-hidden>
        <span className="t-wk">{weekday}</span>
        <span className="t-mon">
          {month} {C.dates.year}
        </span>
      </span>
    </p>
  );
}

export function Sections({ scrollerRef, enabled }: { scrollerRef: RefObject<HTMLDivElement | null>; enabled: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  // leaving (e.g. replay intro) always restores the normal top-bar colour
  useEffect(() => () => setBrowserChrome(defaultThemeColor), []);

  useGSAP(
    () => {
      if (!enabled || !scrollerRef.current) return;
      const scroller = scrollerRef.current;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const q = gsap.utils.selector(root);
      const D = timing.sections;
      const rnd = gsap.utils.random;
      const unit = Math.min(root.current!.clientWidth, 430) / 390;
      const events = q(".t-event") as HTMLElement[];
      const cleanups: (() => void)[] = [];

      /* ── Intros ────────────────────────────────────────────────────────
         Each event introduces itself once: the date medallion draws and its
         day rolls up, the title is handwritten, the gold icon draws itself,
         then the details fade up. Mehndi's intro follows the "Celebrations"
         heading, which is written when the corner flowers burst.          */
      const intros: (gsap.core.Timeline | undefined)[] = [];
      const waiting: (() => void)[][] = events.map(() => []);
      /** run fn once event i has finished introducing itself */
      const afterIntro = (i: number, fn: () => void) => {
        const tl = intros[i];
        if (!tl || tl.progress() === 1) fn();
        else waiting[i].push(fn);
      };

      if (!reduce) {
        events.forEach((ev, i) => {
          const title = ev.querySelector(".t-title .wipe");
          const lines = ev.querySelectorAll(".t-line");
          const strokes = ev.querySelectorAll(".event-icon .draw");
          const dots = ev.querySelectorAll(".event-icon .dot");
          const ring = ev.querySelector(".t-ring-line");
          const ringDots = ev.querySelector(".t-ring-dots");
          const gem = ev.querySelector(".t-gem");
          const reels = ev.querySelectorAll<HTMLElement>(".t-reel");
          const words = ev.querySelectorAll(".t-wk, .t-mon");
          gsap.set(title, { "--wipe": "60%" });
          gsap.set(lines, { opacity: 0, y: 10, filter: SOFT_BLUR(3) });
          gsap.set(strokes, { drawSVG: "0%" });
          gsap.set(dots, { scale: 0, transformOrigin: "50% 50%" });
          gsap.set(ring, { drawSVG: "0%" });
          gsap.set(ringDots, { opacity: 0, rotation: -40, svgOrigin: "22 22" });
          gsap.set(gem, { scale: 0, svgOrigin: "22 1.5" });
          gsap.set(reels, { y: 0, yPercent: 0 });
          gsap.set(words, { opacity: 0, letterSpacing: "0.6em" });
          const Dd = D.date;
          const tl = gsap
            .timeline({
              paused: true,
              onComplete: () => {
                waiting[i].splice(0).forEach((f) => f());
              },
            })
            .to(ring, { drawSVG: "100%", duration: Dd.ring, ease: "power2.inOut" }, 0)
            .to(ringDots, { opacity: 1, rotation: 0, svgOrigin: "22 22", duration: 1.1, ease: "power2.out" }, 0.25)
            .to(gem, { scale: 1, svgOrigin: "22 1.5", duration: 0.45, ease: "back.out(3)" }, Dd.ring - 0.15)
            .to(
              reels,
              {
                yPercent: (_k: number, el: HTMLElement) => (-Number(el.dataset.to) / el.children.length) * 100,
                duration: Dd.roll,
                ease: "power3.out",
                stagger: 0.14,
              },
              0.1,
            )
            .to(words, { opacity: 1, letterSpacing: "0.26em", duration: 0.9, ease: "power2.out", stagger: 0.12 }, 0.3)
            .to(title, { "--wipe": "0%", duration: D.titleWrite, ease: "power1.inOut" }, 0.55)
            .to(strokes, { drawSVG: "100%", duration: D.iconDraw, ease: "power1.inOut", stagger: D.iconDraw / Math.max(8, strokes.length) }, 0.7)
            .to(dots, { scale: 1, duration: 0.3, ease: "back.out(3)", stagger: 0.04 }, 0.7 + D.iconDraw * 0.8)
            .to(lines, { opacity: 1, y: 0, filter: SOFT_BLUR(0), duration: 0.7, ease: "power2.out", stagger: 0.1, clearProps: "filter" }, 0.9);
          intros[i] = tl;
          // the first event waits for the heading; the rest start as the vine reaches them
          if (i > 0) ScrollTrigger.create({ trigger: ev, scroller, start: "top 76%", once: true, onEnter: () => void tl.play() });
        });

        /* "Celebrations": handwritten in as the corner flowers burst, the
           lotus divider blooms out under it, then Mehndi writes itself. */
        const head = q(".section-head")[0] as HTMLElement | undefined;
        if (head) {
          const H = D.heading;
          const word = head.querySelector(".wipe");
          const lotusStrokes = head.querySelectorAll(".draw");
          const lotusDots = head.querySelectorAll(".dot");
          gsap.set(word, { "--wipe": "60%" });
          gsap.set(lotusStrokes, { drawSVG: "0%" });
          gsap.set(lotusDots, { scale: 0, transformOrigin: "50% 50%" });
          const headTl = gsap
            .timeline({ paused: true })
            .to(word, { "--wipe": "0%", duration: H.write, ease: "power1.inOut" }, 0)
            .to(lotusStrokes, { drawSVG: "100%", duration: H.lotusDraw, ease: "power2.out", stagger: 0.05 }, H.write * 0.45)
            .to(lotusDots, { scale: 1, duration: 0.35, ease: "back.out(3)", stagger: 0.05 }, H.write * 0.45 + H.lotusDraw * 0.7)
            .add(() => void intros[0]?.play(), H.write * 0.8);
          let started = false;
          const start = () => {
            if (started) return;
            started = true;
            headTl.play();
          };
          window.addEventListener("invite:blast", start);
          cleanups.push(() => window.removeEventListener("invite:blast", start));
          ScrollTrigger.create({ trigger: head, scroller, start: H.start, once: true, onEnter: start });
        }
      }

      /* ── Focus ─────────────────────────────────────────────────────────
         The event whose centre sits in the middle of the screen is "in
         focus". Focus drives everything:
           • the travelling rose rolls to that event's node and changes flower
           • the event is full strength, the others soften
           • its date medallion's gem circles the ring
           • its mood (Haldi → turmeric glow + yellow phone bar) is on ONLY
             while it is focused
           • its own animation plays (henna cone / turmeric light / sacred
             fire / clinking glasses) and stops when focus moves on         */
      let currentTheme = defaultThemeColor;
      const setTheme = (c: string) => {
        if (c === currentTheme) return;
        currentTheme = c;
        setBrowserChrome(c);
      };

      /** Per-event focus animations, built from what each event contains. */
      const buildFx = (ev: HTMLElement, index: number) => {
        const on: (() => void)[] = [];
        const off: (() => void)[] = [];

        // every date: the gem runs once around its ring, the medallion pulses
        const orbit = ev.querySelector(".t-gem-orbit");
        const medal = ev.querySelector(".t-medal");
        if (orbit && medal && !reduce) {
          on.push(() => {
            gsap.fromTo(orbit, { rotation: 0 }, { rotation: 360, svgOrigin: "22 22", duration: 1.6, ease: "power2.inOut", overwrite: "auto" });
            gsap.fromTo(medal, { scale: 1 }, { scale: 1.08, duration: 0.35, ease: "power2.out", yoyo: true, repeat: 1, overwrite: "auto" });
          });
        }

        // Mehndi: a henna cone lifts out of the icon and draws the mandala
        // under the text, stroke by stroke, in real time
        const pattern = ev.querySelector<HTMLElement>(".t-pattern");
        const patternSvg = pattern?.querySelector("svg");
        const cone = ev.querySelector<HTMLElement>(".henna-cone");
        const iconSvg = ev.querySelector<SVGSVGElement>(".event-icon svg");
        if (pattern && patternSvg && cone && iconSvg) {
          const N = D.henna;
          const strokes = [...pattern.querySelectorAll<SVGPathElement>(".draw")];
          const dots = [...pattern.querySelectorAll<SVGCircleElement>(".dot")];
          // the icon's own cone (first 7 strokes + nozzle dots) dims while the pen is out
          const iconCone = [...iconSvg.querySelectorAll("path")].slice(0, 7).concat([...iconSvg.querySelectorAll("circle")].slice(0, 3) as never[]);
          const lens = strokes.map((p) => p.getTotalLength());
          const total = lens.reduce((a, b) => a + b, 0) || 1;
          // dots appear once the pen has drawn out as far as they sit (the design grows from the centre)
          let reach = 0;
          const strokeReach = strokes.map((p, k) => {
            for (let s = 0; s <= 16; s++) {
              const pt = p.getPointAtLength((lens[k] * s) / 16);
              reach = Math.max(reach, Math.hypot(pt.x - 200, pt.y - 200));
            }
            return reach;
          });
          const dotsAfter: SVGCircleElement[][] = strokes.map(() => []);
          dots.forEach((d) => {
            const r = Math.hypot(Number(d.getAttribute("cx")) - 200, Number(d.getAttribute("cy")) - 200);
            const k = strokeReach.findIndex((m) => m >= r - 1);
            dotsAfter[k < 0 ? strokes.length - 1 : k].push(d);
          });

          let tl: gsap.core.Timeline | undefined;
          let spin: gsap.core.Tween | undefined;
          let wobble: gsap.core.Tween | undefined;
          let live = false;
          gsap.set(pattern, { opacity: reduce ? N.restOpacity : 0 });
          gsap.set(cone, { autoAlpha: 0 });
          if (!reduce) {
            gsap.set(strokes, { drawSVG: "0%" });
            gsap.set(dots, { opacity: 0 });
          }

          const draw = () => {
            if (!live) return;
            tl?.kill();
            spin?.kill();
            wobble?.kill();
            gsap.set(pattern, { rotation: 0, scale: 1 });
            gsap.set(strokes, { drawSVG: "0%" });
            gsap.set(dots, { opacity: 0, scale: 0, transformOrigin: "50% 50%" });
            // map drawing coordinates into this event's box (measured once; they move together)
            const er = ev.getBoundingClientRect();
            const pr = patternSvg.getBoundingClientRect();
            const ir = iconSvg.getBoundingClientRect();
            const k = pr.width / 400;
            const at = (p: SVGPathElement, l: number) => {
              const pt = p.getPointAtLength(l);
              return { x: pr.left - er.left + pt.x * k, y: pr.top - er.top + pt.y * k };
            };
            const dock = { x: ir.left - er.left + (39 * ir.width) / 80, y: ir.top - er.top + (41 * ir.width) / 80 };
            const small = (26 * ir.width) / 80 / cone.offsetWidth; // the icon's cone size

            tl = gsap.timeline();
            tl.set(cone, { x: dock.x, y: dock.y, rotation: 0, scale: small, autoAlpha: 1 }, 0)
              .to(iconCone, { opacity: 0.12, duration: 0.3 }, 0)
              .to(pattern, { opacity: N.opacity, duration: 0.4 }, 0)
              .to(cone, { ...at(strokes[0], 0), scale: 1, duration: N.fly, ease: "power2.inOut" }, 0)
              .add(() => {
                wobble = gsap.fromTo(cone, { rotation: -3 }, { rotation: 3.5, duration: N.wobble, ease: "sine.inOut", yoyo: true, repeat: -1 });
              }, N.fly);
            let t = N.fly;
            strokes.forEach((p, i) => {
              if (i > 0) {
                tl!.to(cone, { ...at(p, 0), duration: N.hop, ease: "sine.inOut" }, t);
                t += N.hop;
              }
              const len = lens[i];
              tl!.to(
                p,
                {
                  drawSVG: "100%",
                  duration: (N.drawSeconds * len) / total,
                  ease: "sine.inOut",
                  onUpdate(this: gsap.core.Tween) {
                    gsap.set(cone, at(p, this.ratio * len));
                  },
                },
                t,
              );
              t += (N.drawSeconds * len) / total;
              if (dotsAfter[i].length) {
                tl!.to(dotsAfter[i], { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(3)", stagger: Math.min(0.02, 0.4 / dotsAfter[i].length) }, t - 0.05);
              }
            });
            // back into the icon, then the finished design turns slowly
            tl.add(() => wobble?.kill(), t)
              .to(cone, { x: dock.x, y: dock.y, rotation: 0, scale: small, duration: N.fly, ease: "power2.inOut" }, t + 0.15)
              .to(cone, { autoAlpha: 0, duration: 0.15 }, t + 0.1 + N.fly)
              .to(iconCone, { opacity: 1, duration: 0.3 }, t + N.fly - 0.05)
              .add(() => {
                spin = gsap.to(pattern, { rotation: 360, duration: N.spinSeconds, ease: "none", repeat: -1 });
              });
          };
          on.push(() => {
            live = true;
            if (!reduce) afterIntro(index, () => gsap.delayedCall(0.2, draw));
            else gsap.to(pattern, { opacity: N.opacity, duration: 0.6 });
          });
          off.push(() => {
            live = false;
            tl?.kill();
            wobble?.kill();
            gsap.to(cone, { autoAlpha: 0, scale: 0.6, duration: 0.3, overwrite: "auto" });
            gsap.to(iconCone, { opacity: 1, duration: 0.3 });
            gsap.to(pattern, { opacity: N.restOpacity, duration: 0.8, ease: "power2.out" });
          });
        }

        // an event's illustration rises in the first time the event is focused
        const scene = ev.querySelector<HTMLElement>(".t-scene");
        if (scene && !reduce) {
          let shown = false;
          gsap.set(scene, { opacity: 0, y: 18 });
          on.push(() => {
            if (shown) return;
            shown = true;
            afterIntro(index, () => gsap.to(scene, { opacity: 1, y: 0, duration: 1.1, ease: "power2.out" }));
          });
        }

        // Haldi: a soft turmeric light that drifts around the event
        const halo = ev.querySelector<HTMLElement>(".t-halo");
        if (halo) {
          let wander: gsap.core.Tween | undefined;
          gsap.set(halo, { opacity: 0 });
          on.push(() => {
            gsap.to(halo, { opacity: 1, duration: 0.8, ease: "power2.out", overwrite: "auto" });
            if (reduce) return;
            wander?.kill();
            wander = gsap.to(halo, {
              x: () => rnd(-30, 30) * unit,
              y: () => rnd(-16, 16) * unit,
              scale: () => rnd(0.88, 1.2),
              duration: () => rnd(1.6, 2.6),
              ease: "sine.inOut",
              repeat: -1,
              repeatRefresh: true,
            });
          });
          off.push(() => {
            wander?.kill();
            gsap.to(halo, { opacity: 0, x: 0, y: 0, scale: 1, duration: 0.6, ease: "power2.out", overwrite: "auto" });
          });
        }

        // Hindu wedding: the sacred fire on the kalash ignites and flickers
        const agni = ev.querySelector<SVGGElement>(".agni");
        if (agni) {
          const flames = agni.querySelectorAll(".flame");
          const glow = agni.querySelector(".agni-glow");
          const embers = agni.querySelectorAll(".ember");
          const base = "40 38.8";
          let loops: gsap.core.Animation[] = [];
          gsap.set(flames, { scale: 0, svgOrigin: base });
          gsap.set(embers, { opacity: 0 });
          on.push(() => {
            loops.forEach((t) => t.kill());
            loops = [];
            gsap.to(agni, { opacity: 1, duration: 0.3, overwrite: "auto" });
            gsap.to(flames, { scale: 1, svgOrigin: base, duration: 0.6, ease: "back.out(2)", stagger: 0.08, overwrite: "auto" });
            if (reduce) return;
            flames.forEach((f, k) =>
              loops.push(
                gsap.to(f, {
                  scaleY: () => rnd(0.8, 1.2),
                  scaleX: () => rnd(0.88, 1.08),
                  skewX: () => rnd(-8, 8),
                  svgOrigin: base,
                  duration: () => rnd(0.07, 0.15),
                  ease: "sine.inOut",
                  repeat: -1,
                  repeatRefresh: true,
                  delay: 0.65 + k * 0.03,
                }),
              ),
            );
            if (glow) {
              loops.push(
                gsap.to(glow, {
                  opacity: () => rnd(0.55, 1),
                  scale: () => rnd(0.9, 1.15),
                  svgOrigin: "40 31",
                  duration: () => rnd(0.1, 0.22),
                  repeat: -1,
                  repeatRefresh: true,
                }),
              );
            }
            embers.forEach((e) =>
              loops.push(
                gsap.fromTo(
                  e,
                  { y: 0, x: 0, opacity: 1 },
                  {
                    y: () => -rnd(8, 17),
                    x: () => rnd(-4, 4),
                    opacity: 0,
                    duration: () => rnd(0.9, 1.6),
                    ease: "power1.out",
                    repeat: -1,
                    repeatRefresh: true,
                    delay: rnd(0.2, 1.4),
                  },
                ),
              ),
            );
          });
          off.push(() => {
            loops.forEach((t) => t.kill());
            loops = [];
            gsap.to(flames, { scale: 0, svgOrigin: base, duration: 0.4, ease: "power2.in", overwrite: "auto" });
            gsap.to(agni, { opacity: 0, duration: 0.45, delay: 0.1, overwrite: "auto" });
            gsap.to(embers, { opacity: 0, duration: 0.3 });
          });
        }

        // Church & reception: the champagne glasses clink, sparkle and fizz
        const gl = ev.querySelector(".glass-l");
        const gr = ev.querySelector(".glass-r");
        if (gl && gr) {
          const clink = ev.querySelector(".clink");
          const stars = ev.querySelectorAll(".star");
          const bubbles = ev.querySelectorAll(".bubble");
          const [liqL, liqR] = [ev.querySelector(".liquid-l"), ev.querySelector(".liquid-r")];
          let loop: gsap.core.Timeline | undefined;
          let fizz: gsap.core.Tween[] = [];
          on.push(() => {
            loop?.kill();
            fizz.forEach((t) => t.kill());
            fizz = [];
            if (reduce) return;
            loop = gsap
              .timeline({ repeat: -1, repeatDelay: D.cheers.pause })
              // lean apart…
              .to(gl, { rotation: -11, svgOrigin: "26 62", duration: 0.55, ease: "power2.inOut" }, 0)
              .to(gr, { rotation: 11, svgOrigin: "54 62", duration: 0.55, ease: "power2.inOut" }, 0)
              .to(liqL, { rotation: 9, svgOrigin: "33 33.6", duration: 0.55, ease: "power2.inOut" }, 0)
              .to(liqR, { rotation: -9, svgOrigin: "47 33.6", duration: 0.55, ease: "power2.inOut" }, 0)
              // …swing together…
              .to(gl, { rotation: 2.5, duration: 0.26, ease: "power3.in" }, 0.62)
              .to(gr, { rotation: -2.5, duration: 0.26, ease: "power3.in" }, 0.62)
              .to([liqL, liqR], { rotation: 0, duration: 0.3, ease: "power2.out" }, 0.66)
              // …clink! a flash of light and twinkling stars
              .fromTo(clink, { opacity: 0, scale: 0.4, svgOrigin: "40 21" }, { opacity: 1, scale: 1.3, duration: 0.18, ease: "power2.out" }, 0.88)
              .to(clink, { opacity: 0.35, scale: 1, duration: 0.5, ease: "power1.out" }, 1.06)
              .fromTo(stars, { scale: 0.6, rotation: 0 }, { scale: 1.4, rotation: 90, transformOrigin: "50% 50%", duration: 0.35, ease: "back.out(3)", stagger: 0.06 }, 0.88)
              .to(stars, { scale: 1, duration: 0.45, ease: "power2.out" }, 1.25)
              // …and settle with a little wobble
              .to([gl, gr], { rotation: 0, duration: 0.9, ease: "elastic.out(1, 0.45)" }, 0.9);
            bubbles.forEach((b) =>
              fizz.push(
                gsap.fromTo(b, { y: 0, opacity: 1 }, { y: -7, opacity: 0, duration: rnd(1.1, 1.8), ease: "power1.in", repeat: -1, delay: rnd(0, 1) }),
              ),
            );
          });
          off.push(() => {
            loop?.kill();
            fizz.forEach((t) => t.kill());
            fizz = [];
            gsap.to([gl, gr, liqL, liqR], { rotation: 0, duration: 0.5, ease: "power2.out" });
            gsap.to(bubbles, { y: 0, opacity: 1, duration: 0.3 });
            gsap.to(stars, { scale: 1, rotation: 0, duration: 0.3 });
          });
        }

        return { enter: () => on.forEach((f) => f()), leave: () => off.forEach((f) => f()) };
      };

      const timeline = q(".timeline")[0] as HTMLElement | undefined;
      const traveler = q(".t-traveler")[0] as HTMLElement | undefined;
      if (timeline && traveler) {
        const fx = events.map(buildFx);
        const layers = q(".t-flower");
        const pop = q(".t-traveler-pop")[0];
        const T = timing.sections.traveler;
        const speed = reduce ? 0 : 1;
        let roseAt = -1;
        let y = 0;
        let spin = 0;
        let focused = -1;
        gsap.set(traveler, { opacity: 0, scale: 0.3 });
        gsap.set(layers, { opacity: 0 });

        /** the rose rolls along the vine to event i and becomes its flower */
        const moveRose = (i: number) => {
          if (i === roseAt) return;
          const targetY = NODE[i] * timeline.clientHeight;
          if (roseAt < 0) {
            y = targetY;
            gsap.set(traveler, { y });
            gsap.set(layers[i], { opacity: 1 });
            gsap.to(traveler, { opacity: 1, scale: 1, rotation: 0, duration: 0.9 * speed, ease: "back.out(1.6)" });
          } else {
            const dist = targetY - y;
            const dur = speed * gsap.utils.clamp(T.minDur, T.maxDur, Math.abs(dist) / T.pxPerSecond);
            spin += (dist / (traveler.clientWidth / 2)) * (180 / Math.PI) * T.roll;
            gsap.to(traveler, { y: targetY, rotation: spin, duration: dur, ease: "power2.inOut", overwrite: "auto" });
            layers.forEach((l, k) =>
              gsap.to(l, { opacity: k === i ? 1 : 0, duration: dur * 0.5, delay: dur * 0.3, ease: "power1.inOut", overwrite: "auto" }),
            );
            if (speed) {
              gsap.fromTo(pop, { scale: 1 }, { scale: 1.2, duration: 0.22, delay: dur - 0.12, ease: "power2.out", yoyo: true, repeat: 1, overwrite: "auto" });
            }
            y = targetY;
          }
          roseAt = i;
        };

        const setFocus = (i: number) => {
          if (i === focused) return;
          if (focused >= 0) fx[focused].leave();
          focused = i;
          events.forEach((ev, k) => ev.classList.toggle("is-focus", k === i));
          timeline.classList.toggle("has-focus", i >= 0);
          // moods are on only while their event is focused
          const mood = i >= 0 ? (events[i].dataset.mood as MoodName | undefined) : undefined;
          document.querySelectorAll<HTMLElement>(".mood-glow").forEach((g) =>
            gsap.to(g, { opacity: g.dataset.mood === mood ? 1 : 0, duration: 0.6, ease: "power1.inOut", overwrite: "auto" }),
          );
          setTheme(mood && moods[mood] ? moods[mood].themeColor : defaultThemeColor);
          if (i >= 0) {
            moveRose(i);
            fx[i].enter();
          }
        };

        events.forEach((ev, i) => {
          // in focus once its centre is well on screen (the newest one wins),
          // out of focus once it has clearly gone
          ScrollTrigger.create({
            trigger: ev,
            scroller,
            start: "center 88%",
            end: "center 12%",
            onEnter: () => setFocus(i),
            onEnterBack: () => setFocus(i),
            onLeave: () => focused === i && setFocus(-1),
            onLeaveBack: () => focused === i && setFocus(-1),
          });
        });
      }

      if (reduce) return () => cleanups.forEach((f) => f());

      /* Schedule: the gold vine grows downward with the scroll (scrubbed),
         stroke by stroke in drawing order, at a steady pen speed. */
      if (timeline) {
        const strokes = [...timeline.querySelectorAll<SVGPathElement>(".thread .draw")];
        gsap.set(strokes, { drawSVG: "0%" });
        const grow = gsap.timeline({
          scrollTrigger: { trigger: timeline, scroller, start: "top 82%", end: "bottom 70%", scrub: 0.8 },
        });
        strokes.forEach((p) => grow.to(p, { drawSVG: "100%", duration: p.getTotalLength(), ease: "none" }));
      }

      q(".reveal-up").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 28,
          duration: D.cardDur,
          ease: "power3.out",
          scrollTrigger: { trigger: el, scroller, start: "top 90%", once: true },
        });
      });

      // later dividers (the lotus under "Celebrations" is part of the heading)
      q(".divider:not(.lotus-divider)").forEach((d) => {
        const st = { trigger: d, scroller, start: "top 92%", once: true };
        gsap.from(d.querySelectorAll(".draw"), { drawSVG: "0%", duration: 1, ease: "power2.out", scrollTrigger: st });
        gsap.from(d.querySelectorAll(".dot"), {
          scale: 0,
          transformOrigin: "50% 50%",
          duration: 0.35,
          ease: "back.out(3)",
          stagger: 0.06,
          delay: 0.6,
          scrollTrigger: st,
        });
      });

      ScrollTrigger.refresh();
      return () => cleanups.forEach((f) => f());
    },
    { dependencies: [enabled], scope: root },
  );

  return (
    <div ref={root} className="below">
      <section aria-labelledby="events-title">
        <div className="section-head" data-page="top" style={{ marginBottom: "calc(var(--u) * 22)" }}>
          <h2 id="events-title" className="section-title">
            <span className="wipe">{C.eventsHeading}</span>
          </h2>
          <LotusDivider />
        </div>
        {/* The schedule hangs on a gold vine: one event per node, written
            straight onto the paper (no boxes). One rose travels between them. */}
        <div className="timeline" style={{ height: `calc(var(--thread-w) * ${(THREAD.height / 120).toFixed(3)})` }}>
          <ScheduleThread thread={THREAD} />
          <TravellingRose />
          {/* pages: each event rests in the middle of the screen (Mehndi
              shares its page with the "Celebrations" heading above it) */}
          {NODE.map((n, i) =>
            i === 0 ? null : <span key={i} className="t-snap" data-page="center" style={{ top: `${n * 100}%` }} aria-hidden />,
          )}
          {SCHEDULE.map((e, i) => {
            const mehndi = "pattern" in e && e.pattern === "mehndi";
            return (
              <article
                key={e.title}
                className="t-event"
                data-mood={"mood" in e ? e.mood : undefined}
                style={{ top: `${NODE[i] * 100}%` }}
              >
                <div className="t-icons">
                  {("icons" in e ? (e.icons as readonly EventIconName[]) : []).map((name) => (
                    <SvgArt key={name} svg={EVENT_ICONS[name]} className="event-icon" />
                  ))}
                </div>
                <div className="t-text">
                  {mehndi && <SvgArt svg={MEHNDI_MANDALA} className="t-pattern" />}
                  {"scene" in e && e.scene === "mehndi" && <MehndiScene />}
                  {"mood" in e && e.mood === "haldi" && <span className="t-halo" aria-hidden />}
                  <EventDate day={e.day} weekday={e.weekday} month={e.month} />
                  <h3 className="t-title script">
                    <span className="wipe">{e.title}</span>
                  </h3>
                  <p className="t-line t-time">{e.time}</p>
                  <p className="t-line t-place">{e.place}</p>
                  <p className="t-line t-note">{e.note}</p>
                </div>
                {mehndi && (
                  <span className="henna-cone" aria-hidden>
                    <SvgArt svg={HENNA_CONE} className="henna-cone-art" />
                  </span>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel reveal-up" data-page="center" aria-labelledby="venue-title">
        <h2 id="venue-title" className="section-title">
          {C.venue.heading}
        </h2>
        <Divider />
        <p style={{ fontWeight: 600, fontSize: "calc(var(--u) * 19)", color: "var(--burgundy)" }}>{C.venue.name}</p>
        <p style={{ fontStyle: "italic" }}>{C.venue.address}</p>
        <a className="btn-gold" href={C.venue.mapsUrl} target="_blank" rel="noopener noreferrer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          {C.venue.mapsLabel}
        </a>
      </section>

      <section className="panel reveal-up" data-page="center" aria-labelledby="count-title">
        <h2 id="count-title" className="section-title">
          {C.countdown.heading}
        </h2>
        <Divider />
        <Countdown />
      </section>

      <section className="panel reveal-up" data-page="center" aria-labelledby="rsvp-title">
        <h2 id="rsvp-title" className="section-title">
          {C.rsvp.heading}
        </h2>
        <Divider />
        <p style={{ maxWidth: "calc(var(--u) * 300)" }}>{C.rsvp.body}</p>
        <a className="btn-gold" href={C.rsvp.url} target="_blank" rel="noopener noreferrer">
          {C.rsvp.buttonLabel}
        </a>
      </section>

      <p className="footer-line reveal-up" data-page="center">{C.footer}</p>
    </div>
  );
}
