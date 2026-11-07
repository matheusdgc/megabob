/** Most a rising jump is nudged sideways around a ceiling corner, px. */
export const CORNER_NUDGE_MAX = 4;

/** Is the point (x, y) inside a solid tile? */
export type SolidAt = (x: number, y: number) => boolean;

/** Does a w x h box at (left, top) overlap anything solid? Samples at least every 8 px. */
function boxHits(solidAt: SolidAt, left: number, top: number, w: number, h: number): boolean {
  const xs = samples(left, w);
  for (const y of samples(top, h)) for (const x of xs) if (solidAt(x, y)) return true;
  return false;
}

function samples(from: number, size: number): number[] {
  const out: number[] = [];
  const n = Math.max(1, Math.ceil(size / 8));
  for (let i = 0; i <= n; i++) out.push(from + Math.min(size - 0.01, (size * i) / n));
  return out;
}

/**
 * Corner correction for a rising jump. When Bob's head is about to clip a ceiling corner by only
 * a few pixels, returns the sideways shift (smallest first, up to `max`) that lets him keep
 * rising; 0 when no nudge is needed or the ceiling is too wide to slip past.
 * The box is Bob's hitbox (left, top, w, h); `dy` is how far it moves up this step (negative).
 */
export function cornerNudge(solidAt: SolidAt, left: number, top: number, w: number, h: number, dy: number, max = CORNER_NUDGE_MAX): number {
  if (dy >= 0) return 0;
  const headTop = top + dy;
  // only the strip the head moves into this step
  const head = (l: number) => boxHits(solidAt, l, headTop, w, -dy);
  if (!head(left)) return 0;
  for (let o = 1; o <= max; o++) {
    for (const side of [-1, 1]) {
      const l = left + side * o;
      if (!head(l) && !boxHits(solidAt, l, top, w, h)) return side * o;
    }
  }
  return 0;
}
