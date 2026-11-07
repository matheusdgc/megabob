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
  private readonly bindings: Bindings;
  private readonly keys: [Action, Phaser.Input.Keyboard.Key][] = [];
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
        const code = codes[name];
        if (code !== undefined) this.keys.push([action, kb.addKey(code, true)]);
      }
    }
  }

  poll(): ActionState {
    this.held.clear();
    for (const [action, key] of this.keys) if (key.isDown) this.held.add(action);
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
      if (this.held.size > 0) this.held.clear();
      else this.armed = true;
    }

    this.state.update(this.held);
    return this.state;
  }
}
