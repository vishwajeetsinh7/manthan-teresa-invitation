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
    groom: "groom.png",
    carpet: "carpet.png",
  },
  /** the layout reference and the ?debug=1 overlay (master.png, the first version, is kept) */
  master: "master-v2.png",
  pieces: [
    // palm: the centre of her palm nearer the groom (where the hidden "M" goes), and its edge
    { name: "bride-plain", sheet: "bride", at: [400, 600], points: { palm: [616, 330], palmEdge: [655, 330] } },
    { name: "bride-henna", sheet: "bride", at: [1140, 600] },

    // (the two friends on this sheet are no longer in the scene)
    { name: "flower-girl", sheet: "friends", at: [1290, 760] },

    { name: "uruli", sheet: "props", at: [340, 340] },
    { name: "lamp", sheet: "props", at: [750, 450] },
    { name: "cone-basket", sheet: "props", at: [1320, 360] },
    { name: "dholak", sheet: "props", at: [310, 600] },
    { name: "bolster", sheet: "props", at: [1190, 580] },
    { name: "rug", sheet: "props", at: [770, 820] }, // the old rug: only if carpet.png is missing

    // the groom on his cushion, facing left: A points at her palm, B has his hand on his heart
    { name: "groom-a", sheet: "groom", at: [430, 600], warm: 1, points: { fingertip: [71, 338] } },
    { name: "groom-b", sheet: "groom", at: [1160, 600], warm: 1, points: { heart: [1102, 400] } },
    // the round carpet seen from above (tilted and spun by the scene); turns about its rim's centre
    { name: "carpet", sheet: "carpet", at: [622, 622], warm: 1, pivotAt: [622, 622], gather: 40, points: { rimL: [120, 622], rimR: [1124, 622] } },
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
  variants: [
    {
      base: "bride-plain",
      variant: "bride-henna",
      out: "bride-palms",
      key: "palms",
      detect: { kind: "diff", threshold: 34, blur: 4 },
      // roughly where the two raised palms are on the plain bride (sheet px)
      regions: [
        { name: "left", at: [[225, 300]] },
        { name: "right", at: [[615, 300]] },
      ],
    },
  ],

  /** the groom's two poses overlap exactly: aligned on his legs, dupatta and cushion (the moving arm is above these rows) */
  pairs: [{ a: "groom-a", b: "groom-b", rows: [0.55, 1] }],

  /**
   * --fit: place each piece by matching it against the master (master-v2.png).
   * `box` is a rough guess of where it sits in the master [x0, y0, x1, y1];
   * the matcher refines scale and position around it. The stage is the master
   * plus headroom on top for the garland toran: 2 : 3.3 overall.
   */
  fit: {
    // master-v2 is 1148 × 1371; boxes below are in master px scaled to 1024 wide (× 0.892)
    stage: { aspect: 1.1943, headroom: 0 },
    items: [
      { id: "banana-left", piece: "banana", box: [9, 303, 245, 776], z: 1, rows: [0, 0.8] },
      { id: "banana-right", piece: "banana", box: [758, 303, 1012, 776], z: 1, flip: true, rows: [0, 0.8] },
      { piece: "lamp", box: [888, 473, 992, 821], z: 4 },
      { id: "groom", piece: "groom-a", box: [504, 397, 937, 968], z: 4.5 },
      { id: "bride", piece: "bride-plain", box: [49, 397, 522, 968], z: 5 },
      { piece: "bolster", box: [700, 923, 950, 1044], z: 7 },
      { piece: "dholak", box: [67, 923, 275, 1070], z: 7 },
      { piece: "uruli", box: [319, 946, 651, 1128], z: 8 },
      { piece: "cone-basket", box: [671, 968, 852, 1122], z: 9 },
    ],
    /** the toran, the carpet (+ the old rug), the groom's second pose, the flower girl */
    extra: (items, P) => {
      const A = 1.1943;
      const byId = Object.fromEntries(items.map((i) => [i.id, i]));
      const asp = (n) => P[n].w / P[n].h;
      const r2 = (n) => +n.toFixed(2);
      const box = (it) => {
        const h = it.w / asp(it.piece) / A;
        const piv = P[it.piece].pivot;
        return { left: it.x - piv[0] * it.w, top: it.y - piv[1] * h, w: it.w, h };
      };
      const pt = (it, name) => {
        const b = box(it);
        const q = P[it.piece].extra.points[name];
        return { x: b.left + b.w * q[0], y: b.top + b.h * q[1] };
      };
      const out = [];
      // toran: seven strands from the gold cord, where they hang in master-v2 (centre strand shortest)
      [
        ["strand-2", 12.46],
        ["strand-1", 24.3],
        ["strand-3", 36.93],
        ["strand-5", 49.13],
        ["strand-3", 62.54, true],
        ["strand-1", 74.83, true],
        ["strand-2", 85.54, true],
      ].forEach(([piece, x, flip], k) => out.push({ id: `toran-${k + 1}`, piece, x, y: 2.6, w: 5.2, z: 0, ...(flip ? { flip } : {}) }));

      // the groom: his pointing fingertip stops ~6 px (at the widest stage) short of the edge of her
      // nearer palm — moved sideways to get there, never rescaled
      const groom = byId.groom;
      const bride = byId.bride;
      const tip = pt(groom, "fingertip");
      const edge = pt(bride, "palmEdge");
      const gap = (6 / 260) * 100;
      groom.x = r2(groom.x + (edge.x + gap - tip.x));
      // his second pose sits exactly over the first (pair alignment)
      const al = P["groom-b"].extra.align;
      const gb = box(groom);
      const bw = gb.w * al.w;
      const bh = bw / asp("groom-b") / A;
      const piv = P["groom-b"].pivot;
      out.push({ id: "groom-b", piece: "groom-b", x: r2(gb.left + al.x * gb.w + piv[0] * bw), y: r2(gb.top + al.y * gb.h + piv[1] * bh), w: r2(bw), z: groom.z });

      // the carpet: its rim matches the oval in master-v2 (1075 px wide, centre y 1170 of 1371)
      const rim = P.carpet.extra.points;
      const rimShare = rim.rimR[0] - rim.rimL[0]; // rim diameter, as a share of the piece's width
      out.push({ id: "carpet", piece: "carpet", x: r2((572.5 / 1148) * 100), y: r2((1170 / 1371) * 100), w: r2(((1075 / 1148) * 100) / rimShare), z: 2 });
      out.push({ id: "rug", piece: "rug", x: 50, y: 97, w: 96, z: 2 });
      // the flower girl, at the bride's scale as before (24 % of the stage beside a 59 % bride)
      out.push({ id: "flower-girl", piece: "flower-girl", x: 50, y: 99, w: r2(bride.w * (24 / 58.98)), z: 10 });
      return out;
    },
  },
};

export default config;
