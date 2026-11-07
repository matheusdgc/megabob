import Phaser from 'phaser';
import { WEAPONS } from '../../data/weapons';
import { fxAnim } from '../Projectile';

/** Orb speed (slower than the buster), px/s. */
export const GC_SPEED = 150;
/** Only one orb on screen at a time. */
export const GC_MAX_ON_SCREEN = 1;
const CULL_MARGIN = 24;

/**
 * Garbage Collector orb: a slow teal vortex that passes through enemies (hitting each one
 * once) and swallows enemy projectiles it touches. The stage wires those overlaps.
 */
export class GcOrb extends Phaser.Physics.Arcade.Sprite {
  readonly weapon = 'garbageCollector' as const;
  readonly damage = WEAPONS.garbageCollector.damage;
  /** Passes through what it hits (each target once). */
  readonly pierces = true;
  private readonly hits = new Set<object>();

  declare body: Phaser.Physics.Arcade.Body;

  fire(x: number, y: number, dir: 1 | -1): void {
    this.hits.clear();
    this.enableBody(true, x + dir * 10, y, true, true);
    this.setTexture('fx_gc', 0).setDepth(1);
    this.play(fxAnim(this.scene, 'fx_gc', 14));
    this.setFlipX(dir < 0);
    this.body.setAllowGravity(false);
    this.body.setSize(18, 18);
    this.body.setVelocity(dir * GC_SPEED, 0);
  }

  /** True the first time this orb touches `target` (it pierces, but hits each target once). */
  firstHit(target: object): boolean {
    if (this.hits.has(target)) return false;
    this.hits.add(target);
    return true;
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const view = this.scene.cameras.main.worldView;
    if (this.x < view.left - CULL_MARGIN || this.x > view.right + CULL_MARGIN) this.disableBody(true, true);
  }
}
