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
  // E3 (Memory Leak): hangs from the ceiling, drops on Bob, splats and crawls. Frames: hang, fall, puddle, crawl.
  drip: { sheet: 'enemy_drip', hp: 2, contact: 3, body: [14, 18], speed: 24 },
  // E4 (Memory Leak): walks sideways, stops to lob a memory block at Bob. Frames: walk A, walk B, throw.
  heapCrab: { sheet: 'enemy_heap_crab', hp: 4, contact: 3, body: [28, 20], speed: 20 },
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

// --- Drip behaviour ---
/** Bob within this horizontal distance (and below) makes a hanging Drip let go. */
export const DRIP_SIGHT_X = 20;
/** Puddle pause after landing, before it starts crawling. */
export const DRIP_SPLAT_FRAMES = 20;
/** Puddle hitbox (w, h) once it has landed: tall enough for a standing shot (16 px up) to hit. */
export const DRIP_PUDDLE_BODY: [number, number] = [22, 14];
/** Hanging frame: the drip's top is this far below the top of its 40 px frame. */
export const DRIP_HANG_TOP = 11;

// --- Heap Crab behaviour ---
/** Bob within this horizontal distance gets a block thrown at him. */
export const CRAB_SIGHT_X = 150;
/** Wind-up (pincer raised) before the throw, then the pause after it. */
export const CRAB_WINDUP_FRAMES = 18;
export const CRAB_RECOVER_FRAMES = 16;
/** Frames between throws. */
export const CRAB_COOLDOWN_FRAMES = 100;
/** Thrown memory block: flight time to Bob's position (s), gravity, top speeds, damage. */
export const BLOCK_FLIGHT_S = 0.8;
export const BLOCK_GRAVITY = 600;
export const BLOCK_MAX_VX = 140;
export const BLOCK_MAX_VY = 320;
export const BLOCK_DAMAGE = 2;
