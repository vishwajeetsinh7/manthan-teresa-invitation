/**
 * The opening card's culture side wings (Kerala left, Gujarat right): which pieces exist, where
 * their files are. Pieces: public/scenes/culture/manifest.json (scripts/scenes/culture.config.mjs);
 * layout (as % of the 1024 × 1536 master): src/config/scenes/culture.json.
 */
import manifest from "@/public/scenes/culture/manifest.json";
import layout from "@/src/config/scenes/culture.json";

export type CulturePiece = {
  src: string;
  w: number;
  h: number;
  aspect: number;
  pivot: number[];
  points?: Record<string, number[]>;
  /** painted outline: per 16 horizontal bands, [leftmost, rightmost] solid x (shares of the width) */
  prof?: (number[] | null)[];
  /** a whole-piece sprite edit, aligned to its base: its box as shares of the base */
  align?: { to: string; x: number; y: number; w: number; h: number };
};
export type CultureItem = { id: string; piece: string; x: number; y: number; w: number; z: number; flip?: boolean; h?: number };

export const CULTURE_DIR = "/scenes/culture/";
export const CP = manifest.pieces as unknown as Record<string, CulturePiece>;
export const CITEMS = (layout as unknown as { items: CultureItem[] }).items;
export const cultureUrl = (name: string) => CULTURE_DIR + CP[name].src;
export const CULTURE_MASTER = CULTURE_DIR + ((manifest as unknown as { master?: string }).master ?? "master.webp");

/** the ambient particles and the flames (not layout items) */
export const CULTURE_KINDS = {
  left: ["jasmine-1", "jasmine-2", "jasmine-3", "jasmine-4", "frangipani-1", "frangipani-2", "frangipani-3", "frangipani-4"],
  right: ["marigold-petal-1", "marigold-petal-2", "marigold-petal-3", "marigold-petal-4", "rose-petal-1", "rose-petal-2", "rose-petal-3", "rose-petal-4"],
  sparkles: ["sparkle-1", "sparkle-2", "sparkle-3", "sparkle-4"],
  flames: ["diya-flame-1", "diya-flame-2", "diya-flame-3"],
};

/** every image the wings show, so the card can decode them before it appears */
export const cultureImages: string[] = [
  ...new Set([...CITEMS.map((i) => i.piece), ...Object.values(CULTURE_KINDS).flat(), "garbo-holes", "kathakali-eyes-left", "kathakali-eyes-right", "garba-click"]),
]
  .filter((n) => CP[n])
  .map(cultureUrl);
