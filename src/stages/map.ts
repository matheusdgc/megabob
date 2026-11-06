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

/** Enemy markers. The cell keeps the tile to its left, so markers don't punch holes. */
export const ENEMY_MARKERS = { m: 'pixelMite', d: 'spamDrone', v: 'drip', h: 'heapCrab' } as const;
export type EnemyKind = (typeof ENEMY_MARKERS)[keyof typeof ENEMY_MARKERS];

/** Stage object markers (same tile rule as enemies). `B` is the bottom-left cell of the door. */
export const OBJECT_MARKERS = { C: 'checkpoint', B: 'bossDoor' } as const;
export type ObjectKind = (typeof OBJECT_MARKERS)[keyof typeof OBJECT_MARKERS];

export interface MapObject {
  kind: ObjectKind;
  /** Bottom-left corner of the marker cell, in pixels. */
  x: number;
  y: number;
}

export interface MapEnemy {
  kind: EnemyKind;
  /** Bottom-center of the marker cell, in pixels. */
  x: number;
  y: number;
}

export interface ParsedMap {
  /** Tile index per [row][col]. */
  tiles: number[][];
  cols: number;
  rows: number;
  /** Player spawn: feet position in pixels (bottom-center of the P cell). */
  spawn: { x: number; y: number };
  enemies: MapEnemy[];
  objects: MapObject[];
}

/**
 * Parse an ASCII stage map. Every row must have the same width and exactly one `P`.
 * Lowercase enemy markers (`ENEMY_MARKERS`) place enemies; `OBJECT_MARKERS` place checkpoints
 * and the boss door.
 */
export function parseMap(rows: readonly string[]): ParsedMap {
  if (rows.length === 0) throw new Error('empty map');
  const cols = rows[0]!.length;
  let spawn: ParsedMap['spawn'] | undefined;
  const enemies: MapEnemy[] = [];
  const objects: MapObject[] = [];
  const tiles = rows.map((row, r) => {
    if (row.length !== cols) throw new Error(`row ${r} is ${row.length} wide, expected ${cols}`);
    const out: number[] = [];
    [...row].forEach((ch, c) => {
      const kind = ENEMY_MARKERS[ch as keyof typeof ENEMY_MARKERS];
      if (kind) {
        enemies.push({ kind, x: c * TILE + TILE / 2, y: (r + 1) * TILE });
        out.push(c > 0 ? out[c - 1]! : T.empty);
        return;
      }
      const object = OBJECT_MARKERS[ch as keyof typeof OBJECT_MARKERS];
      if (object) {
        objects.push({ kind: object, x: c * TILE, y: (r + 1) * TILE });
        out.push(c > 0 ? out[c - 1]! : T.empty);
        return;
      }
      const t = LEGEND[ch];
      if (t === undefined) throw new Error(`unknown tile '${ch}' at row ${r}, col ${c}`);
      if (ch === 'P') {
        if (spawn) throw new Error('more than one P in map');
        spawn = { x: c * TILE + TILE / 2, y: (r + 1) * TILE };
      }
      out.push(t);
    });
    return out;
  });
  if (!spawn) throw new Error('map has no P (player spawn)');
  return { tiles, cols, rows: rows.length, spawn, enemies, objects };
}
