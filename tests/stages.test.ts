import { describe, expect, it } from 'vitest';
import { BOSS_WEAPON } from '../src/data/weapons';
import { parseMap } from '../src/stages/map';
import { bossRoomIndex, STAGES } from '../src/stages/stages';
import { sectionOf, sectionsFromTiles } from '../src/systems/camera';

const TILE = 16;

describe.each(Object.values(STAGES))('stage $id', (def) => {
  const parsed = parseMap(def.map);
  const sections = sectionsFromTiles(def.sections, TILE);
  const room = bossRoomIndex(def);

  it('has exactly one locked section, the last one (the boss room)', () => {
    expect(def.sections.filter((s) => s.locked)).toHaveLength(1);
    expect(room).toBe(def.sections.length - 1);
  });

  it('keeps every section inside the map and at least one screen big (30x17 tiles)', () => {
    for (const s of def.sections) {
      expect(s.x + s.w).toBeLessThanOrEqual(parsed.cols);
      expect(s.y + s.h).toBeLessThanOrEqual(parsed.rows);
      expect(s.w).toBeGreaterThanOrEqual(30);
      expect(s.h).toBeGreaterThanOrEqual(17);
    }
  });

  it('starts Bob in a section that is not the boss room', () => {
    const i = sectionOf(sections, parsed.spawn.x, parsed.spawn.y);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).not.toBe(room);
  });

  it('puts every enemy and object inside a section, and has one boss door', () => {
    for (const e of [...parsed.enemies, ...parsed.objects]) expect(sectionOf(sections, e.x, e.y)).toBeGreaterThanOrEqual(0);
    expect(parsed.objects.filter((o) => o.kind === 'bossDoor')).toHaveLength(1);
  });

  // the user's rule: every part of a stage keeps Bob busy (the dev test map is exempt)
  it.skipIf(def.id === 'test')('has at least 4 enemies in every section before the boss room', () => {
    const counts = sections.map((_, i) => parsed.enemies.filter((e) => sectionOf(sections, e.x, e.y) === i).length);
    counts.forEach((n, i) => i !== room && expect(n, `section ${i}`).toBeGreaterThanOrEqual(4));
  });

  // gamedev level-design: a breather before the climax. The last section before the boss room
  // holds health, and no enemy waits within the last 6 tiles before the door.
  it.skipIf(def.id === 'test')('rests before the boss: health in the last section, the door left clear', () => {
    const door = parsed.objects.find((o) => o.kind === 'bossDoor')!;
    const last = room - 1;
    const health = parsed.objects.filter((o) => o.kind === 'itemHealth' && sectionOf(sections, o.x, o.y) === last);
    expect(health.length).toBeGreaterThan(0);
    const near = parsed.enemies.filter((e) => e.x < door.x && door.x - e.x <= 6 * TILE && Math.abs(e.y - door.y) <= 3 * TILE);
    expect(near).toEqual([]);
  });

  // two pendulums close together and nearly in step leave no fair window to pass
  it('keeps swinging claws at least 5 tiles apart', () => {
    const claws = parsed.enemies.filter((e) => e.kind === 'danglingRef').map((e) => e.x).sort((x, y) => x - y);
    for (let i = 1; i < claws.length; i++) expect(claws[i]! - claws[i - 1]!).toBeGreaterThanOrEqual(5 * TILE);
  });

  // the final boss gives no weapon: beating it rolls the credits
  it('has a boss that gives a weapon (except the final one)', () => {
    if (def.boss === 'techDebt') expect(BOSS_WEAPON[def.boss]).toBeUndefined();
    else expect(BOSS_WEAPON[def.boss]).toBeDefined();
  });
});
