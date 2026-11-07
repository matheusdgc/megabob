/**
 * Sound effects and jingles, synthesized in code (no files): each is a short recipe of chiptune
 * voices that src/audio/synth.ts plays through WebAudio. All original.
 */

export type Wave = 'square' | 'triangle' | 'sawtooth' | 'sine' | 'noise';

/** One voice: a tone (or filtered noise) sliding from one frequency to another. */
export interface Voice {
  wave: Wave;
  /** Start and end frequency, Hz (for noise: the low-pass cutoff). */
  from: number;
  to: number;
  /** Seconds. */
  dur: number;
  /** Peak volume 0..1 (before the SFX bus). */
  vol: number;
  /** Start offset, seconds. */
  at?: number;
}

export interface SfxDef {
  voices: readonly Voice[];
  /** Random pitch spread, ± fraction (0.04 = ±4%), so repeats don't sound robotic. */
  vary?: number;
}

export const SFX = {
  jump: { voices: [{ wave: 'square', from: 260, to: 520, dur: 0.1, vol: 0.18 }], vary: 0.03 },
  land: { voices: [{ wave: 'noise', from: 900, to: 300, dur: 0.06, vol: 0.14 }], vary: 0.05 },
  dash: {
    voices: [
      { wave: 'noise', from: 3000, to: 500, dur: 0.14, vol: 0.18 },
      { wave: 'square', from: 180, to: 110, dur: 0.1, vol: 0.1 },
    ],
  },
  shoot: { voices: [{ wave: 'square', from: 900, to: 450, dur: 0.07, vol: 0.16 }], vary: 0.04 },
  shootCharged: {
    voices: [
      { wave: 'sawtooth', from: 330, to: 110, dur: 0.22, vol: 0.2 },
      { wave: 'square', from: 660, to: 220, dur: 0.18, vol: 0.12 },
    ],
  },
  shootFull: {
    voices: [
      { wave: 'sawtooth', from: 220, to: 55, dur: 0.32, vol: 0.24 },
      { wave: 'noise', from: 4000, to: 400, dur: 0.25, vol: 0.18 },
    ],
  },
  chargeReady: { voices: [{ wave: 'triangle', from: 400, to: 800, dur: 0.12, vol: 0.16 }] },
  chargeFull: { voices: [{ wave: 'triangle', from: 800, to: 1600, dur: 0.15, vol: 0.16 }] },
  garbageCollector: {
    voices: [
      { wave: 'sine', from: 200, to: 600, dur: 0.2, vol: 0.22 },
      { wave: 'triangle', from: 600, to: 200, dur: 0.2, vol: 0.12, at: 0.05 },
    ],
  },
  mutexLock: {
    voices: [
      { wave: 'square', from: 1400, to: 900, dur: 0.06, vol: 0.14 },
      { wave: 'square', from: 700, to: 700, dur: 0.08, vol: 0.12, at: 0.06 },
    ],
  },
  freeze: {
    voices: [
      { wave: 'triangle', from: 2000, to: 600, dur: 0.18, vol: 0.14 },
      { wave: 'noise', from: 6000, to: 2000, dur: 0.12, vol: 0.08 },
    ],
  },
  weaponSwitch: { voices: [{ wave: 'square', from: 1200, to: 1200, dur: 0.035, vol: 0.1 }] },
  hurt: { voices: [{ wave: 'square', from: 620, to: 150, dur: 0.18, vol: 0.22 }] },
  death: {
    voices: [
      { wave: 'square', from: 420, to: 50, dur: 0.6, vol: 0.22 },
      { wave: 'noise', from: 2500, to: 200, dur: 0.45, vol: 0.18 },
    ],
  },
  enemyHit: { voices: [{ wave: 'square', from: 320, to: 200, dur: 0.05, vol: 0.14 }], vary: 0.06 },
  explosion: { voices: [{ wave: 'noise', from: 2200, to: 150, dur: 0.35, vol: 0.3 }], vary: 0.08 },
  bossHit: {
    voices: [
      { wave: 'square', from: 190, to: 120, dur: 0.08, vol: 0.18 },
      { wave: 'noise', from: 1800, to: 600, dur: 0.06, vol: 0.12 },
    ],
    vary: 0.04,
  },
  bossExplosion: {
    voices: [
      { wave: 'noise', from: 3000, to: 80, dur: 1.1, vol: 0.34 },
      { wave: 'sawtooth', from: 120, to: 30, dur: 0.9, vol: 0.18 },
    ],
  },
  throw: { voices: [{ wave: 'triangle', from: 300, to: 520, dur: 0.1, vol: 0.12 }], vary: 0.05 },
  clockShot: { voices: [{ wave: 'square', from: 1800, to: 1100, dur: 0.06, vol: 0.12 }], vary: 0.05 },
  bossDash: {
    voices: [
      { wave: 'noise', from: 5000, to: 800, dur: 0.3, vol: 0.18 },
      { wave: 'sawtooth', from: 220, to: 440, dur: 0.2, vol: 0.1 },
    ],
  },
  blockBreak: { voices: [{ wave: 'noise', from: 1600, to: 400, dur: 0.08, vol: 0.14 }], vary: 0.08 },
  pickup: {
    voices: [
      { wave: 'square', from: 660, to: 660, dur: 0.05, vol: 0.14 },
      { wave: 'square', from: 990, to: 990, dur: 0.05, vol: 0.14, at: 0.05 },
      { wave: 'square', from: 1320, to: 1320, dur: 0.08, vol: 0.14, at: 0.1 },
    ],
  },
  door: {
    voices: [
      { wave: 'sawtooth', from: 80, to: 130, dur: 0.5, vol: 0.14 },
      { wave: 'noise', from: 500, to: 300, dur: 0.5, vol: 0.12 },
    ],
  },
  checkpoint: {
    voices: [
      { wave: 'triangle', from: 523, to: 523, dur: 0.08, vol: 0.18 },
      { wave: 'triangle', from: 784, to: 784, dur: 0.14, vol: 0.18, at: 0.08 },
    ],
  },
} as const satisfies Record<string, SfxDef>;

