"use server";

import { EVENTS } from "@/src/content/events";
import { eventsOf } from "@/src/lib/inviteLink";
import { appendRsvp, sheetConfigured } from "@/src/lib/rsvpSheet";

export type RsvpInput = {
  name: string;
  phone: string;
  email: string;
  /** per event id on the invitation: coming or not, and how many */
  answers: Record<string, { attending: boolean; guests: number }>;
  dietary: string;
  needs: string;
  message: string;
};

const clip = (v: unknown, n: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u001f]+/g, " ")
    .trim()
    // (a leading = + - @ would make the sheet read it as a formula)
    .replace(/^[=+\-@]+/, "")
    .slice(0, n);

/**
 * A guest's RSVP, for one of their events (an event's own RSVP button) or all of them (the
 * one at the end). Only events their (signed) invitation link opens count: anything else
 * sent along is ignored.
 */
export async function submitRsvp(code: string, input: RsvpInput): Promise<{ ok: true } | { error: string }> {
  const ids = eventsOf(code);
  if (!ids) return { error: "This invitation link isn't valid." };
  const name = clip(input?.name, 100);
  const phone = clip(input?.phone, 30);
  if (!name) return { error: "Please tell us your name." };
  if (!phone) return { error: "Please add a phone number." };
  const events = EVENTS.filter((e) => ids.includes(e.id) && input?.answers?.[e.id]).map((event) => {
    const a = input?.answers?.[event.id];
    const attending = !!a?.attending;
    const guests = attending ? Math.min(20, Math.max(1, Math.round(Number(a?.guests) || 1))) : 0;
    return { event, attending, guests };
  });
  if (!events.length) return { error: "Please let us know if you can come." };
  if (!sheetConfigured()) return { error: "RSVPs can't be received just now. Please try again later." };
  try {
    await appendRsvp(
      {
        name,
        phone,
        email: clip(input?.email, 120),
        events,
        dietary: clip(input?.dietary, 40),
        needs: clip(input?.needs, 500),
        message: clip(input?.message, 1000),
        link: code,
      },
      EVENTS,
    );
    return { ok: true };
  } catch (err) {
    console.error("RSVP to the sheet failed:", err);
    return { error: "Sorry, your RSVP didn't go through. Please try again in a moment." };
  }
}
