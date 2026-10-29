/**
 * Velvet corner drapes. The outline, folds, shading and gold trim are fixed;
 * inside them the velvet pattern flows endlessly and a soft sheen glides
 * across now and then (CSS transform animations → GPU, near-zero cost).
 *
 * "tl" hangs in the top-left corner. "br" hangs at the bottom-right of the
 * first screen and its tail curves back into the right edge BELOW the fold,
 * so scrolling never reveals a straight cut.
 */
import { useId, type CSSProperties } from "react";

type Shape = {
  w: number;
  h: number;
  path: string; // filled outline
  edge: string; // free edge (gold trim)
  inner: string; // dotted inner trim
  gather: [number, number]; // where the folds radiate from
};

export const DRAPES: Record<"tl" | "br", Shape> = {
  tl: {
    w: 178,
    h: 214,
    path: "M0 0 L178 0 C150 56 96 92 60 128 C34 154 14 184 0 214 Z",
    edge: "M178 0 C150 56 96 92 60 128 C34 154 14 184 0 214",
    inner: "M172 0 C145 52 92 87 56 123 C31 148 12 177 0 206",
    gather: [0, 0],
  },
  br: {
    w: 178,
    h: 300,
    // y = 214 is the bottom of the first screen; the tail lives below it
    path: "M178 0 C164 30 144 60 118 86 C82 122 28 158 6 200 C-8 228 30 262 96 282 C130 292 158 296 178 300 Z",
    edge: "M178 0 C164 30 144 60 118 86 C82 122 28 158 6 200 C-8 228 30 262 96 282 C130 292 158 296 178 300",
    inner: "M178 9 C166 36 148 64 124 89 C90 124 38 160 16 201 C5 225 38 254 99 273 C132 283 158 288 178 291",
    gather: [178, 214],
  },
};

/**
 * The drape outline as a CSS mask image. A mask (unlike clip-path: url(#svg))
 * lets mobile Safari/Chrome keep the endlessly flowing pattern on the GPU
 * instead of repainting it every frame.
 */
const maskOf = (s: Shape) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${s.w} ${s.h}' preserveAspectRatio='none'><path d='${s.path}'/></svg>`,
  )}")`;
const MASKS = { tl: maskOf(DRAPES.tl), br: maskOf(DRAPES.br) };

// fold wedges radiating from the gathered point: [angle from, angle to, light?]
const FOLDS: [number, number, boolean][] = [
  [4, 11, true],
  [13, 19, false],
  [24, 31, true],
  [35, 41, false],
  [46, 53, true],
  [58, 64, false],
  [69, 76, true],
  [80, 86, false],
];

type Props = { variant: "tl" | "br"; tile: string; tileU: number; flowSeconds: number; sheenSeconds: number };

export function VelvetDrape({ variant, tile, tileU, flowSeconds, sheenSeconds }: Props) {
  const id = useId().replace(/:/g, "");
  const s = DRAPES[variant];
  const [gx, gy] = s.gather;
  // tl folds fan down-right (0–90°); br folds fan up-left (180–270°)
  const base = variant === "tl" ? 0 : 180;
  const wedge = (a0: number, a1: number) => {
    const R = 420;
    const r = (d: number) => ((d + base) * Math.PI) / 180;
    return `M${gx} ${gy} L${gx + R * Math.cos(r(a0))} ${gy + R * Math.sin(r(a0))} L${gx + R * Math.cos(r(a1))} ${gy + R * Math.sin(r(a1))} Z`;
  };
  const style = {
    "--velvet-tile": `url(${tile})`,
    "--tile": `calc(var(--u) * ${tileU})`,
    "--flow-dur": `${flowSeconds}s`,
    "--sheen-dur": `${sheenSeconds}s`,
  } as CSSProperties;
  const vb = `0 0 ${s.w} ${s.h}`;

  return (
    <div className={`velvet velvet-${variant}`} style={style} aria-hidden>
      {/* static soft shadow on the paper */}
      <svg className="velvet-shadow" viewBox={vb} preserveAspectRatio="none">
        <defs>
          <filter id={`s${id}`} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <path d={s.path} fill="#3a060d" opacity="0.42" filter={`url(#s${id})`} />
      </svg>

      <div className="velvet-body" style={{ WebkitMaskImage: MASKS[variant], maskImage: MASKS[variant] }}>
        <div className="velvet-flow" />
        <div className="velvet-sheen" />
        {/* folds + depth, fixed in place over the moving pattern */}
        <svg className="velvet-shade" viewBox={vb} preserveAspectRatio="none">
          <defs>
            <radialGradient id={`d${id}`} gradientUnits="userSpaceOnUse" cx={gx} cy={gy} r={s.h * 1.15}>
              <stop offset="0" stopColor="#1a0205" stopOpacity="0.5" />
              <stop offset="0.45" stopColor="#1a0205" stopOpacity="0.05" />
              <stop offset="0.8" stopColor="#1a0205" stopOpacity="0" />
              <stop offset="1" stopColor="#1a0205" stopOpacity="0.4" />
            </radialGradient>
            <linearGradient id={`l${id}`} x1={variant === "tl" ? 0 : 1} y1={variant === "tl" ? 0 : 1} x2={variant === "tl" ? 1 : 0} y2={variant === "tl" ? 1 : 0}>
              <stop offset="0.3" stopColor="#ffb3bd" stopOpacity="0" />
              <stop offset="1" stopColor="#ffb3bd" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {FOLDS.map(([a0, a1, light], i) => (
            <path key={i} d={wedge(a0, a1)} fill={light ? `url(#l${id})` : "#120103"} opacity={light ? 1 : 0.22} />
          ))}
          <rect width={s.w} height={s.h} fill={`url(#d${id})`} />
          {/* velvet sheen rolling over the free edge */}
          <path d={s.edge} fill="none" stroke="#ff9fae" strokeOpacity="0.15" strokeWidth="10" />
        </svg>
      </div>

      {/* gold trim along the free edge */}
      <svg className="velvet-trim" viewBox={vb} preserveAspectRatio="none">
        <path d={s.edge} fill="none" stroke="#e6c98d" strokeWidth="2.4" strokeLinecap="round" />
        <path d={s.edge} fill="none" stroke="#8a6a33" strokeWidth="0.6" transform="translate(1.2 1.2)" opacity="0.8" />
        <path d={s.inner} fill="none" stroke="#dcc08a" strokeWidth="0.8" strokeDasharray="1.5 3.2" opacity="0.75" />
      </svg>
    </div>
  );
}
