import "server-only";
/**
 * RSVPs go to a Google Sheet, written by a Google service account (no extra
 * library: a signed JWT for an access token, then the Sheets REST API).
 *
 * Environment variables (server only):
 *   GOOGLE_SA_EMAIL        the service account's email (client_email in its key file)
 *   GOOGLE_SA_PRIVATE_KEY  its private key (private_key; the \n escapes may stay as they are)
 *   RSVP_SHEET_ID          the spreadsheet (optional: defaults to the one below)
 * The spreadsheet must be shared with the service account's email as an Editor.
 *
 * Tabs: "All RSVPs" (every answer, one row each) and one tab per event (a row for
 * each guest whose invitation includes that event). They're created, with their
 * headers, the first time they're needed.
 */
import { createSign } from "node:crypto";
import type { EventData } from "@/src/content/types";
import { BUILT_IN_SA } from "./rsvpCreds";

const DEFAULT_SHEET_ID = "1JntGGJ7Gbfr-JI7HxCjJj62Z1RA28S1a7BazfxTebSI";
export const MASTER_TAB = "All RSVPs";

export const sheetId = () => process.env.RSVP_SHEET_ID || DEFAULT_SHEET_ID;
export const sheetUrl = () => `https://docs.google.com/spreadsheets/d/${sheetId()}/edit`;

/** a sheet tab's name for an event (tab names can't hold / \ ? * [ ] :) */
export const tabOf = (e: Pick<EventData, "title">) => e.title.replace(/\s*\/\s*/g, " & ").replace(/[\\?*[\]:]/g, " ");

export type RsvpAnswer = {
  name: string;
  phone: string;
  email: string;
  /** per event on the invitation: coming or not, and how many (including the guest) */
  events: { event: EventData; attending: boolean; guests: number }[];
  dietary: string;
  needs: string;
  message: string;
  /** which invitation link it came from */
  link: string;
};

export const MASTER_HEADERS = (events: EventData[]) => [
  "Submitted",
  "Name",
  "Phone",
  "Email",
  "Invited to",
  ...events.flatMap((e) => [`${e.title} – Attending`, `${e.title} – Guests`]),
  "Total guests (max of any event)",
  "Dietary",
  "Allergies / needs",
  "Message for the couple",
  "Invitation link",
];
export const EVENT_HEADERS = ["Submitted", "Name", "Phone", "Email", "Attending", "Guests", "Dietary", "Allergies / needs", "Message for the couple"];

/* ── access token (a service-account JWT, cached until shortly before it expires) ── */
let cached: { token: string; until: number } | null = null;

/** the environment's service account, else the built-in one (src/lib/rsvpCreds.ts) */
function credentials() {
  const email = process.env.GOOGLE_SA_EMAIL || BUILT_IN_SA.email;
  const key = (process.env.GOOGLE_SA_PRIVATE_KEY || BUILT_IN_SA.privateKey).replace(/\\n/g, "\n");
  return email && key ? { email, key } : null;
}
export const sheetConfigured = () => credentials() !== null;

async function token() {
  if (cached && Date.now() < cached.until) return cached.token;
  const c = credentials();
  if (!c) throw new Error("GOOGLE_SA_EMAIL / GOOGLE_SA_PRIVATE_KEY aren't set");
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const head = b64({ alg: "RS256", typ: "JWT" });
  const claim = b64({ iss: c.email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const sig = createSign("RSA-SHA256").update(`${head}.${claim}`).sign(c.key, "base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claim}.${sig}` }),
  });
  if (!r.ok) throw new Error(`Google sign-in failed (${r.status})`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, until: Date.now() + (j.expires_in - 120) * 1000 };
  return j.access_token;
}

async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId()}${path}`, {
    method: init.method ?? "GET",
    headers: { authorization: `Bearer ${await token()}`, "content-type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`Google Sheets ${r.status}: ${detail.slice(0, 200)}`);
  }
  return (await r.json()) as T;
}

const q = (tab: string) => `'${tab.replace(/'/g, "''")}'`;

/**
 * Makes sure the master tab and every event's tab exist, with their header rows (adds what's
 * missing, never touches what's there). An untouched first tab ("Sheet1", empty) becomes the
 * master tab. Returns the spreadsheet's title.
 */
