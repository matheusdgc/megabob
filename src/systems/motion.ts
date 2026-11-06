import { COYOTE_FRAMES, JUMP_CUT_SPEED, JUMP_SPEED, LAND_FRAMES, RUN_SPEED } from '../data/tuning';

export type MoveState = 'idle' | 'run' | 'jump' | 'fall' | 'land';

/** What the controller needs from input (ActionState satisfies it). */
export interface MotionInput {
  readonly horizontal: -1 | 0 | 1;
  isDown(action: 'jump'): boolean;
  hasBufferedJump(): boolean;
  consumeJump(): boolean;
}

/** What the controller needs from physics, read after this frame's collision step. */
export interface Sensors {
  onGround: boolean;
  /** Current vertical speed, px/s (negative = up). */
  vy: number;
}

export interface Motion {
  state: MoveState;
  facing: 1 | -1;
  /** Frames spent in the current state (0 on the frame it was entered). */
  stateFrames: number;
  /** Frames of coyote time left. */
  coyote: number;
}

export interface MotionOutput {
  vx: number;
  /** New vertical speed, or undefined to leave physics (gravity) alone. */
  vy?: number;
}

export const newMotion = (): Motion => ({ state: 'idle', facing: 1, stateFrames: 0, coyote: 0 });

function enter(m: Motion, state: MoveState): void {
  if (m.state !== state) {
    m.state = state;
    m.stateFrames = 0;
  }
}

function land(m: Motion, input: MotionInput): void {
  enter(m, input.horizontal !== 0 ? 'run' : 'land');
}

/**
 * One frame of Bob's ground/air movement. Mutates `m`, returns the velocities to apply.
 * Pure (no Phaser), so the feel rules are unit-tested.
 */
export function stepMotion(m: Motion, input: MotionInput, s: Sensors): MotionOutput {
  m.stateFrames += 1;
  if (input.horizontal !== 0) m.facing = input.horizontal;
  const out: MotionOutput = { vx: input.horizontal * RUN_SPEED };

  // Coyote: the first COYOTE_FRAMES airborne frames after leaving the ground still count.
  const canJump = s.onGround || m.coyote > 0;
  m.coyote = s.onGround ? COYOTE_FRAMES : Math.max(0, m.coyote - 1);

  // Jump: on the ground, within coyote time, or a buffered press that lands now.
  if (canJump && m.state !== 'jump' && input.hasBufferedJump()) {
    input.consumeJump();
    m.coyote = 0;
    enter(m, 'jump');
    out.vy = -JUMP_SPEED;
    return out;
  }

  switch (m.state) {
    case 'jump':
      if (!input.isDown('jump') && s.vy < -JUMP_CUT_SPEED) out.vy = -JUMP_CUT_SPEED;
      if (m.stateFrames > 1 && s.vy >= 0) {
        if (s.onGround) land(m, input);
        else enter(m, 'fall');
      }
      break;
    case 'fall':
      if (s.onGround) land(m, input);
      break;
    case 'land':
      if (!s.onGround) enter(m, 'fall');
      else if (input.horizontal !== 0) enter(m, 'run');
      else if (m.stateFrames >= LAND_FRAMES) enter(m, 'idle');
      break;
    case 'idle':
    case 'run':
      if (!s.onGround) enter(m, 'fall');
      else enter(m, input.horizontal !== 0 ? 'run' : 'idle');
      break;
  }
  return out;
}
