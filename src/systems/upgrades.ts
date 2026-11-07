import { AIR_DASHES, AIR_DASHES_BOOTS } from '../data/tuning';
import { PARTS, type PartId } from '../data/upgrades';
import type { SaveData } from './save';

export const hasPart = (armor: number, part: PartId): boolean => (armor & PARTS[part].bit) !== 0;

/** What a set of parts does, in one place (the player, the HUD and the stage read this). */
export interface PartEffects {
  /** Air dashes per jump. */
  airDashes: number;
  /** Damage taken is halved and the knockback is shorter. */
  plated: boolean;
  /** Highest buster charge level. */
  maxCharge: 2 | 3;
  /** Hidden passages show, and so does the boss's health as a number. */
  visor: boolean;
}

export function partEffects(armor: number): PartEffects {
  return {
    airDashes: hasPart(armor, 'legs') ? AIR_DASHES_BOOTS : AIR_DASHES,
    plated: hasPart(armor, 'body'),
    maxCharge: hasPart(armor, 'arm') ? 3 : 2,
    visor: hasPart(armor, 'head'),
  };
}

/** A part installed: the save keeps it. Returns a new save. */
export const installPart = (s: SaveData, part: PartId): SaveData => ({ ...s, armor: s.armor | PARTS[part].bit });

export const partCount = (armor: number): number => [1, 2, 4, 8].filter((b) => (armor & b) !== 0).length;
