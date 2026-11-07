import { describe, expect, it } from 'vitest';
import { memoryLeakFrame, memoryGooFrame } from '../src/systems/memoryLeakArt';

const timing = { burstInterval: 20, sinkFrames: 30 };

describe('Memory Leak presentation', () => {
  it('breathes between the two idle drawings', () => {
    expect([0, 15, 30].map(t => memoryLeakFrame('idle_enter', t, timing))).toEqual([0, 1, 0]);
  });
  it('shows the firing pose on every real burst, including fury', () => {
    for (const state of ['volley', 'fury_volley'] as const) {
      expect([1, 8, 9, 21].map(t => memoryLeakFrame(state, t, timing))).toEqual([2, 2, 0, 2]);
    }
  });
  it('uses the two melting poses, hidden puddle and emerging drawing', () => {
    expect(memoryLeakFrame('dive', 1, timing)).toBe(3);
    expect(memoryLeakFrame('dive', 16, timing)).toBe(4);
    expect(memoryLeakFrame('lurk', 0, timing)).toBe(4);
    expect(memoryLeakFrame('rise', 10, timing)).toBe(5);
  });
  it('gives hit feedback precedence over attacks', () => {
    expect(memoryLeakFrame('volley', 1, timing, true)).toBe(6);
  });
  it('wobbles bubbles and puddles independently', () => {
    expect([0, 6, 12].map(t => memoryGooFrame(t, false))).toEqual([0, 1, 0]);
    expect([0, 10, 20].map(t => memoryGooFrame(t, true))).toEqual([0, 1, 0]);
  });
});
