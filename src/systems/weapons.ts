import { WEAPON_MAX_ENERGY, WEAPON_ORDER, WEAPONS, type WeaponId } from '../data/weapons';

/** Bob's weapons: which he owns, which is equipped, and the energy of each special. */
export interface Arsenal {
  owned: WeaponId[];
  current: WeaponId;
  energy: Record<WeaponId, number>;
}

/** The buster is always owned and needs no energy. Specials start full. */
export function newArsenal(owned: readonly WeaponId[] = []): Arsenal {
  const set = new Set<WeaponId>(['buster', ...owned]);
  const energy = {} as Record<WeaponId, number>;
  for (const id of WEAPON_ORDER) energy[id] = WEAPON_MAX_ENERGY;
  return { owned: WEAPON_ORDER.filter((id) => set.has(id)), current: 'buster', energy };
}

/** Q/E: next (dir 1) or previous (dir -1) owned weapon, wrapping around. */
export function cycleWeapon(a: Arsenal, dir: 1 | -1): WeaponId {
  const i = a.owned.indexOf(a.current);
  const n = a.owned.length;
  a.current = a.owned[(i + dir + n) % n]!;
  return a.current;
}

/** Equips a weapon Bob owns (ignored otherwise). */
export function equip(a: Arsenal, id: WeaponId): void {
  if (a.owned.includes(id)) a.current = id;
}

/** Adds a weapon (boss defeated), full of energy. */
export function grant(a: Arsenal, id: WeaponId): void {
  if (!a.owned.includes(id)) {
    const set = new Set([...a.owned, id]);
    a.owned = WEAPON_ORDER.filter((w) => set.has(w));
  }
  a.energy[id] = WEAPON_MAX_ENERGY;
}

/** Spends the equipped weapon's energy for one shot; false (nothing spent) when too low. */
export function spend(a: Arsenal): boolean {
  const cost = WEAPONS[a.current].cost;
  if (cost === 0) return true;
  if (a.energy[a.current] < cost) return false;
  a.energy[a.current] -= cost;
  return true;
}

/**
 * Weapon energy pickup: refills the equipped special, or with the buster equipped the
 * first owned special that is not full. Returns how much was restored.
 */
export function refill(a: Arsenal, amount: number): number {
  const target =
    a.current !== 'buster'
      ? a.current
      : a.owned.find((id) => id !== 'buster' && a.energy[id] < WEAPON_MAX_ENERGY);
  if (!target) return 0;
  const before = a.energy[target];
  a.energy[target] = Math.min(WEAPON_MAX_ENERGY, before + Math.max(0, amount));
  return a.energy[target] - before;
}

/** All specials back to full (respawn after a game over is not this; checkpoints keep energy). */
export function refillAll(a: Arsenal): void {
  for (const id of WEAPON_ORDER) a.energy[id] = WEAPON_MAX_ENERGY;
}
