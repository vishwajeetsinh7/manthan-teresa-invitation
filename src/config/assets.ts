/**
 * Asset paths (under /public). Missing files fall back to built-in
 * placeholders automatically, so the site always runs.
 * Raw images → `node scripts/prepare-assets.mjs "<folder>"` cleans and places them.
 */
const A = "/assets";

export const assets = {
  video: {
    mp4: `${A}/video/envelope.mp4`,
    webm: `${A}/video/envelope.webm`,
    poster: `${A}/video/envelope-poster.webp`,
  },
  paper: `${A}/bg/paper.webp`,
  /** seamless (top-to-bottom) version used for the whole page — referenced in globals.css */
  paperTile: `${A}/bg/paper-tile.webp`,
  /**
   * Seamless velvet tile that flows inside the corner drapes.
   * Made by scripts/prepare-assets.mjs (from a raw "velvet…" image, or the envelope).
   */
  velvetTile: `${A}/velvet/velvet-tile.webp`,
  seal: `${A}/seal/wax-seal-tm.png`,
  /** 1 burgundy rose · 2 blush rose · 3 ivory rose · 4 raspberry ranunculus */
  flowers: [1, 2, 3, 4].map((n) => `${A}/flowers/flower-${n}-open.png`),
  rosebud: `${A}/flowers/rosebud.png`,
  leaves: [1, 2, 3, 4, 5].map((n) => `${A}/leaves/leaf-${n}.png`),
  petals: [1, 2, 3].map((n) => `${A}/petals/petal-${n}.png`),
  music: `${A}/audio/music.mp3`,
  og: `${A}/og.jpg`,
} as const;
