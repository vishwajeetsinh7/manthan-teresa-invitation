/**
 * Gold line-art drawn by DrawSVG. Every stroke path has class "draw";
 * small filled shapes that pop in have class "pop".
 */
const GOLD = "#b08a4a";
const GOLD_LIGHT = "#d4b577";

const LEAF = "M0 0 C4 -5.5 12 -5.5 17 0 C12 5.5 4 5.5 0 0 Z";

/** Corner vine for the top-left; rotate 180° for bottom-right. Draws from the side edge to the top edge. */
export function CornerVine() {
  const stems = [
    "M6 248 C14 214 30 178 52 150 C80 114 120 86 156 54 C176 36 192 20 206 4",
    "M52 150 C62 158 76 158 82 148 C86 140 80 133 73 137",
    "M108 100 C118 110 134 110 138 99 C141 91 134 86 128 90",
    "M156 54 C166 62 180 60 183 50 C185 43 179 40 175 44",
    "M24 200 C34 206 46 204 48 194 C49 187 43 184 39 188",
    "M86 122 C80 108 84 96 94 92",
  ];
  const leaves: [number, number, number, number][] = [
    // x, y, rotation, scale
    [14, 222, 20, 0.9],
    [22, 206, -110, 0.8],
    [36, 176, 15, 1],
    [44, 162, -115, 0.85],
    [66, 134, 10, 1],
    [92, 112, -100, 0.9],
    [124, 82, 5, 1],
    [136, 72, -105, 0.85],
    [170, 40, 0, 0.9],
    [188, 24, -110, 0.75],
    [82, 148, 70, 0.6],
    [138, 99, 60, 0.6],
  ];
  const dots: [number, number][] = [
    [73, 137],
    [128, 90],
    [175, 44],
    [39, 188],
    [94, 92],
  ];
  return (
    <svg viewBox="0 0 214 250" aria-hidden>
      <g fill="none" stroke={GOLD} strokeWidth="1.25" strokeLinecap="round">
        {stems.map((d, i) => (
          <path key={i} className="draw" d={d} strokeWidth={i === 0 ? 1.5 : 1.05} />
        ))}
      </g>
      {leaves.map(([x, y, r, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
          <path className="pop" d={LEAF} fill={GOLD_LIGHT} fillOpacity="0.55" stroke={GOLD} strokeWidth="0.9" />
        </g>
      ))}
      {dots.map(([x, y], i) => (
        <circle key={i} className="pop" cx={x} cy={y} r="2" fill={GOLD} />
      ))}
    </svg>
  );
}

/**
 * Vine for the bottom-right drape: runs just outside its free edge, follows
 * the tail under the fold and ends tucked into the right edge (no cut).
 * Same 178-wide box as the drape ("br" shape); y = 214 is the screen bottom.
 */
export function TailVine() {
  const stems = [
    "M170 -6 C156 24 134 52 108 76 C72 110 20 146 -2 190 C-18 222 18 266 90 292 C126 304 156 308 178 312",
    "M108 76 C112 64 124 60 130 66 C134 71 129 77 124 74",
    "M44 128 C36 120 26 124 26 132 C26 138 33 140 36 135",
    "M-6 236 C-16 240 -18 252 -10 254 C-4 256 -1 249 -5 246",
    "M58 282 C56 294 64 302 72 298",
    "M140 40 C150 34 158 40 154 48",
  ];
  const leaves: [number, number, number, number][] = [
    [152, 26, -150, 0.85],
    [128, 54, -40, 0.75],
    [92, 92, -160, 1],
    [66, 110, -60, 0.85],
    [30, 144, -170, 0.9],
    [10, 172, -70, 0.8],
    [-8, 212, 175, 0.9],
    [-4, 242, 80, 0.8],
    [30, 274, 150, 0.95],
    [64, 288, 50, 0.8],
    [112, 302, 160, 0.85],
    [146, 308, 70, 0.75],
  ];
  const dots: [number, number][] = [
    [124, 74],
    [36, 135],
    [-5, 246],
    [72, 298],
    [154, 48],
  ];
  return (
    <svg viewBox="0 0 178 312" aria-hidden>
      <g fill="none" stroke={GOLD} strokeLinecap="round">
        {stems.map((d, i) => (
          <path key={i} className="draw" d={d} strokeWidth={i === 0 ? 1.5 : 1.05} />
        ))}
      </g>
      {leaves.map(([x, y, r, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
          <path className="pop" d={LEAF} fill={GOLD_LIGHT} fillOpacity="0.55" stroke={GOLD} strokeWidth="0.9" />
        </g>
      ))}
      {dots.map(([x, y], i) => (
        <circle key={i} className="pop" cx={x} cy={y} r="2" fill={GOLD} />
      ))}
    </svg>
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
export type Thread = { paths: { d: string; node?: boolean }[]; height: number; nodes: number[] };

export function buildThread(count: number, wavesPerGap: number): Thread {
  const paths: { d: string; node?: boolean }[] = [];
  const nodes: number[] = [];
  // top curl + first stretch of stem down to the first node (y 144)
  paths.push({ d: "M51.5 20 C53.5 22 51.5 25 48.5 24.2 C44.5 23 45.5 17 50 16.5 C56 16 60 22 60 34 C60 58 52 68 52 89 C52 110 60 120 60 144" });
  paths.push({ d: "M52.2 83 C48.1 76 41.8 68.9 31.4 71 C35 78.8 43.6 83.8 52.2 83 C47.3 79.5 42.3 76.1 37.9 73.8" });
  paths.push({ d: "M56 115.4 C61 113.5 66 110 70 105.5 C73.5 101.5 72.5 96.5 68.8 96.6 C65.6 96.7 65.2 100.6 67.6 101.2 C69 101.6 69.8 100.2 69.2 99.4" });

  const node = (y: number) => {
    paths.push({ d: `M60 ${y} A6 6 0 1 1 60 ${y + 12} A6 6 0 1 1 60 ${y}`, node: true });
    nodes.push(y + 6);
  };
  const r = (n: number) => +n.toFixed(1);
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
  for (let i = 0; i < count; i++) {
    node(y);
    y += 12;
    if (i === count - 1) break;
    for (let w = 0; w < wavesPerGap; w++) {
      wave(y, flip);
      flip = !flip;
      y += 188;
    }
  }
  // end flourish after the last node
  const Y = y; // == last node bottom
  paths.push({
    d: `M60 ${Y} C60 ${Y + 24} 68 ${Y + 34} 68 ${Y + 55} C68 ${Y + 76} 60 ${Y + 86} 60 ${Y + 110} C60 ${Y + 122} 64 ${Y + 128} 70 ${Y + 127.5} C74.5 ${Y + 127} 75.5 ${Y + 121} 71.5 ${Y + 119.8} C68.5 ${Y + 119} 66.5 ${Y + 122} 68.5 ${Y + 124}`,
  });
  paths.push({ d: `M67.8 ${Y + 49} C71.9 ${Y + 42} 78.2 ${Y + 34.9} 88.6 ${Y + 37} C85 ${Y + 44.8} 76.4 ${Y + 49.8} 67.8 ${Y + 49} C72.7 ${Y + 45.5} 77.7 ${Y + 42.1} 82.1 ${Y + 39.8}` });
  paths.push({ d: `M64 ${Y + 81.4} C59.9 ${Y + 74.4} 53.6 ${Y + 67.3} 43.2 ${Y + 69.4} C46.8 ${Y + 77.2} 55.4 ${Y + 82.2} 64 ${Y + 81.4} C59.1 ${Y + 77.9} 54.1 ${Y + 74.5} 49.7 ${Y + 72.2}` });
  return { paths, height: Y + 144, nodes };
}

export function ScheduleThread({ thread }: { thread: Thread }) {
  return (
    <svg className="thread" viewBox={`0 0 120 ${thread.height}`} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {thread.paths.map((p, i) => (
          <path key={i} className={p.node ? "draw node" : "draw"} d={p.d} />
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
