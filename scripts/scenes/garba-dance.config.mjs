/**
 * Garba / Dance Night — "Raas to Remix": where every cut-out comes from and
 * where it stands. Used by scripts/build-scene-assets.mjs
 * (npm run scene:garba-dance). Art: assets-src/garba-dance (two masters: the
 * garba look and the dance look of the same stage).
 *
 * Laid out by hand from the masters (1024 × 1536 px → stage %). The six garba
 * dancers are not placed here: they revolve on the ring in `meta.ring`.
 */
const OLD = "../hindu-wedding/";

/* ── master px (1024 × 1536) → stage % (the stage is the master: no headroom) */
const A = 1.5;
const X = (mx) => +((mx / 1024) * 100).toFixed(2);
const Y = (my) => +((my / (A * 1024)) * 100).toFixed(2);
const Wd = (mw) => +((mw / 1024) * 100).toFixed(2);

const particles = [
  // [name, at, screen px, extra]
  ["spark-1", [218, 150], 44, { gather: 60, clip: [80, 85, 290, 270], warm: 0.2 }],
  ["spark-2", [443, 190], 44, { gather: 70, clip: [330, 85, 545, 270], warm: 0.2 }],
  ["spark-3", [745, 198], 44, { gather: 70, clip: [600, 85, 800, 270], warm: 0.2 }],
  ["mirror-1", [948, 190], 12, {}],
  ["mirror-2", [1104, 188], 12, {}],
  ["mirror-3", [1258, 188], 12, {}],
  ["mirror-4", [1408, 188], 12, {}],
  ["confetti-1", [141, 412], 10, {}],
  ["confetti-2", [310, 419], 10, {}],
  ["confetti-3", [505, 407], 14, {}],
  ["confetti-4", [702, 420], 14, {}],
  ["confetti-5", [890, 414], 12, {}],
  ["confetti-6", [1075, 419], 12, { key: { cap: undefined, despill: false, lo: 90 } }],
  ["confetti-7", [1240, 410], 14, {}],
  ["confetti-8", [1396, 410], 14, {}],
  ["note-1", [117, 630], 16, { warm: 0.3 }],
  ["note-2", [252, 630], 18, { warm: 0.3 }],
  ["note-3", [391, 630], 18, { warm: 0.3 }],
  ["note-4", [523, 630], 18, { warm: 0.3 }],
  ["petal-marigold-1", [686, 640], 13, { warm: 0.3 }],
  ["petal-marigold-2", [817, 648], 11, { warm: 0.3 }],
  ["petal-marigold-3", [957, 645], 13, { warm: 0.3 }],
  ["petal-rose-1", [1121, 641], 13, {}],
  ["petal-rose-2", [1266, 642], 13, {}],
  ["petal-rose-3", [1407, 638], 13, {}],
  ["sparkle-1", [341, 850], 12, { warm: 0.3 }],
  ["sparkle-2", [602, 850], 14, { warm: 0.3 }],
  ["sparkle-3", [887, 851], 12, { warm: 0.3 }],
  ["sparkle-4", [1173, 850], 14, { warm: 0.3 }],
];

