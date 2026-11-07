import type { MusicId } from '../data/music';
import type { BossId } from '../data/weapons';
import type { Section } from '../systems/camera';
import type { GooDef } from '../systems/goo';
import type { MoverDef } from '../systems/movers';
import { PLAIN_SKIN, STAGE_SKIN, type TileSkin } from './autotile';
import { MEMORY_LEAK_GOO, MEMORY_LEAK_MAP, MEMORY_LEAK_SECTIONS } from './memoryLeak';
import { NULL_POINTER_MAP, NULL_POINTER_SECTIONS } from './nullPointer';
import { TECH_DEBT_MAP, TECH_DEBT_SECTIONS } from './techDebt';
import { RACE_CONDITION_MAP, RACE_CONDITION_MOVERS, RACE_CONDITION_SECTIONS } from './raceCondition';
import { TEST_MAP, TEST_SECTIONS } from './test';

export type StageId = 'test' | 'memoryLeak' | 'raceCondition' | 'nullPointer' | 'techDebt';

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
  /** Stage music, and the boss fight's (hard cut when the door shuts). */
  readonly music: MusicId;
  readonly bossMusic: MusicId;
  /** Music of a boss's second phase, if it has one. */
  readonly bossMusic2?: MusicId;
  /** Rising goo in one section (Memory Leak). */
  readonly goo?: GooDef;
  /** Moving platforms (Race Condition). */
  readonly movers?: readonly MoverDef[];
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
    music: 'memoryLeak',
    bossMusic: 'boss',
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
    music: 'memoryLeak',
    bossMusic: 'boss',
    goo: MEMORY_LEAK_GOO,
  },
  raceCondition: {
    id: 'raceCondition',
    name: 'RACE CONDITION',
    map: RACE_CONDITION_MAP,
    sections: RACE_CONDITION_SECTIONS,
    boss: 'raceCondition',
    tileset: 'tiles_race_condition',
    skin: STAGE_SKIN,
    parallax: ['t2_race_condition_far_wide', 't2_race_condition_mid_wide', 't2_race_condition_near_wide'],
    background: '#1a0b08',
    music: 'raceCondition',
    bossMusic: 'boss',
    movers: RACE_CONDITION_MOVERS,
  },
  nullPointer: {
    id: 'nullPointer',
    name: 'NULL POINTER',
    map: NULL_POINTER_MAP,
    sections: NULL_POINTER_SECTIONS,
    boss: 'nullPointer',
    tileset: 'tiles_null_pointer',
    skin: STAGE_SKIN,
    parallax: ['t3_null_pointer_far_wide', 't3_null_pointer_mid_wide', 't3_null_pointer_near_wide'],
    background: '#0b0716',
    music: 'nullPointer',
    bossMusic: 'boss',
  },
  techDebt: {
    id: 'techDebt',
    name: 'TECH DEBT',
    map: TECH_DEBT_MAP,
    sections: TECH_DEBT_SECTIONS,
    boss: 'techDebt',
    tileset: 'tiles_tech_debt',
    skin: STAGE_SKIN,
    parallax: ['t4_tech_debt_far_wide', 't4_tech_debt_mid_wide', 't4_tech_debt_near_wide'],
    background: '#120d07',
    music: 'fortress',
    bossMusic: 'techDebt1',
    bossMusic2: 'techDebt2',
  },
};

/** Until the stage select (T13), the game starts here. */
export const DEFAULT_STAGE: StageId = 'memoryLeak';

/** The playable stage of each boss portrait on the stage select (the test map has none). */
export const STAGE_OF_BOSS: Partial<Record<BossId, StageId>> = Object.fromEntries(
  Object.values(STAGES)
    .filter((d) => d.id !== 'test')
    .map((d) => [d.boss, d.id]),
);

/** Index of the boss room: the stage's locked section. */
export function bossRoomIndex(def: StageDef): number {
  const i = def.sections.findIndex((s) => s.locked);
  if (i < 0) throw new Error(`stage ${def.id}: no locked boss room`);
  return i;
}
