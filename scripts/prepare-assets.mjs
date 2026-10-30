/**
 * Turn raw AI-generated PNGs into clean, consistently framed site assets.
 *
 *   node scripts/prepare-assets.mjs "<folder with the raw images>" [preview-folder]
 *
 * For every job below whose source file is found (subfolders included):
 *  1. finds the source by a filename pattern (names from ChatGPT are messy)
 *  2. removes edge fringe + stray specks (alpha "opening" + slight shrink)
 *  3. trims to the subject and places it on the target canvas:
 *       anchor "center" → centred;  anchor "stem" → stem end at bottom-centre
 *  4. optionally bakes a soft contact shadow (free at runtime)
 *  5. resizes and writes to public/assets/...
 * Jobs whose source is missing are skipped, so old and new batches can mix.
 */
import sharp from "sharp";
import { readdirSync, statSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const SRC = process.argv[2];
const PREVIEW = process.argv[3];
if (!SRC) throw new Error("Pass the folder with the raw images");
/** full-quality processed masters (kept in the repo, NOT deployed) */
const MASTERS = "assets-src";
/** what the site serves */
const OUT = "public/assets";

const walk = (d) =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = walk(SRC);
const clean = (s) => s.replace(/ /g, " ");
const find = (re) => files.find((p) => re.test(clean(basename(p))));

const SHADOW = { opacity: 0.32, blur: 0.012, dy: 0.012 }; // blur/dy as share of canvas
const SOFT = { opacity: 0.22, blur: 0.01, dy: 0.008 };

/** w×h = output px, fill = subject size as share of the canvas */
const JOBS = [
  // batch 1 — seal (no baked shadow: the site animates its own) + flowers
  { src: /^seal-burgundy|wax-seal/i, out: "seal/wax-seal-tm.png", w: 600, h: 600, fill: 0.96, erode: 2 },
  { src: /^Flower 1/i, out: "flowers/flower-1-open.png", w: 512, h: 512, fill: 0.9, erode: 3, shadow: SHADOW },
  { src: /light pink/i, out: "flowers/flower-2-open.png", w: 512, h: 512, fill: 0.9, erode: 3, shadow: SHADOW },
  { src: /^Flower 3/i, out: "flowers/flower-3-open.png", w: 512, h: 512, fill: 0.9, erode: 3, shadow: { ...SHADOW, opacity: 0.4 } },
  { src: /^Flower 4/i, out: "flowers/flower-4-open.png", w: 512, h: 512, fill: 0.9, erode: 3, shadow: SHADOW },
  { src: /^pink rose/i, out: "flowers/flower-5-open.png", w: 512, h: 512, fill: 0.9, erode: 3, shadow: SHADOW },
  { src: /buds/i, out: "flowers/rosebud.png", w: 400, h: 400, fill: 0.92, erode: 3, shadow: SHADOW },

  // batch 2 — leaves (stem at bottom-centre = the pivot they fan out from)
  { src: /^prompt 1\b/i, out: "leaves/leaf-1.png", w: 420, h: 800, fill: 0.96, anchor: "stem", erode: 2, shadow: SOFT },
  { src: /^prompt 2\b/i, out: "leaves/leaf-2.png", w: 420, h: 800, fill: 0.96, anchor: "stem", erode: 2, shadow: SOFT },
  { src: /^prm?pot 3\b/i, out: "leaves/leaf-3.png", w: 420, h: 800, fill: 0.96, anchor: "stem", erode: 2, shadow: SOFT },
  { src: /^prompt 6\b/i, out: "leaves/leaf-4.png", w: 420, h: 800, fill: 0.96, anchor: "stem", erode: 2, shadow: SOFT }, // gold
  { src: /^prompt 5\b/i, out: "leaves/leaf-5.png", w: 420, h: 800, fill: 0.96, anchor: "stem", erode: 2, shadow: SOFT }, // burgundy edge
  // petals
  // petal / petel / patel — any spelling
  { src: /^p\w*l 1\b/i, out: "petals/petal-1.png", w: 200, h: 200, fill: 0.9, erode: 2, shadow: SOFT },
  { src: /^p\w*l 2\b/i, out: "petals/petal-2.png", w: 200, h: 200, fill: 0.9, erode: 2, shadow: SOFT },
  { src: /^p\w*l 3\b/i, out: "petals/petal-3.png", w: 200, h: 200, fill: 0.9, erode: 2, shadow: SOFT },
];

/** Opaque full-bleed images (no cut-out) */
const PLAIN = [{ src: /^paper/i, out: "paper.webp", w: 1080, h: 1920, quality: 78 }];

/* separable min / max filters on an alpha channel */
function morph(a, w, h, r, op) {
  const tmp = new Uint8Array(a.length);
  const out = new Uint8Array(a.length);
  const pick = op === "min" ? Math.min : Math.max;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = op === "min" ? 255 : 0;
      for (let k = -r; k <= r; k++) v = pick(v, a[y * w + Math.min(w - 1, Math.max(0, x + k))]);
      tmp[y * w + x] = v;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = op === "min" ? 255 : 0;
      for (let k = -r; k <= r; k++) v = pick(v, tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x]);
      out[y * w + x] = v;
    }
  return out;
}

