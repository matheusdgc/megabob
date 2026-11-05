/**
 * Every gameplay tuning number lives here. Units: pixels, frames (at 60 Hz) or px/s.
 */

// --- Input ---
/** A jump pressed this many frames before landing still triggers on landing. */
export const JUMP_BUFFER_FRAMES = 6;
/** Analog stick deflection below this is ignored. */
export const STICK_DEADZONE = 0.4;
