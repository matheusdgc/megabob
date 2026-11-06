import Phaser from 'phaser';
import { ARMOR_BITS, BOB_FRAME, type BobAnim, bobKey, type FxKey } from '../data/assets';
import { BOB_BODY_H, BOB_BODY_W, GRAVITY, MAX_FALL_SPEED, MAX_SHOTS } from '../data/tuning';
import type { ActionState } from '../systems/actions';
import { BOB_LOOPS, type BobPose, bobPose, poseSheet, shotOrigin } from '../systems/bobPose';
import { chargeLevel, newBuster, type ShotLevel, stepBuster } from '../systems/charge';
import { newMotion, stepMotion } from '../systems/motion';
import { fxAnim, Projectile } from './Projectile';

/** Frames the muzzle flash stays on after a shot. */
const MUZZLE_FRAMES = 4;
/** The charge aura is centered this far above Bob's feet. */
const AURA_HEIGHT = 16;
const AURA_SHEETS: Record<Exclude<ShotLevel, 0>, FxKey> = { 1: 'fx_charge1', 2: 'fx_charge2', 3: 'fx_charge3' };
/** Loops that switch into each other mid-cycle (run <-> running shot) keep their progress. */
const SYNCED_LOOPS = new Set<BobAnim>(['run', 'shoot']);

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
  readonly buster = newBuster();
  /** Bob's live shots (pooled); enemies overlap against this group. */
  readonly shots: Phaser.Physics.Arcade.Group;
  private readonly aura: Phaser.GameObjects.Sprite;
  private readonly muzzle: Phaser.GameObjects.Sprite;
  private muzzleFrames = 0;
  private armorBits = 0;
  private shownKey = '';
  private shownAnim: BobAnim | 'airdash' | '' = '';
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

    // basic shots plus room for charged shots fired while they are still flying
    this.shots = scene.physics.add.group({ classType: Projectile, maxSize: MAX_SHOTS * 2, allowGravity: false });
    this.aura = scene.add.sprite(x, y, AURA_SHEETS[1]).setVisible(false).setDepth(1);
    this.muzzle = scene.add.sprite(x, y, 'fx_muzzle').setVisible(false).setDepth(1);
  }

  /** Firmware Armor bitmask (0 = none, 15 = full). The boots enable the air dash. */
  get armor(): number {
    return this.armorBits;
  }

  set armor(bits: number) {
    this.armorBits = bits;
    this.motion.canAirDash = (bits & ARMOR_BITS.legs) !== 0;
  }

  /** Call once per frame, after the physics step, with this frame's input. */
  step(input: ActionState): void {
    const body = this.body;
    const out = stepMotion(this.motion, input, {
      onGround: body.blocked.down,
      vy: body.velocity.y,
      wallLeft: body.blocked.left,
      wallRight: body.blocked.right,
    });
    body.setVelocityX(out.vx);
    if (out.vy !== undefined) body.setVelocityY(out.vy);
    body.setAllowGravity(out.gravity);

    const maxLevel = this.armorBits & ARMOR_BITS.arm ? 3 : 2;
    const fired = stepBuster(
      this.buster,
      { pressed: input.justPressed('shoot'), down: input.isDown('shoot'), released: input.justReleased('shoot') },
      { liveShots: this.shots.countActive(true), maxLevel },
    );
    if (fired !== null) this.fire(fired);
    this.showEffects(chargeLevel(this.buster.charge, maxLevel));
    this.show(bobPose(this.motion, body.velocity.y, this.buster.pose > 0));
  }

  /** Put Bob back at a spot, standing still. */
  respawn(x: number, y: number): void {
    this.body.reset(x, y);
    this.body.setAllowGravity(true);
    Object.assign(this.motion, newMotion(this.motion.canAirDash), { facing: this.motion.facing });
    Object.assign(this.buster, newBuster());
  }

  private fire(level: ShotLevel): void {
    // the body already holds this frame's position; the sprite catches up after the update
    const o = shotOrigin(this.motion);
    const shot = this.shots.get() as Projectile | null;
    shot?.fire(this.body.center.x + o.dx, this.body.bottom + o.dy, o.dir, level);
    this.muzzleFrames = MUZZLE_FRAMES;
    this.muzzle.setFlipX(o.dir < 0).play(fxAnim(this.scene, 'fx_muzzle', 30, 0));
  }

  /** Charge aura around Bob and the muzzle flash at the cannon tip. */
  private showEffects(level: ShotLevel): void {
    const x = this.body.center.x;
    const feet = this.body.bottom;
    if (level > 0) {
      const key = AURA_SHEETS[level as Exclude<ShotLevel, 0>];
      if (!this.aura.visible || this.aura.anims.currentAnim?.key !== key) this.aura.play(fxAnim(this.scene, key, 15));
      this.aura.setPosition(x, feet - AURA_HEIGHT).setVisible(true);
    } else if (this.aura.visible) {
      this.aura.stop().setVisible(false);
    }
    if (this.muzzleFrames > 0) {
      this.muzzleFrames--;
      const o = shotOrigin(this.motion);
      this.muzzle.setPosition(x + o.dx + o.dir * 4, feet + o.dy).setVisible(true);
    } else {
      this.muzzle.setVisible(false);
    }
  }

  private show(pose: BobPose): void {
    this.setFlipX(pose.facing < 0);
    if (pose.loop) {
      const anim = pose.anim as BobAnim;
      const key = bobKey(anim, this.armorBits);
      ensureLoop(this.scene, key, anim);
      if (this.shownKey !== key || this.shownFrame !== -1) {
        // run <-> running shot: continue at the same point of the stride
        let startFrame = 0;
        const current = this.anims.currentAnim;
        const frame = this.anims.currentFrame;
        if (this.shownFrame === -1 && SYNCED_LOOPS.has(anim) && SYNCED_LOOPS.has(this.shownAnim as BobAnim) && current && frame) {
          const progress = (frame.index - 1) / current.frames.length;
          startFrame = Math.floor(progress * (BOB_LOOPS[anim]?.frames.length ?? 1));
        }
        this.play({ key, startFrame });
      }
      this.shownKey = key;
      this.shownAnim = anim;
      this.shownFrame = -1;
      return;
    }
    const { key, frame } = poseSheet(pose.anim, pose.frame, this.armorBits);
    if (this.shownKey === key && this.shownFrame === frame) return;
    this.stop();
    this.setTexture(key, frame);
    this.shownKey = key;
    this.shownAnim = pose.anim;
    this.shownFrame = frame;
  }
}
