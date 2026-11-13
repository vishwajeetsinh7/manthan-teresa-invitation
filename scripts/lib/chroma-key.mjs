/**
 * Green- or blue-screen key shared by the sprite / asset builders.
 *
 * Alpha ramps smoothly from 1 → 0 as the screen colour's dominance —
 * g − max(r, b) for green, b − max(r, g) for blue — goes lo → hi, so soft
 * edges (feathers, hair, jasmine) stay soft. Semi-transparent pixels are
 * un-mixed from the screen colour, then despilled (the screen channel may
 * never exceed the brighter of the other two), so no coloured fringe is
 * left on light edges such as ivory sarees, white flowers or gold trim.
 *
 * Raise `lo` when the subject itself has colours close to the screen.
 *
 * `cap` (blue screen only): the subject is never bluer than cap × its green
 * (true of warm, white and green art). Where a blue-leaning pixel still is,
 * it is screen showing through: alpha is lowered until the blue is explained.
 * Only pixels whose blue is near their strongest channel AND clearly above
 * their green are touched, so crimson, maroon and pink (far below red) and
 * white-hot flame cores (blue below green) stay solid. cap 1 just
 * removes any blue/purple tint; a small cap (≈0.15) recovers half-transparent
 * warm haze (a turmeric puff over blue reads purple, not orange, otherwise).
 */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * @param {Buffer} rgb   raw RGB pixels
 * @param {number} n     pixel count
 * @param {{ lo: number, hi: number, screen?: "green" | "blue", bg?: [number, number, number], cap?: number, despill?: boolean }} key
 * @returns {{ rgba: Buffer, alpha: Float32Array }}
 */
export function chromaKey(rgb, n, { lo, hi, screen = "green", bg, cap, despill = true }) {
  const S = screen === "blue" ? 2 : 1; // the screen's channel
  const [o1, o2] = screen === "blue" ? [0, 1] : [0, 2]; // the other two
  const BG = bg ?? (screen === "blue" ? [0, 0, 255] : [0, 255, 0]);
  const rgba = Buffer.alloc(n * 4);
  const alpha = new Float32Array(n);
  const c = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    c[0] = rgb[i * 3];
    c[1] = rgb[i * 3 + 1];
    c[2] = rgb[i * 3 + 2];
    let a = 1 - smooth(lo, hi, c[S] - Math.max(c[o1], c[o2]));
    // which pixels may be screen showing through: a warm-only piece (cap < 1) has
    // no pinks or reds to protect, so any blue above green counts there
    const bluish = c[2] > c[1] + 10 && (cap < 1 || c[2] > 0.85 * Math.max(c[0], c[1]));
    if (cap !== undefined && screen === "blue" && a > 0 && bluish) {
      // solve F_b = cap · F_g for alpha; never raise it
      const a2 = 1 - (c[2] - cap * c[1]) / (BG[2] - cap * BG[1]);
      if (a2 < a) a = Math.max(0, a2);
    }
    alpha[i] = a;
    if (a > 0 && a < 1) {
      // un-mix the screen: C = a·F + (1 − a)·BG  →  F
      for (let k = 0; k < 3; k++) c[k] = clamp((c[k] - (1 - a) * BG[k]) / a, 0, 255);
    }
    if (despill) c[S] = Math.min(c[S], Math.max(c[o1], c[o2])); // despill (off for a violet piece)
    rgba[i * 4] = c[0];
    rgba[i * 4 + 1] = c[1];
    rgba[i * 4 + 2] = c[2];
    rgba[i * 4 + 3] = Math.round(a * 255);
  }
  return { rgba, alpha };
}

/**
 * Key a picture painted on BLACK with a soft warm glow round it (no screen colour to subtract):
 * the background is flood-filled in from the image's border through pixels that are near-black,
 * or smooth (no painted texture) and either dark or warm with almost no blue (the glow). Painted
 * detail stops the fill, so the subject's own dark or golden areas stay. The edge is softened a
 * little; nothing is un-mixed (the glow is not a known colour).
 *
 * @param {Buffer} rgb  raw RGB pixels
 * @param {number} W
 * @param {number} H
 * @param {{ tex?: number, dark?: number, blueRatio?: number, soft?: number }} o
 *   tex: texture (mean 2px luminance step) at which the fill stops; dark: luminance below which a
 *   smooth pixel is background; blueRatio: smooth pixels with blue / red below this are glow
 * @returns {Promise<{ rgba: Buffer, alpha: Float32Array }>}
 */
export async function glowKey(rgb, W, H, o = {}) {
  const { default: sharp } = await import("sharp");
  const TEX = o.tex ?? 6;
  const DARK = o.dark ?? 120;
  const BR = o.blueRatio ?? 0.2;
  const N = W * H;
  const lum = new Float32Array(N);
  for (let i = 0; i < N; i++) lum[i] = 0.3 * rgb[i * 3] + 0.59 * rgb[i * 3 + 1] + 0.11 * rgb[i * 3 + 2];
  const tex = new Float32Array(N);
  for (let y = 2; y < H - 2; y++)
    for (let x = 2; x < W - 2; x++) {
      const i = y * W + x;
      let s = 0;
      for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2], [2, -2], [-2, 2]]) s += Math.abs(lum[i] - lum[i + dy * W + dx]);
      tex[i] = s / 8;
    }
  const isBg = (i) => {
    if (lum[i] < 22) return true;
    if (tex[i] >= TEX) return false;
    if (lum[i] < DARK) return true;
    return rgb[i * 3 + 2] / Math.max(1, rgb[i * 3]) < BR;
  };
  const bg = new Uint8Array(N);
  const q = [];
  const seed = (i) => {
    if (!bg[i] && isBg(i)) {
      bg[i] = 1;
      q.push(i);
    }
  };
  for (let x = 0; x < W; x++) {
    seed(x);
    seed((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    seed(y * W);
    seed(y * W + W - 1);
  }
  while (q.length) {
    const p = q.pop();
    const x = p % W;
    for (const n of [p - 1, p + 1, p - W, p + W]) {
      if (n < 0 || n >= N || bg[n]) continue;
      if ((n === p - 1 && x === 0) || (n === p + 1 && x === W - 1)) continue;
      if (isBg(n)) {
        bg[n] = 1;
        q.push(n);
      }
    }
  }
  const mask = Buffer.alloc(N);
  for (let i = 0; i < N; i++) mask[i] = bg[i] ? 0 : 255;
  const soft = await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).blur(o.soft ?? 1.2).extractChannel(0).raw().toBuffer();
  const rgba = Buffer.alloc(N * 4);
  const alpha = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = clamp((soft[i] - 60) * 1.4, 0, 255);
    rgb.copy(rgba, i * 4, i * 3, i * 3 + 3);
    rgba[i * 4 + 3] = a;
    alpha[i] = a / 255;
  }
  return { rgba, alpha };
}
