/**
 * Builds the perched-dove sprite from its green-screen sheet (the doves land on the wax seal).
 *
 *   node scripts/build-dove-perch.mjs
 *
 * In:  assets-src/dove-perch-green.webp  (4 poses of one dove facing right on #00FF00:
 *      landing, just landed, sitting, sitting and cooing)
 * Out: public/doves/dove-perch.webp      (the 4 frames in one row, transparent, with the same
 *                                         warm glow as the flying doves)
 *      public/doves/dove-perch.json      (frame size, count, the feet point every frame shares)
 *
 * Every frame is cut on the same canvas with the bird's feet on the same pixel, so swapping
 * frames never moves the bird (it stays standing on the seal).
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromaKey } from "./lib/chroma-key.mjs";

const SRC = "assets-src/dove-perch-green.webp";
const OUT = "public/doves";
const KEY = { lo: 28, hi: 110 }; // as the flying doves
const GLOW = { color: [0xff, 0xe7, 0xb8], opacity: 0.35, sigma: 9 };
const PAD = 26;
/** the four poses on the sheet: their box, and where their feet stand (sheet px) */
const POSES = [
  { name: "landing", box: [64, 250, 391, 695], feet: [262, 629] },
  { name: "landed", box: [411, 427, 775, 677], feet: [640, 672] },
  { name: "sitting", box: [801, 450, 1130, 676], feet: [990, 672] },
  { name: "cooing", box: [1164, 471, 1489, 676], feet: [1352, 672] },
];

const { data: rgb, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const { rgba } = chromaKey(rgb, W * H, { ...KEY, screen: "green" });

// one canvas for all: as far left / right / up / down of the feet as any pose reaches
const L = Math.max(...POSES.map((p) => p.feet[0] - p.box[0])) + PAD;
const R = Math.max(...POSES.map((p) => p.box[2] - p.feet[0])) + PAD;
const U = Math.max(...POSES.map((p) => p.feet[1] - p.box[1])) + PAD;
const D = Math.max(...POSES.map((p) => p.box[3] - p.feet[1])) + PAD;
const FW = L + R;
const FH = U + D;

const frames = [];
for (const p of POSES) {
  const px = Buffer.alloc(FW * FH * 4);
  const [x0, y0, x1, y1] = p.box;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const fx = x - p.feet[0] + L;
      const fy = y - p.feet[1] + U;
      if (fx < 0 || fy < 0 || fx >= FW || fy >= FH) continue;
      rgba.copy(px, (fy * FW + fx) * 4, (y * W + x) * 4, (y * W + x) * 4 + 4);
    }
  // the warm glow: the bird's blurred silhouette, tinted, behind it
  const sil = Buffer.alloc(FW * FH);
  for (let i = 0; i < FW * FH; i++) sil[i] = px[i * 4 + 3];
  const blur = await sharp(sil, { raw: { width: FW, height: FH, channels: 1 } }).blur(GLOW.sigma).extractChannel(0).raw().toBuffer();
  const out = Buffer.alloc(FW * FH * 4);
  for (let i = 0; i < FW * FH; i++) {
    const a = px[i * 4 + 3] / 255;
    const g = (blur[i] / 255) * GLOW.opacity;
    const ga = g * (1 - a);
    const oa = a + ga;
    for (let c = 0; c < 3; c++) out[i * 4 + c] = oa ? Math.round((px[i * 4 + c] * a + GLOW.color[c] * ga) / oa) : 0;
    out[i * 4 + 3] = Math.round(oa * 255);
  }
  frames.push(out);
}

const strip = Buffer.alloc(FW * 4 * FH * frames.length);
frames.forEach((f, k) => {
  for (let y = 0; y < FH; y++) f.copy(strip, (y * FW * frames.length + k * FW) * 4, y * FW * 4, (y + 1) * FW * 4);
});
mkdirSync(OUT, { recursive: true });
await sharp(strip, { raw: { width: FW * frames.length, height: FH, channels: 4 } }).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(`${OUT}/dove-perch.webp`);
// the sitting bird's own width (beak to tail), as a share of the frame: for sizing it on the seal
const sit = POSES[2];
writeFileSync(
  `${OUT}/dove-perch.json`,
  JSON.stringify(
    {
      frameWidth: FW,
      frameHeight: FH,
      frameCount: frames.length,
      frames: POSES.map((p) => p.name),
      feet: { x: L, y: U },
      bodyWidth: sit.box[2] - sit.box[0],
      /** the sitting bird's box in the frame (left, top, right, bottom) */
      sitBox: [sit.box[0] - sit.feet[0] + L, sit.box[1] - sit.feet[1] + U, sit.box[2] - sit.feet[0] + L, sit.box[3] - sit.feet[1] + U],
    },
    null,
    2,
  ) + "\n",
);
console.log(`✔ ${frames.length} perched frames ${FW}×${FH} → ${OUT}/dove-perch.webp`);
