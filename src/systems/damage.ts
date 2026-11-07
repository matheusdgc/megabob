import { BOB_MAX_HP, INVULN_FRAMES, START_LIVES } from '../data/tuning';

export interface Health {
  hp: number;
  max: number;
  /** Frames of invulnerability left. */
  invuln: number;
  lives: number;
  dead: boolean;
}

export type HitResult = 'ignored' | 'hurt' | 'dead';

export const newHealth = (max = BOB_MAX_HP, lives = START_LIVES): Health => ({
  hp: max,
  max,
  invuln: 0,
  lives,
  dead: false,
});

/** Damage after the Firewall Plating halves it (rounded up, so a hit always hurts). */
export function damageTaken(amount: number, plated: boolean): number {
  if (amount <= 0) return 0;
  return plated ? Math.ceil(amount / 2) : amount;
}

/** A hit from an enemy, shot or hazard. Ignored while invulnerable or dead. */
export function hit(h: Health, amount: number, opts: { plated: boolean }): HitResult {
  if (h.dead || h.invuln > 0) return 'ignored';
  const dmg = damageTaken(amount, opts.plated);
  if (dmg === 0) return 'ignored';
  h.hp = Math.max(0, h.hp - dmg);
  if (h.hp === 0) return kill(h);
  h.invuln = INVULN_FRAMES;
  return 'hurt';
}

/** Instant death (bottomless pit, or spikes when not invulnerable). */
export function kill(h: Health): 'dead' {
  h.hp = 0;
  h.dead = true;
  h.invuln = 0;
  return 'dead';
}

/** Restores health (pickups); returns how much was actually gained. */
export function heal(h: Health, amount: number): number {
  if (h.dead) return 0;
  const before = h.hp;
  h.hp = Math.min(h.max, h.hp + Math.max(0, amount));
  return h.hp - before;
}

/** Once per frame: counts the invulnerability down. */
export function tickHealth(h: Health): void {
  if (h.invuln > 0) h.invuln--;
}

/**
 * After the death animation: spends a life. Returns 'respawn' with full health, or
 * 'gameOver' when that was the last life (lives reset for the next attempt).
 */
export function loseLife(h: Health): 'respawn' | 'gameOver' {
  h.lives--;
  const over = h.lives <= 0;
  if (over) h.lives = START_LIVES;
  h.hp = h.max;
  h.dead = false;
  h.invuln = 0;
  return over ? 'gameOver' : 'respawn';
}
