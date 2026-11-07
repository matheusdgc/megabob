import type Phaser from 'phaser';
import type { Boss } from '../entities/Boss';
import { Meter, METER_H, METER_W } from './meter';
import { type Label, uiText } from './text';

const TOP = 10;
const RIGHT_MARGIN = 8;
/** Boss segments: the HUD art's three tones in boss orange. */
const BOSS_COLOR = 0xff832b;

/**
 * Boss health meter: the HUD meter art, top-right (mirroring Bob's on the left), in boss
 * orange. Fills from 0 to max during the intro, then tracks live HP; hidden once the boss is dead.
 */
export class BossHealthBar {
  private readonly meter: Meter;
  private readonly number?: Label;
  private shown = '';

  /** `visor`: the Debug Visor also shows the boss's health as a number. */
  constructor(scene: Phaser.Scene, _bossName: string, visor = false) {
    const x = scene.cameras.main.width - RIGHT_MARGIN - METER_W;
    this.meter = new Meter(scene, x, TOP, { color: BOSS_COLOR }, 91);
    if (visor) this.number = uiText(scene, x + METER_W / 2, TOP + METER_H + 8, '', { color: '#ff832b', origin: 0.5 }).setScrollFactor(0).setDepth(91);
  }

  /** Call once per frame. */
  update(boss: Boss): void {
    const fraction = boss.phase === 'intro' ? boss.introPct : boss.hpFraction;
    const visible = boss.phase !== 'dead';
    const value = Math.round(fraction * boss.maxHp);
    const key = `${visible}|${value}`;
    if (key === this.shown) return;
    this.shown = key;
    this.number?.setText(visible ? String(value) : '');
    this.meter.setVisible(visible);
    if (visible) this.meter.set(value, boss.maxHp);
  }

  destroy(): void {
    this.meter.destroy();
    this.number?.destroy();
  }
}
