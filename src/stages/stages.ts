import type { BossId } from '../data/weapons';
import type { Section } from '../systems/camera';
import type { GooDef } from '../systems/goo';
import { PLAIN_SKIN, STAGE_SKIN, type TileSkin } from './autotile';
import { MEMORY_LEAK_GOO, MEMORY_LEAK_MAP, MEMORY_LEAK_SECTIONS } from './memoryLeak';
import { TEST_MAP, TEST_SECTIONS } from './test';

export type StageId = 'test' | 'memoryLeak';

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
  /** Tileset texture key (16x16 tiles) and which of its frames draws each kind of cell. */
  readonly tileset: string;
  readonly skin: TileSkin;
  /** Parallax layers, far to near (512x270 strips that tile horizontally). */
  readonly parallax?: readonly string[];
  /** Camera background color behind everything. */
  readonly background?: string;
  /** Rising goo in one section (Memory Leak). */
  readonly goo?: GooDef;
}

export const STAGES: Record<StageId, StageDef> = {
  test: {
    id: 'test',
    name: 'TEST MAP',
    map: TEST_MAP,
    sections: TEST_SECTIONS,
    boss: 'memoryLeak',
    tileset: 'tiles_test',
    skin: PLAIN_SKIN,
  },
  memoryLeak: {
    id: 'memoryLeak',
    name: 'MEMORY LEAK',
    map: MEMORY_LEAK_MAP,
    sections: MEMORY_LEAK_SECTIONS,
    boss: 'memoryLeak',
    tileset: 'tiles_memory_leak',
    skin: STAGE_SKIN,
    parallax: ['t1_memory_leak_far_wide', 't1_memory_leak_mid_wide', 't1_memory_leak_near_wide'],
    background: '#0a1a1d',
    goo: MEMORY_LEAK_GOO,
  },
};

/** Until the stage select (T13), the game starts here. */
export const DEFAULT_STAGE: StageId = 'memoryLeak';

/** Index of the boss room: the stage's locked section. */
export function bossRoomIndex(def: StageDef): number {
  const i = def.sections.findIndex((s) => s.locked);
  if (i < 0) throw new Error(`stage ${def.id}: no locked boss room`);
  return i;
}
