import Phaser from 'phaser';
import {
  CARD_DAMAGE,
  CARD_SPEED,
  type Core,
  CORE_SPEED,
  DRAWER_HIGH,
  DRAWER_LOW,
  LASER_DAMAGE,
  LASER_CHARGE,
  newCore,
  newWall,
  PATCH_DAMAGE,
  type Patch,
  stepCore,
  stepWall,
  TECH_CONTACT,
  TECH_HP,
  type Wall,
} from '../../systems/techDebtBoss';
import { Boss, type BossHazards } from '../Boss';
import { loopAnim, playOnce } from '../effects';
import type { BobLocator } from './index';
import { syncBodyTransform } from '../bodyTransform';
import { CombatCue } from '../CombatCue';
import { COMBAT_ART } from '../../data/tuning';
import { chargeVelocity } from '../../systems/combatArt';

/** Where things sit on the 256x192 wall sprite (its content: x 8-248, y 32-160). */
const WALL = { w: 256, h: 192, contentLeft: 8, contentTop: 32, bottomPad: 32, crt: { x: 134, y: 91 }, reels: [{ x: 137, y: 45 }, { x: 211, y: 87 }] };
const CRT_SCALE = 1.25;
const CRT_BODY: [number, number] = [56, 40];
const CORE_BODY = 40;
const CORE_HALF = 32;
const GOO_GRAVITY = 500;

/**
 * The final boss, Tech Debt (src/systems/techDebtBoss.ts has both patterns).
 * Phase 1: a mainframe wall fills the right of the room; the boss sprite is its CRT face, the only
 * thing that takes damage. Drawers fire punched cards and the wall sends out Deprecated Bots.
 * Phase 2: when the face's health runs out the wall breaks apart, the bar refills and the CRT core
 * flies free: a low or high laser across the room, and "patches" of the three bosses' attacks.
 * Any weapon works; charged shots hit harder.
 */
