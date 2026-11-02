/**
 * Church wedding scene ("The Aisle"): where every cut-out comes from and
 * where it stands. Used by scripts/build-scene-assets.mjs
 * (npm run scene:church-wedding). Sheet coordinates are pixels on the sheets;
 * placements below are in master pixels (master-v2 = 1024 × 1536).
 */
const particles = [
  ["flame", [[957, 200], [1136, 200], [1314, 200]], 10, { warm: 0.12 }],
  ["petal-white", [[837, 405], [923, 405], [1008, 410], [1100, 407]], 12, {}],
  ["petal-pink", [[1195, 406], [1290, 411], [1384, 412], [1474, 408]], 12, {}],
  ["gyp", [[883, 626], [1009, 637], [1129, 630]], 16, { gather: 24 }],
  ["leaf-gold", [[1226, 616], [1305, 626], [1389, 616], [1473, 616]], 12, { warm: 0.3 }],
  ["sparkle", [[974, 830], [1101, 830], [1233, 830], [1364, 830]], 14, { warm: 0.3 }],
];

// a bridesmaid's pallu and the little girl's basket touch on the people sheet: cut between them
const GIRL_LINE = [[857, 470], [862, 640], [884, 690], [871, 760], [868, 880]];

/* ── master px → stage % (the stage is the master plus 15 % headroom on top) */
const A = 1.65;
const HEAD = 0.15 * 1024;
const X = (mx) => +((mx / 1024) * 100).toFixed(2);
const Y = (my) => +(((my + HEAD) / (A * 1024)) * 100).toFixed(2);
const Wd = (mw) => +((mw / 1024) * 100).toFixed(2);

