/**
 * Cuts an illustrated scene into separate, named pieces (reusable per event).
 *
 *   node scripts/build-scene-assets.mjs scripts/scenes/mehndi.config.mjs [--fit]
 *
 * 1. keys out the screen colour (soft alpha + despill: no coloured fringe)
 * 2. finds every item as a connected blob; small blobs right next to a much
 *    bigger one join it (a strand's bell, the lamp's flames, rug tassels);
 *    tiny specks are dropped
 * 3. names each piece from the config (`at`: a point inside it on its sheet)
 * 4. lamp: records each baked wick flame as an anchor, then erases it
 * 5. henna: aligns the henna bride to the plain one and masks just the palms
 * 6. pivots: strands hang from their top loop; everything else stands on its
 *    bottom centre (particles turn about their centre)
 * 7. exports each piece as WebP at ~3× its largest on-screen size (never up)
 * 8. writes manifest.json, and contact.html to check every cut-out
 *
 * --fit: also places the pieces by matching them against the master scene and
 *        writes the stage layout (src/config/scenes/<name>.json) to tweak by hand.
 */
import sharp from "sharp";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromaKey } from "./lib/chroma-key.mjs";

const cfgPath = process.argv.find((a) => a.endsWith(".config.mjs")) ?? "scripts/scenes/mehndi.config.mjs";
const FIT = process.argv.includes("--fit");
const cfg = (await import(pathToFileURL(path.resolve(cfgPath)).href)).default;

const fail = (msg) => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* ── 1–2. key every sheet and find its blobs ────────────────────────── */
const sheets = {};
for (const [id, file] of Object.entries(cfg.sheets)) {
  const { data, info } = await sharp(path.join(cfg.srcDir, file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const N = W * H;
  const { rgba, alpha } = chromaKey(data, N, cfg.key);

  const label = new Int32Array(N).fill(-1);
  const blobs = [];
  const stack = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (label[s] !== -1 || alpha[s] < 0.5) continue;
    const b = { id: blobs.length, area: 0, x0: W, y0: H, x1: 0, y1: 0 };
    let top = 0;
    stack[top++] = s;
    label[s] = b.id;
    while (top) {
      const p = stack[--top];
      const x = p % W;
      const y = (p - x) / W;
      b.area++;
      if (x < b.x0) b.x0 = x;
      if (x > b.x1) b.x1 = x;
      if (y < b.y0) b.y0 = y;
      if (y > b.y1) b.y1 = y;
      for (const q of [p - 1, p + 1, p - W, p + W]) {
        if (q < 0 || q >= N || label[q] !== -1 || alpha[q] < 0.5) continue;
        if ((q === p - 1 && x === 0) || (q === p + 1 && x === W - 1)) continue;
        label[q] = b.id;
        stack[top++] = q;
      }
    }
    blobs.push(b);
  }
  // small blobs join a much bigger neighbour (bells, flames, tassels); biggest first
  const gap = (a, b) => Math.max(0, a.x0 - b.x1, b.x0 - a.x1, a.y0 - b.y1, b.y0 - a.y1);
  const order = [...blobs].sort((a, b) => b.area - a.area);
  const owner = new Int32Array(blobs.length).map((_, i) => i);
  const groups = new Map();
  for (const b of order) {
    let host = null;
    for (const g of groups.values()) {
      if (g.area < b.area * 5) continue;
      const d = gap(b, g);
      if (d <= cfg.attachGap && (!host || d < host.d)) host = { g, d };
    }
    if (host) {
      const g = host.g;
      owner[b.id] = g.id;
      g.parts.push(b.id);
      g.x0 = Math.min(g.x0, b.x0);
      g.y0 = Math.min(g.y0, b.y0);
      g.x1 = Math.max(g.x1, b.x1);
      g.y1 = Math.max(g.y1, b.y1);
    } else if (b.area >= cfg.minBlob) groups.set(b.id, { ...b, parts: [b.id] });
  }
  sheets[id] = { W, H, rgba, alpha, label, owner, groups: [...groups.values()] };
  console.log(`${id}: ${groups.size} pieces (${blobs.length} blobs)`);
}

/* ── 3. name the pieces ─────────────────────────────────────────────── */
const pieces = {};
const used = new Set();
for (const spec of cfg.pieces) {
  const sh = sheets[spec.sheet] ?? fail(`unknown sheet ${spec.sheet}`);
  const [px, py] = spec.at;
  const hit = sh.groups
    .filter((g) => px >= g.x0 && px <= g.x1 && py >= g.y0 && py <= g.y1)
    .sort((a, b) => b.area - a.area)[0];
  if (!hit) fail(`${spec.name}: no piece at ${px},${py} on ${spec.sheet}`);
  const key = `${spec.sheet}:${hit.id}`;
  if (used.has(key)) fail(`${spec.name}: that piece is already named`);
  used.add(key);
  // cut out: this piece's blobs plus the soft (unlabelled) edge around them
  const x0 = Math.max(0, hit.x0 - cfg.pad);
  const y0 = Math.max(0, hit.y0 - cfg.pad);
  const x1 = Math.min(sh.W - 1, hit.x1 + cfg.pad);
  const y1 = Math.min(sh.H - 1, hit.y1 + cfg.pad);
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const own = new Set(hit.parts);
  const px4 = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y0 + y) * sh.W + (x0 + x);
      const lab = sh.label[i];
      if (lab !== -1 && !own.has(lab)) continue;
      if (lab === -1 && sh.alpha[i] <= 0) continue;
      sh.rgba.copy(px4, (y * w + x) * 4, i * 4, i * 4 + 4);
    }
  pieces[spec.name] = { spec, sheet: spec.sheet, x0, y0, w, h, px: px4, extra: {} };
}
for (const [id, sh] of Object.entries(sheets)) {
  const named = [...used].filter((k) => k.startsWith(id + ":")).length;
  if (named < sh.groups.length) console.log(`  ${id}: ${sh.groups.length - named} piece(s) left unnamed (skipped)`);
}