export class TechDebt extends Boss {
  readonly contactDamage = TECH_CONTACT;
  private phaseNo: 1 | 2 = 1;
  private readonly wall: Wall = newWall();
  private readonly core: Core = newCore();
  private readonly floorY: number;
  private readonly wallImg: Phaser.GameObjects.Image;
  private readonly reels: Phaser.GameObjects.Sprite[];
  private readonly drawers: Phaser.GameObjects.Sprite[];
  private readonly block: Phaser.GameObjects.Zone;
  private readonly shots: Phaser.Physics.Arcade.Group;
  private readonly beamGroup: Phaser.Physics.Arcade.Group;
  private readonly beam: Phaser.GameObjects.TileSprite;
  private faceLeft = 0;
  private wasCharging = false;
  private wasFiring = false;
  private readonly cue: CombatCue;
  private chargeTarget: {x:number;y:number} | undefined;
  private readonly collapseTimers: Phaser.Time.TimerEvent[] = [];
  private collapseTween: Phaser.Tweens.Tween | undefined;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly getBob: BobLocator,
  ) {
    super(scene, x, y, 'tech_crt', TECH_HP, CRT_BODY[0], CRT_BODY[1]);
    this.floorY = y;
    this.setScale(CRT_SCALE).setDepth(1);
    this.cue = new CombatCue(this);
    this.wallImg = scene.add.image(0, 0, 'boss_tech_debt').setOrigin(1, 1).setDepth(-0.5);
    this.reels = WALL.reels.map(() => scene.add.sprite(0, 0, 'tech_reels', 0).setDepth(-0.4).play(loopAnim(scene, 'tech_reels', [0, 1], 6)));
    this.drawers = [0, 1].map(() => scene.add.sprite(0, 0, 'tech_drawer', 0).setOrigin(1, 0.5).setDepth(-0.3));
    this.block = scene.add.zone(0, 0, 1, 1);
    scene.physics.add.existing(this.block, true);
    this.shots = scene.physics.add.group({ allowGravity: false });
    this.beamGroup = scene.physics.add.group({ allowGravity: false });
    this.beam = scene.add.tileSprite(0, 0, 32, 8, 'tech_laser').setOrigin(0, 0.5).setDepth(2).setVisible(false);
    this.beamGroup.add(this.beam);
    (this.beam.body as Phaser.Physics.Arcade.Body).enable = false;
    (this.beam.body as Phaser.Physics.Arcade.Body).moves = false;
  }

  /** Lays the wall out against the arena's right side (the arena is only known now). */
  override setArena(left: number, right: number): void {
    super.setArena(left, right);
    const imgRight = right - 8;
    const imgLeft = imgRight - WALL.w;
    const imgTop = this.floorY + WALL.bottomPad - WALL.h;
    this.faceLeft = imgLeft + WALL.contentLeft;
    this.wallImg.setPosition(imgRight, this.floorY + WALL.bottomPad);
    WALL.reels.forEach((r, i) => this.reels[i]!.setPosition(imgLeft + r.x, imgTop + r.y));
    this.drawers[0]!.setPosition(this.faceLeft + 2, this.floorY - 16);
    this.drawers[1]!.setPosition(this.faceLeft + 2, this.floorY - DRAWER_HIGH - 4);
    // the CRT face (this sprite): origin is its feet
    this.setPosition(imgLeft + WALL.crt.x, imgTop + WALL.crt.y + (48 * CRT_SCALE) / 2);
    const top = imgTop + WALL.contentTop;
    this.block.setPosition((this.faceLeft + right) / 2, (top + this.floorY) / 2).setSize(right - this.faceLeft, this.floorY - top);
    (this.block.body as Phaser.Physics.Arcade.StaticBody).setSize(right - this.faceLeft, this.floorY - top).updateFromGameObject();
  }

  /** The wall stops Bob and the bots it sends out (phase 1 only). */
  override get walls(): Phaser.GameObjects.GameObject[] {
    return [this.block];
  }

  override get hazards(): BossHazards[] {
    return [
      {
        group: this.shots,
        damage: (s) => (s.getData('damage') as number | undefined) ?? CARD_DAMAGE,
        swallow: (s) => s.destroy(),
      },
      { group: this.beamGroup, damage: () => (this.beam.visible ? LASER_DAMAGE : 0), swallow: () => {} },
    ];
  }

  protected think(): void {
    if (this.phaseNo === 1) this.thinkWall();
    else this.thinkCore();
    this.cleanShots();
  }

  // ---------------------------------------------------------------- phase 1

  private thinkWall(): void {
    const out = stepWall(this.wall, this.hpFraction);
    out.open.forEach((o, i) => this.drawers[i]!.setFrame(o ? 1 : 0));
    this.setFrame(this.wall.fury ? 2 : 0);
    if (out.glare && !this.isFlashing) this.setTint(0xb8ffb8);
    for (const d of out.cards ?? []) {
      const y = this.floorY - (d === 0 ? DRAWER_LOW : DRAWER_HIGH);
      this.fire('tech_card', this.faceLeft - 30, y, -CARD_SPEED, 0, CARD_DAMAGE);
      this.scene.events.emit('bossSfx', 'cardShot');
    }
    if (out.summon) this.scene.events.emit('bossSummon', 'deprecatedBot', this.faceLeft - 24, this.floorY);
    this.cue.step({x:this.faceLeft-28,y:this.floorY-DRAWER_LOW,color:COMBAT_ART.metal,release:!!out.cards?.length});
  }

  /** Out of health in phase 1: the wall breaks and the core flies (instead of dying). */
  protected override nextPhase(): boolean {
    if (this.phaseNo !== 1) return false;
    this.phaseNo = 2;
    this.startIntro(); // the bar refills while the wall comes down
    this.shots.clear(true, true);
    const blockBody = this.block.body as Phaser.Physics.Arcade.StaticBody;
    blockBody.enable = false;
    for (let i = 0; i < 6; i++) {
      this.collapseTimers.push(this.scene.time.delayedCall(i * 160, () =>
        playOnce(this.scene, 'fx_boss_explosion', this.faceLeft + 30 + ((i * 53) % 200), this.floorY - 30 - ((i * 37) % 110), 14),
      ));
    }
    this.collapseTween = this.scene.tweens.add({ targets: [this.wallImg, ...this.reels, ...this.drawers], alpha: 0, duration: 1100, delay: 300 });
    const cx = this.x;
    const cy = this.y - (48 * CRT_SCALE) / 2;
    this.setScale(1).setTexture('boss_tech_core', 0);
    this.body.setSize(CORE_BODY, CORE_BODY, false);
    this.body.setOffset((64 - CORE_BODY) / 2, (64 - CORE_BODY) / 2);
    this.setPosition(cx, cy + CORE_HALF);
    syncBodyTransform(this);
    this.scene.events.emit('bossPhase', 2);
    return true;
  }

  // ---------------------------------------------------------------- phase 2

  private thinkCore(): void {
    const centre = { x: this.body.center.x, y: this.body.center.y };
    const out = stepCore(this.core, {
      x: centre.x,
      bob: this.getBob(),
      arenaLeft: this.arenaLeft,
      arenaRight: this.arenaRight,
      floorY: this.floorY,
      hp: this.hpFraction,
    });
    const charging = this.core.state === 'charge';
    if (charging && !this.wasCharging) this.chargeTarget = out.target;
    const target = charging ? (this.chargeTarget ?? out.target) : out.target;
    const dx = target.x - centre.x;
    const dy = target.y - centre.y;
    const d = Math.hypot(dx, dy);
    const duration = LASER_CHARGE[this.core.fury ? 1 : 0];
    if (charging) {
      const velocity = chargeVelocity(centre,target,duration-this.core.frames);
      this.body.setVelocity(velocity.x,velocity.y);
    } else if (d < 2 || this.core.state === 'fire') this.body.setVelocity(0, 0);
    else this.body.setVelocity((dx / d) * Math.min(CORE_SPEED, d * 60), (dy / d) * Math.min(CORE_SPEED, d * 60));
    if (!this.isFlashing) this.setFrame(out.frame);
    this.setFlipX(this.core.facing > 0); // the sheet faces left

    if (charging && !this.wasCharging) this.scene.events.emit('bossSfx', 'laserCharge');
    this.wasCharging = charging;
    const firing = out.beam !== undefined;
    if (firing && !this.wasFiring) this.scene.events.emit('bossSfx', 'laser');
    const released = firing && !this.wasFiring;
    this.wasFiring = firing;
    this.setBeam(out.beam);
    if (out.patch) this.firePatch(out.patch, centre);
    this.cue.step({x:this.body.center.x,y:this.body.center.y,color:COMBAT_ART.metal,
      release:released||!!out.patch,...(charging?{charge:this.core.frames/duration}:{})});
  }

  /** The laser: from the core's front across the room to the far wall, at height `y`. */
  private setBeam(y: number | undefined): void {
    const body = this.beam.body as Phaser.Physics.Arcade.Body;
    if (y === undefined) {
      this.beam.setVisible(false);
      body.enable = false;
      return;
    }
    const dir = this.core.facing;
    const from = Math.round(this.body.center.x + dir * 24);
    const to = Math.round(dir > 0 ? this.arenaRight - 16 : this.arenaLeft + 16);
    const left = Math.min(from, to);
    const w = Math.abs(to - from);
    this.beam.setPosition(left, y).setSize(w, 8).setVisible(true);
    this.beam.tilePositionX += 4 * dir;
    body.enable = true;
    body.setSize(w, 6, false).setOffset(0, 1);
    body.updateFromGameObject();
  }

  private firePatch(patch: Patch, at: { x: number; y: number }): void {
    const bob = this.getBob();
    const aim = bob ? Math.atan2(bob.y - at.y, bob.x - at.x) : Math.PI;
    if (patch === 'goo') {
      // Memory Leak: three arcing blobs that land around Bob
      const dx = bob ? bob.x - at.x : -100;
      for (const k of [0.6, 0.85, 1.1]) {
        const g = this.fire('memory_goo', at.x, at.y, (dx / 1.1) * k, -220, PATCH_DAMAGE);
        (g.body as Phaser.Physics.Arcade.Body).setAllowGravity(true).setGravityY(GOO_GRAVITY);
      }
      this.scene.events.emit('bossSfx', 'throw');
    } else if (patch === 'blades') {
      // Race Condition: two clock blades, either side of Bob
      for (const d of [-0.18, 0.18]) {
        const b = this.fire('clock_blade', at.x, at.y, Math.cos(aim + d) * 170, Math.sin(aim + d) * 170, PATCH_DAMAGE);
        b.play(loopAnim(this.scene, 'clock_blade', [0, 1, 2, 3], 16));
      }
      this.scene.events.emit('bossSfx', 'throw');
    } else {
      // Null Pointer: a fan of five cursors
      for (const d of [-0.5, -0.25, 0, 0.25, 0.5]) {
        const vx = Math.cos(aim + d) * 150;
        const vy = Math.sin(aim + d) * 150;
        this.fire('null_cursor', at.x, at.y, vx, vy, PATCH_DAMAGE).setRotation(Math.atan2(vy, vx) + (vx > 0 ? 0 : Math.PI)).setFlipX(vx > 0);
      }
      this.scene.events.emit('bossSfx', 'nullPointer');
    }
  }

  // ---------------------------------------------------------------- shared

  private fire(key: string, x: number, y: number, vx: number, vy: number, damage: number): Phaser.Physics.Arcade.Sprite {
    const s = this.shots.create(x, y, key, 0) as Phaser.Physics.Arcade.Sprite;
    s.setDepth(2).setData('damage', damage).setFlipX(vx < 0 && key === 'tech_card');
    (s.body as Phaser.Physics.Arcade.Body).setSize(Math.min(12, s.width), Math.min(10, s.height)).setAllowGravity(false).setVelocity(vx, vy);
    if (key === 'memory_goo' || key === 'null_cursor') s.play(loopAnim(this.scene, key, [0, 1], 10));
    return s;
  }

  private cleanShots(): void {
    for (const s of this.shots.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
      if (s.x < this.arenaLeft - 16 || s.x > this.arenaRight + 16 || s.y < -32 || s.y > this.floorY + 4) s.destroy();
    }
  }

  override step(): void {
    super.step();
    if (this.phase === 'dead') this.setFrame(5);
    else if (this.isFlashing) this.setFrame(this.phaseNo === 1 ? 1 : 4);
    if (this.phase !== 'fight' || this.isFrozen) this.setBeam(undefined);
  }

  protected override onDefeated(): void {
    this.cue.clear();
    this.shots.clear(true, true);
    this.setBeam(undefined);
  }

  override destroy(fromScene?: boolean): void {
    for (const timer of this.collapseTimers) timer.remove(false);
    this.collapseTimers.length = 0;
    this.collapseTween?.remove();
    this.collapseTween = undefined;
    this.shots?.destroy(true);
    this.beamGroup?.destroy(true);
    this.wallImg?.destroy();
    for (const r of this.reels ?? []) r.destroy();
    for (const d of this.drawers ?? []) d.destroy();
    this.block?.destroy();
    super.destroy(fromScene);
  }
}
