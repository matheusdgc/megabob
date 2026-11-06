import { T } from './map';

/**
 * Which tileset frame draws each kind of cell. The map stays logical (`T` values, used for
 * collision and hazards); a skin only decides the look, picking edges and corners from the
 * neighbours of each solid cell.
 */
export interface TileSkin {
  top: number;
  fill: number;
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
  /** A solid run one tile wide (open on both sides). */
  column: number;
  /** One-way platform: left end, middle, right end. */
  platform: readonly [number, number, number];
  hazard: number;
  wall: number;
}

/** tiles_test: one frame per kind (0 solid, 1 wall, 2 spike, 3 platform). */
export const PLAIN_SKIN: TileSkin = {
  top: 0,
  fill: 0,
  topLeft: 0,
  topRight: 0,
  bottomLeft: 0,
  bottomRight: 0,
  column: 0,
  platform: [3, 3, 3],
  hazard: 2,
  wall: 1,
};

/** The stage tilesets from tools/art.py (tiles_memory_leak and siblings, 24 frames). */
export const STAGE_SKIN: TileSkin = {
  top: 0,
  fill: 1,
  topLeft: 2,
  topRight: 3,
  bottomLeft: 6,
  bottomRight: 7,
  column: 15,
  platform: [12, 13, 14],
  hazard: 16,
  wall: 17,
};

/** Every frame a skin uses for solid cells (they get full collision). */
export const solidFrames = (s: TileSkin): number[] => [...new Set([s.top, s.fill, s.topLeft, s.topRight, s.bottomLeft, s.bottomRight, s.column])];

/** Tileset frames for a logical map (-1 = nothing drawn). Off-map neighbours count as solid. */
export function skinTiles(tiles: readonly (readonly number[])[], skin: TileSkin): number[][] {
  const at = (r: number, c: number) => (r < 0 || r >= tiles.length || c < 0 || c >= (tiles[0]?.length ?? 0) ? T.solid : tiles[r]![c]!);
  return tiles.map((row, r) =>
    row.map((t, c) => {
      switch (t) {
        case T.solid: {
          const up = at(r - 1, c) !== T.solid;
          const down = at(r + 1, c) !== T.solid;
          const left = at(r, c - 1) !== T.solid;
          const right = at(r, c + 1) !== T.solid;
          if (left && right) return skin.column;
          if (up) return left ? skin.topLeft : right ? skin.topRight : skin.top;
          if (down && left) return skin.bottomLeft;
          if (down && right) return skin.bottomRight;
          return skin.fill;
        }
        case T.platform: {
          const l = at(r, c - 1) === T.platform;
          const rr = at(r, c + 1) === T.platform;
          return !l && rr ? skin.platform[0] : l && !rr ? skin.platform[2] : skin.platform[1];
        }
        case T.spike:
          return skin.hazard;
        case T.wall:
          return skin.wall;
        default:
          return -1;
      }
    }),
  );
}
