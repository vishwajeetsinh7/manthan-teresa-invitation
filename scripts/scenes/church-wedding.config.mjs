/**
 * Church wedding scene ("The Aisle"): where every cut-out comes from and
 * where it stands. Used by scripts/build-scene-assets.mjs
 * (npm run scene:church-wedding). Sheet coordinates are pixels on the sheets;
 * placements below are in master pixels (master = 1024 × 1536).
 */
const particles = [
  ["flame", [[957, 200], [1136, 200], [1314, 200]], 10, { warm: 0.12 }],
  ["petal-white", [[837, 405], [923, 405], [1008, 410], [1100, 407]], 12, {}],
  ["petal-pink", [[1195, 406], [1290, 411], [1384, 412], [1474, 408]], 12, {}],
  ["gyp", [[883, 626], [1009, 637], [1129, 630]], 16, { gather: 24 }],
  ["leaf-gold", [[1226, 616], [1305, 626], [1389, 616], [1473, 616]], 12, { warm: 0.3 }],
  ["sparkle", [[974, 830], [1101, 830], [1233, 830], [1364, 830]], 14, { warm: 0.3 }],
];

// the bridesmaid's pallu and the little girl's basket touch on the sheet: cut between them
const GIRL_LINE = [[857, 470], [862, 640], [884, 690], [871, 760], [868, 880]];

/* ── master px → stage % (the stage is the master plus 15 % headroom on top) */
const A = 1.65;
const HEAD = 0.15 * 1024;
const X = (mx) => +((mx / 1024) * 100).toFixed(2);
const Y = (my) => +(((my + HEAD) / (A * 1024)) * 100).toFixed(2);
const Wd = (mw) => +((mw / 1024) * 100).toFixed(2);

/** where the couple stand at the altar (feet), and how small they are there */
export const ALTAR = { x: 512, feet: 770, scale: 0.42 };

