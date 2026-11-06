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
import { playOnce } from './effects';

export type { BossPhase };

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
    if (this._bossState.phase === 'fight') this.think();
  }

  /** Subclass AI — called once per fixed step while phase === 'fight'. */
  protected abstract think(): void;

  /** Takes damage; returns true when this hit destroyed the boss. Respects i-frames. */
  hurt(damage: number): boolean {
    const result = hurtBoss(this._bossState, damage);
    if (result === 'hurt') this.setTintFill(0xffffff);
    if (result === 'dead') this.onDie();
    return result === 'dead';
  }

  private onDie(): void {
    const { x, y } = this.body.center;
    playOnce(this.scene, 'fx_boss_explosion', x, y, 12);
    this.setVisible(false);
    this.body.enable = false;
    this.scene.events.emit('bossDefeated');
  }

  /** Restart the encounter (Bob died). Subclasses clean up their state then call super. */
  reset(): void {
    resetBossState(this._bossState);
    this.setVisible(true);
    this.body.enable = true;
    this.clearTint();
  }
}
