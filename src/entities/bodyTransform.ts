import type Phaser from 'phaser';

/**
 * A shape/texture/origin changed inside WORLD_STEP, after integration but before postUpdate.
 * Preserve the pending velocity displacement while reanchoring the new body to the drawing.
 */
export function syncBodyTransform(sprite: Phaser.Physics.Arcade.Sprite, preserveMotion = true): void {
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  const dx = preserveMotion && body.moves ? body.x - body.prevFrame.x : 0;
  const dy = preserveMotion && body.moves ? body.y - body.prevFrame.y : 0;
  body.updateFromGameObject();
  body.prevFrame.copy(body.position);
  body.position.x += dx;
  body.position.y += dy;
  body.updateCenter();
}
