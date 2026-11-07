import Phaser from 'phaser';
import { MOVER_COLS, type MoverDef, moverBounds, slide } from '../systems/movers';

const TILE = 16;

/**
 * A platform that slides back and forth. Its body is dynamic but immovable, so Arcade carries
 * whoever stands on it (body friction); it is solid only from above, like the one-way tiles.
 */
export class MovingPlatform extends Phaser.Physics.Arcade.Image {
  private dir: 1 | -1;
  private readonly min: number;
  private readonly max: number;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(
    scene: Phaser.Scene,
    private readonly def: MoverDef,
  ) {
    const { min, max } = moverBounds(def);
    super(scene, def.startAtEnd ? max : min, def.row * TILE, 'moving_platform');
    this.min = min;
    this.max = max;
    this.dir = def.startAtEnd ? -1 : 1;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0, 0).setDepth(-0.2);
    this.setDisplaySize((def.cols ?? MOVER_COLS) * TILE, TILE);
    this.body.setAllowGravity(false).setImmovable(true);
    this.body.setSize(this.width, 8, false).setOffset(0, 0);
    this.body.checkCollision.down = false;
    this.body.checkCollision.left = false;
    this.body.checkCollision.right = false;
  }

  /** One fixed logic step: the velocity that slides it toward the next end. */
  step(): void {
    const next = slide(this.x, this.dir, this.min, this.max, this.def.speed / 60);
    this.dir = next.dir;
    this.body.setVelocityX((next.x - this.x) * 60);
  }
}
