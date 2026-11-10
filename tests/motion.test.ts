import { describe, expect, it } from 'vitest';
import { BOB_FALL_GRAVITY, COYOTE_FRAMES, GRAVITY, JUMP_CUT_SPEED, JUMP_SPEED, LAND_FRAMES, RUN_SPEED } from '../src/data/tuning';
import { type Action, ActionState } from '../src/systems/actions';
import { bobGravity, newMotion, type Sensors, stepMotion } from '../src/systems/motion';

/** Tiny harness: one call = one frame with these held actions and sensors. */
function rig() {
  const input = new ActionState();
  const m = newMotion();
  const frame = (held: Action[], s: Partial<Sensors> = {}) => {
    input.update(new Set(held));
    return stepMotion(m, input, { onGround: true, vy: 0, ...s });
  };
  return { m, frame };
}

const AIR_UP: Partial<Sensors> = { onGround: false, vy: -200 };
const AIR_DOWN: Partial<Sensors> = { onGround: false, vy: 100 };

describe('ground movement', () => {
  it('idle -> run while holding a direction, back to idle on release', () => {
    const { m, frame } = rig();
    expect(frame(['right']).vx).toBe(RUN_SPEED);
    expect(m.state).toBe('run');
    expect(m.facing).toBe(1);
    expect(frame(['left']).vx).toBe(-RUN_SPEED);
    expect(m.facing).toBe(-1);
    expect(frame([]).vx).toBe(0);
    expect(m.state).toBe('idle');
    expect(m.facing).toBe(-1); // keeps the last facing
  });

  it('walking off a ledge falls', () => {
    const { m, frame } = rig();
    frame(['right']);
    frame(['right'], AIR_DOWN);
    expect(m.state).toBe('fall');
  });
});

describe('jumping', () => {
  it('jump -> fall -> land -> idle', () => {
    const { m, frame } = rig();
    expect(frame(['jump']).vy).toBe(-JUMP_SPEED);
    expect(m.state).toBe('jump');
    expect(bobGravity(m.state, -JUMP_SPEED)).toBe(GRAVITY);
    frame(['jump'], AIR_UP);
    expect(m.state).toBe('jump');
    frame(['jump'], AIR_DOWN);
    expect(m.state).toBe('fall');
    expect(bobGravity(m.state, 100)).toBe(BOB_FALL_GRAVITY);
    frame([]);
    expect(m.state).toBe('land');
    expect(bobGravity(m.state, 0)).toBe(GRAVITY);
    for (let i = 0; i < LAND_FRAMES; i++) frame([]);
    expect(m.state).toBe('idle');
  });

  it('landing while running goes straight to run', () => {
    const { m, frame } = rig();
    frame(['jump']);
    frame(['jump', 'right'], AIR_UP);
    frame(['jump', 'right'], AIR_DOWN);
    frame(['right']);
    expect(m.state).toBe('run');
  });

  it('releasing jump while rising cuts the upward speed', () => {
    const { frame } = rig();
    frame(['jump']);
    expect(frame(['jump'], AIR_UP).vy).toBeUndefined(); // held: physics keeps going
    expect(frame([], AIR_UP).vy).toBe(-JUMP_CUT_SPEED);
  });

  it('does not cut when already slower than the cut speed', () => {
    const { frame } = rig();
    frame(['jump']);
    expect(frame([], { onGround: false, vy: -30 }).vy).toBeUndefined();
  });

  it('holding jump does not re-jump on landing', () => {
    const { m, frame } = rig();
    frame(['jump']);
    frame(['jump'], AIR_UP);
    frame(['jump'], AIR_DOWN);
    const out = frame(['jump']);
    expect(out.vy).toBeUndefined();
    expect(m.state).toBe('land');
  });

  it('a jump pressed just before landing triggers on landing (buffer)', () => {
    const { m, frame } = rig();
    frame(['jump']);
    frame([], AIR_UP);
    frame([], AIR_DOWN);
    frame(['jump'], AIR_DOWN); // pressed in the air, too early
    const out = frame(['jump']); // touches down
    expect(out.vy).toBe(-JUMP_SPEED);
    expect(m.state).toBe('jump');
  });
});

describe('coyote time', () => {
  it('allows a jump for a few frames after leaving a ledge', () => {
    const { m, frame } = rig();
    frame(['right']);
    for (let i = 0; i < COYOTE_FRAMES - 1; i++) frame(['right'], AIR_DOWN);
    expect(frame(['jump'], AIR_DOWN).vy).toBe(-JUMP_SPEED);
    expect(m.state).toBe('jump');
  });

  it('expires after COYOTE_FRAMES', () => {
    const { m, frame } = rig();
    frame(['right']);
    for (let i = 0; i < COYOTE_FRAMES; i++) frame(['right'], AIR_DOWN);
    expect(frame(['jump'], AIR_DOWN).vy).toBeUndefined();
    expect(m.state).toBe('fall');
  });

  it('is not granted after a jump', () => {
    const { frame } = rig();
    frame(['jump']);
    frame([], AIR_UP);
    frame([], AIR_DOWN);
    expect(frame(['jump'], AIR_DOWN).vy).toBeUndefined();
  });
});
