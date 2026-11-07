/** Visual frame selection only; attack timers, motion and damage remain with the boss. */
export type MemoryLeakArtState =
  | 'idle_enter' | 'volley' | 'volley_wait' | 'dive' | 'lurk' | 'rise' | 'fury_volley' | 'fury_wait';

export function memoryLeakFrame(
  state: MemoryLeakArtState,
  tick: number,
  timing: { burstInterval: number; sinkFrames: number },
  flashing = false,
): number {
  if (flashing) return 6;
  if (state === 'dive') return tick < timing.sinkFrames / 2 ? 3 : 4;
  if (state === 'lurk') return 4;
  if (state === 'rise') return 5;
  const burstTick = tick % timing.burstInterval;
  if ((state === 'volley' || state === 'fury_volley') && burstTick >= 1 && burstTick <= 8) return 2;
  return Math.floor(tick / 15) % 2;
}

/** Bubble wobble at 10 fps; slower puddle bubbles at 6 fps on the fixed 60 Hz step. */
export const memoryGooFrame = (tick: number, puddle: boolean): number => Math.floor(tick / (puddle ? 10 : 6)) % 2;
