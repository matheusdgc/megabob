import { describe, expect, it } from 'vitest';
import { cameraScroll, type Section, sectionAt, sectionOf, sectionsFromTiles } from '../src/systems/camera';

const A: Section = { x: 0, y: 0, w: 768, h: 448 };
const B: Section = { x: 768, y: 176, w: 512, h: 272 };
const BOSS: Section = { x: 1280, y: 176, w: 480, h: 272, locked: true };
const ALL = [A, B, BOSS];

describe('sectionAt', () => {
  it('finds the section Bob is in', () => {
    expect(sectionAt(ALL, 100, 400, 0)).toBe(0);
    expect(sectionAt(ALL, 800, 400, 0)).toBe(1);
  });

  it('keeps the current section when Bob is in none of them', () => {
    expect(sectionAt(ALL, 900, 50, 1)).toBe(1);
  });

  it('prefers the current section where two overlap', () => {
    const overlap = [{ x: 0, y: 0, w: 500, h: 300 }, { x: 400, y: 0, w: 500, h: 300 }];
    expect(sectionAt(overlap, 450, 100, 0)).toBe(0);
    expect(sectionAt(overlap, 450, 100, 1)).toBe(1);
  });

  it('never leaves a locked section', () => {
    expect(sectionAt(ALL, 100, 400, 2)).toBe(2);
  });
});

describe('cameraScroll', () => {
  const view = { w: 480, h: 270 };

  it('centers on Bob inside a big section', () => {
    expect(cameraScroll(A, view, { x: 400, y: 200 })).toEqual({ x: 160, y: 65 });
  });

  it('clamps to the section edges', () => {
    expect(cameraScroll(A, view, { x: 10, y: 440 })).toEqual({ x: 0, y: 178 });
    expect(cameraScroll(B, view, { x: 1270, y: 300 })).toEqual({ x: 800, y: 176 });
  });

  it('centers a section smaller than the view', () => {
    expect(cameraScroll({ x: 100, y: 0, w: 400, h: 270 }, view, { x: 0, y: 0 }).x).toBe(60);
  });
});

describe('section helpers', () => {
  it('converts tile sections to pixels', () => {
    expect(sectionsFromTiles([{ x: 1, y: 2, w: 3, h: 4, locked: true }], 16)).toEqual([
      { x: 16, y: 32, w: 48, h: 64, locked: true },
    ]);
  });

  it('files a feet position under the section above it', () => {
    expect(sectionOf(ALL, 800, 448)).toBe(1); // feet on the bottom edge
    expect(sectionOf(ALL, 5000, 100)).toBe(-1);
  });
});
