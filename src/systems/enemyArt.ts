import { COMBAT_ART } from '../data/tuning';
import type { CrabState, RunnerState, SpikeState } from './enemyAI';

/** Release the raised pincer after throwing; attack timing stays in the AI. */
export function crabArtFrame(state: CrabState, frames: number, original: number): number {
  return state === 'recover' && frames >= COMBAT_ART.recoverArmFrames ? 0 : original;
}

/** Slow warning pose alternation without changing a single attack/velocity tick. */
export function warningArtFrame(state: RunnerState | SpikeState, frames: number, original: number): number {
  if (state === 'rev') return Math.floor(frames / COMBAT_ART.warningFrameTicks) % 2 ? 1 : 2;
  if (state === 'charge') return Math.floor(frames / COMBAT_ART.warningFrameTicks) % 2 ? 0 : 1;
  return original;
}
