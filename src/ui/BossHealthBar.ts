import Phaser from 'phaser';
import type { Boss } from '../entities/Boss';
import { drawMeter, METER_W } from './meter';
import { type Label, uiText } from './text';

const TOP = 14;
const RIGHT_MARGIN = 10;

/**
 * Boss health meter: vertical, top-right (mirroring Bob's on the left), in boss red.
 * Fills from 0 to max during the intro, then tracks live HP; hidden once the boss is dead.
 */
export class BossHealthBar {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly number?: Label;
  private shown = '';

  /** `visor`: the Debug Visor also shows the boss's health as a number. */
  constructor(scene: Phaser.Scene, _bossName: string, visor = false) {
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(91);
    if (visor) this.number = uiText(scene, scene.cameras.main.width - RIGHT_MARGIN - METER_W / 2, TOP + 66, '', { color: '#ff832b', origin: 0.5 }).setScrollFactor(0).setDepth(91);
  }

  /** Call once per frame. */
  update(boss: Boss): void {
    const fraction = boss.phase === 'intro' ? boss.introPct : boss.hpFraction;
    const visible = boss.phase !== 'dead';
    const value = Math.round(fraction * boss.maxHp);
    const key = `${visible}|${value}`;
    if (key === this.shown) return;
    this.shown = key;
    const g = this.g.clear();
    this.number?.setText(visible ? String(value) : '');
    if (!visible) return;
    const x = this.g.scene.cameras.main.width - RIGHT_MARGIN - METER_W;
    drawMeter(g, x, TOP, value, boss.maxHp, 0xff832b, 0xda1e28);
  }

  destroy(): void {
    this.g.destroy();
    this.number?.destroy();
  }
}
