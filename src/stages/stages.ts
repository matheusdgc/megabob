import type { BossId } from '../data/weapons';
import type { Section } from '../systems/camera';
import { TEST_MAP, TEST_SECTIONS } from './test';

export type StageId = 'test';

/**
 * Everything a stage is, as data: the StageScene only builds what this describes, so a new
 * stage is a new entry here (plus its art), never a new scene.
 */
export interface StageDef {
  readonly id: StageId;
  readonly name: string;
  /** ASCII map, legend in `parseMap`. */
  readonly map: readonly string[];
  /** Camera sections in tiles; the last one is the boss room and must be `locked`. */
  readonly sections: readonly Section[];
  readonly boss: BossId;
  /** Tileset texture key (16x16 tiles in `T` order). */
  readonly tileset: string;
}

export const STAGES: Record<StageId, StageDef> = {
  test: {
    id: 'test',
    name: 'TEST MAP',
    map: TEST_MAP,
    sections: TEST_SECTIONS,
    boss: 'memoryLeak',
    tileset: 'tiles_test',
  },
};

export const DEFAULT_STAGE: StageId = 'test';

/** Index of the boss room: the stage's locked section. */
export function bossRoomIndex(def: StageDef): number {
  const i = def.sections.findIndex((s) => s.locked);
  if (i < 0) throw new Error(`stage ${def.id}: no locked boss room`);
  return i;
}
