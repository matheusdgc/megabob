import Phaser from 'phaser';
import type { PartId } from '../data/upgrades';
import { loopAnim } from './effects';

/**
 * Update Terminal (40x64: frames 0-1 idle with a glint, 2 empty, 3-5 installing). Touching it
 * installs its armor part once; a terminal whose part Bob already has stands empty.
 * Placed by the bottom-left of its map cell.
 */
export class UpdateTerminal extends Phaser.GameObjects.Sprite {
  private used: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly part: PartId,
    owned: boolean,
  ) {
    super(scene, x + 8, y, 'update_terminal', owned ? 2 : 0);
    this.used = owned;
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(-1);
    if (!owned) this.play(loopAnim(scene, 'update_terminal', [0, 0, 0, 1], 4));
  }

  /** True once, on the frame Bob's hitbox first touches an unused terminal. */
  touch(bob: Phaser.Geom.Rectangle): boolean {
    if (this.used) return false;
    const box = new Phaser.Geom.Rectangle(this.x - 12, this.y - 56, 24, 56);
    if (!Phaser.Geom.Intersects.RectangleToRectangle(box, bob)) return false;
    this.used = true;
    this.play(loopAnim(this.scene, 'update_terminal', [3, 4, 5], 10));
    return true;
  }

  /** The install is over: the terminal stands open and empty. */
  done(): void {
    this.stop().setFrame(2);
  }
}
