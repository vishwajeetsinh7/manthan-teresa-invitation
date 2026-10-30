/**
 * Haldi scene ("The Golden Swing"): where every cut-out comes from and what it
 * is called. Used by scripts/build-scene-assets.mjs (npm run scene:haldi).
 *
 * `at` is a point inside the piece on its sheet (sheet pixels). `screen` (CSS
 * px) is the largest size a piece is shown at when the stage layout
 * (src/config/scenes/haldi.json) does not set it; exports are ~3× that.
 */
const particles = [
  ["puff", [[160, 190], [440, 190], [720, 190]], 46, { gather: 45, warm: 0.12 }],
  ["splat", [[940, 215], [1110, 205], [1270, 205], [1425, 210]], 22, { gather: 30, warm: 0.3 }],
  ["drop", [[110, 450], [290, 450], [437, 485], [565, 460], [663, 445], [705, 492]], 10, {}],
  ["petal-white", [[880, 450], [1045, 460], [1240, 455], [1415, 460]], 16, {}],
  ["petal-marigold", [[120, 670], [330, 670], [530, 670], [725, 660]], 16, { warm: 0.3 }],
  ["marigold", [[950, 665], [1185, 665], [1415, 665]], 22, { warm: 0.3 }],
  ["leaf", [[180, 870], [450, 870], [750, 875]], 22, {}],
  ["sparkle", [[985, 870], [1130, 870], [1270, 870], [1415, 870]], 16, { warm: 0.3 }],
];

