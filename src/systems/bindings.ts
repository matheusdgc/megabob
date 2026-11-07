import { ACTIONS, type Action } from './actions';

/**
 * Which physical inputs fire each action. Gameplay only ever reads actions (`ActionState`);
 * this table is data, so the controls screen (T13b) rebinds by editing it and the save keeps it.
 * Keys are Phaser `KeyCodes` names, plus `<MODIFIER>_LEFT` / `_RIGHT` (SHIFT, CTRL, ALT) for one
 * side only; pad buttons are standard-mapping indices (Xbox layout).
 */
export interface Bindings {
  keys: Record<Action, string[]>;
  pad: Record<Action, number[]>;
}

export const DEFAULT_BINDINGS: Readonly<Bindings> = {
  keys: {
    left: ['LEFT', 'A'],
    right: ['RIGHT', 'D'],
    up: ['UP', 'W'],
    down: ['DOWN', 'S'],
    jump: ['SPACE'],
    shoot: ['Z', 'L'],
    dash: ['C', 'SHIFT_LEFT'],
    prevWeapon: ['Q', 'COMMA'],
    nextWeapon: ['E', 'PERIOD'],
    pause: ['ESC', 'P'],
  },
  pad: {
    left: [14],
    right: [15],
    up: [12],
    down: [13],
    jump: [0], // A
    shoot: [2], // X
    dash: [1, 7], // B, RT
    prevWeapon: [4], // LB
    nextWeapon: [5], // RB
    pause: [9], // Start
  },
};

export type Device = keyof Bindings;
type Input<D extends Device> = Bindings[D][Action][number];

export const cloneBindings = (b: Readonly<Bindings>): Bindings => ({
  keys: Object.fromEntries(ACTIONS.map((a) => [a, [...b.keys[a]]])) as Bindings['keys'],
  pad: Object.fromEntries(ACTIONS.map((a) => [a, [...b.pad[a]]])) as Bindings['pad'],
});

/** The other action already using `input` on `device`, if any. */
export function conflictFor<D extends Device>(b: Readonly<Bindings>, device: D, action: Action, input: Input<D>): Action | null {
  for (const other of ACTIONS) {
    if (other !== action && (b[device][other] as Input<D>[]).includes(input)) return other;
  }
  return null;
}

/**
 * Bind `input` to `action` in its `slot` (0 = primary, 1 = secondary). If another action used
 * it, the two swap: that action gets this slot's old input. A rebind that would leave the
 * other action with no input at all is refused (the table comes back unchanged).
 * Returns a new table; `b` is unchanged.
 */
export function rebind<D extends Device>(b: Readonly<Bindings>, device: D, action: Action, slot: number, input: Input<D>): Bindings {
  const next = cloneBindings(b);
  const list = next[device][action] as Input<D>[];
  const old = list[slot];
  const other = conflictFor(b, device, action, input);
  if (other) {
    const theirs = next[device][other] as Input<D>[];
    const at = theirs.indexOf(input);
    if (old !== undefined && !theirs.includes(old)) theirs[at] = old;
    else if (theirs.length > 1) theirs.splice(at, 1);
    else return cloneBindings(b);
  }
  const dup = list.indexOf(input);
  if (dup >= 0 && dup !== slot) list.splice(dup, 1);
  list[Math.min(slot, list.length)] = input;
  return next;
}

/**
 * Bindings from untrusted data (a save file): unknown actions and bad values are dropped and
 * any action left with nothing falls back to its defaults, so a broken save never strands
 * the player without a jump button.
 */
export function normalizeBindings(raw: unknown): Bindings {
  const out = cloneBindings(DEFAULT_BINDINGS);
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Partial<Record<Device, unknown>>;
  for (const a of ACTIONS) {
    const keys = pickList(r.keys, a, (v): v is string => typeof v === 'string' && /^[A-Z0-9_]+$/.test(v));
    if (keys.length) out.keys[a] = keys;
    const pad = pickList(r.pad, a, (v): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < 32);
    if (pad.length) out.pad[a] = pad;
  }
  return out;
}

function pickList<T>(table: unknown, action: Action, ok: (v: unknown) => v is T): T[] {
  if (!table || typeof table !== 'object') return [];
  const list = (table as Record<string, unknown>)[action];
  return Array.isArray(list) ? [...new Set(list.filter(ok))].slice(0, 2) : [];
}

/** Keys that are never bindable: M mutes, Enter confirms menus, and the dev keys. */
export const RESERVED_KEYS: readonly string[] = ['M', 'ENTER', 'R', 'F2', 'H', 'G', 'ONE', 'TWO', 'THREE', 'FOUR'];

const KEY_LABELS: Record<string, string> = {
  SPACE: 'SPACE',
  COMMA: ',',
  PERIOD: '.',
  ESC: 'ESC',
  LEFT: '\u2190',
  RIGHT: '\u2192',
  UP: '\u2191',
  DOWN: '\u2193',
  SHIFT_LEFT: 'L-SHIFT',
  SHIFT_RIGHT: 'R-SHIFT',
  CTRL_LEFT: 'L-CTRL',
  CTRL_RIGHT: 'R-CTRL',
  ALT_LEFT: 'L-ALT',
  ALT_RIGHT: 'R-ALT',
  BACKSPACE: 'BKSP',
};

/** How a key name reads on screen. */
export const keyLabel = (name: string): string => KEY_LABELS[name] ?? name.replace(/_/g, ' ');

/** The keys of an action as an on-screen hint, e.g. "Q / ,". */
export const actionKeys = (b: Readonly<Bindings>, action: Action): string => b.keys[action].map(keyLabel).join(' / ');
