/**
 * Race Condition, the boss, as a pure state machine (gamedev game-ai skill: a readable warning
 * before every attack, a fixed cycle the player can learn, faster when hurt).
 *
 * Cycle: dash, throw, dash, split. A dash crosses the arena low (Bob jumps over it); a throw
 * flings clock-hand blades at Bob; a split leaves out-of-sync copies that replay the next dash
 * a few frames late, so the gap to jump through is a matter of timing. Below a third of its
 * health every warning is shorter and the throws and copies double.
 */

import { RACE_VISUAL_WALL_MARGIN as RACE_WALL_MARGIN } from '../data/tuning';

export const RACE_HP = 28;
export const RACE_CONTACT = 4;
/** Dash speed, px/s, and how close to the arena wall it stops. */
export const RACE_DASH_SPEED = 330;
export { RACE_WALL_MARGIN };
export const RACE_BLADE_SPEED = 170;
export const RACE_BLADE_DAMAGE = 3;
export const RACE_CLONE_DAMAGE = 3;
/** Frames between the boss's dash and each copy's (normal, fury). */
export const RACE_CLONE_DELAYS: readonly (readonly number[])[] = [[24], [20, 40]];

const IDLE = [44, 26];
const WINDUP = [26, 16];
const SKID = 14;
const THROW_AT = 12;
const THROW_END = 30;
const SPLIT_FRAMES = 22;
/** Blade angles off the line to Bob, radians (normal, fury). */
const SPREAD: readonly (readonly number[])[] = [[0], [-0.22, 0, 0.22]];

export type RaceState = 'idle' | 'windup' | 'dash' | 'skid' | 'throw' | 'split';
const CYCLE: readonly ('dash' | 'throw' | 'split')[] = ['dash', 'throw', 'dash', 'split'];

export interface Race {
  state: RaceState;
  frames: number;
  facing: 1 | -1;
  /** Position in CYCLE of the next attack. */
  next: number;
  fury: boolean;
}

export const newRace = (): Race => ({ state: 'idle', frames: 0, facing: -1, next: 0, fury: false });

export interface RaceSense {
  /** The boss's x and Bob's center (null while he is dead). */
  x: number;
  bob: { x: number; y: number } | null;
  /** The hand the blades leave from. */
  hand: { x: number; y: number };
  arenaLeft: number;
  arenaRight: number;
  /** Health left, 0..1. */
  hp: number;
}

export interface RaceOut {
  vx: number;
  /** Sheet frame: 0-1 idle, 2 dash start, 3 dash, 4 split, 5 throw. */
  frame: 0 | 1 | 2 | 3 | 4 | 5;
  /** Low, wide hitbox while dashing (Bob can jump it). */
  low: boolean;
  /** Blades thrown this frame: velocities. */
  blades?: { vx: number; vy: number }[];
  /** Copies to start this frame: their delays in frames and direction. */
  clones?: { delay: number; dir: 1 | -1 }[];
}

export function stepRace(r: Race, s: RaceSense): RaceOut {
  r.frames++;
  r.fury ||= s.hp <= 1 / 3;
  const f = r.fury ? 1 : 0;
  const go = (state: RaceState) => {
    r.state = state;
    r.frames = 0;
  };
  const faceBob = () => {
    if (s.bob && s.bob.x !== s.x) r.facing = s.bob.x < s.x ? -1 : 1;
  };
  const faceDash = () => {
    // Bob can wait between the visible wall and the boss's stopping point.
    if (s.x <= s.arenaLeft + RACE_WALL_MARGIN) r.facing = 1;
    else if (s.x >= s.arenaRight - RACE_WALL_MARGIN) r.facing = -1;
    else faceBob();
  };
  const idleFrame = (Math.floor(r.frames / 8) % 2) as 0 | 1;
  switch (r.state) {
    case 'idle': {
      faceBob();
      if (r.frames < IDLE[f]! || !s.bob) return { vx: 0, frame: idleFrame, low: false };
      const attack = CYCLE[r.next]!;
      r.next = (r.next + 1) % CYCLE.length;
      go(attack === 'dash' ? 'windup' : attack);
      if (attack === 'dash') faceDash();
      return { vx: 0, frame: attack === 'dash' ? 2 : attack === 'throw' ? 5 : 4, low: false };
    }
    case 'split':
      if (r.frames >= SPLIT_FRAMES) {
        faceDash();
        go('windup');
        // the copies wait at its side and take off after it
        return { vx: 0, frame: 2, low: false, clones: RACE_CLONE_DELAYS[f]!.map((delay) => ({ delay: delay + WINDUP[f]!, dir: r.facing })) };
      }
      return { vx: 0, frame: 4, low: false };
    case 'windup':
      if (r.frames >= WINDUP[f]!) {
        go('dash');
        return { vx: r.facing * RACE_DASH_SPEED, frame: 3, low: true };
      }
      return { vx: 0, frame: 2, low: false };
    case 'dash': {
      const atWall = r.facing > 0 ? s.x >= s.arenaRight - RACE_WALL_MARGIN : s.x <= s.arenaLeft + RACE_WALL_MARGIN;
      if (atWall) {
        go('skid');
        return { vx: 0, frame: 2, low: false };
      }
      return { vx: r.facing * RACE_DASH_SPEED, frame: 3, low: true };
    }
    case 'skid':
      if (r.frames >= SKID) go('idle');
      return { vx: 0, frame: 2, low: false };
    case 'throw': {
      if (r.frames === 1) faceBob();
      let blades: RaceOut['blades'];
      if (r.frames === THROW_AT && s.bob) {
        const a = Math.atan2(s.bob.y - s.hand.y, s.bob.x - s.hand.x);
        blades = SPREAD[f]!.map((d) => ({ vx: Math.cos(a + d) * RACE_BLADE_SPEED, vy: Math.sin(a + d) * RACE_BLADE_SPEED }));
      }
      if (r.frames >= THROW_END) go('idle');
      return { vx: 0, frame: 5, low: false, ...(blades && { blades }) };
    }
  }
}
