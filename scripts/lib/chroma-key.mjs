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
 * @param {{ lo: number, hi: number, screen?: "green" | "blue", bg?: [number, number, number], cap?: number }} key
 * @returns {{ rgba: Buffer, alpha: Float32Array }}
 */
export function chromaKey(rgb, n, { lo, hi, screen = "green", bg, cap }) {
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
    c[S] = Math.min(c[S], Math.max(c[o1], c[o2])); // despill
    rgba[i * 4] = c[0];
    rgba[i * 4 + 1] = c[1];
    rgba[i * 4 + 2] = c[2];
    rgba[i * 4 + 3] = Math.round(a * 255);
  }
  return { rgba, alpha };
}
