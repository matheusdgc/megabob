import Phaser from 'phaser';
import { GameAudio, loadMusic } from '../audio';
import { actionKeys } from '../systems/bindings';
import { GameInput } from '../systems/input';
import { hasProgress, newSave } from '../systems/save';
import { fadeIn, fadeTo, hideLabels, type Label, UI, uiText } from '../ui/text';
import type { OptionsData } from './OptionsScene';
import type { RecordsData } from './RecordsScene';
import { commitSave, getSave } from './progress';
import { animateTitle } from './titleMotion';

interface Item {
  label: string;
  run(): void;
}

const MENU_Y = 196;
const ROW = 14;

/**
 * Title: the logo over the night skyline and a small menu (keyboard or pad, a focused item from
 * the start). Continue keeps the save; New Game asks before erasing progress.
 */
export class TitleScene extends Phaser.Scene {
  private controls!: GameInput;
  private items!: Item[];
  private cursor!: number;
  private rows!: Label[];
  private pointer!: Label;
  private confirming!: boolean;
  /** The dark band behind the menu, sized to its rows. */
  private band!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Title');
  }

  init(data: { cursor?: number }): void {
    this.cursor = data.cursor ?? 0;
    this.rows = [];
    this.confirming = false;
  }

  preload(): void {
    loadMusic(this, ['title']);
  }

  create(): void {
    this.add.image(0, 0, 'title_background_wide').setOrigin(0);
    const logo = this.add.image(16, 8, 'title_logo_night').setOrigin(0).setScale(2);
    animateTitle(this, logo);
    // dark bands so the menu reads over the busy skyline
    this.band = this.add.rectangle(240, MENU_Y, 168, 58, 0x000000, 0.6);
    this.add.rectangle(240, 258, 480, 16, 0x000000, 0.6);
    this.controls = new GameInput(this, true);
    const keys = this.controls.bindings;
    uiText(this, 240, 258, `${actionKeys(keys, 'jump')} / ENTER  SELECT     ARROWS  MOVE     M  MUTE`, { color: UI.dim, origin: 0.5 });
    this.pointer = uiText(this, 0, 0, '>', { color: UI.warn });
    this.mainMenu(this.cursor);
    GameAudio.of(this.game)?.music.play('title', 400);
    fadeIn(this);
  }

  private mainMenu(cursor = 0): void {
    const save = getSave(this.registry);
    this.confirming = false;
    const more = [
      { label: 'RECORDS', run: () => this.records() },
      { label: 'OPTIONS', run: () => this.options() },
    ];
    this.show(
      hasProgress(save)
        ? [{ label: 'CONTINUE', run: () => this.start() }, { label: 'NEW GAME', run: () => this.askErase() }, ...more]
        : [{ label: 'START', run: () => this.start() }, ...more],
      cursor,
    );
  }

  /** The options overlay; the title restarts after it, so hints and input use the new bindings. */
  private options(): void {
    hideLabels(this); // the title restarts on close, which rebuilds them
    const data: OptionsData = { onClose: () => this.scene.restart({ cursor: this.cursor }) };
    this.scene.pause();
    this.scene.launch('Options', data);
  }

  /** The records board; it comes back here with the cursor where it was. */
  private records(): void {
    GameAudio.of(this.game)?.sfx.play('weaponSwitch');
    const data: RecordsData = { cursor: this.cursor };
    fadeTo(this, 'Records', data);
  }

  private askErase(): void {
    this.confirming = true;
    this.show(
      [
        { label: 'ERASE SAVE: NO', run: () => this.mainMenu() },
        {
          label: 'ERASE SAVE: YES',
          run: () => {
            // settings are not progress: rebound keys and volume survive a new game
            const { bindings, volume } = getSave(this.registry);
            commitSave(this.registry, { ...newSave(), ...(bindings && { bindings }), ...(volume && { volume }) });
            this.start();
          },
        },
      ],
      0,
    );
  }

  private show(items: Item[], cursor = 0): void {
    for (const r of this.rows) r.destroy();
    this.items = items;
    this.cursor = cursor;
    this.rows = items.map((it, i) => uiText(this, 240, MENU_Y + i * ROW, it.label, { origin: 0.5 }));
    this.band.setSize(168, items.length * ROW + 8).setOrigin(0.5, 0).setY(MENU_Y - ROW / 2 - 4);
    this.focus();
  }

  private focus(): void {
    this.rows.forEach((r, i) => r.setColor(i === this.cursor ? UI.text : UI.dim));
    const row = this.rows[this.cursor]!;
    this.pointer.setPosition(row.x - row.width / 2 - 12, row.y);
  }

  private start(): void {
    GameAudio.of(this.game)?.sfx.play('checkpoint');
    GameAudio.of(this.game)?.music.stop(300);
    fadeTo(this, 'StageSelect');
  }

  update(): void {
    const s = this.controls.poll();
    const audio = GameAudio.of(this.game);
    const n = this.items.length;
    if (s.justPressed('up') || s.justPressed('down')) {
      this.cursor = (this.cursor + (s.justPressed('up') ? n - 1 : 1)) % n;
      audio?.sfx.play('weaponSwitch');
      this.focus();
    } else if (this.controls.confirm) {
      this.items[this.cursor]!.run();
      return; // the item may have opened an overlay: leave the cursor as it is
    } else if (this.confirming && this.controls.back) {
      this.mainMenu();
    }
    // the cursor blinks
    this.pointer.setVisible(Math.floor(this.time.now / 300) % 2 === 0);
  }
}
