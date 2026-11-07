import { describe, expect, it } from 'vitest';
import { BOT_GUARD_FRAMES, BOT_OPEN_FRAMES, TURRET_AIM_FRAMES } from '../src/data/enemies';
import { newBot, newTurret, shieldBlocks, stepBot, stepTurret, type WalkerSense } from '../src/systems/enemyAI';
import {
  type CoreOut,
  type CoreSense,
  LASER_HIGH,
  LASER_LOW,
  newCore,
  newWall,
  stepCore,
  stepWall,
  type WallOut,
} from '../src/systems/techDebtBoss';

const FLOOR: WalkerSense = { onGround: true, wallAhead: false, floorAhead: true };

describe('Legacy Turret', () => {
  it('aims (the warning) and fires one card at Bob, then cools down', () => {
    const t = newTurret();
    t.cooldown = 0;
    const outs = Array.from({ length: TURRET_AIM_FRAMES + 60 }, () => stepTurret(t, { dx: -100, dy: 0 }));
    const fired = outs.filter((o) => o.fire);
    expect(fired).toHaveLength(1);
    expect(fired[0]!.fire!.dx).toBeCloseTo(-1);
    expect(outs[outs.findIndex((o) => o.fire) - 1]!.frame).toBe(1);
    expect(t.facing).toBe(-1);
  });

  it('ignores a Bob out of range', () => {
    const t = newTurret();
    t.cooldown = 0;
    for (let i = 0; i < 200; i++) expect(stepTurret(t, { dx: 600, dy: 0 }).fire).toBeUndefined();
  });
});

describe('Deprecated Bot', () => {
  it('walks at Bob behind its shield, which stops shots only from the front', () => {
    const b = newBot();
    const out = stepBot(b, FLOOR, { dx: 120, dy: 0 }, 26);
    expect(out).toMatchObject({ vx: 26, shielded: true });
    expect(shieldBlocks({ shielded: true, facing: 1, x: 100 }, 130)).toBe(true);
    expect(shieldBlocks({ shielded: true, facing: 1, x: 100 }, 70)).toBe(false);
    expect(shieldBlocks({ shielded: false, facing: 1, x: 100 }, 130)).toBe(false);
  });

  it('close to Bob it guards, punches, then stands open with the shield away', () => {
    const b = newBot();
    const outs = Array.from({ length: BOT_GUARD_FRAMES + 60 }, () => stepBot(b, FLOOR, { dx: 20, dy: 0 }, 26));
    expect(outs[0]).toMatchObject({ frame: 2, shielded: true });
    const punch = outs.findIndex((o) => o.frame === 3);
    expect(punch).toBe(BOT_GUARD_FRAMES);
    expect(outs[punch]!.vx).toBeGreaterThan(0);
    expect(outs.slice(punch).every((o) => !o.shielded || o.frame !== 3)).toBe(true);
    expect(outs.filter((o) => o.frame === 3 && o.vx === 0).length).toBeGreaterThanOrEqual(BOT_OPEN_FRAMES - 1);
  });
});

describe('Tech Debt, phase 1 (the wall)', () => {
  const run = (hp: number, n: number) => {
    const w = newWall();
    return Array.from({ length: n }, () => stepWall(w, hp));
  };

  it('opens a drawer before it fires a run of three cards, alternating low and high', () => {
    const outs: WallOut[] = run(1, 400);
    const firstCard = outs.findIndex((o) => o.cards);
    expect(outs[firstCard - 1]!.open.some(Boolean)).toBe(true); // the drawer was already open: the warning
    const runs = outs.filter((o) => o.cards).map((o) => o.cards![0]);
    expect(runs.slice(0, 3)).toEqual([0, 0, 0]);
    expect(runs.slice(3, 6)).toEqual([1, 1, 1]);
  });

  it('follows cards, cards, summon; the summon comes after a glare', () => {
    const outs = run(1, 600);
    const summon = outs.findIndex((o) => o.summon);
    expect(summon).toBeGreaterThan(outs.findIndex((o) => o.cards));
    expect(outs[summon - 1]!.glare).toBe(true);
  });

  it('when hurt, fires both drawers at once', () => {
    expect(run(0.2, 200).find((o) => o.cards)!.cards).toEqual([0, 1]);
  });
});

describe('Tech Debt, phase 2 (the core)', () => {
  const sense = (x: number, bobX: number, hp = 1): CoreSense => ({ x, bob: { x: bobX, y: 225 }, arenaLeft: 0, arenaRight: 480, floorY: 240, hp });

  it('fires its laser from the side Bob is not on, after charging, alternating low and high', () => {
    const c = newCore();
    let x = 240;
    const outs: CoreOut[] = [];
    for (let i = 0; i < 700; i++) {
      const o = stepCore(c, sense(x, 400));
      x += Math.sign(o.target.x - x) * Math.min(Math.abs(o.target.x - x), 1.5);
      outs.push(o);
    }
    const beams = outs.filter((o) => o.beam !== undefined);
    expect(beams.length).toBeGreaterThan(0);
    const first = outs.findIndex((o) => o.beam !== undefined);
    expect(outs[first - 1]!.frame).toBe(2); // charge first
    expect(outs[first - 1]!.target.x).toBeLessThan(240); // Bob is on the right
    const heights = [...new Set(beams.map((o) => o.beam))];
    expect(heights).toEqual([240 - LASER_LOW, 240 - LASER_HIGH]);
  });

  it('patches the three bosses in turn between lasers', () => {
    const c = newCore();
    const patches = Array.from({ length: 1500 }, () => stepCore(c, sense(240, 100)).patch).filter(Boolean);
    expect(patches.slice(0, 3)).toEqual(['goo', 'blades', 'cursors']);
  });
});
