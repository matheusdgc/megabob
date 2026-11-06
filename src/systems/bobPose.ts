import type { BobAnim } from '../data/assets';
import { APEX_SPEED, TAKEOFF_FRAMES } from '../data/tuning';
import type { Motion } from './motion';

/** Looping animation, or a single fixed frame of a sheet. */
export type BobPose = { anim: BobAnim; loop: true } | { anim: BobAnim; loop: false; frame: number };

// bob_jump frames: 0 takeoff, 1 rise, 2 apex, 3 fall, 4 land
const JUMP = { takeoff: 0, rise: 1, apex: 2, fall: 3, land: 4 } as const;

const still = (anim: BobAnim, frame: number): BobPose => ({ anim, loop: false, frame });

function airFrame(vy: number): number {
  if (vy < -APEX_SPEED) return JUMP.rise;
  if (vy > APEX_SPEED) return JUMP.fall;
  return JUMP.apex;
}

/** Which sprite pose shows Bob's current movement state. */
export function bobPose(m: Motion, vy: number): BobPose {
  switch (m.state) {
    case 'idle':
      return { anim: 'idle', loop: true };
    case 'run':
      return { anim: 'run', loop: true };
    case 'jump':
      return still('jump', m.stateFrames < TAKEOFF_FRAMES ? JUMP.takeoff : airFrame(vy));
    case 'fall':
      return still('jump', airFrame(vy));
    case 'land':
      return still('jump', JUMP.land);
  }
}

/** Frame sequences and speeds for the looping animations. */
export const BOB_LOOPS: Partial<Record<BobAnim, { frames: number[]; fps: number }>> = {
  idle: { frames: [0, 1, 0, 1, 0, 1, 0, 2], fps: 3 }, // breathe, blink now and then
  run: { frames: [0, 1, 2, 3, 4, 5], fps: 12 },
};
