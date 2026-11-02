/**
 * Hindu wedding — "Swarg Kamal" (a heavenly lotus stage): where every cut-out
 * comes from and where it stands. Used by scripts/build-scene-assets.mjs
 * (npm run scene:hindu-wedding-lotus). The lotus art is in
 * assets-src/hindu-wedding-lotus; the people and the ritual pieces are re-cut
 * from the first Hindu wedding's sheets (assets-src/hindu-wedding).
 *
 * The two lotuses (the stage and the canopy crown) are not laid out here
 * piece by piece: their petals are built in 3D by the scene from the ring
 * settings in `meta` below (centre, radius, camera tilt).
 */
const OLD = "../hindu-wedding/";

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

/* ── master px (1024 × 1536) → stage % (the stage is the master: no headroom) */
const A = 1.5;
const X = (mx) => +((mx / 1024) * 100).toFixed(2);
const Y = (my) => +((my / (A * 1024)) * 100).toFixed(2);
const Wd = (mw) => +((mw / 1024) * 100).toFixed(2);

/** the arch's centre line on its sheet: up the left column, over the top, down the right one */
const ARCH_LINE = [
  [128, 1410], [128, 1150], [130, 900], [140, 650], [175, 470], [255, 340], [370, 245], [512, 190],
  [654, 245], [769, 340], [849, 470], [884, 650], [894, 900], [896, 1150], [896, 1410],
];
const resample = (pts, n) => {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  return Array.from({ length: n }, (_, k) => {
    let d = (k / (n - 1)) * total;
    let i = 0;
    while (i < seg.length - 1 && d > seg[i]) d -= seg[i++];
    const t = Math.min(1, d / seg[i]);
    return [Math.round(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t), Math.round(pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t)];
  });
};
const ARCH_POINTS = Object.fromEntries(resample(ARCH_LINE, 24).map((p, i) => [`a${i}`, p]));

