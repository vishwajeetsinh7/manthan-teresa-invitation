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
import { readdirSync, statSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const SRC = process.argv[2];
const PREVIEW = process.argv[3];
if (!SRC) throw new Error("Pass the folder with the raw images");
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
  { src: /wax-seal/i, out: "seal/wax-seal-tm.png", w: 600, h: 600, fill: 0.96, erode: 2 },
  { src: /^Flower 1/i, out: "flowers/flower-1-open.png", w: 512, h: 512, fill: 0.9, erode: 3, shadow: SHADOW },
  { src: /light pink/i, out: "flowers/flower-2-open.png", w: 512, h: 512, fill: 0.9, erode: 3, shadow: SHADOW },
  { src: /^Flower 3/i, out: "flowers/flower-3-open.png", w: 512, h: 512, fill: 0.9, erode: 3, shadow: { ...SHADOW, opacity: 0.4 } },
  { src: /^Flower 4/i, out: "flowers/flower-4-open.png", w: 512, h: 512, fill: 0.9, erode: 3, shadow: SHADOW },
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
const PLAIN = [{ src: /^paper/i, out: "bg/paper.webp", w: 1080, h: 1920, quality: 78 }];

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

  const outPath = join(OUT, job.out);
  mkdirSync(dirname(outPath), { recursive: true });
  const res = await sharp(framed).resize(job.w, job.h, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toFile(outPath);
  return { outPath, kb: res.size / 1024 };
}

async function plain(job, srcPath) {
  const outPath = join(OUT, job.out);
  mkdirSync(dirname(outPath), { recursive: true });
  const res = await sharp(srcPath)
    .resize(job.w, job.h, { fit: "cover", kernel: "lanczos3" })
    .webp({ quality: job.quality ?? 80 })
    .toFile(outPath);
  return { outPath, kb: res.size / 1024 };
}

const done = [];
for (const job of [...JOBS, ...PLAIN]) {
  const srcPath = find(job.src);
  if (!srcPath) continue;
  const { outPath, kb } = PLAIN.includes(job) ? await plain(job, srcPath) : await cutout(job, srcPath);
  console.log(`${clean(basename(srcPath)).padEnd(28)} → ${outPath}  ${job.w}×${job.h}  ${kb.toFixed(0)} KB`);
  if (!PLAIN.includes(job)) done.push(outPath);
}
if (!done.length) console.log("No matching source files found.");

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
