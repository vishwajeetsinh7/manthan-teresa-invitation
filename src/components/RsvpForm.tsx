"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { invitation as C } from "@/src/content/invitation";
import { submitRsvp } from "@/app/rsvp/actions";
import type { EventData } from "@/src/content/types";

const F = C.rsvp.form;

/**
 * The RSVP button, and the form it opens over the page (outside the paged scroller, so
 * swiping and typing in it never turn the page). The answers go to the Google Sheet.
 */
export function RsvpButton({ code, events, small = false }: { code: string; events: EventData[]; small?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={small ? "btn-gold btn-gold-sm btn-rsvp-sm" : "btn-gold"} onClick={() => setOpen(true)}>
        {small && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 6h16v12H4z" />
            <path d="M4 7l8 6 8-6" />
          </svg>
        )}
        {C.rsvp.buttonLabel}
      </button>
      {open && createPortal(<RsvpForm code={code} events={events} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function RsvpForm({ code, events, onClose }: { code: string; events: EventData[]; onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, { attending: boolean | null; guests: number }>>(() =>
    Object.fromEntries(events.map((e) => [e.id, { attending: null, guests: 1 }])),
  );
  const [dietary, setDietary] = useState("");
  const [needs, setNeeds] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (id: string, v: Partial<{ attending: boolean | null; guests: number }>) => setAnswers((a) => ({ ...a, [id]: { ...a[id], ...v } }));
  const unanswered = events.filter((e) => answers[e.id].attending === null);

  const send = (ev: React.FormEvent) => {
    ev.preventDefault();
    setError("");
    if (unanswered.length) return setError(`Please let us know about: ${unanswered.map((e) => e.title).join(", ")}.`);
    start(async () => {
      const r = await submitRsvp(code, {
        name,
        phone,
        email,
        answers: Object.fromEntries(Object.entries(answers).map(([id, a]) => [id, { attending: !!a.attending, guests: a.guests }])),
        dietary,
        needs,
        message,
      });
      if ("error" in r) setError(r.error);
      else setDone(true);
    });
  };

  return (
    <div className="rsvp-overlay" role="dialog" aria-modal="true" aria-labelledby="rsvp-form-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rsvp-sheet">
        <button type="button" className="rsvp-x" onClick={onClose} aria-label={F.close}>
          ×
        </button>
        <h2 id="rsvp-form-title" className="rsvp-title">
          {F.title}
        </h2>
        {done ? (
          <div className="rsvp-done">
            <p className="rsvp-thanks">{F.thanks}</p>
            <p className="rsvp-sub">{F.thanksSub}</p>
            <button type="button" className="btn-gold" onClick={onClose}>
              {F.close}
            </button>
          </div>
        ) : (
          <form onSubmit={send} className="rsvp-form">
            <label className="rsvp-field">
              <span>{F.name}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" />
            </label>
            <label className="rsvp-field">
              <span>{F.phone}</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={30} type="tel" inputMode="tel" autoComplete="tel" />
            </label>
            <label className="rsvp-field">
              <span>{F.email}</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} type="email" autoComplete="email" />
            </label>

            <p className="rsvp-h">{F.eventsHeading}</p>
            {events.map((e) => {
              const a = answers[e.id];
              return (
                <fieldset key={e.id} className="rsvp-event">
                  <legend>
                    <strong>{e.title}</strong>
                    <small>
                      {e.weekday.slice(0, 3)} {e.day} {e.month} · {e.time}
                    </small>
                  </legend>
                  <div className="rsvp-choice">
                    <button type="button" className={a.attending === true ? "on" : ""} aria-pressed={a.attending === true} onClick={() => set(e.id, { attending: true })}>
                      {F.accept}
                    </button>
                    <button type="button" className={a.attending === false ? "on" : ""} aria-pressed={a.attending === false} onClick={() => set(e.id, { attending: false })}>
                      {F.decline}
                    </button>
                  </div>
                  {a.attending && (
                    <label className="rsvp-guests">
                      <span>{F.guests}</span>
                      <span className="rsvp-stepper">
                        <button type="button" onClick={() => set(e.id, { guests: Math.max(1, a.guests - 1) })} aria-label="One fewer">
                          −
                        </button>
                        <output>{a.guests}</output>
                        <button type="button" onClick={() => set(e.id, { guests: Math.min(20, a.guests + 1) })} aria-label="One more">
                          +
                        </button>
                      </span>
                    </label>
                  )}
                </fieldset>
              );
            })}

            <label className="rsvp-field">
              <span>{F.dietary}</span>
              <select value={dietary} onChange={(e) => setDietary(e.target.value)}>
                <option value="">—</option>
                {F.dietaryOptions.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
            <label className="rsvp-field">
              <span>{F.needs}</span>
              <input value={needs} onChange={(e) => setNeeds(e.target.value)} maxLength={500} />
            </label>
            <label className="rsvp-field">
              <span>{F.message}</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={3} />
            </label>

            {error && <p className="rsvp-error">{error}</p>}
            <button type="submit" className="btn-gold rsvp-send" disabled={pending}>
              {pending ? F.sending : F.send}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
