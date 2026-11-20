import { Suspense } from "react";
import type { Metadata } from "next";
import { isAdmin, usingDefaultPassword } from "@/src/lib/adminAuth";
import { usingFallbackSecret } from "@/src/lib/inviteLink";
import { EVENTS } from "@/src/content/events";
import { AdminLogin, AdminPanel } from "./AdminUI";
import { ensureTabs, sheetConfigured, sheetUrl } from "@/src/lib/rsvpSheet";

export const metadata: Metadata = { title: "Invitation links", robots: { index: false, follow: false } };

/** /admin: sign in, choose events, get a link that opens just those */
export default function AdminPage() {
  return (
    <div className="admin">
      <div className="admin-card">
        <h1 className="admin-title">Invitation links</h1>
        <Suspense fallback={<p className="admin-muted">Loading…</p>}>
          <Gate />
        </Suspense>
      </div>
    </div>
  );
}

async function Gate() {
  if (!(await isAdmin())) return <AdminLogin />;
  const notes = [
    usingDefaultPassword() && "the default password (set ADMIN_PASSWORD to change it)",
    usingFallbackSecret() && "the built-in link secret (set INVITE_SECRET before sending links: changing it later stops the links already sent)",
  ].filter(Boolean) as string[];
  return (
    <>
      {notes.length > 0 && <p className="admin-note">Using {notes.join(" and ")}.</p>}
      <RsvpSheetStatus />
      <AdminPanel events={EVENTS.map((e) => ({ id: e.id, title: e.title, when: `${e.weekday.slice(0, 3)} ${e.day} ${e.month} · ${e.time}` }))} />
    </>
  );
}

/** where the RSVPs go (making sure its tabs exist) */
async function RsvpSheetStatus() {
  if (!sheetConfigured()) return <p className="admin-note">RSVPs: the Google Sheet isn&apos;t connected (set GOOGLE_SA_EMAIL and GOOGLE_SA_PRIVATE_KEY).</p>;
  let title = "";
  let problem = "";
  try {
    title = await ensureTabs(EVENTS);
  } catch (err) {
    problem = err instanceof Error ? err.message.slice(0, 120) : "error";
  }
  if (problem) return <p className="admin-note">RSVPs: couldn&apos;t reach the Google Sheet ({problem}). Is it shared with the service account as an Editor?</p>;
  return (
    <p className="admin-sheet">
      RSVPs go to{" "}
      <a href={sheetUrl()} target="_blank" rel="noopener noreferrer">
        {title}
      </a>{" "}
      (an &ldquo;All RSVPs&rdquo; tab and one per event).
    </p>
  );
}
