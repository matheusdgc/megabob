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
  techDebt: 'TECH DEBT FORTRESS',
};

const NOTE: Record<SlotState, string> = {
  open: '',
  cleared: 'CLEARED\nPLAY AGAIN FOR MISSING PARTS',
  locked: 'LOCKED\nBEAT THE THREE BUGS FIRST',
  soon: 'UNDER CONSTRUCTION',
};

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const built = (s: Slot) => STAGE_OF_BOSS[s] !== undefined;

/**
 * Stage select: the three bug bosses around Bob, the fortress below (locked until all three are
 * beaten). Cleared stages stay playable; unbuilt ones say so. C goes back to the title.
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
    } else if (s.justPressed('jump') || s.justPressed('pause') || s.justPressed('shoot')) {
      this.choose();
    } else if (s.justPressed('dash')) {
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
    fadeTo(this, 'Stage', { stage }, 500);
  }
}
