import {
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
