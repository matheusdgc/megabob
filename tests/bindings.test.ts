import { describe, expect, it } from 'vitest';
import { ACTIONS } from '../src/systems/actions';
import { actionKeys, conflictFor, DEFAULT_BINDINGS, keyLabel, normalizeBindings, rebind } from '../src/systems/bindings';

describe('default bindings', () => {
  it('give every action a key and a pad button, with no input shared by two actions', () => {
    for (const device of ['keys', 'pad'] as const) {
      const seen = new Set<string | number>();
      for (const a of ACTIONS) {
        expect(DEFAULT_BINDINGS[device][a].length).toBeGreaterThan(0);
        for (const i of DEFAULT_BINDINGS[device][a]) {
          expect(seen.has(i)).toBe(false);
          seen.add(i);
        }
      }
    }
  });
});

describe('conflictFor', () => {
  it('names the other action using an input', () => {
    expect(conflictFor(DEFAULT_BINDINGS, 'keys', 'jump', 'Z')).toBe('shoot');
    expect(conflictFor(DEFAULT_BINDINGS, 'keys', 'jump', 'SPACE')).toBeNull();
    expect(conflictFor(DEFAULT_BINDINGS, 'pad', 'shoot', 0)).toBe('jump');
  });
});

describe('rebind', () => {
  it('sets a free input and leaves the original table alone', () => {
    const b = rebind(DEFAULT_BINDINGS, 'keys', 'shoot', 0, 'J');
    expect(b.keys.shoot).toEqual(['J', 'L']);
    expect(DEFAULT_BINDINGS.keys.shoot).toEqual(['Z', 'L']);
  });

  it('swaps with the action that already had the input', () => {
    const b = rebind(DEFAULT_BINDINGS, 'keys', 'jump', 0, 'Z');
    expect(b.keys.jump).toEqual(['Z']);
    expect(b.keys.shoot).toEqual(['SPACE', 'L']);
    const p = rebind(DEFAULT_BINDINGS, 'pad', 'jump', 0, 2);
    expect(p.pad.jump).toEqual([2]);
    expect(p.pad.shoot).toEqual([0]);
  });

  it('fills an empty secondary slot, taking a spare input from the other action', () => {
    const b = rebind(DEFAULT_BINDINGS, 'keys', 'jump', 1, 'L');
    expect(b.keys.jump).toEqual(['SPACE', 'L']);
    expect(b.keys.shoot).toEqual(['Z']);
  });

  it('refuses to strand an action with no input', () => {
    const lone = normalizeBindings({ keys: { shoot: ['Z'] } }); // shoot has only Z
    expect(rebind(lone, 'keys', 'jump', 1, 'Z')).toEqual(lone); // jump has no slot 1 to give back
  });

  it('swaps an action input into its other slot instead of duplicating it', () => {
    const b = rebind(DEFAULT_BINDINGS, 'keys', 'shoot', 1, 'Z');
    expect(b.keys.shoot).toEqual(['L', 'Z']);
  });
});

describe('key labels', () => {
  it('reads keys the way they look on the keyboard', () => {
    expect(actionKeys(DEFAULT_BINDINGS, 'prevWeapon')).toBe('Q / ,');
    expect(actionKeys(DEFAULT_BINDINGS, 'dash')).toBe('C / L-SHIFT');
    expect(keyLabel('NUMPAD_ONE')).toBe('NUMPAD ONE');
  });
});

describe('normalizeBindings', () => {
  it('returns the defaults for garbage', () => {
    expect(normalizeBindings(null)).toEqual(DEFAULT_BINDINGS);
    expect(normalizeBindings('nope')).toEqual(DEFAULT_BINDINGS);
  });

  it('keeps valid entries, drops bad ones and refills empty actions', () => {
    const b = normalizeBindings({
      keys: { jump: ['K', 'K', 42, 'bad key'], shoot: [], hack: ['X'] },
      pad: { jump: [3, -1, 1.5, 99] },
    });
    expect(b.keys.jump).toEqual(['K']);
    expect(b.keys.shoot).toEqual(['Z', 'L']);
    expect(b.pad.jump).toEqual([3]);
    expect(b.pad.dash).toEqual([1, 7]);
    expect(Object.keys(b.keys)).toEqual([...ACTIONS]);
  });
});
