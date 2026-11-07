import Phaser from 'phaser';
import { GRAVITY, MAX_FALL_SPEED } from '../../data/tuning';
import { type Bot, newBot, shieldBlocks, stepBot } from '../../systems/enemyAI';
import { Enemy, type EnemyWorld } from '../Enemy';

/**
 * E10 Deprecated Bot (Tech Debt): walks at Bob behind a shield that stops basic shots from the
 * front, then lowers it to punch and stands open. Charged shots, special weapons and shots from
 * behind always get through.
 */
export class DeprecatedBot extends Enemy {
  readonly solid = true;
  private readonly ai: Bot = newBot();
  private shielded = true;

  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld) {
    super(scene, x, y, 'deprecatedBot', world);
    this.body.setGravityY(GRAVITY);
    this.body.setMaxVelocityY(MAX_FALL_SPEED);
  }

  override blocks(shotX: number): boolean {
    return !this.isFrozen && shieldBlocks({ shielded: this.shielded, facing: this.ai.facing, x: this.body.center.x }, shotX);
  }

  protected think(): void {
    const b = this.body;
    const f = this.ai.facing;
    const bob = this.world.bob();
    const out = stepBot(
      this.ai,
      {
        onGround: b.blocked.down,
        wallAhead: f > 0 ? b.blocked.right : b.blocked.left,
        floorAhead: this.world.floorAt(b.center.x + f * (b.width / 2 + 2), b.bottom + 2),
      },
      bob ? { dx: bob.x - b.center.x, dy: bob.y - b.center.y } : null,
      this.stats.speed,
    );
    this.shielded = out.shielded;
    b.setVelocityX(out.vx);
    this.setFrame(out.frame);
    this.setFlipX(this.ai.facing < 0); // the sheet faces right
  }
}
