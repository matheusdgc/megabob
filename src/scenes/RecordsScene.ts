import Phaser from 'phaser';
import { GameAudio, loadMusic } from '../audio';
import { actionKeys } from '../systems/bindings';
import { GameInput } from '../systems/input';
import {
  entryOf,
  formatTime,
  insertScore,
  loadBoard,
  NAME_CHARS,
  NAME_MAX,
  qualifies,
  runSeconds,
  SCORE_RULES,
  type ScoreEntry,
  scoreOf,
  writeBoard,
} from '../systems/scores';
import type { KeyValueStore } from '../systems/save';
import { fadeIn, fadeTo, type Label, UI, uiText } from '../ui/text';
import { commitSave, getSave } from './progress';

export interface RecordsData {
  /** Straight after the credits: show this run's result, and take a name if it made the board. */
  result?: boolean;
  /** Where the title's cursor goes back to. */
  cursor?: number;
}

function storage(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Table columns (x) and rows (y). */
const COL = { rank: 76, name: 92, score: 236, time: 290, deaths: 340, kills: 400 };
const ROW0 = 78;
const ROW = 12;
/** Name slots: NAME_MAX letters, then END. */
const SLOT_X = 240 - ((NAME_MAX + 1) * 14) / 2;
const END = NAME_MAX;
/** Keys typed straight into the name (they never reach the game's controls or the mute key). */
const TYPED = /^(Key[A-Z]|Digit[0-9]|Minus|Period)$/;

type Mode = 'result' | 'entry' | 'board';

/**
 * The records: the top 10 runs that beat the game in this browser (src/systems/scores.ts).
 * From the title it only shows the board. After the credits it shows the run's result first;
 * if the run made the board, the player enters a name (pad: up/down picks a letter,
 * left/right moves; keyboard: type it), then the board shows it highlighted.
 */
export class RecordsScene extends Phaser.Scene {
  private controls!: GameInput;
  private opts!: RecordsData;
  private mode!: Mode;
  private labels!: Label[];
  private name!: string[];
  private cursor!: number;
  private slots!: Label[];
  private highlight!: number;
  private leaving!: boolean;
  private typed!: (e: KeyboardEvent) => void;

  constructor() {
    super('Records');
  }

  init(data: RecordsData): void {
    this.opts = data ?? {};
    this.labels = [];
    this.slots = [];
    this.name = Array.from({ length: NAME_MAX }, () => ' ');
    this.cursor = 0;
    this.highlight = -1;
    this.leaving = false;
  }

  preload(): void {
    loadMusic(this, ['title']);
  }

  create(): void {
    this.add.image(0, 0, 'title_background_wide').setOrigin(0);
    this.add.rectangle(240, 135, 480, 270, 0x000000, 0.72);
    this.controls = new GameInput(this, true);
    this.typed = (e) => this.onKey(e);
    document.addEventListener('keydown', this.typed, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => document.removeEventListener('keydown', this.typed, true));
    GameAudio.of(this.game)?.music.play('title', 400);
    if (this.opts.result) this.showResult();
    else this.showBoard();
    fadeIn(this);
  }

  // ------------------------------------------------------------------ screens

  private clear(): void {
    for (const l of this.labels) l.destroy();
    this.labels = [];
    this.slots = [];
  }

  private text(x: number, y: number, s: string, opts: Parameters<typeof uiText>[4] = {}): Label {
    const l = uiText(this, x, y, s, opts);
    this.labels.push(l);
    return l;
  }

  private hint(s: string): void {
    this.text(240, 250, s, { color: UI.dim, origin: 0.5 });
  }

  /** The run's numbers and how they make the score. */
  private showResult(): void {
    this.mode = 'result';
    this.clear();
    const run = getSave(this.registry).run;
    const r = SCORE_RULES;
    const secs = runSeconds(run);
    this.text(240, 34, 'JOGO ZERADO', { size: 16, color: UI.accent, origin: 0.5 });
    const rows: [string, string, string][] = [
      ['BÔNUS POR ZERAR', '', `${r.base}`],
      ['INIMIGOS', `${run.kills}`, `+${run.kills * r.perKill}`],
      ['MORTES', `${run.deaths}`, `-${run.deaths * r.perDeath}`],
      ['TEMPO', formatTime(secs), `-${secs * r.perSecond}`],
    ];
    rows.forEach(([what, n, pts], i) => {
      const y = 66 + i * 14;
      this.text(150, y, what, { color: UI.dim });
      this.text(290, y, n, { origin: 1 });
      this.text(340, y, pts, { origin: 1 });
    });
    this.text(150, 128, 'PONTOS', { size: 12, color: UI.warn });
    this.text(340, 128, `${scoreOf(run)}`, { size: 12, color: UI.warn, origin: 1 });

    const board = loadBoard(storage());
    const entry = entryOf('BOB', run, new Date());
    if (!run.ranked) {
      this.text(240, 164, 'Esta partida começou antes dos recordes,', { color: UI.dim, origin: 0.5 });
      this.text(240, 176, 'ou já foi registrada: não entra no quadro.', { color: UI.dim, origin: 0.5 });
      this.hint(`${this.confirmKeys()}  RECORDES`);
    } else if (qualifies(board, entry)) {
      this.showEntry();
    } else {
      this.unrank();
      this.text(240, 170, 'Desta vez não entrou no top 10.', { color: UI.dim, origin: 0.5 });
      this.hint(`${this.confirmKeys()}  RECORDES`);
    }
  }

  /** The name slots under the result. */
  private showEntry(): void {
    this.mode = 'entry';
    this.text(240, 160, 'NOVO RECORDE!  DIGITE SEU NOME', { color: UI.accent, origin: 0.5 });
    for (let i = 0; i <= END; i++) {
      this.slots.push(this.text(SLOT_X + i * 14 + (i === END ? 10 : 0), 184, i === END ? 'FIM' : '_', { size: 12, origin: 0.5 }));
    }
    this.hint('DIGITE, OU CIMA/BAIXO LETRA  ESQ./DIR. MOVER    ENTER  PRONTO');
    this.drawSlots();
  }

  private drawSlots(): void {
    this.slots.forEach((l, i) => {
      if (i < END) l.setText(this.name[i] === ' ' ? '_' : this.name[i]!);
      l.setColor(i === this.cursor ? UI.warn : i === END ? UI.dim : UI.text);
    });
  }

  /** The top 10, the new entry (if any) highlighted. */
  private showBoard(): void {
    this.mode = 'board';
    this.clear();
    const board = loadBoard(storage());
    this.text(240, 34, 'RECORDES', { size: 16, color: UI.accent, origin: 0.5 });
    const head = { color: UI.dim };
    this.text(COL.name, 60, 'NOME', head);
    this.text(COL.score, 60, 'PONTOS', { ...head, origin: 1 });
    this.text(COL.time, 60, 'TEMPO', { ...head, origin: 1 });
    this.text(COL.deaths, 60, 'MORTES', { ...head, origin: 1 });
    this.text(COL.kills, 60, 'INIMIGOS', { ...head, origin: 1 });
    if (board.length === 0) this.text(240, ROW0 + 2 * ROW, 'Ninguém venceu os bugs ainda.', { color: UI.dim, origin: 0.5 });
    board.forEach((e, i) => this.row(e, i));
    this.text(240, 212, `${SCORE_RULES.base} + ${SCORE_RULES.perKill} por inimigo - ${SCORE_RULES.perDeath} por morte - ${SCORE_RULES.perSecond} por segundo`, {
      color: UI.dim,
      origin: 0.5,
    });
    this.hint(`${this.confirmKeys()}  ${this.opts.result ? 'TÍTULO' : 'VOLTAR'}`);
  }

  private row(e: ScoreEntry, i: number): void {
    const y = ROW0 + i * ROW;
    const color = i === this.highlight ? UI.warn : UI.text;
    this.text(COL.rank, y, `${i + 1}`, { color: UI.dim, origin: 1 });
    this.text(COL.name, y, e.name, { color });
    this.text(COL.score, y, `${e.score}`, { color, origin: 1 });
    this.text(COL.time, y, formatTime(e.seconds), { color, origin: 1 });
    this.text(COL.deaths, y, `${e.deaths}`, { color, origin: 1 });
    this.text(COL.kills, y, `${e.kills}`, { color, origin: 1 });
  }

  private confirmKeys(): string {
    return `${actionKeys(this.controls.bindings, 'jump')} / ENTER`;
  }

  // ------------------------------------------------------------------ saving

  /** The run has had its chance at the board: it will not be offered again. */
  private unrank(): void {
    const s = getSave(this.registry);
    commitSave(this.registry, { ...s, run: { ...s.run, ranked: false } });
  }

  private submit(): void {
    const run = getSave(this.registry).run;
    const { board, rank } = insertScore(loadBoard(storage()), entryOf(this.name.join(''), run, new Date()));
    writeBoard(storage(), board);
    this.unrank();
    this.highlight = rank;
    GameAudio.of(this.game)?.sfx.play('checkpoint');
    this.showBoard();
  }

  // ------------------------------------------------------------------ input

  /** Typing a name: letters and digits go into the slot (and never reach the game's keys). */
  private onKey(e: KeyboardEvent): void {
    if (this.mode !== 'entry') return;
    if (e.code === 'Enter') {
      this.cursor = END; // the confirm this Enter also makes finishes the name
      return;
    }
    if (!TYPED.test(e.code) || e.repeat) return;
    e.stopPropagation();
    e.preventDefault();
    const c = e.code.startsWith('Key') ? e.code.slice(3) : e.code.startsWith('Digit') ? e.code.slice(5) : e.code === 'Minus' ? '-' : '.';
    if (this.cursor >= END) this.cursor = END - 1;
    this.name[this.cursor] = c;
    this.cursor = Math.min(END, this.cursor + 1);
    GameAudio.of(this.game)?.sfx.play('weaponSwitch');
    this.drawSlots();
  }

  update(): void {
    const s = this.controls.poll();
    if (this.leaving) return;
    if (this.mode === 'entry') {
      const audio = GameAudio.of(this.game);
      if (s.justPressed('left') || s.justPressed('right')) {
        this.cursor = Phaser.Math.Clamp(this.cursor + (s.justPressed('left') ? -1 : 1), 0, END);
        audio?.sfx.play('weaponSwitch');
      } else if ((s.justPressed('up') || s.justPressed('down')) && this.cursor < END) {
        const i = NAME_CHARS.indexOf(this.name[this.cursor]!);
        const n = NAME_CHARS.length;
        this.name[this.cursor] = NAME_CHARS[(i + (s.justPressed('up') ? 1 : n - 1)) % n]!;
        audio?.sfx.play('weaponSwitch');
      } else if (this.controls.confirm) {
        if (this.cursor === END) return this.submit();
        this.cursor++;
      } else if (this.controls.back && this.cursor > 0) {
        this.cursor--;
        this.name[this.cursor] = ' ';
      }
      this.drawSlots();
      return;
    }
    if (!this.controls.confirm && !this.controls.back) return;
    if (this.mode === 'result') {
      this.showBoard();
      return;
    }
    this.leaving = true;
    fadeTo(this, 'Title', { cursor: this.opts.cursor ?? 0 });
  }
}
