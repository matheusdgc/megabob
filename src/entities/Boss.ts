import Phaser from 'phaser';
import {
  BOSS_INTRO_FRAMES,
  BOSS_INVULN_FRAMES,
  bossIntroPct,
  bossHpFraction,
  hurtBoss,
  newBossState,
  resetBossState,
  tickBossState,
  type BossPhase,
  type BossState,
} from '../systems/boss';
import { MUTEX_BOSS_IMMUNE_FRAMES } from '../data/weapons';
import { playOnce } from './effects';

export type { BossPhase };

/**
 * Something a boss throws at Bob: a physics group, wired once by the stage (it hurts Bob, the
 * Garbage Collector swallows it, and it may land on the terrain).
 */
export interface BossHazards {
  group: Phaser.Physics.Arcade.Group;
  damage(child: Phaser.GameObjects.GameObject): number;
  swallow(child: Phaser.GameObjects.GameObject): void;
  /** Process callback for a collider with the tiles; omit for shots that fly through walls. */
  collidesWithTiles?(child: Phaser.GameObjects.GameObject): boolean;
}

/** Tint of a boss held by the Mutex Lock. */
const FROZEN_TINT = 0xf1c21b;

/** Segments in the boss health bar. */
export const BOSS_BAR_SEGMENTS = 28;

// re-export for callers that want the numeric constants
export { BOSS_INTRO_FRAMES, BOSS_INVULN_FRAMES };

/**
 * Base class for all bosses. Position (x, y) is the feet (bottom-center).
 *
 * Life cycle:
 *  1. StageScene spawns the boss when `bossIntro` fires.
 *  2. `startIntro()` plays the health-bar fill animation (phase = 'intro').
 *  3. After BOSS_INTRO_FRAMES, phase becomes 'fight'; `think()` starts being called.
 *  4. `hurt()` reduces HP; at 0 fires `bossDefeated` on the scene event bus.
 *  5. On Bob's death, StageScene calls `reset()` to restart the encounter.
 *
 * Subclasses must implement `think()` (AI per fixed step) and override `reset()`
 * (clean up subclass state, then call `super.reset()`).
 */
export abstract class Boss extends Phaser.Physics.Arcade.Sprite {
  private readonly _bossState: BossState;
  /** Damage to Bob on touching the boss's body. */
  abstract readonly contactDamage: number;
  /** Arena walls, in world x: the boss never leaves them. */
  protected arenaLeft = -Infinity;
  protected arenaRight = Infinity;
  /** Frames left frozen by the Mutex Lock, then frames it shrugs the lock off. */
  private frozen = 0;
  private immune = 0;

  declare body: Phaser.Physics.Arcade.Body;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    hp: number,
    bodyW: number,
    bodyH: number,
  ) {
    super(scene, x, y, textureKey, 0);
    this._bossState = newBossState(hp);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.body.setSize(bodyW, bodyH);
    this.body.setOffset((this.width - bodyW) / 2, this.height - bodyH);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
  }

  get phase(): BossPhase {
    return this._bossState.phase;
  }

  get hp(): number {
    return this._bossState.hp;
  }

  /** Lets a subclass select its hurt drawing while the shared flash is active. */
  protected get isFlashing(): boolean {
    return this._bossState.flash > 0;
  }

  get maxHp(): number {
    return this._bossState.maxHp;
  }

  /** Progress 0–1 for the health bar intro fill animation. */
  get introPct(): number {
    return bossIntroPct(this._bossState);
  }

  /** Fraction of max HP remaining (0–1). */
  get hpFraction(): number {
    return bossHpFraction(this._bossState);
  }

  /** What the boss throws (empty for a boss that only charges). */
  get hazards(): BossHazards[] {
    return [];
  }

  setArena(left: number, right: number): void {
    this.arenaLeft = left;
    this.arenaRight = right;
  }

  /** Can be hit and hurts on contact (a teleporting boss is not, for a moment). */
  get isTangible(): boolean {
    return true;
  }

  get isFrozen(): boolean {
    return this.frozen > 0;
  }

  /**
   * The Mutex Lock: the boss stops acting for `frames` (it still takes damage). Returns false
   * when the lock does not take (not fighting, or still immune from the last one).
   */
  freeze(frames: number): boolean {
    if (this._bossState.phase !== 'fight' || this.immune > 0 || this.frozen > 0) return false;
    this.frozen = frames;
    this.body.setVelocity(0, 0);
    this.setTint(FROZEN_TINT);
    return true;
  }

  /** Kick off the intro (call once after spawning). */
  startIntro(): void {
    resetBossState(this._bossState);
  }

  /** One fixed physics step called by StageScene. */
  step(): void {
    if (this._bossState.phase === 'dead') return;
    // sync flash tint with state
    if (this._bossState.flash === 0) this.clearTint();
    const result = tickBossState(this._bossState);
    if (result === 'dead') return;
    if (this._bossState.phase !== 'fight') return;
    if (this.immune > 0) this.immune--;
    if (this.frozen > 0) {
      this.body.setVelocity(0, 0);
      if (--this.frozen === 0) {
        this.clearTint();
        this.immune = MUTEX_BOSS_IMMUNE_FRAMES;
      } else if (this._bossState.flash === 0) this.setTint(FROZEN_TINT);
      return;
    }
    this.think();
  }

  /** Subclass AI — called once per fixed step while phase === 'fight'. */
  protected abstract think(): void;

  /** Takes damage; returns true when this hit destroyed the boss. Respects i-frames. */
  hurt(damage: number): boolean {
    const result = hurtBoss(this._bossState, damage);
    if (result === 'hurt') {
      this.setTintFill(0xffffff);
      this.scene.events.emit('bossHurt');
    }
    if (result === 'dead') this.onDie();
    return result === 'dead';
  }

  private onDie(): void {
    const { x, y } = this.body.center;
    playOnce(this.scene, 'fx_boss_explosion', x, y, 12);
    this.onDefeated();
    this.setVisible(false);
    this.body.enable = false;
    this.scene.events.emit('bossDefeated');
  }

  /** Subclasses clear their projectiles here. */
  protected onDefeated(): void {}

  /** Restart the encounter (Bob died). Subclasses clean up their state then call super. */
  reset(): void {
    resetBossState(this._bossState);
    this.frozen = 0;
    this.immune = 0;
    this.setVisible(true);
    this.body.enable = true;
    this.clearTint();
  }
}
