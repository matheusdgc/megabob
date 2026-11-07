import { describe, expect, it } from 'vitest';
import { BOSS_WEAPON, damageFor, WEAPON_MAX_ENERGY, WEAPONS } from '../src/data/weapons';
import { cycleWeapon, equip, grant, newArsenal, refill, spend } from '../src/systems/weapons';

describe('weaknesses', () => {
  it('the weakness weapon deals 2x', () => {
    expect(damageFor('memoryLeak', 'mutexLock', 2)).toBe(4);
    expect(damageFor('raceCondition', 'nullPointer', 2)).toBe(4);
    expect(damageFor('nullPointer', 'garbageCollector', 2)).toBe(4);
  });

  it('other weapons deal their base damage', () => {
    expect(damageFor('memoryLeak', 'buster', 1)).toBe(1);
    expect(damageFor('memoryLeak', 'garbageCollector', 2)).toBe(2);
    expect(damageFor('techDebt', 'nullPointer', 2)).toBe(2);
  });

  it('the cycle closes: every stage boss is weak to another stage boss weapon', () => {
    for (const [, weapon] of Object.entries(BOSS_WEAPON)) {
      const victims = (['memoryLeak', 'raceCondition', 'nullPointer'] as const).filter(
        (b) => damageFor(b, weapon!, 1) > 1,
      );
      expect(victims).toHaveLength(1);
    }
  });
});

describe('arsenal', () => {
  it('starts with the buster only, equipped', () => {
    const a = newArsenal();
    expect(a.owned).toEqual(['buster']);
    expect(a.current).toBe('buster');
  });

  it('cycling skips weapons not yet won and wraps both ways', () => {
    const a = newArsenal(['nullPointer', 'garbageCollector']);
    expect(a.owned).toEqual(['buster', 'garbageCollector', 'nullPointer']); // fixed order
    expect(cycleWeapon(a, 1)).toBe('garbageCollector');
    expect(cycleWeapon(a, 1)).toBe('nullPointer'); // mutexLock skipped
    expect(cycleWeapon(a, 1)).toBe('buster');
    expect(cycleWeapon(a, -1)).toBe('nullPointer');
  });

  it('with only the buster, cycling stays on it', () => {
    const a = newArsenal();
    expect(cycleWeapon(a, 1)).toBe('buster');
  });

  it('equip ignores weapons Bob does not have', () => {
    const a = newArsenal();
    equip(a, 'mutexLock');
    expect(a.current).toBe('buster');
  });

  it('grant adds a full weapon in cycle order', () => {
    const a = newArsenal(['nullPointer']);
    grant(a, 'garbageCollector');
    expect(a.owned).toEqual(['buster', 'garbageCollector', 'nullPointer']);
    expect(a.energy.garbageCollector).toBe(WEAPON_MAX_ENERGY);
  });
});

describe('energy', () => {
  it('specials spend energy per shot and refuse when too low; the buster is free', () => {
    const a = newArsenal(['garbageCollector']);
    expect(spend(a)).toBe(true); // buster
    equip(a, 'garbageCollector');
    const cost = WEAPONS.garbageCollector.cost;
    const shots = Math.floor(WEAPON_MAX_ENERGY / cost);
    for (let i = 0; i < shots; i++) expect(spend(a)).toBe(true);
    expect(a.energy.garbageCollector).toBe(WEAPON_MAX_ENERGY - shots * cost);
    expect(spend(a)).toBe(false);
  });

  it('a refill goes to the equipped special, capped at max', () => {
    const a = newArsenal(['garbageCollector']);
    equip(a, 'garbageCollector');
    for (let i = 0; i < 5; i++) spend(a);
    expect(refill(a, 4)).toBe(4);
    expect(refill(a, 100)).toBe(6);
    expect(a.energy.garbageCollector).toBe(WEAPON_MAX_ENERGY);
  });

  it('with the buster equipped, a refill goes to the first special that is not full', () => {
    const a = newArsenal(['garbageCollector', 'nullPointer']);
    equip(a, 'nullPointer');
    spend(a);
    equip(a, 'buster');
    expect(refill(a, 8)).toBe(WEAPONS.nullPointer.cost);
    expect(refill(newArsenal(), 8)).toBe(0); // nothing to fill
  });
});

describe('Mutex Lock', () => {
  it('freezes common enemies for a fixed time and bosses for less, with a re-lock cooldown', async () => {
    const { freezeFrames, MUTEX_BOSS_IMMUNE_FRAMES, MUTEX_FREEZE_FRAMES } = await import('../src/data/weapons');
    expect(freezeFrames(false)).toBe(MUTEX_FREEZE_FRAMES);
    expect(freezeFrames(true)).toBeLessThan(freezeFrames(false) / 2);
    expect(MUTEX_BOSS_IMMUNE_FRAMES).toBeGreaterThan(freezeFrames(true));
  });

  it('is the Memory Leak weakness, and Race Condition takes 2x from the Null Pointer', async () => {
    const { damageFor, WEAPONS } = await import('../src/data/weapons');
    expect(damageFor('memoryLeak', 'mutexLock', WEAPONS.mutexLock.damage)).toBe(2 * WEAPONS.mutexLock.damage);
    expect(damageFor('raceCondition', 'nullPointer', 2)).toBe(4);
    expect(damageFor('raceCondition', 'buster', 2)).toBe(2);
  });
});
