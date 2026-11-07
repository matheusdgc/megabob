import Phaser from 'phaser';
import { SPECIAL_SHOTS } from '../../data/tuning';
import { WEAPONS } from '../../data/weapons';
import { nullHop } from '../../systems/specialShots';
import { playOnce } from '../effects';
import { fxAnim } from '../Projectile';

const NULL = SPECIAL_SHOTS.nullPointer;
const CULL_MARGIN = 24;
/** Sprite and hitbox: the hitbox trails back over the gap of the last hop, so a hop never skips a target. */
const WIDTH = 24;
const BODY_FRONT = 6;

/**
 * Null Pointer shot: a cursor that never travels. It glitches out of the cannon and appears a
 * little ahead, then only teleports forward in short hops (nullHop), and passes through thin
 * walls (the stage stops every other shot at them). It stops at its first target.
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
    playOnce(this.scene, 'fx_null_glitch', x + dir * 6, y, 20);
    this.enableBody(true, x + dir * NULL.spawnAhead, y, true, true);
    this.setTexture('fx_null', 0).setDepth(1);
    this.play(fxAnim(this.scene, 'fx_null', 14));
    this.setFlipX(dir < 0);
    this.body.setAllowGravity(false);
    this.body.setVelocity(0, 0);
    // the body covers the cursor's tip and the gap it just jumped over
    const w = NULL.hopPx + BODY_FRONT * 2;
    this.body.setSize(w, 10);
    this.body.setOffset(dir > 0 ? WIDTH / 2 + BODY_FRONT - w : WIDTH / 2 - BODY_FRONT, 1);
  }

  /** One fixed step (Player.step calls it). */
  step(): void {
    const hop = nullHop(++this.frames);
    if (!hop) return;
    playOnce(this.scene, 'fx_null_glitch', this.x, this.y, 20).setAlpha(0.6);
    this.x += this.dir * hop;
  }

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
