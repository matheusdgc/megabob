import type { StageId } from '../stages/stages';

/** The four Firmware Armor parts (SPEC), each a bit of the armor mask Bob's sprite and save use. */
export type PartId = 'head' | 'arm' | 'body' | 'legs';

export interface PartDef {
  bit: number;
  name: string;
  /** What it does, for the "upgrade installed" screen. */
  effect: string;
  /** 16x16 icon sheet (frame 0 collected, 1 missing). */
  icon: string;
  /** Where its Update Terminal is. */
  stage: StageId;
}

export const PARTS: Record<PartId, PartDef> = {
  head: { bit: 1, name: 'DEBUG VISOR', effect: 'Reveals hidden passages\nand shows boss health.', icon: 'armor_head', stage: 'nullPointer' },
  arm: { bit: 2, name: 'COMPILER CANNON', effect: 'Charge the buster\nto a third level.', icon: 'armor_arm', stage: 'memoryLeak' },
  body: { bit: 4, name: 'FIREWALL PLATING', effect: 'Halves the damage you take\nand shortens the knockback.', icon: 'armor_body', stage: 'memoryLeak' },
  legs: { bit: 8, name: 'TURBO BOOTS', effect: 'One dash in the air\non every jump.', icon: 'armor_legs', stage: 'raceCondition' },
};

export const PART_ORDER: readonly PartId[] = ['head', 'arm', 'body', 'legs'];
