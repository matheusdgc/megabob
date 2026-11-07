import Phaser from 'phaser';
import { GameAudio } from '../audio';
import { ARMOR_BITS } from '../data/assets';
import { WEAPON_MAX_ENERGY, WEAPON_ORDER, WEAPONS, type WeaponId } from '../data/weapons';
import { GameInput } from '../systems/input';
import { type Arsenal, equip } from '../systems/weapons';
import { hideLabels, type Label, UI, uiText } from '../ui/text';
import type { OptionsData } from './OptionsScene';

export interface PauseData {
  arsenal: Arsenal;
  armor: number;
  /** Called once when the menu closes; `exit` = leave the stage for the stage select. */
  onClose(exit: boolean): void;
}

/** Layout from art/exports/hud-pause-layout.json. */
const PANEL = { x: 64, y: 31 };
const ROW_Y = [112, 140, 168, 196, 214, 230];
const ICON_X = 106;
const TEXT_X = 122;
const CURSOR_X = 86;
const ARMOR: { key: string; bit: number; name: string; at: [number, number] }[] = [
  { key: 'armor_head', bit: ARMOR_BITS.head, name: 'DEBUG VISOR', at: [288, 118] },
  { key: 'armor_arm', bit: ARMOR_BITS.arm, name: 'COMPILER CANNON', at: [360, 118] },
  { key: 'armor_body', bit: ARMOR_BITS.body, name: 'FIREWALL PLATING', at: [288, 178] },
  { key: 'armor_legs', bit: ARMOR_BITS.legs, name: 'TURBO BOOTS', at: [360, 178] },
];

/**
 * Pause menu, launched over the paused stage (the stage stays drawn underneath). Pick a weapon
 * to equip, see the armor parts found, or leave the stage. Confirm equips the weapon under the
 * cursor; pause or back resumes as is.
 */
export class PauseScene extends Phaser.Scene {
  private opts!: PauseData;
  private controls!: GameInput;
  /** Selectable rows: the owned weapons, then OPTIONS and EXIT STAGE. */
  private rows!: (WeaponId | 'options' | 'exit')[];
  private cursor!: number;
  private pointer!: Label;
  private closed!: boolean;

  constructor() {
    super('Pause');
  }

  init(data: PauseData): void {
    this.opts = data;
    this.closed = false;
    const owned = WEAPON_ORDER.filter((w) => w === 'buster' || data.arsenal.owned.includes(w));
    this.rows = [...owned, 'options', 'exit'];
    this.cursor = Math.max(0, this.rows.indexOf(data.arsenal.current));
  }

  create(): void {
    const { arsenal, armor } = this.opts;
    this.add.image(PANEL.x, PANEL.y, 'pause_panel_wide').setOrigin(0);
    uiText(this, PANEL.x + 16, PANEL.y + 22, 'PAUSE', { size: 12 });
    uiText(this, CURSOR_X, 92, 'WEAPONS', { color: UI.accent });
    uiText(this, 272, 92, 'ARMOR', { color: UI.accent });

    // all four weapons are listed; the ones not won yet stay dark and unselectable
    WEAPON_ORDER.forEach((w, i) => {
      const y = ROW_Y[i]!;
      const has = w === 'buster' || arsenal.owned.includes(w);
      const def = WEAPONS[w];
      this.add.image(ICON_X, y, def.icon).setAlpha(has ? 1 : 0.25);
      const energy = w === 'buster' ? '' : `  ${String(arsenal.energy[w] ?? 0).padStart(2)}/${WEAPON_MAX_ENERGY}`;
      uiText(this, TEXT_X, y, has ? def.name + energy : '- - - - -', { color: has ? UI.text : UI.dim });
    });
    uiText(this, TEXT_X, ROW_Y[4]!, 'OPTIONS');
    uiText(this, TEXT_X, ROW_Y[5]!, 'EXIT STAGE');

    let found = 0;
    for (const a of ARMOR) {
      const has = (armor & a.bit) !== 0;
      if (has) found++;
      this.add.image(...a.at, a.key, has ? 0 : 1).setScale(2);
      uiText(this, a.at[0], a.at[1] + 22, has ? a.name.split(' ')[1]! : '???', { origin: 0.5, color: has ? UI.text : UI.dim });
    }
    uiText(this, 324, 222, `PARTS ${found}/4`, { origin: 0.5 });

    this.pointer = uiText(this, CURSOR_X, 0, '>', { color: UI.warn });
    this.controls = new GameInput(this, true);
    this.place();
  }

  private place(): void {
    const row = this.rows[this.cursor]!;
    const i = row === 'options' ? 4 : row === 'exit' ? 5 : WEAPON_ORDER.indexOf(row);
    this.pointer.setY(ROW_Y[i]!);
  }

  update(): void {
    if (this.closed) return;
    const s = this.controls.poll();
    const n = this.rows.length;
    if (s.justPressed('up') || s.justPressed('down')) {
      this.cursor = (this.cursor + (s.justPressed('up') ? n - 1 : 1)) % n;
      GameAudio.of(this.game)?.sfx.play('weaponSwitch');
      this.place();
    } else if (this.controls.confirm) {
      const row = this.rows[this.cursor]!;
      if (row === 'options') return this.options();
      if (row !== 'exit') equip(this.opts.arsenal, row);
      this.close(row === 'exit');
    } else if (this.controls.back) {
      this.close(false); // pause again (or back): resume with the weapon already equipped
    }
    this.pointer.setVisible(Math.floor(this.time.now / 300) % 2 === 0);
  }

  /** Options over the pause menu; this menu comes back with input rebuilt for the new bindings. */
  private options(): void {
    const show = hideLabels(this, this.scene.get('Stage'));
    const data: OptionsData = {
      onClose: () => {
        show();
        this.controls.destroy();
        this.controls = new GameInput(this, true);
        this.scene.resume();
      },
    };
    this.scene.pause();
    this.scene.launch('Options', data);
  }

  private close(exit: boolean): void {
    this.closed = true;
    this.scene.stop();
    this.opts.onClose(exit);
  }
}
