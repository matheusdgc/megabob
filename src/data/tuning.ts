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

// --- Bob hitbox (inside the 48x48 sprite cell, feet on the bottom row) ---
export const BOB_BODY_W = 14;
export const BOB_BODY_H = 30;
