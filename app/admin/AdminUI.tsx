"use client";

import { useActionState, useState, useTransition } from "react";
import { createLink, login, logout } from "./actions";

type Ev = { id: string; title: string; when: string };

export function AdminLogin() {
  const [state, action, pending] = useActionState(login, null);
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="admin-form">
      <label className="admin-label" htmlFor="pw">
        Password
      </label>
      <div className="admin-pw">
        <input id="pw" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="admin-input" autoFocus />
        <button type="button" className="admin-eye" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
          {show ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 3l18 18" />
              <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c5.5 0 9.5 5 9.5 7a9 9 0 0 1-2.3 3.3M6.6 6.6C4 8.1 2.5 10.6 2.5 12c0 2 4 7 9.5 7a10 10 0 0 0 5.4-1.6" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2.5 12c0-2 4-7 9.5-7s9.5 5 9.5 7-4 7-9.5 7-9.5-5-9.5-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {state?.error && <p className="admin-error">{state.error}</p>}
      <button type="submit" className="admin-btn" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}

/** the five ready-made sets (any other mix: tick the events) */
const PRESETS: string[][] = [
  ["mehendi", "haldi", "garba", "gujarati", "church"],
  ["gujarati"],
  ["church"],
  ["garba", "gujarati", "church"],
  ["gujarati", "church"],
];

export function AdminPanel({ events }: { events: Ev[] }) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [made, setMade] = useState<{ url: string; label: string }[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [pending, start] = useTransition();
  const titleOf = (id: string) => events.find((e) => e.id === id)?.title ?? id;
  const labelOf = (ids: string[]) => (ids.length === events.length ? "All events" : ids.map(titleOf).join(" + "));
  const ordered = (ids: string[]) => events.map((e) => e.id).filter((id) => ids.includes(id));

  const make = (ids: string[]) => {
    setError("");
    start(async () => {
      const r = await createLink(ids);
      if ("error" in r) return setError(r.error);
      const url = `${window.location.origin}${r.path}`;
      setMade((m) => [{ url, label: labelOf(ordered(ids)) }, ...m.filter((x) => x.url !== url)]);
    });
  };
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied((c) => (c === url ? "" : c)), 1600);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  return (
    <div className="admin-panel">
      <section>
        <h2 className="admin-h2">Quick links</h2>
        <div className="admin-presets">
          {PRESETS.map((ids) => (
            <button key={ids.join()} type="button" className="admin-preset" disabled={pending} onClick={() => make(ids)}>
              {labelOf(ids)}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="admin-h2">Or choose events</h2>
        <ul className="admin-events">
          {events.map((e) => (
            <li key={e.id}>
              <label className="admin-event">
                <input
                  type="checkbox"
                  checked={chosen.includes(e.id)}
                  onChange={(ev) => setChosen((c) => (ev.target.checked ? [...c, e.id] : c.filter((x) => x !== e.id)))}
                />
                <span>
                  <strong>{e.title}</strong>
                  <small>{e.when}</small>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <button type="button" className="admin-btn" disabled={pending || !chosen.length} onClick={() => make(chosen)}>
          {pending ? "Creating…" : "Create link"}
        </button>
        {error && <p className="admin-error">{error}</p>}
      </section>

      {made.length > 0 && (
        <section>
          <h2 className="admin-h2">Your links</h2>
          <ul className="admin-links">
            {made.map((m) => (
              <li key={m.url} className="admin-link">
                <span className="admin-link-label">{m.label}</span>
                <code className="admin-link-url">{m.url}</code>
                <span className="admin-link-actions">
                  <button type="button" className="admin-small" onClick={() => copy(m.url)}>
                    {copied === m.url ? "Copied" : "Copy"}
                  </button>
                  <a className="admin-small" href={m.url} target="_blank" rel="noopener noreferrer">
                    Open
                  </a>
                </span>
              </li>
            ))}
          </ul>
          <p className="admin-muted">The same events always give the same link, so you can make one again any time.</p>
        </section>
      )}

      <form action={logout}>
        <button type="submit" className="admin-signout">
          Sign out
        </button>
      </form>
    </div>
  );
}
