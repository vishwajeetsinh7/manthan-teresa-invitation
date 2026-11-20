/**
 * All wording on the invitation lives here.
 * Edit text freely — no component changes needed.
 * Items marked PLACEHOLDER are waiting for the real details.
 * (The events, their dates and the venue are in src/content/events.ts, on the server only:
 *  each invitation link shows just its own events.)
 */

export const invitation = {
  /** Used for the page title and WhatsApp/social share preview. */
  // (no days here: an invitation link shows only its own events)
  shareTitle: "Teresa & Manthan · May 2027",
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

  /** The date block on the card (its days are the invitation's own) */
  dates: {
    month: "May",
    year: "2027",
  },
  venueLine: "Brisbane QLD",

  scrollHint: "Scroll",

  /** Scene 4: events (PLACEHOLDER content). */
  eventsHeading: "Celebrations",
  /** the small gold button under an event that opens its place in Google Maps */
  eventMapsLabel: "Get Directions",
  /** the venue page (its name and address are in src/content/events.ts) */
  venue: {
    heading: "The Venue",
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
