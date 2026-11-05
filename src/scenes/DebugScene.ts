import Phaser from 'phaser';
import { SHEETS, TILE } from '../data/assets';
import { ACTIONS, type Action } from '../systems/actions';
import { GameInput } from '../systems/input';

const FONT = { fontFamily: 'monospace', fontSize: '8px', color: '#a8a8a8' };

/** Dev-only: shows every sheet animating and which input actions are active. */
export class DebugScene extends Phaser.Scene {
  private input$!: GameInput;
  private labels = new Map<Action, Phaser.GameObjects.Text>();
  private padText!: Phaser.GameObjects.Text;
  private bufferText!: Phaser.GameObjects.Text;

  constructor() {
    super('Debug');
  }

  create(): void {
    this.input$ = new GameInput(this);

    const bobs = SHEETS.filter((s) => s.key.startsWith('bob_'));
    bobs.forEach((s, i) => {
      const x = 4 + (i % 5) * 50;
      const y = 4 + Math.floor(i / 5) * 60;
      if (!this.anims.exists(s.key)) {
        this.anims.create({
          key: s.key,
          frames: this.anims.generateFrameNumbers(s.key, {}),
          frameRate: 6,
          repeat: -1,
        });
      }
      this.add.rectangle(x, y, s.frameWidth, s.frameHeight).setOrigin(0).setStrokeStyle(1, 0x262626);
      this.add.sprite(x, y, s.key).setOrigin(0).play(s.key);
      this.add.text(x, y + s.frameHeight + 1, s.key.replace('bob_', ''), FONT);
    });

    const tiles = SHEETS.find((s) => s.key === 'tiles_test');
    if (tiles) {
      for (let f = 0; f < tiles.frames; f++) this.add.image(4 + f * (TILE + 2), 128, tiles.key, f).setOrigin(0);
    }

    ACTIONS.forEach((a, i) => {
      const t = this.add.text(4 + (i % 5) * 50, 152 + Math.floor(i / 5) * 12, a, FONT);
      this.labels.set(a, t);
    });
    this.bufferText = this.add.text(4, 182, '', FONT);
    this.padText = this.add.text(4, 194, '', FONT);
    this.add.text(4, 210, 'Z jump X shoot C dash Q/E weapon Enter pause', { ...FONT, color: '#6f6f6f' });
  }

  update(): void {
    const s = this.input$.poll();
    for (const [a, t] of this.labels) {
      t.setColor(s.justPressed(a) ? '#ffffff' : s.isDown(a) ? '#4589ff' : '#393939');
    }
    this.bufferText.setText(`h=${s.horizontal}  jumpBuffer=${s.hasBufferedJump() ? 'ON' : '--'}`);
    const pad = this.input.gamepad?.pad1;
    this.padText.setText(pad?.connected ? `pad: ${pad.id.slice(0, 40)}` : 'pad: none (press a button)');
  }
}
