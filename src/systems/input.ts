import Phaser from 'phaser';
import { STICK_DEADZONE } from '../data/tuning';
import { type Action, ActionState } from './actions';
import { type Bindings, DEFAULT_BINDINGS, type Device, normalizeBindings } from './bindings';

/** Registry key holding the player's bindings (set by the controls screen, T13b). */
export const BINDINGS = 'bindings';

/**
 * Reads keyboard + first gamepad each fixed tick and feeds a shared ActionState, through the
 * player's bindings (registry `bindings`, else the defaults). Gameplay never sees a key.
 * Call `poll()` once per logic tick.
 */
export class GameInput {
  readonly state = new ActionState();
  /** Device that last sent input, for on-screen button prompts. */
  lastDevice: Device = 'keys';
  readonly bindings: Bindings;
  /** [action, key, side]: side 1 = left only, 2 = right only (modifier keys), 0 = either. */
  private readonly keys: [Action, Phaser.Input.Keyboard.Key, number][] = [];
  /** Menus: Enter (always confirms) and Backspace (always goes back), whatever the bindings. */
  private readonly menuKeys?: { enter: Phaser.Input.Keyboard.Key; back: Phaser.Input.Keyboard.Key };
  private enterWas = false;
  private backWas = false;
  /** This poll: a menu confirm / back press (edges, after the release arming). */
  confirm = false;
  back = false;
  private readonly held = new Set<Action>();
  /** Menus: false until every input has been seen released once (see the constructor). */
  private armed: boolean;

  /**
   * `menu`: ignore everything until all keys and buttons are up. A key still held from the
   * previous screen would otherwise read as a fresh press through keyboard auto-repeat, and
   * skip this screen or pick its first item.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    menu = false,
  ) {
    this.armed = !menu;
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('Keyboard plugin disabled');
    const saved: unknown = scene.registry.get(BINDINGS);
    this.bindings = saved ? normalizeBindings(saved) : DEFAULT_BINDINGS;
    const codes = Phaser.Input.Keyboard.KeyCodes as Record<string, number>;
    for (const [action, names] of Object.entries(this.bindings.keys) as [Action, string[]][]) {
      for (const name of names) {
        const side = /^(SHIFT|CTRL|ALT)_(LEFT|RIGHT)$/.exec(name);
        const code = codes[side ? side[1]! : name];
        if (code !== undefined) this.keys.push([action, kb.addKey(code, true), side ? (side[2] === 'LEFT' ? 1 : 2) : 0]);
      }
    }
    if (menu) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.menuKeys = { enter: kb.addKey(K.ENTER, true), back: kb.addKey(K.BACKSPACE, true) };
    }
  }

  poll(): ActionState {
    this.held.clear();
    for (const [action, key, side] of this.keys) if (key.isDown && (side === 0 || key.location === side)) this.held.add(action);
    const enter = !!this.menuKeys?.enter.isDown;
    const backKey = !!this.menuKeys?.back.isDown;
    const fromKeys = this.held.size > 0;

    const pad = this.scene.input.gamepad?.pad1;
    if (pad?.connected) {
      for (const [action, buttons] of Object.entries(this.bindings.pad) as [Action, number[]][]) {
        if (buttons.some((i) => pad.buttons[i]?.pressed)) this.held.add(action);
      }
      const x = pad.axes[0]?.getValue() ?? 0;
      const y = pad.axes[1]?.getValue() ?? 0;
      if (x <= -STICK_DEADZONE) this.held.add('left');
      if (x >= STICK_DEADZONE) this.held.add('right');
      if (y <= -STICK_DEADZONE) this.held.add('up');
      if (y >= STICK_DEADZONE) this.held.add('down');
      if (!fromKeys && this.held.size > 0) this.lastDevice = 'pad';
    }
    if (fromKeys) this.lastDevice = 'keys';
    if (!this.armed) {
      if (this.held.size > 0 || enter || backKey) this.held.clear();
      else this.armed = true;
    }

    this.state.update(this.held);
    // menus: confirm = jump, shoot or Enter; back = pause, dash or Backspace
    const s = this.state;
    const armed = this.armed;
    this.confirm = armed && (s.justPressed('jump') || s.justPressed('shoot') || (enter && !this.enterWas));
    this.back = armed && (s.justPressed('pause') || s.justPressed('dash') || (backKey && !this.backWas));
    this.enterWas = enter;
    this.backWas = backKey;
    return this.state;
  }
}
