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
 * Vertical vine the schedule hangs on. Stem segments, leaves and the four
 * event nodes are listed in drawing order (top → bottom), so a scroll-scrubbed
 * draw-on grows it downward. Node centres (y): 150, 350, 550, 750 of 900.
 */
export const THREAD_NODES = [150, 350, 550, 750].map((y) => y / 900);
const THREAD_PATHS: { d: string; node?: boolean }[] = [
  { d: "M51.5 20 C53.5 22 51.5 25 48.5 24.2 C44.5 23 45.5 17 50 16.5 C56 16 60 22 60 34 C60 58 52 68 52 89 C52 110 60 120 60 144" },
  { d: "M52.2 83 C48.1 76 41.8 68.9 31.4 71 C35 78.8 43.6 83.8 52.2 83 C47.3 79.5 42.3 76.1 37.9 73.8" },
  { d: "M56 115.4 C61 113.5 66 110 70 105.5 C73.5 101.5 72.5 96.5 68.8 96.6 C65.6 96.7 65.2 100.6 67.6 101.2 C69 101.6 69.8 100.2 69.2 99.4" },
  { d: "M60 144 A6 6 0 1 1 60 156 A6 6 0 1 1 60 144", node: true },
  { d: "M60 156 C60 180 70 195 70 220 C70 248 50 252 50 280 C50 305 60 320 60 344" },
  { d: "M69.7 212.8 C73.8 205.8 80.1 198.7 90.5 200.8 C86.9 208.6 78.3 213.6 69.7 212.8 C74.6 209.3 79.6 205.9 84 203.6" },
  { d: "M60 250 C55 247 49 243 45.5 237.5 C43 233.5 44.8 229 48.6 229.6 C51.6 230.1 51.6 233.8 49.2 234.2 C47.8 234.4 47 233 47.6 232.2" },
  { d: "M50.6 272.3 C46.5 265.3 40.2 258.2 29.8 260.3 C33.4 268.1 42 273.1 50.6 272.3 C45.7 268.8 40.7 265.4 36.3 263.1" },
  { d: "M60 344 A6 6 0 1 1 60 356 A6 6 0 1 1 60 344", node: true },
  { d: "M60 356 C60 380 70 395 70 420 C70 448 50 452 50 480 C50 505 60 520 60 544" },
  { d: "M69.7 412.8 C73.8 405.8 80.1 398.7 90.5 400.8 C86.9 408.6 78.3 413.6 69.7 412.8 C74.6 409.3 79.6 405.9 84 403.6" },
  { d: "M60 450 C65 453 71 457 74.5 462.5 C77 466.5 75.2 471 71.4 470.4 C68.4 469.9 68.4 466.2 70.8 465.8 C72.2 465.6 73 467 72.4 467.8" },
  { d: "M50.6 472.3 C46.5 465.3 40.2 458.2 29.8 460.3 C33.4 468.1 42 473.1 50.6 472.3 C45.7 468.8 40.7 465.4 36.3 463.1" },
  { d: "M60 544 A6 6 0 1 1 60 556 A6 6 0 1 1 60 544", node: true },
  { d: "M60 556 C60 580 70 595 70 620 C70 648 50 652 50 680 C50 705 60 720 60 744" },
  { d: "M69.7 612.8 C73.8 605.8 80.1 598.7 90.5 600.8 C86.9 608.6 78.3 613.6 69.7 612.8 C74.6 609.3 79.6 605.9 84 603.6" },
  { d: "M60 650 C55 647 49 643 45.5 637.5 C43 633.5 44.8 629 48.6 629.6 C51.6 630.1 51.6 633.8 49.2 634.2 C47.8 634.4 47 633 47.6 632.2" },
  { d: "M50.6 672.3 C46.5 665.3 40.2 658.2 29.8 660.3 C33.4 668.1 42 673.1 50.6 672.3 C45.7 668.8 40.7 665.4 36.3 663.1" },
  { d: "M60 744 A6 6 0 1 1 60 756 A6 6 0 1 1 60 744", node: true },
  { d: "M60 756 C60 780 68 790 68 811 C68 832 60 842 60 866 C60 878 64 884 70 883.5 C74.5 883 75.5 877 71.5 875.8 C68.5 875 66.5 878 68.5 880" },
  { d: "M67.8 805 C71.9 798 78.2 790.9 88.6 793 C85 800.8 76.4 805.8 67.8 805 C72.7 801.5 77.7 798.1 82.1 795.8" },
  { d: "M64 837.4 C59.9 830.4 53.6 823.3 43.2 825.4 C46.8 833.2 55.4 838.2 64 837.4 C59.1 833.9 54.1 830.5 49.7 828.2" },
];
export function ScheduleThread() {
  return (
    <svg className="thread" viewBox="0 0 120 900" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {THREAD_PATHS.map((p, i) => (
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
