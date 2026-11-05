import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

/**
 * Temporary boot screen: proves the canvas renders at 256x224 with crisp integer scaling.
 * Later tasks load assets here and hand off to the title screen.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const g = this.add.graphics();

    // 1-pixel checker strip: any blur from scaling is obvious here.
    for (let x = 0; x < GAME_WIDTH; x += 1) {
      g.fillStyle(x % 2 === 0 ? 0xffffff : 0x161616);
      g.fillRect(x, 0, 1, 2);
    }

    // Frame around the full internal resolution.
    g.lineStyle(1, 0x0f62fe);
    g.strokeRect(0.5, 2.5, GAME_WIDTH - 1, GAME_HEIGHT - 3);

    // 16x16 grid hint (tile size).
    g.fillStyle(0x393939);
    for (let x = 16; x < GAME_WIDTH; x += 16) {
      for (let y = 16; y < GAME_HEIGHT; y += 16) {
        g.fillRect(x, y, 1, 1);
      }
    }

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 8, 'MEGABOB', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#4589ff',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, `${GAME_WIDTH}x${GAME_HEIGHT}`, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#a8a8a8',
      })
      .setOrigin(0.5);
  }
}
