import { type BobAnim, bobKey, FULL_ARMOR } from '../data/assets';
import { APEX_SPEED, DASH_START_FRAMES, TAKEOFF_FRAMES } from '../data/tuning';
import type { Motion } from './motion';

type PoseAnim = BobAnim | 'airdash';

/** Looping animation, or a single fixed frame of a sheet; `facing` is the sprite direction. */
export type BobPose =
  | { anim: PoseAnim; loop: true; facing: 1 | -1 }
  | { anim: PoseAnim; loop: false; frame: number; facing: 1 | -1 };

// frame numbers inside each sheet (docs/art-prompts.md inventory)
const JUMP = { takeoff: 0, rise: 1, apex: 2, fall: 3, land: 4 } as const;
const DASH = { start: 0, dash: 1, stop: 2, shoot: 3 } as const;
const WALL = { slide: 0, shoot: 1, kick: 2 } as const;
const SHOOT = { stand: 0, rise: 1, fall: 2 } as const; // 3-6: running

// cannon tip relative to Bob's feet, for a sprite facing right (measured on the sheets)
const MUZZLE = { stand: { dx: 16, dy: -16 }, wall: { dx: -17, dy: -19 }, dash: { dx: 15, dy: -8 } } as const;

function airFrame(vy: number): number {
  if (vy < -APEX_SPEED) return JUMP.rise;
  if (vy > APEX_SPEED) return JUMP.fall;
  return JUMP.apex;
}

/** Which sprite pose shows Bob's current movement state (`shooting`: cannon pose). */
export function bobPose(m: Motion, vy: number, shooting = false): BobPose {
  const facing = m.facing;
  const still = (anim: PoseAnim, frame: number, f: 1 | -1 = facing): BobPose => ({
    anim,
    loop: false,
    frame,
    facing: f,
  });
  if (shooting) {
    switch (m.state) {
      case 'idle':
      case 'land':
        return still('shoot', SHOOT.stand);
      case 'run':
        return { anim: 'shoot', loop: true, facing };
      case 'jump':
        if (m.lock > 0) break; // the wall kick keeps its frame
        return still('shoot', vy < 0 ? SHOOT.rise : SHOOT.fall);
      case 'fall':
        return still('shoot', vy < 0 ? SHOOT.rise : SHOOT.fall);
      case 'wall':
        return still('wall', WALL.shoot);
      case 'dash':
      case 'brake':
        return still('dash', DASH.shoot);
      case 'airdash':
        break;
    }
  }
  switch (m.state) {
    case 'idle':
      return { anim: 'idle', loop: true, facing };
    case 'run':
      return { anim: 'run', loop: true, facing };
    case 'jump':
      // wall kick: the kick frame is drawn facing the wall Bob pushes off
      if (m.lock > 0) return still('wall', WALL.kick, m.lockDir === 1 ? -1 : 1);
      return still('jump', m.stateFrames < TAKEOFF_FRAMES ? JUMP.takeoff : airFrame(vy));
    case 'fall':
      return still('jump', airFrame(vy));
    case 'land':
      return still('jump', JUMP.land);
    case 'wall':
      return still('wall', WALL.slide);
    case 'dash':
      return still('dash', m.stateFrames < DASH_START_FRAMES ? DASH.start : DASH.dash);
    case 'brake':
      return still('dash', DASH.stop);
    case 'airdash':
      return still('airdash', m.stateFrames < DASH_START_FRAMES ? 0 : 1);
  }
}

/**
 * Texture key + frame for a pose and armor combination. The air dash is only drawn with the
 * full armor; with partial armor it borrows the ground dash glide frame.
 */
export function poseSheet(anim: PoseAnim, frame: number, armor: number): { key: string; frame: number } {
  if (anim === 'airdash') {
    return armor === FULL_ARMOR ? { key: bobKey('airdash', FULL_ARMOR), frame } : { key: bobKey('dash', armor), frame: DASH.dash };
  }
  return { key: bobKey(anim, armor), frame };
}

/**
 * Where a shot leaves the cannon, relative to Bob's feet, and its direction. On a wall Bob
 * faces the wall and fires away from it.
 */
export function shotOrigin(m: Motion): { dx: number; dy: number; dir: 1 | -1 } {
  const f = m.facing;
  const tip = m.state === 'wall' ? MUZZLE.wall : m.state === 'dash' || m.state === 'brake' ? MUZZLE.dash : MUZZLE.stand;
  return { dx: tip.dx * f, dy: tip.dy, dir: m.state === 'wall' ? (f === 1 ? -1 : 1) : f };
}

/** Frame sequences and speeds for the looping animations. */
export const BOB_LOOPS: Partial<Record<BobAnim, { frames: number[]; fps: number }>> = {
  idle: { frames: [0, 1, 0, 1, 0, 1, 0, 2], fps: 3 }, // breathe, blink now and then
  run: { frames: [0, 1, 2, 3, 4, 5], fps: 12 },
  shoot: { frames: [3, 4, 5, 6], fps: 8 }, // running shot: same 0.5 s cycle as the run
};