/* ── 4. lamp: flame anchors, then erase the baked flames ───────────── */
if (cfg.lampFlames) {
  const L = cfg.lampFlames;
  const p = pieces[L.piece];
  const at = (x, y) => (y * p.w + x) * 4;
  const [r0, r1] = L.rows.map((r) => r - p.y0);
  const [f0, f1] = L.finial.map((x) => x - p.x0);
  const isFlame = (x, y) => {
    const o = at(x, y);
    return p.px[o + 3] > 80 && p.px[o] > 225 && p.px[o + 1] > 165;
  };
  const seen = new Uint8Array(p.w * p.h);
  const flames = [];
  for (let y = r0; y <= r1; y++)
    for (let x = 0; x < p.w; x++) {
      if (seen[y * p.w + x] || !isFlame(x, y)) continue;
      const f = { n: 0, sx: 0, x0: x, x1: x, y0: y, y1: y };
      const st = [[x, y]];
      seen[y * p.w + x] = 1;
      while (st.length) {
        const [cx, cy] = st.pop();
        f.n++;
        f.sx += cx;
        f.x0 = Math.min(f.x0, cx);
        f.x1 = Math.max(f.x1, cx);
        f.y0 = Math.min(f.y0, cy);
        f.y1 = Math.max(f.y1, cy);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || nx >= p.w || ny < r0 || ny > r1 || seen[ny * p.w + nx] || !isFlame(nx, ny)) continue;
            seen[ny * p.w + nx] = 1;
            st.push([nx, ny]);
          }
      }
      const cxm = f.sx / f.n;
      if (f.n >= 8 && !(cxm > f0 + 4 && cxm < f1)) flames.push({ ...f, cx: cxm }); // not a highlight on the finial
    }
  flames.sort((a, b) => b.n - a.n);
  const keep = flames.slice(0, 5).sort((a, b) => a.cx - b.cx);
  if (keep.length !== 5) console.warn(`! found ${keep.length} lamp flames (expected 5)`);
  const mid = (f0 + f1) / 2;
  for (const f of keep) {
    for (let y = Math.max(0, f.y0 - 7); y <= f.y1; y++)
      for (let x = f.x0 - 5; x <= f.x1 + 5; x++) {
        if (x < 0 || x >= p.w) continue;
        const o = at(x, y);
        const mx = Math.round(2 * mid - x);
        if (x >= f0 - 2 && x <= f1 + 2 && mx >= 0 && mx < p.w && p.px[at(mx, y) + 3] > 200) {
          // in front of the (symmetric) finial: take its mirror side instead
          p.px.copy(p.px, o, at(mx, y), at(mx, y) + 4);
        } else p.px[o + 3] = 0;
      }
  }
  // anchor = the wick: bottom centre of each flame, as a share of the lamp
  p.extra.flames = keep.map((f) => ({ x: +(f.cx / p.w).toFixed(4), y: +((f.y1 + 1) / p.h).toFixed(4), h: +((f.y1 - f.y0 + 1) / p.h).toFixed(4) }));
  console.log(`lamp: ${keep.length} flame anchors`);
}

