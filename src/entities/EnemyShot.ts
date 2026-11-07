import Phaser from 'phaser';
import { PHYSICS_FPS } from '../config';
import { BLOCK_DAMAGE, BLOCK_GRAVITY, CARD_DAMAGE, CURSOR_DAMAGE, SPIKE_SHOT_DAMAGE } from '../data/enemies';
import { NULL_ENEMY_ART } from '../data/tuning';
import { loopAnim } from './effects';
import { hostileCursorPose } from '../systems/projectileArt';

const CULL_MARGIN = 32;

/** The enemy projectiles: what they look like, how hard they hit, whether they fall. */
export const SHOTS = {
  // Heap Crab's memory block: lobbed in an arc
  block: { key: 'memory_block', size: 8, damage: BLOCK_DAMAGE, gravity: BLOCK_GRAVITY },
  // Clock Spike's clock-hand spike: straight
  clockSpike: { key: 'clock_spike_shot', size: 8, damage: SPIKE_SHOT_DAMAGE, gravity: 0 },
  // Void Eye's cursor: straight, aimed
  cursor: { key: 'null_cursor', size: 10, damage: CURSOR_DAMAGE, gravity: 0 },
  // Legacy Turret's punched card: straight, aimed
  card: { key: 'tech_card', size: 8, damage: CARD_DAMAGE, gravity: 0 },
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
    if (kind === 'cursor') {
      const pose = hostileCursorPose(vx,vy);
      this.setFlipX(pose.flipX).setRotation(pose.rotation);
      this.play(loopAnim(scene, def.key, [0, 1], PHYSICS_FPS / NULL_ENEMY_ART.cursorFrameTicks));
    }
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const view = this.scene.cameras.main.worldView;
    if (this.x < view.left - CULL_MARGIN || this.x > view.right + CULL_MARGIN || this.y > view.bottom + CULL_MARGIN) this.destroy();
  }
}
