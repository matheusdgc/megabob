import type { EnemyKind } from '../stages/map';

export interface EnemyStats {
  /** Texture key (sheet from tools/art.py). */
  sheet: string;
  hp: number;
  /** Damage dealt to Bob on touch. */
  contact: number;
  /** Hitbox inside the frame, bottom-centered (w, h). */
  body: [number, number];
  /** Movement speed, px/s. */
  speed: number;
}

export const ENEMIES: Record<EnemyKind, EnemyStats> = {
  // E1: crawls along the floor, turns at walls and ledges. Frames: walk A, walk B, destroyed.
  pixelMite: { sheet: 'enemy_pixel_mite', hp: 2, contact: 2, body: [18, 16], speed: 30 }, // tall enough for a standing shot
  // E2: hovers, dives at Bob when he passes below. Frames: fly A, fly B, dive.
  spamDrone: { sheet: 'enemy_spam_drone', hp: 3, contact: 3, body: [20, 16], speed: 50 },
};

// --- Spam Drone behaviour ---
/** Bob must be within this horizontal distance and below the drone to trigger a dive. */
export const DRONE_SIGHT_X = 72;
export const DRONE_DIVE_SPEED = 150;
/** Longest dive before it gives up and climbs back. */
export const DRONE_DIVE_FRAMES = 50;
export const DRONE_RISE_SPEED = 60;
/** Rest at home height after climbing back, before it can dive again. */
export const DRONE_COOLDOWN_FRAMES = 60;
/** Hover bob amplitude (px) and period (frames). */
export const DRONE_HOVER_AMP = 3;
export const DRONE_HOVER_PERIOD = 90;

/** White flash on the frame an enemy takes damage. */
export const HIT_FLASH_FRAMES = 3;
