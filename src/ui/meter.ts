import type Phaser from 'phaser';

/** Inner width of a meter, px. */
export const METER_W = 8;
/** Each point is a 2 px row: 1 px fill + 1 px gap. */
const SEG = 2;

/** Outer height of a meter for `max` points (frame included). */
export const meterHeight = (max: number): number => max * SEG + 1 + 8;

/**
 * Draws a vertical segmented meter (fills from the bottom) with its frame top-left at
 * (x - 2, top - 4). `fill` is the segment color; the top filled segment gets a highlight.
 */
export function drawMeter(
  g: Phaser.GameObjects.Graphics,
  x: number,
  top: number,
  value: number,
  max: number,
  fill: number,
  trim = 0x0043ce,
): void {
  const h = max * SEG + 1;
  g.fillStyle(0x161616).fillRect(x - 2, top - 4, METER_W + 4, h + 8);
  g.fillStyle(trim).fillRect(x - 1, top - 3, METER_W + 2, 2).fillRect(x - 1, top + h + 1, METER_W + 2, 2);
  g.fillStyle(0x262626).fillRect(x, top, METER_W, h);
  const filled = Math.max(0, Math.min(max, Math.round(value)));
  for (let i = 0; i < filled; i++) {
    const y = top + h - (i + 1) * SEG;
    g.fillStyle(i === filled - 1 && filled < max ? 0xffffff : fill).fillRect(x + 1, y, METER_W - 2, 1);
  }
}
