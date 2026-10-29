/**
 * Event "moods": while an event with `mood` is on screen, the page takes on
 * its colour — a glow around the edges, a tinted card, and the iPhone's top
 * bar (Safari's `theme-color` + the status-bar area). Scrolling away eases back.
 */
export const moods = {
  haldi: {
    /** iPhone / Android browser top bar while Haldi is on screen */
    themeColor: "#F2C12E",
  },
} as const;

export type MoodName = keyof typeof moods;

/** Default browser top-bar colour (matches the envelope) */
export const defaultThemeColor = "#4A0A12";
