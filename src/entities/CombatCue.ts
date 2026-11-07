import Phaser from 'phaser';
import { COMBAT_ART } from '../data/tuning';

export interface CueSignal {
  x: number;
  y: number;
  color: number;
  charge?: number;
  release?: boolean;
  trail?: { x: number; y: number };
}

/** Small fixed-tick pixel cues: no camera shake, tween, blur or global flash. */
export class CombatCue {
  readonly graphics: Phaser.GameObjects.Graphics;
  private pulse = 0;
  private tick = 0;

  constructor(owner: Phaser.GameObjects.Sprite) {
    this.graphics = owner.scene.add.graphics().setDepth(owner.depth + 0.1);
    owner.once(Phaser.GameObjects.Events.DESTROY, () => this.graphics.destroy());
  }

  clear(): void {
    this.pulse = 0;
    this.graphics.clear();
  }

  step(signal: CueSignal): void {
    const g = this.graphics.clear(), art = COMBAT_ART;
    const x = Math.round(signal.x), y = Math.round(signal.y);
    this.tick++;
    if (signal.release) this.pulse = art.releaseFrames;
    g.fillStyle(signal.color);
    if (signal.charge !== undefined) {
      const progress = Math.max(0, Math.min(1, signal.charge));
      const radius = Math.round(art.chargeRadius + (art.chargeEndRadius - art.chargeRadius) * progress);
      for (const [dx, dy] of [[-radius, 0], [radius, 0], [0, -radius], [0, radius]] as const) g.fillRect(x + dx, y + dy, 2, 1);
    }
    if (signal.trail) {
      const { x: dx, y: dy } = signal.trail;
      for (let i = 0; i < 3; i++) {
        const distance = art.trailStart + i * art.trailSpacing + this.tick % art.trailPhases;
        g.fillRect(Math.round(x - dx * distance), Math.round(y - dy * distance), dx ? art.trailLength : 1, dy ? art.trailLength : 1);
      }
    }
    if (this.pulse) {
      const radius = Math.round(art.releaseStartRadius + (1 - this.pulse / art.releaseFrames) * art.releaseTravel);
      for (let i = 0; i < art.releasePoints; i++) {
        const angle = i / art.releasePoints * Math.PI * 2;
        g.fillRect(x + Math.round(Math.cos(angle) * radius), y + Math.round(Math.sin(angle) * radius), 2, 1);
      }
      this.pulse--;
    }
  }
}
