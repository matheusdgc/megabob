import Phaser from 'phaser';
import { STICK_DEADZONE } from '../data/tuning';
import { type Action, ActionState } from './actions';

const KEYS: Record<Action, string[]> = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  jump: ['Z', 'SPACE'],
  shoot: ['X'],
  dash: ['C', 'SHIFT'],
  prevWeapon: ['Q'],
  nextWeapon: ['E'],
  pause: ['ENTER', 'ESC'],
};

/** Standard-mapping gamepad buttons (Xbox layout names). */
const PAD_BUTTONS: Partial<Record<Action, number[]>> = {
  jump: [0], // A
  dash: [1, 7], // B, RT
  shoot: [2], // X
  prevWeapon: [4], // LB
  nextWeapon: [5], // RB
  pause: [9], // Start
  up: [12],
  down: [13],
  left: [14],
  right: [15],
};

/**
 * Reads keyboard + first gamepad each frame and feeds a shared ActionState.
 * Call `poll()` once at the start of every scene update.
 */
export class GameInput {
  readonly state = new ActionState();
  private readonly keys: [Action, Phaser.Input.Keyboard.Key][] = [];
  private readonly held = new Set<Action>();

  constructor(private readonly scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('Keyboard plugin disabled');
    for (const [action, names] of Object.entries(KEYS) as [Action, string[]][]) {
      for (const name of names) {
        const code = Phaser.Input.Keyboard.KeyCodes[name as keyof typeof Phaser.Input.Keyboard.KeyCodes];
        this.keys.push([action, kb.addKey(code, true)]);
      }
    }
  }

  poll(): ActionState {
    this.held.clear();
    for (const [action, key] of this.keys) if (key.isDown) this.held.add(action);

    const pad = this.scene.input.gamepad?.pad1;
    if (pad?.connected) {
      for (const [action, buttons] of Object.entries(PAD_BUTTONS) as [Action, number[]][]) {
        if (buttons.some((i) => pad.buttons[i]?.pressed)) this.held.add(action);
      }
      const x = pad.axes[0]?.getValue() ?? 0;
      const y = pad.axes[1]?.getValue() ?? 0;
      if (x <= -STICK_DEADZONE) this.held.add('left');
      if (x >= STICK_DEADZONE) this.held.add('right');
      if (y <= -STICK_DEADZONE) this.held.add('up');
      if (y >= STICK_DEADZONE) this.held.add('down');
    }

    this.state.update(this.held);
    return this.state;
  }
}
