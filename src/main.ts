import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PHYSICS_FPS } from './config';
import { BootScene } from './scenes/BootScene';
import { DebugScene } from './scenes/DebugScene';
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
  scene: [BootScene, DebugScene],
});

window.addEventListener('resize', () => game.scale.setZoom(zoomFor()));

// Dev-only handle for browser debugging (stripped from production builds).
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
