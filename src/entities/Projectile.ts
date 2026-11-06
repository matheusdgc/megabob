import Phaser from 'phaser';
import { FX, type FxKey } from '../data/assets';
import { SHOT_DAMAGE, SHOT_SPEED } from '../data/tuning';
import type { ShotLevel } from '../systems/charge';

/** Off-screen distance at which a shot is recycled. */
const CULL_MARGIN = 16;

const SHOT_SHEETS: Record<ShotLevel, FxKey> = {
  0: 'fx_buster',
  1: 'fx_buster_c1',
  2: 'fx_buster_c2',
  3: 'fx_compiler',
};

/** Creates (once) an animation over every frame of an effect sheet; returns its key. */
export function fxAnim(scene: Phaser.Scene, key: FxKey, fps: number, repeat = -1): string {
  if (!scene.anims.exists(key)) {
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(key, { end: FX[key][0] - 1 }), frameRate: fps, repeat });
  }
  return key;
}

/**
 * One of Bob's buster shots, recycled from a physics group. Flies straight, ignores the
 * terrain and is recycled once it leaves the camera view.
 */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  readonly weapon = 'buster' as const;
  level: ShotLevel = 0;
  damage: number = SHOT_DAMAGE[0];

  declare body: Phaser.Physics.Arcade.Body;

  /** Launch from the cannon tip (x, y) toward `dir`. */
  fire(x: number, y: number, dir: 1 | -1, level: ShotLevel): void {
    const key = SHOT_SHEETS[level];
    const [, w, h] = FX[key];
    this.level = level;
    this.damage = SHOT_DAMAGE[level];
    // the shot's tail starts at the cannon tip
    this.enableBody(true, x + dir * (w / 2 - 2), y, true, true);
    this.setTexture(key, 0);
    this.play(fxAnim(this.scene, key, 12));
    this.setFlipX(dir < 0);
    this.body.setAllowGravity(false);
    this.body.setSize(w, h);
    this.body.setVelocity(dir * SHOT_SPEED[level], 0);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const view = this.scene.cameras.main.worldView;
    if (this.x < view.left - CULL_MARGIN || this.x > view.right + CULL_MARGIN) this.disableBody(true, true);
  }
}