export type SfxId = keyof typeof SFX;

/** A jingle: notes on a beat grid. A note is [MIDI number or null for a rest, length in beats]. */
export interface JingleDef {
  bpm: number;
  wave: Wave;
  vol: number;
  notes: readonly (readonly [number | null, number])[];
  /** Optional second line (harmony or bass), same grid. */
  bass?: readonly (readonly [number | null, number])[];
}

export const JINGLES = {
  // power-up fanfare after a boss: rising arpeggio, then a held major chord tone
  weaponGet: {
    bpm: 160,
    wave: 'square',
    vol: 0.16,
    notes: [[60, 0.5], [64, 0.5], [67, 0.5], [72, 0.5], [null, 0.25], [67, 0.25], [72, 0.5], [76, 2]],
    bass: [[48, 1], [52, 1], [55, 1], [48, 2]],
  },
  // boss down: short victory phrase
  bossDefeated: {
    bpm: 150,
    wave: 'square',
    vol: 0.16,
    notes: [[67, 0.25], [67, 0.25], [72, 0.5], [71, 0.25], [72, 0.25], [76, 0.5], [79, 1.5]],
    bass: [[43, 1], [48, 1], [43, 0.5], [48, 1.5]],
  },
  // Bob decompiled: falling minor line
  death: {
    bpm: 180,
    wave: 'triangle',
    vol: 0.2,
    notes: [[76, 0.5], [72, 0.5], [69, 0.5], [65, 0.5], [64, 1.5]],
  },
  // stage start ("READY"): a short call to action
  stageStart: {
    bpm: 170,
    wave: 'square',
    vol: 0.14,
    notes: [[67, 0.5], [71, 0.5], [74, 0.5], [79, 1]],
    bass: [[43, 1], [50, 1.5]],
  },
  // last life lost
  gameOver: {
    bpm: 120,
    wave: 'square',
    vol: 0.14,
    notes: [[72, 0.5], [71, 0.5], [69, 0.5], [67, 0.5], [65, 1], [64, 2]],
    bass: [[48, 2], [41, 1], [36, 2]],
  },
  // the boss door shuts: a two-tone alarm
  warning: {
    bpm: 200,
    wave: 'square',
    vol: 0.12,
    notes: [[81, 0.5], [76, 0.5], [81, 0.5], [76, 0.5], [81, 0.5], [76, 1]],
  },
} as const satisfies Record<string, JingleDef>;

export type JingleId = keyof typeof JINGLES;

/** Seconds a sound effect lasts. */
export const sfxDuration = (def: SfxDef): number => Math.max(...def.voices.map((v) => (v.at ?? 0) + v.dur));

/** A jingle line as timed notes (seconds), rests dropped. */
export function schedule(line: JingleDef['notes'], bpm: number): { t: number; dur: number; midi: number }[] {
  const beat = 60 / bpm;
  const out: { t: number; dur: number; midi: number }[] = [];
  let t = 0;
  for (const [midi, beats] of line) {
    if (midi !== null) out.push({ t, dur: beats * beat, midi });
    t += beats * beat;
  }
  return out;
}

/** Seconds a jingle lasts (its longest line). */
export function jingleDuration(j: JingleDef): number {
  const len = (line: JingleDef['notes']) => line.reduce((s, [, b]) => s + b, 0) * (60 / j.bpm);
  return Math.max(len(j.notes), j.bass ? len(j.bass) : 0);
}
