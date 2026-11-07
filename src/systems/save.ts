import { type BossId, BOSS_WEAPON, type WeaponId } from '../data/weapons';
import { type Bindings, normalizeBindings } from './bindings';

/**
 * Progress save (gamedev save-systems skill): plain data, a version stamp from day one,
 * validated on load, a backup of the last good save, and a fresh save when nothing is usable.
 * Pure apart from the `KeyValueStore` it is handed (localStorage in the game, a fake in tests).
 */

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'megabob.save';
export const BACKUP_KEY = 'megabob.save.bak';

/** The three stage bosses; beating all of them opens the fortress. */
export const STAGE_BOSSES: readonly BossId[] = ['memoryLeak', 'raceCondition', 'nullPointer'];
const SPECIALS: readonly WeaponId[] = ['garbageCollector', 'mutexLock', 'nullPointer'];

export interface Volumes {
  master: number;
  music: number;
  sfx: number;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  /** Bosses beaten (stage order is free). */
  cleared: BossId[];
  /** Special weapons won (the buster is always owned). */
  weapons: WeaponId[];
  /** Firmware Armor bitmask: head 1, arm 2, body 4, legs 8. */
  armor: number;
  /** Rebound controls and volume sliders (T13b), when the player changed them. */
  bindings?: Bindings;
  volume?: Volumes;
}

export const newSave = (): SaveData => ({ version: SAVE_VERSION, cleared: [], weapons: [], armor: 0 });

/** Something was achieved (a boss, an armor part): the title offers Continue. */
export const hasProgress = (s: SaveData): boolean => s.cleared.length > 0 || s.armor !== 0;

export const fortressUnlocked = (s: SaveData): boolean => STAGE_BOSSES.every((b) => s.cleared.includes(b));

/** A boss beaten: recorded once, and its weapon won. Returns a new save. */
export function recordClear(s: SaveData, boss: BossId): SaveData {
  const weapon = BOSS_WEAPON[boss];
  return {
    ...s,
    cleared: s.cleared.includes(boss) ? s.cleared : [...s.cleared, boss],
    weapons: weapon && !s.weapons.includes(weapon) ? [...s.weapons, weapon] : s.weapons,
  };
}

const uniqueOf = <T extends string>(raw: unknown, allowed: readonly T[]): T[] =>
  Array.isArray(raw) ? [...new Set(raw.filter((v): v is T => allowed.includes(v as T)))] : [];

const slider = (v: unknown, fallback: number): number => (typeof v === 'number' && v >= 0 && v <= 1 ? v : fallback);

/**
 * A save from untrusted text: null when it is not a save at all (bad JSON, wrong shape, or a
 * version this build does not know). Known fields are kept and cleaned; bad values are dropped.
 */
export function parseSave(text: string | null): SaveData | null {
  if (!text) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== SAVE_VERSION) return null; // future migrations go here, version by version
  const s: SaveData = {
    version: SAVE_VERSION,
    cleared: uniqueOf(r.cleared, [...STAGE_BOSSES, 'techDebt' as BossId]),
    weapons: uniqueOf(r.weapons, SPECIALS),
    armor: Number.isInteger(r.armor) ? (r.armor as number) & 15 : 0,
  };
  if (r.bindings) s.bindings = normalizeBindings(r.bindings);
  if (r.volume && typeof r.volume === 'object') {
    const v = r.volume as Record<string, unknown>;
    s.volume = { master: slider(v.master, 0.8), music: slider(v.music, 0.7), sfx: slider(v.sfx, 0.8) };
  }
  return s;
}

export const serializeSave = (s: SaveData): string => JSON.stringify(s);

/** What the save needs from storage (window.localStorage fits). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The save, else its backup, else a fresh one. Never throws (storage may be disabled). */
export function loadSave(store: KeyValueStore | null): SaveData {
  try {
    return parseSave(store?.getItem(SAVE_KEY) ?? null) ?? parseSave(store?.getItem(BACKUP_KEY) ?? null) ?? newSave();
  } catch {
    return newSave();
  }
}

/** Write the save, keeping the previous good one as the backup. False when storage refused. */
export function writeSave(store: KeyValueStore | null, s: SaveData): boolean {
  if (!store) return false;
  try {
    const previous = store.getItem(SAVE_KEY);
    if (previous && parseSave(previous)) store.setItem(BACKUP_KEY, previous);
    store.setItem(SAVE_KEY, serializeSave(s));
    return true;
  } catch {
    return false;
  }
}
