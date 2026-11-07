import Phaser from 'phaser';
import { GameAudio, loadMusic } from '../audio';
import { STAGE_OF_BOSS } from '../stages/stages';
import { GameInput } from '../systems/input';
import { type Dir, firstSlot, moveCursor, type Slot, SLOTS, slotState, type SlotState } from '../systems/stageSelect';
import { fadeIn, fadeTo, type Label, UI, uiText } from '../ui/text';
import { getSave } from './progress';

/** Slot centers on stage_select_wide (art/exports/stage-select-layout.json). */
const CENTER: Record<Slot | 'bob', [number, number]> = {
  memoryLeak: [240, 62],
  raceCondition: [112, 135],
  nullPointer: [368, 135],
  techDebt: [240, 208],
  bob: [240, 135],
};

const PORTRAIT: Record<Slot, string> = {
  memoryLeak: 'portrait_memory_leak',
  raceCondition: 'portrait_race_condition',
  nullPointer: 'portrait_null_pointer',
  techDebt: 'tech_debt_core_portrait',
};

const NAME: Record<Slot, string> = {
  memoryLeak: 'MEMORY LEAK',
  raceCondition: 'RACE CONDITION',
  nullPointer: 'NULL POINTER',
  techDebt: 'FORTALEZA TECH DEBT',
};

/** The boss presentation after picking a stage (boss_intro_panel). */
const INTRO: Record<Slot, { heading: string; caption: string }> = {
  memoryLeak: { heading: 'BUG DETECTADO', caption: 'NUNCA SOLTA NADA DO QUE PEGA' },
  raceCondition: { heading: 'BUG DETECTADO', caption: 'SEMPRE UM PASSO À FRENTE DE SI MESMO' },
  nullPointer: { heading: 'BUG DETECTADO', caption: 'APONTA PARA O NADA. E ACERTA' },
  techDebt: { heading: 'BUG FINAL', caption: 'TODO ATALHO QUE ALGUÉM JÁ TOMOU' },
};
/** Panel and its contents, from art/exports/presentation-layout.json (panel-relative px). */
const PANEL = { w: 416, h: 112, portrait: [16, 8], text: 136, heading: 22, name: 48, caption: 82 } as const;
const INTRO_MS = 1600;

const NOTE: Record<SlotState, string> = {
  open: '',
  cleared: 'CONCLUÍDA\nJOGUE DE NOVO PELAS PEÇAS',
  locked: 'TRANCADA\nVENÇA OS TRÊS BUGS ANTES',
  soon: 'EM CONSTRUÇÃO',
};

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const built = (s: Slot) => STAGE_OF_BOSS[s] !== undefined;

/**
 * Stage select: the three bug bosses around Bob, the fortress below (locked until all three are
 * beaten). Cleared stages stay playable; unbuilt ones say so. Back (Esc, C) returns to the title.
 */
export class StageSelectScene extends Phaser.Scene {
  private controls!: GameInput;
  private cursor!: Slot;
  private focus!: Phaser.GameObjects.Image;
  private label!: Label;
  private note!: Label;
  private leaving!: boolean;

  constructor() {
    super('StageSelect');
  }

  init(): void {
    this.cursor = firstSlot(getSave(this.registry), built);
    this.leaving = false;
  }

  preload(): void {
    loadMusic(this, ['select']);
  }

  create(): void {
    const save = getSave(this.registry);
    this.add.image(0, 0, 'stage_select_wide').setOrigin(0);
    for (const slot of SLOTS) {
      const [x, y] = CENTER[slot];
      const state = slotState(save, slot, built);
      if (state === 'locked') {
        this.add.image(x, y, 'stage_locked_wide');
        continue;
      }
      const p = this.add.image(x, y, PORTRAIT[slot]);
      if (state === 'cleared') p.setTint(0x6f6f6f);
      if (state === 'soon') p.setAlpha(0.35);
    }
    this.add.image(...CENTER.bob, 'bob_portrait');
    this.focus = this.add.image(0, 0, 'stage_focus');
    // name and status in the free corner beside the fortress slot
    this.label = uiText(this, 288, 200, '', { size: 12 });
    this.note = uiText(this, 288, 216, '', { color: UI.dim });
    this.controls = new GameInput(this, true);
    this.select(this.cursor);
    GameAudio.of(this.game)?.music.play('select', 400);
    fadeIn(this);
  }

  private select(slot: Slot): void {
    this.cursor = slot;
    this.focus.setPosition(...CENTER[slot]);
    const state = slotState(getSave(this.registry), slot, built);
    this.label.setText(NAME[slot]).setColor(state === 'open' || state === 'cleared' ? UI.text : UI.dim);
    this.note.setText(NOTE[state]);
  }

  update(): void {
    if (this.leaving) return;
    const s = this.controls.poll();
    const audio = GameAudio.of(this.game);
    const dir = DIRS.find((d) => s.justPressed(d));
    if (dir) {
      const next = moveCursor(this.cursor, dir);
      if (next !== this.cursor) {
        audio?.sfx.play('weaponSwitch');
        this.select(next);
      }
    } else if (this.controls.confirm) {
      this.choose();
    } else if (this.controls.back) {
      this.leaving = true;
      fadeTo(this, 'Title');
    }
    this.focus.setVisible(Math.floor(this.time.now / 250) % 3 !== 0);
  }

  private choose(): void {
    const audio = GameAudio.of(this.game);
    const stage = STAGE_OF_BOSS[this.cursor];
    const state = slotState(getSave(this.registry), this.cursor, built);
    if (!stage || state === 'locked' || state === 'soon') {
      audio?.sfx.play('blockBreak');
      this.cameras.main.shake(120, 0.004);
      return;
    }
    this.leaving = true;
    audio?.sfx.play('checkpoint');
    audio?.music.stop(400);
    this.present(this.cursor);
    this.time.delayedCall(INTRO_MS, () => fadeTo(this, 'Stage', { stage }, 500));
  }

  /** The chosen boss on the presentation panel: portrait at 2x, heading, name and a caption. */
  private present(slot: Slot): void {
    const x = 240 - PANEL.w / 2;
    const y = 135 - PANEL.h / 2;
    this.focus.setVisible(false).setActive(false);
    this.label.setText('');
    this.note.setText('');
    const shade = this.add.rectangle(240, 135, 480, 270, 0x000000, 0.55);
    const panel = this.add.image(x, y, 'boss_intro_panel').setOrigin(0);
    const portrait = this.add.image(x + PANEL.portrait[0], y + PANEL.portrait[1], PORTRAIT[slot]).setOrigin(0).setScale(2);
    const tx = x + PANEL.text;
    uiText(this, tx, y + PANEL.heading + 5, INTRO[slot].heading, { color: UI.danger });
    uiText(this, tx, y + PANEL.name + 10, NAME[slot], { size: 20 });
    uiText(this, tx, y + PANEL.caption + 5, INTRO[slot].caption, { color: UI.dim });
    for (const o of [shade, panel, portrait]) {
      const alpha = o.alpha;
      this.tweens.add({ targets: o, alpha: { from: 0, to: alpha }, duration: 150 });
    }
  }
}
