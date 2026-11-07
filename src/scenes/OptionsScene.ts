import Phaser from 'phaser';
import { GameAudio } from '../audio';
import { DEFAULT_VOLUMES } from '../audio/mixer';
import { ACTIONS, type Action } from '../systems/actions';
import {
  type Bindings,
  conflictFor,
  DEFAULT_BINDINGS,
  defaultBindings,
  type Device,
  isLocked,
  isReserved,
  keyLabel,
  keyNameFor,
  normalizeBindings,
  rebind,
} from '../systems/bindings';
import { GameInput } from '../systems/input';
import { stepVolume, type Volumes } from '../systems/save';
import { type Label, UI, uiText } from '../ui/text';
import { commitSave, getSave } from './progress';

export interface OptionsData {
  /** Called when the screen closes; the caller rebuilds its input (bindings may have changed). */
  onClose(): void;
}

const ACTION_NAMES: Record<Action, string> = {
  left: 'MOVER À ESQUERDA',
  right: 'MOVER À DIREITA',
  up: 'CIMA',
  down: 'BAIXO',
  jump: 'PULAR',
  shoot: 'ATIRAR',
  dash: 'DASH',
  prevWeapon: 'ARMA ANTERIOR',
  nextWeapon: 'PRÓXIMA ARMA',
  pause: 'PAUSA / MENU',
};

type Row =
  | { kind: 'action'; action: Action }
  | { kind: 'volume'; bus: keyof Volumes; name: string }
  | { kind: 'shake' }
  | { kind: 'reset' }
  | { kind: 'back' };

/** Columns of an action row: two keys and a pad button. */
const COLS: { device: Device; slot: number; x: number }[] = [
  { device: 'keys', slot: 0, x: 210 },
  { device: 'keys', slot: 1, x: 290 },
  { device: 'pad', slot: 0, x: 380 },
];
const NAME_X = 52;
const TOP = 46;
const STEP = 12.5;
const PAD_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'BACK', 'START', 'L3', 'R3', 'D-↑', 'D-↓', 'D-←', 'D-→', 'HOME'];

/**
 * Options (gamedev input-systems skill): every action's two keys and pad button, rebound by
 * picking a cell and pressing the new input; a used input swaps with its old action, so nothing
 * is left unbound. Volumes, screen shake and "reset controls" below. Every change is saved and
 * applies at once. Esc stays on pause, and M, Enter and the dev keys cannot be bound.
 */
export class OptionsScene extends Phaser.Scene {
  private opts!: OptionsData;
  private controls!: GameInput;
  private bindings!: Bindings;
  private rows!: Row[];
  private row!: number;
  private col!: number;
  private cells!: Label[][];
  private status!: Label;
  private pointer!: Phaser.GameObjects.Rectangle;
  /** Waiting for the new input of a cell, or null. */
  private capture!: { action: Action; device: Device; slot: number; padHeld: Set<number> } | null;
  private closed!: boolean;
  /** A result message stays up until this time (scene clock), then the row hint returns. */
  private messageUntil!: number;

  constructor() {
    super('Options');
  }

  init(data: OptionsData): void {
    this.opts = data;
    this.bindings = normalizeBindings(getSave(this.registry).bindings ?? DEFAULT_BINDINGS);
    this.rows = [
      ...ACTIONS.map((action): Row => ({ kind: 'action', action })),
      { kind: 'volume', bus: 'master', name: 'VOLUME GERAL' },
      { kind: 'volume', bus: 'music', name: 'MÚSICA' },
      { kind: 'volume', bus: 'sfx', name: 'EFEITOS SONOROS' },
      { kind: 'shake' },
      { kind: 'reset' },
      { kind: 'back' },
    ];
    this.row = 0;
    this.col = 0;
    this.cells = [];
    this.capture = null;
    this.closed = false;
    this.messageUntil = 0;
  }

