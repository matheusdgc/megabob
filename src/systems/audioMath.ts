/** Audio math, pure: decibels, volume sliders and loudness. */

export const dbToGain = (db: number): number => 10 ** (db / 20);
export const gainToDb = (g: number): number => (g <= 0 ? -Infinity : 20 * Math.log10(g));

/**
 * A 0..1 settings slider to a bus gain. Squared, so the audible change is spread over the whole
 * travel (a raw linear slider sounds unchanged over most of it); 0 is true silence.
 */
export const sliderToGain = (v: number): number => {
  const c = Math.min(1, Math.max(0, v));
  return c * c;
};

export interface Loudness {
  /** RMS over all channels, linear (1 = full scale). */
  rms: number;
  peak: number;
}

/** RMS and peak of decoded audio (one Float32Array per channel). */
export function measure(channels: readonly Float32Array[]): Loudness {
  let sum = 0;
  let n = 0;
  let peak = 0;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) {
      const v = ch[i]!;
      sum += v * v;
      const a = v < 0 ? -v : v;
      if (a > peak) peak = a;
    }
    n += ch.length;
  }
  return { rms: n ? Math.sqrt(sum / n) : 0, peak };
}

/** Music loudness target (RMS) and the peak ceiling, dBFS. */
export const MUSIC_TARGET_DB = -16;
export const PEAK_CEILING_DB = -1;
/** Never boost a track more than this (a near-silent file would otherwise become noise). */
export const MAX_BOOST_DB = 18;

/**
 * Gain that brings a track to the loudness target without its peaks passing the ceiling,
 * so every track plays at about the same perceived volume.
 */
export function normalizeGain(l: Loudness, targetDb = MUSIC_TARGET_DB, ceilingDb = PEAK_CEILING_DB): number {
  if (l.rms <= 0 || l.peak <= 0) return 1;
  const want = dbToGain(targetDb) / l.rms;
  const room = dbToGain(ceilingDb) / l.peak;
  return Math.min(want, room, dbToGain(MAX_BOOST_DB));
}

/** Frequency of a MIDI note (69 = A4 = 440 Hz). */
export const noteFreq = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
