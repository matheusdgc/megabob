import Phaser from 'phaser';
import { CARD_SPEED } from '../../data/enemies';
import { GRAVITY, MAX_FALL_SPEED } from '../../data/tuning';
import { newTurret, stepTurret, type Turret } from '../../systems/enemyAI';
import { Enemy, type EnemyWorld } from '../Enemy';

/** Muzzle, from the feet (facing right). */
const MUZZLE_X = 18;
const MUZZLE_Y = 34;

/** E9 Legacy Turret (Tech Debt): a cannon on the floor that aims and fires punched cards at Bob. */
export class LegacyTurret extends Enemy {
  readonly solid = true;
  private readonly ai: Turret = newTurret();

  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld) {
    super(scene, x, y, 'legacyTurret', world);
    this.body.setGravityY(GRAVITY);
    this.body.setMaxVelocityY(MAX_FALL_SPEED);
    this.body.setImmovable(true);
  }

  protected think(): void {
    const bob = this.world.bob();
    const mx = this.x + this.ai.facing * MUZZLE_X;
    const my = this.y - MUZZLE_Y;
    const out = stepTurret(this.ai, bob ? { dx: bob.x - mx, dy: bob.y - my } : null);
    this.body.setVelocityX(0);
    this.setFrame(out.frame);
    this.setFlipX(this.ai.facing < 0); // the sheet faces right
    if (out.fire) this.world.shoot('card', mx, my, out.fire.dx * CARD_SPEED, out.fire.dy * CARD_SPEED);
  }
}
