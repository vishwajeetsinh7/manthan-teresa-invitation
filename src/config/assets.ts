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
  /** Optional ready-made drapes; otherwise drapes are cut from velvetTexture */
  drapeTopLeft: `${A}/velvet/drape-top-left.png`,
  drapeBottomRight: `${A}/velvet/drape-bottom-right.png`,
  /** Seam-free crop of the envelope's own velvet (from the video poster) */
  velvetTexture: `${A}/velvet/velvet-texture.webp`,
  seal: `${A}/seal/wax-seal-tm.png`,
  /** 1 burgundy rose · 2 blush rose · 3 ivory rose · 4 raspberry ranunculus */
  flowers: [1, 2, 3, 4].map((n) => `${A}/flowers/flower-${n}-open.png`),
  rosebud: `${A}/flowers/rosebud.png`,
  leaves: [1, 2, 3, 4, 5].map((n) => `${A}/leaves/leaf-${n}.png`),
  petals: [1, 2, 3].map((n) => `${A}/petals/petal-${n}.png`),
  music: `${A}/audio/music.mp3`,
  og: `${A}/og.jpg`,
} as const;
