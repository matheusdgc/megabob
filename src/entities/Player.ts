import Phaser from 'phaser';
import { BOB_FRAME, type BobAnim, bobKey } from '../data/assets';
import { BOB_BODY_H, BOB_BODY_W, GRAVITY, MAX_FALL_SPEED } from '../data/tuning';
import type { ActionState } from '../systems/actions';
import { BOB_LOOPS, type BobPose, bobPose } from '../systems/bobPose';
import { newMotion, stepMotion } from '../systems/motion';

/** Creates (once) the looping animation for a Bob sheet key. */
function ensureLoop(scene: Phaser.Scene, key: string, anim: BobAnim): void {
  if (scene.anims.exists(key)) return;
  const loop = BOB_LOOPS[anim];
  if (!loop) throw new Error(`no loop defined for ${anim}`);
  scene.anims.create({
    key,
    frames: loop.frames.map((frame) => ({ key, frame })),
    frameRate: loop.fps,
    repeat: -1,
  });
}

/**
 * Bob. Position (x, y) is the feet: bottom-center of the 48x48 sprite cell.
 * Movement rules live in systems/motion.ts; this class only bridges them to Arcade physics
 * and picks the sprite pose.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly motion = newMotion();
  /** Firmware Armor bitmask (0 = none, 15 = full). */
  armor = 0;
  private shownKey = '';
  private shownFrame = -1;

  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, bobKey('idle'));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.body.setSize(BOB_BODY_W, BOB_BODY_H);
    this.body.setOffset((BOB_FRAME - BOB_BODY_W) / 2, BOB_FRAME - BOB_BODY_H);
    this.body.setGravityY(GRAVITY);
    this.body.setMaxVelocityY(MAX_FALL_SPEED);
  }

  /** Call once per frame, after the physics step, with this frame's input. */
  step(input: ActionState): void {
    const body = this.body;
    const out = stepMotion(this.motion, input, { onGround: body.blocked.down, vy: body.velocity.y });
    body.setVelocityX(out.vx);
    if (out.vy !== undefined) body.setVelocityY(out.vy);
    this.setFlipX(this.motion.facing < 0);
    this.show(bobPose(this.motion, body.velocity.y));
  }

  /** Put Bob back at a spot, standing still. */
  respawn(x: number, y: number): void {
    this.body.reset(x, y);
    Object.assign(this.motion, newMotion(), { facing: this.motion.facing });
  }

  private show(pose: BobPose): void {
    const key = bobKey(pose.anim, this.armor);
    if (pose.loop) {
      ensureLoop(this.scene, key, pose.anim);
      if (this.shownKey !== key || this.shownFrame !== -1) this.play(key);
      this.shownKey = key;
      this.shownFrame = -1;
      return;
    }
    if (this.shownKey === key && this.shownFrame === pose.frame) return;
    this.stop();
    this.setTexture(key, pose.frame);
    this.shownKey = key;
    this.shownFrame = pose.frame;
  }
}
