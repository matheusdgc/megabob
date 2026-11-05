import { describe, expect, it } from 'vitest';
import { integerZoom } from '../src/systems/scaling';

describe('integerZoom', () => {
  it('picks the largest integer scale that fits both axes', () => {
    expect(integerZoom(1920, 1080, 256, 224)).toBe(4); // 1080 / 224 = 4.8
    expect(integerZoom(1280, 720, 256, 224)).toBe(3); // 720 / 224 = 3.2
  });

  it('is limited by the narrower axis', () => {
    expect(integerZoom(600, 2000, 256, 224)).toBe(2); // 600 / 256 = 2.3
  });

  it('never goes below 1', () => {
    expect(integerZoom(100, 100, 256, 224)).toBe(1);
    expect(integerZoom(0, 0, 256, 224)).toBe(1);
  });
});
