import {
  AIR_DASH_FRAMES,
  BRAKE_FRAMES,
  COYOTE_FRAMES,
  DASH_FRAMES,
  DASH_MIN_FRAMES,
  DASH_SPEED,
  JUMP_CUT_SPEED,
  JUMP_SPEED,
  LAND_FRAMES,
  RUN_SPEED,
  WALL_JUMP_SPEED,
  WALL_LOCK_FRAMES,
  WALL_SLIDE_SPEED,
  HURT_SPEED,
} from '../data/tuning';

export type MoveState =
  | 'idle'
  | 'run'
  | 'jump'
  | 'fall'
  | 'land'
  | 'wall'
  | 'dash'
  | 'brake'
  | 'airdash'
  | 'hurt';

/** What the controller needs from input (ActionState satisfies it). */
export interface MotionInput {
  readonly horizontal: -1 | 0 | 1;
  isDown(action: 'jump' | 'dash'): boolean;
  justPressed(action: 'dash'): boolean;
  hasBufferedJump(): boolean;
  consumeJump(): boolean;
}

/** What the controller needs from physics, read after this frame's collision step. */
export interface Sensors {
  onGround: boolean;
  /** Current vertical speed, px/s (negative = up). */
  vy: number;
  /** Pressed against a wall on that side this frame. */
  wallLeft?: boolean;
  wallRight?: boolean;
}

export interface Motion {
  state: MoveState;
  facing: 1 | -1;
  /** Frames spent in the current state (0 on the frame it was entered). */
  stateFrames: number;
  /** Frames of coyote time left. */
  coyote: number;
  /** Frames left of the wall-kick push, and its direction. */
  lock: number;
  lockDir: 1 | -1;
  /** Airborne at dash speed (dash-jump, dash off a ledge, dash wall-kick). */
  dashMomentum: boolean;
  /** Air dashes allowed per airtime (1 base, 2 with the Turbo Boots) and how many were used. */
  airDashes: number;
  airDashesUsed: number;
  /** Length of the current knockback (state 'hurt'). */
  hurtFrames: number;
}

export interface MotionOutput {
  vx: number;
  /** New vertical speed, or undefined to leave physics (gravity) alone. */
  vy?: number;
  /** False while gravity must be suspended (air dash). */
  gravity: boolean;
}

export const newMotion = (airDashes = 1): Motion => ({
  state: 'idle',
  facing: 1,
  stateFrames: 0,
  coyote: 0,
  lock: 0,
  lockDir: 1,
  dashMomentum: false,
  airDashes,
  airDashesUsed: 0,
  hurtFrames: 0,
});

function enter(m: Motion, state: MoveState): void {
  if (m.state !== state) {
    m.state = state;
    m.stateFrames = 0;
  }
}

/**
 * One frame of Bob's movement. Mutates `m`, returns the velocities to apply.
 * Pure (no Phaser), so the feel rules are unit-tested.
 */
