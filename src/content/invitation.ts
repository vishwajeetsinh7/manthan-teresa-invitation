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
  venueLine: "The Grand Palace, Ahmedabad", // PLACEHOLDER

  scrollHint: "Scroll",

  /** Countdown target (local time of the venue). */
  countdownTo: "2027-05-23T17:00:00+05:30",

  /** Scene 4: events (PLACEHOLDER content). */
  eventsHeading: "Celebrations",
  /**
   * `mood` (optional) recolours the whole page while that event is on screen —
   * see src/config/moods.ts. Only "haldi" exists for now.
   * `scene`: an animated illustration under the event (public/<scene>/<scene>-sprite.webp).
   * `icons`: gold line icons drawn beside the event (mehndi, haldi, mandap, church, cheers).
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
      place: "Garden Lawns", // PLACEHOLDER
      note: "Festive colours", // PLACEHOLDER
      icons: ["mehndi"],
      pattern: "mehndi", // henna mandala under this event, drawn by the henna cone
      scene: "mehndi", // animated illustration: a friend applying henna to the bride
      flower: { kind: 3 }, // raspberry — henna red
    },
    {
      day: "24",
      month: "May",
      weekday: "Monday",
      title: "Haldi",
      time: "10:00 AM onwards", // PLACEHOLDER
      place: "The Grand Palace", // PLACEHOLDER
      note: "Wear yellow",
      mood: "haldi",
      icons: ["haldi"],
      flower: { kind: 4 }, // pale pink rose
    },
    {
      day: "24",
      month: "May",
      weekday: "Monday",
      title: "Hindu Wedding", // PLACEHOLDER
      time: "6:00 PM onwards", // PLACEHOLDER
      place: "The Grand Palace", // PLACEHOLDER
      note: "Traditional Indian", // PLACEHOLDER
      icons: ["mandap"],
      flower: { kind: 0 }, // deep red bridal rose
    },
    {
      day: "25",
      month: "May",
      weekday: "Tuesday",
      title: "Church Wedding & Reception", // PLACEHOLDER
      time: "4:00 PM onwards", // PLACEHOLDER
      place: "St. Mary's Church", // PLACEHOLDER
      note: "Formal / Gowns & Suits", // PLACEHOLDER
      icons: ["church", "cheers"],
      flower: { kind: 2 }, // ivory — white wedding
    },
  ],

  venue: {
    heading: "The Venue",
    name: "The Grand Palace", // PLACEHOLDER
    address: "SG Highway, Ahmedabad, Gujarat", // PLACEHOLDER
    mapsUrl: "https://maps.google.com/?q=Ahmedabad", // PLACEHOLDER
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
