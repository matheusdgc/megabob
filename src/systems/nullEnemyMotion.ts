import { DANGLE_LENGTH, DANGLE_PERIOD } from '../data/enemies';
import { NULL_ENEMY_ART } from '../data/tuning';
import { dangleAngle, dangleFrame } from './enemyAI';

/** Absolute hover offset: sampling it never accumulates drift after a teleport. */
export function eyeHover(tick: number, phase: number): number {
  const time = (tick + phase) % NULL_ENEMY_ART.hoverPeriod;
  return Math.round(Math.sin(time / NULL_ENEMY_ART.hoverPeriod * Math.PI * 2) * NULL_ENEMY_ART.hoverHeight) || 0;
}

/** Source crop centers of the three original claw drawings (the chain is articulated). */
const CLAW_X = [8, 11, 14] as const;
export function danglingPose(tick: number, phase: number, pivotX: number, pivotY: number) {
  const angle = dangleAngle((tick + phase) % DANGLE_PERIOD);
  const frame = dangleFrame(angle);
  const x = Math.round(pivotX + Math.sin(angle) * DANGLE_LENGTH) || 0;
  const y = Math.round(pivotY + Math.cos(angle) * DANGLE_LENGTH) || 0;
  return { frame, x, y, cropX: CLAW_X[frame], cropY: 24, width: 18, height: 16,
    // Preserve the 40x48 source cell; translate its crop center to the pendulum tip.
    spriteX: x + 20 - (CLAW_X[frame] + 9), spriteY: y + 16 };
}

/** Discrete pixel links at even distances along the same line as the claw body. */
export function chainLinks(pivotX: number, pivotY: number, tipX: number, tipY: number) {
  const count = Math.ceil(DANGLE_LENGTH / NULL_ENEMY_ART.chainLink);
  return Array.from({ length: count }, (_, i) => {
    const t = i / count;
    return { x: Math.round(pivotX + (tipX - pivotX) * t), y: Math.round(pivotY + (tipY - pivotY) * t) };
  });
}
