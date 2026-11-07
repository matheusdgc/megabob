/**
 * Rising goo (Memory Leak): in one camera section the goo floods upward from `fromRow` once
 * Bob enters, after a short grace delay, and stops at `toRow`. Touching it is fatal, so the
 * section is a climb against the clock. Rows are map tile rows (16 px).
 */
export interface GooDef {
  /** Index of the camera section it floods. */
  section: number;
  fromRow: number;
  toRow: number;
  /** Rising speed, px/s. */
  speed: number;
  /** Frames after Bob enters before it starts to rise. */
  delayFrames: number;
}

const TILE = 16;

/** The goo surface's y (px) after `frames` frames in its section. */
export function gooTop(def: GooDef, frames: number): number {
  const risen = (Math.max(0, frames - def.delayFrames) * def.speed) / 60;
  return Math.max(def.toRow * TILE, def.fromRow * TILE - risen);
}

/** Bob's feet sink this deep into the goo before it kills him (a graze on the surface is forgiven). */
export const GOO_SINK = 4;

export const inGoo = (def: GooDef, frames: number, feetY: number): boolean => feetY > gooTop(def, frames) + GOO_SINK;
