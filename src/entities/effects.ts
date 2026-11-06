import Phaser from 'phaser';

/** Plays every frame of `key` once at (x, y), then removes the sprite. */
export function playOnce(scene: Phaser.Scene, key: string, x: number, y: number, fps = 15): Phaser.GameObjects.Sprite {
  const anim = `${key}_once`;
  if (!scene.anims.exists(anim)) {
    scene.anims.create({ key: anim, frames: scene.anims.generateFrameNumbers(key, {}), frameRate: fps, repeat: 0 });
  }
  const s = scene.add.sprite(x, y, key).setDepth(2);
  s.play(anim).once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
  return s;
}

/** Looping animation over the first `frames` frames of a sheet (created once per key). */
export function loopAnim(scene: Phaser.Scene, key: string, frames: number[], fps: number): string {
  const anim = `${key}_loop_${frames.join('')}`;
  if (!scene.anims.exists(anim)) {
    scene.anims.create({ key: anim, frames: frames.map((frame) => ({ key, frame })), frameRate: fps, repeat: -1 });
  }
  return anim;
}