const config = {
  name: "haldi",
  srcDir: "assets-src/haldi",
  outDir: "public/scenes/haldi",
  layout: "src/config/scenes/haldi.json",
  stageMaxWidth: 430,
  density: 3,
  // cap 1: nothing in this art is bluer than it is green — any blue left is the screen
  key: { screen: "blue", lo: 40, hi: 150, bg: [0, 3, 253], cap: 1 },
  minBlob: 30,
  attachGap: 18,
  // the props sit just above the pookalam: don't let them join it
  attachGapBySheet: { props: -1 },
  pad: 4,
  sheets: {
    couple: "couple.png",
    friends: "friends.png",
    canopy: "canopy.png",
    curtains: "curtains.png",
    props: "props.png",
    particles: "particles.png",
    panel: "curtain-new.png",
    mehndi: "../mehndi/garlands.png", // the banana plant, reused
  },
  pieces: [
    // the couple on the swing seat: clean, and with haldi (for the reveal); pivot = the seat
    { name: "couple-clean", sheet: "couple", at: [390, 600], pivotAt: [390, 615] },
    { name: "couple-haldi", sheet: "couple", at: [1140, 600], pivotAt: [1140, 615] },

    { name: "friend-gujarati", sheet: "friends", at: [310, 650], points: { hand: [632, 190] } },
    { name: "friend-kerala", sheet: "friends", at: [870, 650], points: { pour: [648, 272] } },
    { name: "boy", sheet: "friends", at: [1350, 660], points: { nozzle: [1085, 452] } },

    { name: "beam", sheet: "canopy", at: [760, 90], pivot: "center", gather: 12 },
    { name: "rope-1", sheet: "canopy", at: [315, 600], pivot: "top", gather: 12 },
    { name: "rope-2", sheet: "canopy", at: [425, 600], pivot: "top", gather: 12 },
    { name: "strand-1", sheet: "canopy", at: [845, 600], pivot: "top", gather: 10 },
    { name: "strand-2", sheet: "canopy", at: [990, 520], pivot: "top", gather: 10 },
    { name: "strand-3", sheet: "canopy", at: [1130, 490], pivot: "top", gather: 10 },
    { name: "strand-4", sheet: "canopy", at: [1250, 430], pivot: "top", gather: 10 },

    { name: "curtain-left", sheet: "curtains", at: [130, 500], pivot: "topcenter" },
    { name: "curtain-right", sheet: "curtains", at: [1400, 500], pivot: "topcenter" },
    { name: "curtain-panel", sheet: "panel", at: [510, 700], pivot: "topcenter" },
    { name: "umbrella-palm", sheet: "curtains", at: [765, 250], pivot: "top", gather: 20 },
    { name: "umbrella-yellow", sheet: "curtains", at: [500, 600], pivot: "top", gather: 20 },
    { name: "umbrella-orange", sheet: "curtains", at: [1015, 600], pivot: "top", gather: 20 },

    { name: "urli", sheet: "props", at: [255, 350] },
    { name: "matkis", sheet: "props", at: [605, 300] },
    { name: "basket", sheet: "props", at: [950, 350] },
    { name: "haldi-bowl", sheet: "props", at: [1340, 400] },
    { name: "pookalam", sheet: "props", at: [760, 740], pivot: "center" },

    { name: "banana", sheet: "mehndi", at: [1250, 520] },

    ...particles.flatMap(([base, points, screen, extra]) =>
      points.map((at, k) => ({ name: `${base}-${k + 1}`, sheet: "particles", at, screen, pivot: "center", ...extra })),
    ),
  ],

  /** haldi on the couple: the haldi copy aligned to the clean one, split into reveal regions */
  variants: [
    {
      base: "couple-clean",
      variant: "couple-haldi",
      out: "couple-haldi",
      key: "dabs",
      split: true,
      detect: { kind: "yellow", threshold: 16, blur: 3 },
      rows: [0, 1],
      alignRows: [0.62, 0.72], // the seat
      near: 0.09,
      minArea: 30,
      feather: { blur: 4, gain: 3 },
      // hints on the CLEAN couple (sheet px); anything else becomes clothes-spots
      regions: [
        { name: "bride-cheek", at: [[290, 228]] },
        { name: "groom-cheek", at: [[465, 190]] },
        { name: "bride-arm", at: [[200, 410], [238, 470]] },
        { name: "groom-arm", at: [[400, 455], [612, 515]] },
        { name: "hands", at: [[384, 532], [565, 585]] },
      ],
      rest: "clothes-spots",
    },
  ],

  fit: {
    stage: { aspect: 1.6, headroom: 0.1 },
    groups: { swing: { z: 5 } },
    items: [
      // measured from the master (stage %): the beam spans 115–935 px, centred at y ≈ 56 px
      { piece: "beam", fixed: { x: 51.3, y: 9.7, w: 80 }, z: 6 },
      { piece: "umbrella-yellow", box: [88, 12, 302, 300], z: 4, rows: [0, 0.62] },
      { piece: "umbrella-palm", box: [385, 40, 655, 300], z: 4, rows: [0, 0.62] },
      { piece: "umbrella-orange", box: [760, 12, 972, 300], z: 4, rows: [0, 0.62] },
      { id: "couple", piece: "couple-clean", box: [300, 420, 860, 1125], z: 6, group: "swing" },
      // the friends' poses differ from the master's: placed by their height there
      // (Gujarati: head 345 → hem 1165, haldi fingertips at x 375; Kerala: bun 365 → hem
      // 1115, pot mouth at x 672)
      { piece: "friend-gujarati", fixed: { x: 11.9, y: 77.4, w: 51.9 }, z: 8 },
      { piece: "friend-kerala", fixed: { x: 81.8, y: 74.3, w: 34.5 }, z: 8 },
      { piece: "pookalam", box: [160, 1118, 885, 1296], z: 3 },
      { piece: "matkis", box: [0, 960, 168, 1272], z: 9 },
      { piece: "basket", box: [92, 1215, 388, 1388], z: 10 },
      { piece: "urli", box: [335, 1262, 727, 1476], z: 10 },
      { piece: "haldi-bowl", box: [688, 1300, 1000, 1442], z: 10 },
      { piece: "boy", box: [790, 845, 1040, 1312], z: 12 },
    ],
    /** pieces that are not matched to the master (or are placed from others) */
    extra: (items, P) => {
      const A = 1.6;
      const byId = Object.fromEntries(items.map((i) => [i.id, i]));
      const box = (it) => {
        const m = P[it.piece];
        const h = it.w / (m.w / m.h) / A;
        return { left: it.x - m.pivot[0] * it.w, top: it.y - m.pivot[1] * h, w: it.w, h };
      };
      const couple = box(byId.couple);
      const beam = box(byId.beam);
      const barY = beam.top + beam.h * 0.3; // the beam's bar (leaves hang below it)
      // the swing ropes: from the seat ends up past the beam (the extra length hides behind it)
      const ropeW = couple.w * 0.13;
      const seatY = couple.top + couple.h * 0.6;
      const rope = (piece, fx) => {
        const m = P[piece];
        const h = ropeW / (m.w / m.h) / A;
        const bottom = seatY + couple.h * 0.04;
        return { id: piece, piece, x: +(couple.left + couple.w * fx).toFixed(2), y: +(bottom - h * (1 - m.pivot[1])).toFixed(2), w: +ropeW.toFixed(2), z: 5, group: "swing" };
      };
      const ropes = [rope("rope-1", 0.075), rope("rope-2", 0.925)];
      // strands under the beam, beside and between the umbrellas (right half mirrored)
      const strands = [
        ["strand-1", 8.5, false],
        ["strand-4", 22, false],
        ["strand-2", 36.5, false],
        ["strand-2", 63.5, true],
        ["strand-4", 78, true],
        ["strand-1", 91.5, true],
      ].map(([piece, x, flip], k) => ({ id: `strand-${k + 1}x`, piece, x, y: +(barY + 0.6).toFixed(2), w: 5.6, z: 3.5, ...(flip ? { flip } : {}) }));
      // a scatter of marigolds and petals along the front edge
      const scatterPieces = ["marigold-1", "petal-marigold-1", "petal-white-2", "marigold-2", "petal-marigold-3", "petal-white-1", "marigold-3", "petal-marigold-2", "petal-white-3", "marigold-1", "petal-marigold-4", "petal-white-4"];
      const sx = [3.5, 11, 19.5, 28, 37, 45.5, 54, 62.5, 70.5, 79, 87.5, 96];
      const sy = [96.6, 98.6, 96.2, 98.2, 97.4, 99, 96.8, 98.4, 97, 98.9, 96.5, 98.3];
      const scatter = scatterPieces.map((piece, k) => ({
        id: `scatter-${k + 1}`,
        piece,
        x: sx[k],
        y: sy[k],
        w: piece.startsWith("marigold") ? 5.4 : 3.4,
        z: 11,
        rot: [12, -40, 75, -8, 130, -60, 20, 95, -120, 40, -15, 60][k],
      }));
      return [
        // tied-back curtains at the far edges, full height (mostly outside the stage)
        { id: "curtain-left", piece: "curtain-left", x: -11, y: 0, w: 48, z: 1 },
        { id: "curtain-right", piece: "curtain-right", x: 111, y: 0, w: 48, z: 1 },
        // banana plants behind the friends (pots hidden)
        { id: "banana-left", piece: "banana", x: 6, y: 74, w: 34, z: 2 },
        { id: "banana-right", piece: "banana", x: 94, y: 74, w: 34, z: 2, flip: true },
        ...strands,
        ...ropes,
        ...scatter,
        // the opening: two closed panels covering the stage (borders on their inner edges)
        { id: "panel-left", piece: "curtain-panel", x: 28.8, y: 0, w: 57.6, z: 30 },
        { id: "panel-right", piece: "curtain-panel", x: 71.2, y: 0, w: 57.6, z: 30, flip: true },
      ];
    },
  },
};

export default config;
