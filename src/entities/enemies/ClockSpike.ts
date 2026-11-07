import Phaser from 'phaser';
import { SPIKE_SHOT_SPEED } from '../../data/enemies';
import { newSpike, type Spike, stepSpike } from '../../systems/enemyAI';
import { Enemy, type EnemyWorld } from '../Enemy';

const TILE = 16;

/**
 * E6 Clock Spike (Race Condition): a turret on a wall that fires clock-hand spikes straight
 * out. Its marker goes in the cell beside the wall; it faces the open side.
 */
export class ClockSpike extends Enemy {
  readonly solid = false;
  private readonly ai: Spike;

  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld) {
    // mounted on whichever side of its cell is solid
    const facing: 1 | -1 = world.floorAt(x - TILE, y - TILE / 2) ? 1 : -1;
    super(scene, x - facing * 6, y + 8, 'clockSpike', world);
    this.ai = newSpike(facing);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.setFlipX(facing < 0); // the sheet faces right
  }

  protected think(): void {
    const bob = this.world.bob();
    const b = this.body;
    const out = stepSpike(this.ai, bob ? { dx: bob.x - b.center.x, dy: bob.y - b.center.y } : null);
    this.setFrame(out.frame);
    if (out.fire) this.world.shoot('clockSpike', b.center.x + this.ai.facing * 14, b.center.y, this.ai.facing * SPIKE_SHOT_SPEED, 0);
  }
}
