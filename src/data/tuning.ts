/**
 * Every gameplay tuning number lives here. Units: pixels, frames (at 60 Hz) or px/s.
 */

// --- Input ---
/** A jump pressed this many frames before landing still triggers on landing. */
export const JUMP_BUFFER_FRAMES = 6;
/** Analog stick deflection below this is ignored. */
export const STICK_DEADZONE = 0.4;

// --- Bob movement (px/s, px/s², frames) ---
export const RUN_SPEED = 90;
export const GRAVITY = 900;
/** Initial jump speed: reaches ~3.5 tiles (56 px) when the button is held. */
export const JUMP_SPEED = 318;
/** Releasing jump while rising cuts the upward speed to at most this. */
export const JUMP_CUT_SPEED = 60;
export const MAX_FALL_SPEED = 360;
/** Frames after walking off a ledge during which a jump still works. */
export const COYOTE_FRAMES = 5;
/** Landing pose duration when standing still. */
export const LAND_FRAMES = 6;
/** First frames of a jump that show the takeoff pose. */
export const TAKEOFF_FRAMES = 3;
/** |vy| below this counts as the apex pose. */
export const APEX_SPEED = 60;

// --- Walls ---
/** Max fall speed while sliding down a wall. */
export const WALL_SLIDE_SPEED = 80;
export const WALL_JUMP_SPEED = 300;
/** After a wall kick, horizontal input is ignored this long (Bob is pushed away). */
export const WALL_LOCK_FRAMES = 8;

// --- Dash ---
export const DASH_SPEED = 210;
/** Ground dash length when the button is held (26 frames ≈ 5.7 tiles). */
export const DASH_FRAMES = 26;
/** Releasing dash ends it, but never before this. */
export const DASH_MIN_FRAMES = 6;
export const AIR_DASH_FRAMES = 20;
/** Air dashes per airtime: none for base Bob, one with the Turbo Boots. Recharged on landing or wall grab. */
export const AIR_DASHES = 0;
export const AIR_DASHES_BOOTS = 1;
/** First frames of a dash that show the launch pose. */
export const DASH_START_FRAMES = 3;
/** Braking pose duration when a dash ends standing still. */
export const BRAKE_FRAMES = 6;

// --- Buster ---
/** Basic shots allowed on screen at once; a press beyond this fires nothing. */
export const MAX_SHOTS = 3;
/** Frames the shoot button must be held for charge levels 1, 2 and 3 (3 needs the Compiler Cannon). */
export const CHARGE_FRAMES = [24, 72, 130] as const;
/** After a shot, Bob keeps the cannon pose this long. */
export const SHOOT_POSE_FRAMES = 16;
/** Projectile speeds (px/s) by charge level 0-3. */
export const SHOT_SPEED = [300, 320, 340, 360] as const;
/** Damage by charge level 0-3. */
export const SHOT_DAMAGE = [1, 2, 3, 5] as const;

// --- Health and damage ---
/** Health bar segments. */
export const BOB_MAX_HP = 28;
export const START_LIVES = 3;
/** Knockback duration after a hit (no control), and with the Firewall Plating. */
export const HURT_FRAMES = 24;
export const HURT_FRAMES_PLATED = 12;
/** Horizontal knockback speed, px/s. */
export const HURT_SPEED = 60;
/** Invulnerability after a hit, counted from the hit (includes the knockback). */
export const INVULN_FRAMES = 90;
/** Bob blinks every this many frames while invulnerable. */
export const BLINK_FRAMES = 3;
/** From death until respawn at the checkpoint. */
export const DEATH_FRAMES = 120;

// --- Stage gimmicks ---
/** A conveyor belt carries whoever stands on it at this speed, px/s. */
export const CONVEYOR_SPEED = 50;
/** Frames per conveyor animation frame (2 frames). */
export const CONVEYOR_ANIM_FRAMES = 6;

// --- Bob hitbox (inside the 48x48 sprite cell, feet on the bottom row) ---
export const BOB_BODY_W = 14;
export const BOB_BODY_H = 30;

// --- Feedback ("juice"), by importance: routine actions get little or none ---
export interface FeedbackTier {
  /** Freeze frame: the whole game stops this many frames (sells the impact). */
  freeze: number;
  /** Camera shake, ms and intensity (fraction of the view). Never moves a body. */
  shakeMs: number;
  shake: number;
  /** White screen flash, ms. */
  flashMs: number;
}
export type FeedbackEvent = 'land' | 'enemyKilled' | 'bossHit' | 'bobHurt' | 'bobDeath' | 'bossDefeated';
export const FEEDBACK: Record<FeedbackEvent, FeedbackTier> = {
  land: { freeze: 0, shakeMs: 0, shake: 0, flashMs: 0 },
  enemyKilled: { freeze: 0, shakeMs: 0, shake: 0, flashMs: 0 },
  bossHit: { freeze: 2, shakeMs: 0, shake: 0, flashMs: 0 },
  bobHurt: { freeze: 4, shakeMs: 120, shake: 0.004, flashMs: 0 },
  bobDeath: { freeze: 10, shakeMs: 200, shake: 0.006, flashMs: 0 },
  bossDefeated: { freeze: 24, shakeMs: 500, shake: 0.01, flashMs: 150 },
};
/** Falls shorter than this (airborne frames) land without a dust puff. */
export const LAND_DUST_FRAMES = 14;

/** Race's widest pose extends 44 px from its center; leave one wall tile visible. */
export const RACE_VISUAL_WALL_MARGIN = 60;

// --- Null Pointer enemies: pixel motion and local feedback ---
export const NULL_ENEMY_ART = {
  hoverHeight: 3, hoverPeriod: 120,
  chargeRadius: 11, chargeEndRadius: 5,
  pulseFrames: 12, returnFrames: 16,
  chainLink: 4,
  burstStartRadius: 5, burstTravel: 13,
  cursorFrameTicks: 6,
  amber: 0xf1c21b, cream: 0xefe3c2,
  cyan: 0x08bdba, chainShadow: 0x004144, chainLight: 0x9ef0f0,
} as const;

export const COMBAT_ART = {
  releaseFrames: 10, chargeRadius: 10, chargeEndRadius: 5, releaseTravel: 10,
  releaseStartRadius: 4, releasePoints: 6, trailStart: 8, trailSpacing: 4, trailPhases: 3, trailLength: 3,
  warningFrameTicks: 8, recoverArmFrames: 6,
  teal: 0x08bdba, amber: 0xf1c21b, metal: 0xa6c8ff,
} as const;
