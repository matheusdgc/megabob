import { CHARGE_FRAMES, MAX_SHOTS, SHOOT_POSE_FRAMES } from '../data/tuning';

/** 0 = basic shot, 1-2 = charged, 3 = Compiler Cannon. */
export type ShotLevel = 0 | 1 | 2 | 3;

export interface Buster {
  /** Frames the shoot button has been held since the press (0 = not charging). */
  charge: number;
  /** Frames left in the shooting pose. */
  pose: number;
}

export interface BusterInput {
  pressed: boolean;
  down: boolean;
  released: boolean;
}

export const newBuster = (): Buster => ({ charge: 0, pose: 0 });

/** Charge level reached after holding `frames`; level 3 only when `maxLevel` is 3. */
export function chargeLevel(frames: number, maxLevel: 2 | 3): ShotLevel {
  if (maxLevel === 3 && frames >= CHARGE_FRAMES[2]) return 3;
  if (frames >= CHARGE_FRAMES[1]) return 2;
  if (frames >= CHARGE_FRAMES[0]) return 1;
  return 0;
}

/**
 * One frame of Bob's buster. Pressing fires a basic shot (unless `liveShots` already hit the
 * limit) and starts charging; releasing fires the charged level reached, if any.
 * Returns the level of the shot fired this frame, or null.
 */
export function stepBuster(b: Buster, input: BusterInput, opts: { liveShots: number; maxLevel: 2 | 3 }): ShotLevel | null {
  if (b.pose > 0) b.pose--;
  let fire: ShotLevel | null = null;
  if (input.pressed) {
    if (opts.liveShots < MAX_SHOTS) fire = 0;
    b.charge = 1;
  } else if (input.down && b.charge > 0) {
    b.charge++;
  }
  if (input.released && b.charge > 0) {
    const level = chargeLevel(b.charge, opts.maxLevel);
    if (level > 0) fire = level;
    b.charge = 0;
  }
  if (fire !== null) b.pose = SHOOT_POSE_FRAMES;
  return fire;
}
