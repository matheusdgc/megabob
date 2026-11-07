export type WeaponId = 'buster' | 'garbageCollector' | 'mutexLock' | 'nullPointer';
export type BossId = 'memoryLeak' | 'raceCondition' | 'nullPointer' | 'techDebt';

export interface WeaponDef {
  name: string;
  /** Bob's tint while equipped (0xffffff = none). */
  tint: number;
  /** HUD energy bar color and icon. */
  color: number;
  icon: string;
  /** Energy spent per shot (the buster is free). */
  cost: number;
  /** Base damage per hit. */
  damage: number;
}

/** Weapon energy capacity (segments). */
export const WEAPON_MAX_ENERGY = 28;

/** Cycle order for Q/E. */
export const WEAPON_ORDER: readonly WeaponId[] = ['buster', 'garbageCollector', 'mutexLock', 'nullPointer'];

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  buster: { name: 'BUSTER', tint: 0xffffff, color: 0x4589ff, icon: 'icon_buster', cost: 0, damage: 1 },
  garbageCollector: { name: 'GARBAGE COLLECTOR', tint: 0x9ef0f0, color: 0x08bdba, icon: 'icon_gc', cost: 2, damage: 2 },
  mutexLock: { name: 'MUTEX LOCK', tint: 0xf1c21b, color: 0xf1c21b, icon: 'icon_mutex', cost: 3, damage: 1 },
  nullPointer: { name: 'NULL POINTER', tint: 0xa56eff, color: 0xa56eff, icon: 'icon_null', cost: 2, damage: 2 },
};

/** Weapon each boss drops when defeated. */
export const BOSS_WEAPON: Partial<Record<BossId, WeaponId>> = {
  memoryLeak: 'garbageCollector',
  raceCondition: 'mutexLock',
  nullPointer: 'nullPointer',
};

/** Weakness cycle: Memory Leak -> Mutex Lock, Race Condition -> Null Pointer, Null Pointer -> Garbage Collector. */
export const WEAKNESS: Record<BossId, { weapon: WeaponId; multiplier: number }> = {
  memoryLeak: { weapon: 'mutexLock', multiplier: 2 },
  raceCondition: { weapon: 'nullPointer', multiplier: 2 },
  nullPointer: { weapon: 'garbageCollector', multiplier: 2 },
  techDebt: { weapon: 'buster', multiplier: 1 },
};

/**
 * Damage a hit from `weapon` deals to `boss`: doubled by its weakness. (T22: tripled, the weakness
 * killed a boss in under 2 s even with perfect aim; doubled it still takes a quarter of the time.)
 */
export function damageFor(boss: BossId, weapon: WeaponId, base: number): number {
  const w = WEAKNESS[boss];
  return w.weapon === weapon ? base * w.multiplier : base;
}

// --- Mutex Lock: a padlock bolt that freezes what it hits ---
/** Frames a common enemy stays frozen. */
export const MUTEX_FREEZE_FRAMES = 150;
/** Frames a boss stays frozen: much shorter, and it cannot be frozen again right away. */
export const MUTEX_BOSS_FREEZE_FRAMES = 45;
/** After thawing, a boss ignores the lock this long (no freeze-locking a boss to death). */
export const MUTEX_BOSS_IMMUNE_FRAMES = 120;

/** How long the Mutex Lock holds a target. */
export const freezeFrames = (isBoss: boolean): number => (isBoss ? MUTEX_BOSS_FREEZE_FRAMES : MUTEX_FREEZE_FRAMES);

/** Special-weapon shots allowed on screen at once. */
export const SPECIALS_ON_SCREEN: Partial<Record<WeaponId, number>> = { garbageCollector: 1, mutexLock: 2, nullPointer: 2 };
