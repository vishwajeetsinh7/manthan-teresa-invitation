/**
 * Builds the Mehndi-ceremony scene sprite (a friend applying henna to the
 * bride) from its green-screen sheet.
 *
 *   npm run mehndi
 *
 * In:  assets-src/mehndi-sheet-green.webp  (12 frames on #00FF00, a 4 × 3 grid
 *                                            with clear green gaps between frames)
 * Out: public/mehndi/mehndi-sprite.webp     (all frames in one row, transparent)
 *      public/mehndi/mehndi-sprite.json     (frameWidth, frameHeight, frameCount, fps)
 *      public/mehndi/preview.html           (loop at 1× and ½×, plus an onion skin)
 *
 * Steps: chroma key (strict, the bride's blouse is olive green) → find the
 * frames from the empty green rows / columns between them → align every frame
 * on the static base (cushion, bowl, folded legs) by template match, so only
 * hands and heads move → identical canvases → soft ground shadow → one strip.
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromaKey } from "./lib/chroma-key.mjs";

const SRC = "assets-src/mehndi-sheet-green.webp";
const OUT_DIR = "public/mehndi";

/** Frame order (1-based, source reading order). Reorder or drop frames here. */
const FRAME_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
/** playback speed baked into the JSON (the page reads it) */
const FPS = 8;

const KEY = { lo: 64, hi: 170 }; // strict: olive green (dominance ~20–40) stays opaque
const SPECK = 220; // px; smaller opaque blobs are compression specks
const PAD = 14;
const SHADOW = { opacity: 0.2, blur: 7 };
const QUALITY = 88;

const fail = (msg) => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};

/* ── 1. key ─────────────────────────────────────────────────────────── */
const { data: rgb, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const N = W * H;
const { rgba, alpha } = chromaKey(rgb, N, KEY);

// drop tiny specks (lossy-compression noise in the green)
{
  const seen = new Uint8Array(N);
  const stack = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (seen[s] || alpha[s] < 0.5) continue;
    const blob = [];
    let top = 0;
    stack[top++] = s;
    seen[s] = 1;
    while (top) {
      const p = stack[--top];
      blob.push(p);
      const x = p % W;
      for (const q of [p - 1, p + 1, p - W, p + W]) {
        if (q < 0 || q >= N || seen[q] || alpha[q] < 0.5) continue;
        if ((q === p - 1 && x === 0) || (q === p + 1 && x === W - 1)) continue;
        seen[q] = 1;
        stack[top++] = q;
      }
    }
    if (blob.length < SPECK)
      for (const p of blob) {
        alpha[p] = 0;
        rgba[p * 4 + 3] = 0;
      }
  }
}

/* ── 2. frames: split on the empty green bands ──────────────────────── */
const bands = (count, len, at) => {
  const filled = [];
  for (let k = 0; k < len; k++) filled.push(at(k) > 2);
  const runs = [];
  let start = -1;
  for (let k = 0; k <= len; k++) {
    if (k < len && filled[k]) {
      if (start < 0) start = k;
    } else if (start >= 0) {
      runs.push([start, k]);
      start = -1;
    }
  }
  // merge runs split by thin gaps (a frame's own see-through bits)
  const merged = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && r[0] - last[1] < 18) last[1] = r[1];
    else merged.push([...r]);
  }
  const big = merged.filter((r) => r[1] - r[0] > 40);
  if (big.length !== count) fail(`expected ${count} bands, found ${big.length} (${big.map((r) => r.join("–")).join(", ")})`);
  return big;
};
const colCount = (x) => {
  let n = 0;
  for (let y = 0; y < H; y++) if (alpha[y * W + x] > 0.5) n++;
  return n;
};
const rowCount = (y) => {
  let n = 0;
  for (let x = 0; x < W; x++) if (alpha[y * W + x] > 0.5) n++;
  return n;
};
const cols = bands(4, W, colCount);
const rows = bands(3, H, rowCount);

const frames = [];
for (const [y0, y1] of rows)
  for (const [x0, x1] of cols) {
    const w = x1 - x0;
    const h = y1 - y0;
    const px = new Float32Array(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y0 + y) * W + (x0 + x);
        const o = (y * w + x) * 4;
        px[o] = rgba[i * 4];
        px[o + 1] = rgba[i * 4 + 1];
        px[o + 2] = rgba[i * 4 + 2];
        px[o + 3] = rgba[i * 4 + 3];
      }
    frames.push({ src: frames.length + 1, x0, y0, w, h, px });
  }

/* ── 3. align on the static base (bottom third: cushion, bowl, legs) ─ */
const lum = (f, x, y) => {
  if (x < 0 || y < 0 || x >= f.w || y >= f.h) return [0, 0];
  const o = (y * f.w + x) * 4;
  return [0.3 * f.px[o] + 0.55 * f.px[o + 1] + 0.15 * f.px[o + 2], f.px[o + 3]];
};
const f1 = frames[0];
const T = { x: 0, y: Math.round(f1.h * 0.66), w: f1.w, h: Math.round(f1.h * 0.3) };
const tmpl = [];
for (let y = 0; y < T.h; y++) for (let x = 0; x < T.w; x++) tmpl.push(lum(f1, T.x + x, T.y + y));
const score = (f, dx, dy, step) => {
  let s = 0;
  for (let y = 0; y < T.h; y += step)
    for (let x = 0; x < T.w; x += step) {
      const [l, a] = lum(f, T.x + x + dx, T.y + y + dy);
      const [tl, ta] = tmpl[y * T.w + x];
      s += Math.abs(l - tl) + 0.6 * Math.abs(a - ta);
    }
  return s;
};
const R = 28;
for (const f of frames) {
  let best = [Infinity, 0, 0];
  for (let dy = -R; dy <= R; dy += 2) for (let dx = -R; dx <= R; dx += 2) {
    const s = score(f, dx, dy, 3);
    if (s < best[0]) best = [s, dx, dy];
  }
  let fine = [Infinity, 0, 0];
  for (let dy = best[2] - 2; dy <= best[2] + 2; dy++) for (let dx = best[1] - 2; dx <= best[1] + 2; dx++) {
    const s = score(f, dx, dy, 1);
    if (s < fine[0]) fine = [s, dx, dy];
  }
  f.dx = fine[1];
  f.dy = fine[2];
  f.match = fine[0] / (T.w * T.h);
}

