/**
 * Builds the flying-dove sprite from the green-screen sheet.
 *
 *   node scripts/build-dove-sprite.mjs
 *
 * In:  assets-src/dove-sheet-green.png   (12 frames of one dove facing right on #00FF00,
 *                                          roughly a 4 × 3 grid, NOT neatly in cells)
 * Out: public/doves/dove-sprite.webp       (all frames in one row, transparent, glow baked in)
 *      public/doves/dove-sprite.json       (frameWidth, frameHeight, frameCount, …)
 *      public/doves/preview.html           (loop at 1× and ½×, plus an onion skin)
 *
 * Steps: chroma key with a soft ramp + green despill → find the 12 doves as
 * connected blobs (reading order) → anchor every frame on the head (template
 * match of the eye + beak from frame 1), scale-match head-to-feet to frame 1
 * → identical canvases with the anchor on the same pixel → soft warm glow
 * baked behind each dove → one horizontal strip.
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromaKey } from "./lib/chroma-key.mjs";

const SRC = "assets-src/dove-sheet-green.png";
const OUT_DIR = "public/doves";

/** Frame order (1-based, source reading order). Reorder or drop frames here. */
const FRAME_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
/** the wings-level frame used for glides (source order) */
const GLIDE_FRAME = 4;

/* chroma key: alpha ramps from 1 → 0 as green dominance (g - max(r, b)) goes LO → HI */
const KEY_LO = 28;
const KEY_HI = 110;
const MIN_BLOB = 1500; // px; smaller blobs are specks (or attach to a nearby dove)
const ATTACH_DIST = 30; // px; detached wing tips this close join their dove
const GLOW = { color: [0xff, 0xe7, 0xb8], opacity: 0.35, sigma: 9 };
const PAD = 26; // px around the union of all frames (room for the glow)
const QUALITY = 90;

const fail = (msg) => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};

/* ── 1. chroma key + despill ─────────────────────────────────────────── */
const { data: rgb, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const N = W * H;
const { rgba, alpha } = chromaKey(rgb, N, { lo: KEY_LO, hi: KEY_HI });

/* ── 2. find the doves (connected blobs), reading order ─────────────── */
const label = new Int32Array(N).fill(-1);
const blobs = [];
const stack = new Int32Array(N);
for (let s = 0; s < N; s++) {
  if (label[s] !== -1 || alpha[s] < 0.5) continue;
  const id = blobs.length;
  let top = 0;
  stack[top++] = s;
  label[s] = id;
  let area = 0;
  let x0 = W;
  let y0 = H;
  let x1 = 0;
  let y1 = 0;
  while (top) {
    const p = stack[--top];
    const x = p % W;
    const y = (p - x) / W;
    area++;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
    for (const q of [p - 1, p + 1, p - W, p + W]) {
      if (q < 0 || q >= N || label[q] !== -1 || alpha[q] < 0.5) continue;
      if ((q === p - 1 && x === 0) || (q === p + 1 && x === W - 1)) continue;
      label[q] = id;
      stack[top++] = q;
    }
  }
  blobs.push({ id, area, x0, y0, x1, y1, parts: [id] });
}
const big = blobs.filter((b) => b.area >= MIN_BLOB).sort((a, b) => b.area - a.area);
if (big.length < 12) fail(`found ${big.length} doves, expected 12`);
const doves = big.slice(0, 12);
// detached pieces (a wing tip, a feather) join the nearest dove if close enough
const boxGap = (a, b) => Math.max(0, a.x0 - b.x1, b.x0 - a.x1, a.y0 - b.y1, b.y0 - a.y1);
for (const b of blobs) {
  if (doves.includes(b) || b.area < 40) continue;
  const near = doves.map((d) => [boxGap(b, d), d]).sort((p, q) => p[0] - q[0])[0];
  if (near[0] <= ATTACH_DIST) {
    const d = near[1];
    d.parts.push(b.id);
    d.x0 = Math.min(d.x0, b.x0);
    d.y0 = Math.min(d.y0, b.y0);
    d.x1 = Math.max(d.x1, b.x1);
    d.y1 = Math.max(d.y1, b.y1);
  }
}
if (big.length > 12 && big[12].area > MIN_BLOB * 4) fail(`found a 13th large blob (${big[12].area}px) — expected exactly 12 doves`);
// rows: cluster centres by y (3 rows), then left → right
for (const d of doves) d.cy = (d.y0 + d.y1) / 2;
doves.sort((a, b) => a.cy - b.cy);
const gaps = doves.slice(1).map((d, i) => [d.cy - doves[i].cy, i]).sort((a, b) => b[0] - a[0]);
const cuts = gaps.slice(0, 2).map((g) => g[1]).sort((a, b) => a - b);
const rows = [doves.slice(0, cuts[0] + 1), doves.slice(cuts[0] + 1, cuts[1] + 1), doves.slice(cuts[1] + 1)];
if (rows.some((r) => r.length !== 4)) console.warn(`! rows hold ${rows.map((r) => r.length).join(" / ")} doves (expected 4 each)`);
const ordered = rows.flatMap((r) => r.sort((a, b) => a.x0 - b.x0));

/** a dove cut out on its own (other blobs cleared), as Float32 RGBA + bbox */
function cutOut(d) {
  const w = d.x1 - d.x0 + 1;
  const h = d.y1 - d.y0 + 1;
  const px = new Float32Array(w * h * 4);
  const own = new Set(d.parts);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (d.y0 + y) * W + (d.x0 + x);
      const lab = label[i];
      // keep this dove's pixels and the soft (unlabelled) edge around them
      if (lab !== -1 && !own.has(lab)) continue;
      const o = (y * w + x) * 4;
      px[o] = rgba[i * 4];
      px[o + 1] = rgba[i * 4 + 1];
      px[o + 2] = rgba[i * 4 + 2];
      px[o + 3] = rgba[i * 4 + 3];
    }
  }
  return { w, h, px };
}