  create(): void {
    this.add.rectangle(240, 135, 480, 270, 0x000000, 0.75);
    this.add.rectangle(240, 135, 440, 252, 0x262626).setStrokeStyle(2, 0x0f62fe);
    uiText(this, NAME_X - 12, 22, 'OPÇÕES', { size: 12 });
    uiText(this, COLS[0]!.x, 34, 'TECLA', { color: UI.accent, origin: 0.5 });
    uiText(this, COLS[1]!.x, 34, 'TECLA 2', { color: UI.accent, origin: 0.5 });
    uiText(this, COLS[2]!.x, 34, 'CONTROLE', { color: UI.accent, origin: 0.5 });
    this.pointer = this.add.rectangle(0, 0, 70, 11, 0x0f62fe, 0.45);
    this.rows.forEach((r, i) => {
      const y = TOP + i * STEP + (i >= ACTIONS.length ? 4 : 0);
      this.cells[i] = [uiText(this, NAME_X, y, this.rowName(r)), ...(r.kind === 'action' ? COLS.map((c) => uiText(this, c.x, y, '', { origin: 0.5 })) : [uiText(this, COLS[1]!.x, y, '', { origin: 0.5 })])];
    });
    this.status = uiText(this, 240, 256, '', { color: UI.dim, origin: 0.5 });
    this.controls = new GameInput(this, true);
    this.input.keyboard!.on('keydown', this.onKey, this);
    this.refresh();
  }

  private rowName(r: Row): string {
    switch (r.kind) {
      case 'action':
        return ACTION_NAMES[r.action];
      case 'volume':
        return r.name;
      case 'shake':
        return 'TREMOR E FLASH';
      case 'reset':
        return 'RESTAURAR CONTROLES';
      case 'back':
        return 'VOLTAR';
    }
  }

  private get volumes(): Volumes {
    return { ...DEFAULT_VOLUMES, ...getSave(this.registry).volume };
  }

  /** Redraw every value and the cursor. */
  private refresh(): void {
    const vol = this.volumes;
    this.rows.forEach((r, i) => {
      const cells = this.cells[i]!;
      const focus = i === this.row;
      cells[0]!.setColor(focus ? UI.text : UI.dim);
      if (r.kind === 'action') {
        COLS.forEach((c, j) => {
          const list = c.device === 'keys' ? this.bindings.keys[r.action] : this.bindings.pad[r.action];
          const v = list[c.slot];
          const text = v === undefined ? '-' : c.device === 'keys' ? keyLabel(String(v)) : (PAD_NAMES[v as number] ?? `B${v}`);
          const waiting = this.capture && this.capture.action === r.action && this.capture.device === c.device && this.capture.slot === c.slot;
          cells[j + 1]!.setText(waiting ? '...' : text).setColor(isLocked(c.device, r.action, c.slot) ? UI.dim : focus ? UI.text : UI.dim);
        });
      } else if (r.kind === 'volume') {
        const v = vol[r.bus];
        cells[1]!.setText(`< ${'|'.repeat(Math.round(v * 10)).padEnd(10, '.')} >`).setColor(focus ? UI.text : UI.dim);
      } else if (r.kind === 'shake') {
        cells[1]!.setText(getSave(this.registry).reduceMotion ? '< NÃO >' : '< SIM >').setColor(focus ? UI.text : UI.dim);
      }
    });
    const r = this.rows[this.row]!;
    const y = this.cells[this.row]![0]!.y;
    if (r.kind === 'action') this.pointer.setPosition(COLS[this.col]!.x, y).setSize(74, 11);
    else this.pointer.setPosition(NAME_X + 60, y).setSize(140, 11);
    this.pointer.setOrigin(r.kind === 'action' ? 0.5 : 0.5, 0.5);
    if (!this.capture && this.time.now >= this.messageUntil) this.status.setText(this.hint(r)).setColor(UI.dim);
  }

  private hint(r: Row): string {
    if (r.kind === 'action') return 'ENTER: TROCAR     ESC: VOLTAR';
    if (r.kind === 'volume' || r.kind === 'shake') return '← →: AJUSTAR     ESC: VOLTAR';
    return 'ENTER: OK     ESC: VOLTAR';
  }

  update(): void {
    if (this.closed) return;
    if (this.capture) {
      this.pollPadCapture();
      return;
    }
    const s = this.controls.poll();
    const n = this.rows.length;
    const r = this.rows[this.row]!;
    if (s.justPressed('up') || s.justPressed('down')) {
      this.row = (this.row + (s.justPressed('up') ? n - 1 : 1)) % n;
      this.blip();
    } else if (s.justPressed('left') || s.justPressed('right')) {
      const dir = s.justPressed('left') ? -1 : 1;
      if (r.kind === 'action') this.col = (this.col + dir + COLS.length) % COLS.length;
      else if (r.kind === 'volume') this.setVolume(r.bus, stepVolume(this.volumes[r.bus], dir));
      else if (r.kind === 'shake') this.toggleShake();
      this.blip();
    } else if (this.controls.confirm) {
      this.activate(r);
    } else if (this.controls.back) {
      this.close();
      return;
    }
    this.refresh();
  }

