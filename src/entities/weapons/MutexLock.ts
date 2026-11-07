import Phaser from 'phaser';
import { SPECIAL_SHOTS } from '../../data/tuning';
import { WEAPONS } from '../../data/weapons';
import { pickLockTarget, type Point, steer } from '../../systems/specialShots';
import { playOnce } from '../effects';
import { fxAnim } from '../Projectile';

const CULL_MARGIN = 24;

/** Where the targets are now (the stage hands this to the player). */
export type LockTargets = () => readonly Point[];

/**
 * Mutex Lock bolt: a padlock that clicks shut at the cannon (a lock-shell flash), then flies
 * fast and steers toward the nearest target ahead, keeping that lock until the target is gone.
 * It locks the first enemy it hits (the stage freezes it; see StageScene.hitWithSpecial) and
 * does not pierce.
 */
export class MutexBolt extends Phaser.Physics.Arcade.Sprite {
  readonly weapon = 'mutexLock' as const;
  readonly damage = WEAPONS.mutexLock.damage;
  readonly pierces = false;
  private hit = false;
  private dir: 1 | -1 = 1;
  private targets: LockTargets = () => [];
  private lock?: Point;

  declare body: Phaser.Physics.Arcade.Body;

  fire(x: number, y: number, dir: 1 | -1, targets?: LockTargets): void {
    this.hit = false;
    this.dir = dir;
    this.lock = undefined;
    if (targets) this.targets = targets;
    this.enableBody(true, x + dir * 8, y, true, true);
    this.setTexture('fx_mutex', 0).setDepth(1);
    this.play(fxAnim(this.scene, 'fx_mutex', 10));
    this.setFlipX(dir < 0);
    this.body.setAllowGravity(false);
    this.body.setSize(12, 12);
    this.body.setVelocity(dir * SPECIAL_SHOTS.mutex.speed, 0);
    playOnce(this.scene, 'fx_mutex_shell', x + dir * 8, y, 20).setScale(0.5);
  }

  /** One fixed step (Player.step calls it): keep the lock, or acquire the nearest target ahead. */
  step(): void {
    const all = this.targets();
    const here = { x: this.x, y: this.y };
    // a target it has flown past is let go (it never turns back and circles)
    if (this.lock && (!all.includes(this.lock) || (this.lock.x - here.x) * this.dir <= 0)) this.lock = undefined;
    this.lock ??= pickLockTarget(here, this.dir, all);
    if (!this.lock) return;
    const v = steer(this.body.velocity, here, this.lock);
    this.body.setVelocity(v.x, v.y);
    this.setRotation(Math.atan2(v.y, Math.abs(v.x)) * this.dir);
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
    if (this.x < view.left - CULL_MARGIN || this.x > view.right + CULL_MARGIN || this.y < view.top - CULL_MARGIN || this.y > view.bottom + CULL_MARGIN) {
      this.disableBody(true, true);
    }
  }
}
