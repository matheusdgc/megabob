import { describe, expect, it } from 'vitest';
import { RUNNER_REV_FRAMES, RUNNER_RUSH_SPEED, SPIKE_CHARGE_FRAMES } from '../src/data/enemies';
import { newRunner, newSpike, stepRunner, stepSpike, type WalkerSense } from '../src/systems/enemyAI';
import { newRace, RACE_CLONE_DELAYS, RACE_DASH_SPEED, type RaceOut, type RaceSense, stepRace } from '../src/systems/raceBoss';

const FLOOR: WalkerSense = { onGround: true, wallAhead: false, floorAhead: true };

describe('Thread Runner', () => {
  it('waits for Bob, revs facing him, then rushes', () => {
    const r = newRunner();
    expect(stepRunner(r, FLOOR, { dx: 400, dy: 0 }).vx).toBe(0);
    expect(stepRunner(r, FLOOR, { dx: 100, dy: 60 }).vx).toBe(0); // above it: ignored
    stepRunner(r, FLOOR, { dx: 100, dy: 0 });
    expect(r.state).toBe('rev');
    expect(r.facing).toBe(1);
    for (let i = 0; i < RUNNER_REV_FRAMES - 1; i++) expect(stepRunner(r, FLOOR, { dx: 100, dy: 0 }).vx).toBe(0);
    expect(stepRunner(r, FLOOR, { dx: 100, dy: 0 }).vx).toBe(RUNNER_RUSH_SPEED);
  });

  it('brakes at a wall or ledge, turns around and rests before the next rush', () => {
    const r = newRunner();
    r.state = 'rush';
    r.facing = 1;
    expect(stepRunner(r, { ...FLOOR, floorAhead: false }, null).vx).toBe(0);
    expect(r.state).toBe('brake');
    for (let i = 0; i < 20; i++) stepRunner(r, FLOOR, null);
    expect(r.state).toBe('idle');
    expect(r.facing).toBe(-1);
    stepRunner(r, FLOOR, { dx: -50, dy: 0 });
    expect(r.state).toBe('idle'); // still resting
  });
});

describe('Clock Spike', () => {
  it('fires once at a Bob in front of it after charging, never behind', () => {
    const k = newSpike(1);
    k.cooldown = 0;
    expect(stepSpike(k, { dx: -60, dy: 0 }).fire).toBe(false);
    expect(k.state).toBe('idle');
    const shots = [];
    for (let i = 0; i < SPIKE_CHARGE_FRAMES + 40; i++) if (stepSpike(k, { dx: 60, dy: 0 }).fire) shots.push(i);
    expect(shots).toHaveLength(1);
    expect(shots[0]).toBe(SPIKE_CHARGE_FRAMES);
  });
});

describe('Race Condition boss', () => {
  const sense = (x: number, hp = 1, bobX = 100): RaceSense => ({ x, bob: { x: bobX, y: 200 }, hand: { x, y: 190 }, arenaLeft: 0, arenaRight: 480, hp });
  const run = (r: ReturnType<typeof newRace>, frames: number, s: RaceSense) => {
    const outs: RaceOut[] = [];
    for (let i = 0; i < frames; i++) outs.push(stepRace(r, s));
    return outs;
  };

  it('warns before the dash, dashes low across, and stops at the far wall', () => {
    const r = newRace();
    const outs = run(r, 80, sense(400));
    const dashAt = outs.findIndex((o) => o.vx !== 0);
    expect(outs.slice(0, dashAt).some((o) => o.frame === 2)).toBe(true); // the crouch comes first
    expect(outs[dashAt]).toMatchObject({ vx: -RACE_DASH_SPEED, frame: 3, low: true });
    const r2 = { ...r, state: 'dash' as const, frames: 0, facing: -1 as const };
    expect(stepRace(r2, sense(20)).vx).toBe(0);
    expect(r2.state).toBe('skid');
  });

  it('follows the cycle dash, throw, dash, split', () => {
    const r = newRace();
    const order: string[] = [];
    let last = r.state;
    for (let i = 0; i < 2000 && order.length < 4; i++) {
      stepRace(r, sense(r.state === 'dash' ? (r.facing < 0 ? 0 : 480) : 240));
      if (r.state !== last && ['windup', 'throw', 'split'].includes(r.state)) order.push(r.state);
      last = r.state;
    }
    expect(order).toEqual(['windup', 'throw', 'windup', 'split']);
  });

  it('throws one blade at Bob, three when hurt', () => {
    const throwFrom = (hp: number) => {
      const r = newRace();
      r.state = 'throw';
      r.frames = 0;
      return run(r, 40, sense(300, hp, 100)).flatMap((o) => o.blades ?? []);
    };
    const one = throwFrom(1);
    expect(one).toHaveLength(1);
    expect(one[0]!.vx).toBeLessThan(0); // toward Bob, on its left
    expect(throwFrom(0.2)).toHaveLength(3);
  });

  it('splits into late copies of its next dash (more of them when hurt)', () => {
    const clonesFrom = (hp: number) => {
      const r = newRace();
      r.state = 'split';
      r.frames = 0;
      return run(r, 30, sense(300, hp)).flatMap((o) => o.clones ?? []);
    };
    expect(clonesFrom(1)).toHaveLength(RACE_CLONE_DELAYS[0]!.length);
    expect(clonesFrom(0.2)).toHaveLength(RACE_CLONE_DELAYS[1]!.length);
    expect(clonesFrom(1)[0]!.dir).toBe(-1);
  });
});
