import { describe, expect, it } from 'vitest';
import { cornerNudge, type SolidAt } from '../src/systems/corner';

/** A ceiling block of 16x16 tiles: columns [c0, c1) of row 0 (y 0-16) are solid. */
const ceiling = (c0: number, c1: number): SolidAt => (x, y) => y >= 0 && y < 16 && x >= c0 * 16 && x < c1 * 16;

const W = 14;
const H = 30;
const TOP = 18; // head 2 px under the ceiling
const UP = -5; // rising 5 px this step

describe('cornerNudge', () => {
  it('does nothing with a clear head, or when not rising', () => {
    expect(cornerNudge(ceiling(0, 1), 40, TOP, W, H, UP)).toBe(0);
    expect(cornerNudge(ceiling(0, 10), 40, TOP, W, H, 3)).toBe(0);
  });

  it('slides Bob off a corner he clips by a few pixels, toward the open side', () => {
    // ceiling ends at x = 32; Bob's left edge at 30 clips it by 2 px -> push right 2
    expect(cornerNudge(ceiling(0, 2), 30, TOP, W, H, UP)).toBe(2);
    // ceiling starts at x = 64; Bob at 51 (right edge 65) clips it by 1 px -> push left 1
    expect(cornerNudge(ceiling(4, 8), 51, TOP, W, H, UP)).toBe(-1);
  });

  it('keeps the stop under a real ceiling (more than 4 px of overlap)', () => {
    expect(cornerNudge(ceiling(0, 2), 26, TOP, W, H, UP)).toBe(0); // 6 px under it
    expect(cornerNudge(ceiling(0, 10), 40, TOP, W, H, UP)).toBe(0);
  });

  it('never nudges into a wall beside Bob', () => {
    const wallRight: SolidAt = (x, y) => ceiling(0, 2)(x, y) || (x >= 45 && x < 61);
    expect(cornerNudge(wallRight, 30, TOP, W, H, UP)).toBe(0);
  });
});
