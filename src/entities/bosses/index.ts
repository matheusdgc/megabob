import type Phaser from 'phaser';
import type { BossId } from '../../data/weapons';
import type { Boss } from '../Boss';
import { MemoryLeak } from './MemoryLeak';
import { RaceCondition } from './RaceCondition';

/** Bob's hitbox center, or null while he is dead. */
export type BobLocator = () => { x: number; y: number } | null;

/** The boss of a stage, standing at (x, y) (its feet), in a world `worldH` tall. */
export function createBoss(id: BossId, scene: Phaser.Scene, x: number, y: number, worldH: number, bob: BobLocator): Boss {
  switch (id) {
    case 'memoryLeak':
      return new MemoryLeak(scene, x, y, worldH, bob);
    case 'raceCondition':
      return new RaceCondition(scene, x, y, bob);
    default:
      throw new Error(`no boss class for ${id} yet`);
  }
}
