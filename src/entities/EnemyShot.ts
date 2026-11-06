import Phaser from 'phaser';
import { BLOCK_DAMAGE, BLOCK_GRAVITY } from '../data/enemies';

const CULL_MARGIN = 32;

/** An enemy projectile (the Heap Crab's memory block): falls in an arc, breaks on the terrain. */
export class EnemyShot extends Phaser.Physics.Arcade.Sprite {
  readonly damage = BLOCK_DAMAGE;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number) {
    super(scene, x, y, 'memory_block', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(1);
    this.body.setSize(8, 8);
    this.body.setGravityY(BLOCK_GRAVITY);
    this.body.setVelocity(vx, vy);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const view = this.scene.cameras.main.worldView;
    if (this.x < view.left - CULL_MARGIN || this.x > view.right + CULL_MARGIN || this.y > view.bottom + CULL_MARGIN) this.destroy();
  }
}