const config = {
  name: "church-wedding",
  srcDir: "assets-src/church-wedding",
  outDir: "public/scenes/church-wedding",
  layout: "src/config/scenes/church-wedding.json",
  stageMaxWidth: 430,
  density: 3,
  key: { screen: "blue", lo: 40, hi: 150, bg: [0, 3, 253], cap: 1 },
  minBlob: 30,
  attachGap: 18,
  attachGapBySheet: { altar: -1, pews: 2, people: 6, particles: -1 },
  pad: 4,
  sheets: {
    backdrop: "church-backdrop.png",
    altar: "altar.png",
    aisle: "couple-aisle.png",
    vows: "couple-altar.png",
    groom: "groom.png",
    people: "people.png",
    pews: "pews.png",
    particles: "particles.png",
  },
  pieces: [
    { name: "backdrop", sheet: "backdrop", at: [512, 768] },

    // the altar is cut at the table top so the priest can stand behind the table
    { name: "altar-back", sheet: "altar", at: [300, 300], clip: [0, 0, 640, 645] },
    { name: "altar-table", sheet: "altar", at: [300, 760], clip: [0, 645, 640, 1024] },
    { name: "arch", sheet: "altar", at: [640, 330], gather: 20, pivot: "topcenter" },
    { name: "bell-1", sheet: "altar", at: [777, 840], pivot: "top" },
    { name: "bell-2", sheet: "altar", at: [925, 840], pivot: "top" },
    { name: "bell-3", sheet: "altar", at: [1067, 840], pivot: "top" },
    { name: "window", sheet: "altar", at: [1335, 300] },
    { name: "candle-tall", sheet: "altar", at: [1228, 820], clip: [1180, 600, 1270, 980], points: { wick: [1229, 646] } },
    { name: "candle-short", sheet: "altar", at: [1296, 820], clip: [1270, 600, 1340, 980], points: { wick: [1296, 692] } },
    { name: "flower-stand", sheet: "altar", at: [1430, 720] },

    { name: "bride-father", sheet: "aisle", at: [560, 500], points: { bride: [240, 300] } },
    { name: "couple-walk", sheet: "aisle", at: [1000, 600], points: { hands: [1030, 360] } },
    { name: "couple-veil", sheet: "vows", at: [480, 600], points: { bride: [335, 245], groom: [510, 200] } },
    { name: "couple-kodi", sheet: "vows", at: [1230, 600] },
    { name: "groom", sheet: "groom", at: [500, 700] },

    // (cut at the waist: the altar table hides the rest)
    { name: "priest", sheet: "people", at: [140, 500], clip: [0, 0, 300, 640] },
    { name: "bridesmaid-pink", sheet: "people", at: [430, 600], points: { basket: [505, 420] } },
    { name: "bridesmaid-kerala", sheet: "people", at: [740, 600], split: { line: GIRL_LINE, keep: "left" }, points: { basket: [705, 430] } },
    { name: "girl-back", sheet: "people", at: [1000, 650], split: { line: GIRL_LINE, keep: "right" }, points: { basket: [900, 600] } },
    { name: "girl-front", sheet: "people", at: [1250, 650], points: { basket: [1265, 610] } },
    { name: "ring-boy", sheet: "people", at: [1440, 650] },

    { name: "runner", sheet: "pews", at: [300, 500] },
    { name: "pew", sheet: "pews", at: [900, 250] },
    { name: "pew-guests", sheet: "pews", at: [900, 800] },
    { name: "pew-bouquet", sheet: "pews", at: [1400, 520], gather: 30, pivot: "top" },

    { name: "kodi", sheet: "particles", at: [200, 300], pivot: "topcenter" },
    ...particles.flatMap(([base, points, screen, extra]) =>
      points.map((at, k) => ({ name: `${base}-${k + 1}`, sheet: "particles", at, screen, pivot: "center", ...extra })),
    ),
  ],

  /** the two altar poses overlap exactly (aligned on the saree hem and the groom's legs) */
  pairs: [{ a: "couple-veil", b: "couple-kodi", rows: [0.72, 1] }],

  fit: {
    stage: { aspect: A, headroom: 0.15 },
    items: [
      { piece: "couple-walk", box: [280, 460, 810, 1280], z: 6 },
      { piece: "girl-front", box: [75, 990, 335, 1450], z: 7 },
      { piece: "ring-boy", box: [765, 990, 920, 1455], z: 7 },
      // the bridesmaids are cut off by the pews in the master: placed by their faces
      { piece: "bridesmaid-pink", fixed: { x: X(136), y: Y(1118), w: Wd(362) }, z: 4.2 },
      { piece: "bridesmaid-kerala", fixed: { x: X(899), y: Y(1143), w: Wd(280) }, z: 4.2 },
    ],
    extra: (items, P) => {
      const out = [];
      const byId = Object.fromEntries(items.map((i) => [i.id, i]));
      const asp = (n) => P[n].w / P[n].h;
      /** an item from a master-px box: centre x, pivot y, width */
      const put = (id, piece, mx, my, mw, z, more = {}) => ({ id, piece, x: X(mx), y: Y(my), w: Wd(mw), z, ...more });

      out.push({ id: "backdrop", piece: "backdrop", x: 50, y: Y(1536), w: 100, z: 0 });
      out.push(put("window-l", "window", 172, 485, 128, 1), put("window-r", "window", 852, 485, 128, 1));

      // the altar (back + table), drawn at 0.75 of its sheet size, centred, its steps ending at 730
      const AS = 0.75;
      const altarAt = (name) => {
        const p = P[name];
        const left = 512 + (p.x0 - 316.5) * AS;
        const top = 730 + (p.y0 - 952) * AS;
        const w = p.w * AS;
        const h = p.h * AS;
        return { left, top, w, h, x: left + p.pivot[0] * w, y: top + p.pivot[1] * h };
      };
      const ab = altarAt("altar-back");
      const at = altarAt("altar-table");
      out.push(put("altar-back", "altar-back", ab.x, ab.y, ab.w, 2), put("altar-table", "altar-table", at.x, at.y, at.w, 3));
      // the priest behind the table: his head ~160 px above it, his waist cut hidden behind it
      const PS = 0.78;
      const pr = P.priest;
      const prTop = at.top - 160; // where his head (sheet y 166) is
      const prLeft = 500 - (145 - pr.x0) * PS;
      out.push(put("priest", "priest", prLeft + pr.pivot[0] * pr.w * PS, prTop + (pr.y0 + pr.pivot[1] * pr.h - 166) * PS, pr.w * PS, 2.5));

      out.push(put("arch", "arch", 512, 46, 600, 3.5));
      [450, 512, 574].forEach((x, i) => out.push(put(`bell-${i + 1}`, `bell-${i + 1}`, x, 122, 40, 3.6)));
      out.push(put("candle-l1", "candle-tall", 262, 738, 46, 3.8), put("candle-r1", "candle-tall", 762, 738, 46, 3.8));
      out.push(put("candle-l2", "candle-short", 318, 742, 40, 3.8), put("candle-r2", "candle-short", 706, 742, 40, 3.8));
      out.push(put("stand-l", "flower-stand", 62, 610, 132, 3.4), put("stand-r", "flower-stand", 962, 610, 132, 3.4, { flip: true }));

      // the aisle runner, from the altar steps to the front (stretched to the floor's depth)
      out.push({ id: "runner", piece: "runner", x: 50, y: Y(1536), w: Wd(800), h: +(((1536 - 728) / (A * 1024)) * 100).toFixed(2), z: 1.5 });

      // pews down each side (left: the aisle end on the right; right: flipped), a bouquet on each end
      const rows = [
        { piece: "pew-guests", end: 384, bottom: 862, w: 300, z: 3.9 },
        { piece: "pew-guests", end: 326, bottom: 1046, w: 320, z: 4.5 },
        { piece: "pew", end: 268, bottom: 1262, w: 300, z: 5.5 },
      ];
      rows.forEach((r, i) => {
        const h = r.w / asp(r.piece);
        for (const side of ["l", "r"]) {
          const end = side === "l" ? r.end : 1024 - r.end;
          const cx = side === "l" ? end - r.w / 2 : end + r.w / 2;
          out.push(put(`pew-${side}${i + 1}`, r.piece, cx, r.bottom, r.w, r.z, side === "r" ? { flip: true } : {}));
          // the bouquet hangs on the pew's end post
          const bx = side === "l" ? end - r.w * 0.06 : end + r.w * 0.06;
          out.push(put(`bouquet-${side}${i + 1}`, "pew-bouquet", bx, r.bottom - h * 0.78, r.w * 0.17, r.z + 0.05, side === "r" ? { flip: true } : {}));
        }
      });

      // the couple's other figures, at couple-walk's sheet scale (same artist scale), at the altar
      const cw = byId["couple-walk"];
      const scale = cw.w / P["couple-walk"].w; // stage-% width per sheet px (front, full size)
      const altarW = (piece, k = 1) => +(P[piece].w * scale * ALTAR.scale * k).toFixed(2);
      // the altar poses face us; flipped so the groom is on the left, as he walks out
      out.push({ id: "couple-veil", piece: "couple-veil", x: X(ALTAR.x), y: Y(ALTAR.feet), w: altarW("couple-veil"), z: 3.7, flip: true });
      // the second pose sits exactly over the first (pair alignment, mirrored)
      const veil = out[out.length - 1];
      const al = P["couple-kodi"].extra.align;
      {
        const vw = veil.w;
        const vh = vw / asp("couple-veil") / A;
        const vleft = veil.x - (1 - P["couple-veil"].pivot[0]) * vw;
        const vtop = veil.y - P["couple-veil"].pivot[1] * vh;
        const w = vw * al.w;
        const h = w / asp("couple-kodi") / A;
        const left = vleft + (1 - al.x - al.w) * vw; // mirrored
        const top = vtop + al.y * vh;
        out.push({ id: "couple-kodi", piece: "couple-kodi", x: +(left + (1 - P["couple-kodi"].pivot[0]) * w).toFixed(2), y: +(top + P["couple-kodi"].pivot[1] * h).toFixed(2), w: +w.toFixed(2), z: 3.7, flip: true });
      }
      // the groom waits at the altar, left of centre, looking towards the aisle (his figure is
      // drawn bigger on its own sheet: matched to the groom in couple-walk by height)
      const groomK = (970 - 35) / (1474 - 36);
      // (where the groom stands in the flipped altar pose: his sheet x ≈ 510 on the vows sheet)
      const vp = P["couple-veil"];
      const groomX = veil.x + (0.5 - (510 - vp.x0) / vp.w) * veil.w;
      out.push({ id: "groom", piece: "groom", x: +groomX.toFixed(2), y: Y(ALTAR.feet), w: altarW("groom", groomK), z: 3.7, flip: true });
      // bride + father, and the little flower girl, start at the front of the aisle (the timeline
      // walks them up, smaller and smaller); full size here
      out.push({ id: "bride-father", piece: "bride-father", x: X(560), y: Y(1500), w: +(P["bride-father"].w * scale).toFixed(2), z: 6.5 });
      const gf = byId["girl-front"];
      const gscale = gf.w / P["girl-front"].w;
      out.push({ id: "girl-back", piece: "girl-back", x: X(500), y: Y(1500), w: +(P["girl-back"].w * gscale).toFixed(2), z: 6.6 });
      // the manthrakodi, laid over the bride's shoulders by the groom (hidden until then)
      out.push({ id: "kodi", piece: "kodi", x: X(560), y: Y(ALTAR.feet - 300), w: +(altarW("couple-veil") * 0.62).toFixed(2), z: 3.75 });

      // a static scatter of petals along the runner
      const kinds = ["petal-white-1", "petal-pink-2", "petal-white-3", "petal-pink-4", "petal-white-2", "petal-pink-1", "petal-white-4", "petal-pink-3", "petal-white-1", "petal-pink-2"];
      const sx = [430, 600, 380, 650, 470, 560, 330, 700, 520, 450];
      const sy = [1300, 1330, 1420, 1440, 1480, 1500, 1500, 1490, 1390, 1360];
      kinds.forEach((piece, i) => out.push({ id: `scatter-${i + 1}`, piece, x: X(sx[i]), y: Y(sy[i]), w: 3, z: 1.6, rot: [20, -50, 0, 80, -110, 30, 140, -20, 60, -70][i] }));
      return out;
    },
  },
};

export default config;
