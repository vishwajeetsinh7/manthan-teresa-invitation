import "server-only";
/**
 * The events and the venue. Server only: a page passes on just the events its
 * invitation link opens (src/lib/inviteLink.ts), so a guest's browser never
 * receives the others. Edit freely; keep each `id` as it is (links refer to them).
 *
 * `mood` recolours the page while the event is on screen (src/config/moods.ts);
 * `scene` is the illustrated scene under it (src/components/scenes/*Scene);
 * `icons` the gold line icons beside it; `flower` what the travelling rose turns
 * into; `atVenue` shows the venue page with it. See src/content/types.ts.
 */
import type { EventData, EventId, InviteData, Venue } from "./types";

/** directions to the venue (Element Events) for the events held there */
const ELEMENT_EVENTS = "https://maps.app.goo.gl/BbYLqSbYiXJDMwMD8";

export const VENUE: Venue = {
  name: "",
  address: "7 Coorparoo Rd, Brisbane QLD 4500, Australia",
  mapsUrl: ELEMENT_EVENTS,
};

export const EVENTS: EventData[] = [
  {
    id: "mehendi",
    day: "23",
    month: "May",
    weekday: "Sunday",
    start: "2027-05-23T09:00:00+10:00", // Queensland time (AEST, no daylight saving)
    title: "Mehendi",
    time: "9:00 AM – 11:00 AM",
    place: "",
    mapsUrl: ELEMENT_EVENTS,
    note: "",
    icons: ["mehndi"],
    pattern: "mehndi", // the henna mandala beside the details (it draws itself, then turns slowly)
    scene: "mehndi",
    flower: { kind: 3 }, // raspberry — henna red
    atVenue: true,
  },
  {
    id: "haldi",
    day: "23",
    month: "May",
    weekday: "Sunday",
    start: "2027-05-23T12:00:00+10:00",
    title: "Haldi",
    scene: "haldi", // "The Golden Swing"
    time: "12:00 PM – 2:00 PM",
    place: "",
    mapsUrl: ELEMENT_EVENTS,
    note: "",
    mood: "haldi",
    icons: ["haldi"],
    flower: { kind: 2 },
    atVenue: true,
  },
  {
    id: "garba",
    day: "23",
    month: "May",
    weekday: "Sunday",
    start: "2027-05-23T16:00:00+10:00",
    title: "Dance Night / Garba",
    scene: "garba-dance", // "Raas to Remix"
    time: "4:00 PM – 7:30 PM",
    place: "",
    mapsUrl: ELEMENT_EVENTS,
    note: "",
    icons: ["dandiya", "music"], // the dandiya in the garba, music notes on the dance floor
    flower: { kind: 1 }, // blush
    atVenue: true,
  },
  {
    id: "gujarati",
    day: "24",
    month: "May",
    weekday: "Monday",
    start: "2027-05-24T07:30:00+10:00",
    title: "Gujarati Wedding",
    // "Swarg Kamal", the heavenly lotus (the first version, the mandap: "hindu-wedding" — git tag hindu-wedding-mandap)
    scene: "hindu-lotus",
    time: "7:30 AM",
    place: "",
    mapsUrl: ELEMENT_EVENTS,
    note: "",
    icons: ["mandap"],
    flower: { kind: 0 }, // deep red bridal rose
    atVenue: true,
  },
  {
    id: "church",
    day: "25",
    month: "May",
    weekday: "Tuesday",
    start: "2027-05-25T10:30:00+10:00",
    title: "Church Wedding",
    scene: "church-wedding", // "The Aisle"
    time: "10:30 AM – 12:00 PM",
    place: "Holy Spirit Church, New Farm",
    mapsUrl: "https://maps.app.goo.gl/tS7JUhbfyfSPuu6GA",
    after: { label: "Reception afterwards at Barrel N Basket." },
    note: "",
    icons: ["church"],
    flower: { kind: 2 }, // ivory — white wedding
  },
];

export const EVENT_IDS = EVENTS.map((e) => e.id);

/** What an invitation with these events shows (in the schedule's order). No events: the card alone. */
export function inviteFor(ids: readonly EventId[], code: string | null = null): InviteData {
  const events = EVENTS.filter((e) => ids.includes(e.id));
  const days: InviteData["days"] = [];
  for (const e of events) if (!days.some((d) => d.day === e.day)) days.push({ day: e.day, weekday: e.weekday.slice(0, 3) });
  const nums = days.map((d) => d.day);
  const month = events[0]?.month ?? "May";
  const dateLine = !nums.length
    ? `${month} 2027`
    : nums.length === 1
      ? `${nums[0]} ${month} 2027`
      : nums.every((n, i) => i === 0 || +n === +nums[i - 1] + 1)
        ? `${nums[0]} – ${nums[nums.length - 1]} ${month} 2027`
        : `${nums.slice(0, -1).join(", ")} & ${nums[nums.length - 1]} ${month} 2027`;
  return {
    events,
    days,
    dateLine,
    countdownTo: events[0]?.start ?? null,
    venue: events.some((e) => e.atVenue) ? VENUE : null,
    code: events.length ? code : null,
  };
}
