/**
 * Gold line-art drawn by DrawSVG. Every stroke path has class "draw";
 * small filled shapes that pop in have class "pop".
 */
const GOLD = "#b08a4a";
const GOLD_LIGHT = "#d4b577";

/* ── the corner vines: every leaf and tendril grows out of the stem itself ── */

type Pt = { x: number; y: number };
/** an absolute "M … C … C …" path → its cubic segments */
function cubics(d: string): Pt[][] {
  const n = d.match(/-?\d*\.?\d+/g)!.map(Number);
  const segs: Pt[][] = [];
  let p0 = { x: n[0], y: n[1] };
  for (let i = 2; i + 5 < n.length; i += 6) {
    const seg = [p0, { x: n[i], y: n[i + 1] }, { x: n[i + 2], y: n[i + 3] }, { x: n[i + 4], y: n[i + 5] }];
    segs.push(seg);
    p0 = seg[3];
  }
  return segs;
}
const bez = (s: Pt[], t: number) => {
  const [a, b, c, e] = s;
  const m = 1 - t;
  return { x: m * m * m * a.x + 3 * m * m * t * b.x + 3 * m * t * t * c.x + t * t * t * e.x, y: m * m * m * a.y + 3 * m * m * t * b.y + 3 * m * t * t * c.y + t * t * t * e.y };
};
/** a point on a stem (u: share of its length, 0 = its start, 1 = its end) and the direction it grows there (degrees) */
function onStem(d: string, u: number) {
  const segs = cubics(d);
  // measure the stem, so leaves spaced evenly in u are spaced evenly along it
  const N = 48;
  const marks: { k: number; t: number; at: number }[] = [];
  let len = 0;
  let prev = segs[0][0];
  segs.forEach((sg, k) => {
    for (let j = 1; j <= N; j++) {
      const q = bez(sg, j / N);
      len += Math.hypot(q.x - prev.x, q.y - prev.y);
      marks.push({ k, t: j / N, at: len });
      prev = q;
    }
  });
  const want = Math.min(Math.max(u, 0), 1) * len;
  const hit = marks.find((mk) => mk.at >= want) ?? marks[marks.length - 1];
  const [a, b, c, e] = segs[hit.k];
  const t = Math.max(0, hit.t - (hit.at - want) / ((len / marks.length) * N));
  const m = 1 - t;
  const x = m * m * m * a.x + 3 * m * m * t * b.x + 3 * m * t * t * c.x + t * t * t * e.x;
  const y = m * m * m * a.y + 3 * m * m * t * b.y + 3 * m * t * t * c.y + t * t * t * e.y;
  const dx = 3 * m * m * (b.x - a.x) + 6 * m * t * (c.x - b.x) + 3 * t * t * (e.x - c.x);
  const dy = 3 * m * m * (b.y - a.y) + 6 * m * t * (c.y - b.y) + 3 * t * t * (e.y - c.y);
  return { x: +x.toFixed(2), y: +y.toFixed(2), deg: (Math.atan2(dy, dx) * 180) / Math.PI };
}

/** a leaf, its stalk at (0, 0), pointing along +x (≈ 21 long) */
const LEAF_BODY =
  "M0 0 C1.4 -0.3 2.6 -0.5 3.4 -0.6 C6 -4.8 11.5 -6.6 16 -4.8 C18.5 -3.8 20.3 -1.8 21.6 0.3 C18.6 2.6 14.4 4.5 10 4.2 C6.6 3.9 4.4 2.3 3.4 0.6 C2.6 0.5 1.4 0.3 0 0 Z";
const LEAF_VEIN = "M3.4 0 C8 -0.5 14 -0.4 20.4 0.3";
const LEAF_SIDE_VEINS = "M8 -0.4 C9.4 -2 10.8 -3 12.4 -3.6 M12.6 -0.3 C14 -1.8 15.2 -2.6 16.6 -3 M9.6 -0.3 C11 1.2 12.4 2 14 2.4";
/** a tendril leaving the stem at (0, 0), curling to its tip dot */
const TENDRIL = "M0 0 C8 1 18 -1 23 -8 C26.5 -13 23.5 -19 18 -17.6 C14.4 -16.6 14.6 -12 17.6 -11.6";
const TENDRIL_TIP: Pt = { x: 17.6, y: -11.6 };

