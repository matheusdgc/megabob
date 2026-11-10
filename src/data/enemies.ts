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
  // E5 (Race Condition): revs up and rushes along the floor. Frames: roll A, roll B, brake.
  threadRunner: { sheet: 'enemy_thread_runner', hp: 3, contact: 3, body: [24, 18], speed: 210 },
  // E6 (Race Condition): wall turret that fires clock-hand spikes. Frames: idle, charging, fire.
  clockSpike: { sheet: 'enemy_clock_spike', hp: 4, contact: 2, body: [22, 22], speed: 0 },
  // E7 (Null Pointer): floats, opens its eye, shoots a cursor, blinks out and back. Frames: idle, wide, glitch, gone.
  voidEye: { sheet: 'enemy_void_eye', hp: 3, contact: 3, body: [18, 18], speed: 0 },
  // E8 (Null Pointer): a claw on a broken chain, swinging. Frames: left, center, right.
  danglingRef: { sheet: 'enemy_dangling_ref', hp: 4, contact: 3, body: [18, 16], speed: 0 },
  // E9 (Tech Debt): a stationary cannon that aims and fires punched cards. Frames: idle, aim, fire.
  legacyTurret: { sheet: 'enemy_legacy_turret', hp: 5, contact: 3, body: [30, 26], speed: 0 },
  // E10 (Tech Debt): walks behind a shield that stops basic shots, then lowers it to punch.
  // Frames: walk A, walk B, guard (wind-up), punch (shield away: open to any shot).
  deprecatedBot: { sheet: 'enemy_deprecated_bot', hp: 5, contact: 3, body: [22, 30], speed: 26 },
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

// --- Thread Runner behaviour ---
/** Bob within this horizontal distance, and about level with it, sets it off. */
export const RUNNER_SIGHT_X = 170;
export const RUNNER_SIGHT_Y = 28;
/** Revving in place before the rush (the warning), braking after it, and rest before the next. */
export const RUNNER_REV_FRAMES = 16;
export const RUNNER_BRAKE_FRAMES = 14;
export const RUNNER_REST_FRAMES = 30;
/** Rush speed, px/s. */
export const RUNNER_RUSH_SPEED = 210;

// --- Clock Spike behaviour ---
/** Bob within this horizontal distance, in front of it and about level, is shot at. */
export const SPIKE_SIGHT_X = 220;
export const SPIKE_SIGHT_Y = 40;
export const SPIKE_CHARGE_FRAMES = 30;
export const SPIKE_FIRE_FRAMES = 10;
export const SPIKE_COOLDOWN_FRAMES = 80;
export const SPIKE_SHOT_SPEED = 150;
export const SPIKE_SHOT_DAMAGE = 3;


// --- Void Eye behaviour ---
export const EYE_SIGHT = 200;
export const EYE_IDLE_FRAMES = 70;
export const EYE_WIDE_FRAMES = 22;
export const EYE_GLITCH_FRAMES = 10;
export const EYE_GONE_FRAMES = 45;
/** How far from home it may reappear, px. */
export const EYE_HOP = 56;
/** It never reappears closer than this to Bob, px (a contact hit needs a warning first). */
export const EYE_SAFE = 48;
export const CURSOR_SPEED = 140;
export const CURSOR_DAMAGE = 3;

// --- Dangling Ref behaviour ---
/** Swing amplitude (radians), period (frames) and chain length (px). */
export const DANGLE_AMP = 0.9;
export const DANGLE_PERIOD = 110;
export const DANGLE_LENGTH = 40;

// --- Legacy Turret behaviour ---
export const TURRET_SIGHT = 230;
export const TURRET_AIM_FRAMES = 30;
export const TURRET_FIRE_FRAMES = 12;
export const TURRET_COOLDOWN_FRAMES = 95;
export const CARD_SPEED = 140;
export const CARD_DAMAGE = 3;

// --- Deprecated Bot behaviour ---
/** Bob this close (and about level) makes it stop and punch. */
export const BOT_REACH = 40;
export const BOT_GUARD_FRAMES = 16;
export const BOT_PUNCH_FRAMES = 12;
export const BOT_PUNCH_SPEED = 110;
/** After the punch it stands open (shield away) this long: the moment to hit it. */
export const BOT_OPEN_FRAMES = 36;
