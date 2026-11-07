import Phaser from 'phaser';
import { BLOCK_DAMAGE, BLOCK_GRAVITY, SPIKE_SHOT_DAMAGE } from '../data/enemies';

const CULL_MARGIN = 32;

/** The enemy projectiles: what they look like, how hard they hit, whether they fall. */
export const SHOTS = {
  // Heap Crab's memory block: lobbed in an arc
  block: { key: 'memory_block', size: 8, damage: BLOCK_DAMAGE, gravity: BLOCK_GRAVITY },
  // Clock Spike's clock-hand spike: straight
  clockSpike: { key: 'clock_spike_shot', size: 8, damage: SPIKE_SHOT_DAMAGE, gravity: 0 },
} as const;

export type ShotKind = keyof typeof SHOTS;

/** An enemy projectile: flies (or falls in an arc) and breaks on the terrain. */
export class EnemyShot extends Phaser.Physics.Arcade.Sprite {
  readonly damage: number;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, kind: ShotKind, x: number, y: number, vx: number, vy: number) {
    const def = SHOTS[kind];
    super(scene, x, y, def.key, 0);
    this.damage = def.damage;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(1).setFlipX(vx < 0);
    this.body.setSize(def.size, def.size);
    this.body.setAllowGravity(def.gravity > 0);
    this.body.setGravityY(def.gravity);
    this.body.setVelocity(vx, vy);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const view = this.scene.cameras.main.worldView;
    if (this.x < view.left - CULL_MARGIN || this.x > view.right + CULL_MARGIN || this.y > view.bottom + CULL_MARGIN) this.destroy();
  }
}
