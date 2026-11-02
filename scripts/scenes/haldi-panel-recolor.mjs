/**
 * The closed curtain panel that parts at the start of the Haldi scene, recoloured
 * to match the new tied-back curtains (curtains-v2.png): ivory fabric and a green
 * kasavu border with the mirrors kept. Reads curtain-new.png (yellow, on blue),
 * writes curtain-new-white.png (still on blue, for the usual key).
 *
 *   node scripts/scenes/haldi-panel-recolor.mjs
 */
import sharp from "sharp";

const SRC = "assets-src/haldi/curtain-new.png";
const OUT = "assets-src/haldi/curtain-new-white.png";
const IVORY = [248, 243, 229];
const GREEN = [46, 107, 48];
const GOLD_LINE = [212, 172, 74];

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const out = Buffer.from(data);
const px = (x, y) => {
  const o = (y * W + x) * 3;
  return [data[o], data[o + 1], data[o + 2]];
};
const lum = (r, g, b) => (0.3 * r + 0.59 * g + 0.11 * b) / 255;
const satOf = (r, g, b) => (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, Math.max(r, g, b));
const isBlue = (r, g, b) => b > g + 40 && b > r + 40;
/** pattern in the border (olive diamonds, dark lines, white mirrors) — the plain fabric has none */
const isPattern = (r, g, b) => (satOf(r, g, b) < 0.3 && lum(r, g, b) > 0.6) || (g > 0.62 * r && r < 175 && b < 120);
const median = (arr, k) => arr.map((_, i) => {
  const w = arr.slice(Math.max(0, i - k), i + k + 1).filter((v) => v != null).sort((m, n) => m - n);
  return w.length ? w[w.length >> 1] : null;
});

// the hem band: per column, where the pattern starts (scanning down), less its gold rim
let hemTop = Array.from({ length: W }, (_, x) => {
  for (let y = 1200; y < H; y++) {
    const c = px(x, y);
    if (isBlue(...c)) continue;
    if (isPattern(...c)) return y - 16;
  }
  return null;
});
hemTop = median(hemTop, 13);
// the edge band: per row, where the pattern starts (scanning right), less its rim
let edgeLeft = Array.from({ length: H }, (_, y) => {
  for (let x = 680; x < W; x++) {
    const c = px(x, y);
    if (isBlue(...c)) break;
    if (isPattern(...c)) return x - 10;
  }
  return null;
});
edgeLeft = median(edgeLeft, 41);
const inBorder = (x, y) => (hemTop[x] != null && y >= hemTop[x]) || (edgeLeft[y] != null && x >= edgeLeft[y]);

for (let i = 0; i < W * H; i++) {
  const o = i * 3;
  const [r, g, b] = [data[o], data[o + 1], data[o + 2]];
  if (isBlue(r, g, b)) continue; // the screen stays
  const x = i % W;
  const y = (i - x) / W;
  const l = lum(r, g, b);
  let c;
  if (!inBorder(x, y)) {
    // fabric: the yellow becomes warm ivory, its folds kept as light and shade
    c = IVORY.map((v) => v * Math.min(1.06, Math.max(0.58, l / 0.8)));
  } else if (satOf(r, g, b) < 0.3 && l > 0.6) {
    c = [r, g, b]; // mirrors and white beads: keep
  } else if (l > 0.8 && satOf(r, g, b) > 0.45) {
    c = GOLD_LINE.map((v) => v * Math.min(1.08, l / 0.85)); // the brightest gold glints stay gold
  } else {
    c = GREEN.map((v) => v * Math.min(1.3, Math.max(0.45, l / 0.62))); // the band: leaf green, shaded
  }
  out[o] = Math.min(255, c[0]);
  out[o + 1] = Math.min(255, c[1]);
  out[o + 2] = Math.min(255, c[2]);
}
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(OUT);
console.log("✔", OUT);
