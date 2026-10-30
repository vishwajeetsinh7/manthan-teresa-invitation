/**
 * Mehndi scene: where every cut-out comes from and what it is called.
 * Used by scripts/build-scene-assets.mjs (npm run scene:mehndi).
 *
 * `at` is a point inside the piece on its sheet (sheet pixels); the builder
 * picks the cut-out found there. `screen` (CSS px) is the largest size a
 * piece is shown at, when it is not set by the stage layout
 * (src/config/scenes/mehndi.json); exports are ~3× that, never upscaled.
 */
const config = {
  name: "mehndi",
  srcDir: "assets-src/mehndi",
  outDir: "public/scenes/mehndi",
  layout: "src/config/scenes/mehndi.json",
  /** widest the stage is ever shown (CSS px) */
  stageMaxWidth: 430,
  /** export at this many × the on-screen size (sharp on 3× phones) */
  density: 3,
  key: { screen: "blue", lo: 40, hi: 150, bg: [0, 3, 253] },
  minBlob: 50, // smaller blobs are specks…
  attachGap: 18, // …unless this close to a piece much bigger than them
  pad: 4,
  sheets: {
    bride: "bride.png",
    friends: "friends.png",
    props: "props.png",
    garlands: "garlands.png",
    particles: "particles.png",
  },
  pieces: [
    { name: "bride-plain", sheet: "bride", at: [400, 600] },
    { name: "bride-henna", sheet: "bride", at: [1140, 600] },

    { name: "friend-gujarati", sheet: "friends", at: [330, 600] },
    { name: "friend-kerala", sheet: "friends", at: [860, 600] },
    { name: "flower-girl", sheet: "friends", at: [1290, 760] },

    { name: "uruli", sheet: "props", at: [340, 340] },
    { name: "lamp", sheet: "props", at: [750, 450] },
    { name: "cone-basket", sheet: "props", at: [1320, 360] },
    { name: "dholak", sheet: "props", at: [310, 600] },
    { name: "bolster", sheet: "props", at: [1190, 580] },
    { name: "rug", sheet: "props", at: [770, 820] },
    // the two small brass bowls on this sheet are not used

    { name: "strand-1", sheet: "garlands", at: [130, 500], pivot: "top" },
    { name: "strand-2", sheet: "garlands", at: [335, 480], pivot: "top" },
    { name: "strand-3", sheet: "garlands", at: [535, 480], pivot: "top" },
    { name: "strand-4", sheet: "garlands", at: [720, 470], pivot: "top" },
    { name: "strand-5", sheet: "garlands", at: [897, 470], pivot: "top" },
    { name: "banana", sheet: "garlands", at: [1250, 520] },

    ...[
      ["flame", [[160, 180], [330, 170], [510, 180]], 12],
      ["petal-marigold", [[715, 185], [930, 180], [1145, 185], [1350, 180]], 18],
      ["petal-rose", [[160, 415], [380, 415], [600, 420], [820, 420]], 18],
      ["jasmine", [[1020, 425], [1155, 430], [1285, 420], [1415, 425]], 16],
      ["marigold", [[170, 660], [415, 660], [670, 660]], 22],
      ["leaf", [[960, 660], [1160, 660], [1355, 670]], 22],
      ["sparkle", [[400, 870], [640, 870], [920, 870], [1140, 870]], 18],
    ].flatMap(([base, points, screen]) =>
      points.map((at, k) => ({ name: `${base}-${k + 1}`, sheet: "particles", at, screen, pivot: "center" })),
    ),
  ],

  /** the lamp's five baked wick flames (sheet px): recorded as anchors, then erased */
  lampFlames: {
    piece: "lamp",
    sheet: "props",
    rows: [148, 177], // band above the rim where the flames stand (the rim highlights start at 178)
    finial: [724, 781], // the central finial's bulb (left, right edge): flames in front of it are repaired from its mirror side
  },

  /** henna palms: the henna bride aligned to the plain one, the two palms masked */
  henna: {
    plain: "bride-plain",
    henna: "bride-henna",
    out: "bride-palms",
    /** roughly where the two raised palms are on the plain bride (sheet px) */
    palms: [
      [225, 300],
      [615, 300],
    ],
  },

  /**
   * --fit: place each piece by matching it against master.png (1024 × 1536).
   * `box` is a rough guess of where it sits in the master [x0, y0, x1, y1];
   * the matcher refines scale and position around it. The stage is the master
   * plus headroom on top for the garland toran: 2 : 3.3 overall.
   */
  fit: {
    stage: { aspect: 1.65, headroom: 0.15 },
    items: [
      { id: "banana-left", piece: "banana", box: [5, 85, 335, 690], z: 1 },
      { id: "banana-right", piece: "banana", box: [640, 160, 1020, 860], z: 1, flip: true },
      // the friends' lower halves are hidden behind the bride and props in the
      // master: match on their heads and upper bodies only (rows 0–48 %)
      { piece: "friend-gujarati", box: [-45, 268, 466, 1095], z: 3, rows: [0, 0.48], scale: [0.85, 1.3] },
      { piece: "friend-kerala", box: [635, 230, 1004, 1080], z: 3, rows: [0, 0.48], scale: [0.85, 1.3] },
      { id: "bride", piece: "bride-plain", box: [250, 462, 838, 1150], z: 5 },
      { piece: "lamp", box: [858, 605, 1015, 1148], z: 6 },
      { piece: "bolster", box: [678, 1112, 1022, 1312], z: 7 },
      { piece: "dholak", box: [8, 1045, 306, 1242], z: 7 },
      { piece: "uruli", box: [275, 1168, 725, 1405], z: 8 },
      { piece: "cone-basket", box: [700, 1160, 950, 1372], z: 9 },
    ],
    /** pieces that are not in the master: the toran, the rug, the flower girl */
    extra: [
      // toran: 7 strands hanging from a gold cord, longest at the edges (right half mirrored)
      ...[
        ["strand-1", 6.5, false],
        ["strand-2", 20.5, false],
        ["strand-3", 35, false],
        ["strand-5", 50, false],
        ["strand-3", 65, true],
        ["strand-2", 79.5, true],
        ["strand-1", 93.5, true],
      ].map(([piece, x, flip], k) => ({ id: `toran-${k + 1}`, piece, x, y: 2.6, w: 7.5, z: 0, ...(flip ? { flip } : {}) })),
      { id: "rug", piece: "rug", x: 50, y: 93, w: 96, z: 2 },
      { id: "flower-girl", piece: "flower-girl", x: 50, y: 99, w: 24, z: 10 },
    ],
  },
};

export default config;
