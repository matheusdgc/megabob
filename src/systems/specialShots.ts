import { SPECIAL_SHOTS } from '../data/tuning';

/**
 * How each special weapon's shot comes out and moves, as pure functions of its age in fixed
 * steps (so it is the same at any display refresh). The entities in src/entities/weapons/ only
 * apply the result.
 *
 * - Garbage Collector: grows out of the cannon while it gathers speed, then sweeps in a wave.
 * - Mutex Lock: flies fast and steers toward the nearest target ahead (it "acquires a lock").
 * - Null Pointer: no travel at all, only teleports: it appears ahead and jumps forward.
 */

const GC = SPECIAL_SHOTS.gc;
const MUTEX = SPECIAL_SHOTS.mutex;
const NULL = SPECIAL_SHOTS.nullPointer;

export interface GcMotion {
  scale: number;
  /** Forward speed, px/s. */
  speed: number;
  /** Vertical speed, px/s (the wave). */
  vy: number;
}

/** The Garbage Collector orb at `frame` steps after it was fired. */
export function gcMotion(frame: number): GcMotion {
  const t = Math.min(1, frame / GC.growFrames);
  const ease = 1 - (1 - t) * (1 - t);
  // the wave starts once the orb is fully out, at zero and rising
  const w = Math.max(0, frame - GC.growFrames);
  const omega = (2 * Math.PI) / GC.wavePeriod;
  const vy = frame < GC.growFrames ? 0 : -GC.wave * omega * Math.cos(omega * w) * 60;
  return { scale: GC.startScale + (1 - GC.startScale) * ease, speed: GC.launchSpeed + (GC.speed - GC.launchSpeed) * ease, vy };
}

export interface Point {
  x: number;
  y: number;
}

/** The nearest target ahead of a shot flying in `dir`, within the lock range. */
export function pickLockTarget<T extends Point>(from: Point, dir: 1 | -1, targets: readonly T[], range: number = MUTEX.range): T | undefined {
  let best: T | undefined;
  let bestD = range;
  for (const t of targets) {
    if ((t.x - from.x) * dir <= 0) continue;
    const d = Math.hypot(t.x - from.x, t.y - from.y);
    if (d <= bestD) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

/** Turn a velocity toward a point by at most `maxTurn` radians, keeping its speed. */
export function steer(v: Point, from: Point, to: Point, maxTurn: number = MUTEX.turn): Point {
  const speed = Math.hypot(v.x, v.y);
  const now = Math.atan2(v.y, v.x);
  const want = Math.atan2(to.y - from.y, to.x - from.x);
  let d = want - now;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const a = now + Math.max(-maxTurn, Math.min(maxTurn, d));
  return { x: Math.cos(a) * speed, y: Math.sin(a) * speed };
}

/** Distance the Null Pointer teleports forward at `frame` steps after it was fired (0 = stays). */
export const nullHop = (frame: number): number => (frame > 0 && frame % NULL.hopFrames === 0 ? NULL.hopPx : 0);
