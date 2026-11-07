import { describe, expect, it } from 'vitest';
import { integerZoom, parseView } from '../src/systems/scaling';

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

describe('parseView', () => {
  const fallback = { width: 480, height: 270 };

  it('reads ?view=WxH', () => {
    expect(parseView('?view=640x360', fallback)).toEqual({ width: 640, height: 360 });
    expect(parseView('?sprites&view=256x224', fallback)).toEqual({ width: 256, height: 224 });
  });

  it('falls back when missing, malformed or out of range', () => {
    expect(parseView('', fallback)).toEqual(fallback);
    expect(parseView('?view=big', fallback)).toEqual(fallback);
    expect(parseView('?view=64x64', fallback)).toEqual(fallback);
    expect(parseView('?view=4000x2000', fallback)).toEqual(fallback);
  });
});
