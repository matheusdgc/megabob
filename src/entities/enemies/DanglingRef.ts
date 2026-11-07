import Phaser from 'phaser';
import { DANGLE_LENGTH } from '../../data/enemies';
import { dangleAngle, dangleFrame } from '../../systems/enemyAI';
import { Enemy, type EnemyWorld } from '../Enemy';

const TILE = 16;

/**
 * E8 Dangling Ref (Null Pointer): a claw on a broken chain, swinging like a pendulum from the
 * ceiling. The drawing swings around the top of the chain; the hitbox follows the claw.
 * Its marker goes in the cell right under the ceiling.
 */
export class DanglingRef extends Enemy {
  readonly solid = false;
  private frames = 0;
  private readonly phase: number;
  private readonly pivotX: number;
  private readonly pivotY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld) {
    super(scene, x, y, 'danglingRef', world);
    this.pivotX = x;
    this.pivotY = y - TILE;
    this.phase = Math.floor(x / TILE) * 13; // neighbours swing out of step
    this.setOrigin(0.5, 0).setPosition(this.pivotX, this.pivotY);
    this.body.setAllowGravity(false);
    this.place();
  }

  protected think(): void {
    this.frames++;
    this.place();
  }

  private place(): void {
    const a = dangleAngle(this.frames, this.phase);
    this.setFrame(dangleFrame(a));
    const [w, h] = this.stats.body;
    // the claw, relative to the frame's top-left (origin is top-center)
    this.body.setOffset(this.width / 2 + Math.sin(a) * DANGLE_LENGTH - w / 2, Math.cos(a) * DANGLE_LENGTH - h / 2);
  }
}
