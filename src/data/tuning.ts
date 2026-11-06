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

// --- Bob hitbox (inside the 48x48 sprite cell, feet on the bottom row) ---
export const BOB_BODY_W = 14;
export const BOB_BODY_H = 30;
