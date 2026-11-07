import { describe, expect, it } from 'vitest';
import { parseMap, T } from '../src/stages/map';
import { MOVER_DWELL, moverBounds, slide, stepMover, withMovers } from '../src/systems/movers';

describe('moving platforms', () => {
  it('slide back and forth between their ends', () => {
    expect(slide(10, 1, 0, 32, 5)).toEqual({ x: 15, dir: 1 });
    expect(slide(30, 1, 0, 32, 5)).toEqual({ x: 32, dir: -1 });
    expect(slide(2, -1, 0, 32, 5)).toEqual({ x: 0, dir: 1 });
    expect(moverBounds({ col: 4, row: 2, range: 6, speed: 40 })).toEqual({ min: 64, max: 160 });
  });

  it('rest at each end before turning back, so boarding needs no pixel-perfect timing', () => {
    let s = { x: 28, dir: 1 as 1 | -1, wait: 0 };
    s = stepMover(s, 0, 32, 5);
    expect(s).toEqual({ x: 32, dir: -1, wait: MOVER_DWELL });
    for (let i = 0; i < MOVER_DWELL; i++) s = stepMover(s, 0, 32, 5);
    expect(s.x).toBe(32);
    expect(stepMover(s, 0, 32, 5).x).toBe(27);
  });

  it('count as platforms along their whole path for the reach check, without covering terrain', () => {
    const map = parseMap(['P.........', '......#...', '##########']);
    const m = withMovers(map, [{ col: 2, row: 1, range: 4, speed: 40 }]);
    expect(m.tiles[1]!.slice(2, 9)).toEqual([T.platform, T.platform, T.platform, T.platform, T.solid, T.platform, T.platform]);
    expect(map.tiles[1]![2]).toBe(T.empty); // the original map is untouched
  });
});
