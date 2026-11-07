import { MUSIC_FILES } from './musicFiles';

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
  /** Files of the track, best format first (the loader picks the first the browser plays). */
  files: readonly string[];
  /** Loop region; `loop: false` plays once (credits). */
  loop: boolean;
  loopStart: number;
  loopEnd?: number;
}

const track = (key: string, loopStart = 0, loop = true): MusicDef => {
  const files = MUSIC_FILES[key];
  if (!files) throw new Error(`music ${key}: run tools/music.py`);
  return { files, loop, loopStart };
};

export const MUSIC: Record<MusicId, MusicDef> = {
  title: track('title'),
  select: track('select'),
  memoryLeak: track('memory_leak', 4), // skips the fade-in on every loop
  raceCondition: track('race_condition'),
  nullPointer: track('null_pointer'),
  boss: track('boss'),
  fortress: track('fortress'),
  techDebt1: track('tech_debt_1'),
  techDebt2: track('tech_debt_2'),
  credits: track('credits', 0, false),
};

/** Phaser cache key of a track. */
export const musicKey = (id: MusicId): string => `music_${id}`;
