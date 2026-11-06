/**
 * Pure boss state logic — no Phaser dependency, fully testable.
 * The Boss sprite class in src/entities/Boss.ts delegates here.
 */

export type BossPhase = 'intro' | 'fight' | 'dead';

export interface BossState {
  phase: BossPhase;
  hp: number;
  maxHp: number;
  invuln: number;
  flash: number;
  introFrames: number;
}

/** Frames for the health-bar intro fill animation. */
export const BOSS_INTRO_FRAMES = 60;
/** I-frame window after a hit. */
export const BOSS_INVULN_FRAMES = 20;
/** Hit-flash duration. */
export const BOSS_FLASH_FRAMES = 3;

export function newBossState(maxHp: number): BossState {
  return { phase: 'intro', hp: maxHp, maxHp, invuln: 0, flash: 0, introFrames: 0 };
}

/** Progress 0–1 for the intro fill animation. */
export function bossIntroPct(s: BossState): number {
  return Math.min(1, s.introFrames / BOSS_INTRO_FRAMES);
}

/** Fraction of max HP remaining. */
export function bossHpFraction(s: BossState): number {
  return s.hp / s.maxHp;
}

export type BossTickResult = 'intro_done' | 'fighting' | 'dead';

/**
 * One fixed step of the boss state machine. Returns:
 *  - 'intro_done' on the frame the intro ends (callers can play a jingle)
 *  - 'fighting'   while the boss is active
 *  - 'dead'       when phase is already dead
 */
export function tickBossState(s: BossState): BossTickResult {
  if (s.phase === 'dead') return 'dead';
  if (s.flash > 0) s.flash--;
  if (s.invuln > 0) s.invuln--;
  if (s.phase === 'intro') {
    s.introFrames++;
    if (s.introFrames >= BOSS_INTRO_FRAMES) {
      s.phase = 'fight';
      return 'intro_done';
    }
  }
  return 'fighting';
}

export type BossHurtResult = 'ignored' | 'hurt' | 'dead';

/**
 * Apply damage to the boss. Returns:
 *  - 'ignored' if not in fight phase or within i-frames
 *  - 'hurt'    if damaged but alive
 *  - 'dead'    if HP reached zero
 */
export function hurtBoss(s: BossState, damage: number): BossHurtResult {
  if (s.phase !== 'fight' || s.invuln > 0) return 'ignored';
  s.hp -= damage;
  if (s.hp <= 0) {
    s.hp = 0;
    s.phase = 'dead';
    return 'dead';
  }
  s.flash = BOSS_FLASH_FRAMES;
  s.invuln = BOSS_INVULN_FRAMES;
  return 'hurt';
}

/** Restart the encounter (Bob died). */
export function resetBossState(s: BossState): void {
  s.phase = 'intro';
  s.hp = s.maxHp;
  s.invuln = 0;
  s.flash = 0;
  s.introFrames = 0;
}
