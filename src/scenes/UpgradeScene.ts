import Phaser from 'phaser';
import { GameAudio } from '../audio';
import { bobKey } from '../data/assets';
import { PARTS, type PartId } from '../data/upgrades';
import { keyLabel } from '../systems/bindings';
import { GameInput } from '../systems/input';
import { fadeIn, UI, uiText } from '../ui/text';

export interface UpgradeData {
  part: PartId;
  /** Armor mask after the install (Bob is drawn wearing it). */
  armor: number;
  onClose(): void;
}

/** Earliest a press closes it. */
const MIN_MS = 900;

/**
 * "Upgrade installed": over the frozen stage, Bob in his new part, its name, icon and effect
 * (layout of art/exports/megabob-upgrade-*-preview.png). Any confirm or back closes it.
 */
export class UpgradeScene extends Phaser.Scene {
  private opts!: UpgradeData;
  private controls!: GameInput;
  private ready!: boolean;
  private closed!: boolean;

  constructor() {
    super('Upgrade');
  }

  init(data: UpgradeData): void {
    this.opts = data;
    this.ready = false;
    this.closed = false;
  }

  create(): void {
    const def = PARTS[this.opts.part];
    this.add.rectangle(240, 135, 480, 270, 0x000000, 0.6);
    this.add.image(240, 135, 'reward_panel');
    fadeIn(this);
    uiText(this, 290, 66, 'UPGRADE INSTALLED', { color: UI.accent, origin: 0.5 });
    uiText(this, 194, 98, def.name, { size: 12 });
    this.add.image(194, 122, def.icon, 0).setOrigin(0, 0.5).setScale(2);
    uiText(this, 194, 156, def.effect, { color: UI.text });
    uiText(this, 290, 212, 'FIRMWARE UPDATED', { color: UI.accent, origin: 0.5 });
    const bob = this.add.sprite(112, 182, bobKey('victory', this.opts.armor), 1).setOrigin(0.5, 1).setScale(2);
    if (!this.registry.get('reduceMotion')) {
      this.tweens.add({ targets: bob, y: 178, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    GameAudio.of(this.game)?.sfx.jingle('weaponGet');
    this.controls = new GameInput(this, true);
    const prompt = uiText(this, 290, 226, `PRESS ${keyLabel(this.controls.bindings.keys.jump[0] ?? 'SPACE')}`, { color: UI.dim, origin: 0.5 }).setVisible(false);
    this.time.delayedCall(MIN_MS, () => {
      this.ready = true;
      prompt.setVisible(true);
    });
  }

  update(): void {
    if (this.closed) return;
    this.controls.poll();
    if (this.ready && (this.controls.confirm || this.controls.back)) {
      this.closed = true;
      this.scene.stop();
      this.opts.onClose();
    }
  }
}
