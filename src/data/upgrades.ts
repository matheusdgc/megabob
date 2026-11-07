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
  head: { bit: 1, name: 'VISOR DE DEBUG', effect: 'Revela passagens ocultas\ne mostra a vida do chefe.', icon: 'armor_head', stage: 'nullPointer' },
  arm: { bit: 2, name: 'CANHÃO COMPILADOR', effect: 'Carrega o buster\naté um terceiro nível.', icon: 'armor_arm', stage: 'memoryLeak' },
  body: { bit: 4, name: 'BLINDAGEM FIREWALL', effect: 'Corta o dano pela metade\ne encurta o recuo.', icon: 'armor_body', stage: 'memoryLeak' },
  legs: { bit: 8, name: 'BOTAS TURBO', effect: 'Um dash no ar\na cada pulo.', icon: 'armor_legs', stage: 'raceCondition' },
};

export const PART_ORDER: readonly PartId[] = ['head', 'arm', 'body', 'legs'];