async function cutout(job, srcPath) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  const A = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) A[i] = data[i * 4 + 3];
  // opening (erode r, dilate r-1) kills specks and shaves the fringe ring
  const r = job.erode;
  const opened = morph(morph(A, w, h, r, "min"), w, h, Math.max(0, r - 1), "max");

  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      // soft 1px anti-aliased edge
      let s = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          s += opened[Math.min(h - 1, Math.max(0, y + dy)) * w + Math.min(w - 1, Math.max(0, x + dx))];
      const a = Math.min(A[i], Math.round(s / 9));
      data[i * 4 + 3] = a;
      if (a > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;

  // stem anchor: centre the canvas on the stem end (average x of the bottom rows)
  let anchorX = minX + bw / 2;
  if (job.anchor === "stem") {
    let sx = 0, n = 0;
    for (let y = maxY - 6; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++)
        if (data[(y * w + x) * 4 + 3] > 128) {
          sx += x;
          n++;
        }
    if (n) anchorX = sx / n;
  }

  // canvas in source pixels, same aspect as the output
  const ratio = job.w / job.h;
  let ch, cw;
  if (job.anchor === "stem") {
    const halfW = Math.max(anchorX - minX, maxX - anchorX) + 2;
    ch = Math.ceil(Math.max(bh / job.fill, (2 * halfW) / ratio / job.fill));
    cw = Math.ceil(ch * ratio);
  } else {
    const side = Math.max(bw / ratio, bh) / job.fill;
    ch = Math.ceil(side);
    cw = Math.ceil(side * ratio);
  }
  const left = job.anchor === "stem" ? Math.round(cw / 2 - (anchorX - minX)) : Math.round((cw - bw) / 2);
  const top = job.anchor === "stem" ? ch - bh - Math.round(ch * 0.004) : Math.round((ch - bh) / 2);

  const subject = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .png()
    .toBuffer();

  const layers = [];
  if (job.shadow) {
    const { opacity, blur, dy } = job.shadow;
    const base = Math.max(cw, ch);
    const mask = await sharp(subject).extractChannel(3).linear(opacity, 0).toBuffer();
    const tinted = await sharp({ create: { width: bw, height: bh, channels: 3, background: { r: 58, g: 20, b: 10 } } })
      .joinChannel(mask)
      .png()
      .toBuffer();
    const pad = Math.ceil(base * blur * 3);
    const blurred = await sharp(tinted)
      .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .blur(Math.max(0.3, base * blur))
      .png()
      .toBuffer();
    layers.push({ input: blurred, left: left - pad, top: top - pad + Math.round(base * dy) });
  }
  layers.push({ input: subject, left, top });

  // composite on an oversized canvas (room for the shadow), then crop to the target frame
  const extra = Math.ceil(Math.max(cw, ch) * 0.08);
  const big = await sharp({
    create: { width: cw + extra * 2, height: ch + extra * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(layers.map((l) => ({ ...l, left: l.left + extra, top: l.top + extra })))
    .png()
    .toBuffer();
  const framed = await sharp(big).extract({ left: extra, top: extra, width: cw, height: ch }).png().toBuffer();

  const outPath = join(MASTERS, job.out);
  mkdirSync(dirname(outPath), { recursive: true });
  const res = await sharp(framed).resize(job.w, job.h, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toFile(outPath);
  return { outPath, kb: res.size / 1024 };
}

async function plain(job, srcPath) {
  const outPath = join(MASTERS, job.out);
  mkdirSync(dirname(outPath), { recursive: true });
  const res = await sharp(srcPath)
    .resize(job.w, job.h, { fit: "cover", kernel: "lanczos3" })
    .webp({ quality: job.quality ?? 80 })
    .toFile(outPath);
  return { outPath, kb: res.size / 1024 };
}

/* ── Seamless tiles ────────────────────────────────────────────────────
 * makeSeamless(): roll the image by half a tile (so its old edges meet in
 * the middle, and its new edges are continuous), then paint the original —
 * which is continuous in the middle — back over a feathered band along the
 * middle lines. Result wraps with no seam and keeps the natural pattern
 * (no mirroring).                                                        */
function makeSeamless(src, w, h, c, { x = true, y = true, core = 8, feather = 70 }) {
  const out = Buffer.alloc(src.length);
  const smooth = (d) => {
    if (d <= core) return 1;
    if (d >= core + feather) return 0;
    const t = 1 - (d - core) / feather;
    return t * t * (3 - 2 * t);
  };
  const ox = x ? w >> 1 : 0;
  const oy = y ? h >> 1 : 0;
  for (let j = 0; j < h; j++) {
    const my = y ? smooth(Math.abs(j - h / 2)) : 0;
    const sj = (j + oy) % h;
    for (let i = 0; i < w; i++) {
      const m = Math.max(my, x ? smooth(Math.abs(i - w / 2)) : 0);
      const si = (i + ox) % w;
      const a = (j * w + i) * c; // original (continuous in the middle)
      const b = (sj * w + si) * c; // rolled (continuous at the edges)
      for (let k = 0; k < c; k++) out[a + k] = Math.round(src[b + k] * (1 - m) + src[a + k] * m);
    }
  }
  return out;
}

/** Even out slow light falloff/vignette so a repeating tile shows no bands. */
function flatten(src, blurred, n, c) {
  let mean = [0, 0, 0];
  for (let p = 0; p < n; p++) for (let k = 0; k < 3; k++) mean[k] += blurred[p * c + k];
  mean = mean.map((m) => m / n);
  const out = Buffer.alloc(src.length);
  for (let p = 0; p < n; p++)
    for (let k = 0; k < c; k++) {
      const i = p * c + k;
      out[i] = k < 3 ? Math.max(0, Math.min(255, Math.round((src[i] * mean[k]) / Math.max(1, blurred[i])))) : src[i];
    }
  return out;
}

async function rawOf(img) {
  return img.removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

/**
 * Velvet tile that flows inside the corner drapes (square).
 * Source: a raw image named "velvet…" if present, else the envelope's
 * seam-free top flap from the video poster.
 */
async function velvetTile() {
  const raw = find(/^velvet/i);
  // never replace an existing (custom) tile with the envelope fallback
  if (!raw && existsSync(join(OUT, "velvet/velvet-tile.webp"))) {
    console.log("velvet: no raw 'velvet…' image, keeping the existing tile");
    return;
  }
  const S = 768; // one repeat is ~210u on screen; 768px is sharp at 3x
  const base = raw
    ? sharp(raw).resize(S, S, { fit: "cover", kernel: "lanczos3" })
    : sharp("public/assets/video/envelope-poster.webp").extract({ left: 200, top: 0, width: 320, height: 320 }).resize(S, S);
  const { data, info } = await rawOf(base);
  const seamless = makeSeamless(data, info.width, info.height, info.channels, { core: 6, feather: 90 });
  const out = join(OUT, "velvet/velvet-tile.webp");
  mkdirSync(dirname(out), { recursive: true });
  const res = await sharp(seamless, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .webp({ quality: 80 })
    .toFile(out);
  console.log(`${(raw ? clean(basename(raw)) : "envelope poster").padEnd(28)} → ${out}  ${S}×${S}  ${(res.size / 1024).toFixed(0)} KB (seamless)`);
}

/**
 * Paper that repeats down the whole page with no seam and no banding:
 * flatten its lighting, then make it seamless top-to-bottom.
 */
async function paperTile() {
  const raw = find(/^paper/i);
  const src = raw ?? join(MASTERS, "paper.webp");
  const W = 1080;
  const H = 1920;
  const img = sharp(src).resize(W, H, { fit: "cover", kernel: "lanczos3" });
  const { data, info } = await rawOf(img.clone());
  const { data: blur } = await rawOf(sharp(data, { raw: { width: W, height: H, channels: info.channels } }).blur(90));
  const flat = flatten(data, blur, W * H, info.channels);
  const seamless = makeSeamless(flat, W, H, info.channels, { x: false, y: true, core: 10, feather: 160 });
  const out = join(OUT, "bg/paper-tile.webp");
  mkdirSync(dirname(out), { recursive: true });
  const res = await sharp(seamless, { raw: { width: W, height: H, channels: info.channels } }).webp({ quality: 80 }).toFile(out);
  console.log(`${(raw ? clean(basename(raw)) : "paper.webp").padEnd(28)} → ${out}  ${W}×${H}  ${(res.size / 1024).toFixed(0)} KB (seamless vertically)`);
}

await velvetTile();

const done = [];
for (const job of [...JOBS, ...PLAIN]) {
  const srcPath = find(job.src);
  if (!srcPath) continue;
  const { outPath, kb } = PLAIN.includes(job) ? await plain(job, srcPath) : await cutout(job, srcPath);
  console.log(`${clean(basename(srcPath)).padEnd(28)} → ${outPath}  ${job.w}×${job.h}  ${kb.toFixed(0)} KB`);
  if (!PLAIN.includes(job)) done.push(outPath);
}
if (!done.length) console.log("No matching source files found.");
await paperTile();

/* ── Web exports ───────────────────────────────────────────────────────
 * Small WebP files (with alpha) sized for how big each thing is on screen
 * at 3× pixel density. The site serves these directly — no on-demand
 * image resizing, so nothing is slow on a cold CDN.                      */
const WEB = [
  ...[1, 2, 3, 4, 5].map((n) => ({ src: `flowers/flower-${n}-open.png`, out: `flowers/flower-${n}.webp`, w: 288 })),
  { src: "flowers/rosebud.png", out: "flowers/rosebud.webp", w: 144 },
  ...[1, 2, 3, 4, 5].map((n) => ({ src: `leaves/leaf-${n}.png`, out: `leaves/leaf-${n}.webp`, w: 132 })),
  ...[1, 2, 3].map((n) => ({ src: `petals/petal-${n}.png`, out: `petals/petal-${n}.webp`, w: 96 })),
  { src: "seal/wax-seal-tm.png", out: "seal/wax-seal-tm.webp", w: 360 },
];
let webTotal = 0;
for (const j of WEB) {
  const out = join(OUT, j.out);
  mkdirSync(dirname(out), { recursive: true });
  const r = await sharp(join(MASTERS, j.src))
    .resize({ width: j.w, kernel: "lanczos3" })
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile(out);
  webTotal += r.size;
}
console.log(`web exports → ${WEB.length} files, ${(webTotal / 1024).toFixed(0)} KB total`);

if (PREVIEW && done.length) {
  // contact sheet on cream, to spot any remaining halo
  const cell = 240;
  const sheet = sharp({ create: { width: cell * done.length, height: cell, channels: 3, background: "#f6eee3" } });
  const comps = await Promise.all(
    done.map(async (p, i) => ({
      input: await sharp(p)
        .resize(cell - 16, cell - 16, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer(),
      left: i * cell + 8,
      top: 8,
    })),
  );
  await sheet.composite(comps).png().toFile(join(PREVIEW, "contact-sheet.png"));
  console.log("preview →", join(PREVIEW, "contact-sheet.png"));
}
