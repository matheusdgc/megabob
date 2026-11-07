import Phaser from 'phaser';
import { ENEMIES, type EnemyStats, HIT_FLASH_FRAMES } from '../data/enemies';
import type { EnemyKind } from '../stages/map';
import { playOnce } from './effects';
import type { ShotKind } from './EnemyShot';

/** What enemies may ask the stage about the world around them. */
export interface EnemyWorld {
  /** Solid ground (or a one-way platform top) at this world point. */
  floorAt(x: number, y: number): boolean;
  /** Bob's hitbox center, or null while he is dead. */
  bob(): { x: number; y: number } | null;
  /** Launch an enemy projectile from (x, y). */
  shoot(kind: ShotKind, x: number, y: number, vx: number, vy: number): void;
}

/**
 * Base enemy: health, contact damage, white hit flash and the explosion on death.
 * Position (x, y) is the feet (bottom-center). Subclasses implement `think()`, run once per
 * fixed logic step by the stage.
 */
export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly stats: EnemyStats;
  hp: number;
  /** Walkers collide with the terrain; flyers pass through it. */
  abstract readonly solid: boolean;
  private flash = 0;
  /** Frames left frozen by the Mutex Lock, and whether gravity was on before. */
  private frozen = 0;
  private hadGravity = true;

  declare body: Phaser.Physics.Arcade.Body;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly kind: EnemyKind,
    protected readonly world: EnemyWorld,
  ) {
    const stats = ENEMIES[kind];
    super(scene, x, y, stats.sheet, 0);
    this.stats = stats;
    this.hp = stats.hp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    const [w, h] = stats.body;
    this.body.setSize(w, h);
    this.body.setOffset((this.width - w) / 2, this.height - h);
  }

  /** A shot coming from `shotX` bounces off (a shield in front); basic shots only. */
  blocks(_shotX: number): boolean {
    return false;
  }

  get isFrozen(): boolean {
    return this.frozen > 0;
  }

  /** The Mutex Lock: stop dead, hang in place and do no contact damage for `frames`. */
  freeze(frames: number): void {
    if (this.frozen === 0) this.hadGravity = this.body.allowGravity;
    this.frozen = Math.max(this.frozen, frames);
    this.body.setVelocity(0, 0);
    this.body.setAllowGravity(false);
    this.anims.pause();
  }

  /** One fixed logic step. */
  step(): void {
    if (this.flash > 0 && --this.flash === 0) this.clearTint();
    if (this.frozen > 0) {
      this.body.setVelocity(0, 0);
      if (--this.frozen === 0) {
        this.body.setAllowGravity(this.hadGravity);
        this.anims.resume();
      }
      return;
    }
    this.think();
  }

  protected abstract think(): void;

  /** Takes damage; returns true when this hit destroyed the enemy. */
  hurt(damage: number): boolean {
    if (!this.active) return false;
    this.hp -= damage;
    if (this.hp <= 0) {
      this.explode();
      return true;
    }
    this.setTintFill(0xffffff);
    this.flash = HIT_FLASH_FRAMES;
    return false;
  }

  private explode(): void {
    const { x, y } = this.body.center;
    playOnce(this.scene, 'fx_explosion', x, y);
    this.emit('destroyed', x, y);
    this.destroy();
  }
}