export function ensureTabs(events: EventData[]) {
  // one at a time: two overlapping runs would each add the same tabs (Google then makes
  // "…_conflict…" copies)
  const run = (setup = setup.then(() => doEnsureTabs(events), () => doEnsureTabs(events)));
  return run;
}
let setup: Promise<string> = Promise.resolve("");

async function doEnsureTabs(events: EventData[]) {
  type Meta = { properties: { title: string }; sheets: { properties: { sheetId: number; title: string; index: number } }[] };
  const meta = await api<Meta>("?fields=properties.title,sheets.properties");
  const titles = meta.sheets.map((s) => s.properties.title);
  const wanted = [MASTER_TAB, ...events.map(tabOf)];
  const requests: object[] = [];
  const fresh: string[] = [];
  if (!titles.includes(MASTER_TAB)) {
    // an empty default first tab is renamed rather than left lying about
    const first = meta.sheets.find((s) => s.properties.index === 0);
    const firstEmpty =
      first && /^(Sheet1|Sheet 1)$/i.test(first.properties.title) && !(await api<{ values?: string[][] }>(`/values/${encodeURIComponent(`${q(first.properties.title)}!A1:B2`)}`)).values?.length;
    if (first && firstEmpty) requests.push({ updateSheetProperties: { properties: { sheetId: first.properties.sheetId, title: MASTER_TAB }, fields: "title" } });
    else requests.push({ addSheet: { properties: { title: MASTER_TAB, index: 0 } } });
    fresh.push(MASTER_TAB);
  }
  for (const t of wanted.slice(1)) if (!titles.includes(t)) {
    requests.push({ addSheet: { properties: { title: t } } });
    fresh.push(t);
  }
  if (requests.length) await api(":batchUpdate", { method: "POST", body: { requests } });
  if (fresh.length) {
    const data = fresh.map((t) => ({ range: `${q(t)}!A1`, values: [t === MASTER_TAB ? MASTER_HEADERS(events) : EVENT_HEADERS] }));
    await api("/values:batchUpdate", { method: "POST", body: { valueInputOption: "RAW", data } });
    // bold, frozen header rows
    const after = await api<Meta>("?fields=sheets.properties");
    const fmt = after.sheets
      .filter((s) => fresh.includes(s.properties.title))
      .flatMap((s) => [
        { repeatCell: { range: { sheetId: s.properties.sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: "userEnteredFormat.textFormat.bold" } },
        { updateSheetProperties: { properties: { sheetId: s.properties.sheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
      ]);
    if (fmt.length) await api(":batchUpdate", { method: "POST", body: { requests: fmt } });
  }
  return meta.properties.title;
}

let tabsReady = false;

/** writes one guest's answer: a row in the master tab, and one in each of their events' tabs */
export async function appendRsvp(a: RsvpAnswer, allEvents: EventData[]) {
  if (!tabsReady) {
    await ensureTabs(allEvents);
    tabsReady = true;
  }
  const at = new Date().toLocaleString("en-AU", { timeZone: "Australia/Brisbane", dateStyle: "medium", timeStyle: "short" });
  const by = new Map(a.events.map((x) => [x.event.id, x]));
  const yesNo = (x: { attending: boolean } | undefined) => (!x ? "" : x.attending ? "Yes" : "No");
  const master = [
    at,
    a.name,
    a.phone,
    a.email,
    a.events.map((x) => x.event.title).join(", "),
    ...allEvents.flatMap((e) => {
      const x = by.get(e.id);
      return [yesNo(x), x?.attending ? x.guests : ""];
    }),
    Math.max(0, ...a.events.map((x) => (x.attending ? x.guests : 0))),
    a.dietary,
    a.needs,
    a.message,
    a.link,
  ];
  const append = (tab: string, row: (string | number)[]) =>
    api(`/values/${encodeURIComponent(`${q(tab)}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: "POST", body: { values: [row] } });
  await append(MASTER_TAB, master);
  for (const x of a.events) await append(tabOf(x.event), [at, a.name, a.phone, a.email, yesNo(x), x.attending ? x.guests : 0, a.dietary, a.needs, a.message]);
}
