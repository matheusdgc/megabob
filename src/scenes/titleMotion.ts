import Phaser from 'phaser';
import { TITLE_ART as ART } from '../data/titleArt';
import { BOB_LOOPS } from '../systems/bobPose';

/** Scene-owned decoration only: never delays input or touches saves/audio/navigation. */
export function animateTitle(scene: Phaser.Scene, logo: Phaser.GameObjects.Image): void {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const bob = scene.add.sprite(ART.bob.x, ART.bob.feetY, 'bob_idle', 0)
    .setOrigin(0.5, 1).setScale(ART.bob.scale).setName('title-bob');
  const rain = scene.add.graphics().setName('title-rain');
  const maskShape = scene.add.graphics().setVisible(false);
  const mask = maskShape.createGeometryMask();
  const shine = scene.add.image(ART.logo.x, ART.logo.y, 'title_logo_night')
    .setOrigin(0).setScale(ART.logo.scale).setTintFill(ART.shine.color)
    .setAlpha(0).setMask(mask).setName('title-shine');
  const idle = BOB_LOOPS.idle!;
  let elapsed = 0;
  let reduced = preference.matches;

  const settle = (): void => {
    logo.setPosition(ART.logo.x, ART.logo.y).setAlpha(1);
    shine.setAlpha(0);
    rain.clear();
    bob.setFrame(0);
  };
  const preferenceChanged = (): void => {
    reduced = preference.matches;
    // Re-enabling animation resumes ambient motion without replaying the entrance.
    elapsed = Math.max(elapsed, ART.logo.entranceMs);
    settle();
  };
  preference.addEventListener('change', preferenceChanged);
  if (reduced) settle();
  else logo.setAlpha(0).setY(ART.logo.y + ART.logo.rise);

  const update = (_time: number, delta: number): void => {
    if (reduced) return;
    elapsed += Math.min(delta, 50);
    const intro = Math.min(1, elapsed / ART.logo.entranceMs);
    const eased = 1 - (1 - intro) ** 3;
    logo.setAlpha(eased).setY(Math.round(ART.logo.y + ART.logo.rise * (1 - eased)));
    bob.setFrame(idle.frames[Math.floor(elapsed * idle.fps / 1000) % idle.frames.length]!);

    rain.clear().lineStyle(1, ART.rain.color, ART.rain.alpha);
    const span = ART.rain.bottom - ART.rain.top;
    for (let i = 0; i < ART.rain.count; i++) {
      const x = (i * 71 + Math.floor(elapsed / 240)) % 480;
      const y = ART.rain.top + (i * 37 + Math.floor(elapsed * ART.rain.speed / 1000)) % span;
      rain.lineBetween(x, y, x - 1, y + 4);
    }

    const phase = (elapsed - ART.shine.firstMs) % ART.shine.periodMs;
    const sweeping = elapsed >= ART.shine.firstMs && phase < ART.shine.sweepMs;
    shine.setAlpha(sweeping ? ART.shine.alpha : 0);
    if (sweeping) {
      const x = Math.round(-ART.shine.width + (logo.displayWidth + ART.shine.width * 2) * phase / ART.shine.sweepMs);
      const top = ART.logo.y;
      maskShape.clear().fillStyle(0xffffff).fillPoints([
        { x, y: top }, { x: x + ART.shine.width, y: top },
        { x: x + ART.shine.width - 16, y: top + logo.displayHeight },
        { x: x - 16, y: top + logo.displayHeight },
      ], true);
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
    preference.removeEventListener('change', preferenceChanged);
    shine.clearMask();
    mask.destroy();
  });
}
