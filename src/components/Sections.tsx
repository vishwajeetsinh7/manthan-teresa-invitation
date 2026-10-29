"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/src/lib/gsap";
import { invitation as C } from "@/src/content/invitation";
import { timing } from "@/src/config/timing";
import { assets } from "@/src/config/assets";
import { AssetImage } from "./AssetImage";
import { Divider, ScheduleThread, THREAD_NODES } from "./art/LineArt";
import { FlowerOpenPlaceholder } from "./art/Placeholders";
import { EVENT_ICONS, LotusDivider, SvgArt, type EventIconName } from "./art/svgArt";
import { moods, defaultThemeColor, type MoodName } from "@/src/config/moods";

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

type EventFlower = { kind: number; tint?: string };
const SCHEDULE = C.events.slice(0, THREAD_NODES.length);

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

export function Sections({ scrollerRef, enabled }: { scrollerRef: RefObject<HTMLDivElement | null>; enabled: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  // leaving (e.g. replay intro) always restores the normal top-bar colour
  useEffect(
    () => () => {
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (meta) meta.content = defaultThemeColor;
    },
    [],
  );

  useGSAP(
    () => {
      if (!enabled || !scrollerRef.current) return;
      const scroller = scrollerRef.current;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const q = gsap.utils.selector(root);
      const D = timing.sections;

      /* Event moods (e.g. Haldi): the page glows in the event's colour while
         it is on screen, and the phone's top bar follows. Scroll-linked, so it
         also runs with reduced motion (nothing moves, only colour fades). */
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      let currentTheme = meta?.content ?? defaultThemeColor;
      const setTheme = (c: string) => {
        if (meta && c !== currentTheme) {
          meta.content = c;
          currentTheme = c;
        }
      };
      const activeMoods = new Set<string>();
      q("[data-mood]").forEach((el) => {
        const name = (el as HTMLElement).dataset.mood as MoodName;
        const glow = document.querySelector<HTMLElement>(`.mood-glow[data-mood="${name}"]`);
        if (!glow || !moods[name]) return;
        gsap
          .timeline({
            scrollTrigger: {
              trigger: el,
              scroller,
              start: "top 92%",
              end: "bottom 8%",
              scrub: 0.6,
              onUpdate: (self) => {
                // bar turns yellow while the glow is mostly in
                const inside = self.progress > 0.2 && self.progress < 0.8;
                if (inside) activeMoods.add(name);
                else activeMoods.delete(name);
                setTheme(activeMoods.size ? moods[[...activeMoods][0] as MoodName].themeColor : defaultThemeColor);
              },
            },
          })
          .fromTo(glow, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" })
          .to(glow, { opacity: 1, duration: 0.4 })
          .to(glow, { opacity: 0, duration: 0.3, ease: "power1.in" });
      });

      /* Travelling rose: whichever event sits in the middle of the screen is
         "in focus". The rose rolls down (or back up) the vine to its node and
         turns into that event's flower; the focused event is full strength,
         the others soften. With reduced motion it simply appears there. */
      const timeline = q(".timeline")[0] as HTMLElement | undefined;
      const traveler = q(".t-traveler")[0] as HTMLElement | undefined;
      if (timeline && traveler) {
        const events = q(".t-event") as HTMLElement[];
        const layers = q(".t-flower");
        const pop = q(".t-traveler-pop")[0];
        const T = timing.sections.traveler;
        const speed = reduce ? 0 : 1;
        let current = -1;
        let y = 0;
        let spin = 0;
        gsap.set(traveler, { opacity: 0, scale: 0.3 });
        gsap.set(layers, { opacity: 0 });

        const focus = (i: number) => {
          if (i === current) return;
          const targetY = THREAD_NODES[i] * timeline.clientHeight;
          events.forEach((ev, k) => ev.classList.toggle("is-focus", k === i));
          timeline.classList.add("has-focus");

          if (current < 0) {
            // first arrival: the rose unfurls on the node
            y = targetY;
            gsap.set(traveler, { y });
            gsap.set(layers[i], { opacity: 1 });
            gsap.to(traveler, { opacity: 1, scale: 1, rotation: 0, duration: 0.9 * speed, ease: "back.out(1.6)" });
          } else {
            const dist = targetY - y;
            const dur = speed * gsap.utils.clamp(T.minDur, T.maxDur, Math.abs(dist) / T.pxPerSecond);
            // roll like a wheel: turn by the distance travelled / radius
            spin += (dist / (traveler.clientWidth / 2)) * (180 / Math.PI) * T.roll;
            gsap.to(traveler, { y: targetY, rotation: spin, duration: dur, ease: "power2.inOut", overwrite: "auto" });
            layers.forEach((l, k) =>
              gsap.to(l, { opacity: k === i ? 1 : 0, duration: dur * 0.5, delay: dur * 0.3, ease: "power1.inOut", overwrite: "auto" }),
            );
            // a little bloom-pulse as it settles
            if (speed) {
              gsap.fromTo(pop, { scale: 1 }, { scale: 1.2, duration: 0.22, delay: dur - 0.12, ease: "power2.out", yoyo: true, repeat: 1, overwrite: "auto" });
            }
            y = targetY;
          }
          current = i;
        };
        events.forEach((ev, i) =>
          ScrollTrigger.create({
            trigger: ev,
            scroller,
            // in focus while its centre is in the middle band of the screen
            // (narrower than the gap between events, so only one at a time)
            start: "center 58%",
            end: "center 42%",
            onEnter: () => focus(i),
            onEnterBack: () => focus(i),
          }),
        );
      }

      if (reduce) return;

      /* Schedule: the gold vine grows downward with the scroll (scrubbed),
         stroke by stroke in drawing order, at a steady pen speed. */
      const thread = q(".timeline")[0] as HTMLElement | undefined;
      if (thread) {
        const strokes = [...thread.querySelectorAll<SVGPathElement>(".thread .draw")];
        gsap.set(strokes, { drawSVG: "0%" });
        const grow = gsap.timeline({
          scrollTrigger: { trigger: thread, scroller, start: "top 82%", end: "bottom 70%", scrub: 0.8 },
        });
        strokes.forEach((p) => grow.to(p, { drawSVG: "100%", duration: p.getTotalLength(), ease: "none" }));
      }

      /* Each event, as the vine reaches it: the title is written in, its gold
         icon draws itself, then the details fade up. */
      q(".t-event").forEach((ev) => {
        const title = ev.querySelector(".t-title .wipe");
        const lines = ev.querySelectorAll(".t-line");
        const strokes = ev.querySelectorAll(".event-icon .draw");
        const dots = ev.querySelectorAll(".event-icon .dot");
        gsap.set(title, { "--wipe": "60%" });
        gsap.set(lines, { opacity: 0, y: 10, filter: "blur(3px)" });
        gsap.set(strokes, { drawSVG: "0%" });
        gsap.set(dots, { scale: 0, transformOrigin: "50% 50%" });
        gsap
          .timeline({ scrollTrigger: { trigger: ev, scroller, start: "top 76%", once: true } })
          .to(title, { "--wipe": "0%", duration: D.titleWrite, ease: "power1.inOut" }, 0)
          .to(strokes, { drawSVG: "100%", duration: D.iconDraw, ease: "power1.inOut", stagger: D.iconDraw / Math.max(8, strokes.length) }, 0.15)
          .to(dots, { scale: 1, duration: 0.3, ease: "back.out(3)", stagger: 0.04 }, 0.15 + D.iconDraw * 0.8)
          .to(lines, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "power2.out", stagger: 0.1, clearProps: "filter" }, 0.35);
      });

      q(".reveal-up").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 28,
          duration: D.cardDur,
          ease: "power3.out",
          scrollTrigger: { trigger: el, scroller, start: "top 90%", once: true },
        });
      });

      q(".divider").forEach((d) => {
        const st = { trigger: d, scroller, start: "top 92%", once: true };
        const lotus = d.classList.contains("lotus-divider");
        gsap.from(d.querySelectorAll(".draw"), {
          drawSVG: "0%",
          duration: lotus ? 1.6 : 1,
          ease: "power2.out",
          // lotus strokes start at the centre and grow outward one after another
          stagger: lotus ? 0.05 : 0,
          scrollTrigger: st,
        });
        gsap.from(d.querySelectorAll(".dot"), {
          scale: 0,
          transformOrigin: "50% 50%",
          duration: 0.35,
          ease: "back.out(3)",
          stagger: 0.06,
          delay: lotus ? 1.2 : 0.6,
          scrollTrigger: st,
        });
      });

      ScrollTrigger.refresh();
    },
    { dependencies: [enabled], scope: root },
  );

  return (
    <div ref={root} className="below">
      <section aria-labelledby="events-title">
        <div className="section-head reveal-up" style={{ marginBottom: "calc(var(--u) * 22)" }}>
          <h2 id="events-title" className="section-title">
            {C.eventsHeading}
          </h2>
          <LotusDivider />
        </div>
        {/* The schedule hangs on a gold vine: one event per node, written
            straight onto the paper (no boxes). One rose travels between them. */}
        <div className="timeline">
          <ScheduleThread />
          <TravellingRose />
          {SCHEDULE.map((e, i) => (
            <article
              key={e.title}
              className="t-event"
              data-mood={"mood" in e ? e.mood : undefined}
              style={{ top: `${THREAD_NODES[i] * 100}%` }}
            >
              <div className="t-icons">
                {("icons" in e ? (e.icons as readonly EventIconName[]) : []).map((name) => (
                  <SvgArt key={name} svg={EVENT_ICONS[name]} className="event-icon" />
                ))}
              </div>
              <div className="t-text">
                <p className="t-line t-date">
                  {e.weekday} · {e.day} {e.month}
                </p>
                <h3 className="t-title script">
                  <span className="wipe">{e.title}</span>
                </h3>
                <p className="t-line t-time">{e.time}</p>
                <p className="t-line t-place">{e.place}</p>
                <p className="t-line t-note">{e.note}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel reveal-up" aria-labelledby="venue-title">
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

      <section className="panel reveal-up" aria-labelledby="count-title">
        <h2 id="count-title" className="section-title">
          {C.countdown.heading}
        </h2>
        <Divider />
        <Countdown />
      </section>

      <section className="panel reveal-up" aria-labelledby="rsvp-title">
        <h2 id="rsvp-title" className="section-title">
          {C.rsvp.heading}
        </h2>
        <Divider />
        <p style={{ maxWidth: "calc(var(--u) * 300)" }}>{C.rsvp.body}</p>
        <a className="btn-gold" href={C.rsvp.url} target="_blank" rel="noopener noreferrer">
          {C.rsvp.buttonLabel}
        </a>
      </section>

      <p className="footer-line reveal-up">{C.footer}</p>
    </div>
  );
}
