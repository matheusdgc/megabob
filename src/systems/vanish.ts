/**
 * Vanishing blocks (Null Pointer): every block cycles solid -> flickering (the warning) -> gone
 * -> solid, on one shared clock. The three phase groups are a third of a cycle apart, so a row of
 * 1-2-3 blocks opens a path that moves along it.
 */
export const VANISH_CYCLE = 210;
/** Frames solid, then flickering (still solid), then gone. */
export const VANISH_SOLID = 120;
export const VANISH_FLICKER = 30;

export type VanishState = 'solid' | 'flicker' | 'gone';

export function vanishState(group: 0 | 1 | 2, frame: number): VanishState {
  const t = (((frame - (group * VANISH_CYCLE) / 3) % VANISH_CYCLE) + VANISH_CYCLE) % VANISH_CYCLE;
  if (t < VANISH_SOLID) return 'solid';
  if (t < VANISH_SOLID + VANISH_FLICKER) return 'flicker';
  return 'gone';
}

/** Solid this frame (flickering blocks still hold Bob: the flicker is only the warning). */
export const vanishSolid = (group: 0 | 1 | 2, frame: number): boolean => vanishState(group, frame) !== 'gone';
