import { describe, expect, it } from 'vitest';
import { CHARGE_FRAMES, MAX_SHOTS, SHOOT_POSE_FRAMES } from '../src/data/tuning';
import { type Buster, type BusterInput, chargeLevel, newBuster, stepBuster } from '../src/systems/charge';

const PRESS: BusterInput = { pressed: true, down: true, released: false };
const HOLD: BusterInput = { pressed: false, down: true, released: false };
const RELEASE: BusterInput = { pressed: false, down: false, released: true };
const IDLE: BusterInput = { pressed: false, down: false, released: false };

const opts = (liveShots = 0, maxLevel: 2 | 3 = 2) => ({ liveShots, maxLevel });

/** Press, hold for `frames` frames in total (press included), then release. */
function holdAndRelease(b: Buster, frames: number, maxLevel: 2 | 3 = 2) {
  stepBuster(b, PRESS, opts(0, maxLevel));
  for (let i = 1; i < frames; i++) stepBuster(b, HOLD, opts(0, maxLevel));
  return stepBuster(b, RELEASE, opts(0, maxLevel));
}

describe('chargeLevel', () => {
  it('rises with the frames held', () => {
    expect(chargeLevel(0, 2)).toBe(0);
    expect(chargeLevel(CHARGE_FRAMES[0] - 1, 2)).toBe(0);
    expect(chargeLevel(CHARGE_FRAMES[0], 2)).toBe(1);
    expect(chargeLevel(CHARGE_FRAMES[1], 2)).toBe(2);
  });

  it('stops at level 2 without the Compiler Cannon', () => {
    expect(chargeLevel(CHARGE_FRAMES[2] + 100, 2)).toBe(2);
    expect(chargeLevel(CHARGE_FRAMES[2] - 1, 3)).toBe(2);
    expect(chargeLevel(CHARGE_FRAMES[2], 3)).toBe(3);
  });
});

describe('stepBuster', () => {
  it('fires a basic shot on press', () => {
    expect(stepBuster(newBuster(), PRESS, opts())).toBe(0);
  });

  it('blocks the basic shot when MAX_SHOTS are already on screen', () => {
    expect(stepBuster(newBuster(), PRESS, opts(MAX_SHOTS - 1))).toBe(0);
    expect(stepBuster(newBuster(), PRESS, opts(MAX_SHOTS))).toBeNull();
  });

  it('still charges when the basic shot was blocked', () => {
    const b = newBuster();
    stepBuster(b, PRESS, opts(MAX_SHOTS));
    for (let i = 1; i < CHARGE_FRAMES[0]; i++) stepBuster(b, HOLD, opts(MAX_SHOTS));
    expect(stepBuster(b, RELEASE, opts(MAX_SHOTS))).toBe(1);
  });

  it('a tap releases nothing extra', () => {
    expect(holdAndRelease(newBuster(), 3)).toBeNull();
  });

  it('releasing a charge fires the level reached', () => {
    expect(holdAndRelease(newBuster(), CHARGE_FRAMES[0])).toBe(1);
    expect(holdAndRelease(newBuster(), CHARGE_FRAMES[1])).toBe(2);
    expect(holdAndRelease(newBuster(), CHARGE_FRAMES[2])).toBe(2);
    expect(holdAndRelease(newBuster(), CHARGE_FRAMES[2], 3)).toBe(3);
  });

  it('resets the charge after release', () => {
    const b = newBuster();
    holdAndRelease(b, CHARGE_FRAMES[1]);
    expect(b.charge).toBe(0);
    expect(stepBuster(b, IDLE, opts())).toBeNull();
  });

  it('holds the shooting pose for a while after each shot', () => {
    const b = newBuster();
    expect(b.pose).toBe(0);
    stepBuster(b, PRESS, opts());
    expect(b.pose).toBe(SHOOT_POSE_FRAMES);
    for (let i = 0; i < SHOOT_POSE_FRAMES; i++) stepBuster(b, IDLE, opts());
    expect(b.pose).toBe(0);
  });

  it('a blocked shot does not start the shooting pose', () => {
    const b = newBuster();
    stepBuster(b, PRESS, opts(MAX_SHOTS));
    expect(b.pose).toBe(0);
  });
});
