import { describe, expect, it } from 'vitest';
import { SPECIAL_SHOTS } from '../src/data/tuning';
import { gcMotion, nullHop, pickLockTarget, type Point, steer } from '../src/systems/specialShots';

const GC = SPECIAL_SHOTS.gc;
const NULL = SPECIAL_SHOTS.nullPointer;

describe('Garbage Collector: grows out of the cannon, then sweeps in a wave', () => {
  it('starts small and slow, and is full size and speed once it is out', () => {
    const first = gcMotion(0);
    expect(first.scale).toBeCloseTo(GC.startScale);
    expect(first.speed).toBeCloseTo(GC.launchSpeed);
    expect(first.vy).toBe(0);
    for (let f = 1; f <= GC.growFrames; f++) expect(gcMotion(f).scale).toBeGreaterThan(gcMotion(f - 1).scale);
    expect(gcMotion(GC.growFrames)).toMatchObject({ scale: 1, speed: GC.speed });
  });

  it('waves up and down by its amplitude and comes back to its line', () => {
    let y = 0;
    let min = 0;
    let max = 0;
    for (let f = 0; f < GC.growFrames + GC.wavePeriod; f++) {
      y += gcMotion(f).vy / 60;
      min = Math.min(min, y);
      max = Math.max(max, y);
    }
    expect(min).toBeCloseTo(-GC.wave, 0); // ±amplitude around the cannon's line
    expect(max).toBeCloseTo(GC.wave, 0);
    expect(gcMotion(GC.growFrames).vy).toBeLessThan(0); // rises first (screen y goes up)
    expect(Math.abs(y)).toBeLessThan(0.5);
  });
});

describe('Mutex Lock: locks onto the nearest target ahead', () => {
  const from = { x: 100, y: 100 };

  it('ignores targets behind it and out of range, and picks the nearest', () => {
    const behind = { x: 60, y: 100 };
    const far = { x: 100 + SPECIAL_SHOTS.mutex.range + 10, y: 100 };
    const near = { x: 150, y: 140 };
    const nearer = { x: 140, y: 90 };
    expect(pickLockTarget(from, 1, [behind, far])).toBeUndefined();
    expect(pickLockTarget(from, 1, [behind, far, near, nearer])).toBe(nearer);
    expect(pickLockTarget(from, -1, [behind, near])).toBe(behind);
  });

  it('turns by at most its turn rate, keeps its speed, and reaches a target off its line', () => {
    const speed = SPECIAL_SHOTS.mutex.speed;
    const v1 = steer({ x: speed, y: 0 }, from, { x: 100, y: 300 });
    expect(Math.atan2(v1.y, v1.x)).toBeCloseTo(SPECIAL_SHOTS.mutex.turn);
    expect(Math.hypot(v1.x, v1.y)).toBeCloseTo(speed);
    // fly it: a target 60 px below and 160 px ahead is hit
    const target = { x: 260, y: 160 };
    let p = { ...from };
    let v: Point = { x: speed, y: 0 };
    let closest = Infinity;
    for (let f = 0; f < 120; f++) {
      v = steer(v, p, target);
      p = { x: p.x + v.x / 60, y: p.y + v.y / 60 };
      closest = Math.min(closest, Math.hypot(p.x - target.x, p.y - target.y));
    }
    expect(closest).toBeLessThan(6);
  });
});

describe('Null Pointer: only teleports', () => {
  it('stays put between hops and averages its hop speed', () => {
    const hops = Array.from({ length: 60 }, (_, f) => nullHop(f + 1));
    expect(hops.filter((h) => h > 0)).toHaveLength(60 / NULL.hopFrames);
    expect(hops.filter((h) => h === 0)).toHaveLength(60 - 60 / NULL.hopFrames);
    expect(hops.reduce((a, b) => a + b, 0)).toBe((60 / NULL.hopFrames) * NULL.hopPx); // px per second
  });

  it('hops no farther than the gap its hitbox covers (it never skips a 12 px target)', () => {
    expect(NULL.hopPx).toBeLessThanOrEqual(24);
  });
});