/* ── 3. anchor on the head ─────────────────────────────────────────────
   Frame 1's beak is its rightmost point; the eye + beak patch around it
   is the template. In every frame, look for that patch near the right
   side of the body and use its position as the anchor.                  */
const frames = ordered.map((d, k) => ({ src: k + 1, d, ...cutOut(d) }));
const f1 = frames[0];
let beak = { x: 0, y: 0 };
for (let y = 0; y < f1.h; y++)
  for (let x = f1.w - 1; x >= 0; x--)
    if (f1.px[(y * f1.w + x) * 4 + 3] > 200) {
      if (x > beak.x) beak = { x, y };
      break;
    }
const T = { x: beak.x - 62, y: beak.y - 26, w: 68, h: 50 };
const lum = (f, x, y) => {
  if (x < 0 || y < 0 || x >= f.w || y >= f.h) return [0, 0];
  const o = (y * f.w + x) * 4;
  return [0.3 * f.px[o] + 0.55 * f.px[o + 1] + 0.15 * f.px[o + 2], f.px[o + 3]];
};
const tmpl = [];
for (let y = 0; y < T.h; y++) for (let x = 0; x < T.w; x++) tmpl.push(lum(f1, T.x + x, T.y + y));
const score = (f, ox, oy, step) => {
  let s = 0;
  for (let y = 0; y < T.h; y += step)
    for (let x = 0; x < T.w; x += step) {
      const [l, a] = lum(f, ox + x, oy + y);
      const [tl, ta] = tmpl[y * T.w + x];
      s += Math.abs(l - tl) + 0.6 * Math.abs(a - ta);
    }
  return s;
};
for (const f of frames) {
  let best = [Infinity, 0, 0];
  // coarse search over the right 60% of the frame, then refine
  for (let oy = -10; oy < f.h - T.h + 10; oy += 3)
    for (let ox = Math.floor(f.w * 0.3); ox < f.w - T.w + 10; ox += 3) {
      const s = score(f, ox, oy, 3);
      if (s < best[0]) best = [s, ox, oy];
    }
  let fine = [Infinity, 0, 0];
  for (let oy = best[2] - 3; oy <= best[2] + 3; oy++)
    for (let ox = best[1] - 3; ox <= best[1] + 3; ox++) {
      const s = score(f, ox, oy, 1);
      if (s < fine[0]) fine = [s, ox, oy];
    }
  // anchor = where frame 1's beak tip would be
  f.anchor = { x: fine[1] + (beak.x - T.x), y: fine[2] + (beak.y - T.y) };
  f.match = fine[0] / (T.w * T.h);
}

/* scale: head-to-feet distance should match frame 1 (feet = orange-red pixels well below the head) */
const feetOf = (f) => {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      const o = (y * f.w + x) * 4;
      if (f.px[o + 3] < 200 || y < f.anchor.y + 45) continue;
      const [r, g, b] = [f.px[o], f.px[o + 1], f.px[o + 2]];
      if (r > 150 && r - g > 70 && r - b > 70) {
        sx += x;
        sy += y;
        n++;
      }
    }
  return n > 8 ? { x: sx / n, y: sy / n } : null;
};
for (const f of frames) {
  f.feet = feetOf(f);
  f.reach = f.feet ? Math.hypot(f.feet.x - f.anchor.x, f.feet.y - f.anchor.y) : null;
}
const ref = frames[0].reach;
for (const f of frames) {
  const s = ref && f.reach ? ref / f.reach : 1;
  f.scale = Math.abs(s - 1) < 0.03 ? 1 : s; // within 3%: leave it (no resampling blur)
}

