import type Phaser from 'phaser';
import { VOLUME } from '../audio/mixer';
import { REDUCE_MOTION } from '../entities/feedback';
import { BINDINGS } from '../systems/input';
import { type KeyValueStore, loadSave, newSave, type SaveData, writeSave } from '../systems/save';

/** Registry key of the live save (the source of truth for progress while the game runs). */
export const SAVE = 'save';

function storage(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null; // storage disabled (private mode, sandboxed iframe): progress lasts the session
  }
}

/** Boot: read the save and hand its settings to the systems that use them. */
export function bootSave(registry: Phaser.Data.DataManager): SaveData {
  const s = loadSave(storage());
  publish(registry, s);
  return s;
}

export const getSave = (registry: Phaser.Data.DataManager): SaveData => (registry.get(SAVE) as SaveData | undefined) ?? newSave();

/** Make `s` the live save and write it to storage (autosave on safe boundaries only). */
export function commitSave(registry: Phaser.Data.DataManager, s: SaveData): void {
  publish(registry, s);
  writeSave(storage(), s);
}

function publish(registry: Phaser.Data.DataManager, s: SaveData): void {
  registry.set(SAVE, s);
  if (s.bindings) registry.set(BINDINGS, s.bindings);
  else registry.remove(BINDINGS);
  if (s.volume) registry.set(VOLUME, s.volume);
  registry.set(REDUCE_MOTION, !!s.reduceMotion);
}
