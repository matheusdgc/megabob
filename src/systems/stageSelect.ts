import type { BossId } from '../data/weapons';
import { fortressUnlocked, type SaveData } from './save';

/**
 * Stage select, pure: four portraits around Bob (art/exports/stage-select-layout.json),
 * Memory Leak on top, Race Condition left, Null Pointer right, the Tech Debt fortress below.
 */
export type Slot = BossId;
export type Dir = 'up' | 'down' | 'left' | 'right';

export const SLOTS: readonly Slot[] = ['memoryLeak', 'raceCondition', 'nullPointer', 'techDebt'];

/** The slot each direction leads to: the three outer ones from anywhere, Memory Leak up. */
const BY_DIR: Record<Dir, Slot> = { up: 'memoryLeak', left: 'raceCondition', right: 'nullPointer', down: 'techDebt' };

export const moveCursor = (from: Slot, dir: Dir): Slot => (BY_DIR[dir] === from ? from : BY_DIR[dir]);

export type SlotState = 'open' | 'cleared' | 'locked' | 'soon';

/**
 * open: playable; cleared: beaten (still playable, for the parts left behind); locked: the
 * fortress before the three bosses; soon: a stage not built yet.
 */
export function slotState(save: SaveData, slot: Slot, built: (s: Slot) => boolean): SlotState {
  if (slot === 'techDebt' && !fortressUnlocked(save)) return 'locked';
  if (!built(slot)) return 'soon';
  return save.cleared.includes(slot) ? 'cleared' : 'open';
}

/** Where the cursor starts: the first playable stage not beaten yet, else the top one. */
export function firstSlot(save: SaveData, built: (s: Slot) => boolean): Slot {
  return SLOTS.find((s) => slotState(save, s, built) === 'open') ?? 'memoryLeak';
}