/* ── 4. identical canvases, anchor on the same pixel ─────────────────── */
let L = 0;
let R = 0;
let U = 0;
let D = 0;
for (const f of frames) {
  L = Math.max(L, f.anchor.x * f.scale);
  R = Math.max(R, (f.w - f.anchor.x) * f.scale);
  U = Math.max(U, f.anchor.y * f.scale);
  D = Math.max(D, (f.h - f.anchor.y) * f.scale);
}
const FW = Math.ceil(L + R) + PAD * 2;
const FH = Math.ceil(U + D) + PAD * 2;
const AX = Math.round(L) + PAD;
const AY = Math.round(U) + PAD;

const toPng = (f) => {
  const buf = Buffer.alloc(f.w * f.h * 4);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.round(f.px[i]);
  return sharp(buf, { raw: { width: f.w, height: f.h, channels: 4 } });
};

const used = FRAME_ORDER.map((n) => {
  const f = frames[n - 1];
  if (!f) fail(`FRAME_ORDER names frame ${n}, but there are only ${frames.length}`);
  return f;
});

const tiles = [];
let content = { x0: FW, y0: FH, x1: 0, y1: 0 };
/* the bird's outline across ALL frames, as horizontal bands: for each band
   of rows, the left- and right-most feather pixel in any frame. The page uses
   it to keep every wing tip clear of the text (the box corners are empty). */
const BAND = 8;
const SOLID = 40; // alpha above this counts as feather (not soft edge / glow)
const bands = Array.from({ length: Math.ceil(FH / BAND) }, () => null);
for (const f of used) {
  let img = toPng(f);
  let fw = f.w;
  let fh = f.h;
  if (f.scale !== 1) {
    fw = Math.round(f.w * f.scale);
    fh = Math.round(f.h * f.scale);
    img = sharp(await img.png().toBuffer()).resize(fw, fh, { kernel: "lanczos3" });
  }
  const left = Math.round(AX - f.anchor.x * f.scale);
  const top = Math.round(AY - f.anchor.y * f.scale);
  const dove = await img.png().toBuffer();

  // the dove alone on the shared canvas
  const placed = await sharp({ create: { width: FW, height: FH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: dove, left, top }])
    .raw()
    .toBuffer();
  for (let y = 0; y < FH; y++) {
    let x0 = -1;
    let x1 = -1;
    for (let x = 0; x < FW; x++) {
      if (placed[(y * FW + x) * 4 + 3] <= SOLID) continue;
      if (x0 < 0) x0 = x;
      x1 = x + 1;
    }
    if (x0 < 0) continue;
    const k = Math.floor(y / BAND);
    bands[k] = bands[k] ? [Math.min(bands[k][0], x0), Math.max(bands[k][1], x1)] : [x0, x1];
    content = { x0: Math.min(content.x0, x0), y0: Math.min(content.y0, y), x1: Math.max(content.x1, x1), y1: Math.max(content.y1, y + 1) };
  }
  // ── 5. warm glow: its blurred silhouette, tinted, behind it ──
  const sil = Buffer.alloc(FW * FH);
  for (let i = 0; i < FW * FH; i++) sil[i] = placed[i * 4 + 3];
  // (extractChannel: sharp would otherwise hand back 3 channels for a 1-channel input)
  const blurred = await sharp(sil, { raw: { width: FW, height: FH, channels: 1 } }).blur(GLOW.sigma).extractChannel(0).raw().toBuffer();
  if (blurred.length !== FW * FH) fail("glow blur returned an unexpected size");
  const glow = Buffer.alloc(FW * FH * 4);
  for (let i = 0; i < FW * FH; i++) {
    glow[i * 4] = GLOW.color[0];
    glow[i * 4 + 1] = GLOW.color[1];
    glow[i * 4 + 2] = GLOW.color[2];
    glow[i * 4 + 3] = Math.round(blurred[i] * GLOW.opacity);
  }
  const tile = await sharp(glow, { raw: { width: FW, height: FH, channels: 4 } })
    .composite([{ input: placed, raw: { width: FW, height: FH, channels: 4 } }])
    .png()
    .toBuffer();
  tiles.push(tile);
}

