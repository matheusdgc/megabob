import Phaser from 'phaser';
import type { Boss } from '../entities/Boss';

/** Width of the boss health bar in pixels. */
const BAR_W = 80;
/** Height of each HP segment row (fill + gap). */
const SEG = 2;
const FONT = { fontFamily: 'monospace', fontSize: '8px', color: '#e0e0e0' };

/**
 * Boss health bar: horizontal, top-center of the screen, with the boss name.
 * Fills from 0 → max during the intro animation, then tracks live HP.
 * Hidden when no boss is active.
 */
export class BossHealthBar {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private shown = '';

  constructor(scene: Phaser.Scene, bossName: string) {
    const cx = scene.cameras.main.width / 2;
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(91);
    this.label = scene.add
      .text(cx, 6, bossName, FONT)
      .setScrollFactor(0)
      .setDepth(91)
      .setOrigin(0.5, 0)
      .setVisible(false);
  }

  /**
   * Call once per frame. `introPct` is 0–1 during the intro fill; after that
   * use `hpFraction` only.
   */
  update(boss: Boss): void {
    const fraction = boss.phase === 'intro' ? boss.introPct : boss.hpFraction;
    const visible = boss.phase !== 'dead';
    const key = `${visible}|${fraction.toFixed(3)}`;
    if (key === this.shown) return;
    this.shown = key;

    this.label.setVisible(visible);
    const g = this.g.clear();
    if (!visible) return;

    const cx = this.label.scene.cameras.main.width / 2;
    const x = cx - BAR_W / 2 - 3;
    const y = 16;
    const h = SEG * boss.maxHp + 1;
    const filled = Math.round(fraction * boss.maxHp);

    // background frame
    g.fillStyle(0x161616).fillRect(x, y, BAR_W + 6, h + 6);
    g.fillStyle(0x0043ce)
      .fillRect(x + 1, y + 1, BAR_W + 4, 2)
      .fillRect(x + 1, y + h + 3, BAR_W + 4, 2);
    g.fillStyle(0x262626).fillRect(x + 2, y + 3, BAR_W, h);

    // segments, left to right
    for (let i = 0; i < boss.maxHp; i++) {
      const bx = x + 2 + i * SEG;
      if (i < filled) {
        // gradient: top 1/3 lighter
        g.fillStyle(i < filled / 3 ? 0xda1e28 : 0xff832b).fillRect(bx + 1, y + 4, 1, h - 2);
        g.fillStyle(i < filled / 3 ? 0xff832b : 0xffc46b).fillRect(bx + 1, y + 4, 1, 1);
      }
    }
  }

  destroy(): void {
    this.g.destroy();
    this.label.destroy();
  }
}
