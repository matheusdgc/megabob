import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PHYSICS_FPS } from './config';
import { BootScene } from './scenes/BootScene';
import { DebugScene } from './scenes/DebugScene';
import { OptionsScene } from './scenes/OptionsScene';
import { PauseScene } from './scenes/PauseScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { TitleScene } from './scenes/TitleScene';
import { UpgradeScene } from './scenes/UpgradeScene';
import { StageScene } from './scenes/StageScene';
import { WeaponGetScene } from './scenes/WeaponGetScene';
import { integerZoom } from './systems/scaling';

const parent = document.getElementById('game');
if (!parent) throw new Error('#game container missing');

const zoomFor = (): number =>
  integerZoom(parent.clientWidth, parent.clientHeight, GAME_WIDTH, GAME_HEIGHT);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: zoomFor(),
  },
  physics: {
    default: 'arcade',
    arcade: {
      fps: PHYSICS_FPS,
      fixedStep: true,
      debug: false,
    },
  },
  input: { gamepad: true },
  // UI text is HTML over the canvas (src/ui/text.ts), so it stays sharp at any zoom
  dom: { createContainer: true },
  // list order is draw order: the pause menu sits above the stage it pauses
  scene: [BootScene, TitleScene, StageSelectScene, StageScene, WeaponGetScene, PauseScene, OptionsScene, UpgradeScene, DebugScene],
});

window.addEventListener('resize', () => game.scale.setZoom(zoomFor()));

// Dev-only handle for browser debugging (stripped from production builds).
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
