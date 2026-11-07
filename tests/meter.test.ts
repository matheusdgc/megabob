import { describe, expect, it } from 'vitest';
import { litSegments, METER_SEGMENTS } from '../src/ui/meter';

describe('HUD meter: values light the 28 segments of the meter art', () => {
  it('lights one segment per point when the max is 28', () => {
    expect(METER_SEGMENTS).toBe(28);
    for (let v = 0; v <= 28; v++) expect(litSegments(v, 28)).toBe(v);
  });

  it('maps any other max onto the 28, never past them or below zero', () => {
    expect(litSegments(5, 10)).toBe(14);
    expect(litSegments(40, 28)).toBe(28);
    expect(litSegments(-3, 28)).toBe(0);
    expect(litSegments(3, 0)).toBe(0);
  });
});
