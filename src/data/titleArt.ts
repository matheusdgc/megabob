/** 16-bit title art: logical game pixels and milliseconds, independent of gameplay. */
export const TITLE_ART = {
  logo: { x: 16, y: 8, scale: 2, rise: 10, entranceMs: 420 },
  bob: { x: 80, feetY: 214, scale: 2 },
  rain: { count: 28, top: 112, bottom: 252, speed: 44, color: 0x4589ff, alpha: 0.24 },
  shine: { firstMs: 2200, periodMs: 7200, sweepMs: 1000, width: 22, color: 0xa6c8ff, alpha: 0.38 },
} as const;