/** where the couple stand at the altar (feet), and how small they are there (× their size at the front) */
export const ALTAR = { x: 512, feet: 652, scale: 0.34 };
/** the four guest pews (2 × 2 on guests.png) */
const GUESTS = [[395, 300], [1140, 300], [395, 780], [1140, 780]];

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
  /** the layout reference and the ?debug=1 overlay (no bridesmaids, no red cloth, a smaller
   *  priest, varied guests); master.png, the first version, is kept */
  master: "master-v2.png",
  sheets: {
    backdrop: "church-backdrop.png",
    altar: "altar.png",
    // (couple-aisle.png, couple-altar.png and groom.png are no longer used)
    walk: "couple-walk-v2.png",
    vows: "couple-altar-v2.png",
    guests: "guests.png",
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

    // the couple walking towards us, arm in arm
    { name: "couple-walk", sheet: "walk", at: [512, 800] },
    // at the altar: A — he ties the minnu (neck: its glint); B — he slips the ring on her finger
    { name: "couple-altar-a", sheet: "vows", at: [330, 600], points: { neck: [330, 257] } },
    { name: "couple-altar-b", sheet: "vows", at: [1070, 600], points: { ring: [1242, 295] } },
    ...GUESTS.map((at, i) => ({ name: `pew-guests-${i + 1}`, sheet: "guests", at, gather: 20 })),

    // (cut at the waist: the altar table hides the rest)
    { name: "priest", sheet: "people", at: [140, 500], clip: [0, 0, 300, 640] },
    // (the two bridesmaids on this sheet are no longer in the scene)
    { name: "girl-back", sheet: "people", at: [1000, 650], split: { line: GIRL_LINE, keep: "right" }, points: { basket: [900, 600] } },
    { name: "girl-front", sheet: "people", at: [1250, 650], points: { basket: [1265, 610] } },
    { name: "ring-boy", sheet: "people", at: [1440, 650] },

    { name: "runner", sheet: "pews", at: [300, 500] },
    { name: "pew", sheet: "pews", at: [900, 250] },
    { name: "pew-bouquet", sheet: "pews", at: [1400, 520], gather: 30, pivot: "top" },

    ...particles.flatMap(([base, points, screen, extra]) =>
      points.map((at, k) => ({ name: `${base}-${k + 1}`, sheet: "particles", at, screen, pivot: "center", ...extra })),
    ),
  ],

  /** the two altar poses overlap exactly (aligned on their legs and the saree; the arms left out) */
  pairs: [{ a: "couple-altar-a", b: "couple-altar-b", rows: [0.62, 1] }],

  fit: {
    stage: { aspect: A, headroom: 0.15 },
    items: [
      { piece: "couple-walk", box: [278, 470, 812, 1290], z: 6 },
      { piece: "girl-front", box: [75, 990, 335, 1450], z: 7 },
      { piece: "ring-boy", box: [765, 1060, 920, 1432], z: 7 },
    ],
    extra: (items, P) => {
      const out = [];
      const byId = Object.fromEntries(items.map((i) => [i.id, i]));
      const asp = (n) => P[n].w / P[n].h;
      /** an item from a master-px box: centre x, pivot y, width */
      const put = (id, piece, mx, my, mw, z, more = {}) => ({ id, piece, x: X(mx), y: Y(my), w: Wd(mw), z, ...more });

      out.push({ id: "backdrop", piece: "backdrop", x: 50, y: Y(1536), w: 100, z: 0 });
      out.push(put("window-l", "window", 172, 485, 128, 1), put("window-r", "window", 852, 485, 128, 1));

      // the altar (back + table), set far back as in master-v2: drawn at 0.58 of its sheet size,
      // centred, its steps ending at y 612
      const AS = 0.58;
      const altarAt = (name) => {
        const p = P[name];
        const left = 512 + (p.x0 - 316.5) * AS;
        const top = 612 + (p.y0 - 952) * AS;
        const w = p.w * AS;
        const h = p.h * AS;
        return { left, top, w, h, x: left + p.pivot[0] * w, y: top + p.pivot[1] * h };
      };
      const ab = altarAt("altar-back");
      const at = altarAt("altar-table");
      out.push(put("altar-back", "altar-back", ab.x, ab.y, ab.w, 2), put("altar-table", "altar-table", at.x, at.y, at.w, 3));
      // the priest behind the table, two thirds of his first size: his head ~105 px above it,
      // his waist cut hidden behind it
      const PS = 0.52;
      const pr = P.priest;
      const prTop = at.top - 92; // where his head (sheet y 166) is
      const prLeft = 500 - (145 - pr.x0) * PS;
      out.push(put("priest", "priest", prLeft + pr.pivot[0] * pr.w * PS, prTop + (pr.y0 + pr.pivot[1] * pr.h - 166) * PS, pr.w * PS, 2.5));

      out.push(put("arch", "arch", 512, 142, 580, 3.5));
      [447, 512, 577].forEach((x, i) => out.push(put(`bell-${i + 1}`, `bell-${i + 1}`, x, 198, 36, 3.6)));
      out.push(put("candle-l1", "candle-tall", 250, 600, 38, 3.8), put("candle-r1", "candle-tall", 774, 600, 38, 3.8));
      out.push(put("candle-l2", "candle-short", 318, 604, 32, 3.8), put("candle-r2", "candle-short", 706, 604, 32, 3.8));
      out.push(put("stand-l", "flower-stand", 52, 470, 116, 3.4), put("stand-r", "flower-stand", 972, 470, 116, 3.4, { flip: true }));

      // the aisle runner, from the altar steps to the front (stretched to the floor's depth)
      out.push({ id: "runner", piece: "runner", x: 50, y: Y(1536), w: Wd(800), h: +(((1536 - 612) / (A * 1024)) * 100).toFixed(2), z: 1.5 });

      // pews down each side (left: the aisle end on the right; right: flipped), a bouquet on each
      // end; guests vary — no pew shows the guests of the one in front or behind it, and the right
      // side never mirrors the left at the same depth; the front pews are empty
      const rows = [
        { l: "pew", r: "pew", end: 392, bottom: 690, w: 230, z: 3.8 },
        { l: "pew-guests-1", r: "pew-guests-3", end: 368, bottom: 770, w: 260, z: 3.85 },
        { l: "pew-guests-2", r: "pew-guests-4", end: 320, bottom: 870, w: 290, z: 3.9 },
        { l: "pew-guests-3", r: "pew-guests-1", end: 252, bottom: 990, w: 320, z: 4.2 },
        { l: "pew-guests-4", r: "pew-guests-2", end: 172, bottom: 1135, w: 350, z: 4.5 },
        { l: "pew-guests-1", r: "pew-guests-3", end: 96, bottom: 1310, w: 380, z: 5.5 },
      ];
      rows.forEach((r, i) => {
        for (const side of ["l", "r"]) {
          const piece = r[side];
          // (the pew itself is the lower part of a guests piece: size it by the pew)
          const pewShare = piece === "pew" ? 1 : 0.62;
          const h = r.w / asp(piece);
          const end = side === "l" ? r.end : 1024 - r.end;
          const cx = side === "l" ? end - r.w / 2 : end + r.w / 2;
          out.push(put(`pew-${side}${i + 1}`, piece, cx, r.bottom, r.w, r.z, side === "r" ? { flip: true } : {}));
          void pewShare;
          // the bouquet hangs on the pew's end post
          const bx = side === "l" ? end - r.w * 0.06 : end + r.w * 0.06;
          const postTop = piece === "pew" ? h * 0.78 : h * 0.62; // the end post's top, up from the floor
          // (drawn over all the pews: each hangs on the aisle end, which moves outwards row by row, so
          // no nearer pew is behind it)
          out.push(put(`bouquet-${side}${i + 1}`, "pew-bouquet", bx, r.bottom - postTop, r.w * 0.17, 5.7 + i * 0.01, side === "r" ? { flip: true } : {}));
        }
      });

      // the couple at the altar: as tall as the walking couple × ALTAR.scale (matched by height —
      // the sheets are drawn at different scales), groom on the left as he walks out
      const cw = byId["couple-walk"];
      const cwH = cw.w / asp("couple-walk") / A; // stage-% height at the front
      const altarH = cwH * ALTAR.scale;
      const ca = { id: "couple-altar-a", piece: "couple-altar-a", x: X(ALTAR.x), y: Y(ALTAR.feet), w: 0, z: 3.7 };
      ca.w = +(altarH * A * asp("couple-altar-a")).toFixed(2);
      out.push(ca);
      // the ring pose sits exactly over the first (pair alignment)
      {
        const al = P["couple-altar-b"].extra.align;
        const ah = ca.w / asp("couple-altar-a") / A;
        const aleft = ca.x - P["couple-altar-a"].pivot[0] * ca.w;
        const atop = ca.y - P["couple-altar-a"].pivot[1] * ah;
        const w = ca.w * al.w;
        const h = w / asp("couple-altar-b") / A;
        const piv = P["couple-altar-b"].pivot;
        out.push({ id: "couple-altar-b", piece: "couple-altar-b", x: +(aleft + al.x * ca.w + piv[0] * w).toFixed(2), y: +(atop + al.y * ah + piv[1] * h).toFixed(2), w: +w.toFixed(2), z: 3.7 });
      }
      // the little flower girl starts at the front of the aisle (the timeline walks her up)
      const gf = byId["girl-front"];
      const gscale = gf.w / P["girl-front"].w;
      out.push({ id: "girl-back", piece: "girl-back", x: X(500), y: Y(1500), w: +(P["girl-back"].w * gscale).toFixed(2), z: 6.6 });

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
