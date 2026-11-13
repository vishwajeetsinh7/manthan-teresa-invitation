/**
 * The opening card's culture "side wings": Kerala (the bride's family) down the left edge,
 * Gujarat (the groom's family) down the right. Used by scripts/build-scene-assets.mjs
 * (npm run scene:culture). Art: assets-src/culture; the layout reference / ?debug=1 overlay is
 * culture-master.png (1024 × 1536).
 *
 * The backwaters and the houseboat were painted on black with a soft glow (not on the blue
 * screen): those two sheets use the glow key. The diya flames are the Hindu wedding's.
 *
 * Kathakali's eye glances and the garba click need three edits of the front sheets
 * (kathakali-eyes-left.png, kathakali-eyes-right.png, garba-click.png): while they are missing
 * they are skipped (and listed by the build); once added they are aligned to their base pieces
 * and swapped in as whole pieces (pairs), which has no seam.
 */
const OLD = "../hindu-wedding/";

/** temple-step diya bowls (gujarat-scenery px): the top of each bowl, where its flame sits */
const STEP_DIYAS = [
  [303, 550], [528, 552], [272, 595], [510, 598], [224, 634],
  [469, 641], [185, 684], [438, 697], [135, 729], [403, 748],
];

const config = {
  name: "culture",
  srcDir: "assets-src/culture",
  outDir: "public/scenes/culture",
  layout: "src/config/scenes/culture.json",
  // the card is at most 430 px wide (phones); pieces export at 2× their size there (scenery 3×)
  stageMaxWidth: 430,
  density: 2,
  key: { screen: "blue", lo: 40, hi: 150, bg: [0, 3, 253], cap: 1 },
  sheetKeys: {
    kscene: { kind: "glow", tex: 6, dark: 120, blueRatio: 0.2 },
    kboat: { kind: "glow", tex: 9, dark: 130, blueRatio: 0.22 },
  },
  minBlob: 30,
  attachGap: 18,
  attachGapBySheet: { particles: -1, flame: -1 },
  pad: 4,
  profiles: true,
  master: "culture-master.png",
  sheets: {
    kscene: "kerala-scenery.png",
    kboat: "kerala-houseboat.png",
    ktall: "kerala-tall.png",
    kfront: "kerala-front.png",
    gscene: "gujarat-scenery.png",
    gtall: "gujarat-tall.png",
    gfront: "gujarat-front.png",
    particles: "particles.png",
    flame: OLD + "particles.png",
    // the sprite edits (skipped while missing)
    eyesL: "kathakali-eyes-left.png",
    eyesR: "kathakali-eyes-right.png",
    click: "garba-click.png",
  },
  pieces: [
    // Kerala
    { name: "backwaters-view", sheet: "kscene", at: [700, 800], pivotAt: [33, 1000], density: 3, points: { water0: [150, 652], water1: [1500, 1000] } },
    { name: "houseboat", sheet: "kboat", at: [770, 560] },
    { name: "palm-1", sheet: "ktall", at: [390, 21], pivotAt: [150, 990] },
    { name: "palm-2", sheet: "ktall", at: [756, 221], pivotAt: [520, 985] },
    { name: "jasmine-strand", sheet: "ktall", at: [1043, 22], pivot: "top" },
    { name: "brass-lamp", sheet: "ktall", at: [1306, 22], pivot: "top", points: { w1: [1202, 710], w2: [1252, 710], w3: [1380, 710], w4: [1425, 710] } },
    { name: "kathakali", sheet: "kfront", at: [229, 16] },
    { name: "nilavilakku", sheet: "kfront", at: [649, 51], points: { w1: [542, 182], w2: [591, 186], w3: [704, 186], w4: [752, 182] } },
    { name: "uruli", sheet: "kfront", at: [1115, 79] },
    { name: "pookalam", sheet: "kfront", at: [1142, 386] },
    { name: "flowers-left", sheet: "kfront", at: [972, 581], pivotAt: [815, 982] },

    // Gujarat
    {
      name: "temple-stepwell",
      sheet: "gscene",
      at: [633, 26],
      pivotAt: [874, 991],
      density: 3,
      points: {
        flagTop: [634, 34],
        water0: [40, 790],
        water1: [760, 990],
        ...Object.fromEntries(STEP_DIYAS.map((p, i) => [`d${i}`, p])),
      },
    },
    { name: "flag", sheet: "gscene", at: [913, 40], pivotAt: [913, 285], points: { poleTop: [913, 42], cloth: [925, 75] } },
    { name: "kite-1", sheet: "gscene", at: [1049, 330], pivot: "center", points: { string: [989, 647] } },
    { name: "kite-2", sheet: "gscene", at: [1358, 354], pivot: "center", points: { string: [1333, 669] } },
    { name: "kite-3", sheet: "gscene", at: [1189, 613], pivot: "center", points: { string: [1147, 943] } },
    { name: "latkan-long", sheet: "gtall", at: [358, 16], pivot: "top" },
    { name: "latkan-short", sheet: "gtall", at: [706, 124], pivot: "top" },
    { name: "lantern", sheet: "gtall", at: [1136, 96], pivot: "top", points: { glow: [1140, 520] } },
    { name: "garba-couple", sheet: "gfront", at: [329, 34] },
    {
      name: "garbo",
      sheet: "gfront",
      at: [1179, 48],
      points: { flame: [1196, 58] },
      glowMask: { box: [1062, 75, 1330, 290], darkMax: 140, minArea: 6, maxArea: 600, blur: 3, gain: 2.2 },
    },
    { name: "flowers-right", sheet: "gfront", at: [1491, 519], pivotAt: [1500, 977] },

    // the sprite edits: the same pieces, whole (aligned to the base and swapped in)
    { name: "kathakali-eyes-left", sheet: "eyesL", at: [229, 16] },
    { name: "kathakali-eyes-right", sheet: "eyesR", at: [229, 16] },
    { name: "garba-click", sheet: "click", at: [329, 34] },

    // the water, lotuses, diyas and the ambient particles
    { name: "water-strip", sheet: "particles", at: [993, 66], density: 3 },
    ...[[200, 281], [422, 326], [621, 348]].map((at, i) => ({ name: `lotus-${i + 1}`, sheet: "particles", at })),
    ...[[772, 295], [871, 345]].map((at, i) => ({ name: `lotus-bud-${i + 1}`, sheet: "particles", at })),
    ...[[1053, 310], [1272, 344], [1440, 360]].map((at, i) => ({ name: `lotus-leaf-${i + 1}`, sheet: "particles", at })),
    ...[[561, 507], [923, 507]].map((at, i) => ({ name: `diya-${i + 1}`, sheet: "particles", at, points: { wick: [at[0] + 25, 522] } })),
    ...[[80, 668], [194, 667], [307, 668], [416, 669]].map((at, i) => ({ name: `frangipani-${i + 1}`, sheet: "particles", at, pivot: "center", screen: 22 })),
    ...[[573, 685], [631, 685], [690, 685], [743, 685]].map((at, i) => ({ name: `jasmine-${i + 1}`, sheet: "particles", at, pivot: "center", screen: 18 })),
    ...[[819, 685], [914, 684], [997, 685], [1076, 684]].map((at, i) => ({ name: `marigold-petal-${i + 1}`, sheet: "particles", at, pivot: "center", screen: 16, warm: 0.3 })),
    ...[[1223, 690], [1280, 687], [1379, 687], [1467, 687]].map((at, i) => ({ name: `rose-petal-${i + 1}`, sheet: "particles", at, pivot: "center", screen: 16 })),
    ...[[525, 838], [687, 839], [848, 839], [1010, 839]].map((at, i) => ({ name: `sparkle-${i + 1}`, sheet: "particles", at, pivot: "center", screen: 14, warm: 0.3 })),
    ...[[1040, 270], [1215, 280], [1390, 270]].map((at, i) => ({ name: `diya-flame-${i + 1}`, sheet: "flame", at, screen: 16, warm: 0.12 })),
  ],
  // the edits sit exactly over their base (aligned on what never changes: his body, their legs)
  pairs: [
    { a: "kathakali", b: "kathakali-eyes-left", rows: [0.35, 1] },
    { a: "kathakali", b: "kathakali-eyes-right", rows: [0.35, 1] },
    { a: "garba-couple", b: "garba-click", rows: [0.5, 1] },
  ],

  // Placed by hand from the master: the master was painted on its own, so its pieces are not
  // copies of the sheets — the matcher's scores were all low (run --fit with `match: true` items
  // to see them). Boxes are in master px (1024 × 1536); each piece is fitted into its box by its
  // width (or height), held at the box's bottom (or top), and placed by its pivot.
  fit: {
    stage: { aspect: 1.5, headroom: 0 },
    flagAbove: 60,
    items: [],
    extra: (_items, P) => {
      const X = (v) => +((v / 1024) * 100).toFixed(3);
      const Y = (v) => +((v / 1536) * 100).toFixed(3);
      const out = [];
      /** fit piece into [x0, y0, x1, y1]: by "w" or "h"; held at "bottom" or "top"; flip */
      const box = (id, piece, [x0, y0, x1, y1], z, o = {}) => {
        const pc = P[piece];
        if (!pc) return;
        const asp = pc.w / pc.h;
        const by = o.by ?? "w";
        const w = by === "w" ? x1 - x0 : (y1 - y0) * asp;
        const h = w / asp;
        const left = o.right ? x1 - w : x0;
        const top = o.at === "top" ? y0 : y1 - h;
        const pv = o.flip ? 1 - pc.pivot[0] : pc.pivot[0];
        out.push({ id, piece, x: X(left + pv * w), y: Y(top + pc.pivot[1] * h), w: X(w), z, ...(o.flip ? { flip: true } : {}), ...(o.hPx ? { h: Y(o.hPx) } : {}) });
      };
      // ── Kerala, down the left edge ──
      box("backwaters-view", "backwaters-view", [-10, 700, 410, 1005], 1);
      box("palm-2", "palm-2", [-36, 512, 124, 775], 2, { by: "h" });
      box("palm-1", "palm-1", [-30, 250, 230, 765], 2.1, { by: "h" });
      box("houseboat", "houseboat", [20, 790, 226, 868], 3);
      box("jasmine-strand", "jasmine-strand", [8, -110, 68, 380], 4, { at: "top" });
      box("brass-lamp", "brass-lamp", [122, -60, 208, 232], 4.1);
      box("kathakali", "kathakali", [-22, 900, 240, 1430], 5, { by: "h" });
      box("pookalam", "pookalam", [168, 1362, 362, 1432], 5.8);
      box("nilavilakku", "nilavilakku", [170, 1118, 262, 1364], 6, { by: "h" });
      box("uruli", "uruli", [236, 1294, 350, 1368], 6.1);
      box("flowers-left", "flowers-left", [-6, 1330, 284, 1540], 7);
      // ── Gujarat, down the right edge ──
      box("temple-stepwell", "temple-stepwell", [654, 540, 1030, 968], 1, { right: true });
      // the kites fly lower, beside the names (placed by height on the card)
      box("kite-1", "kite-1", [846, 470, 934, 580], 2);
      box("kite-2", "kite-2", [934, 534, 1012, 634], 2);
      box("kite-3", "kite-3", [866, 616, 938, 706], 2);
      box("latkan-short", "latkan-short", [894, -40, 970, 300], 4, { at: "top" });
      box("latkan-long", "latkan-long", [958, -24, 1022, 380], 4.1, { at: "top" });
      box("lantern", "lantern", [818, 116, 896, 290], 4.2, { at: "top" });
      box("garba-couple", "garba-couple", [662, 1000, 1030, 1378], 5, { right: true });
      box("garbo", "garbo", [682, 1282, 774, 1392], 6);
      box("flowers-right", "flowers-right", [738, 1330, 1030, 1540], 7, { right: true });
      // the flag on the temple's shikhara (attached there by the card, from the temple's flagTop)
      box("flag", "flag", [920, 440, 1010, 524], 3, { by: "h" });
      // the water along the bottom, full width; lotuses, leaves and floating diyas on it
      box("water-strip", "water-strip", [-20, 1346, 1044, 1540], 5.5, { hPx: 194 });
      box("leaf-a", "lotus-leaf-2", [262, 1430, 352, 1470], 5.6);
      box("leaf-b", "lotus-leaf-3", [690, 1452, 770, 1488], 5.6);
      box("leaf-c", "lotus-leaf-1", [508, 1478, 618, 1526], 5.6);
      box("lotus-a", "lotus-1", [352, 1350, 430, 1392], 5.7);
      box("lotus-b", "lotus-3", [372, 1430, 430, 1462], 5.7);
      box("lotus-c", "lotus-2", [540, 1428, 602, 1462], 5.7);
      box("lotus-d", "lotus-1", [594, 1348, 668, 1388], 5.7);
      box("bud-a", "lotus-bud-1", [470, 1396, 494, 1446], 5.7);
      box("bud-b", "lotus-bud-2", [680, 1462, 702, 1504], 5.7);
      box("fdiya-a", "diya-1", [430, 1392, 478, 1416], 5.75);
      box("fdiya-b", "diya-2", [630, 1420, 678, 1444], 5.75);
      return out;
    },
  },
};

export default config;
