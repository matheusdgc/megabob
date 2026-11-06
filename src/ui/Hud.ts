import Phaser from 'phaser';

const X = 10;
const TOP = 14;
const BAR_W = 8;
/** Each health point is a 2 px row: 1 px fill + 1 px gap. */
const SEG = 2;
const FONT = { fontFamily: 'monospace', fontSize: '8px', color: '#e0e0e0' };

/**
 * Bob's health bar (vertical, top-left, filling from the bottom) and lives counter.
 * Fixed to the screen; redraws only when the values change.
 */
export class Hud {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly lives: Phaser.GameObjects.Text;
  private shown = '';

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(90);
    this.lives = scene.add.text(X - 2, 0, '', FONT).setScrollFactor(0).setDepth(90);
  }

  update(hp: number, max: number, lives: number): void {
    const key = `${hp}/${max}/${lives}`;
    if (key === this.shown) return;
    this.shown = key;

    const h = max * SEG + 1;
    const g = this.g.clear();
    // frame: dark body, IBM-blue trim, rounded-looking caps
    g.fillStyle(0x161616).fillRect(X - 2, TOP - 4, BAR_W + 4, h + 8);
    g.fillStyle(0x0043ce).fillRect(X - 1, TOP - 3, BAR_W + 2, 2).fillRect(X - 1, TOP + h + 1, BAR_W + 2, 2);
    g.fillStyle(0x262626).fillRect(X, TOP, BAR_W, h);
    // segments, bottom to top
    for (let i = 0; i < max; i++) {
      const y = TOP + h - (i + 1) * SEG;
      if (i < hp) {
        g.fillStyle(i < hp - 1 || hp === max ? 0xa6c8ff : 0xffffff).fillRect(X + 1, y, BAR_W - 2, 1);
        g.fillStyle(0x4589ff).fillRect(X + 1, y, 1, 1);
      }
    }
    this.lives.setText(`x${lives}`).setY(TOP + h + 5);
  }
}
