import { describe, expect, it } from 'vitest';
import { FULL_ARMOR } from '../src/data/assets';
import { APEX_SPEED, DASH_START_FRAMES, TAKEOFF_FRAMES } from '../src/data/tuning';
import { bobPose, poseSheet } from '../src/systems/bobPose';
import { type Motion, newMotion } from '../src/systems/motion';

const at = (state: Motion['state'], stateFrames = 10, extra: Partial<Motion> = {}): Motion => ({
  ...newMotion(),
  state,
  stateFrames,
  ...extra,
});

describe('bobPose', () => {
  it('loops idle and run', () => {
    expect(bobPose(at('idle'), 0)).toEqual({ anim: 'idle', loop: true, facing: 1 });
    expect(bobPose(at('run', 10, { facing: -1 }), 0)).toEqual({ anim: 'run', loop: true, facing: -1 });
  });

  it('shows takeoff right after jumping, then rise / apex / fall by vertical speed', () => {
    expect(bobPose(at('jump', TAKEOFF_FRAMES - 1), -300)).toMatchObject({ anim: 'jump', frame: 0 });
    expect(bobPose(at('jump'), -300)).toMatchObject({ frame: 1 });
    expect(bobPose(at('jump'), -APEX_SPEED + 1)).toMatchObject({ frame: 2 });
    expect(bobPose(at('fall'), APEX_SPEED - 1)).toMatchObject({ frame: 2 });
    expect(bobPose(at('fall'), 300)).toMatchObject({ frame: 3 });
  });

  it('holds the landing frame', () => {
    expect(bobPose(at('land', 0), 0)).toMatchObject({ anim: 'jump', frame: 4 });
  });

  it('wall slide, and the kick frame facing the wall Bob left', () => {
    expect(bobPose(at('wall', 3, { facing: 1 }), 50)).toMatchObject({ anim: 'wall', frame: 0, facing: 1 });
    // kicked off a right wall: pushed left (lockDir -1), kick drawn facing the wall (right)
    expect(bobPose(at('jump', 1, { lock: 5, lockDir: -1, facing: -1 }), -300)).toMatchObject({
      anim: 'wall',
      frame: 2,
      facing: 1,
    });
  });

  it('dash launch, glide, brake', () => {
    expect(bobPose(at('dash', DASH_START_FRAMES - 1), 0)).toMatchObject({ anim: 'dash', frame: 0 });
    expect(bobPose(at('dash', DASH_START_FRAMES), 0)).toMatchObject({ anim: 'dash', frame: 1 });
    expect(bobPose(at('brake', 0), 0)).toMatchObject({ anim: 'dash', frame: 2 });
  });
});

describe('poseSheet', () => {
  it('maps anim + armor to the texture key', () => {
    expect(poseSheet('run', 3, 0)).toEqual({ key: 'bob_run', frame: 3 });
    expect(poseSheet('run', 3, 9)).toEqual({ key: 'bob_run_a9', frame: 3 });
  });

  it('air dash uses its own sheet only with the full armor', () => {
    expect(poseSheet('airdash', 1, FULL_ARMOR)).toEqual({ key: 'bob_airdash_a15', frame: 1 });
    expect(poseSheet('airdash', 1, 8)).toEqual({ key: 'bob_dash_a8', frame: 1 });
  });
});
