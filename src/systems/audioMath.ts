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

/** How far a loop start may move to land on a zero crossing, seconds. */
export const LOOP_START_SNAP_S = 0.01;
/** How far back from the requested end the loop end may move to match the start, seconds. */
export const LOOP_END_SEARCH_S = 0.03;
/** Samples compared at the seam (value and slope). */
const MATCH = 4;

/**
 * Index of the rising zero crossing (d[i-1] < 0 <= d[i]) nearest to `at`, within `max` samples
 * either way; `at` itself when there is none.
 */
export function zeroCrossingNear(d: Float32Array, at: number, max: number): number {
  for (let k = 0; k <= max; k++) {
    for (const i of [at + k, at - k]) {
      if (i > 0 && i < d.length && d[i - 1]! < 0 && d[i]! >= 0) return i;
    }
  }
  return at;
}

/**
 * Click-free loop points. The start moves onto a rising zero crossing of the mid channel; the
 * end moves back (at most LOOP_END_SEARCH_S) to where the next few samples repeat the ones at
 * the start, in every channel, so jumping from the end to the start continues the waveform
 * instead of stepping (a step is an audible click; a zero crossing alone is not enough under
 * a held bass note). Seconds in, seconds out; `end` defaults to the track's end.
 */
export function snapLoop(channels: readonly Float32Array[], sampleRate: number, start: number, end?: number): { start: number; end: number } {
  const len = channels[0]?.length ?? 0;
  const mid = new Float32Array(len);
  for (const ch of channels) for (let i = 0; i < len; i++) mid[i]! += ch[i]!;
  const s = zeroCrossingNear(mid, Math.round(start * sampleRate), Math.round(LOOP_START_SNAP_S * sampleRate));
  const last = Math.min(len - MATCH, Math.round((end ?? len / sampleRate) * sampleRate));
  const first = Math.max(s + MATCH, last - Math.round(LOOP_END_SEARCH_S * sampleRate));
  let best = last;
  let bestErr = Infinity;
  for (let e = last; e >= first; e--) {
    let err = 0;
    for (const ch of channels) for (let k = 0; k < MATCH; k++) err += (ch[e + k]! - ch[s + k]!) ** 2;
    if (err < bestErr) {
      bestErr = err;
      best = e;
    }
  }
  return { start: s / sampleRate, end: best / sampleRate };
}