/** [where on the stem (0–1), which side (1 = right of its growth, -1 = left), angle off the stem, size] */
type LeafAt = [number, 1 | -1, number, number];
type TendrilAt = [number, 1 | -1, number];

function GoldVine({ id, viewBox, stem, leaves, tendrils }: { id: string; viewBox: string; stem: string; leaves: LeafAt[]; tendrils: TendrilAt[] }) {
  const grad = `${id}-leaf`;
  return (
    <svg viewBox={viewBox} aria-hidden>
      <defs>
        <linearGradient id={grad} x1="0" y1="-6" x2="0" y2="5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ecd393" />
          <stop offset="0.5" stopColor="#c99d4f" />
          <stop offset="1" stopColor="#97722f" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={GOLD} strokeLinecap="round" strokeLinejoin="round">
        <path className="draw" d={stem} strokeWidth="1.5" />
        {tendrils.map(([u, side, size], i) => {
          const p = onStem(stem, u);
          return (
            <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${(p.deg + side * 50).toFixed(1)}) scale(${size} ${-side * size})`}>
              <path className="draw" d={TENDRIL} strokeWidth={1.05 / size} />
            </g>
          );
        })}
      </g>
      {leaves.map(([u, side, angle, size], i) => {
        const p = onStem(stem, u);
        return (
          <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${(p.deg + side * angle).toFixed(1)}) scale(${size} ${side * size})`}>
            <g className="pop leaf">
              <path d={LEAF_BODY} fill={`url(#${grad})`} stroke="#8a6a32" strokeWidth={0.7 / size} strokeLinejoin="round" />
              <path d={LEAF_VEIN} fill="none" stroke="#7d5f28" strokeWidth={0.6 / size} strokeLinecap="round" />
              <path d={LEAF_SIDE_VEINS} fill="none" stroke="#7d5f28" strokeOpacity="0.6" strokeWidth={0.4 / size} strokeLinecap="round" />
            </g>
          </g>
        );
      })}
      {tendrils.map(([u, side, size], i) => {
        const p = onStem(stem, u);
        return (
          <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${(p.deg + side * 50).toFixed(1)}) scale(${size} ${-side * size})`}>
            <circle className="pop" cx={TENDRIL_TIP.x} cy={TENDRIL_TIP.y} r={1.9 / size} fill={GOLD} />
          </g>
        );
      })}
    </svg>
  );
}

/** Corner vine for the top-left. Grows from the side edge up to the top edge. */
export function CornerVine() {
  return (
    <GoldVine
      id="cv"
      viewBox="0 0 214 250"
      stem="M6 248 C14 214 30 178 52 150 C80 114 120 86 156 54 C176 36 192 20 206 4"
      leaves={[
        [0.06, -1, 48, 0.95],
        [0.12, 1, 46, 0.9],
        [0.2, -1, 44, 1],
        [0.27, 1, 48, 0.95],
        [0.38, -1, 42, 1],
        [0.46, 1, 46, 0.95],
        [0.55, -1, 44, 0.95],
        [0.63, 1, 48, 0.9],
        [0.72, -1, 42, 0.85],
        [0.8, 1, 46, 0.8],
        [0.88, -1, 40, 0.72],
        [0.95, 1, 42, 0.62],
      ]}
      tendrils={[
        [0.16, 1, 0.9],
        [0.34, 1, 1.05],
        [0.5, -1, 0.85],
        [0.59, 1, 1],
        [0.84, 1, 0.8],
      ]}
    />
  );
}

/**
 * Vine for the bottom-right drape: runs just outside its free edge, follows
 * the tail under the fold and ends tucked into the right edge (no cut).
 * Same 178-wide box as the drape ("br" shape); y = 214 is the screen bottom.
 */
export function TailVine() {
  return (
    <GoldVine
      id="tv"
      viewBox="0 0 178 312"
      stem="M170 -6 C156 24 134 52 108 76 C72 110 20 146 -2 190 C-18 222 18 266 90 292 C126 304 156 308 178 312"
      leaves={[
        [0.05, 1, 44, 0.8],
        [0.11, -1, 46, 0.85],
        [0.18, 1, 42, 0.95],
        [0.25, -1, 46, 0.95],
        [0.33, 1, 44, 1],
        [0.41, -1, 46, 0.95],
        [0.5, 1, 42, 0.95],
        [0.58, -1, 46, 0.9],
        [0.66, 1, 44, 0.9],
        [0.74, -1, 46, 0.85],
        [0.82, 1, 42, 0.8],
        [0.9, -1, 44, 0.75],
      ]}
      tendrils={[
        [0.22, -1, 0.9],
        [0.38, 1, 1],
        [0.62, -1, 0.95],
        [0.78, 1, 0.85],
      ]}
    />
  );
}

/** Calligraphic swash under each script name; every stroke starts at the centre. */
const FLOURISH_PATHS = [
  "M150 20 C147 17 143.5 13.5 145 10.8 C146 9 148.5 8.6 150 9.8",
  "M150 20 C153 17 156.5 13.5 155 10.8 C154 9 151.5 8.6 150 9.8",
  "M150 20 C138 24.5 124 24.5 110 21.5",
  "M150 20 C162 24.5 176 24.5 190 21.5",
  "M144.4 13.6 C133 8.5 116 8 102 11.8",
  "M155.6 13.6 C167 8.5 184 8 198 11.8",
  "M118.4 22.9 C106 29 90 31 77 28.8 C71 27.8 69 24.6 71.6 23.4",
  "M181.6 22.9 C194 29 210 31 223 28.8 C229 27.8 231 24.6 228.4 23.4",
  "M110 21.5 C96 18.5 80 16.5 64 18",
  "M190 21.5 C204 18.5 220 16.5 236 18",
  "M102 11.8 C93 14 86.5 13 85.5 9.8 C84.8 7.5 87.5 6.2 89.2 7.8 C90.4 9 89.6 10.8 88 10.6",
  "M198 11.8 C207 14 213.5 13 214.5 9.8 C215.2 7.5 212.5 6.2 210.8 7.8 C209.6 9 210.4 10.8 212 10.6",
  "M64 18 C50 19.3 39 23 29 24.2",
  "M236 18 C250 19.3 261 23 271 24.2",
  "M29 24.2 C20 25.2 13.5 22 14.2 16.8 C14.8 12.6 20.4 11.4 23.2 14.4 C25.6 17 23.8 20.6 20.4 20",
  "M271 24.2 C280 25.2 286.5 22 285.8 16.8 C285.2 12.6 279.6 11.4 276.8 14.4 C274.4 17 276.2 20.6 279.6 20",
];
export function NameFlourish({ className = "" }: { className?: string }) {
  return (
    <svg className={`name-flourish ${className}`} viewBox="0 0 300 40" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {FLOURISH_PATHS.map((d, i) => (
          <path key={i} className="draw" d={d} />
        ))}
      </g>
      <circle className="dot" cx="150" cy="27.5" r="1.4" fill="currentColor" />
      <circle className="dot" cx="8" cy="21" r="1.2" fill="currentColor" />
      <circle className="dot" cx="292" cy="21" r="1.2" fill="currentColor" />
    </svg>
  );
}

/**
 * Vertical vine the schedule hangs on, built from the motifs of the vine
 * drawn in Claude chat: its top curl, a repeating "wave" of stem with a leaf,
 * a tendril (alternating sides) and a second leaf, round nodes for events,
 * and its end flourish. `wavesPerGap` sets how far apart events are (one
 * wave ≈ 188 units of the 120-wide drawing). Paths are in drawing order
 * (top → bottom) so a scroll-scrubbed draw-on grows it downward.
 */
export type ThreadPath = { d: string; node?: boolean; /** units of vine-less gap just before this path */ gapBefore?: number };
export type Thread = {
  paths: ThreadPath[];
  height: number;
  nodes: number[];
  /** a stretch with no vine (for a full-width scene), in drawing units: [top, bottom] */
  gap?: [number, number];
};

/**
 * @param scene  leave a vine-less gap of `units` after event `after`: the vine
 *               ends there in its flourish and starts again with its top curl
 */
export function buildThread(
  count: number,
  wavesPerGap: number | readonly number[],
  scene?: { after: number; units: number },
  /** extra waves after the last event (room for what hangs under it) */
  tailWaves = 0,
): Thread {
  /** waves between event i and i + 1 (a list sets each gap; the last value repeats) */
  const gap = (i: number) => (typeof wavesPerGap === "number" ? wavesPerGap : (wavesPerGap[i] ?? wavesPerGap[wavesPerGap.length - 1]));
  const paths: ThreadPath[] = [];
  const nodes: number[] = [];
  const r = (n: number) => +n.toFixed(1);
  /** top curl + first stretch of stem, ending at y0 + 144 */
  const curl = (y0: number, gapBefore?: number) => {
    const t = (n: number) => r(y0 + n);
    paths.push({ d: `M51.5 ${t(20)} C53.5 ${t(22)} 51.5 ${t(25)} 48.5 ${t(24.2)} C44.5 ${t(23)} 45.5 ${t(17)} 50 ${t(16.5)} C56 ${t(16)} 60 ${t(22)} 60 ${t(34)} C60 ${t(58)} 52 ${t(68)} 52 ${t(89)} C52 ${t(110)} 60 ${t(120)} 60 ${t(144)}`, gapBefore });
    paths.push({ d: `M52.2 ${t(83)} C48.1 ${t(76)} 41.8 ${t(68.9)} 31.4 ${t(71)} C35 ${t(78.8)} 43.6 ${t(83.8)} 52.2 ${t(83)} C47.3 ${t(79.5)} 42.3 ${t(76.1)} 37.9 ${t(73.8)}` });
    paths.push({ d: `M56 ${t(115.4)} C61 ${t(113.5)} 66 ${t(110)} 70 ${t(105.5)} C73.5 ${t(101.5)} 72.5 ${t(96.5)} 68.8 ${t(96.6)} C65.6 ${t(96.7)} 65.2 ${t(100.6)} 67.6 ${t(101.2)} C69 ${t(101.6)} 69.8 ${t(100.2)} 69.2 ${t(99.4)}` });
  };
  /** end flourish hanging from Y (about 130 units long) */
  const flourish = (Y: number) => {
    paths.push({
      d: `M60 ${Y} C60 ${Y + 24} 68 ${Y + 34} 68 ${Y + 55} C68 ${Y + 76} 60 ${Y + 86} 60 ${Y + 110} C60 ${Y + 122} 64 ${Y + 128} 70 ${Y + 127.5} C74.5 ${Y + 127} 75.5 ${Y + 121} 71.5 ${Y + 119.8} C68.5 ${Y + 119} 66.5 ${Y + 122} 68.5 ${Y + 124}`,
    });
    paths.push({ d: `M67.8 ${Y + 49} C71.9 ${Y + 42} 78.2 ${Y + 34.9} 88.6 ${Y + 37} C85 ${Y + 44.8} 76.4 ${Y + 49.8} 67.8 ${Y + 49} C72.7 ${Y + 45.5} 77.7 ${Y + 42.1} 82.1 ${Y + 39.8}` });
    paths.push({ d: `M64 ${Y + 81.4} C59.9 ${Y + 74.4} 53.6 ${Y + 67.3} 43.2 ${Y + 69.4} C46.8 ${Y + 77.2} 55.4 ${Y + 82.2} 64 ${Y + 81.4} C59.1 ${Y + 77.9} 54.1 ${Y + 74.5} 49.7 ${Y + 72.2}` });
  };
  curl(0);

  const node = (y: number) => {
    paths.push({ d: `M60 ${y} A6 6 0 1 1 60 ${y + 12} A6 6 0 1 1 60 ${y}`, node: true });
    nodes.push(y + 6);
  };
  const wave = (y: number, curlRight: boolean) => {
    paths.push({ d: `M60 ${r(y)} C60 ${r(y + 24)} 70 ${r(y + 39)} 70 ${r(y + 64)} C70 ${r(y + 92)} 50 ${r(y + 96)} 50 ${r(y + 124)} C50 ${r(y + 149)} 60 ${r(y + 164)} 60 ${r(y + 188)}` });
    paths.push({
      d: `M69.7 ${r(y + 56.8)} C73.8 ${r(y + 49.8)} 80.1 ${r(y + 42.7)} 90.5 ${r(y + 44.8)} C86.9 ${r(y + 52.6)} 78.3 ${r(y + 57.6)} 69.7 ${r(y + 56.8)} C74.6 ${r(y + 53.3)} 79.6 ${r(y + 49.9)} 84 ${r(y + 47.6)}`,
    });
    paths.push({
      d: curlRight
        ? `M60 ${r(y + 94)} C65 ${r(y + 97)} 71 ${r(y + 101)} 74.5 ${r(y + 106.5)} C77 ${r(y + 110.5)} 75.2 ${r(y + 115)} 71.4 ${r(y + 114.4)} C68.4 ${r(y + 113.9)} 68.4 ${r(y + 110.2)} 70.8 ${r(y + 109.8)} C72.2 ${r(y + 109.6)} 73 ${r(y + 111)} 72.4 ${r(y + 111.8)}`
        : `M60 ${r(y + 94)} C55 ${r(y + 91)} 49 ${r(y + 87)} 45.5 ${r(y + 81.5)} C43 ${r(y + 77.5)} 44.8 ${r(y + 73)} 48.6 ${r(y + 73.6)} C51.6 ${r(y + 74.1)} 51.6 ${r(y + 77.8)} 49.2 ${r(y + 78.2)} C47.8 ${r(y + 78.4)} 47 ${r(y + 77)} 47.6 ${r(y + 76.2)}`,
    });
    paths.push({
      d: `M50.6 ${r(y + 116.3)} C46.5 ${r(y + 109.3)} 40.2 ${r(y + 102.2)} 29.8 ${r(y + 104.3)} C33.4 ${r(y + 112.1)} 42 ${r(y + 117.1)} 50.6 ${r(y + 116.3)} C45.7 ${r(y + 112.8)} 40.7 ${r(y + 109.4)} 36.3 ${r(y + 107.1)}`,
    });
  };

  let y = 144;
  let flip = false;
  let gapSpan: [number, number] | undefined;
  for (let i = 0; i < count; i++) {
    node(y);
    y += 12;
    if (i === count - 1) {
      for (let w = 0; w < tailWaves; w++) {
        wave(y, flip);
        flip = !flip;
        y += 188;
      }
      break;
    }
    if (scene && scene.after === i) {
      // the vine ends in its flourish, leaves room for the scene, then curls in again
      flourish(y);
      const top = y;
      y += scene.units;
      gapSpan = [top, y];
      curl(y, scene.units);
      y += 144;
      continue;
    }
    for (let w = 0; w < gap(i); w++) {
      wave(y, flip);
      flip = !flip;
      y += 188;
    }
  }
  flourish(y);
  return { paths, height: y + 144, nodes, gap: gapSpan };
}

export function ScheduleThread({ thread }: { thread: Thread }) {
  return (
    <svg className="thread" viewBox={`0 0 120 ${thread.height}`} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {thread.paths.map((p, i) => (
          <path key={i} className={p.node ? "draw node" : "draw"} d={p.d} data-gap={p.gapBefore} />
        ))}
      </g>
    </svg>
  );
}

/** Divider with a centre diamond; both lines draw outward from the centre. */
export function Divider({ className = "divider" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 190 14" aria-hidden>
      <g fill="none" stroke={GOLD} strokeWidth="1" strokeLinecap="round">
        <path className="draw" d="M84 7 L22 7 C16 7 13 4 10 4 C7 4 6 7 8 8.5" />
        <path className="draw" d="M106 7 L168 7 C174 7 177 4 180 4 C183 4 184 7 182 8.5" />
        <path className="draw" d="M80 7 C70 7 64 10.5 56 10.5" strokeWidth="0.7" />
        <path className="draw" d="M110 7 C120 7 126 10.5 134 10.5" strokeWidth="0.7" />
      </g>
      <path className="pop diamond" d="M95 1.5 L100.5 7 L95 12.5 L89.5 7 Z" fill={GOLD_LIGHT} stroke={GOLD} strokeWidth="0.9" />
      <circle className="pop" cx="86" cy="7" r="1.2" fill={GOLD} />
      <circle className="pop" cx="104" cy="7" r="1.2" fill={GOLD} />
    </svg>
  );
}

/** Small flourish beside "with". Draws from the word outward. Mirror for the right side. */
export function Flourish({ mirror = false }: { mirror?: boolean }) {
  return (
    <svg
      className="flourish"
      viewBox="0 0 62 16"
      aria-hidden
      style={mirror ? { transform: "scaleX(-1)" } : undefined}
    >
      <g fill="none" stroke={GOLD} strokeWidth="1" strokeLinecap="round">
        <path className="draw" d="M60 8 C50 8 42 3.5 32 6 C24 8 20 13.5 13 11.5 C8 10 8.5 4.5 13 5 C16 5.4 16 8.5 14 9" />
        <path className="draw" d="M44 6.2 C40 2 34 1.5 30 3" strokeWidth="0.7" />
      </g>
      <circle className="pop" cx="3" cy="8" r="1.3" fill={GOLD} />
    </svg>
  );
}

/** Chevron icon used in the scroll hint. */
export function Chevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <path d="M5 9 L12 16 L19 9" />
    </svg>
  );
}
