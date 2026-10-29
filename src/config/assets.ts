/**
 * Asset paths (under /public). Images are small pre-sized WebP files made by
 * `node scripts/prepare-assets.mjs "<raw folder>"` from the masters in
 * assets-src/ — they are served as-is (no on-demand resizing), so they load
 * fast even on a cold CDN. Missing files still fall back to placeholders.
 */
const A = "/assets";

export const assets = {
  video: {
    mp4: `${A}/video/envelope.mp4`,
    webm: `${A}/video/envelope.webm`,
    poster: `${A}/video/envelope-poster.webp`,
  },
  /** seamless (top-to-bottom) paper used for the whole page — referenced in globals.css */
  paperTile: `${A}/bg/paper-tile.webp`,
  /** seamless velvet tile that flows inside the corner drapes */
  velvetTile: `${A}/velvet/velvet-tile.webp`,
  seal: `${A}/seal/wax-seal-tm.webp`,
  /** 1 burgundy rose · 2 blush rose · 3 ivory rose · 4 raspberry ranunculus */
  flowers: [1, 2, 3, 4].map((n) => `${A}/flowers/flower-${n}.webp`),
  rosebud: `${A}/flowers/rosebud.webp`,
  leaves: [1, 2, 3, 4, 5].map((n) => `${A}/leaves/leaf-${n}.webp`),
  petals: [1, 2, 3].map((n) => `${A}/petals/petal-${n}.webp`),
  music: `${A}/audio/music.mp3`,
  og: `${A}/og.jpg`,
} as const;

/** Everything the reveal shows, so it can be fetched before it is needed. */
export const revealImages: string[] = [
  assets.paperTile,
  assets.velvetTile,
  assets.seal,
  ...assets.flowers,
  assets.rosebud,
  ...assets.leaves,
  ...assets.petals,
];
