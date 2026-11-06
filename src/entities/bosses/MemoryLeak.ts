import Phaser from 'phaser';
import { Boss } from '../Boss';

// ---------------------------------------------------------------------------
// Tuning (all in pixels and 60-Hz frames)
// ---------------------------------------------------------------------------

/** Boss HP pool. */
const HP = 28;
/** Hitbox inside the 96×80 sprite frame. */
const BODY_W = 72;
const BODY_H = 72;
/** Contact damage per frame that Bob overlaps the boss. */
export const MEMORY_LEAK_CONTACT = 4;

// --- Attack pattern timers ---
/** Frames the boss waits before launching the first attack. */
const IDLE_ENTER = 60;
/** Frames between goo bursts within a volley. */
const BURST_INTERVAL = 20;
/** Number of bubbles in one normal volley. */
const BURST_COUNT = 3;
/** Frames between volleys (the boss floats idly). */
const VOLLEY_COOLDOWN = 90;
/** Volleys before the boss dives (submerge pattern). */
const VOLLEYS_BEFORE_DIVE = 2;
/** Frames to sink below the floor level (invisible). */
const SINK_FRAMES = 30;
/** Frames underground before re-emerging. */
const LURK_FRAMES = 40;
/** Frames to rise back into position. */
const RISE_FRAMES = 30;
/** Fraction of max HP below which fury mode activates. */
const FURY_THRESHOLD = 1 / 3;
/** Extra bubbles per burst in fury mode. */
const FURY_EXTRA = 2;

// --- Goo bubble projectile ---
const GOO_SPEED_Y = -220; // upward
const GOO_SPREAD_X = 90; // px/s max horizontal spread
const GOO_GRAVITY = 500; // px/s²
/** Frames a puddle (splat) lingers on the ground before disappearing. */
const PUDDLE_LIFETIME = 180;
/** Damage dealt to Bob by touching a goo bubble or puddle. */
const GOO_DAMAGE = 3;
const PUDDLE_DAMAGE = 2;

// ---------------------------------------------------------------------------
// Internal state types
// ---------------------------------------------------------------------------

type MLState =
  | 'idle_enter'
  | 'volley'       // firing goo bubbles
  | 'volley_wait'  // between bursts
  | 'dive'         // submerging
  | 'lurk'         // underground
  | 'rise'         // coming back up
  | 'fury_volley'  // faster volley in fury mode
  | 'fury_wait';

/** Pooled goo projectile: arcs upward, becomes a puddle on landing. */
class GooBlob extends Phaser.Physics.Arcade.Sprite {
  active = false;
  /** Counts down to 0 then the puddle disappears. */
  private puddleTimer = 0;
  isPuddle = false;

  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 'memory_goo', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setGravityY(GOO_GRAVITY);
    this.body.setSize(10, 10);
    this.setActive(false).setVisible(false);
  }

  fire(x: number, y: number, vx: number): void {
    this.setActive(true).setVisible(true).setPosition(x, y);
    this.isPuddle = false;
    this.puddleTimer = 0;
    this.body.enable = true;
    this.body.setSize(10, 10);
    this.body.setAllowGravity(true);
    this.body.setVelocity(vx, GOO_SPEED_Y);
    this.setFrame(0);
  }

  /**
   * Called every fixed step.
   * Returns 'dead' when the puddle has expired or the blob is off-screen.
   */
  stepBlob(worldH: number): 'dead' | null {
    if (!this.active) return null;
    if (!this.isPuddle) {
      // become a puddle when it lands (blocked below or past world bottom)
      if (this.body.blocked.down || this.y > worldH) {
        this.splat();
      }
    } else {
      if (--this.puddleTimer <= 0) return 'dead';
    }
    return null;
  }

  private splat(): void {
    this.isPuddle = true;
    this.puddleTimer = PUDDLE_LIFETIME;
    this.setFrame(1);
    this.body.setAllowGravity(false);
    this.body.setVelocity(0, 0);
    this.body.setSize(24, 8);
    // use the puddle sprite (memory_puddle) at this location
    this.setTexture('memory_puddle', 0);
    this.setOrigin(0.5, 1);
  }

  deactivate(): void {
    this.setActive(false).setVisible(false);
    this.body.enable = false;
    this.isPuddle = false;
  }
}

// ---------------------------------------------------------------------------
// Memory Leak boss
// ---------------------------------------------------------------------------

/**
 * Memory Leak boss. Three attack patterns:
 *  1. Goo volley — launches arcing blobs that splat into damaging puddles.
 *  2. Submerge  — sinks below ground and re-emerges below Bob's last position.
 *  3. Fury      — after reaching 1/3 HP: faster volley with extra blobs.
 */
export class MemoryLeak extends Boss {
  private mlState: MLState = 'idle_enter';
  private stateFrames = 0;
  private volleyCount = 0;
  private volleysDone = 0;
  private burstsDone = 0;

  /** Pool of goo blobs (bubbles + puddles). */
  private goo!: Phaser.Physics.Arcade.Group;
  /** Y position before the boss dives, so it can return. */
  private homeY = 0;
  /** X position of Bob when the boss starts lurking (dive target). */
  private diveTargetX = 0;
  private worldH = 0;

