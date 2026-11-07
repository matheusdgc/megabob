/**
 * Soundtrack manifest (files from tools/music.py, choices in docs/soundtrack.md).
 * The player loops from `loopStart` to `loopEnd` (seconds; end defaults to the track's end)
 * on the sample, so there is no gap. Loudness is matched at load time (audioMath.normalizeGain).
 */
export type MusicId =
  | 'title'
  | 'select'
  | 'memoryLeak'
  | 'raceCondition'
  | 'nullPointer'
  | 'boss'
  | 'fortress'
  | 'techDebt1'
  | 'techDebt2'
  | 'credits';

export interface MusicDef {
  file: string;
  /** Loop region; `loop: false` plays once (credits). */
  loop: boolean;
  loopStart: number;
  loopEnd?: number;
}

const track = (file: string, loopStart = 0, loop = true): MusicDef => ({ file: `assets/music/${file}`, loop, loopStart });

export const MUSIC: Record<MusicId, MusicDef> = {
  title: track('title.mp3'),
  select: track('select.ogg'),
  memoryLeak: track('memory_leak.ogg', 4), // skips the fade-in on every loop
  raceCondition: track('race_condition.ogg'),
  nullPointer: track('null_pointer.mp3'),
  boss: track('boss.ogg'),
  fortress: track('fortress.mp3'),
  techDebt1: track('tech_debt_1.mp3'),
  techDebt2: track('tech_debt_2.ogg'),
  credits: track('credits.mp3', 0, false),
};

/** Phaser cache key of a track. */
export const musicKey = (id: MusicId): string => `music_${id}`;
