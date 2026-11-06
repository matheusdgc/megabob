import { describe, expect, it } from 'vitest';
import { PLAIN_SKIN, skinTiles, solidFrames, STAGE_SKIN } from '../src/stages/autotile';
import { parseMap } from '../src/stages/map';
import { STAGES } from '../src/stages/stages';

const skin = (rows: string[]) => skinTiles(parseMap(rows).tiles, STAGE_SKIN);

describe('skinTiles', () => {
  it('gives ground its top, corners and fill', () => {
    const f = skin([
      'P.......',
      '..####..',
      '..####..',
      '########',
    ]);
    expect(f[1]).toEqual([-1, -1, 2, 0, 0, 3, -1, -1]);
    // side edges have no frame of their own in the tileset: fill
    expect(f[2]).toEqual([-1, -1, 1, 1, 1, 1, -1, -1]);
    // off-map neighbours count as solid, so the map border gets no corners
    expect(f[3]).toEqual([0, 0, 1, 1, 1, 1, 0, 0]);
    // an overhang shows its underside corners
    expect(skin(['P....', '.###.', '.....'])[1]).toEqual([-1, 2, 0, 3, -1]);
    expect(skin(['#####', '.###.', 'P....'])[1]).toEqual([-1, 6, 1, 7, -1]);
  });

  it('uses the column piece for one-wide runs, and platform ends', () => {
    const f = skin(['P.#.', '..#.', '====', '.==.']);
    expect(f[0]![2]).toBe(15);
    expect(f[2]).toEqual([12, 13, 13, 14]);
    expect(f[3]).toEqual([-1, 12, 14, -1]);
  });

  it('maps hazards and background walls, leaves empty cells blank', () => {
    expect(skin(['P^-.'])[0]).toEqual([-1, 16, 17, -1]);
  });

  it('the plain skin keeps the test tileset indices', () => {
    const f = skinTiles(parseMap(['P^-=', '####']).tiles, PLAIN_SKIN);
    expect(f).toEqual([
      [-1, 2, 1, 3],
      [0, 0, 0, 0],
    ]);
    expect(solidFrames(PLAIN_SKIN)).toEqual([0]);
  });

  it('every stage skin draws solids with frames that collide', () => {
    for (const def of Object.values(STAGES)) {
      const frames = new Set(solidFrames(def.skin));
      const parsed = parseMap(def.map);
      const drawn = skinTiles(parsed.tiles, def.skin);
      parsed.tiles.forEach((row, r) => row.forEach((t, c) => t === 0 && expect(frames.has(drawn[r]![c]!)).toBe(true)));
    }
  });
});
