import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MUSIC } from '../src/data/music';
import { JINGLES, jingleDuration, schedule, SFX, sfxDuration } from '../src/data/sfx';
import { dbToGain, gainToDb, measure, noteFreq, normalizeGain, sliderToGain } from '../src/systems/audioMath';

describe('audio math', () => {
  it('converts decibels and back', () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(-6)).toBeCloseTo(0.501, 3);
    expect(gainToDb(dbToGain(-14))).toBeCloseTo(-14);
    expect(gainToDb(0)).toBe(-Infinity);
  });

  it('maps a slider to gain with a squared curve, silent at 0, clamped', () => {
    expect(sliderToGain(0)).toBe(0);
    expect(sliderToGain(0.5)).toBe(0.25);
    expect(sliderToGain(1)).toBe(1);
    expect(sliderToGain(2)).toBe(1);
  });

  it('measures RMS and peak across channels', () => {
    const l = measure([new Float32Array([0.5, -0.5]), new Float32Array([0.5, -1])]);
    expect(l.peak).toBe(1);
    expect(l.rms).toBeCloseTo(Math.sqrt((0.25 * 3 + 1) / 4));
  });

  it('normalizes quiet and loud tracks toward the same loudness, under the peak ceiling', () => {
    const quiet = { rms: dbToGain(-28), peak: dbToGain(-12) };
    const loud = { rms: dbToGain(-9), peak: 1.2 };
    expect(gainToDb(normalizeGain(quiet))).toBeCloseTo(11); // capped by its peaks: -12 + 11 = -1 dB
    expect(gainToDb(normalizeGain(loud) * loud.peak)).toBeLessThanOrEqual(-1 + 1e-9);
    expect(normalizeGain({ rms: 0, peak: 0 })).toBe(1);
    expect(gainToDb(normalizeGain({ rms: dbToGain(-60), peak: dbToGain(-50) }))).toBeCloseTo(18); // max boost
  });

  it('tunes notes to A440', () => {
    expect(noteFreq(69)).toBe(440);
    expect(noteFreq(81)).toBeCloseTo(880);
  });
});

describe('sound recipes', () => {
  it('every SFX is short, audible and never above full volume', () => {
    for (const [name, def] of Object.entries(SFX)) {
      expect(sfxDuration(def), name).toBeGreaterThan(0);
      expect(sfxDuration(def), name).toBeLessThan(1.5);
      for (const v of def.voices) expect(v.vol, name).toBeLessThanOrEqual(0.4);
    }
  });

  it('schedules jingle notes on the beat grid, skipping rests', () => {
    const notes = schedule([[60, 1], [null, 1], [64, 2]], 120);
    expect(notes).toEqual([
      { t: 0, dur: 0.5, midi: 60 },
      { t: 1, dur: 1, midi: 64 },
    ]);
    for (const j of Object.values(JINGLES)) expect(jingleDuration(j)).toBeLessThan(5);
  });
});

describe('music manifest', () => {
  it('every track file exists and loops from inside the track', () => {
    for (const [id, m] of Object.entries(MUSIC)) {
      expect(existsSync(`public/${m.file}`), id).toBe(true);
      expect(m.loopStart).toBeGreaterThanOrEqual(0);
    }
  });
});