/* ── 6. one horizontal strip + metadata + preview ───────────────────── */
mkdirSync(OUT_DIR, { recursive: true });
const strip = sharp({ create: { width: FW * tiles.length, height: FH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(
  tiles.map((t, k) => ({ input: t, left: k * FW, top: 0 })),
);
const webp = await strip.webp({ quality: QUALITY, alphaQuality: 95, effort: 6, smartSubsample: true }).toBuffer();
writeFileSync(`${OUT_DIR}/dove-sprite.webp`, webp);

const meta = {
  frameWidth: FW,
  frameHeight: FH,
  frameCount: tiles.length,
  /** the head (beak tip) sits on this pixel in every frame */
  anchor: { x: AX, y: AY },
  /** the tight box that holds the bird in every frame (no glow), for spacing from text */
  content: { x: content.x0, y: content.y0, width: content.x1 - content.x0, height: content.y1 - content.y0 },
  /** outline of the bird over all frames: rows of BAND px, [left, right] in frame px (null = empty) */
  profile: { band: BAND, rows: bands },
  /** index (0-based, in sprite order) of the wings-level frame used for glides */
  glideFrame: Math.max(0, FRAME_ORDER.indexOf(GLIDE_FRAME)),
  order: FRAME_ORDER,
};
writeFileSync(`${OUT_DIR}/dove-sprite.json`, JSON.stringify(meta, null, 2) + "\n");

const preview = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dove sprite preview</title>
<style>
  body { margin: 0; padding: 24px; background: #f6eee3; font: 14px/1.4 Georgia, serif; color: #5a1520; }
  h2 { font-weight: normal; margin: 28px 0 10px; }
  .row { display: flex; gap: 40px; flex-wrap: wrap; align-items: flex-start; }
  .dove { width: ${FW}px; height: ${FH}px; background: url(dove-sprite.webp) 0 0 / ${FW * tiles.length}px ${FH}px no-repeat; outline: 1px dashed rgb(176 138 74 / .35); }
  .anchor { position: relative; }
  .anchor::after { content: ""; position: absolute; left: ${AX - 3}px; top: ${AY - 3}px; width: 6px; height: 6px; border-radius: 50%; background: #c00; opacity: .6; }
  .onion { position: relative; width: ${FW}px; height: ${FH}px; outline: 1px dashed rgb(176 138 74 / .35); }
  .onion div { position: absolute; inset: 0; background: url(dove-sprite.webp) 0 0 / ${FW * tiles.length}px ${FH}px no-repeat; opacity: .22; }
  .strip { display: flex; flex-wrap: wrap; gap: 6px; }
  .strip div { width: ${Math.round(FW / 2)}px; height: ${Math.round(FH / 2)}px; background: url(dove-sprite.webp) 0 0 / ${Math.round((FW * tiles.length) / 2)}px ${Math.round(FH / 2)}px no-repeat; outline: 1px solid rgb(176 138 74 / .25); position: relative; }
  .strip span { position: absolute; left: 4px; top: 2px; font-size: 11px; opacity: .6; }
  label { user-select: none; }
</style></head><body>
<p>${tiles.length} frames · ${FW} × ${FH}px each · red dot = head anchor (should never move) · <label><input type="checkbox" id="dots" checked> show anchor</label></p>
<div class="row">
  <div><h2>Normal speed (0.4 s per wingbeat)</h2><div class="dove anchor" id="a"></div></div>
  <div><h2>Half speed</h2><div class="dove anchor" id="b"></div></div>
  <div><h2>Onion skin (all frames)</h2><div class="onion anchor" id="onion"></div></div>
</div>
<h2>Frames in order</h2>
<div class="strip" id="strip"></div>
<script>
  const n = ${tiles.length}, fw = ${FW};
  const onion = document.getElementById("onion"), strip = document.getElementById("strip");
  for (let k = 0; k < n; k++) {
    const o = document.createElement("div"); o.style.backgroundPositionX = -k * fw + "px"; onion.appendChild(o);
    const s = document.createElement("div"); s.style.backgroundPositionX = -k * fw / 2 + "px"; s.innerHTML = "<span>" + (k + 1) + "</span>"; strip.appendChild(s);
  }
  const a = document.getElementById("a"), b = document.getElementById("b");
  const t0 = performance.now();
  (function loop(now) {
    const t = (now - t0) / 1000;
    a.style.backgroundPositionX = -(Math.floor(t / (0.4 / n)) % n) * fw + "px";
    b.style.backgroundPositionX = -(Math.floor(t / (0.8 / n)) % n) * fw + "px";
    requestAnimationFrame(loop);
  })(t0);
  document.getElementById("dots").onchange = (e) => document.querySelectorAll(".anchor").forEach((el) => el.classList.toggle("anchor", e.target.checked) || el.classList.add("anchor-off"));
</script>
</body></html>
`;
writeFileSync(`${OUT_DIR}/preview.html`, preview);

console.log(`✔ ${tiles.length} frames, ${FW}×${FH}px each → ${OUT_DIR}/dove-sprite.webp (${(webp.length / 1024).toFixed(0)} KB)`);
for (const f of frames)
  console.log(
    `  frame ${String(f.src).padStart(2)}  box ${f.d.x0},${f.d.y0} ${f.w}×${f.h}  anchor ${f.anchor.x},${f.anchor.y}  match ${f.match.toFixed(1)}  feet ${f.feet ? f.feet.x.toFixed(0) + "," + f.feet.y.toFixed(0) : "—"}  scale ${f.scale.toFixed(3)}`,
  );
