import { describe, expect, it } from 'vitest';
import { PARTS, PART_ORDER } from '../src/data/upgrades';
import { hasPart, installPart, partCount, partEffects } from '../src/systems/upgrades';
import { newSave, parseSave, serializeSave } from '../src/systems/save';
import { parseMap, terminalPart, isFloor } from '../src/stages/map';
import { withMovers } from '../src/systems/movers';
import { STAGES } from '../src/stages/stages';
import { reached, reachable } from '../src/systems/reach';

describe('Firmware Armor', () => {
  it('keeps the base move set until its part is installed', () => {
    expect(partEffects(0)).toEqual({ airDashes: 0, plated: false, maxCharge: 2, visor: false });
    expect(partEffects(1)).toEqual({ airDashes: 0, plated: false, maxCharge: 2, visor: true });
    expect(partEffects(2)).toEqual({ airDashes: 0, plated: false, maxCharge: 3, visor: false });
    expect(partEffects(4)).toEqual({ airDashes: 0, plated: true, maxCharge: 2, visor: false });
    expect(partEffects(8)).toEqual({ airDashes: 1, plated: false, maxCharge: 2, visor: false });
  });
  it('installs each part once without losing progress or settings, and survives serialization', () => {
    let save = { ...newSave(), reduceMotion: true };
    const original = serializeSave(save);
    for (const part of PART_ORDER) {
      const previous = save;
      save = installPart(save, part) as typeof save;
      expect(hasPart(save.armor, part)).toBe(true);
      expect(installPart(save, part)).toEqual(save);
      expect(save).not.toBe(previous);
      expect(parseSave(serializeSave(save))).toEqual(save);
    }
    expect(save.armor).toBe(15);
    expect(partCount(save.armor)).toBe(4);
    expect(original).toBe(serializeSave({ ...newSave(), reduceMotion: true }));
  });
  it('places exactly one terminal for each part in its declared stage, on firm ground', () => {
    for (const part of PART_ORDER) {
      const terminals = Object.values(STAGES).flatMap(stage => {
        const map = parseMap(stage.map);
        return map.objects.filter(o => terminalPart(o.kind) === part).map(o => ({ stage, map, o }));
      });
      expect(terminals).toHaveLength(1);
      const { stage, map, o } = terminals[0]!;
      expect(stage.id).toBe(PARTS[part].stage);
      expect(isFloor(map.tiles[o.y / 16]?.[o.x / 16])).toBe(true);
    }
  });
});

// Geometry only: enemy/hazard timing is still a playthrough check.
for (const part of ['legs', 'head', 'body'] as const) {
  it(`can reach the ${part} terminal without an armor upgrade`, { timeout: 120000 }, () => {
    const stage = STAGES[PARTS[part].stage];
    const map = withMovers(parseMap(stage.map), stage.movers ?? []);
    const terminal = map.objects.find(o => terminalPart(o.kind) === part)!;
    const goal = { x: terminal.x + 8, y: terminal.y };
    expect(reached(reachable(map, { dash: true }, goal), goal)).toBe(true);
  });
}

it('requires the Turbo Boots to cross the optional Compiler Cannon route', { timeout: 120000 }, () => {
  const source = parseMap(STAGES.memoryLeak.map);
  const terminal = source.objects.find(o => terminalPart(o.kind) === 'arm')!;
  const goal = { x: terminal.x + 8, y: terminal.y };
  const map = source; // include the whole approach from the actual stage spawn
  expect(reached(reachable(map, { dash: true }, goal), goal)).toBe(false);
  expect(reached(reachable(map, { airDash: true }, goal), goal)).toBe(true);
});
