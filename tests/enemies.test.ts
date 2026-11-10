import { describe, expect, it } from 'vitest';
import { DROP_TABLE, rollDrop } from '../src/data/drops';
import { DRONE_COOLDOWN_FRAMES, DRONE_DIVE_FRAMES, DRONE_DIVE_SPEED, DRONE_RISE_SPEED, DRONE_SIGHT_X } from '../src/data/enemies';
import { newDrone, stepDrone, stepMite } from '../src/systems/enemyAI';

describe('rollDrop', () => {
  it('maps rolls to the table in order, and the rest to nothing', () => {
    // healthSmall: 0–0.24, energySmall: 0.24–0.44, healthLarge: 0.44–0.52,
    // energyLarge: 0.52–0.58, life: 0.58–0.59, rest: null
    expect(rollDrop(0)).toBe('healthSmall');
    expect(rollDrop(0.239)).toBe('healthSmall');
    expect(rollDrop(0.24)).toBe('energySmall');
    expect(rollDrop(0.44)).toBe('healthLarge');
    expect(rollDrop(0.52)).toBe('energyLarge');
    expect(rollDrop(0.581)).toBe('life');
    expect(rollDrop(0.591)).toBeNull();
    expect(rollDrop(0.999)).toBeNull();
  });

  it('the table totals well under 100%', () => {
    const total = DROP_TABLE.reduce((s, [, p]) => s + p, 0);
    expect(total).toBeLessThan(70);
  });
});

describe('Pixel Mite', () => {
  const ground = { onGround: true, wallAhead: false, floorAhead: true };

  it('walks forward on flat ground', () => {
    const m = { facing: -1 as const };
    expect(stepMite(m, ground, 30).vx).toBe(-30);
  });

  it('turns around at a wall and at a ledge', () => {
    const m = { facing: 1 as 1 | -1 };
    expect(stepMite(m, { ...ground, wallAhead: true }, 30).vx).toBe(-30);
    expect(stepMite(m, { ...ground, floorAhead: false }, 30).vx).toBe(30);
  });

  it('does not walk while falling', () => {
    expect(stepMite({ facing: 1 }, { ...ground, onGround: false }, 30).vx).toBe(0);
  });
});

describe('Spam Drone', () => {
  const home = { x: 100, y: 50 };

  it('hovers while Bob is out of sight or not below it', () => {
    const d = newDrone(50);
    expect(stepDrone(d, home, { x: 100 + DRONE_SIGHT_X + 10, y: 150 }).frame).not.toBe(2);
    expect(stepDrone(d, home, { x: 110, y: 40 }).frame).not.toBe(2);
    expect(d.state).toBe('hover');
  });

  it('dives straight at Bob when he passes below', () => {
    const d = newDrone(50);
    const out = stepDrone(d, home, { x: 160, y: 130 }); // dx 60, dy 80 -> 3:4
    expect(d.state).toBe('dive');
    expect(out.frame).toBe(2);
    expect(out.vx).toBeCloseTo(DRONE_DIVE_SPEED * 0.6);
    expect(out.vy).toBeCloseTo(DRONE_DIVE_SPEED * 0.8);
    expect(out.facing).toBe(1);
  });

  it('keeps the dive direction even if Bob moves, then climbs back and rests', () => {
    const d = newDrone(50);
    stepDrone(d, home, { x: 160, y: 130 });
    for (let i = 0; i < DRONE_DIVE_FRAMES; i++) {
      expect(stepDrone(d, { x: 120, y: 80 }, { x: 0, y: 0 }).vx).toBeCloseTo(DRONE_DIVE_SPEED * 0.6);
    }
    expect(d.state).toBe('rise');
    expect(stepDrone(d, { x: 140, y: 120 }, { x: 140, y: 150 }).vy).toBe(-DRONE_RISE_SPEED);
    stepDrone(d, { x: 140, y: 50 }, { x: 140, y: 150 });
    expect(d.state).toBe('rest');
    for (let i = 0; i < DRONE_COOLDOWN_FRAMES; i++) stepDrone(d, { x: 140, y: 50 }, { x: 140, y: 150 });
    expect(d.state).toBe('hover');
  });
});
