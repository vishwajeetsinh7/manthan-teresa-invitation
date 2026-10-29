/**
 * Placeholder artwork shown until the real PNG/WebP files exist.
 * Simple, tasteful SVGs in the invitation palette.
 */
import { useId } from "react";

const fill = { width: "100%", height: "100%", display: "block" } as const;

/* ── Velvet drape, cut from the envelope's own velvet ─────────────────
 * Top-left orientation; `flip` turns it into the bottom-right drape while
 * keeping the embossed pattern upright. Folds + sheen are drawn on top.  */
const DRAPE_PATH = "M0 0 H178 C150 56 96 92 60 128 C34 154 14 184 0 214 Z";
const DRAPE_EDGE = "M178 0 C150 56 96 92 60 128 C34 154 14 184 0 214";

export function VelvetDrape({ flip = false, texture }: { flip?: boolean; texture: string }) {
  const id = useId().replace(/:/g, "");
  const turn = flip ? "rotate(180 89 107)" : undefined;
  // fold wedges radiating from the gathered corner: [angle from, angle to, light?]
  const folds: [number, number, boolean][] = [
    [4, 11, true],
    [13, 19, false],
    [24, 31, true],
    [35, 41, false],
    [46, 53, true],
    [58, 64, false],
    [69, 76, true],
    [80, 86, false],
  ];
  const wedge = (a0: number, a1: number) => {
    const R = 320;
    const r = (d: number) => (d * Math.PI) / 180;
    return `M0 0 L${R * Math.cos(r(a0))} ${R * Math.sin(r(a0))} L${R * Math.cos(r(a1))} ${R * Math.sin(r(a1))} Z`;
  };
  return (
    <svg viewBox="0 0 178 214" style={{ ...fill, overflow: "visible" }} aria-hidden>
      <defs>
        <clipPath id={`c${id}`}>
          <path d={DRAPE_PATH} />
        </clipPath>
        <radialGradient id={`d${id}`} cx="0" cy="0" r="1.2">
          <stop offset="0" stopColor="#1a0205" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#1a0205" stopOpacity="0.05" />
          <stop offset="0.8" stopColor="#1a0205" stopOpacity="0" />
          <stop offset="1" stopColor="#1a0205" stopOpacity="0.45" />
        </radialGradient>
        <linearGradient id={`l${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.3" stopColor="#ffb3bd" stopOpacity="0" />
          <stop offset="1" stopColor="#ffb3bd" stopOpacity="0.22" />
        </linearGradient>
        <filter id={`s${id}`} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="2" dy="5" stdDeviation="5" floodColor="#3a060d" floodOpacity="0.4" />
        </filter>
      </defs>
      <g transform={turn} filter={`url(#s${id})`}>
        <g clipPath={`url(#c${id})`}>
          <rect width="178" height="214" fill="#5a0b16" />
          <image
            href={texture}
            width="178"
            height="214"
            preserveAspectRatio="xMidYMid slice"
            transform={turn}
          />
          {folds.map(([a0, a1, light], i) => (
            <path key={i} d={wedge(a0, a1)} fill={light ? `url(#l${id})` : "#12010399"} opacity={light ? 1 : 0.35} />
          ))}
          <rect width="178" height="214" fill={`url(#d${id})`} />
          {/* velvet sheen rolling over the free edge */}
          <path d={DRAPE_EDGE} fill="none" stroke="#ff9fae" strokeOpacity="0.16" strokeWidth="10" transform="translate(-4 -4)" />
        </g>
        <path d={DRAPE_EDGE} fill="none" stroke="#e6c98d" strokeWidth="2.4" strokeLinecap="round" />
        <path d={DRAPE_EDGE} fill="none" stroke="#8a6a33" strokeWidth="0.6" transform="translate(1.4 1.4)" opacity="0.8" />
        <path
          d="M172 0 C145 52 92 87 56 123 C31 148 12 177 0 206"
          fill="none"
          stroke="#dcc08a"
          strokeWidth="0.8"
          strokeDasharray="1.5 3.2"
          opacity="0.75"
        />
      </g>
    </svg>
  );
}

/* ── Gold wax seal with monogram ──────────────────────────────────── */
const sealPath = (() => {
  const pts: string[] = [];
  const n = 120;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = 47 + 2.3 * Math.sin(t * 9) + 0.8 * Math.sin(t * 23 + 1.3);
    pts.push(`${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
})();

export function SealPlaceholder() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 100" style={fill} aria-hidden>
      <defs>
        <radialGradient id={`g${id}`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#f6dfa0" />
          <stop offset="0.45" stopColor="#cfa75e" />
          <stop offset="0.85" stopColor="#9c7535" />
          <stop offset="1" stopColor="#7d5a26" />
        </radialGradient>
        <radialGradient id={`i${id}`} cx="0.45" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#e7c983" />
          <stop offset="1" stopColor="#b48a45" />
        </radialGradient>
      </defs>
      <path d={sealPath} fill={`url(#g${id})`} />
      <circle cx="50" cy="50" r="34" fill={`url(#i${id})`} />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#8a6630" strokeWidth="1.4" />
      <circle cx="50.6" cy="50.8" r="35.6" fill="none" stroke="#fbe8b8" strokeWidth="0.8" opacity="0.7" />
      <text
        x="50.6"
        y="59.6"
        textAnchor="middle"
        fontFamily="var(--font-script), cursive"
        fontSize="27"
        fill="#fbe8b8"
        opacity="0.8"
      >
        T&amp;M
      </text>
      <text x="50" y="59" textAnchor="middle" fontFamily="var(--font-script), cursive" fontSize="27" fill="#7d5a26">
        T&amp;M
      </text>
    </svg>
  );
}

/* ── Flowers ──────────────────────────────────────────────────────── */
type Palette = { base: string; mid: string; tip: string; heart: string };
export const flowerPalettes: Palette[] = [
  { base: "#4f0913", mid: "#7c1626", tip: "#a8364a", heart: "#3a060d" }, // deep burgundy rose
  { base: "#c98d88", mid: "#e2b2ab", tip: "#f6dcd5", heart: "#a45f5c" }, // blush
  { base: "#d6bb8f", mid: "#eedfc6", tip: "#fbf4e8", heart: "#b9935a" }, // ivory
  { base: "#7a1a2a", mid: "#a43a4c", tip: "#d77b86", heart: "#5a0c18" }, // raspberry
];

const petalD = "M50 50 C33 42 31 16 50 10 C69 16 67 42 50 50 Z";

export function FlowerOpenPlaceholder({ kind }: { kind: number }) {
  const id = useId().replace(/:/g, "");
  const p = flowerPalettes[kind % 4];
  const rings = [
    { count: 9, scale: 1, offset: 0, fill: `a${id}` },
    { count: 7, scale: 0.74, offset: 20, fill: `b${id}` },
    { count: 5, scale: 0.48, offset: 8, fill: `c${id}` },
  ];
  return (
    <svg viewBox="0 0 100 100" style={fill} aria-hidden>
      <defs>
        <linearGradient id={`a${id}`} x1="0.5" y1="1" x2="0.5" y2="0.2">
          <stop offset="0" stopColor={p.base} />
          <stop offset="1" stopColor={p.tip} />
        </linearGradient>
        <linearGradient id={`b${id}`} x1="0.5" y1="1" x2="0.5" y2="0.25">
          <stop offset="0" stopColor={p.base} />
          <stop offset="1" stopColor={p.mid} />
        </linearGradient>
        <linearGradient id={`c${id}`} x1="0.5" y1="1" x2="0.5" y2="0.3">
          <stop offset="0" stopColor={p.heart} />
          <stop offset="1" stopColor={p.mid} />
        </linearGradient>
      </defs>
      {rings.map((r, ri) => (
        <g key={ri} transform={`translate(50 50) scale(${r.scale}) translate(-50 -50)`}>
          {Array.from({ length: r.count }, (_, i) => (
            <path
              key={i}
              d={petalD}
              transform={`rotate(${(360 / r.count) * i + r.offset} 50 50)`}
              fill={`url(#${r.fill})`}
              stroke={p.base}
              strokeOpacity="0.35"
              strokeWidth="0.6"
            />
          ))}
        </g>
      ))}
      <circle cx="50" cy="50" r="6" fill={p.heart} />
      <path d="M47 50 C47 46 53 46 53 50 C53 53 49 54 48.5 51.5" fill="none" stroke={p.tip} strokeWidth="0.9" opacity="0.7" />
    </svg>
  );
}

export function FlowerBudPlaceholder({ kind }: { kind: number }) {
  const id = useId().replace(/:/g, "");
  const p = flowerPalettes[kind % 4];
  return (
    <svg viewBox="0 0 100 100" style={fill} aria-hidden>
      <defs>
        <linearGradient id={`d${id}`} x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0" stopColor={p.base} />
          <stop offset="1" stopColor={p.tip} />
        </linearGradient>
      </defs>
      <path d="M50 74 C34 64 36 40 50 28 C64 40 66 64 50 74 Z" fill={`url(#d${id})`} />
      <path d="M50 74 C40 66 40 46 46 36 C44 52 46 64 50 74 Z" fill={p.base} opacity="0.55" />
      <path d="M50 74 C60 66 60 46 54 36 C56 52 54 64 50 74 Z" fill={p.mid} opacity="0.5" />
      <path d="M50 76 C42 72 36 64 34 56 C42 60 46 66 50 72 C54 66 58 60 66 56 C64 64 58 72 50 76 Z" fill="#6e7d52" />
    </svg>
  );
}

/* ── Gold-foil leaves (match the gold vines) ─────────────────────────── */
const leafWidths = [13, 10, 15, 11, 12];

export function LeafPlaceholder({ kind }: { kind: number }) {
  const id = useId().replace(/:/g, "");
  const w = leafWidths[kind % 5];
  const half = (side: 1 | -1) => `M15 80 C${15 + side * w} 60 ${15 + side * w} 22 15 0 Z`;
  return (
    <svg viewBox="0 0 30 80" style={fill} aria-hidden preserveAspectRatio="none">
      <defs>
        <linearGradient id={`a${id}`} x1="0" y1="1" x2="0.3" y2="0">
          <stop offset="0" stopColor="#7d5a26" />
          <stop offset="0.55" stopColor="#b08a4a" />
          <stop offset="1" stopColor="#d9bd82" />
        </linearGradient>
        <linearGradient id={`b${id}`} x1="1" y1="1" x2="0.6" y2="0">
          <stop offset="0" stopColor="#a07c3c" />
          <stop offset="0.5" stopColor="#e9cf94" />
          <stop offset="1" stopColor="#f7e6bb" />
        </linearGradient>
      </defs>
      <path d={half(-1)} fill={`url(#a${id})`} />
      <path d={half(1)} fill={`url(#b${id})`} />
      <g fill="none" stroke="#7d5a26" strokeLinecap="round" opacity="0.7">
        <path d="M15 79 L15 4" strokeWidth="0.9" />
        <path d="M15 58 Q10 52 7 46 M15 44 Q10 38 8 31 M15 30 Q11 25 10 19" strokeWidth="0.5" />
        <path d="M15 58 Q20 52 23 46 M15 44 Q20 38 22 31 M15 30 Q19 25 20 19" strokeWidth="0.5" />
      </g>
    </svg>
  );
}

/* ── Falling petal ────────────────────────────────────────────────── */
export function PetalPlaceholder({ kind }: { kind: number }) {
  const id = useId().replace(/:/g, "");
  const cols = [
    ["#7c1626", "#b24456"],
    ["#d49c96", "#f3d6cf"],
    ["#e8d6b6", "#fbf3e6"],
  ][kind % 3];
  return (
    <svg viewBox="0 0 20 24" style={fill} aria-hidden>
      <defs>
        <linearGradient id={`p${id}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={cols[0]} />
          <stop offset="1" stopColor={cols[1]} />
        </linearGradient>
      </defs>
      <path d="M10 23 C2 18 0 8 6 2 C9 0 12 0 14 2 C20 8 18 18 10 23 Z" fill={`url(#p${id})`} />
      <path d="M10 22 C9 15 9 9 10 4" stroke={cols[0]} strokeWidth="0.5" opacity="0.5" fill="none" />
    </svg>
  );
}
