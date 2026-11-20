import { Suspense } from "react";
import type { Metadata } from "next";
import { isAdmin, usingDefaultPassword } from "@/src/lib/adminAuth";
import { usingFallbackSecret } from "@/src/lib/inviteLink";
import { EVENTS } from "@/src/content/events";
import { AdminLogin, AdminPanel } from "./AdminUI";

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
      <AdminPanel events={EVENTS.map((e) => ({ id: e.id, title: e.title, when: `${e.weekday.slice(0, 3)} ${e.day} ${e.month} · ${e.time}` }))} />
    </>
  );
}
