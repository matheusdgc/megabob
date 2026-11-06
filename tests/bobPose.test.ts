import { describe, expect, it } from 'vitest';
import { APEX_SPEED, TAKEOFF_FRAMES } from '../src/data/tuning';
import { bobPose } from '../src/systems/bobPose';
import { type Motion, newMotion } from '../src/systems/motion';

const at = (state: Motion['state'], stateFrames = 10): Motion => ({ ...newMotion(), state, stateFrames });

describe('bobPose', () => {
  it('loops idle and run', () => {
    expect(bobPose(at('idle'), 0)).toEqual({ anim: 'idle', loop: true });
    expect(bobPose(at('run'), 0)).toEqual({ anim: 'run', loop: true });
  });

  it('shows takeoff right after jumping, then rise / apex / fall by vertical speed', () => {
    expect(bobPose(at('jump', TAKEOFF_FRAMES - 1), -300)).toMatchObject({ anim: 'jump', frame: 0 });
    expect(bobPose(at('jump'), -300)).toMatchObject({ frame: 1 });
    expect(bobPose(at('jump'), -APEX_SPEED + 1)).toMatchObject({ frame: 2 });
    expect(bobPose(at('fall'), APEX_SPEED - 1)).toMatchObject({ frame: 2 });
    expect(bobPose(at('fall'), 300)).toMatchObject({ frame: 3 });
  });

  it('holds the landing frame', () => {
    expect(bobPose(at('land', 0), 0)).toEqual({ anim: 'jump', loop: false, frame: 4 });
  });
});
