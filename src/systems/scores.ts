import type { KeyValueStore } from './save';

/**
 * Records of the players who beat the game (a top 10 in this browser's storage, apart from the
 * save so a New Game never erases it). Pure apart from the `KeyValueStore` it is handed.
 *
 * One score ranks a run: a base for finishing, plus a bonus per enemy destroyed, minus a
 * penalty per death and per second (never below zero). Ties go to the faster run, then to the
 * older record.
 */

export const SCORES_KEY = 'megabob.scores';
export const BOARD_SIZE = 10;
export const NAME_MAX = 8;
/** What a name may hold (the entry screen cycles through these). */
export const NAME_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-. ';

export const SCORE_RULES = { base: 50_000, perKill: 100, perDeath: 2_500, perSecond: 10 } as const;

/** What a run counted, from New Game to the final boss. */
export interface RunStats {
  deaths: number;
  kills: number;
  /** Fixed 60 Hz steps spent in stages (menus and pauses do not count). */
  frames: number;
  /** False when the run cannot enter the records: begun before they existed, or already entered. */
  ranked: boolean;
}

export const newRun = (): RunStats => ({ deaths: 0, kills: 0, frames: 0, ranked: true });

export const runSeconds = (r: Pick<RunStats, 'frames'>): number => Math.floor(r.frames / 60);

export function scoreOf(r: Pick<RunStats, 'deaths' | 'kills' | 'frames'>): number {
  const s = SCORE_RULES;
  return Math.max(0, s.base + s.perKill * r.kills - s.perDeath * r.deaths - s.perSecond * runSeconds(r));
}

export interface ScoreEntry {
  name: string;
  score: number;
  deaths: number;
  kills: number;
  seconds: number;
  /** yyyy-mm-dd */
  date: string;
}

export function entryOf(name: string, run: RunStats, date: Date): ScoreEntry {
  return { name: cleanName(name), score: scoreOf(run), deaths: run.deaths, kills: run.kills, seconds: runSeconds(run), date: date.toISOString().slice(0, 10) };
}

/** Upper case, only NAME_CHARS, at most NAME_MAX, trimmed; an empty name is BOB. */
export function cleanName(raw: string): string {
  const name = [...raw.toUpperCase()].filter((c) => NAME_CHARS.includes(c)).join('').trim().slice(0, NAME_MAX).trim();
  return name || 'BOB';
}

/** Better first: higher score, then faster, then the older record. */
const better = (a: ScoreEntry, b: ScoreEntry): number => b.score - a.score || a.seconds - b.seconds || a.date.localeCompare(b.date);

/** Would this score make the board? */
export function qualifies(board: readonly ScoreEntry[], entry: ScoreEntry): boolean {
  return board.length < BOARD_SIZE || better(entry, board[board.length - 1]!) < 0;
}

/** The board with `entry` in its place (a tie goes below the older record), and its index (-1: out). */
export function insertScore(board: readonly ScoreEntry[], entry: ScoreEntry): { board: ScoreEntry[]; rank: number } {
  let at = board.findIndex((e) => better(entry, e) < 0);
  if (at < 0) at = board.length;
  const next = [...board.slice(0, at), entry, ...board.slice(at)].slice(0, BOARD_SIZE);
  return { board: next, rank: at < BOARD_SIZE ? at : -1 };
}

const count = (v: unknown): number | null => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < 1e9 ? (v as number) : null);

/** Entries from untrusted text; anything malformed is dropped, the rest re-sorted. */
export function parseBoard(text: string | null): ScoreEntry[] {
  if (!text) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const out: ScoreEntry[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    if (!r || typeof r !== 'object' || typeof r.name !== 'string' || typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
    const [score, deaths, kills, seconds] = [count(r.score), count(r.deaths), count(r.kills), count(r.seconds)];
    if (score === null || deaths === null || kills === null || seconds === null) continue;
    out.push({ name: cleanName(r.name), score, deaths, kills, seconds, date: r.date });
  }
  return out.sort(better).slice(0, BOARD_SIZE);
}

/** The board, or an empty one. Never throws (storage may be disabled). */
export function loadBoard(store: KeyValueStore | null): ScoreEntry[] {
  try {
    return parseBoard(store?.getItem(SCORES_KEY) ?? null);
  } catch {
    return [];
  }
}

export function writeBoard(store: KeyValueStore | null, board: readonly ScoreEntry[]): boolean {
  if (!store) return false;
  try {
    store.setItem(SCORES_KEY, JSON.stringify(board));
    return true;
  } catch {
    return false;
  }
}

/** m:ss, or h:mm:ss past an hour. */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
