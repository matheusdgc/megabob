import Phaser from 'phaser';
import { WEAPONS } from '../../data/weapons';
import { fxAnim } from '../Projectile';

/** Bolt speed, px/s. */
export const MUTEX_SPEED = 230;
const CULL_MARGIN = 24;

/**
 * Mutex Lock bolt: a spinning padlock that flies straight and locks the first enemy it hits
 * (the stage freezes it; see StageScene.hitWithSpecial). It does not pierce.
 */
export class MutexBolt extends Phaser.Physics.Arcade.Sprite {
  readonly weapon = 'mutexLock' as const;
  readonly damage = WEAPONS.mutexLock.damage;
  readonly pierces = false;
  private hit = false;

  declare body: Phaser.Physics.Arcade.Body;

  fire(x: number, y: number, dir: 1 | -1): void {
    this.hit = false;
    this.enableBody(true, x + dir * 8, y, true, true);
    this.setTexture('fx_mutex', 0).setDepth(1);
    this.play(fxAnim(this.scene, 'fx_mutex', 10));
    this.setFlipX(dir < 0);
    this.body.setAllowGravity(false);
    this.body.setSize(12, 12);
    this.body.setVelocity(dir * MUTEX_SPEED, 0);
  }

  /** True once: the bolt stops at its first target. */
  firstHit(_target: object): boolean {
    if (this.hit) return false;
    this.hit = true;
    return true;
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const view = this.scene.cameras.main.worldView;
    if (this.x < view.left - CULL_MARGIN || this.x > view.right + CULL_MARGIN) this.disableBody(true, true);
  }
}
