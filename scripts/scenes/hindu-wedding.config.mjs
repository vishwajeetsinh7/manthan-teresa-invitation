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

/** pots used in each stack, bottom to top (7 = the one with the coconut) */
const STACK = [1, 2, 3, 4, 5, 7];

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
  sheets: {
    varmala: "varmala.png",
    couple: "couple.png",
    friends: "friends.png",
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

    { name: "gujarati-a", sheet: "friends", at: [230, 600], points: { hand: [400, 72] } },
    { name: "gujarati-b", sheet: "friends", at: [640, 650], points: { thali: [705, 398] } },
    { name: "kerala-a", sheet: "friends", at: [1040, 600], points: { hand: [845, 70] } },
    { name: "kerala-b", sheet: "friends", at: [1360, 600], points: { thali: [1322, 400] } },

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
    { a: "gujarati-a", b: "gujarati-b", rows: [0.55, 1] },
    { a: "kerala-a", b: "kerala-b", rows: [0.55, 1] },
  ],

  fit: {
    stage: { aspect: 1.65, headroom: 0.15 },
    items: [
      // measured from the master (stage %): the platform spans x 140–880 px, its front edge at y ≈ 1180
      { piece: "platform", fixed: { x: 49.8, y: 78.9, w: 72 }, z: 2 },
      { piece: "couple-final", box: [255, 290, 845, 1095], z: 5, rows: [0, 0.6] },
      { piece: "havan-kund", box: [322, 1100, 682, 1305], z: 8 },
      { piece: "pandit", box: [600, 925, 1040, 1345], z: 10, rows: [0, 0.6] },
      // the friends, from their height in the master and their thalis (Gujarati: head 420 → hem
      // 1165, thali at x ≈ 200; Kerala: head 450, same height, thali at x ≈ 860)
      { piece: "gujarati-b", fixed: { x: 13.5, y: 78, w: 36.8 }, z: 6 },
      { piece: "kerala-b", fixed: { x: 88.3, y: 79.8, w: 27 }, z: 6 },
      { piece: "kalash", box: [380, 1240, 690, 1470], z: 11 },
      { piece: "thali", box: [618, 1300, 888, 1445], z: 11 },
    ],
    /** the rest, placed from the master's proportions and from each other */
    extra: (items, P) => {
      const A = 1.65;
      const byId = Object.fromEntries(items.map((i) => [i.id, i]));
      const asp = (n) => P[n].w / P[n].h;
      const box = (it) => {
        const h = it.h ?? it.w / asp(it.piece) / A;
        const piv = P[it.piece].pivot;
        const px = it.flip ? 1 - piv[0] : piv[0];
        return { left: it.x - px * it.w, top: it.y - piv[1] * h, w: it.w, h };
      };
      const pt = (it, name) => {
        const b = box(it);
        const p = P[it.piece].extra.points[name];
        return { x: b.left + b.w * (it.flip ? 1 - p[0] : p[0]), y: b.top + b.h * p[1] };
      };
      const r2 = (n) => +n.toFixed(2);
      const out = [];

      // canopy: its end caps over the front pillars (11 % and 89 %)
      const capL = P.canopy.extra.points.capL;
      const capR = P.canopy.extra.points.capR;
      const cw = (89 - 11) / (capR[0] - capL[0]);
      const canopyTop = (10 + 154) / 1690 * 100;
      const canopy = { id: "canopy", piece: "canopy", x: r2(11 - capL[0] * cw + cw * P.canopy.pivot[0]), y: 0, w: r2(cw), z: 4 };
      const ch = cw / asp("canopy") / A;
      canopy.y = r2(canopyTop + P.canopy.pivot[1] * ch);
      const capY = canopyTop + capL[1] * ch;
      out.push(canopy);

      // pillars: front ones from the floor up to the caps; back ones 85 %, inward, darker
      const floorY = (1250 + 154) / 1690 * 100;
      const pillar = (id, x, top, base, w, z, tone) => ({ id, piece: "pillar", x, y: r2(base), w, h: r2(base - top), z, ...(tone ? { tone } : {}) });
      // (slim and tall like the master's: the carving stretches a little, as there)
      out.push(pillar("pillar-back-l", 25, capY + 2, (1010 + 154) / 1690 * 100, 5.6, 1, 0.9));
      out.push(pillar("pillar-back-r", 75, capY + 2, (1010 + 154) / 1690 * 100, 5.6, 1, 0.9));
      out.push(pillar("pillar-l", 11, capY + 1, floorY, 7.2, 3));
      out.push(pillar("pillar-r", 89, capY + 1, floorY, 7.2, 3));
      // swags between the front pillars, just under the canopy (narrow one behind)
      out.push({ id: "swag-narrow", piece: "swag-narrow", x: 50, y: r2(capY + 4.5), w: 60, z: 3.4 });
      out.push({ id: "swag-wide", piece: "swag-wide", x: 50, y: r2(capY + 2.2), w: 72, z: 3.5 });

      // pot stacks beside each front pillar base, ~45 % of the pillar's height
      const pillarH = floorY - (capY + 1);
      const natural = STACK.reduce((s, n) => s + P[`pot-${n}`].h * 0.86, 0); // pots nest a little
      for (const [side, x] of [["l", 8], ["r", 92]]) {
        let y = floorY + 1.5;
        const scale = (pillarH * 0.45) / ((natural * 1) / 1); // %-height per sheet px (set below)
        void scale;
        // width of the bottom pot sets the scale: stack height = 45 % of the pillar
        const k = (pillarH * 0.45) / natural; // stage-% of height per sheet px
        STACK.forEach((n, j) => {
          const piece = `pot-${n}`;
          const hPct = P[piece].h * k;
          const w = hPct * A * asp(piece);
          out.push({ id: `pot-${side}${j + 1}`, piece, x, y: r2(y), w: r2(w), z: 7 + j * 0.01 });
          y -= hPct * 0.86;
        });
      }

      // the couple's separate figures, at the scale of couple-final (same sheet scale)
      const cf = byId["couple-final"];
      const sheetScale = cf.w / P["couple-final"].w; // stage-% width per sheet px
      const feetY = cf.y;
      const fig = (id, piece, x, z) => ({ id, piece, x, y: feetY, w: r2(P[piece].w * sheetScale), z });
      const groomA = fig("groom-a", "groom-a", 20, 6.6);
      const brideA = fig("bride-a", "bride-a", 80, 6.6);
      out.push(groomA, brideA);
      // B poses sit exactly over their A (aligned on torso + legs)
      const alignB = (a, bName, id) => {
        const al = P[bName].extra.align;
        const ab = box(a);
        const w = ab.w * al.w;
        const h = w / asp(bName) / A;
        const left = ab.left + al.x * ab.w;
        const top = ab.top + al.y * ab.h;
        const piv = P[bName].pivot;
        return { id, piece: bName, x: r2(left + piv[0] * w), y: r2(top + piv[1] * h), w: r2(w), z: a.z };
      };
      out.push(alignB(groomA, "groom-b", "groom-b"), alignB(brideA, "bride-b", "bride-b"));

      // friends: B (thali) from the master; A (antarpat) aligned to B's pose position
      const gB = byId["gujarati-b"];
      const kB = byId["kerala-b"];
      // A over B: invert B's alignment to A
      const alignA = (b, aName, bName, id, z) => {
        const al = P[bName].extra.align; // B in A's frame
        const bb = box(b);
        const aw = bb.w / al.w;
        const ah = aw / asp(aName) / A;
        const left = bb.left - al.x * aw;
        const top = bb.top - al.y * ah;
        const piv = P[aName].pivot;
        return { id, piece: aName, x: r2(left + piv[0] * aw), y: r2(top + piv[1] * ah), w: r2(aw), z };
      };
      const gA = alignA(gB, "gujarati-a", "gujarati-b", "gujarati-a", 5.8);
      const kA = alignA(kB, "kerala-a", "kerala-b", "kerala-a", 5.8);
      out.push(gA, kA);

      // antarpat: its rod ends in the friends' pinched hands (they hold it up at centre-stage)
      const anW = 40;
      const rod = P.antarpat.extra.points;
      const antar = { id: "antarpat", piece: "antarpat", x: 50, y: 0, w: anW, z: 6.2 };
      const ah = anW / asp("antarpat") / A;
      // where the friends must stand (their hand on each rod end) during the antarpat
      const rodY = feetY - ah * 0.92; // the cloth hangs nearly to the floor
      antar.y = r2(rodY - rod.rodL[1] * ah + P.antarpat.pivot[1] * ah);
      out.push(antar);
      const rodLx = 50 - anW / 2 + rod.rodL[0] * anW;
      const rodRx = 50 - anW / 2 + rod.rodR[0] * anW;
      const handAt = (it, x, y) => {
        const h = pt(it, "hand");
        return { dx: r2(x - h.x), dy: r2(y - h.y) };
      };
      // offsets (stage %) from the friends' A layout spot to holding the rod — used by the timeline
      out.push({ id: "antarpatHold", meta: true, gujarati: handAt(gA, rodLx, rodY), kerala: handAt(kA, rodRx, rodY) });

      // the loose garlands that fly between them (hidden until the varmala)
      const vw = r2(P["varmala-loose"].w * sheetScale);
      out.push({ id: "varmala-1", piece: "varmala-loose", x: 20, y: 40, w: vw, z: 6.9 }, { id: "varmala-2", piece: "varmala-loose", x: 80, y: 40, w: vw, z: 6.9 });
      // the walking couple (placed on its path by the timeline)
      out.push({ id: "couple-walk", piece: "couple-walk", x: 50, y: feetY, w: r2(P["couple-walk"].w * sheetScale), z: 5.5 });

      // four diyas along the platform's front edge (clear of the kund)
      const dy = (1236 + 154) / 1690 * 100;
      [17, 30, 70, 83].forEach((x, i) => out.push({ id: `diya-${i + 1}`, piece: "diya", x, y: r2(dy), w: 6.2, z: 11 }));

      // a static scatter of petals, tuberose and akshat (floor and platform)
      const kinds = ["petal-red-1", "tuberose-2", "akshat-1", "petal-pink-2", "petal-red-3", "akshat-3", "tuberose-4", "petal-pink-4", "petal-red-2", "akshat-2", "petal-marigold-1", "tuberose-1", "petal-pink-1", "akshat-4"];
      const sx = [6, 14, 24, 33, 43, 57, 66, 74, 85, 94, 28, 40, 62, 72];
      const sy = [95, 98, 96, 99, 97.5, 98.5, 96.2, 99, 95.6, 98.2, 70, 71.5, 70.4, 72];
      kinds.forEach((piece, i) =>
        out.push({ id: `scatter-${i + 1}`, piece, x: sx[i], y: sy[i], w: piece.startsWith("akshat") ? 4 : 3.4, z: i < 10 ? 12 : 2.5, rot: [20, -50, 0, 80, -110, 30, 140, -20, 60, -70, 10, 95, -35, 50][i] }),
      );
      return out;
    },
  },
};

export default config;