export function stepMotion(m: Motion, input: MotionInput, s: Sensors): MotionOutput {
  m.stateFrames += 1;
  if (m.state === 'hurt') return stepHurt(m, input, s);
  const h = input.horizontal;
  const wall: -1 | 0 | 1 = s.wallRight ? 1 : s.wallLeft ? -1 : 0;
  const airborne = !s.onGround;
  const dashing = m.state === 'dash' || m.state === 'airdash';

  if (s.onGround) {
    m.airDashesUsed = 0;
    m.dashMomentum = false;
  }

  // Horizontal speed: wall-kick push, dash momentum in the air, or plain running.
  const airSpeed = airborne && m.dashMomentum ? DASH_SPEED : RUN_SPEED;
  let vx: number;
  if (m.lock > 0) {
    m.lock -= 1;
    vx = m.lockDir * airSpeed;
  } else {
    vx = h * airSpeed;
    if (h !== 0 && !dashing) m.facing = h;
  }
  const out: MotionOutput = { vx, gravity: true };

  // Coyote: the first COYOTE_FRAMES airborne frames after leaving the ground still count.
  const canGroundJump = s.onGround || m.coyote > 0;
  m.coyote = s.onGround ? COYOTE_FRAMES : Math.max(0, m.coyote - 1);

  // --- jump: from the ground (or coyote time), or a kick off a wall
  if (input.hasBufferedJump()) {
    if (canGroundJump && m.state !== 'jump' && m.state !== 'airdash') {
      input.consumeJump();
      m.coyote = 0;
      m.dashMomentum = m.state === 'dash';
      enter(m, 'jump');
      out.vx = m.dashMomentum ? m.facing * DASH_SPEED : vx;
      out.vy = -JUMP_SPEED;
      return out;
    }
    if (airborne && wall !== 0 && (m.state === 'wall' || h === wall)) {
      input.consumeJump();
      m.lock = WALL_LOCK_FRAMES;
      m.lockDir = wall === 1 ? -1 : 1;
      m.dashMomentum = input.isDown('dash');
      m.airDashesUsed = 0;
      enter(m, 'jump');
      m.stateFrames = 0;
      out.vx = m.lockDir * (m.dashMomentum ? DASH_SPEED : RUN_SPEED);
      out.vy = -WALL_JUMP_SPEED;
      return out;
    }
  }

  // --- dash: on the ground, or in the air (once per airtime, twice with the Turbo Boots)
  if (input.justPressed('dash') && !dashing) {
    if (s.onGround) {
      enter(m, 'dash');
      out.vx = m.facing * DASH_SPEED;
      return out;
    }
    if (m.airDashesUsed < m.airDashes && m.state !== 'wall') {
      m.airDashesUsed += 1;
      m.lock = 0;
      enter(m, 'airdash');
      out.vx = m.facing * DASH_SPEED;
      out.vy = 0;
      out.gravity = false;
      return out;
    }
  }

  switch (m.state) {
    case 'dash': {
      out.vx = m.facing * DASH_SPEED;
      const released = !input.isDown('dash') && m.stateFrames >= DASH_MIN_FRAMES;
      if (airborne) {
        // dashed off a ledge: keep the speed while still holding forward
        m.dashMomentum = h === m.facing;
        enter(m, 'fall');
      } else if (h === -m.facing) {
        m.facing = m.facing === 1 ? -1 : 1;
        enter(m, 'run');
        out.vx = h * RUN_SPEED;
      } else if (m.stateFrames >= DASH_FRAMES || released) {
        enter(m, h !== 0 ? 'run' : 'brake');
        out.vx = h * RUN_SPEED;
      }
      break;
    }
    case 'airdash': {
      out.vx = m.facing * DASH_SPEED;
      out.vy = 0;
      out.gravity = false;
      const released = !input.isDown('dash') && m.stateFrames >= DASH_MIN_FRAMES;
      if (s.onGround) {
        enter(m, h !== 0 ? 'run' : 'land');
        out.gravity = true;
      } else if (m.stateFrames >= AIR_DASH_FRAMES || released || wall !== 0) {
        m.dashMomentum = h === m.facing;
        enter(m, 'fall');
        out.gravity = true;
      }
      break;
    }
    case 'jump':
      if (!input.isDown('jump') && s.vy < -JUMP_CUT_SPEED) out.vy = -JUMP_CUT_SPEED;
      if (m.stateFrames > 1 && s.vy >= 0) {
        if (s.onGround) land(m, h);
        else airborneFalling(m, h, wall);
      }
      break;
    case 'fall':
      if (s.onGround) land(m, h);
      else airborneFalling(m, h, wall);
      break;
    case 'wall':
      if (s.onGround) land(m, h);
      else if (wall === 0 || h !== wall) enter(m, 'fall');
      else {
        m.facing = wall;
        if (s.vy > WALL_SLIDE_SPEED) out.vy = WALL_SLIDE_SPEED;
      }
      break;
    case 'land':
    case 'brake':
      if (airborne) enter(m, 'fall');
      else if (h !== 0) enter(m, 'run');
      else if (m.stateFrames >= (m.state === 'land' ? LAND_FRAMES : BRAKE_FRAMES)) enter(m, 'idle');
      break;
    case 'idle':
    case 'run':
      if (airborne) enter(m, 'fall');
      else enter(m, h !== 0 ? 'run' : 'idle');
      break;
  }
  return out;
}

function land(m: Motion, h: number): void {
  m.lock = 0;
  enter(m, h !== 0 ? 'run' : 'land');
}

/** Falling in the air: grab a wall when pushing into it. */
function airborneFalling(m: Motion, h: number, wall: number): void {
  if (wall !== 0 && h === wall && m.lock === 0) {
    m.dashMomentum = false;
    m.airDashesUsed = 0;
    m.facing = wall as 1 | -1;
    enter(m, 'wall');
  } else {
    enter(m, 'fall');
  }
}

/**
 * Knock Bob back from a hit at horizontal position `fromX` (Bob at `x`): he turns to face the
 * source and is pushed away from it, with no control, for `frames` frames.
 */
export function startHurt(m: Motion, x: number, fromX: number, frames: number): void {
  if (fromX !== x) m.facing = fromX > x ? 1 : -1;
  m.lock = 0;
  m.dashMomentum = false;
  m.hurtFrames = frames;
  enter(m, 'hurt');
  m.stateFrames = 0;
}

function stepHurt(m: Motion, input: MotionInput, s: Sensors): MotionOutput {
  const out: MotionOutput = { vx: -m.facing * HURT_SPEED, gravity: true };
  // a jump going up when hit stops rising, so the knockback reads clearly
  if (s.vy < 0 && m.stateFrames === 1) out.vy = 0;
  if (m.stateFrames >= m.hurtFrames) {
    enter(m, s.onGround ? (input.horizontal !== 0 ? 'run' : 'idle') : 'fall');
    out.vx = input.horizontal * RUN_SPEED;
  }
  return out;
}
