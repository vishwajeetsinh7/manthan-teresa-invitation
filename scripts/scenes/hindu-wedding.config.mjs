/**
 * Hindu wedding scene ("Four Rounds of Fire"): where every cut-out comes from
 * and what it is called. Used by scripts/build-scene-assets.mjs
 * (npm run scene:hindu-wedding). Sheet coordinates are pixels on the sheets.
 */
const particles = [
  ["fire", [[190, 270], [480, 250], [770, 270]], 70, { gather: 50, warm: 0.12 }],
  ["diya-flame", [[1040, 270], [1215, 280], [1390, 270]], 16, { warm: 0.12 }],
  ["spark", [[85, 488], [160, 515], [242, 485], [322, 505], [400, 483]], 7, { warm: 0.15 }],
  ["ghee-drop", [[503, 490]], 9, { warm: 0.2 }],
  ["petal-red", [[633, 480], [745, 505], [855, 485], [965, 500]], 14, {}],
  ["petal-pink", [[1105, 495], [1222, 500], [1335, 500], [1450, 495]], 14, {}],
  ["tuberose", [[140, 680], [355, 680], [545, 680], [735, 680]], 16, {}],
  ["petal-marigold", [[995, 680], [1188, 690], [1365, 685]], 14, { warm: 0.3 }],
  ["akshat", [[130, 880], [325, 880], [545, 870], [765, 875]], 14, { gather: 30 }],
  ["sparkle", [[985, 885], [1135, 885], [1280, 885], [1435, 880]], 14, { warm: 0.3 }],
];

/** pots used in each stack, bottom to top (7 = the one with the leaves): five, as in master-v2 */
const STACK = [1, 2, 3, 5, 7];

/* ── master-v2 px (1024 × 1536) → stage % (the stage is the master plus 15 % headroom on top) */
const A = 1.65;
const X = (mx) => +((mx / 1024) * 100).toFixed(2);
const Y = (my) => +(((my + 0.15 * 1024) / (A * 1024)) * 100).toFixed(2);
const Wd = (mw) => +((mw / 1024) * 100).toFixed(2);

