import { JUMP_BUFFER_FRAMES } from '../data/tuning';

export const ACTIONS = [
  'left',
  'right',
  'up',
  'down',
  'jump',
  'shoot',
  'dash',
  'prevWeapon',
  'nextWeapon',
  'pause',
] as const;

export type Action = (typeof ACTIONS)[number];

/**
 * Frame-based action state. Feed it the set of physically held actions once per frame;
 * it derives "just pressed / just released" edges and the jump buffer.
 * Pure: no Phaser, so it is unit-tested directly.
 */
export class ActionState {
  private down = new Set<Action>();
  private pressed = new Set<Action>();
  private released = new Set<Action>();
  /** Frames since jump was last pressed; Infinity when no buffered jump. */
  private jumpAge = Infinity;

  update(held: ReadonlySet<Action>): void {
    this.pressed.clear();
    this.released.clear();
    for (const a of held) if (!this.down.has(a)) this.pressed.add(a);
    for (const a of this.down) if (!held.has(a)) this.released.add(a);
    this.down = new Set(held);

    if (this.pressed.has('jump')) this.jumpAge = 0;
    else if (this.jumpAge !== Infinity) this.jumpAge += 1;
  }

  isDown(a: Action): boolean {
    return this.down.has(a);
  }

  justPressed(a: Action): boolean {
    return this.pressed.has(a);
  }

  justReleased(a: Action): boolean {
    return this.released.has(a);
  }

  /** -1 (left), 0 or 1 (right). Pressing both cancels out. */
  get horizontal(): -1 | 0 | 1 {
    const l = this.down.has('left');
    const r = this.down.has('right');
    return l === r ? 0 : l ? -1 : 1;
  }

  /** True if jump was pressed within the buffer window and not yet consumed. */
  hasBufferedJump(): boolean {
    return this.jumpAge <= JUMP_BUFFER_FRAMES;
  }

  /** Use the buffered jump (so one press never triggers two jumps). */
  consumeJump(): boolean {
    if (!this.hasBufferedJump()) return false;
    this.jumpAge = Infinity;
    return true;
  }
}
