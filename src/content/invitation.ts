/**
 * All wording on the invitation lives here.
 * Edit text freely — no component changes needed.
 * Items marked PLACEHOLDER are waiting for the real details.
 */

export const invitation = {
  /** Used for the page title and WhatsApp/social share preview. */
  shareTitle: "Teresa & Manthan · 23–25 May 2027",
  shareDescription: "Together with our families, we invite you to celebrate our wedding.",

  tapToOpen: "Tap to open",

  together: "Together with our families",

  bride: {
    name: "Teresa Joy",
    relation: "Daughter of",
    parents: "Joy K Mathew & Jaquiline Joy",
  },

  joiner: "with",

  groom: {
    name: "Manthan Patel",
    relation: "Son of",
    parents: "Kiritbhai Patel & Amitaben Patel",
  },

  inviteLine: "Invite you to celebrate",
  tagline: "Two Traditions, One Journey",

  dateLine: "23 – 25 May 2027",
  /** The date block on the card */
  dates: {
    month: "May",
    year: "2027",
    days: [
      { day: "23", weekday: "Sun" },
      { day: "24", weekday: "Mon" },
      { day: "25", weekday: "Tue" },
    ],
  },
  venueLine: "Brisbane QLD",

  scrollHint: "Scroll",

  /** Countdown target (local time of the venue). */
  countdownTo: "2027-05-23T09:00:00+10:00", // the Mehndi, Queensland time (AEST, no daylight saving)

  /** Scene 4: events (PLACEHOLDER content). */
  eventsHeading: "Celebrations",
  /**
   * `mood` (optional) recolours the whole page while that event is on screen —
   * see src/config/moods.ts. Only "haldi" exists for now.
   * `scene`: the illustrated scene under the event — "mehndi" / "haldi" / "garba-dance" / "hindu-wedding" / "hindu-lotus" / "church-wedding" (src/components/scenes/*Scene),
   *   or "soon": a placeholder ("Images coming soon") of the same size, until that event's art is ready.
   * `icons`: gold line icons drawn beside the event (mehndi, haldi, dandiya, mandap, church, cheers).
   * `address` (optional): a smaller line under the place; `after` (optional): what follows the
   *   event elsewhere (the reception), with its own place and address.
   * `flower`: what the travelling rose turns into on this event —
   *   kind 0 burgundy · 1 blush · 2 ivory · 3 raspberry · 4 pale pink; tint "gold" warms it to turmeric.
   */
  events: [
    {
      day: "23",
      month: "May",
      weekday: "Sunday",
      title: "Mehndi",
      time: "9:00 AM – 11:00 AM",
      place: "",
      note: "Festive colours", // PLACEHOLDER
      icons: ["mehndi"],
      pattern: "mehndi", // the henna mandala beside the details (it draws itself, then turns slowly)
      scene: "mehndi", // the assembled Mehndi scene
      flower: { kind: 3 }, // raspberry — henna red
    },
    {
      day: "23",
      month: "May",
      weekday: "Sunday",
      title: "Haldi",
      scene: "haldi", // "The Golden Swing"
      time: "12:00 PM – 2:00 PM",
      place: "",
      note: "",
      mood: "haldi",
      icons: ["haldi"],
      flower: { kind: 2 }, // flower-3
    },
    {
      day: "23",
      month: "May",
      weekday: "Sunday",
      title: "Sangeet & Garba",
      scene: "garba-dance", // "Raas to Remix"
      time: "4:00 PM – 7:30 PM",
      place: "",
      note: "Dance Night · Dandiya & dancing shoes",
      icons: ["dandiya", "music"], // the dandiya in the garba, music notes on the dance floor
      flower: { kind: 1 }, // blush
    },
    {
      day: "24",
      month: "May",
      weekday: "Monday",
      title: "Gujarati Wedding",
      // "Swarg Kamal", the heavenly lotus (the first version, the mandap: "hindu-wedding" — git tag hindu-wedding-mandap)
      scene: "hindu-lotus",
      time: "10:30 AM", // (for now: it may change)
      place: "",
      note: "Traditional Indian", // PLACEHOLDER
      icons: ["mandap"],
      flower: { kind: 0 }, // deep red bridal rose
    },
    {
      day: "25",
      month: "May",
      weekday: "Tuesday",
      title: "Church Wedding", // (the reception follows: `after`)
      scene: "church-wedding", // "The Aisle"
      time: "10:30 AM – 12:00 PM",
      place: "Holy Spirit Church, New Farm",
      address: "16 Villiers St, New Farm QLD 4005",
      after: { label: "Reception afterwards at Barrel N Basket", address: "Unit 6/547 Kessels Rd, MacGregor QLD 4109" },
      note: "", // (no room under the reception; a dress code could go here if the lines are shortened)
      icons: ["church"],
      flower: { kind: 2 }, // ivory — white wedding
    },
  ],

  venue: {
    heading: "The Venue",
    name: "",
    address: "7 Coorparoo Rd, Brisbane QLD 4500, Australia",
    mapsUrl: "https://maps.app.goo.gl/BbYLqSbYiXJDMwMD8",
    mapsLabel: "Open in Google Maps",
  },

  countdown: {
    heading: "Counting down",
    labels: { days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds" },
    done: "Today is the day",
  },

  rsvp: {
    heading: "Kindly respond",
    body: "Your presence would make our celebration complete. Please let us know by 1 April 2027.", // PLACEHOLDER
    buttonLabel: "RSVP on WhatsApp",
    // PLACEHOLDER — replace with wa.me/<number>?text=... or a Google Form link
    url: "https://wa.me/?text=Hi!%20We%20would%20love%20to%20attend%20Teresa%20%26%20Manthan's%20wedding.",
  },

  footer: "With love, Teresa & Manthan",

  desktopNote: {
    heading: "Best viewed on your phone",
    body: "Scan to open the invitation on your phone.",
  },

  rotateNote: "Please rotate your phone",
  rotateSub: "This invitation is designed for portrait view.",
} as const;

export type Invitation = typeof invitation;
