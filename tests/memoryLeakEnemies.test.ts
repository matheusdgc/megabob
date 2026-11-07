import { describe, expect, it } from 'vitest';
import {
  BLOCK_FLIGHT_S,
  BLOCK_GRAVITY,
  BLOCK_MAX_VX,
  CRAB_COOLDOWN_FRAMES,
  CRAB_RECOVER_FRAMES,
  CRAB_SIGHT_X,
  CRAB_WINDUP_FRAMES,
  DRIP_SIGHT_X,
  DRIP_SPLAT_FRAMES,
} from '../src/data/enemies';
import { lobVelocity, newCrab, newDrip, stepCrab, stepDrip, type WalkerSense } from '../src/systems/enemyAI';

const AIR: WalkerSense = { onGround: false, wallAhead: false, floorAhead: false };
const FLOOR: WalkerSense = { onGround: true, wallAhead: false, floorAhead: true };

describe('Drip', () => {
  it('hangs without gravity while Bob is away, above it or dead', () => {
    const d = newDrip();
    expect(stepDrip(d, AIR, 100, true, 24)).toEqual({ vx: 0, gravity: false, frame: 0 });
    expect(stepDrip(d, AIR, 0, false, 24).gravity).toBe(false);
    expect(stepDrip(d, AIR, null, true, 24).gravity).toBe(false);
    expect(d.state).toBe('hang');
  });

  it('lets go when Bob passes underneath, falls, then splats on landing', () => {
    const d = newDrip();
    expect(stepDrip(d, AIR, DRIP_SIGHT_X, true, 24)).toEqual({ vx: 0, gravity: true, frame: 1 });
    expect(stepDrip(d, AIR, 50, true, 24).frame).toBe(1);
    expect(stepDrip(d, FLOOR, 50, true, 24).frame).toBe(2);
    expect(d.state).toBe('splat');
  });

  it('after the splat pause crawls toward Bob, turning at ledges', () => {
    const d = newDrip();
    d.state = 'splat';
    for (let i = 0; i < DRIP_SPLAT_FRAMES - 1; i++) expect(stepDrip(d, FLOOR, 40, true, 24).vx).toBe(0);
    stepDrip(d, FLOOR, 40, true, 24);
    expect(d.state).toBe('crawl');
    expect(stepDrip(d, FLOOR, 40, true, 24).vx).toBe(24);
    expect(stepDrip(d, { ...FLOOR, floorAhead: false }, 40, true, 24).vx).toBe(-24);
  });
});

describe('lobVelocity', () => {
  it('lands the block on the target after the flight time', () => {
    const { vx, vy } = lobVelocity(64, 0);
    const t = BLOCK_FLIGHT_S;
    expect(vx * t).toBeCloseTo(64);
    expect(vy * t + 0.5 * BLOCK_GRAVITY * t * t).toBeCloseTo(0);
  });

  it('caps the speed and never throws downward', () => {
    expect(lobVelocity(-1000, 0).vx).toBe(-BLOCK_MAX_VX);
    expect(lobVelocity(10, 400).vy).toBe(0);
  });
});

describe('Heap Crab', () => {
  const ready = () => {
    const c = newCrab();
    c.cooldown = 0;
    return c;
  };

  it('patrols while Bob is out of sight, turning at walls', () => {
    const c = ready();
    expect(stepCrab(c, FLOOR, { dx: CRAB_SIGHT_X + 1, dy: 0 }, 20).vx).toBe(-20);
    expect(stepCrab(c, { ...FLOOR, wallAhead: true }, null, 20).vx).toBe(20);
  });

  it('turns to Bob, winds up, throws once, recovers and walks on', () => {
    const c = ready();
    const bob = { dx: 80, dy: 0 };
    expect(stepCrab(c, FLOOR, bob, 20)).toEqual({ vx: 0, frame: 2 });
    expect(c.facing).toBe(1);
    const throws = [];
    for (let i = 0; i < CRAB_WINDUP_FRAMES + CRAB_RECOVER_FRAMES; i++) {
      const out = stepCrab(c, FLOOR, bob, 20);
      if (out.throw) throws.push(out.throw);
    }
    expect(throws).toEqual([lobVelocity(80, 0)]);
    expect(c.state).toBe('walk');
    // cooldown: no new throw right away
    expect(stepCrab(c, FLOOR, bob, 20).vx).toBe(20);
    expect(c.cooldown).toBeGreaterThan(CRAB_COOLDOWN_FRAMES - CRAB_RECOVER_FRAMES - 3);
  });

  it('does not throw in the air', () => {
    const c = ready();
    expect(stepCrab(c, AIR, { dx: 10, dy: 0 }, 20).frame).not.toBe(2);
  });
});
