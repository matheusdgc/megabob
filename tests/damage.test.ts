import { describe, expect, it } from 'vitest';
import { BOB_MAX_HP, INVULN_FRAMES, START_LIVES } from '../src/data/tuning';
import { damageTaken, heal, hit, kill, loseLife, newHealth, tickHealth } from '../src/systems/damage';

const plain = { plated: false };

describe('damageTaken', () => {
  it('the Firewall Plating halves damage, rounding up', () => {
    expect(damageTaken(4, false)).toBe(4);
    expect(damageTaken(4, true)).toBe(2);
    expect(damageTaken(3, true)).toBe(2);
    expect(damageTaken(1, true)).toBe(1);
    expect(damageTaken(0, true)).toBe(0);
  });
});

describe('hit', () => {
  it('takes damage and starts invulnerability', () => {
    const h = newHealth();
    expect(hit(h, 4, plain)).toBe('hurt');
    expect(h.hp).toBe(BOB_MAX_HP - 4);
    expect(h.invuln).toBe(INVULN_FRAMES);
  });

  it('ignores hits while invulnerable, until it wears off', () => {
    const h = newHealth();
    hit(h, 4, plain);
    expect(hit(h, 4, plain)).toBe('ignored');
    for (let i = 0; i < INVULN_FRAMES; i++) tickHealth(h);
    expect(h.invuln).toBe(0);
    expect(hit(h, 4, plain)).toBe('hurt');
    expect(h.hp).toBe(BOB_MAX_HP - 8);
  });

  it('applies the plating', () => {
    const h = newHealth();
    hit(h, 6, { plated: true });
    expect(h.hp).toBe(BOB_MAX_HP - 3);
  });

  it('dies at zero health and then ignores hits', () => {
    const h = newHealth(10);
    expect(hit(h, 12, plain)).toBe('dead');
    expect(h).toMatchObject({ hp: 0, dead: true });
    expect(hit(h, 1, plain)).toBe('ignored');
  });
});

describe('kill and heal', () => {
  it('kill is instant even at full health', () => {
    const h = newHealth();
    expect(kill(h)).toBe('dead');
    expect(h.hp).toBe(0);
  });

  it('heal caps at max and reports the gain; the dead do not heal', () => {
    const h = newHealth(28);
    hit(h, 10, plain);
    expect(heal(h, 4)).toBe(4);
    expect(heal(h, 100)).toBe(6);
    expect(h.hp).toBe(28);
    kill(h);
    expect(heal(h, 10)).toBe(0);
  });
});

describe('loseLife', () => {
  it('respawns with full health until the last life, then game over', () => {
    const h = newHealth();
    for (let i = 1; i < START_LIVES; i++) {
      kill(h);
      expect(loseLife(h)).toBe('respawn');
      expect(h).toMatchObject({ hp: h.max, dead: false, lives: START_LIVES - i });
    }
    kill(h);
    expect(loseLife(h)).toBe('gameOver');
    expect(h.lives).toBe(START_LIVES); // ready for the next attempt
  });
});
