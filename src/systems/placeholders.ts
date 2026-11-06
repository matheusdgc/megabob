import Phaser from 'phaser';
import type { SheetDef } from '../data/assets';

const OUTLINE = 0x161616;

/**
 * Draws a placeholder spritesheet: `frames` cells side by side, each visibly different
 * (frame index bars), then registers numbered frames like a real spritesheet.
 */
export function generatePlaceholder(scene: Phaser.Scene, def: SheetDef): void {
  const { key, frameWidth: w, frameHeight: h, frames } = def;
  if (scene.textures.exists(key)) scene.textures.remove(key);

  const g = scene.make.graphics({}, false);
  for (let i = 0; i < frames; i++) {
    const ox = i * w;
    if (def.placeholder.shape === 'body') drawBody(g, ox, w, h, def.placeholder.color, i);
    else if (def.placeholder.shape === 'fx') drawFx(g, ox, w, h, def.placeholder.color, i);
    else drawTile(g, ox, w, h, i);
  }
  g.generateTexture(key, w * frames, h);
  g.destroy();

  const tex = scene.textures.get(key);
  for (let i = 0; i < frames; i++) tex.add(i, 0, i * w, 0, w, h);
}

/** Effect blob: a colored rounded block, inset one more pixel each frame. */
function drawFx(g: Phaser.GameObjects.Graphics, ox: number, w: number, h: number, color: number, i: number): void {
  const inset = Math.min(i, Math.floor(Math.min(w, h) / 4));
  g.fillStyle(color);
  g.fillRoundedRect(ox + inset, inset, w - inset * 2, h - inset * 2, Math.min(w, h) / 4);
}

/** Chibi-proportioned block: big head, small body, facing right (eye on the right). */
function drawBody(g: Phaser.GameObjects.Graphics, ox: number, w: number, h: number, color: number, i: number): void {
  const bw = 24;
  const bh = 34;
  const x = ox + (w - bw) / 2;
  const y = h - bh; // feet on the bottom of the cell
  g.fillStyle(OUTLINE);
  g.fillRect(x - 1, y - 1, bw + 2, bh + 2);
  g.fillStyle(0xe0e0e0); // head
  g.fillRect(x, y + 4, bw, 14);
  g.fillStyle(color); // helmet
  g.fillRect(x - 1, y, bw + 2, 6);
  g.fillStyle(0xffffff); // body
  g.fillRect(x + 4, y + 18, bw - 8, 10);
  g.fillStyle(color); // feet
  g.fillRect(x + 2, y + 28, 8, 6);
  g.fillRect(x + bw - 10, y + 28, 8, 6);
  g.fillStyle(OUTLINE); // eye
  g.fillRect(x + bw - 8, y + 9, 3, 4);
  // frame index: i+1 small bars on the chest
  g.fillStyle(0xf1c21b);
  for (let k = 0; k <= i; k++) g.fillRect(x + 5 + k * 2, y + 21, 1, 3);
}

function drawTile(g: Phaser.GameObjects.Graphics, ox: number, w: number, h: number, i: number): void {
  switch (i) {
    case 0: // solid
      g.fillStyle(0x393939);
      g.fillRect(ox, 0, w, h);
      g.fillStyle(0x6f6f6f);
      g.fillRect(ox, 0, w, 2);
      g.fillStyle(0x161616);
      g.fillRect(ox + w - 1, 0, 1, h);
      g.fillRect(ox, h - 1, w, 1);
      break;
    case 1: // background wall
      g.fillStyle(0x161616);
      g.fillRect(ox, 0, w, h);
      g.fillStyle(0x262626);
      g.fillRect(ox + 1, 1, w - 2, h - 2);
      break;
    case 2: // spike
      g.fillStyle(0xda1e28);
      for (let s = 0; s < 4; s++) g.fillTriangle(ox + s * 4, h, ox + s * 4 + 2, h - 8, ox + s * 4 + 4, h);
      break;
    case 3: // one-way platform
      g.fillStyle(0x4589ff);
      g.fillRect(ox, 0, w, 4);
      g.fillStyle(0x0043ce);
      g.fillRect(ox, 4, w, 2);
      break;
  }
}
