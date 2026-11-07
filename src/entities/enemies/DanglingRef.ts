import Phaser from 'phaser';
import { NULL_ENEMY_ART } from '../../data/tuning';
import { chainLinks, danglingPose } from '../../systems/nullEnemyMotion';
import { Enemy, type EnemyWorld } from '../Enemy';

const TILE = 16;

/**
 * E8 Dangling Ref (Null Pointer): a claw on a broken chain, swinging like a pendulum from the
 * ceiling. Pixel links connect the pivot to the cropped original claw and its hitbox.
 * Its marker goes in the cell right under the ceiling.
 */
export class DanglingRef extends Enemy {
  readonly solid = false;
  private frames = 0;
  private readonly phase: number;
  private readonly pivotX: number;
  private readonly pivotY: number;
  private readonly chainPixels: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld) {
    super(scene, x, y, 'danglingRef', world);
    this.pivotX = x;
    this.pivotY = y - TILE;
    this.phase = Math.floor(x / TILE) * 13; // neighbours swing out of step
    this.body.setAllowGravity(false);
    // The articulated pose owns the transform; Arcade must not apply its delta again.
    this.body.moves = false;
    this.chainPixels = scene.add.graphics().setDepth(this.depth - 0.1);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.chainPixels.destroy());
    this.place();
  }

  protected think(): void {
    this.frames++;
    this.place();
  }

  private place(): void {
    const pose = danglingPose(this.frames, this.phase, this.pivotX, this.pivotY);
    this.setFrame(pose.frame).setCrop(pose.cropX, pose.cropY, pose.width, pose.height);
    this.setPosition(pose.spriteX, pose.spriteY);
    const [w, h] = this.stats.body;
    this.body.setOffset(pose.cropX + (pose.width - w) / 2, pose.cropY + (pose.height - h) / 2);
    this.body.updateFromGameObject();
    const g = this.chainPixels.clear(), art = NULL_ENEMY_ART;
    for (const [i, link] of chainLinks(this.pivotX, this.pivotY, pose.x, pose.y).entries()) {
      g.fillStyle(art.chainShadow).fillRect(link.x - 1, link.y, 3, 3);
      g.fillStyle(i % 2 ? art.chainLight : art.cyan).fillRect(link.x, link.y, 1, 2);
    }
    g.fillStyle(art.chainLight).fillRect(this.pivotX - 2, this.pivotY - 1, 5, 2);
  }
}
