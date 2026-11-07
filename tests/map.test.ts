import { describe, expect, it } from 'vitest';
import { parseMap, T } from '../src/stages/map';
import { TEST_MAP } from '../src/stages/test';

describe('parseMap', () => {
  it('maps legend characters to tile indices and finds the spawn', () => {
    const m = parseMap(['#..', '#P=', '###']);
    expect(m.cols).toBe(3);
    expect(m.rows).toBe(3);
    expect(m.tiles[0]).toEqual([T.solid, T.empty, T.empty]);
    expect(m.tiles[1]).toEqual([T.solid, T.empty, T.platform]);
    // feet at the bottom-center of the P cell (col 1, row 1)
    expect(m.spawn).toEqual({ x: 24, y: 32 });
  });

  it('rejects ragged rows, unknown characters and missing/duplicate spawns', () => {
    expect(() => parseMap(['#P#', '##'])).toThrow(/row 1/);
    expect(() => parseMap(['#P@'])).toThrow(/unknown tile/);
    expect(() => parseMap(['###'])).toThrow(/no P/);
    expect(() => parseMap(['PP'])).toThrow(/more than one P/);
  });

  it('the movement test map is valid', () => {
    const m = parseMap(TEST_MAP);
    expect(m.cols).toBe(110);
    expect(m.rows).toBe(28);
  });
});

describe('enemy markers', () => {
  it('places enemies at the bottom-center of their cell and keeps the tile to the left', () => {
    const m = parseMap(['#--d-', '#Pm-#', '#####']);
    expect(m.enemies).toEqual([
      { kind: 'spamDrone', x: 3 * 16 + 8, y: 16 },
      { kind: 'pixelMite', x: 2 * 16 + 8, y: 32 },
    ]);
    expect(m.tiles[0]![3]).toBe(T.wall);
    expect(m.tiles[1]![2]).toBe(T.empty); // left of the mite is the P cell
  });
});

describe('object markers', () => {
  it('places checkpoints and the boss door at the bottom-left of their cell', () => {
    const m = parseMap(['#P-C-B#', '#######']);
    expect(m.objects).toEqual([
      { kind: 'checkpoint', x: 48, y: 16 },
      { kind: 'bossDoor', x: 80, y: 16 },
    ]);
    expect(m.tiles[0]![3]).toBe(T.wall);
  });
});
