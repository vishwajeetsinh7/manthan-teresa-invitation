"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/src/lib/gsap";
import { invitation as C } from "@/src/content/invitation";
import { timing } from "@/src/config/timing";
import { assets } from "@/src/config/assets";
import { AssetImage } from "./AssetImage";
import { Divider } from "./art/LineArt";
import { FlowerOpenPlaceholder } from "./art/Placeholders";

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

function CornerBloom({ kind }: { kind: number }) {
  return (
    <div className="event-bloom" aria-hidden>
      <AssetImage src={assets.flowers[kind]} alt="" sizes="80px" fallback={<FlowerOpenPlaceholder kind={kind} />} />
    </div>
  );
}

export function Sections({ scrollerRef, enabled }: { scrollerRef: RefObject<HTMLDivElement | null>; enabled: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!enabled || !scrollerRef.current) return;
      const scroller = scrollerRef.current;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const q = gsap.utils.selector(root);
      const D = timing.sections;

      if (reduce) return;

      q(".event-card").forEach((card) => {
        const bloom = card.querySelector(".event-bloom");
        gsap
          .timeline({ scrollTrigger: { trigger: card, scroller, start: "top 88%", once: true } })
          .from(card, { opacity: 0, y: 36, duration: D.cardDur, ease: "power3.out" })
          // same unfurl as the hero flowers
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
            0.25,
          );
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
        {C.events.map((e, i) => (
          <article key={e.title} className="event-card">
            <CornerBloom kind={[0, 1, 2][i % 3]} />
            <div className="event-date">
              <div className="event-day">{e.day}</div>
              <div className="event-month">{e.month}</div>
            </div>
            <div>
              <h3 className="event-title">{e.title}</h3>
              <p className="event-meta">
                {e.weekday} · {e.time}
                <br />
                {e.place}
                <br />
                <em>{e.note}</em>
              </p>
            </div>
          </article>
        ))}
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
