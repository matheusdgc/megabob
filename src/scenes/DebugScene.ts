import Phaser from 'phaser';
import { ARMOR_BITS, BOB_ANIMS, BOB_FRAME, type BobAnim, bobKey, TILE } from '../data/assets';
import { ACTIONS, type Action } from '../systems/actions';
import { GameInput } from '../systems/input';

const FONT = { fontFamily: 'monospace', fontSize: '8px', color: '#a8a8a8' };
const PART_KEYS: [string, number][] = [
  ['ONE', ARMOR_BITS.head],
  ['TWO', ARMOR_BITS.arm],
  ['THREE', ARMOR_BITS.body],
  ['FOUR', ARMOR_BITS.legs],
];

/** Dev-only: every Bob animation (keys 1-4 toggle armor parts) and live input state. */
export class DebugScene extends Phaser.Scene {
  private input$!: GameInput;
  private labels = new Map<Action, Phaser.GameObjects.Text>();
  private padText!: Phaser.GameObjects.Text;
  private bufferText!: Phaser.GameObjects.Text;
  private armorText!: Phaser.GameObjects.Text;
  private bobs: [BobAnim, Phaser.GameObjects.Sprite][] = [];
  private armor = 0;

  constructor() {
    super('Debug');
  }

  create(): void {
    this.input$ = new GameInput(this);

    (Object.keys(BOB_ANIMS) as BobAnim[]).forEach((anim, i) => {
      const x = 4 + (i % 5) * 50;
      const y = 4 + Math.floor(i / 5) * 60;
      this.add.rectangle(x, y, BOB_FRAME, BOB_FRAME).setOrigin(0).setStrokeStyle(1, 0x262626);
      this.bobs.push([anim, this.add.sprite(x, y, bobKey(anim)).setOrigin(0)]);
      this.add.text(x, y + BOB_FRAME + 1, anim, FONT);
    });
    this.playAll();

    for (let f = 0; f < 4; f++) this.add.image(204 + f * (TILE + 2), 128, 'tiles_test', f).setOrigin(0);

    const kb = this.input.keyboard!;
    for (const [name, bit] of PART_KEYS) {
      kb.on(`keydown-${name}`, () => {
        this.armor ^= bit;
        this.playAll();
      });
    }

    ACTIONS.forEach((a, i) => {
      this.labels.set(a, this.add.text(4 + (i % 5) * 50, 152 + Math.floor(i / 5) * 12, a, FONT));
    });
    this.armorText = this.add.text(4, 128, '', FONT);
    this.bufferText = this.add.text(4, 182, '', FONT);
    this.padText = this.add.text(4, 194, '', FONT);
    this.add.text(4, 210, 'Z jump X shoot C dash Q/E weapon  1-4 armor', { ...FONT, color: '#6f6f6f' });
  }

  private playAll(): void {
    for (const [anim, sprite] of this.bobs) {
      const key = bobKey(anim, this.armor);
      if (!this.anims.exists(key)) {
        this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, {}), frameRate: 6, repeat: -1 });
      }
      const progress = sprite.anims.currentFrame?.index ?? 0;
      sprite.play({ key, startFrame: Math.max(0, progress - 1) });
    }
    const parts = Object.entries(ARMOR_BITS)
      .filter(([, bit]) => this.armor & bit)
      .map(([p]) => p);
    this.armorText?.setText(`armor a${this.armor}: ${parts.join('+') || 'none'}`);
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
