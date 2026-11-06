import { TILE } from '../data/assets';

/** Tile indices into the stage tileset (frame numbers of the tiles sheet). */
export const T = {
  empty: -1,
  solid: 0,
  wall: 1, // background, not solid
  spike: 2,
  platform: 3, // one-way: solid only from above
} as const;

const LEGEND: Record<string, number> = {
  '.': T.empty,
  ' ': T.empty,
  '#': T.solid,
  '-': T.wall,
  '^': T.spike,
  '=': T.platform,
  P: T.empty, // player spawn
};

export interface ParsedMap {
  /** Tile index per [row][col]. */
  tiles: number[][];
  cols: number;
  rows: number;
  /** Player spawn: feet position in pixels (bottom-center of the P cell). */
  spawn: { x: number; y: number };
}

/**
 * Parse an ASCII stage map. Every row must have the same width and exactly one `P`.
 */
export function parseMap(rows: readonly string[]): ParsedMap {
  if (rows.length === 0) throw new Error('empty map');
  const cols = rows[0]!.length;
  let spawn: ParsedMap['spawn'] | undefined;
  const tiles = rows.map((row, r) => {
    if (row.length !== cols) throw new Error(`row ${r} is ${row.length} wide, expected ${cols}`);
    return [...row].map((ch, c) => {
      const t = LEGEND[ch];
      if (t === undefined) throw new Error(`unknown tile '${ch}' at row ${r}, col ${c}`);
      if (ch === 'P') {
        if (spawn) throw new Error('more than one P in map');
        spawn = { x: c * TILE + TILE / 2, y: (r + 1) * TILE };
      }
      return t;
    });
  });
  if (!spawn) throw new Error('map has no P (player spawn)');
  return { tiles, cols, rows: rows.length, spawn };
}