const config = {
  name: "garba-dance",
  srcDir: "assets-src/garba-dance",
  outDir: "public/scenes/garba-dance",
  layout: "src/config/scenes/garba-dance.json",
  stageMaxWidth: 350,
  density: 3,
  sheetSize: true, // the dancers share one scale on their sheet: keep their sheet sizes
  key: { screen: "blue", lo: 40, hi: 150, bg: [0, 3, 253], cap: 1 },
  minBlob: 30,
  attachGap: 18,
  attachGapBySheet: { particles: -1, flame: -1 },
  pad: 4,
  master: "garba-master.png",
  masters: { garba: "garba-master.png", dance: "dance-master.png" },
  sheets: {
    dancers: "garba-dancers.png",
    crew: "dance-crew.png",
    gprops: "garba-props.png",
    dprops: "dance-props.png",
    floor: "dance-floor.png",
    particles: "particles-night.png",
    flame: OLD + "particles.png",
  },
  pieces: [
    // the six garba dancers, all facing right, dandiyas raised (sticks: between the two stick tips)
    { name: "dancer-bride", sheet: "dancers", at: [160, 600], points: { sticks: [276, 291] } },
    { name: "dancer-groom", sheet: "dancers", at: [400, 470], points: { sticks: [531, 278] } },
    { name: "dancer-gujarati", sheet: "dancers", at: [640, 600], points: { sticks: [765, 298] } },
    { name: "dancer-kerala", sheet: "dancers", at: [900, 600], points: { sticks: [1003, 298] } },
    { name: "dancer-mustard", sheet: "dancers", at: [1120, 480], points: { sticks: [1235, 289] } },
    { name: "dancer-pink", sheet: "dancers", at: [1390, 600], points: { sticks: [1492, 301] } },

    // the dance crew
    { name: "crew-couple", sheet: "crew", at: [300, 600], points: { hem: [270, 780] } },
    { name: "crew-gujarati", sheet: "crew", at: [750, 600] },
    { name: "crew-kerala", sheet: "crew", at: [1040, 600] },
    { name: "crew-flowergirl", sheet: "crew", at: [1360, 620] },

    // garba decor, the garbo, the dhol player
    { name: "bunting", sheet: "gprops", at: [760, 150], pivot: "topcenter", points: { endL: [40, 40], endR: [1495, 40] } },
    { name: "toran", sheet: "gprops", at: [770, 330], pivot: "topcenter", points: { endL: [100, 292], endR: [1440, 292] } },
    {
      name: "garbo",
      sheet: "gprops",
      at: [290, 760],
      // the painted flame goes (a live one burns at the pot's mouth); the pot's pierced holes glow
      clearAbove: { y: 566, x0: 250, x1: 330 },
      glowMask: { box: [140, 600, 440, 815], darkMax: 125, minArea: 3, maxArea: 90, blur: 2.5, gain: 2.4 },
      points: { flame: [290, 586] },
    },
    { name: "dhol-player", sheet: "gprops", at: [700, 750], points: { dhol: [700, 712] } },
    { name: "lantern-1", sheet: "gprops", at: [1040, 720], pivot: "top", points: { core: [1040, 720] } },
    { name: "lantern-2", sheet: "gprops", at: [1318, 720], pivot: "top", points: { core: [1318, 730] } },

    // dance props: the truss and its four spotlights (lens centres), the disco ball, the DJ
    {
      name: "truss",
      sheet: "dprops",
      at: [770, 70],
      pivot: "topcenter",
      points: { lens1: [262, 238], lens2: [600, 238], lens3: [945, 238], lens4: [1290, 240] },
    },
    { name: "disco-ball", sheet: "dprops", at: [378, 712], pivot: "top", points: { chain: [378, 318], ball: [378, 712], edge: [608, 712] } },
    // the DJ is one drawing: the boy (above the deck, between the speakers) and the console + speakers
    { name: "dj-boy", sheet: "dprops", at: [1040, 520], clip: [832, 340, 1256, 676], pivotAt: [1045, 640] },
    { name: "dj-console", sheet: "dprops", at: [1040, 850], exclude: [832, 340, 1256, 676], points: { coneL: [760, 685], coneR: [1325, 685] } },

    // the round floor, seen from above
    { name: "floor", sheet: "floor", at: [627, 627], pivot: "center" },

    // the garbo's flame: the Hindu wedding's diya flames
    ...[[1040, 270], [1215, 280], [1390, 270]].map((at, i) => ({ name: `diya-flame-${i + 1}`, sheet: "flame", at, screen: 30, warm: 0.12 })),

    ...particles.map(([name, at, screen, extra]) => ({ name, sheet: "particles", at, screen, pivot: "center", ...extra })),
  ],

  fit: {
    stage: { aspect: A, headroom: 0 },
    items: [],
    extra: (items, P) => {
      const out = [];
      const put = (id, piece, mx, my, mw, z, more = {}) => ({ id, piece, x: X(mx), y: Y(my), w: Wd(mw), z, ...more });

      // GARBA: the dhol player at the back left, the garbo at the floor's centre, the decor overhead
      out.push(put("dhol-player", "dhol-player", 112, 756, 222, 30));
      out.push(put("garbo", "garbo", 515, 1006, 250, 50));
      out.push(put("lantern-l", "lantern-1", 352, 186, 78, 82));
      out.push(put("lantern-c", "lantern-2", 512, 146, 104, 82.5));
      out.push(put("lantern-r", "lantern-1", 672, 186, 78, 82, { flip: true }));
      out.push(put("toran", "toran", 512, 24, 560, 83));
      out.push(put("bunting", "bunting", 512, -6, 1090, 84));

      // DANCE: the truss, the disco ball (centre at 512 / 285, 170 across), the DJ at the back
      // right, the couple in the middle, the friends left and front right, the flower girl front left
      out.push(put("truss", "truss", 512, 72, 790, 85));
      const db = P["disco-ball"];
      const ballDia = 170;
      const k = ballDia / 460; // master px per sheet px (the ball is ~460 px across on its sheet)
      const chainTop = 285 - (712 - 318) * k;
      out.push(put("disco-ball", "disco-ball", 512, chainTop, db.w * k, 86));
      const con = P["dj-console"];
      const boy = P["dj-boy"];
      const cw = 262;
      const ck = cw / con.w; // master px per sheet px
      const conX = 838;
      const conBottom = 714;
      out.push(put("dj-console", "dj-console", conX, conBottom, cw, 21));
      // the boy where he was on the sheet (above the deck, between the speakers)
      const conLeft = conX - cw / 2;
      const conTop = conBottom - con.h * ck;
      const bx = conLeft + (boy.x0 - con.x0) * ck;
      const by = conTop + (boy.y0 - con.y0) * ck;
      out.push(put("dj-boy", "dj-boy", bx + boy.pivot[0] * boy.w * ck, by + boy.pivot[1] * boy.h * ck, boy.w * ck, 20));
      out.push(put("crew-gujarati", "crew-gujarati", 132, 972, 232, 52));
      out.push(put("crew-couple", "crew-couple", 505, 1010, 535, 54, { flip: true }));
      out.push(put("crew-flowergirl", "crew-flowergirl", 192, 1388, 300, 58));
      out.push(put("crew-kerala", "crew-kerala", 852, 1314, 352, 59));

      // the floor (a circle seen at the camera's tilt), the garba ring on it, the arch, the lights
      out.push({
        id: "stage",
        meta: true,
        // the floor's centre and radius (stage %), and how flat its circle looks (height / width)
        floor: { x: X(512), y: Y(1168), r: Wd(548), squash: 0.62 },
        // the six dancers' ring round the garbo: centre (the garbo's base), radii, a front
        // dancer's width (stage %), the far side's scale
        ring: { x: X(526), y: Y(1004), rx: Wd(300), ry: Y(176), w: Wd(282), back: 0.72 },
        // the sky arch: left, top, width, bottom (stage %)
        arch: { x: X(58), y: Y(14), w: Wd(908), bottom: Y(1010) },
        // where the garbo's flame becomes the disco ball
        ball: { x: X(512), y: Y(285), r: Wd(85) },
      });
      return out;
    },
  },
};

export default config;
