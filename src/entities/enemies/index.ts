import Phaser from 'phaser';
import { GRAVITY, MAX_FALL_SPEED } from '../../data/tuning';
import type { EnemyKind } from '../../stages/map';
import { type Drone, type Mite, newDrone, stepDrone, stepMite } from '../../systems/enemyAI';
import { loopAnim } from '../effects';
import { Enemy, type EnemyWorld } from '../Enemy';
import { Drip } from './Drip';
import { HeapCrab } from './HeapCrab';
import { ClockSpike } from './ClockSpike';
import { ThreadRunner } from './ThreadRunner';

/** E1 Pixel Mite: crawls along floors, turning at walls and ledges. */
export class PixelMite extends Enemy {
  readonly solid = true;
  private readonly ai: Mite = { facing: -1 };

  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld) {
    super(scene, x, y, 'pixelMite', world);
    this.body.setGravityY(GRAVITY);
    this.body.setMaxVelocityY(MAX_FALL_SPEED);
    this.play(loopAnim(scene, this.stats.sheet, [0, 1], 6));
  }

  protected think(): void {
    const b = this.body;
    const f = this.ai.facing;
    const out = stepMite(
      this.ai,
      {
        onGround: b.blocked.down,
        wallAhead: f > 0 ? b.blocked.right : b.blocked.left,
        floorAhead: this.world.floorAt(b.center.x + f * (b.width / 2 + 2), b.bottom + 2),
      },
      this.stats.speed,
    );
    b.setVelocityX(out.vx);
    this.setFlipX(this.ai.facing < 0);
  }
}

/** E2 Spam Drone: hovers, dives at Bob when he passes below, climbs back. */
export class SpamDrone extends Enemy {
  readonly solid = false;
  private readonly ai: Drone;

  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld) {
    super(scene, x, y, 'spamDrone', world);
    this.body.setAllowGravity(false);
    this.ai = newDrone(y);
  }

  protected think(): void {
    const bob = this.world.bob();
    // no target while Bob is dead: just keep hovering at home
    const out = stepDrone(this.ai, { x: this.x, y: this.y }, bob ?? { x: this.x, y: this.ai.homeY - 100 });
    this.body.setVelocity(out.vx, out.vy);
    this.setFrame(out.frame);
    this.setFlipX(out.facing < 0);
  }
}

export function createEnemy(kind: EnemyKind, scene: Phaser.Scene, x: number, y: number, world: EnemyWorld): Enemy {
  switch (kind) {
    case 'pixelMite':
      return new PixelMite(scene, x, y, world);
    case 'spamDrone':
      return new SpamDrone(scene, x, y, world);
    case 'drip':
      return new Drip(scene, x, y, world);
    case 'heapCrab':
      return new HeapCrab(scene, x, y, world);
    case 'threadRunner':
      return new ThreadRunner(scene, x, y, world);
    case 'clockSpike':
      return new ClockSpike(scene, x, y, world);
  }
}
