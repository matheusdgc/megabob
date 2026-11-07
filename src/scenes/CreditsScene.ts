import Phaser from 'phaser';
import { GameAudio, loadMusic } from '../audio';
import { CREDITS } from '../data/credits';
import { GameInput } from '../systems/input';
import { fadeIn, fadeTo, FONT_FAMILY, UI, uiText } from '../ui/text';

/** Credit scroll: window (from art/exports/end-screen-layout.json) and speed. */
const CLIP = { x: 248, y: 132, w: 216, h: 90 };
const SCROLL_PX_PER_S = 16;
/** Earliest a press may leave. */
const MIN_MS = 2500;

/**
 * The ending: Bob waving over the night city, the logo, and the credits rolling in a window on
 * the right while the credits track plays once. Confirm or back returns to the title after a
 * moment; at the end of the roll it returns by itself.
 */
export class CreditsScene extends Phaser.Scene {
  private controls!: GameInput;
  private ready!: boolean;
  private leaving!: boolean;

  constructor() {
    super('Credits');
  }

  init(): void {
    this.ready = false;
    this.leaving = false;
  }

  preload(): void {
    loadMusic(this, ['credits']);
  }

  create(): void {
    this.add.image(0, 0, 'ending_background').setOrigin(0);
    this.add.image(240, 16, 'title_logo_night').setOrigin(0.5, 0);
    uiText(this, CLIP.x + CLIP.w / 2, 78, 'SYSTEM STABLE', { size: 13, color: UI.accent, origin: 0.5 });
    uiText(this, CLIP.x + CLIP.w / 2, 100, 'Every bug fixed.', { size: 12, origin: 0.5 });

    // the roll: an HTML window that clips a tall list sliding up
    const box = document.createElement('div');
    Object.assign(box.style, { width: `${CLIP.w}px`, height: `${CLIP.h}px`, overflow: 'hidden', pointerEvents: 'none' });
    const list = document.createElement('div');
    Object.assign(list.style, { fontFamily: FONT_FAMILY, fontSize: '8px', lineHeight: '1.5', color: UI.text, textAlign: 'center', whiteSpace: 'pre', textShadow: '0 0.5px 0 #000, 0 -0.5px 0 #000' });
    for (const [head, ...lines] of CREDITS) {
      const h = document.createElement('div');
      Object.assign(h.style, { color: UI.accent, fontWeight: 'bold', marginTop: '8px' });
      h.textContent = head;
      list.append(h, ...lines.map((l) => Object.assign(document.createElement('div'), { textContent: l })));
    }
    box.append(list);
    this.add.dom(CLIP.x, CLIP.y, box).setOrigin(0, 0);

    // start below the window, roll until the last line has left the top
    let offset = CLIP.h;
    list.style.transform = `translateY(${offset}px)`;
    this.time.addEvent({
      delay: 1000 / 60,
      loop: true,
      callback: () => {
        offset -= SCROLL_PX_PER_S / 60;
        list.style.transform = `translateY(${offset}px)`;
        if (offset < -list.offsetHeight - 10) this.leave();
      },
    });

    GameAudio.of(this.game)?.music.play('credits', 800);
    this.controls = new GameInput(this, true);
    this.time.delayedCall(MIN_MS, () => (this.ready = true));
    fadeIn(this, 1200);
  }

  update(): void {
    this.controls.poll();
    if (this.ready && (this.controls.confirm || this.controls.back)) this.leave();
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    GameAudio.of(this.game)?.music.stop(1000);
    fadeTo(this, 'Title', undefined, 1000);
  }
}
