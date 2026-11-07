import Phaser from 'phaser';
import { WEAPONS } from '../../data/weapons';
import { playOnce } from '../effects';
import { fxAnim } from '../Projectile';

/** Cruise speed, px/s, and the short teleport hop it makes every HOP_FRAMES. */
export const NULL_SHOT_SPEED = 170;
const HOP_FRAMES = 16;
const HOP_PX = 26;
const CULL_MARGIN = 24;

/**
 * Null Pointer shot: a cursor bolt that skips forward in short teleport hops and passes
 * through thin walls (the stage stops every other shot at them). It stops at its first target.
 */
export class NullPointerShot extends Phaser.Physics.Arcade.Sprite {
  readonly weapon = 'nullPointer' as const;
  readonly damage = WEAPONS.nullPointer.damage;
  readonly pierces = false;
  private hit = false;
  private frames = 0;
  private dir: 1 | -1 = 1;

  declare body: Phaser.Physics.Arcade.Body;

  fire(x: number, y: number, dir: 1 | -1): void {
    this.hit = false;
    this.frames = 0;
    this.dir = dir;
    this.enableBody(true, x + dir * 10, y, true, true);
    this.setTexture('fx_null', 0).setDepth(1);
    this.play(fxAnim(this.scene, 'fx_null', 14));
    this.setFlipX(dir < 0);
    this.body.setAllowGravity(false);
    this.body.setSize(16, 10);
    this.body.setVelocity(dir * NULL_SHOT_SPEED, 0);
  }

  firstHit(_target: object): boolean {
    if (this.hit) return false;
    this.hit = true;
    return true;
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    if (++this.frames % HOP_FRAMES === 0) {
      playOnce(this.scene, 'fx_null_glitch', this.x, this.y, 20);
      this.x += this.dir * HOP_PX;
    }
    const view = this.scene.cameras.main.worldView;
    if (this.x < view.left - CULL_MARGIN || this.x > view.right + CULL_MARGIN) this.disableBody(true, true);
  }
}
