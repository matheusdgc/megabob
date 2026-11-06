import {
  BLOCK_FLIGHT_S,
  BLOCK_GRAVITY,
  BLOCK_MAX_VX,
  BLOCK_MAX_VY,
  CRAB_COOLDOWN_FRAMES,
  CRAB_RECOVER_FRAMES,
  CRAB_SIGHT_X,
  CRAB_WINDUP_FRAMES,
  DRIP_SIGHT_X,
  DRIP_SPLAT_FRAMES,
  DRONE_COOLDOWN_FRAMES,
  DRONE_DIVE_FRAMES,
  DRONE_DIVE_SPEED,
  DRONE_HOVER_AMP,
  DRONE_HOVER_PERIOD,
  DRONE_RISE_SPEED,
  DRONE_SIGHT_X,
} from '../data/enemies';

// ------------------------------------------------------------------ Pixel Mite

export interface Mite {
  facing: 1 | -1;
}

/**
 * Pixel Mite: walks along the floor and turns around at a wall or a ledge.
 * `wallAhead` / `floorAhead` describe the cell just in front of its feet.
 */
export function stepMite(m: Mite, s: { onGround: boolean; wallAhead: boolean; floorAhead: boolean }, speed: number): { vx: number } {
  if (!s.onGround) return { vx: 0 };
  if (s.wallAhead || !s.floorAhead) m.facing = m.facing === 1 ? -1 : 1;
  return { vx: m.facing * speed };
}

// ------------------------------------------------------------------ Spam Drone

export type DroneState = 'hover' | 'dive' | 'rise' | 'rest';

export interface Drone {
  state: DroneState;
  frames: number;
  /** Home height (y) it hovers at and returns to. */
  homeY: number;
  /** Dive direction, normalized. */
  dirX: number;
  dirY: number;
}

export const newDrone = (homeY: number): Drone => ({ state: 'hover', frames: 0, homeY, dirX: 0, dirY: 0 });

export interface DroneOut {
  vx: number;
  vy: number;
  /** Sheet frame: 0-1 flying (alternating), 2 diving. */
  frame: 0 | 1 | 2;
  facing: 1 | -1;
}

function enter(d: Drone, state: DroneState): void {
  d.state = state;
  d.frames = 0;
}

/**
 * Spam Drone, one frame. Hovers at home height; when Bob passes below within sight it dives
 * straight at where he was, then climbs back home and rests before it can dive again.
 */
export function stepDrone(d: Drone, at: { x: number; y: number }, bob: { x: number; y: number }): DroneOut {
  d.frames++;
  const dx = bob.x - at.x;
  const facing: 1 | -1 = dx < 0 ? -1 : 1;
  const flap = (Math.floor(d.frames / 4) % 2) as 0 | 1;
  switch (d.state) {
    case 'hover': {
      if (Math.abs(dx) <= DRONE_SIGHT_X && bob.y > at.y + 8) {
        const dy = bob.y - at.y;
        const len = Math.hypot(dx, dy) || 1;
        d.dirX = dx / len;
        d.dirY = dy / len;
        enter(d, 'dive');
        return { vx: d.dirX * DRONE_DIVE_SPEED, vy: d.dirY * DRONE_DIVE_SPEED, frame: 2, facing };
      }
      // gentle sine bob around home height
      const target = d.homeY + Math.sin((d.frames / DRONE_HOVER_PERIOD) * Math.PI * 2) * DRONE_HOVER_AMP;
      return { vx: 0, vy: (target - at.y) * 4, frame: flap, facing };
    }
    case 'dive':
      if (d.frames >= DRONE_DIVE_FRAMES) enter(d, 'rise');
      return { vx: d.dirX * DRONE_DIVE_SPEED, vy: d.dirY * DRONE_DIVE_SPEED, frame: 2, facing: d.dirX < 0 ? -1 : 1 };
    case 'rise':
      if (at.y <= d.homeY) {
        enter(d, 'rest');
        return { vx: 0, vy: 0, frame: flap, facing };
      }
      return { vx: 0, vy: -DRONE_RISE_SPEED, frame: flap, facing };
    case 'rest':
      if (d.frames >= DRONE_COOLDOWN_FRAMES) enter(d, 'hover');
      return { vx: 0, vy: (d.homeY - at.y) * 4, frame: flap, facing };
  }
}

/** What a ground walker senses about the cell in front of its feet. */
export interface WalkerSense {
  onGround: boolean;
  wallAhead: boolean;
  floorAhead: boolean;
}

// ------------------------------------------------------------------ Drip

export type DripState = 'hang' | 'fall' | 'splat' | 'crawl';

