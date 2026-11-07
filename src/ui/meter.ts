import type Phaser from 'phaser';

/** The meter art (hud_meter_frame, 12×72): a frame around a 6×56 channel at (3, 8). */
export const METER_W = 12;
export const METER_H = 72;
const CHANNEL = { x: 3, y: 8, w: 6, h: 56 };
/** The channel holds 28 segments, one 1 px row every 2 px (hud_segment_*: 6×1). */
export const METER_SEGMENTS = 28;
const PITCH = CHANNEL.h / METER_SEGMENTS;
const EMPTY = 0x262626;

/** How many of the meter's segments `value` out of `max` lights (any max maps onto the 28). */
export function litSegments(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(METER_SEGMENTS, Math.round((value / max) * METER_SEGMENTS)));
}

/**
 * What a segment looks like: a segment texture (hud_segment_blue, hud_segment_yellow), or a
 * color drawn in the same three tones as that art (a white glint, the color, a darker edge),
 * for meters whose color changes (each special weapon has its own).
 */
export type SegmentLook = { texture: string } | { color: number };

const darker = (c: number): number => {
  const k = 0.6;
  return (Math.round(((c >> 16) & 0xff) * k) << 16) | (Math.round(((c >> 8) & 0xff) * k) << 8) | Math.round((c & 0xff) * k);
};

/**
 * A vertical segmented meter from the HUD art: the frame sprite, its channel backed in dark
 * grey, and the segments filling from the bottom. Fixed to the screen at (x, y), its top-left.
 */
export class Meter {
  private readonly frame: Phaser.GameObjects.Image;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly segments: Phaser.GameObjects.Image[] = [];
  private look: SegmentLook;
  private shown = '';

  constructor(scene: Phaser.Scene, readonly x: number, readonly y: number, look: SegmentLook, depth: number) {
    this.look = look;
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    this.frame = scene.add.image(x, y, 'hud_meter_frame').setOrigin(0).setScrollFactor(0).setDepth(depth);
    for (let i = 0; i < METER_SEGMENTS; i++) {
      const sy = y + CHANNEL.y + CHANNEL.h - (i + 1) * PITCH;
      this.segments.push(scene.add.image(x + CHANNEL.x, sy, 'hud_segment_blue').setOrigin(0).setScrollFactor(0).setDepth(depth).setVisible(false));
    }
  }

  /** Redraws only when the value or the look changes. */
  set(value: number, max: number, look: SegmentLook = this.look): void {
    const lit = litSegments(value, max);
    const key = `${lit}|${'texture' in look ? look.texture : look.color}`;
    if (key === this.shown) return;
    this.shown = key;
    this.look = look;
    const g = this.g.clear();
    g.fillStyle(EMPTY).fillRect(this.x + CHANNEL.x, this.y + CHANNEL.y, CHANNEL.w, CHANNEL.h);
    const drawn = 'color' in look;
    this.segments.forEach((s, i) => {
      const on = i < lit;
      s.setVisible(on && !drawn);
      if (on && !drawn) s.setTexture(look.texture);
      if (on && drawn) {
        const sy = s.y;
        const x = this.x + CHANNEL.x;
        g.fillStyle(0xffffff).fillRect(x, sy, 1, 1);
        g.fillStyle(look.color).fillRect(x + 1, sy, CHANNEL.w - 2, 1);
        g.fillStyle(darker(look.color)).fillRect(x + CHANNEL.w - 1, sy, 1, 1);
      }
    });
  }

  setVisible(on: boolean): void {
    this.frame.setVisible(on);
    this.g.setVisible(on);
    if (!on) for (const s of this.segments) s.setVisible(false);
    if (on) this.shown = ''; // the next set() redraws the segments
  }

  destroy(): void {
    this.frame.destroy();
    this.g.destroy();
    for (const s of this.segments) s.destroy();
  }
}
