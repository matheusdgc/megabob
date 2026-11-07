import type Phaser from 'phaser';
import { Meter, METER_H, METER_W } from './meter';
import { type Label, uiText } from './text';

/** Layout from art/exports/hud-pause-layout.json. */
const X = 8;
const TOP = 10;
const GAP = 6;
const LIFE_Y = TOP + METER_H + 30;

export interface WeaponGauge {
  energy: number;
  max: number;
  color: number;
}

/**
 * Bob's HUD, top-left: health meter, the equipped special weapon's energy meter beside it
 * (in the weapon's color), and the lives counter under them (Bob's life icon and a count).
 * Fixed to the screen; redraws only when the values change.
 */
export class Hud {
  private readonly health: Meter;
  private readonly energy: Meter;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly lives: Label;
  private shownLives = -1;
  private shownWeapon: boolean | null = null;

  constructor(scene: Phaser.Scene) {
    this.health = new Meter(scene, X, TOP, { texture: 'hud_segment_blue' }, 90);
    this.energy = new Meter(scene, X + METER_W + GAP, TOP, { texture: 'hud_segment_yellow' }, 90);
    this.icon = scene.add.image(X, LIFE_Y, 'bob_life').setOrigin(0).setScrollFactor(0).setDepth(90);
    this.lives = uiText(scene, X + 19, LIFE_Y + 8, '', { bg: '#161616' }).setScrollFactor(0).setDepth(90);
  }

  update(hp: number, max: number, lives: number, weapon: WeaponGauge | null = null): void {
    this.health.set(hp, max);
    if (this.shownWeapon !== !!weapon) {
      this.shownWeapon = !!weapon;
      this.energy.setVisible(!!weapon);
    }
    if (weapon) this.energy.set(weapon.energy, weapon.max, { color: weapon.color });
    if (lives !== this.shownLives) {
      this.shownLives = lives;
      this.lives.setText(`x${lives}`);
    }
  }

  /** For checks: the icon is drawn from the life art. */
  get lifeIcon(): Phaser.GameObjects.Image {
    return this.icon;
  }
}
