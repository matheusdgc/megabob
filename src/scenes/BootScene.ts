import Phaser from 'phaser';
import { SHEETS } from '../data/assets';
import { generatePlaceholder } from '../systems/placeholders';
import { STAGES } from '../stages/stages';
import { bootSave } from './progress';

/**
 * Loads every sheet that has a real file; anything missing or failing gets a placeholder
 * with the same key and frame layout.
 */
export class BootScene extends Phaser.Scene {
  private readonly failed = new Set<string>();

  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      this.failed.add(file.key);
    });
    for (const s of SHEETS) {
      if (s.file) {
        this.load.spritesheet(s.key, s.file, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
      }
    }
  }

  create(): void {
    for (const s of SHEETS) {
      if (!s.file || this.failed.has(s.key)) {
        if (this.failed.has(s.key)) console.warn(`[assets] ${s.key}: ${s.file} failed, using placeholder`);
        generatePlaceholder(this, s);
      }
    }
    bootSave(this.registry);
    // dev: ?sprites opens the sprite/input debug screen, ?stage=<id> jumps straight into a stage
    const params = new URLSearchParams(location.search);
    const stage = import.meta.env.DEV ? params.get('stage') : null;
    if (params.has('sprites')) this.scene.start('Debug');
    else if (stage && stage in STAGES) this.scene.start('Stage', { stage });
    else this.scene.start('Title');
  }
}