export interface Drip {
  state: DripState;
  frames: number;
  facing: 1 | -1;
}

export const newDrip = (): Drip => ({ state: 'hang', frames: 0, facing: -1 });

export interface DripOut {
  vx: number;
  gravity: boolean;
  /** Sheet frame: 0 hanging, 1 falling, 2 puddle, 3 crawling (alternates with 2). */
  frame: 0 | 1 | 2 | 3;
}

/**
 * Drip, one frame. Hangs from the ceiling until Bob passes underneath, lets go, splats on
 * landing, then crawls toward where Bob was, turning at walls and ledges like a Pixel Mite.
 * `bobDx` is Bob's horizontal offset (null while he is dead); `bobBelow` that he is lower.
 */
export function stepDrip(d: Drip, s: WalkerSense, bobDx: number | null, bobBelow: boolean, speed: number): DripOut {
  d.frames++;
  const go = (state: DripState) => {
    d.state = state;
    d.frames = 0;
  };
  switch (d.state) {
    case 'hang':
      if (bobDx !== null && bobBelow && Math.abs(bobDx) <= DRIP_SIGHT_X) {
        go('fall');
        return { vx: 0, gravity: true, frame: 1 };
      }
      return { vx: 0, gravity: false, frame: 0 };
    case 'fall':
      if (s.onGround) {
        go('splat');
        return { vx: 0, gravity: true, frame: 2 };
      }
      return { vx: 0, gravity: true, frame: 1 };
    case 'splat':
      if (d.frames >= DRIP_SPLAT_FRAMES) {
        if (bobDx !== null && bobDx !== 0) d.facing = bobDx < 0 ? -1 : 1;
        go('crawl');
      }
      return { vx: 0, gravity: true, frame: 2 };
    case 'crawl': {
      const frame = Math.floor(d.frames / 8) % 2 === 0 ? 3 : 2;
      return { vx: stepMite(d, s, speed).vx, gravity: true, frame };
    }
  }
}

// ------------------------------------------------------------------ Heap Crab

export type CrabState = 'walk' | 'windup' | 'recover';

export interface Crab {
  state: CrabState;
  frames: number;
  facing: 1 | -1;
  cooldown: number;
}

export const newCrab = (): Crab => ({ state: 'walk', frames: 0, facing: -1, cooldown: CRAB_COOLDOWN_FRAMES / 2 });

export interface CrabOut {
  vx: number;
  /** Sheet frame: 0-1 walking, 2 throwing. */
  frame: 0 | 1 | 2;
  /** Set on the frame it throws: the block's launch velocity. */
  throw?: { vx: number; vy: number };
}

/** Launch velocity that lands a block (gravity BLOCK_GRAVITY) on a target dx, dy away. */
export function lobVelocity(dx: number, dy: number): { vx: number; vy: number } {
  const t = BLOCK_FLIGHT_S;
  const vx = Math.max(-BLOCK_MAX_VX, Math.min(BLOCK_MAX_VX, dx / t));
  const vy = Math.max(-BLOCK_MAX_VY, Math.min(0, dy / t - 0.5 * BLOCK_GRAVITY * t));
  return { vx, vy };
}

/**
 * Heap Crab, one frame. Patrols sideways (turning at walls and ledges); when Bob is in sight
 * and the cooldown is over, it stops, raises a pincer, lobs a memory block at him and goes on.
 * `bob` is Bob's offset from the crab's hand (null while he is dead).
 */
export function stepCrab(c: Crab, s: WalkerSense, bob: { dx: number; dy: number } | null, speed: number): CrabOut {
  c.frames++;
  if (c.cooldown > 0) c.cooldown--;
  const go = (state: CrabState) => {
    c.state = state;
    c.frames = 0;
  };
  switch (c.state) {
    case 'walk':
      if (bob && c.cooldown === 0 && s.onGround && Math.abs(bob.dx) <= CRAB_SIGHT_X) {
        if (bob.dx !== 0) c.facing = bob.dx < 0 ? -1 : 1;
        go('windup');
        return { vx: 0, frame: 2 };
      }
      return { vx: stepMite(c, s, speed).vx, frame: Math.floor(c.frames / 10) % 2 === 0 ? 0 : 1 };
    case 'windup':
      if (c.frames >= CRAB_WINDUP_FRAMES) {
        go('recover');
        c.cooldown = CRAB_COOLDOWN_FRAMES;
        return { vx: 0, frame: 2, throw: bob ? lobVelocity(bob.dx, bob.dy) : undefined };
      }
      return { vx: 0, frame: 2 };
    case 'recover':
      if (c.frames >= CRAB_RECOVER_FRAMES) go('walk');
      return { vx: 0, frame: 2 };
  }
}
