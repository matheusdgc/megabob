import { describe, expect, it } from 'vitest';
import { EYE_GONE_FRAMES, EYE_HOP, EYE_IDLE_FRAMES, EYE_WIDE_FRAMES } from '../src/data/enemies';
import { damageFor } from '../src/data/weapons';
import { parseMap, T } from '../src/stages/map';
import { dangleAngle, dangleFrame, newEye, stepEye } from '../src/systems/enemyAI';
import { newNullBoss, type NullOut, type NullSense, nullSpots, stepNull, VOID_TILES, voidPatches } from '../src/systems/nullBoss';
import { VANISH_CYCLE, vanishSolid, vanishState } from '../src/systems/vanish';

describe('vanishing blocks', () => {
  it('cycle solid, flicker (still solid), gone, solid', () => {
    const states = Array.from({ length: VANISH_CYCLE }, (_, f) => vanishState(0, f));
    expect(states[0]).toBe('solid');
    expect(states.indexOf('flicker')).toBeGreaterThan(0);
    expect(states.indexOf('gone')).toBeGreaterThan(states.indexOf('flicker'));
    expect(vanishState(0, VANISH_CYCLE)).toBe('solid');
    expect(vanishSolid(0, states.indexOf('flicker'))).toBe(true);
  });

  it('runs the three groups a third of a cycle apart, so one is always there', () => {
    for (let f = 0; f < VANISH_CYCLE; f++) expect([0, 1, 2].some((g) => vanishSolid(g as 0 | 1 | 2, f))).toBe(true);
    expect(vanishState(1, VANISH_CYCLE / 3)).toBe(vanishState(0, 0));
  });

  it('are map cells 1 2 3, and the thin wall is |', () => {
    const m = parseMap(['P123|', '#####']);
    expect(m.tiles[0]!.slice(1)).toEqual([T.vanish0, T.vanish1, T.vanish2, T.thin]);
  });
});

describe('Void Eye', () => {
  it('warns with a wide eye, fires once, then is gone and untouchable before hopping near home', () => {
    const e = newEye(100, 100);
    const outs = Array.from({ length: EYE_IDLE_FRAMES + EYE_WIDE_FRAMES + 60 + EYE_GONE_FRAMES }, () => stepEye(e, { dx: 50, dy: 0 }, () => 0.25));
    const fired = outs.findIndex((o) => o.fire);
    expect(outs.filter((o) => o.fire)).toHaveLength(1);
    expect(outs[fired - 1]!.frame).toBe(1);
    expect(outs.some((o) => !o.solid && o.frame === 3)).toBe(true);
    const hop = outs.find((o) => o.moveTo)!.moveTo!;
    expect(Math.hypot(hop.x - 100, (hop.y - 100) * 2)).toBeCloseTo(EYE_HOP);
  });

  it('stays idle while Bob is far', () => {
    const e = newEye(0, 0);
    for (let i = 0; i < 300; i++) expect(stepEye(e, { dx: 500, dy: 0 }, Math.random).fire).toBe(false);
  });
});

describe('Dangling Ref', () => {
  it('swings both ways and shows the matching frame', () => {
    const angles = Array.from({ length: 120 }, (_, f) => dangleAngle(f));
    expect(Math.min(...angles)).toBeLessThan(-0.5);
    expect(Math.max(...angles)).toBeGreaterThan(0.5);
    expect([dangleFrame(-0.8), dangleFrame(0), dangleFrame(0.8)]).toEqual([0, 1, 2]);
  });
});

describe('Null Pointer boss', () => {
  let seed = 0;
  const sense = (hp = 1, x = 240): NullSense => ({ x, y: 226, bob: { x: 100, y: 225 }, arenaLeft: 0, arenaRight: 480, floorY: 240, hp, rand: () => (seed = (seed * 9301 + 49297) % 233280) / 233280 });
  const run = (b: ReturnType<typeof newNullBoss>, n: number, hp = 1) => Array.from({ length: n }, () => stepNull(b, sense(hp)));

  it('is weak to the Garbage Collector', () => {
    expect(damageFor('nullPointer', 'garbageCollector', 2)).toBe(6);
  });

  it('teleports: glitches out untouchable, hides, reappears at another spot, then fans cursors at Bob', () => {
    const b = newNullBoss();
    const outs = run(b, 160);
    const move = outs.findIndex((o) => o.moveTo);
    expect(outs.slice(0, move).some((o) => !o.visible && !o.tangible)).toBe(true);
    expect(outs[move]!.moveTo).not.toEqual(nullSpots(sense())[1]);
    const shot = outs.find((o) => o.cursors);
    expect(shot!.cursors).toHaveLength(3);
    expect(shot!.cursors!.every((c) => c.vx < 0)).toBe(true); // Bob is on its left
  });

  it('follows teleport, teleport, summon; a summon lays non-overlapping void patches', () => {
    const b = newNullBoss();
    const outs: NullOut[] = run(b, 600);
    const voids = outs.find((o) => o.voids)!.voids!;
    expect(voids).toHaveLength(3);
    for (let i = 1; i < voids.length; i++) expect(voids[i]!.x).toBeGreaterThanOrEqual(voids[i - 1]!.x + VOID_TILES * 16);
    expect(outs.filter((o) => o.moveTo).length).toBeGreaterThanOrEqual(2);
  });

  it('when hurt, comes back with two fake copies at the other spots and fires wider fans', () => {
    const b = newNullBoss();
    const outs = run(b, 160, 0.2);
    const back = outs.find((o) => o.moveTo)!;
    expect(back.decoys).toHaveLength(2);
    expect(back.decoys).not.toContainEqual(back.moveTo);
    expect(outs.find((o) => o.cursors)!.cursors).toHaveLength(5);
  });

  it('keeps void patches inside the arena', () => {
    for (let i = 0; i < 20; i++) for (const v of voidPatches({ arenaLeft: 0, arenaRight: 480, rand: Math.random }, 4)) {
      expect(v.x).toBeGreaterThanOrEqual(32);
      expect(v.x + v.w).toBeLessThanOrEqual(448);
    }
  });
});
