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
