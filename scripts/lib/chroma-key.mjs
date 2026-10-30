/**
 * Green-screen key shared by the sprite builders.
 *
 * Alpha ramps smoothly from 1 → 0 as green dominance, g − max(r, b), goes
 * lo → hi, so soft edges (feathers, hair) stay soft. Semi-transparent pixels
 * are un-mixed from the green screen, then despilled (green may never exceed
 * the brighter of red / blue), so no green fringe is left on light edges.
 *
 * Raise `lo` when the subject itself has greenish colours (an olive blouse
 * has a dominance of ~20–40; the screen ~245).
 */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * @param {Buffer} rgb   raw RGB pixels
 * @param {number} n     pixel count
 * @param {{ lo: number, hi: number }} key
 * @returns {{ rgba: Buffer, alpha: Float32Array }}
 */
export function chromaKey(rgb, n, { lo, hi }) {
  const rgba = Buffer.alloc(n * 4);
  const alpha = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = rgb[i * 3];
    const g = rgb[i * 3 + 1];
    const b = rgb[i * 3 + 2];
    const a = 1 - smooth(lo, hi, g - Math.max(r, b));
    alpha[i] = a;
    let R = r;
    let G = g;
    let B = b;
    if (a > 0 && a < 1) {
      // un-mix the green screen: C = a·F + (1 − a)·(0, 255, 0)  →  F
      R = clamp(r / a, 0, 255);
      B = clamp(b / a, 0, 255);
      G = clamp((g - (1 - a) * 255) / a, 0, 255);
    }
    G = Math.min(G, Math.max(R, B)); // despill
    rgba[i * 4] = R;
    rgba[i * 4 + 1] = G;
    rgba[i * 4 + 2] = B;
    rgba[i * 4 + 3] = Math.round(a * 255);
  }
  return { rgba, alpha };
}
