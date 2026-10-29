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
    parents: "Joy K Mathew & Jaquline Joy",
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
  venueLine: "The Grand Palace, Ahmedabad", // PLACEHOLDER

  scrollHint: "Scroll",

  /** Countdown target (local time of the venue). */
  countdownTo: "2027-05-23T17:00:00+05:30",

  /** Scene 4: events (PLACEHOLDER content). */
  eventsHeading: "Celebrations",
  events: [
    {
      day: "23",
      month: "May",
      weekday: "Sunday",
      title: "Mehendi & Sangeet",
      time: "5:00 PM onwards",
      place: "Garden Lawns",
      note: "Festive colours",
    },
    {
      day: "24",
      month: "May",
      weekday: "Monday",
      title: "Haldi & Hindu Wedding",
      time: "10:00 AM onwards",
      place: "The Grand Palace",
      note: "Traditional Indian",
    },
    {
      day: "25",
      month: "May",
      weekday: "Tuesday",
      title: "Church Wedding & Reception",
      time: "4:00 PM onwards",
      place: "St. Mary's Church",
      note: "Formal / Gowns & Suits",
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
