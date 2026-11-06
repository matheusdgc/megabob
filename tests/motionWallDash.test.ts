import { describe, expect, it } from 'vitest';
import {
  AIR_DASH_FRAMES,
  DASH_FRAMES,
  DASH_MIN_FRAMES,
  DASH_SPEED,
  RUN_SPEED,
  WALL_JUMP_SPEED,
  WALL_LOCK_FRAMES,
  WALL_SLIDE_SPEED,
} from '../src/data/tuning';
import { type Action, ActionState } from '../src/systems/actions';
import { newMotion, type Sensors, stepMotion } from '../src/systems/motion';

function rig(canAirDash = false) {
  const input = new ActionState();
  const m = newMotion(canAirDash);
  const frame = (held: Action[], s: Partial<Sensors> = {}) => {
    input.update(new Set(held));
    return stepMotion(m, input, { onGround: true, vy: 0, ...s });
  };
  return { m, frame };
}

const FALLING: Partial<Sensors> = { onGround: false, vy: 150 };
const RISING: Partial<Sensors> = { onGround: false, vy: -200 };
const ON_RIGHT_WALL: Partial<Sensors> = { onGround: false, vy: 150, wallRight: true };

/** Get Bob airborne and falling (after a jump, so no coyote time). */
function airborne(frame: ReturnType<typeof rig>['frame']) {
  frame(['jump']);
  frame([], RISING);
  frame([], FALLING);
}

describe('wall slide', () => {
  it('only grabs the wall while falling and pushing into it', () => {
    const { m, frame } = rig();
    airborne(frame);
    frame([], { ...ON_RIGHT_WALL }); // touching but not pushing
    expect(m.state).toBe('fall');
    frame(['right'], ON_RIGHT_WALL);
    expect(m.state).toBe('wall');
    expect(m.facing).toBe(1);
  });

  it('does not grab while rising', () => {
    const { m, frame } = rig();
    frame(['jump']);
    frame(['jump', 'right'], { onGround: false, vy: -200, wallRight: true });
    expect(m.state).toBe('jump');
  });

  it('caps the fall speed', () => {
    const { frame } = rig();
    airborne(frame);
    frame(['right'], ON_RIGHT_WALL);
    expect(frame(['right'], { ...ON_RIGHT_WALL, vy: 300 }).vy).toBe(WALL_SLIDE_SPEED);
  });

  it('lets go when the direction is released or the wall ends', () => {
    const { m, frame } = rig();
    airborne(frame);
    frame(['right'], ON_RIGHT_WALL);
    frame([], ON_RIGHT_WALL);
    expect(m.state).toBe('fall');
    frame(['right'], ON_RIGHT_WALL);
    frame(['right'], FALLING); // wall ended
    expect(m.state).toBe('fall');
  });
});

describe('wall jump', () => {
  it('kicks up and away from the wall, ignoring input for WALL_LOCK_FRAMES', () => {
    const { m, frame } = rig();
    airborne(frame);
    frame(['right'], ON_RIGHT_WALL);
    const kick = frame(['right', 'jump'], ON_RIGHT_WALL);
    expect(kick.vy).toBe(-WALL_JUMP_SPEED);
    expect(kick.vx).toBe(-RUN_SPEED);
    expect(m.state).toBe('jump');
    for (let i = 0; i < WALL_LOCK_FRAMES; i++) {
      expect(frame(['right', 'jump'], RISING).vx).toBe(-RUN_SPEED);
    }
    expect(frame(['right', 'jump'], RISING).vx).toBe(RUN_SPEED); // control is back
  });

  it('works when pushing into a wall even before sliding', () => {
    const { frame } = rig();
    airborne(frame);
    expect(frame(['left', 'jump'], { onGround: false, vy: -50, wallLeft: true }).vx).toBe(RUN_SPEED);
  });

  it('holding dash makes a dash kick', () => {
    const { frame } = rig();
    airborne(frame);
    frame(['right'], ON_RIGHT_WALL);
    expect(frame(['right', 'jump', 'dash'], ON_RIGHT_WALL).vx).toBe(-DASH_SPEED);
  });
});

describe('ground dash', () => {
  it('moves at dash speed in the facing direction for DASH_FRAMES while held', () => {
    const { m, frame } = rig();
    expect(frame(['dash']).vx).toBe(DASH_SPEED);
    expect(m.state).toBe('dash');
    // dash frames are numbered 0..DASH_FRAMES-1; frame DASH_FRAMES ends it
    for (let i = 1; i < DASH_FRAMES; i++) frame(['dash']);
    expect(m.state).toBe('dash');
    frame(['dash']);
    expect(m.state).toBe('brake');
  });

  it('ends early on release, but not before DASH_MIN_FRAMES', () => {
    const { m, frame } = rig();
    frame(['dash']);
    frame([]);
    expect(m.state).toBe('dash');
    for (let i = 0; i < DASH_MIN_FRAMES; i++) frame([]);
    expect(m.state).toBe('brake');
  });

  it('pressing the opposite direction cancels it', () => {
    const { m, frame } = rig();
    frame(['dash']);
    const out = frame(['dash', 'left']);
    expect(m.state).toBe('run');
    expect(out.vx).toBe(-RUN_SPEED);
    expect(m.facing).toBe(-1);
  });

  it('jumping out of a dash keeps dash speed in the air until landing', () => {
    const { m, frame } = rig();
    frame(['dash', 'right']);
    expect(frame(['dash', 'right', 'jump']).vx).toBe(DASH_SPEED);
    expect(frame(['right', 'jump'], RISING).vx).toBe(DASH_SPEED);
    frame(['right'], FALLING);
    frame(['right']); // lands
    expect(m.dashMomentum).toBe(false);
    expect(frame(['right']).vx).toBe(RUN_SPEED);
  });

  it('holding dash does not re-trigger it', () => {
    const { m, frame } = rig();
    frame(['dash']);
    for (let i = 0; i < DASH_FRAMES + 10; i++) frame(['dash']);
    expect(m.state).not.toBe('dash');
  });
});

describe('air dash (Turbo Boots)', () => {
  it('is not available without the boots', () => {
    const { m, frame } = rig(false);
    airborne(frame);
    frame(['dash'], FALLING);
    expect(m.state).toBe('fall');
  });

  it('with the boots: horizontal, no gravity, once per airtime', () => {
    const { m, frame } = rig(true);
    airborne(frame);
    const out = frame(['dash'], FALLING);
    expect(m.state).toBe('airdash');
    expect(out).toMatchObject({ vx: DASH_SPEED, vy: 0, gravity: false });
    for (let i = 0; i < AIR_DASH_FRAMES; i++) frame(['dash'], FALLING);
    expect(m.state).toBe('fall');
    frame([], FALLING);
    frame(['dash'], FALLING); // second try in the same airtime
    expect(m.state).toBe('fall');
  });

  it('recharges on landing', () => {
    const { m, frame } = rig(true);
    airborne(frame);
    frame(['dash'], FALLING);
    frame([]); // lands
    frame(['jump']);
    frame([], RISING);
    frame(['dash'], FALLING);
    expect(m.state).toBe('airdash');
  });
});