const config = {
  name: "hindu-wedding",
  srcDir: "assets-src/hindu-wedding",
  outDir: "public/scenes/hindu-wedding",
  layout: "src/config/scenes/hindu-wedding.json",
  stageMaxWidth: 430,
  density: 3,
  // cap 1: blue-leaning pixels are screen showing through (see chroma-key)
  key: { screen: "blue", lo: 40, hi: 150, bg: [0, 3, 253], cap: 1 },
  minBlob: 30,
  attachGap: 18,
  attachGapBySheet: { props: -1, mandap: 6 },
  pad: 4,
  /** the layout reference and the ?debug=1 overlay (no friends; the kund and the pandit on the
   *  platform); master.png, the first version, is kept */
  master: "master-v2.png",
  sheets: {
    varmala: "varmala.png",
    couple: "couple.png",
    pandit: "pandit.png",
    props: "props.png",
    mandap: "mandap.png",
    particles: "particles.png",
    diya: "diya.png",
  },
  pieces: [
    { name: "groom-a", sheet: "varmala", at: [200, 600], points: { hands: [285, 330] } },
    { name: "groom-b", sheet: "varmala", at: [540, 600], points: { neck: [565, 222] } },
    { name: "bride-a", sheet: "varmala", at: [960, 700], points: { hands: [858, 358] } },
    { name: "bride-b", sheet: "varmala", at: [1320, 700], points: { neck: [1308, 268] } },
    { name: "couple-walk", sheet: "couple", at: [300, 600], gather: 20, points: { knot: [462, 498] } },
    { name: "couple-final", sheet: "couple", at: [1220, 600], gather: 20, points: { knot: [1212, 560] } },

    // (the two friends on the friends sheet are no longer in the scene; their files stay)

    // the pandit with his low seat and the ghee bowl beside it
    { name: "pandit", sheet: "pandit", at: [500, 500], gather: 60, points: { ladle: [40, 470] } },
    { name: "havan-kund", sheet: "pandit", at: [1175, 720], points: { fire: [1177, 548] } },

    { name: "kalash", sheet: "props", at: [195, 400] },
    { name: "thali", sheet: "props", at: [548, 430] },
    { name: "varmala-loose", sheet: "props", at: [1000, 330], pivot: "top" },
    { name: "antarpat", sheet: "props", at: [1325, 330], pivot: "top", points: { rodL: [1148, 66], rodR: [1503, 66] } },
    { name: "platform", sheet: "props", at: [770, 790] },
    // (the small cup with a stick on this sheet is not used — diya.png is)
    { name: "diya", sheet: "diya", at: [628, 650], points: { wick: [643, 330] } },

    { name: "canopy", sheet: "mandap", at: [770, 200], gather: 15, points: { capL: [85, 215], capR: [1452, 215] } },
    { name: "pillar", sheet: "mandap", at: [135, 640], points: { top: [135, 310], base: [135, 970] } },
    { name: "swag-wide", sheet: "mandap", at: [800, 480], pivot: "topcenter" },
    { name: "swag-narrow", sheet: "mandap", at: [800, 620], pivot: "topcenter" },
    { name: "pot-1", sheet: "mandap", at: [383, 840] },
    { name: "pot-2", sheet: "mandap", at: [622, 860] },
    { name: "pot-3", sheet: "mandap", at: [828, 870] },
    { name: "pot-4", sheet: "mandap", at: [1000, 880] },
    { name: "pot-5", sheet: "mandap", at: [1146, 900] },
    { name: "pot-6", sheet: "mandap", at: [1272, 910] },
    { name: "pot-7", sheet: "mandap", at: [1410, 920] },

    ...particles.flatMap(([base, points, screen, extra]) =>
      points.map((at, k) => ({ name: points.length > 1 ? `${base}-${k + 1}` : base, sheet: "particles", at, screen, pivot: "center", ...extra })),
    ),
  ],

  /** two poses of one figure: B aligned to A on the torso + legs (arms, garland, thali left out) */
  pairs: [
    { a: "groom-a", b: "groom-b", rows: [0.6, 1] },
    { a: "bride-a", b: "bride-b", rows: [0.62, 1] },
  ],

  fit: {
    stage: { aspect: A, headroom: 0.15 },
    items: [
      // matched against master-v2 (boxes in its px)
      { piece: "canopy", box: [112, 116, 912, 304], z: 4 },
      { piece: "swag-wide", box: [140, 288, 884, 436], z: 3.5, scale: [0.9, 1.1] },
      { piece: "couple-final", box: [250, 395, 660, 1012], z: 5, rows: [0, 0.6] },
      // the havan kund at the front-centre of the platform (master-v2: x 365–630, its base at y 1106)
      { piece: "havan-kund", fixed: { x: X(497), y: Y(1106), w: Wd(268) }, z: 5.2 },
      // the pandit on the platform, right of the fire, facing it (master-v2: x 640–870, seat at y 1064)
      // (his piece includes his low seat and the ghee bowl at his left)
      { piece: "pandit", fixed: { x: X(742), y: Y(1066), w: Wd(318) }, z: 5.4 },
      { piece: "kalash", box: [362, 1228, 600, 1404], z: 11 },
      { piece: "thali", box: [596, 1290, 800, 1404], z: 11 },
      // the platform: deeper than its art (master-v2: x 20–1005, its back edge at y ≈ 975,
      // the front face down to y ≈ 1230) — stretched to that height
      { piece: "platform", fixed: { x: X(512), y: Y(1246), w: Wd(986), h: +((292 / (A * 1024)) * 100).toFixed(2) }, z: 2 },
    ],
    /** the rest, placed from master-v2's measurements and from each other */
    extra: (items, P) => {
      const byId = Object.fromEntries(items.map((i) => [i.id, i]));
      const asp = (n) => P[n].w / P[n].h;
      const r2 = (n) => +n.toFixed(2);
      const box = (it) => {
        const h = it.h ?? it.w / asp(it.piece) / A;
        const piv = P[it.piece].pivot;
        const px = it.flip ? 1 - piv[0] : piv[0];
        return { left: it.x - px * it.w, top: it.y - piv[1] * h, w: it.w, h };
      };
      const out = [];

      // pillars: the front ones from the platform top up to the canopy's caps, the back ones
      // inward and a touch darker (master-v2: front at x 110 / 914, back at 262 / 762)
      const pillar = (id, x, topY, baseY, w, z, tone) => ({ id, piece: "pillar", x: X(x), y: Y(baseY), w: Wd(w), h: r2(Y(baseY) - Y(topY)), z, ...(tone ? { tone } : {}) });
      out.push(pillar("pillar-back-l", 262, 292, 960, 40, 1, 0.9), pillar("pillar-back-r", 762, 292, 960, 40, 1, 0.9));
      out.push(pillar("pillar-l", 110, 262, 1012, 56, 3), pillar("pillar-r", 914, 262, 1012, 56, 3));
      // the narrow swag just behind the wide one
      const sw = byId["swag-wide"];
      out.push({ id: "swag-narrow", piece: "swag-narrow", x: sw.x, y: r2(sw.y + 2), w: r2(sw.w * 0.84), z: 3.4 });

      // pot stacks at the platform's front corners (master-v2: centres x 140 / 889, from the
      // platform (y 1160) up to the leaves (y 775))
      const natural = STACK.reduce((t, n) => t + P[`pot-${n}`].h * 0.86, 0);
      const k = (Y(1160) - Y(775)) / natural; // stage-% of height per sheet px
      for (const [side, x] of [["l", 140], ["r", 889]]) {
        let y = Y(1160);
        STACK.forEach((n, j) => {
          const piece = `pot-${n}`;
          const hPct = P[piece].h * k;
          out.push({ id: `pot-${side}${j + 1}`, piece, x: X(x), y: r2(y), w: r2(hPct * A * asp(piece)), z: 7 + j * 0.01 });
          y -= hPct * 0.86;
        });
      }

      // the couple's separate figures, at the scale of couple-final, on its feet line
      const cf = byId["couple-final"];
      const sheetScale = cf.w / P["couple-final"].w;
      const feetY = cf.y;
      const spread = 21 * (cf.w / 48.83); // how far apart they arrive (as before, at this scale)
      const fig = (id, piece, x, z) => ({ id, piece, x: r2(x), y: feetY, w: r2(P[piece].w * sheetScale), z });
      const groomA = fig("groom-a", "groom-a", cf.x - spread, 6.6);
      const brideA = fig("bride-a", "bride-a", cf.x + spread, 6.6);
      out.push(groomA, brideA);
      const alignB = (a, bName, id) => {
        const al = P[bName].extra.align;
        const ab = box(a);
        const w = ab.w * al.w;
        const h = w / asp(bName) / A;
        const piv = P[bName].pivot;
        return { id, piece: bName, x: r2(ab.left + al.x * ab.w + piv[0] * w), y: r2(ab.top + al.y * ab.h + piv[1] * h), w: r2(w), z: a.z };
      };
      out.push(alignB(groomA, "groom-b", "groom-b"), alignB(brideA, "bride-b", "bride-b"));

      // the antarpat hangs from the canopy (on cords drawn by the scene) in front of the couple,
      // wide and long enough to hide them both until it is lowered
      const anW = r2(cf.w * 1.12);
      const ah = anW / asp("antarpat") / A;
      const rodY = feetY - ah * 0.985;
      // (in front of the couple, behind the kund and the pandit)
      out.push({ id: "antarpat", piece: "antarpat", x: cf.x, y: r2(rodY + P.antarpat.pivot[1] * ah), w: anW, z: 5.1 });

      // the loose garlands that fly between them (hidden until the varmala)
      const vw = r2(P["varmala-loose"].w * sheetScale);
      out.push({ id: "varmala-1", piece: "varmala-loose", x: groomA.x, y: 40, w: vw, z: 6.9 }, { id: "varmala-2", piece: "varmala-loose", x: brideA.x, y: 40, w: vw, z: 6.9 });
      out.push({ id: "couple-walk", piece: "couple-walk", x: cf.x, y: feetY, w: r2(P["couple-walk"].w * sheetScale), z: 5.5 });

      // four diyas along the platform's front edge (master-v2: x 240 / 345 / 676 / 790, standing at y 1162)
      [240, 345, 676, 790].forEach((x, i) => out.push({ id: `diya-${i + 1}`, piece: "diya", x: X(x), y: Y(1162), w: Wd(56), z: 11 }));

      // a scatter of petals, tuberose and akshat (the floor, and a few on the platform)
      const kinds = ["petal-red-1", "tuberose-2", "akshat-1", "petal-pink-2", "petal-red-3", "akshat-3", "tuberose-4", "petal-pink-4", "petal-red-2", "akshat-2", "petal-marigold-1", "tuberose-1", "petal-pink-1", "akshat-4"];
      const sx = [6, 14, 24, 33, 43, 57, 66, 74, 85, 94, 22, 35, 64, 78];
      const sy = [95, 98, 96, 99, 97.5, 98.5, 96.2, 99, 95.6, 98.2, Y(1020), Y(1040), Y(1035), Y(1015)];
      kinds.forEach((piece, i) =>
        out.push({ id: `scatter-${i + 1}`, piece, x: sx[i], y: r2(sy[i]), w: piece.startsWith("akshat") ? 4 : 3.4, z: i < 10 ? 12 : 2.5, rot: [20, -50, 0, 80, -110, 30, 140, -20, 60, -70, 10, 95, -35, 50][i] }),
      );
      return out;
    },
  },
};

export default config;
