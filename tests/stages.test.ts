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

  it('has a boss that gives a weapon', () => {
    expect(BOSS_WEAPON[def.boss]).toBeDefined();
  });
});