/* ── 5. henna palms ─────────────────────────────────────────────────── */
if (cfg.henna) {
  const P = pieces[cfg.henna.plain];
  const Hn = pieces[cfg.henna.henna];
  const lumA = (pc, x, y) => {
    if (x < 0 || y < 0 || x >= pc.w || y >= pc.h) return [0, 0, 0, 0];
    const o = (y * pc.w + x) * 4;
    return [pc.px[o], pc.px[o + 1], pc.px[o + 2], pc.px[o + 3]];
  };
  // align on the saree and cushion (the lower half), never on the palms
  const y0 = Math.round(P.h * 0.55);
  const score = (dx, dy, step) => {
    let s = 0;
    for (let y = y0; y < P.h; y += step)
      for (let x = 0; x < P.w; x += step) {
        const a = lumA(P, x, y);
        const b = lumA(Hn, x + dx, y + dy);
        s += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) + Math.abs(a[3] - b[3]);
      }
    return s;
  };
  const gx = Math.round((Hn.w - P.w) / 2);
  const gy = Hn.h - P.h;
  let best = [Infinity, gx, gy];
  for (let dy = gy - 30; dy <= gy + 30; dy += 2) for (let dx = gx - 30; dx <= gx + 30; dx += 2) {
    const s = score(dx, dy, 4);
    if (s < best[0]) best = [s, dx, dy];
  }
  let fine = best;
  for (let dy = best[2] - 2; dy <= best[2] + 2; dy++) for (let dx = best[1] - 2; dx <= best[1] + 2; dx++) {
    const s = score(dx, dy, 1);
    if (s < fine[0]) fine = [s, dx, dy];
  }
  const [, DX, DY] = fine;
  // where the two differ (henna lines), in the upper body only
  const diff = new Float32Array(P.w * P.h);
  for (let y = 0; y < Math.round(P.h * 0.6); y++)
    for (let x = 0; x < P.w; x++) {
      const a = lumA(P, x, y);
      const b = lumA(Hn, x + DX, y + DY);
      if (a[3] < 128 || b[3] < 128) continue;
      diff[y * P.w + x] = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    }
  const blurred = await sharp(Buffer.from(diff.map((v) => clamp(v, 0, 255))), { raw: { width: P.w, height: P.h, channels: 1 } })
    .blur(4)
    .extractChannel(0)
    .raw()
    .toBuffer();
  // the two biggest regions of difference are the palms
  const lab = new Int32Array(P.w * P.h).fill(-1);
  const regs = [];
  for (let s = 0; s < P.w * P.h; s++) {
    if (lab[s] !== -1 || blurred[s] < 34) continue;
    const r = { id: regs.length, list: [] };
    const st = [s];
    lab[s] = r.id;
    while (st.length) {
      const q = st.pop();
      r.list.push(q);
      const x = q % P.w;
      for (const u of [q - 1, q + 1, q - P.w, q + P.w]) {
        if (u < 0 || u >= P.w * P.h || lab[u] !== -1 || blurred[u] < 34) continue;
        if ((u === q - 1 && x === 0) || (u === q + 1 && x === P.w - 1)) continue;
        lab[u] = r.id;
        st.push(u);
      }
    }
    regs.push(r);
  }
  // the palms: for each hint, the biggest region of difference near it (the
  // rest — a jasmine drawn a little differently — is ignored)
  const near = (r, hx, hy) => {
    let d = Infinity;
    for (let k = 0; k < r.list.length; k += 7) {
      const q = r.list[k];
      d = Math.min(d, Math.hypot((q % P.w) - hx, Math.floor(q / P.w) - hy));
    }
    return d;
  };
  const palms = cfg.henna.palms.map(([sx, sy]) => {
    const hx = sx - P.x0;
    const hy = sy - P.y0;
    const cand = regs.filter((r) => r.list.length > 60 && near(r, hx, hy) < P.w * 0.12);
    if (!cand.length) fail(`henna: no palm found near ${sx},${sy}`);
    // merge every nearby region: a palm's henna can break into a few pieces
    return { list: cand.flatMap((r) => r.list) };
  });
  const mask = Buffer.alloc(P.w * P.h);
  const palmInfo = [];
  for (const r of palms) {
    let sx = 0;
    let sy = 0;
    for (const q of r.list) {
      mask[q] = 255;
      sx += q % P.w;
      sy += Math.floor(q / P.w);
    }
    const cx = sx / r.list.length;
    const cy = sy / r.list.length;
    let rad = 0;
    for (const q of r.list) rad = Math.max(rad, Math.hypot((q % P.w) - cx, Math.floor(q / P.w) - cy));
    palmInfo.push({ x: +(cx / P.w).toFixed(4), y: +(cy / P.h).toFixed(4), r: +((rad + 10) / P.w).toFixed(4) });
  }
  // close the gaps between henna lines (dilate), then feather
  const soft = await sharp(mask, { raw: { width: P.w, height: P.h, channels: 1 } })
    .blur(7)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const out = Buffer.alloc(P.w * P.h * 4);
  for (let y = 0; y < P.h; y++)
    for (let x = 0; x < P.w; x++) {
      const b = lumA(Hn, x + DX, y + DY);
      const m = clamp(soft[y * P.w + x] * 3.2, 0, 255) / 255; // dilated + feathered
      const o = (y * P.w + x) * 4;
      out[o] = b[0];
      out[o + 1] = b[1];
      out[o + 2] = b[2];
      out[o + 3] = Math.round(Math.min(b[3], lumA(P, x, y)[3]) * m);
    }
  palmInfo.sort((a, b) => a.x - b.x);
  pieces[cfg.henna.out] = { spec: { name: cfg.henna.out }, x0: 0, y0: 0, w: P.w, h: P.h, px: out, extra: { palms: palmInfo }, sameAs: cfg.henna.plain };
  P.extra.palms = palmInfo;
  console.log(`henna: aligned (${DX - gx}, ${DY - gy}) px; palms at ${palmInfo.map((p) => `${p.x},${p.y}`).join(" / ")}`);
}

