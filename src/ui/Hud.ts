import Phaser from 'phaser';
import { drawMeter, METER_W, meterHeight } from './meter';
import { type Label, uiText } from './text';

const X = 10;
const TOP = 14;

export interface WeaponGauge {
  energy: number;
  max: number;
  color: number;
}

/**
 * Bob's HUD, top-left: health meter, the equipped special weapon's energy meter beside it,
 * and the lives counter. Fixed to the screen; redraws only when the values change.
 */
export class Hud {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly lives: Label;
  private shown = '';

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(90);
    this.lives = uiText(scene, X - 2, 0, '', { bg: '#161616' }).setOrigin(0).setScrollFactor(0).setDepth(90);
  }

  update(hp: number, max: number, lives: number, weapon: WeaponGauge | null = null): void {
    const key = `${hp}/${max}/${lives}/${weapon ? `${weapon.energy}/${weapon.color}` : '-'}`;
    if (key === this.shown) return;
    this.shown = key;

    const g = this.g.clear();
    drawMeter(g, X, TOP, hp, max, 0xa6c8ff);
    if (weapon) drawMeter(g, X + METER_W + 6, TOP, weapon.energy, weapon.max, weapon.color);
    this.lives.setText(`x${lives}`).setY(TOP + meterHeight(max) - 3);
  }
}
