import { TILE } from '../data/assets';

/** Tile indices into the stage tileset (frame numbers of the tiles sheet). */
export const T = {
  empty: -1,
  solid: 0,
  wall: 1, // background, not solid
  spike: 2,
  platform: 3, // one-way: solid only from above
  conveyorRight: 4, // solid; carries whoever stands on it
  conveyorLeft: 5,
  vanish0: 6, // solid blocks that vanish and come back, in three phase groups (src/systems/vanish.ts)
  vanish1: 7,
  vanish2: 8,
  thin: 9, // a thin wall: solid, stops shots except the Null Pointer
  fake: 10, // looks like a wall, is not one: a hidden passage (the Debug Visor shows it)
} as const;

/** Phase group (0-2) of a vanishing block, or null for any other cell. */
export const vanishGroup = (t: number | undefined): 0 | 1 | 2 | null =>
  t === T.vanish0 ? 0 : t === T.vanish1 ? 1 : t === T.vanish2 ? 2 : null;

/**
 * Blocks movement from every side (ground, walls, conveyors, thin walls, vanishing blocks).
 * Vanishing blocks count as solid here: the stage switches them off in time, and the reach
 * check assumes Bob waits for them.
 */
export const isSolid = (t: number | undefined): boolean =>
  t === T.solid || t === T.conveyorRight || t === T.conveyorLeft || t === T.thin || vanishGroup(t) !== null;

/** Something Bob can stand on (solids and one-way platforms). */
export const isFloor = (t: number | undefined): boolean => isSolid(t) || t === T.platform;

/** Horizontal push of a conveyor cell (-1, 0 or 1). */
export const conveyorDir = (t: number | undefined): -1 | 0 | 1 => (t === T.conveyorRight ? 1 : t === T.conveyorLeft ? -1 : 0);

/**
 * The belt push under a body standing with its feet from `left` to `right` at `bottom`: either
 * foot on a belt is enough, so a belt carries Bob all the way off its end.
 */
export const conveyorUnder = (cellAt: (x: number, y: number) => number | undefined, left: number, right: number, bottom: number): -1 | 0 | 1 =>
  conveyorDir(cellAt(left, bottom + 1)) || conveyorDir(cellAt(right - 0.01, bottom + 1));

const LEGEND: Record<string, number> = {
  '.': T.empty,
  ' ': T.empty,
  '#': T.solid,
  '-': T.wall,
  '^': T.spike,
  '=': T.platform,
  '>': T.conveyorRight,
  '<': T.conveyorLeft,
  '1': T.vanish0,
  '2': T.vanish1,
  '3': T.vanish2,
  '|': T.thin,
  '?': T.fake,
  P: T.empty, // player spawn
};

/** Enemy markers. The cell keeps the tile to its left, so markers don't punch holes. */
export const ENEMY_MARKERS = {
  m: 'pixelMite',
  d: 'spamDrone',
  v: 'drip',
  h: 'heapCrab',
  r: 'threadRunner',
  k: 'clockSpike',
  o: 'voidEye',
  j: 'danglingRef',
} as const;
export type EnemyKind = (typeof ENEMY_MARKERS)[keyof typeof ENEMY_MARKERS];

/**
 * Stage object markers (same tile rule as enemies). `B` is the bottom-left cell of the door.
 * Update Terminals: V Debug Visor, K Compiler Cannon, F Firewall Plating, T Turbo Boots.
 * Placed items: * extra life, + large health.
 */
export const OBJECT_MARKERS = {
  C: 'checkpoint',
  B: 'bossDoor',
  V: 'terminalHead',
  K: 'terminalArm',
  F: 'terminalBody',
  T: 'terminalLegs',
  '*': 'itemLife',
  '+': 'itemHealth',
} as const;

/** The armor part of a terminal object, or null. */
export const terminalPart = (kind: ObjectKind): 'head' | 'arm' | 'body' | 'legs' | null =>
  kind === 'terminalHead' ? 'head' : kind === 'terminalArm' ? 'arm' : kind === 'terminalBody' ? 'body' : kind === 'terminalLegs' ? 'legs' : null;
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