/* ── 6. pivots ──────────────────────────────────────────────────────── */
for (const p of Object.values(pieces)) {
  const kind = p.spec.pivot ?? "bottom";
  if (kind === "center") p.pivot = [0.5, 0.5];
  else if (kind === "top") {
    // the hanging loop: centre of the top-most solid pixels
    let ty = 0;
    let sx = 0;
    let n = 0;
    for (let y = 0; y < p.h && !n; y++)
      for (let x = 0; x < p.w; x++)
        if (p.px[(y * p.w + x) * 4 + 3] > 128) {
          ty = y;
          sx += x;
          n++;
        }
    p.pivot = [+(sx / n / p.w).toFixed(4), +(ty / p.h).toFixed(4)];
  } else {
    // stands on the bottom centre of its box (the lowest solid row)
    let by = p.h - 1;
    const solid = (y) => {
      for (let x = 0; x < p.w; x++) if (p.px[(y * p.w + x) * 4 + 3] > 128) return true;
      return false;
    };
    while (by > 0 && !solid(by)) by--;
    p.pivot = [0.5, +((by + 1) / p.h).toFixed(4)];
  }
}

/* ── fit: place pieces by matching them against the master scene ───── */
const layoutPath = cfg.layout;
if (FIT) await fitLayout();
const layout = existsSync(layoutPath) ? JSON.parse(readFileSync(layoutPath, "utf8")) : null;