/* ── 4. identical canvases ──────────────────────────────────────────── */
const used = FRAME_ORDER.map((n) => frames[n - 1] ?? fail(`FRAME_ORDER names frame ${n}, but there are only ${frames.length}`));
// tight box of every frame's pixels, in frame-1 coordinates (after alignment)
let box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
for (const f of used)
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      if (f.px[(y * f.w + x) * 4 + 3] < 8) continue;
      const X = x - f.dx;
      const Y = y - f.dy;
      if (X < box.x0) box.x0 = X;
      if (Y < box.y0) box.y0 = Y;
      if (X > box.x1) box.x1 = X;
      if (Y > box.y1) box.y1 = Y;
    }
const FW = box.x1 - box.x0 + 1 + PAD * 2;
const FH = box.y1 - box.y0 + 1 + PAD * 2;

// a soft contact shadow under the group, shared by every frame
const shadowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${FW}" height="${FH}"><ellipse cx="${FW / 2}" cy="${FH - PAD - 10}" rx="${FW * 0.42}" ry="12" fill="rgb(90,50,25)" fill-opacity="${SHADOW.opacity}"/></svg>`;
const shadow = await sharp(Buffer.from(shadowSvg)).blur(SHADOW.blur).png().toBuffer();

const tiles = [];
for (const f of used) {
  const buf = Buffer.alloc(f.w * f.h * 4);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.round(f.px[i]);
  const img = await sharp(buf, { raw: { width: f.w, height: f.h, channels: 4 } }).png().toBuffer();
  const left = PAD - box.x0 - f.dx;
  const top = PAD - box.y0 - f.dy;
  tiles.push(
    await sharp({ create: { width: FW, height: FH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([
        { input: shadow, left: 0, top: 0 },
        { input: img, left, top },
      ])
      .png()
      .toBuffer(),
  );
}

/* ── 5. strip + metadata + preview ──────────────────────────────────── */
mkdirSync(OUT_DIR, { recursive: true });
const webp = await sharp({ create: { width: FW * tiles.length, height: FH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(tiles.map((t, k) => ({ input: t, left: k * FW, top: 0 })))
  .webp({ quality: QUALITY, alphaQuality: 95, effort: 6, smartSubsample: true })
  .toBuffer();
writeFileSync(`${OUT_DIR}/mehndi-sprite.webp`, webp);
writeFileSync(
  `${OUT_DIR}/mehndi-sprite.json`,
  JSON.stringify({ frameWidth: FW, frameHeight: FH, frameCount: tiles.length, fps: FPS, order: FRAME_ORDER }, null, 2) + "\n",
);

writeFileSync(
  `${OUT_DIR}/preview.html`,
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mehndi sprite preview</title>
<style>
  body { margin: 0; padding: 24px; background: #f6eee3; font: 14px/1.4 Georgia, serif; color: #5a1520; }
  h2 { font-weight: normal; margin: 24px 0 10px; }
  .row { display: flex; gap: 32px; flex-wrap: wrap; align-items: flex-start; }
  .f { width: ${FW}px; height: ${FH}px; background: url(mehndi-sprite.webp) 0 0 / ${FW * tiles.length}px ${FH}px no-repeat; outline: 1px dashed rgb(176 138 74 / .35); }
  .onion { position: relative; width: ${FW}px; height: ${FH}px; outline: 1px dashed rgb(176 138 74 / .35); }
  .onion div { position: absolute; inset: 0; background: url(mehndi-sprite.webp) 0 0 / ${FW * tiles.length}px ${FH}px no-repeat; opacity: .2; }
</style></head><body>
<p>${tiles.length} frames · ${FW} × ${FH}px each · ${FPS} fps</p>
<div class="row">
  <div><h2>Normal speed</h2><div class="f" id="a"></div></div>
  <div><h2>Half speed</h2><div class="f" id="b"></div></div>
  <div><h2>Onion skin (static parts should look sharp)</h2><div class="onion" id="onion"></div></div>
</div>
<script>
  const n = ${tiles.length}, fw = ${FW}, fps = ${FPS};
  const onion = document.getElementById("onion");
  for (let k = 0; k < n; k++) { const o = document.createElement("div"); o.style.backgroundPositionX = -k * fw + "px"; onion.appendChild(o); }
  const a = document.getElementById("a"), b = document.getElementById("b"), t0 = performance.now();
  (function loop(now) {
    const t = (now - t0) / 1000;
    a.style.backgroundPositionX = -(Math.floor(t * fps) % n) * fw + "px";
    b.style.backgroundPositionX = -(Math.floor(t * fps / 2) % n) * fw + "px";
    requestAnimationFrame(loop);
  })(t0);
</script>
</body></html>
`,
);

console.log(`✔ ${tiles.length} frames, ${FW}×${FH}px each → ${OUT_DIR}/mehndi-sprite.webp (${(webp.length / 1024).toFixed(0)} KB)`);
for (const f of frames) console.log(`  frame ${String(f.src).padStart(2)}  cell ${f.x0},${f.y0} ${f.w}×${f.h}  shift ${f.dx},${f.dy}  match ${f.match.toFixed(1)}`);
