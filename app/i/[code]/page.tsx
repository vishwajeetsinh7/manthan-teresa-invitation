import { Suspense } from "react";
import type { Metadata } from "next";
import { Invitation } from "@/src/components/Invitation";
import { inviteFor } from "@/src/content/events";
import { eventsOf } from "@/src/lib/inviteLink";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * An invitation link (made on /admin): just the events its signed code opens. A code that
 * isn't valid (edited, or made with another secret) opens nothing: the card alone.
 */
export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={<main className="stage" />}>
      <Invite params={params} />
    </Suspense>
  );
}

async function Invite({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ids = eventsOf(code);
  return <Invitation invite={ids ? inviteFor(ids, code) : inviteFor([])} />;
}
