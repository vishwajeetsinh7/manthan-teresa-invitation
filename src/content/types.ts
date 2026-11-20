/**
 * What one invitation shows. The events (and the venue) live on the server only
 * (src/content/events.ts); a page gets just the events its link opens, so the
 * others never reach the guest's browser.
 */
import type { EventIconName } from "@/src/components/art/svgArt";
import type { MoodName } from "@/src/config/moods";

export type EventId = "mehendi" | "haldi" | "garba" | "gujarati" | "church";

export type EventData = {
  id: EventId;
  day: string;
  month: string;
  weekday: string;
  /** when it starts (the venue's local time), for the countdown */
  start: string;
  title: string;
  time: string;
  place: string;
  /** a smaller line under the place */
  address?: string;
  /** a small gold "Get Directions" button under the place */
  mapsUrl?: string;
  /** what follows it elsewhere (the reception) */
  after?: { label: string; address?: string };
  note: string;
  /** recolours the whole page while the event is on screen (src/config/moods.ts) */
  mood?: MoodName;
  /** gold line icons beside the event */
  icons: EventIconName[];
  /** the henna mandala beside the details */
  pattern?: "mehndi";
  /** the illustrated scene under the event (src/components/scenes/*Scene), or "soon" */
  scene?: "mehndi" | "haldi" | "garba-dance" | "hindu-wedding" | "hindu-lotus" | "church-wedding" | "soon";
  /** what the travelling rose turns into on this event: kind 0 burgundy · 1 blush · 2 ivory ·
   *  3 raspberry · 4 pale pink; tint "gold" warms it to turmeric */
  flower?: { kind: number; tint?: string };
  /** held at the venue (Element Events): its page is shown with the event */
  atVenue?: boolean;
};

export type Venue = { name: string; address: string; mapsUrl: string };

export type InviteData = {
  events: EventData[];
  /** the card's date block: only these days */
  days: { day: string; weekday: string }[];
  /** the dates in words (for screen readers) */
  dateLine: string;
  /** the countdown runs to the first event (none: no countdown) */
  countdownTo: string | null;
  /** the venue page (only when an event there is on this invitation) */
  venue: Venue | null;
  /** the invitation link's code (the RSVP sends it back, so the answer is for these events only) */
  code: string | null;
};
