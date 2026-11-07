import Phaser from 'phaser';
import { WEAPONS } from '../../data/weapons';
import { gcMotion } from '../../systems/specialShots';
import { fxAnim } from '../Projectile';

/** Only one orb on screen at a time. */
export const GC_MAX_ON_SCREEN = 1;
const CULL_MARGIN = 24;

/**
 * Garbage Collector orb: a teal vortex that grows out of the cannon while it gathers speed, then
 * sweeps forward in a slow wave (gcMotion). It passes through enemies (hitting each one once)
 * and swallows enemy projectiles it touches. The stage wires those overlaps.
 */
export class GcOrb extends Phaser.Physics.Arcade.Sprite {
  readonly weapon = 'garbageCollector' as const;
  readonly damage = WEAPONS.garbageCollector.damage;
  /** Passes through what it hits (each target once). */
  readonly pierces = true;
  private readonly hits = new Set<object>();
  private frames = 0;
  private dir: 1 | -1 = 1;

  declare body: Phaser.Physics.Arcade.Body;

  fire(x: number, y: number, dir: 1 | -1): void {
    this.hits.clear();
    this.frames = 0;
    this.dir = dir;
    this.enableBody(true, x + dir * 6, y, true, true);
    this.setTexture('fx_gc', 0).setDepth(1);
    this.play(fxAnim(this.scene, 'fx_gc', 14));
    this.setFlipX(dir < 0);
    this.body.setAllowGravity(false);
    this.body.setSize(18, 18);
    this.apply();
  }

  /** One fixed step (Player.step calls it). */
  step(): void {
    this.frames++;
    this.apply();
  }

  private apply(): void {
    const m = gcMotion(this.frames);
    this.setScale(m.scale);
    this.body.setVelocity(this.dir * m.speed, m.vy);
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
