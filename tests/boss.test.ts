import { describe, expect, it } from 'vitest';
import {
  BOSS_INTRO_FRAMES,
  BOSS_INVULN_FRAMES,
  bossHpFraction,
  bossIntroPct,
  hurtBoss,
  newBossState,
  resetBossState,
  tickBossState,
} from '../src/systems/boss';

describe('newBossState', () => {
  it('starts in intro phase at full HP', () => {
    const s = newBossState(28);
    expect(s).toMatchObject({ phase: 'intro', hp: 28, maxHp: 28, invuln: 0, flash: 0, introFrames: 0 });
  });
});

describe('bossIntroPct / bossHpFraction', () => {
  it('introPct goes from 0 to 1 over BOSS_INTRO_FRAMES steps', () => {
    const s = newBossState(28);
    expect(bossIntroPct(s)).toBe(0);
    s.introFrames = BOSS_INTRO_FRAMES / 2;
    expect(bossIntroPct(s)).toBeCloseTo(0.5);
    s.introFrames = BOSS_INTRO_FRAMES;
    expect(bossIntroPct(s)).toBe(1);
    s.introFrames = BOSS_INTRO_FRAMES + 10;
    expect(bossIntroPct(s)).toBe(1); // capped
  });

  it('hpFraction reflects current HP', () => {
    const s = newBossState(28);
    expect(bossHpFraction(s)).toBe(1);
    s.hp = 14;
    expect(bossHpFraction(s)).toBeCloseTo(0.5);
    s.hp = 0;
    expect(bossHpFraction(s)).toBe(0);
  });
});

describe('tickBossState', () => {
  it('counts intro frames and transitions to fight after BOSS_INTRO_FRAMES', () => {
    const s = newBossState(28);
    // tick BOSS_INTRO_FRAMES - 1 times: still in intro
    for (let i = 0; i < BOSS_INTRO_FRAMES - 1; i++) {
      const r = tickBossState(s);
      expect(r).toBe('fighting');
      expect(s.phase).toBe('intro');
    }
    // one more tick: intro ends
    const r = tickBossState(s);
    expect(r).toBe('intro_done');
    expect(s.phase).toBe('fight');
  });

  it('returns fighting while in fight phase', () => {
    const s = newBossState(28);
    s.phase = 'fight';
    expect(tickBossState(s)).toBe('fighting');
  });

  it('returns dead and does not change state when already dead', () => {
    const s = newBossState(28);
    s.phase = 'dead';
    expect(tickBossState(s)).toBe('dead');
    expect(s.phase).toBe('dead');
  });

  it('counts down invuln and flash each step', () => {
    const s = newBossState(28);
    s.phase = 'fight';
    s.invuln = 3;
    s.flash = 2;
    tickBossState(s);
    expect(s.invuln).toBe(2);
    expect(s.flash).toBe(1);
    tickBossState(s);
    expect(s.invuln).toBe(1);
    expect(s.flash).toBe(0);
  });
});

describe('hurtBoss', () => {
  it('ignores damage during intro', () => {
    const s = newBossState(28);
    expect(hurtBoss(s, 5)).toBe('ignored');
    expect(s.hp).toBe(28);
  });

  it('hurts the boss and starts i-frames', () => {
    const s = newBossState(28);
    s.phase = 'fight';
    expect(hurtBoss(s, 5)).toBe('hurt');
    expect(s.hp).toBe(23);
    expect(s.invuln).toBe(BOSS_INVULN_FRAMES);
  });

  it('ignores a second hit while i-frames are active', () => {
    const s = newBossState(28);
    s.phase = 'fight';
    hurtBoss(s, 5);
    expect(hurtBoss(s, 5)).toBe('ignored');
    expect(s.hp).toBe(23);
  });

  it('i-frames expire after BOSS_INVULN_FRAMES ticks', () => {
    const s = newBossState(28);
    s.phase = 'fight';
    hurtBoss(s, 2);
    for (let i = 0; i < BOSS_INVULN_FRAMES; i++) tickBossState(s);
    expect(s.invuln).toBe(0);
    expect(hurtBoss(s, 2)).toBe('hurt');
  });

  it('returns dead and sets phase when HP reaches zero', () => {
    const s = newBossState(10);
    s.phase = 'fight';
    expect(hurtBoss(s, 10)).toBe('dead');
    expect(s.phase).toBe('dead');
    expect(s.hp).toBe(0);
  });

  it('does not go below 0 HP', () => {
    const s = newBossState(10);
    s.phase = 'fight';
    hurtBoss(s, 999);
    expect(s.hp).toBe(0);
  });

  it('ignores damage after death', () => {
    const s = newBossState(10);
    s.phase = 'fight';
    hurtBoss(s, 10); // kills
    expect(hurtBoss(s, 5)).toBe('ignored');
    expect(s.hp).toBe(0);
  });
});

describe('resetBossState', () => {
  it('restores full HP and returns to intro', () => {
    const s = newBossState(28);
    s.phase = 'fight';
    s.hp = 5;
    s.invuln = 10;
    s.flash = 2;
    s.introFrames = 30;
    resetBossState(s);
    expect(s).toMatchObject({ phase: 'intro', hp: 28, invuln: 0, flash: 0, introFrames: 0 });
  });
});