  /** Callback to find Bob's position. */
  private readonly getBob: () => { x: number; y: number } | null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    worldH: number,
    getBob: () => { x: number; y: number } | null,
  ) {
    super(scene, x, y, 'boss_memory_leak', HP, BODY_W, BODY_H);
    this.homeY = y;
    this.worldH = worldH;
    this.getBob = getBob;
    this.goo = scene.physics.add.group({ classType: GooBlob, maxSize: 12, runChildUpdate: false });
  }

  /** Expose the goo group so StageScene can set up overlaps with the player. */
  get gooGroup(): Phaser.Physics.Arcade.Group {
    return this.goo;
  }

  /** Damage dealt to Bob when overlapping a blob or puddle. */
  static gooDamage(blob: GooBlob): number {
    return blob.isPuddle ? PUDDLE_DAMAGE : GOO_DAMAGE;
  }

  protected think(): void {
    this.stateFrames++;
    const fury = this.hp <= Math.floor(this.maxHp * FURY_THRESHOLD);
    const bob = this.getBob();

    // Tick all goo objects
    for (const g of this.goo.getChildren() as GooBlob[]) {
      if (g.stepBlob(this.worldH) === 'dead') g.deactivate();
    }

    switch (this.mlState) {
      case 'idle_enter':
        if (this.stateFrames >= IDLE_ENTER) this.goState(fury ? 'fury_volley' : 'volley');
        break;

      case 'volley':
      case 'fury_volley': {
        const count = fury ? BURST_COUNT + FURY_EXTRA : BURST_COUNT;
        if (this.volleyCount < count) {
          if (this.stateFrames % BURST_INTERVAL === 1) {
            this.launchGoo();
            this.volleyCount++;
          }
        } else {
          // volley done
          this.burstsDone++;
          this.volleysDone++;
          this.volleyCount = 0;
          if (!fury && this.volleysDone >= VOLLEYS_BEFORE_DIVE) {
            this.volleysDone = 0;
            this.goState('dive');
          } else {
            this.goState(fury ? 'fury_wait' : 'volley_wait');
          }
        }
        break;
      }

      case 'volley_wait':
      case 'fury_wait':
        if (this.stateFrames >= (fury ? VOLLEY_COOLDOWN / 2 : VOLLEY_COOLDOWN)) {
          this.goState(fury ? 'fury_volley' : 'volley');
        }
        break;

      case 'dive': {
        // Record Bob's X for the emerge position
        if (this.stateFrames === 1) {
          this.diveTargetX = bob ? bob.x : this.x;
        }
        const sinkPct = Math.min(1, this.stateFrames / SINK_FRAMES);
        this.y = this.homeY + sinkPct * this.height;
        this.setAlpha(1 - sinkPct);
        if (this.stateFrames >= SINK_FRAMES) {
          this.setVisible(false);
          this.body.enable = false;
          this.goState('lurk');
        }
        break;
      }

      case 'lurk':
        if (this.stateFrames >= LURK_FRAMES) {
          // Snap to Bob's last known X (clamped to the boss room)
          this.x = Phaser.Math.Clamp(this.diveTargetX, this.body.halfWidth + 16, this.worldH - this.body.halfWidth - 16);
          this.y = this.homeY + this.height; // start below ground
          this.setVisible(true).setAlpha(0);
          this.body.enable = true;
          this.goState('rise');
        }
        break;

      case 'rise': {
        const risePct = Math.min(1, this.stateFrames / RISE_FRAMES);
        this.y = this.homeY + this.height * (1 - risePct);
        this.setAlpha(risePct);
        if (this.stateFrames >= RISE_FRAMES) {
          this.y = this.homeY;
          this.setAlpha(1);
          this.goState(fury ? 'fury_volley' : 'volley');
        }
        break;
      }
    }
  }

  private goState(next: MLState): void {
    this.mlState = next;
    this.stateFrames = 0;
  }

  private launchGoo(): void {
    const bx = this.body.center.x;
    const by = this.body.top;
    // Aim toward Bob; if he's unreachable, spread left/right alternately
    const bob = this.getBob();
    const targetX = bob ? bob.x : bx + (this.burstsDone % 2 === 0 ? 40 : -40);
    const dx = targetX - bx;
    const vx = Phaser.Math.Clamp((dx / Math.max(1, Math.abs(dx))) * GOO_SPREAD_X, -GOO_SPREAD_X, GOO_SPREAD_X);

    const blob = this.goo.get() as GooBlob | null;
    if (blob) blob.fire(bx, by, vx);
  }

  reset(): void {
    for (const g of this.goo.getChildren() as GooBlob[]) g.deactivate();
    this.mlState = 'idle_enter';
    this.stateFrames = 0;
    this.volleyCount = 0;
    this.volleysDone = 0;
    this.burstsDone = 0;
    this.x = this.body.x + this.body.halfWidth; // snap back to spawn X is handled by StageScene
    this.y = this.homeY;
    this.setAlpha(1).setVisible(true);
    super.reset();
  }
}
