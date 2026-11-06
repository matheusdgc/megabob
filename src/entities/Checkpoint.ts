import Phaser from 'phaser';

/**
 * Checkpoint terminal (16x32: frame 0 off, 1 on). Touching it moves Bob's respawn point here.
 * Placed by the bottom-left of its map cell.
 */
export class Checkpoint extends Phaser.GameObjects.Sprite {
  active = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x + 8, y, 'checkpoint', 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(-1);
  }

  /** Respawn spot: Bob's feet, standing on the terminal. */
  get spot(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /** Lights up when Bob's hitbox touches it; returns true on the frame it activates. */
  check(bob: Phaser.Geom.Rectangle): boolean {
    if (this.active || !Phaser.Geom.Intersects.RectangleToRectangle(this.getBounds(), bob)) return false;
    this.active = true;
    this.setFrame(1);
    return true;
  }
}
