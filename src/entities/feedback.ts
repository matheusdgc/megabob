import Phaser from 'phaser';
import { FEEDBACK, type FeedbackEvent } from '../data/tuning';

/** Registry flag (settings, T13b): no camera shake or screen flash. */
export const REDUCE_MOTION = 'reduceMotion';

const FRAME_MS = 1000 / 60;

/**
 * Plays the feedback bundle of an event (freeze frame, shake, flash) from the tier table in
 * tuning.ts, so every impact in the game stays proportional. Also owns pausing the physics
 * world: freezes and other holds (camera pans between sections) are reasons in one set, and
 * the world only resumes when the last one is released.
 */
export class Feedback {
  private readonly holds = new Set<string>();
  private freezeTimer?: Phaser.Time.TimerEvent;

  constructor(private readonly scene: Phaser.Scene) {}

  play(event: FeedbackEvent): void {
    const tier = FEEDBACK[event];
    if (tier.freeze > 0) this.freeze(tier.freeze);
    if (this.scene.registry.get(REDUCE_MOTION)) return;
    const cam = this.scene.cameras.main;
    if (tier.shakeMs > 0) cam.shake(tier.shakeMs, tier.shake);
    if (tier.flashMs > 0) cam.flash(tier.flashMs, 255, 255, 255);
  }

  /** Stop the world until `release(reason)`. */
  hold(reason: string): void {
    this.holds.add(reason);
    this.scene.physics.world.pause();
  }

  release(reason: string): void {
    this.holds.delete(reason);
    if (this.holds.size === 0) this.scene.physics.world.resume();
  }

  /** Freeze `frames`; overlapping freezes keep the longer one, never cut one short. */
  private freeze(frames: number): void {
    const ms = frames * FRAME_MS;
    if (this.freezeTimer && this.freezeTimer.getRemaining() >= ms) return;
    this.freezeTimer?.remove(false);
    if (!this.holds.has('freeze')) {
      this.hold('freeze');
      this.scene.anims.pauseAll();
    }
    this.freezeTimer = this.scene.time.delayedCall(ms, () => this.unfreeze());
  }

  private unfreeze(): void {
    this.freezeTimer = undefined;
    this.scene.anims.resumeAll();
    this.release('freeze');
  }

  /** Scene shutdown: animations are paused game-wide, so never leave them frozen. */
  shutdown(): void {
    if (this.holds.has('freeze')) this.scene.anims.resumeAll();
    this.freezeTimer = undefined;
    this.holds.clear();
  }
}
