import Phaser from 'phaser';

/** UI palette (IBM-ish blues and greys, like the HUD). */
export const UI = {
  text: '#e0e0e0',
  dim: '#8d8d8d',
  accent: '#4589ff',
  warn: '#f1c21b',
  danger: '#da1e28',
} as const;

/** A clean sans-serif: text is for reading, the pixel art is for looking. */
export const FONT_FAMILY = 'Verdana, "Segoe UI", Tahoma, sans-serif';

export interface LabelOptions {
  /** Size in game pixels (8 small, 12 heading, 16 big); bold from 12 up. */
  size?: number;
  color?: string;
  /** Horizontal origin (0 left, 0.5 center, 1 right); vertically always centered. */
  origin?: number;
  bg?: string;
}

/**
 * UI text as an HTML element over the canvas. The game draws at 480x270 and the browser scales
 * the canvas up, so canvas text comes out blocky; Phaser scales its DOM layer with a CSS
 * transform instead, so the browser draws these letters at the screen's real resolution, sharp
 * at any zoom, while the pixel art keeps its look. DOM sits above the canvas: UI only.
 */
export class Label extends Phaser.GameObjects.DOMElement {
  constructor(scene: Phaser.Scene, x: number, y: number, text: string, opts: LabelOptions = {}) {
    const size = opts.size ?? 8;
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style, {
      fontFamily: FONT_FAMILY,
      fontSize: `${size}px`,
      fontWeight: size >= 12 ? 'bold' : 'normal',
      lineHeight: '1.15',
      whiteSpace: 'pre',
      color: opts.color ?? UI.text,
      pointerEvents: 'none',
      userSelect: 'none',
      // a hairline outline keeps small text readable over busy art
      textShadow: '0 0.5px 0 #000, 0 -0.5px 0 #000, 0.5px 0 0 #000, -0.5px 0 0 #000',
      ...(opts.bg ? { background: opts.bg, padding: '0 1px' } : {}),
    });
    super(scene, x, y, el);
    scene.add.existing(this);
    this.setOrigin(opts.origin ?? 0, 0.5);
  }

  setColor(color: string): this {
    (this.node as HTMLElement).style.color = color;
    return this;
  }

  override setText(text: string): this {
    if (this.node.textContent !== text) {
      this.node.textContent = text;
      this.updateSize();
    }
    return this;
  }

  get text(): string {
    return this.node.textContent ?? '';
  }
}

export const uiText = (scene: Phaser.Scene, x: number, y: number, text: string, opts: LabelOptions = {}): Label =>
  new Label(scene, x, y, text, opts);

/** Labels are HTML, outside the camera's fade: fade them alongside it. */
function fadeLabels(scene: Phaser.Scene, from: number, to: number, ms: number): void {
  const labels = scene.children.list.filter((o): o is Label => o instanceof Label);
  for (const l of labels) l.setAlpha(from);
  scene.tweens.add({ targets: labels, alpha: to, duration: ms });
}

/** Fade the screen (canvas and labels) in from black. Call at the end of create(). */
export function fadeIn(scene: Phaser.Scene, ms = 300): void {
  scene.cameras.main.fadeIn(ms);
  fadeLabels(scene, 0, 1, ms);
}

/** Fade the camera out, then start `key` (one entry point so every screen change feels the same). */
export function fadeTo(scene: Phaser.Scene, key: string, data?: object, ms = 300): void {
  const cam = scene.cameras.main;
  if (cam.fadeEffect.isRunning && cam.fadeEffect.direction) return; // already fading out
  // a press during the fade-in must still leave: cut the fade-in short (direction false = in)
  cam.resetFX();
  cam.fadeOut(ms, 0, 0, 0);
  fadeLabels(scene, 1, 0, ms);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
}
