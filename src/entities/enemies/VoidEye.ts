import Phaser from 'phaser';
import { CURSOR_SPEED } from '../../data/enemies';
import { type Eye, newEye, stepEye } from '../../systems/enemyAI';
import { Enemy, type EnemyWorld } from '../Enemy';

/** E7 Void Eye (Null Pointer): floats, opens its eye, shoots a cursor, blinks out and back. */
export class VoidEye extends Enemy {
  readonly solid = false;
  private readonly ai: Eye;

  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld) {
    super(scene, x, y, 'voidEye', world);
    this.body.setAllowGravity(false);
    this.ai = newEye(x, y);
  }

  protected think(): void {
    const bob = this.world.bob();
    const b = this.body;
    const out = stepEye(this.ai, bob ? { dx: bob.x - b.center.x, dy: bob.y - b.center.y } : null, Math.random);
    this.setFrame(out.frame);
    if (out.moveTo) this.setPosition(out.moveTo.x, out.moveTo.y);
    // gone: no body, so shots pass and it cannot touch Bob
    b.enable = out.solid;
    if (out.fire && bob) {
      const a = Math.atan2(bob.y - b.center.y, bob.x - b.center.x);
      this.world.shoot('cursor', b.center.x, b.center.y, Math.cos(a) * CURSOR_SPEED, Math.sin(a) * CURSOR_SPEED);
    }
  }
}
