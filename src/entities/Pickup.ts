import Phaser from 'phaser';
import { PICKUP_BLINK_FRAMES, PICKUP_LIFETIME, PICKUPS, type PickupKind } from '../data/drops';
import { BLINK_FRAMES, GRAVITY, MAX_FALL_SPEED } from '../data/tuning';
import { loopAnim } from './effects';

/** Item dropped by an enemy (pops up, falls, blinks out after a while) or placed in the map. */
export class Pickup extends Phaser.Physics.Arcade.Sprite {
  private life = PICKUP_LIFETIME;

  declare body: Phaser.Physics.Arcade.Body;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly kind: PickupKind,
    /** Placed in the map (not dropped): no pop, never blinks out. */
    readonly placed = false,
  ) {
    const def = PICKUPS[kind];
    super(scene, x, y, def.sheet, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(1);
    this.body.setGravityY(GRAVITY);
    this.body.setMaxVelocityY(MAX_FALL_SPEED);
    if (!placed) this.body.setVelocityY(-120); // small pop
    this.play(loopAnim(scene, def.sheet, [0, 1], 4));
  }

  get amount(): number {
    return PICKUPS[this.kind].amount;
  }

  /** One fixed logic step; returns false once it has expired (and is destroyed). */
  step(): boolean {
    this.body.setVelocityX(0);
    if (this.placed) return true;
    if (--this.life <= 0) {
      this.destroy();
      return false;
    }
    if (this.life < PICKUP_BLINK_FRAMES) this.setVisible(Math.floor(this.life / BLINK_FRAMES) % 2 === 0);
    return true;
  }
}