const config = {
  name: "hindu-wedding-lotus",
  srcDir: "assets-src/hindu-wedding-lotus",
  outDir: "public/scenes/hindu-wedding-lotus",
  layout: "src/config/scenes/hindu-wedding-lotus.json",
  stageMaxWidth: 430,
  density: 3,
  // cap 1: blue-leaning pixels are screen showing through (the arch's open middle, the rim's filigree)
  key: { screen: "blue", lo: 40, hi: 150, bg: [0, 3, 253], cap: 1 },
  minBlob: 30,
  attachGap: 18,
  attachGapBySheet: { props: -1, petals: -1, clouds: -1, extras: 6, crown: 10 },
  pad: 4,
  master: "master.png",
  sheets: {
    petals: "lotus-petals.png",
    crown: "canopy.png",
    extras: "strands-extras.png",
    arch: "arch.png",
    clouds: "clouds.png",
    rangoli: "rangoli.png",
    floor: "lotus-floor.png",
    painted: "lotus-front.png",
    // the first Hindu wedding's sheets
    couple: OLD + "couple.png",
    pandit: OLD + "pandit.png",
    props: OLD + "props.png",
    diya: OLD + "diya.png",
    particles: OLD + "particles.png",
  },
  pieces: [
    // the stage lotus's three petals: A outer (pink), B inner (ivory-pink), C lower (deeper, longer)
    { name: "petal-outer", sheet: "petals", at: [285, 520], pivotAt: [285, 824], points: { tip: [287, 220] } },
    { name: "petal-inner", sheet: "petals", at: [805, 520], pivotAt: [805, 824], points: { tip: [805, 230] } },
    { name: "petal-lower", sheet: "petals", at: [1283, 520], pivotAt: [1283, 824], points: { tip: [1283, 158] } },

    // the canopy: its gold rim (bells, jasmine swags), the kalash on its pink dome, two crown petals
    { name: "canopy-rim", sheet: "crown", at: [775, 150], gather: 30, points: { topL: [80, 98], topR: [1470, 98], top: [775, 98] } },
    { name: "kalash-finial", sheet: "crown", at: [288, 760], gather: 20 },
    { name: "crown-petal-outer", sheet: "crown", at: [790, 700], pivotAt: [790, 922], points: { tip: [790, 433] } },
    { name: "crown-petal-inner", sheet: "crown", at: [1270, 760], pivotAt: [1270, 916], points: { tip: [1272, 525] } },

    // jasmine strands (hang from their loops), lotus buds, floating diyas, lotus leaves
    { name: "strand-long", sheet: "extras", at: [140, 500], pivot: "top" },
    { name: "strand-med", sheet: "extras", at: [340, 350], pivot: "top" },
    { name: "strand-short", sheet: "extras", at: [540, 300], pivot: "top" },
    ...[[770, 220], [970, 220], [1180, 220], [1390, 220]].map((at, i) => ({ name: `bud-${i + 1}`, sheet: "extras", at, pivot: "center" })),
    ...[[785, 520], [1070, 520], [1355, 520]].map((at, i) => ({ name: `float-diya-${i + 1}`, sheet: "extras", at, points: { wick: [at[0], 456] } })),
    { name: "leaf-1", sheet: "extras", at: [835, 800], pivot: "center" },
    { name: "leaf-2", sheet: "extras", at: [1255, 800], pivot: "center" },

    // the floral arch (open in the middle), and the 24 points along its centre line
    { name: "arch", sheet: "arch", at: [128, 1000], gather: 30, points: ARCH_POINTS },

    // eight clouds, all different
    ...[[230, 330], [665, 300], [1015, 330], [1340, 310], [200, 720], [630, 720], [1070, 720], [1395, 720]].map((at, i) => ({
      name: `cloud-${i + 1}`,
      sheet: "clouds",
      at,
    })),

    { name: "rangoli-top", sheet: "rangoli", at: [627, 627], pivot: "center" },
    { name: "lotus-floor", sheet: "floor", at: [627, 627], pivot: "center" },
    // the painted lotus (the low-power fallback)
    { name: "lotus-painted", sheet: "painted", at: [768, 600], pivot: "center" },

    // from the first Hindu wedding: the couple, the pandit, the ritual pieces
    { name: "couple-final", sheet: "couple", at: [1220, 600], gather: 20, points: { knot: [1212, 560] } },
    { name: "pandit", sheet: "pandit", at: [500, 500], gather: 60, points: { ladle: [40, 470] } },
    { name: "havan-kund", sheet: "pandit", at: [1175, 720], points: { fire: [1177, 548] } },
    { name: "kalash", sheet: "props", at: [195, 400] },
    { name: "thali", sheet: "props", at: [548, 430] },
    { name: "diya", sheet: "diya", at: [628, 650], points: { wick: [643, 330] } },

    ...particles.flatMap(([base, points, screen, extra]) =>
      points.map((at, k) => ({ name: points.length > 1 ? `${base}-${k + 1}` : base, sheet: "particles", at, screen, pivot: "center", ...extra })),
    ),
  ],

  fit: {
    stage: { aspect: A, headroom: 0 },
    items: [
      // the people and the ritual pieces where they are in the master
      // the couple centred under the arch, the pandit at their right, facing the fire
      { piece: "couple-final", fixed: { x: X(492), y: Y(996), w: Wd(330) }, z: 6 },
      { piece: "pandit", fixed: { x: X(778), y: Y(980), w: Wd(268) }, z: 6.2 },
      { piece: "havan-kund", fixed: { x: X(512), y: Y(1062), w: Wd(250) }, z: 6.4 },
      { piece: "kalash", box: [150, 915, 340, 1085], z: 6.5 },
      { piece: "thali", box: [660, 1000, 815, 1080], z: 6.5 },
    ],
    extra: (items, P) => {
      const out = [];
      const asp = (n) => P[n].w / P[n].h;
      const put = (id, piece, mx, my, mw, z, more = {}) => ({ id, piece, x: X(mx), y: Y(my), w: Wd(mw), z, ...more });

      // the arch on the back edge of the floor, behind the couple (a little squatter than its sheet)
      out.push(put("arch", "arch", 512, 925, 530, 2, { h: Y(925 - 312) }));

      // the canopy rim (still), the kalash on its dome at the centre of the rim's top oval
      const rimW = 815;
      const rp = P["canopy-rim"];
      const rimTop = rp.extra.points.top; // share of the piece
      const rimH = rimW / asp("canopy-rim");
      // place it so its top oval's centre is at (512, 272)
      out.push(put("canopy-rim", "canopy-rim", 512, 272 - rimTop[1] * rimH + rp.pivot[1] * rimH, rimW, 4.6));
      out.push(put("kalash-finial", "kalash-finial", 512, 276, 236, 4.3));

      // jasmine strands hanging from the rim, at the back and the sides (never across the couple)
      [
        ["strand-long", 150, 34],
        ["strand-med", 208, 40],
        ["strand-short", 258, 38],
        ["strand-short", 766, 38],
        ["strand-med", 818, 40],
        ["strand-long", 874, 34],
      ].forEach(([piece, x, w], i) => out.push(put(`strand-${i + 1}`, piece, x, 316, w, 3.2)));

      // clouds: far ones small and high behind the lotus; a bank in front of the lotus's base, so
      // it rests in the clouds (nothing floats under it); near ones big and low at the corners, on
      // top of everything (each shape used again only mirrored and resized, never beside itself)
      [
        ["cloud-1", 95, 795, 230, 1, false],
        ["cloud-4", 930, 820, 220, 1, true],
        ["cloud-7", 40, 660, 150, 0.9, true],
        ["cloud-5", 990, 690, 150, 0.9, false],
        ["cloud-3", 95, 1235, 220, 6.6, false],
        ["cloud-8", 930, 1225, 210, 6.6, true],
        ["cloud-2", 270, 1345, 300, 6.7, true],
        ["cloud-6", 755, 1350, 320, 6.7, false],
        ["cloud-4", 512, 1400, 280, 6.75, false],
        ["cloud-1", 80, 1375, 260, 6.8, false],
        ["cloud-1", 955, 1380, 260, 6.8, true],
        ["cloud-6", 512, 1505, 600, 6.85, true],
        ["cloud-8", 250, 1460, 320, 6.9, false],
        ["cloud-3", 790, 1465, 300, 6.9, true],
        ["cloud-5", 40, 1500, 280, 8, false],
        ["cloud-7", 985, 1505, 270, 8, true],
        ["cloud-2", 120, 1580, 360, 8.05, false],
        ["cloud-6", 900, 1585, 380, 8.05, true],
      ].forEach(([piece, x, y, w, z, flip], i) => out.push(put(`cloud-${i + 1}`, piece, x, y, w, z, flip ? { flip } : {})));

      // floating buds and diyas around the lotus (they rise and come round again while idle)
      out.push(put("bud-a", "bud-1", 70, 1400, 50, 8.1), put("bud-b", "bud-3", 955, 1300, 50, 8.1));
      out.push(put("fdiya-a", "float-diya-1", 140, 1300, 52, 8.1), put("fdiya-b", "float-diya-2", 880, 1420, 52, 8.1));
      out.push(put("bud-c", "bud-2", 40, 1150, 40, 1.2), put("fdiya-c", "float-diya-3", 990, 1100, 44, 1.2));

      // where the two lotuses are (built in 3D by the scene), in stage %; tilt = the camera's
      // angle onto each (a circle seen as the master's ovals)
      out.push({
        id: "lotus",
        meta: true,
        stage: { x: X(510), y: Y(1035), r: Wd(425), tilt: 74 },
        crown: { x: X(512), y: Y(272), r: Wd(408), tilt: 87 },
        rangoli: { x: X(512), y: Y(1448), r: Wd(300), squash: 0.3 },
      });
      return out;
    },
  },
};

export default config;
