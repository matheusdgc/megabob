import { type ParsedMap, T } from '../stages/map';

/**
 * A moving platform (stage data, in tiles): `cols` wide at `row`, sliding back and forth between
 * `col` and `col + range` at `speed` px/s. `startAtEnd` starts it at the far end, so two movers
 * in a row can run opposite to each other.
 */
export interface MoverDef {
  col: number;
  row: number;
  range: number;
  speed: number;
  cols?: number;
  startAtEnd?: boolean;
  /** Frames it rests at each end before turning back (time to step on or off). */
  dwell?: number;
}

/** Default rest at each end: long enough to board without pixel-perfect timing. */
export const MOVER_DWELL = 45;

export interface MoverState {
  x: number;
  dir: 1 | -1;
  /** Frames left resting at an end. */
  wait: number;
}

/** One frame of a mover: slide toward the next end, rest there, turn back. */
export function stepMover(s: MoverState, min: number, max: number, step: number, dwell = MOVER_DWELL): MoverState {
  if (s.wait > 0) return { ...s, wait: s.wait - 1 };
  const next = slide(s.x, s.dir, min, max, step);
  const arrived = next.dir !== s.dir;
  return { x: next.x, dir: next.dir, wait: arrived ? dwell : 0 };
}

export const MOVER_COLS = 3;
const TILE = 16;

/** One step of a ping-pong slide: the new x (px, left edge) and direction. */
export function slide(x: number, dir: 1 | -1, min: number, max: number, step: number): { x: number; dir: 1 | -1 } {
  let nx = x + dir * step;
  let nd = dir;
  if (nx >= max) {
    nx = max;
    nd = -1;
  } else if (nx <= min) {
    nx = min;
    nd = 1;
  }
  return { x: nx, dir: nd };
}

/** Pixel bounds of a mover's left edge. */
export const moverBounds = (m: MoverDef): { min: number; max: number } => ({ min: m.col * TILE, max: (m.col + m.range) * TILE });

/**
 * The map as the reachability check sees it: each mover becomes a one-way platform along its
 * whole path. Optimistic on purpose (Bob can always wait for the platform to come), so a stage
 * that passes still needs a playthrough to check the timing.
 */
export function withMovers(map: ParsedMap, movers: readonly MoverDef[]): ParsedMap {
  const tiles = map.tiles.map((r) => [...r]);
  for (const m of movers) {
    for (let c = m.col; c < m.col + m.range + (m.cols ?? MOVER_COLS); c++) {
      const row = tiles[m.row];
      if (row && row[c] === T.empty) row[c] = T.platform;
    }
  }
  return { ...map, tiles };
}
