import Phaser from 'phaser';
import { ARMOR_BITS, BOB_FRAME, type BobAnim, bobKey, type FxKey } from '../data/assets';
import {
  AIR_DASHES,
  AIR_DASHES_BOOTS,
  BLINK_FRAMES,
  BOB_BODY_H,
  BOB_BODY_W,
  SHOOT_POSE_FRAMES,
  DEATH_FRAMES,
  GRAVITY,
  HURT_FRAMES,
  HURT_FRAMES_PLATED,
  MAX_FALL_SPEED,
  MAX_SHOTS,
  LAND_DUST_FRAMES,
} from '../data/tuning';
import type { ActionState } from '../systems/actions';
import { BOB_LOOPS, type BobPose, bobPose, poseSheet, shotOrigin } from '../systems/bobPose';
import { chargeLevel, newBuster, type ShotLevel, stepBuster } from '../systems/charge';
import { type HitResult, hit, kill, newHealth, tickHealth } from '../systems/damage';
import { newMotion, startHurt, stepMotion } from '../systems/motion';
import { type Arsenal, cycleWeapon, newArsenal, spend } from '../systems/weapons';
import { WEAPONS } from '../data/weapons';
import { GC_MAX_ON_SCREEN, GcOrb } from './weapons/GarbageCollector';
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
  readonly health = newHealth();
  /** Owned weapons, equipped weapon and energy. The stage replaces it with saved progress. */
  arsenal: Arsenal = newArsenal();
  /** Live special-weapon projectiles (Garbage Collector orbs). */
  readonly specials: Phaser.Physics.Arcade.Group;
  /** Frames left of the death animation; the scene respawns Bob when it reaches 0. */
  private deathFrames = 0;
  /** Frames since Bob last stood on the ground (for the landing puff). */
  private airFrames = 0;
  private readonly decompile: Phaser.GameObjects.Sprite;
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
    this.specials = scene.physics.add.group({ classType: GcOrb, maxSize: GC_MAX_ON_SCREEN + 1, allowGravity: false });
    this.aura = scene.add.sprite(x, y, AURA_SHEETS[1]).setVisible(false).setDepth(1);
    this.muzzle = scene.add.sprite(x, y, 'fx_muzzle').setVisible(false).setDepth(1);
    this.decompile = scene.add.sprite(x, y, 'fx_decompile').setVisible(false).setDepth(1);
  }

  /** Firewall Plating (armor body bit): half damage, shorter knockback. */
  private get plated(): boolean {
    return (this.armorBits & ARMOR_BITS.body) !== 0;
  }

  get isDead(): boolean {
    return this.health.dead;
  }

  /** Damage from something at horizontal position `fromX` (enemy, shot, hazard). */
  takeHit(amount: number, fromX: number): HitResult {
    const result = hit(this.health, amount, { plated: this.plated });
    if (result === 'hurt') {
      this.emit('hurt');
      startHurt(this.motion, this.body.center.x, fromX, this.plated ? HURT_FRAMES_PLATED : HURT_FRAMES);
    } else if (result === 'dead') {
      this.die();
    }
    return result;
  }

  /** Spikes: instant death, except while blinking after a hit. */
  touchSpikes(): void {
    if (!this.health.dead && this.health.invuln === 0) {
      kill(this.health);
      this.die();
    }
  }

  /** Bottomless pit: always fatal. */
  fallOut(): void {
    if (!this.health.dead) {
      kill(this.health);
      this.die();
    }
  }

  /** Bob "decompiles" into pixels; the body stops colliding until respawn. */
  private die(): void {
    const { x, y } = this.body.center;
    this.deathFrames = DEATH_FRAMES;
    this.body.stop();
    this.body.enable = false;
    this.setVisible(false);
    this.aura.stop().setVisible(false);
    this.muzzle.setVisible(false);
    Object.assign(this.buster, newBuster());
    this.decompile.setPosition(x, y).setFlipX(this.motion.facing < 0).setVisible(true);
    this.decompile.play(fxAnim(this.scene, 'fx_decompile', 10, 0));
    this.emit('died');
  }

  /** Firmware Armor bitmask (0 = none, 15 = full). The boots enable the air dash. */
  get armor(): number {
    return this.armorBits;
  }

  set armor(bits: number) {
    this.armorBits = bits;
    this.motion.airDashes = bits & ARMOR_BITS.legs ? AIR_DASHES_BOOTS : AIR_DASHES;
  }

  /** Call once per frame, after the physics step, with this frame's input. */
  step(input: ActionState): void {
    if (this.health.dead) {
      if (this.deathFrames > 0 && --this.deathFrames === 0) this.emit('deathDone');
      return;
    }
    tickHealth(this.health);
    const body = this.body;
    if (body.blocked.down) {
      if (this.airFrames >= LAND_DUST_FRAMES) this.emit('landed', this.x, this.y);
      this.airFrames = 0;
    } else this.airFrames += 1;
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
    const hurt = this.motion.state === 'hurt';
    if (input.justPressed('nextWeapon')) this.switchWeapon(1);
    else if (input.justPressed('prevWeapon')) this.switchWeapon(-1);
    // no shooting while knocked back; the charge survives only if the button stays held
    if (hurt && !input.isDown('shoot')) this.buster.charge = 0;
    if (this.arsenal.current === 'buster') {
      const fired = hurt
        ? null
        : stepBuster(
            this.buster,
            { pressed: input.justPressed('shoot'), down: input.isDown('shoot'), released: input.justReleased('shoot') },
            { liveShots: this.shots.countActive(true), maxLevel },
          );
      if (fired !== null) this.fire(fired);
    } else {
      // special weapons: one shot per press, paid with weapon energy (no charging yet)
      if (this.buster.pose > 0) this.buster.pose--;
      if (!hurt && input.justPressed('shoot')) this.fireSpecial();
    }
    this.showEffects(chargeLevel(this.buster.charge, maxLevel));
    this.show(bobPose(this.motion, body.velocity.y, this.buster.pose > 0));
    // blink while invulnerable
    const inv = this.health.invuln;
    this.setVisible(inv === 0 || Math.floor(inv / BLINK_FRAMES) % 2 === 0);
  }

  /** Put Bob back at a spot, standing still. */
  respawn(x: number, y: number): void {
    this.deathFrames = 0;
    this.airFrames = 0;
    this.decompile.stop().setVisible(false);
    this.setVisible(true);
    this.body.enable = true;
    this.body.reset(x, y);
    this.body.setAllowGravity(true);
    Object.assign(this.motion, newMotion(this.motion.airDashes), { facing: this.motion.facing });
    Object.assign(this.buster, newBuster());
  }

  /** Q/E: next or previous owned weapon; Bob's colors follow the weapon. */
  private switchWeapon(dir: 1 | -1): void {
    const before = this.arsenal.current;
    if (cycleWeapon(this.arsenal, dir) === before) return;
    this.buster.charge = 0;
    this.applyWeaponTint();
    this.emit('weaponChanged', this.arsenal.current);
  }

  /** Tints Bob with the equipped weapon's colors (the buster shows his own). */
  applyWeaponTint(): void {
    const tint = WEAPONS[this.arsenal.current].tint;
    if (tint === 0xffffff) this.clearTint();
    else this.setTint(tint);
  }

  private fireSpecial(): void {
    if (this.arsenal.current !== 'garbageCollector') return; // the others arrive in T14/T15
    if (this.specials.countActive(true) >= GC_MAX_ON_SCREEN || !spend(this.arsenal)) return;
    const o = shotOrigin(this.motion);
    const orb = this.specials.get() as GcOrb | null;
    orb?.fire(this.body.center.x + o.dx, this.body.bottom + o.dy, o.dir);
    this.buster.pose = SHOOT_POSE_FRAMES;
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