  private activate(r: Row): void {
    switch (r.kind) {
      case 'action': {
        const c = COLS[this.col]!;
        if (isLocked(c.device, r.action, c.slot)) {
          this.say('ESC SEMPRE PAUSA - USE A TECLA 2', UI.warn);
          return;
        }
        const pad = this.input.gamepad?.pad1;
        const held = new Set<number>(pad?.connected ? pad.buttons.map((b, i) => (b.pressed ? i : -1)).filter((i) => i >= 0) : []);
        this.capture = { action: r.action, device: c.device, slot: c.slot, padHeld: held };
        this.refresh();
        this.say(c.device === 'keys' ? `APERTE UMA TECLA PARA ${ACTION_NAMES[r.action]}  (ESC CANCELA)` : `APERTE UM BOTÃO DO CONTROLE PARA ${ACTION_NAMES[r.action]}  (ESC CANCELA)`, UI.warn);
        return;
      }
      case 'shake':
        this.toggleShake();
        return;
      case 'reset':
        this.bindings = defaultBindings();
        this.saveBindings();
        this.say('CONTROLES RESTAURADOS', UI.accent);
        return;
      case 'back':
        this.close();
        return;
      case 'volume':
        return;
    }
  }

  /** Keyboard capture (any keydown while waiting). */
  private onKey(e: KeyboardEvent): void {
    const c = this.capture;
    if (!c) return;
    const name = keyNameFor(e.keyCode, e.location, Phaser.Input.Keyboard.KeyCodes as unknown as Record<string, number>);
    if (name === 'ESC') return this.endCapture('CANCELADO');
    if (c.device !== 'keys') return; // waiting for a pad button
    if (!name) return this.endCapture('ESSA TECLA NÃO É ACEITA');
    if (isReserved(name)) return this.endCapture(`${keyLabel(name)} É RESERVADA`);
    this.assign(c.action, 'keys', c.slot, name);
  }

  private pollPadCapture(): void {
    const c = this.capture!;
    if (c.device !== 'pad') return;
    const pad = this.input.gamepad?.pad1;
    if (!pad?.connected) return;
    pad.buttons.forEach((b, i) => {
      if (!b.pressed) c.padHeld.delete(i);
      else if (!c.padHeld.has(i) && this.capture) this.assign(c.action, 'pad', c.slot, i);
    });
  }

  private assign<D extends Device>(action: Action, device: D, slot: number, input: Bindings[D][Action][number]): void {
    const other = conflictFor(this.bindings, device, action, input);
    const next = rebind(this.bindings, device, action, slot, input);
    const label = device === 'keys' ? keyLabel(String(input)) : (PAD_NAMES[input as number] ?? `B${input}`);
    if (JSON.stringify(next) === JSON.stringify(this.bindings) && other) {
      return this.endCapture(`${label} É O ÚNICO COMANDO DE ${ACTION_NAMES[other]}`);
    }
    this.bindings = next;
    this.saveBindings();
    this.endCapture(other ? `${label} TROCADO COM ${ACTION_NAMES[other]}` : `${ACTION_NAMES[action]}: ${label}`, UI.accent);
  }

  private endCapture(msg: string, color: string = UI.warn): void {
    this.capture = null;
    // new bindings: a fresh input reader, armed only once the key just pressed is released
    this.controls.destroy();
    this.controls = new GameInput(this, true);
    this.refresh();
    this.say(msg, color);
  }

  private say(msg: string, color: string): void {
    this.status.setText(msg).setColor(color);
    this.messageUntil = this.time.now + 2500;
  }

  private saveBindings(): void {
    commitSave(this.registry, { ...getSave(this.registry), bindings: this.bindings });
  }

  private setVolume(bus: keyof Volumes, v: number): void {
    const volume = { ...this.volumes, [bus]: v };
    commitSave(this.registry, { ...getSave(this.registry), volume });
    GameAudio.of(this.game)?.mixer.setVolumes(volume);
  }

  private toggleShake(): void {
    const s = getSave(this.registry);
    commitSave(this.registry, { ...s, reduceMotion: !s.reduceMotion });
    if (!s.reduceMotion) return;
    this.cameras.main.shake(150, 0.006); // turned back on: show what it does
  }

  private blip(): void {
    GameAudio.of(this.game)?.sfx.play('weaponSwitch');
  }

  private close(): void {
    this.closed = true;
    this.input.keyboard!.off('keydown', this.onKey, this);
    this.controls.destroy();
    this.scene.stop();
    this.opts.onClose();
  }
}
