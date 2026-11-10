export type PickupKind = 'healthSmall' | 'healthLarge' | 'energySmall' | 'energyLarge' | 'life';

export interface PickupDef {
  sheet: string;
  /** Health or weapon energy restored; for `life`, lives gained. */
  amount: number;
}

export const PICKUPS: Record<PickupKind, PickupDef> = {
  healthSmall: { sheet: 'pickup_health_small', amount: 2 },
  healthLarge: { sheet: 'pickup_health_large', amount: 8 },
  energySmall: { sheet: 'pickup_energy_small', amount: 2 },
  energyLarge: { sheet: 'pickup_energy_large', amount: 8 },
  life: { sheet: 'pickup_life', amount: 1 },
};

/** Lives cap (the HUD shows one digit). */
export const MAX_LIVES = 9;
/** A dropped pickup vanishes after this many frames, blinking during the last stretch. */
export const PICKUP_LIFETIME = 300;
export const PICKUP_BLINK_FRAMES = 90;

/** Drop chances when an enemy is destroyed, in percent; the rest drops nothing. */
export const DROP_TABLE: readonly (readonly [PickupKind, number])[] = [
  ['healthSmall', 24],   // was 16
  ['energySmall', 20],   // was 12
  ['healthLarge', 8],    // was 5
  ['energyLarge', 6],    // was 4
  ['life', 1],
];

/** Which pickup an enemy drops for a roll in [0, 1), or null for nothing. */
export function rollDrop(roll: number): PickupKind | null {
  let acc = 0;
  for (const [kind, pct] of DROP_TABLE) {
    acc += pct / 100;
    if (roll < acc) return kind;
  }
  return null;
}
