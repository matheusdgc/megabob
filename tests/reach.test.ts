import { describe, expect, it } from 'vitest';
import { parseMap } from '../src/stages/map';
import { STAGES } from '../src/stages/stages';
import { withMovers } from '../src/systems/movers';
import { jumpMetrics, reachable, ReachSim } from '../src/systems/reach';

/** A 30-wide strip: floor on the bottom two rows, `gap` empty columns from column 10. */
function strip(gap: number, extra: (rows: string[][]) => void = () => {}): string[] {
  const rows = Array.from({ length: 10 }, (_, r) => Array.from({ length: 30 }, (): string => (r >= 8 ? '#' : '.')));
  for (let c = 10; c < Math.min(30, 10 + gap); c++) for (const r of [8, 9]) rows[r]![c] = '.';
  rows[7]![3] = 'P';
  extra(rows);
  return rows.map((r) => r.join(''));
}

/** Farthest a standing Bob gets before column 10, overhanging its edge by half his body. */
const EDGE = 10 * 16 + 8;
const farthest = (map: string[], opts = {}) => Math.max(...reachable(parseMap(map), opts).spots.map((s) => s.x));

describe('jumpMetrics', () => {
  it('match the level metrics in AGENTS.md (about 53 px high, 63 px far)', () => {
    const m = jumpMetrics();
    expect(m.height).toBeGreaterThanOrEqual(50);
    expect(m.height).toBeLessThanOrEqual(57);
    expect(m.distance).toBeGreaterThanOrEqual(58);
    expect(m.distance).toBeLessThanOrEqual(68);
  });
});

describe('ReachSim', () => {
  it('lands Bob back on the floor after a jump in place', () => {
    const map = parseMap(strip(0));
    const r = new ReachSim(map).play(map.spawn, (f) => (f < 30 ? ['jump'] : []));
    expect(r.spot).toEqual(map.spawn);
  });

  it('dies in a pit and on spikes', () => {
    const pit = parseMap(strip(30));
    expect(new ReachSim(pit).play(pit.spawn, (f) => (f < 200 ? ['right'] : [])).spot).toBeNull();
    const spiky = parseMap(strip(0, (rows) => (rows[7]![6] = '^')));
    expect(new ReachSim(spiky).play(spiky.spawn, (f) => (f < 60 ? ['right'] : [])).spot).toBeNull();
  });
});

describe('reachable', () => {
  it('crosses a 2-tile gap but not a 6-tile one (no dash)', () => {
    expect(farthest(strip(2))).toBeGreaterThan(12 * 16);
    expect(farthest(strip(6))).toBeLessThan(EDGE);
  });

  it('a dash-jump clears the 6-tile gap when dashing is allowed', () => {
    expect(farthest(strip(6), { dash: true })).toBeGreaterThan(16 * 16);
  });

  it('climbs a 3-tile step but not a 4-tile one', () => {
    const step = (h: number) => strip(0, (rows) => {
      for (let r = 8 - h; r < 8; r++) for (let c = 12; c < 30; c++) rows[r]![c] = '#';
    });
    expect(farthest(step(3))).toBeGreaterThan(12 * 16);
    expect(farthest(step(4))).toBeLessThan(12 * 16);
  });

  it('asks for slack: a gap Bob just clears fails with half the air control', () => {
    expect(farthest(strip(3))).toBeGreaterThan(13 * 16);
    expect(farthest(strip(3), { airControl: 0.5 })).toBeLessThan(EDGE);
  });
});

describe('conveyors', () => {
  it('carry a standing Bob along their direction', () => {
    const map = parseMap(strip(0, (rows) => {
      for (let c = 0; c < 30; c++) rows[8]![c] = '>';
    }));
    let x = map.spawn.x;
    new ReachSim(map).play(map.spawn, (f) => (f < 60 ? ['down'] : []), (feet) => (x = feet.x));
    expect(x).toBeGreaterThan(map.spawn.x + 40); // about 50 px/s for a second
  });

  it('carry a Bob who stands still off a ledge into a pit', () => {
    const map = parseMap(strip(30, (rows) => {
      for (let c = 0; c < 10; c++) rows[8]![c] = '>';
    }));
    expect(new ReachSim(map).play(map.spawn, (f) => (f < 200 ? ['down'] : [])).spot).toBeNull(); // down: hands off, nothing else
  });
});

describe.each(Object.values(STAGES))('critical path of stage $id', (def) => {
  // a full search of a stage takes seconds
  it('goes from the spawn to the boss door by plain play, with slack and no dash', { timeout: 30000 }, () => {
    // moving platforms count along their whole path (Bob can wait for them; timing is a playtest)
    expect(reachable(withMovers(parseMap(def.map), def.movers ?? []), { airControl: 0.75 }).door).toBe(true);
  });
});
