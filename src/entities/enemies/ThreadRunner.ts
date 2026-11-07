import Phaser from 'phaser';
import { GRAVITY, MAX_FALL_SPEED } from '../../data/tuning';
import { newRunner, type Runner, stepRunner } from '../../systems/enemyAI';
import { Enemy, type EnemyWorld } from '../Enemy';

/** E5 Thread Runner (Race Condition): revs up and rushes along the floor at Bob. */
export class ThreadRunner extends Enemy {
  readonly solid = true;
  private readonly ai: Runner = newRunner();

  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld) {
    super(scene, x, y, 'threadRunner', world);
    this.body.setGravityY(GRAVITY);
    this.body.setMaxVelocityY(MAX_FALL_SPEED);
  }

  protected think(): void {
    const b = this.body;
    const f = this.ai.facing;
    const bob = this.world.bob();
    const out = stepRunner(
      this.ai,
      {
        onGround: b.blocked.down,
        wallAhead: f > 0 ? b.blocked.right : b.blocked.left,
        // look further ahead at full speed, so it brakes before the edge
        floorAhead: this.world.floorAt(b.center.x + f * (b.width / 2 + 6), b.bottom + 2),
      },
      bob ? { dx: bob.x - b.center.x, dy: bob.y - b.center.y } : null,
    );
    b.setVelocityX(out.vx);
    this.setFrame(out.frame);
    this.setFlipX(this.ai.facing < 0); // the sheet faces right
  }
}
