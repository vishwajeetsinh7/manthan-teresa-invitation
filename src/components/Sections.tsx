"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/src/lib/gsap";
import { invitation as C } from "@/src/content/invitation";
import { timing } from "@/src/config/timing";
import { assets } from "@/src/config/assets";
import { AssetImage } from "./AssetImage";
import { Divider, ScheduleThread, THREAD_NODES } from "./art/LineArt";
import { FlowerOpenPlaceholder } from "./art/Placeholders";
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

/** Rose that unfurls on a vine node */
function NodeBloom({ kind }: { kind: number }) {
  return (
    <div className="t-bloom" aria-hidden>
      <AssetImage src={assets.flowers[kind]} alt="" sizes="80px" fallback={<FlowerOpenPlaceholder kind={kind} />} />
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

      /* Each event, as the vine reaches it: a rose unfurls on the node, the
         title is written in, then the details fade up. */
      q(".t-event").forEach((ev) => {
        const bloom = ev.querySelector(".t-bloom");
        const title = ev.querySelector(".t-title .wipe");
        const lines = ev.querySelectorAll(".t-line");
        gsap.set(title, { "--wipe": "60%" });
        gsap.set(lines, { opacity: 0, y: 10, filter: "blur(3px)" });
        gsap
          .timeline({ scrollTrigger: { trigger: ev, scroller, start: "top 76%", once: true } })
          .fromTo(
            bloom,
            { scale: 0.25, rotation: -70, opacity: 0, clipPath: "circle(16% at 50% 50%)" },
            {
              scale: 1,
              rotation: 0,
              opacity: 1,
              clipPath: "circle(75% at 50% 50%)",
              duration: D.bloomDur,
              ease: "power3.out",
              clearProps: "clipPath",
            },
          )
          .to(title, { "--wipe": "0%", duration: D.titleWrite, ease: "power1.inOut" }, 0.2)
          .to(lines, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "power2.out", stagger: 0.1, clearProps: "filter" }, 0.55);
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
        gsap.from(d.querySelectorAll(".draw"), {
          drawSVG: "0%",
          duration: 1,
          ease: "power2.out",
          scrollTrigger: { trigger: d, scroller, start: "top 92%", once: true },
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
          <Divider />
        </div>
        {/* The schedule hangs on a gold vine: one event per node, written
            straight onto the paper (no boxes). */}
        <div className="timeline">
          <ScheduleThread />
          {C.events.slice(0, THREAD_NODES.length).map((e, i) => (
            <article
              key={e.title}
              className="t-event"
              data-mood={"mood" in e ? e.mood : undefined}
              style={{ top: `${THREAD_NODES[i] * 100}%` }}
            >
              <NodeBloom kind={[0, 1, 2, 3][i % 4]} />
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