/* ── 7. export ──────────────────────────────────────────────────────── */
mkdirSync(cfg.outDir, { recursive: true });
const widestOnStage = {};
for (const it of layout?.items ?? []) widestOnStage[it.piece] = Math.max(widestOnStage[it.piece] ?? 0, it.w);
const manifest = { name: cfg.name, pieces: {} };
for (const [name, p] of Object.entries(pieces)) {
  const ref = p.sameAs ?? name;
  const screen = p.spec.screen ?? (widestOnStage[ref] ? (widestOnStage[ref] / 100) * cfg.stageMaxWidth : null);
  const target = screen ? Math.min(p.w, Math.ceil(screen * cfg.density)) : p.w;
  const scale = target / p.w;
  const w = Math.max(1, Math.round(p.w * scale));
  const h = Math.max(1, Math.round(p.h * scale));
  const file = `${name}.webp`;
  await sharp(p.px, { raw: { width: p.w, height: p.h, channels: 4 } })
    .resize(w, h, { kernel: "lanczos3" })
    .webp({ quality: 88, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(path.join(cfg.outDir, file));
  manifest.pieces[name] = { src: file, w, h, aspect: +(p.w / p.h).toFixed(4), pivot: p.pivot, ...p.extra };
}
// the master, for ?debug=1 only
const master = path.join(cfg.srcDir, "master.png");
if (existsSync(master)) {
  await sharp(master).resize({ width: 1024 }).webp({ quality: 70 }).toFile(path.join(cfg.outDir, "master.webp"));
  manifest.master = "master.webp";
}
writeFileSync(path.join(cfg.outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

/* ── 8. contact sheet ───────────────────────────────────────────────── */
const cards = Object.entries(manifest.pieces)
  .map(
    ([n, m]) => `<figure><div class="img"><img src="${m.src}" alt="${n}"></div><figcaption>${n}<small>${m.w}×${m.h}</small></figcaption></figure>`,
  )
  .join("\n");
writeFileSync(
  path.join(cfg.outDir, "contact.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${cfg.name} pieces</title><style>
body{margin:0;padding:20px;background:#f6eee3;font:13px/1.3 Georgia,serif;color:#5a1520}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
figure{margin:0;background:#f6eee3;border:1px solid rgb(176 138 74/.35);border-radius:8px;padding:8px}
.img{height:150px;display:grid;place-items:center;background:repeating-conic-gradient(#efe4d4 0 25%,#f6eee3 0 50%) 0 0/16px 16px}
img{max-width:100%;max-height:150px}
figcaption{margin-top:6px;display:flex;justify-content:space-between}small{opacity:.6}
.dark .img{background:#3a0a10}
</style></head><body>
<p>${Object.keys(manifest.pieces).length} pieces · <label><input type="checkbox" onchange="document.body.classList.toggle('dark',this.checked)"> dark background (shows any fringe)</label></p>
<main>${cards}</main></body></html>\n`,
);
console.log(`✔ ${Object.keys(manifest.pieces).length} pieces → ${cfg.outDir}`);

/* ────────────────────────────────────────────────────────────────────── */
async function fitLayout() {
  const F = cfg.fit;
  if (!F) fail("no `fit` section in the config");
  const { data: mdat, info: minfo } = await sharp(path.join(cfg.srcDir, "master.png")).removeAlpha().resize({ width: 256 }).raw().toBuffer({ resolveWithObject: true });
  const MW = minfo.width;
  const MH = minfo.height;
  const k = MW / 1024; // master px → small
  const items = [];
  for (const g of F.items) {
    const p = pieces[g.piece];
    // guess: the piece's box in master px [x0, y0, x1, y1]; search scale and position around it
    const [gx0, , gx1, gy1] = g.box;
    const guessW = (gx1 - gx0) * k;
    let best = { s: Infinity };
    const [s0, s1] = g.scale ?? [0.82, 1.18];
    const [r0, r1] = g.rows ?? [0, 1];
    for (let sf = s0; sf <= s1 + 1e-9; sf += 0.03) {
      const w = Math.max(4, Math.round(guessW * sf));
      const h = Math.round((w * p.h) / p.w);
      let img = sharp(p.px, { raw: { width: p.w, height: p.h, channels: 4 } }).resize(w, h);
      if (g.flip) img = img.flop();
      const { data: pd } = await img.raw().toBuffer({ resolveWithObject: true });
      const cx0 = Math.round(gx0 * k + (guessW - w) / 2);
      const cy0 = Math.round(gy1 * k - h); // keep the bottom where guessed
      const R = g.rows ? 20 : 14;
      for (let oy = -R; oy <= R; oy++)
        for (let ox = -R; ox <= R; ox++) {
          let s = 0;
          let n = 0;
          for (let y = Math.floor(h * r0); y < h * r1; y += 2)
            for (let x = 0; x < w; x += 2) {
              const o = (y * w + x) * 4;
              if (pd[o + 3] < 160) continue;
              const X = cx0 + ox + x;
              const Y = cy0 + oy + y;
              if (X < 0 || Y < 0 || X >= MW || Y >= MH) {
                s += 120;
                n++;
                continue;
              }
              const m = (Y * MW + X) * 3;
              s += Math.abs(pd[o] - mdat[m]) + Math.abs(pd[o + 1] - mdat[m + 1]) + Math.abs(pd[o + 2] - mdat[m + 2]);
              n++;
            }
          const avg = s / Math.max(1, n);
          if (avg < best.s) best = { s: avg, x: cx0 + ox, y: cy0 + oy, w, h };
        }
    }
    // to stage %: the stage is the master plus headroom on top
    const S = F.stage;
    const toX = (mx) => (mx / k / 1024) * 100;
    const toY = (my) => ((my / k + S.headroom * 1024) / (S.aspect * 1024)) * 100;
    const pv = g.flip ? [1 - p.pivot[0], p.pivot[1]] : p.pivot;
    items.push({
      id: g.id ?? g.piece,
      piece: g.piece,
      x: +toX(best.x + pv[0] * best.w).toFixed(2),
      y: +toY(best.y + pv[1] * best.h).toFixed(2),
      w: +toX(best.w).toFixed(2),
      z: g.z,
      ...(g.flip ? { flip: true } : {}),
    });
    console.log(`fit ${g.id ?? g.piece}: ${(best.s).toFixed(0)} avg diff`);
  }
  const doc = {
    "//": "Stage layout in % of the stage (x, y = the piece's pivot; w = width). Back to front by z. Made by --fit, tweak freely.",
    aspect: F.stage.aspect,
    items: [...items, ...F.extra].sort((a, b) => a.z - b.z),
  };
  mkdirSync(path.dirname(layoutPath), { recursive: true });
  writeFileSync(layoutPath, JSON.stringify(doc, null, 2) + "\n");
  console.log(`✔ layout → ${layoutPath}`);
}
