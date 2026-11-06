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
  memoryLeak: { weapon: 'mutexLock', multiplier: 3 },
  raceCondition: { weapon: 'nullPointer', multiplier: 3 },
  nullPointer: { weapon: 'garbageCollector', multiplier: 3 },
  techDebt: { weapon: 'buster', multiplier: 1 },
};

/** Damage a hit from `weapon` deals to `boss`: tripled by its weakness. */
export function damageFor(boss: BossId, weapon: WeaponId, base: number): number {
  const w = WEAKNESS[boss];
  return w.weapon === weapon ? base * w.multiplier : base;
}
