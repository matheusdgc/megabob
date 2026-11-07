import Phaser from 'phaser';
import { CURSOR_SPEED, EYE_WIDE_FRAMES } from '../../data/enemies';
import { NULL_ENEMY_ART } from '../../data/tuning';
import { type Eye, newEye, stepEye } from '../../systems/enemyAI';
import { eyeHover } from '../../systems/nullEnemyMotion';
import { Enemy, type EnemyWorld } from '../Enemy';

/** E7 Void Eye (Null Pointer): floats, opens its eye, shoots a cursor, blinks out and back. */
export class VoidEye extends Enemy {
  readonly solid = false;
  private readonly ai: Eye;
  private readonly pixels: Phaser.GameObjects.Graphics;
  private anchorX: number;
  private anchorY: number;
  private tick = 0;
  private pulse = 0;
  private returning = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld) {
    super(scene, x, y, 'voidEye', world);
    this.body.setAllowGravity(false);
    const [w, h] = this.stats.body;
    this.body.setOffset((this.width - w) / 2, (this.height - h) / 2);
    // Kinematic hover/teleport, with overlap detection but no second integration.
    this.body.moves = false;
    this.ai = newEye(x, y);
    this.anchorX = x;
    this.anchorY = y;
    this.pixels = scene.add.graphics().setDepth(this.depth + 0.1);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.pixels.destroy());
  }

  protected think(): void {
    const bob = this.world.bob();
    const b = this.body;
    const out = stepEye(this.ai, bob ? { dx: bob.x - b.center.x, dy: bob.y - b.center.y } : null, Math.random);
    this.tick++;
    this.setFrame(out.frame).setAlpha(out.solid ? 1 : 0);
    if (out.moveTo) {
      this.anchorX = out.moveTo.x;
      this.anchorY = out.moveTo.y;
      this.returning = NULL_ENEMY_ART.returnFrames;
    }
    this.setPosition(Math.round(this.anchorX), Math.round(this.anchorY) + eyeHover(this.tick, this.ai.homeX));
    b.updateFromGameObject();
    // gone: no body, so shots pass and it cannot touch Bob
    b.enable = out.solid;
    if (out.fire && bob) {
      this.pulse = NULL_ENEMY_ART.pulseFrames;
      const a = Math.atan2(bob.y - b.center.y, bob.x - b.center.x);
      this.world.shoot('cursor', b.center.x, b.center.y, Math.cos(a) * CURSOR_SPEED, Math.sin(a) * CURSOR_SPEED);
    }
    this.drawFeedback(out.frame);
  }

  private drawFeedback(frame: number): void {
    const g = this.pixels.clear(), art = NULL_ENEMY_ART;
    const x = Math.round(this.body.center.x), y = Math.round(this.body.center.y);
    if (frame === 1) {
      const progress = Math.min(1, this.ai.frames / EYE_WIDE_FRAMES);
      const r = Math.round(art.chargeRadius + (art.chargeEndRadius - art.chargeRadius) * progress);
      for (const [dx, dy] of [[-r, 0], [r, 0], [0, -r], [0, r]] as const) {
        g.fillStyle(art.amber).fillRect(x + dx - 1, y + dy - 1, 2, 2);
      }
    }
    if (frame === 2) {
      // Short, stable pixel fragments mark dematerialization without a screen flash.
      const offset = (this.ai.frames % 3) * 2;
      g.fillStyle(art.amber).fillRect(x - 14 - offset, y - 5, 4, 1);
      g.fillStyle(art.cream).fillRect(x + 10 + offset, y + 4, 3, 1);
    }
    for (const [timer, duration, color] of [[this.pulse, art.pulseFrames, art.cream], [this.returning, art.returnFrames, art.amber]] as const) {
      if (!timer) continue;
      const r = Math.round(art.burstStartRadius + (1 - timer / duration) * art.burstTravel);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        g.fillStyle(color).fillRect(x + Math.round(Math.cos(a) * r), y + Math.round(Math.sin(a) * r), 1, 1);
      }
    }
    if (this.pulse > 0) this.pulse--;
    if (this.returning > 0) this.returning--;
  }
}
