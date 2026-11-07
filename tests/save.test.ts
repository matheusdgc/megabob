import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS, rebind } from '../src/systems/bindings';
import {
  BACKUP_KEY,
  fortressUnlocked,
  hasProgress,
  type KeyValueStore,
  loadSave,
  newSave,
  parseSave,
  recordClear,
  SAVE_KEY,
  serializeSave,
  writeSave,
} from '../src/systems/save';

class FakeStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  fail = false;
  getItem(k: string) {
    if (this.fail) throw new Error('storage disabled');
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.fail) throw new Error('quota');
    this.data.set(k, v);
  }
}

describe('save data', () => {
  it('round-trips through text', () => {
    let s = recordClear(newSave(), 'memoryLeak');
    s = { ...s, armor: 4, bindings: rebind(DEFAULT_BINDINGS, 'keys', 'jump', 0, 'K'), volume: { master: 0.5, music: 0.2, sfx: 1 } };
    expect(parseSave(serializeSave(s))).toEqual(s);
  });

  it('records a boss once and gives its weapon once', () => {
    const s = recordClear(recordClear(newSave(), 'memoryLeak'), 'memoryLeak');
    expect(s.cleared).toEqual(['memoryLeak']);
    expect(s.weapons).toEqual(['garbageCollector']);
    expect(hasProgress(s)).toBe(true);
    expect(hasProgress(newSave())).toBe(false);
  });

  it('opens the fortress only after the three stage bosses, in any order', () => {
    let s = newSave();
    for (const b of ['nullPointer', 'memoryLeak'] as const) {
      s = recordClear(s, b);
      expect(fortressUnlocked(s)).toBe(false);
    }
    expect(fortressUnlocked(recordClear(s, 'raceCondition'))).toBe(true);
  });

  it('rejects text that is not a save, and versions it does not know', () => {
    expect(parseSave(null)).toBeNull();
    expect(parseSave('{oops')).toBeNull();
    expect(parseSave('42')).toBeNull();
    expect(parseSave(JSON.stringify({ ...newSave(), version: 2 }))).toBeNull();
    expect(parseSave(JSON.stringify({ cleared: ['memoryLeak'] }))).toBeNull(); // no version
  });

  it('cleans bad values out of a known version', () => {
    const s = parseSave(
      JSON.stringify({ version: 1, cleared: ['memoryLeak', 'memoryLeak', 'hacker', 7], weapons: ['buster', 'mutexLock'], armor: 255, volume: { master: 9, music: 0.3 } }),
    );
    expect(s).toEqual({ version: 1, cleared: ['memoryLeak'], weapons: ['mutexLock'], armor: 15, volume: { master: 0.8, music: 0.3, sfx: 0.8 } });
  });
});

describe('save storage', () => {
  it('loads a fresh save from empty or disabled storage', () => {
    expect(loadSave(new FakeStore())).toEqual(newSave());
    expect(loadSave(null)).toEqual(newSave());
    const broken = new FakeStore();
    broken.fail = true;
    expect(loadSave(broken)).toEqual(newSave());
    expect(writeSave(broken, newSave())).toBe(false);
  });

  it('writes, then keeps the previous good save as the backup', () => {
    const store = new FakeStore();
    const one = recordClear(newSave(), 'memoryLeak');
    const two = recordClear(one, 'nullPointer');
    expect(writeSave(store, one)).toBe(true);
    expect(writeSave(store, two)).toBe(true);
    expect(loadSave(store)).toEqual(two);
    expect(parseSave(store.data.get(BACKUP_KEY)!)).toEqual(one);
  });

  it('falls back to the backup when the save is corrupt', () => {
    const store = new FakeStore();
    const one = recordClear(newSave(), 'memoryLeak');
    writeSave(store, one);
    writeSave(store, recordClear(one, 'raceCondition'));
    store.data.set(SAVE_KEY, '{"version":1,"cleared":[');
    expect(loadSave(store)).toEqual(one);
    // a corrupt save never overwrites the good backup
    writeSave(store, newSave());
    expect(parseSave(store.data.get(BACKUP_KEY)!)).toEqual(one);
  });
});

describe('stage select', () => {
  const built = (s: string) => s === 'memoryLeak';

  it('moves to the slot of each direction from anywhere', async () => {
    const { moveCursor } = await import('../src/systems/stageSelect');
    expect(moveCursor('memoryLeak', 'left')).toBe('raceCondition');
    expect(moveCursor('raceCondition', 'right')).toBe('nullPointer');
    expect(moveCursor('nullPointer', 'down')).toBe('techDebt');
    expect(moveCursor('techDebt', 'up')).toBe('memoryLeak');
    expect(moveCursor('memoryLeak', 'up')).toBe('memoryLeak');
  });

  it('locks the fortress until the three bosses, marks cleared and unbuilt stages', async () => {
    const { slotState } = await import('../src/systems/stageSelect');
    const s = recordClear(newSave(), 'memoryLeak');
    expect(slotState(s, 'memoryLeak', built)).toBe('cleared');
    expect(slotState(newSave(), 'memoryLeak', built)).toBe('open');
    expect(slotState(s, 'raceCondition', built)).toBe('soon');
    expect(slotState(s, 'techDebt', () => true)).toBe('locked');
    const all = recordClear(recordClear(s, 'raceCondition'), 'nullPointer');
    expect(slotState(all, 'techDebt', () => true)).toBe('open');
  });

  it('starts on the first stage left to beat', async () => {
    const { firstSlot } = await import('../src/systems/stageSelect');
    expect(firstSlot(newSave(), () => true)).toBe('memoryLeak');
    expect(firstSlot(recordClear(newSave(), 'memoryLeak'), () => true)).toBe('raceCondition');
    expect(firstSlot(recordClear(newSave(), 'memoryLeak'), built)).toBe('memoryLeak');
  });
});
