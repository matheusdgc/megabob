import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  cleanName,
  entryOf,
  formatTime,
  insertScore,
  loadBoard,
  newRun,
  parseBoard,
  qualifies,
  SCORE_RULES,
  type ScoreEntry,
  SCORES_KEY,
  scoreOf,
  writeBoard,
} from '../src/systems/scores';

const entry = (score: number, seconds = 600, date = '2026-11-07', name = 'BOB'): ScoreEntry => ({ name, score, deaths: 0, kills: 0, seconds, date });
const board = (n: number) => Array.from({ length: n }, (_, i) => entry(40_000 - i * 1000));

describe('score', () => {
  it('is the clear bonus, plus enemies, minus deaths and seconds', () => {
    const r = SCORE_RULES;
    expect(scoreOf({ deaths: 0, kills: 0, frames: 0 })).toBe(r.base);
    expect(scoreOf({ deaths: 2, kills: 150, frames: 60 * 1200 })).toBe(r.base + 150 * r.perKill - 2 * r.perDeath - 1200 * r.perSecond);
    expect(scoreOf({ deaths: 99, kills: 0, frames: 60 * 99_999 })).toBe(0); // never below zero
  });

  it('counts whole seconds of fixed steps', () => {
    expect(entryOf('x', { ...newRun(), frames: 119 }, new Date('2026-11-07T12:00:00Z')).seconds).toBe(1);
  });
});

describe('board', () => {
  it('keeps the best 10, better score first, then the faster run', () => {
    const { board: b, rank } = insertScore(board(BOARD_SIZE), entry(35_500));
    expect(rank).toBe(5);
    expect(b).toHaveLength(BOARD_SIZE);
    expect(b.map((e) => e.score)).toEqual([...b.map((e) => e.score)].sort((x, y) => y - x));
    const tie = insertScore([entry(30_000, 900)], entry(30_000, 800));
    expect(tie.rank).toBe(0);
  });

  it('puts a full tie below the older record, and turns away what does not make it', () => {
    expect(insertScore([entry(30_000)], entry(30_000)).rank).toBe(1);
    const full = board(BOARD_SIZE);
    expect(qualifies(full, entry(1_000))).toBe(false);
    expect(insertScore(full, entry(1_000)).rank).toBe(-1);
    expect(qualifies(board(3), entry(0))).toBe(true);
  });

  it('cleans names: upper case, allowed letters, at most 8, BOB when empty', () => {
    expect(cleanName('  ma<theus>!!  ')).toBe('MATHEUS');
    expect(cleanName('abcdefghijk')).toBe('ABCDEFGH');
    expect(cleanName('   ')).toBe('BOB');
  });

  it('reads untrusted storage: bad JSON or bad rows are dropped, the rest sorted', () => {
    expect(parseBoard('not json')).toEqual([]);
    expect(parseBoard('{"a":1}')).toEqual([]);
    const rows = [entry(100), { name: 'X', score: -5, deaths: 0, kills: 0, seconds: 1, date: '2026-11-07' }, entry(900, 60, 'bad-date'), entry(500)];
    expect(parseBoard(JSON.stringify(rows)).map((e) => e.score)).toEqual([500, 100]);
  });

  it('round-trips through storage and survives a refusing one', () => {
    const data = new Map<string, string>();
    const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    expect(writeBoard(store, board(2))).toBe(true);
    expect(data.has(SCORES_KEY)).toBe(true);
    expect(loadBoard(store)).toEqual(board(2));
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(loadBoard(broken)).toEqual([]);
    expect(writeBoard(broken, board(1))).toBe(false);
  });

  it('formats time as m:ss, and h:mm:ss past an hour', () => {
    expect([formatTime(5), formatTime(754), formatTime(3725)]).toEqual(['0:05', '12:34', '1:02:05']);
  });
});
