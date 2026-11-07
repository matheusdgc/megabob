import Phaser from 'phaser';

/** Frames each door animation step lasts (frames: 0 closed, 1 half open, 2 open). */
const STEP_FRAMES = 8;
/** Bob walks this far past the door's right edge before it closes behind him. */
const CLEARANCE = 24;
/** Bob counts as touching the door within this many pixels of it. */
const TOUCH_SLACK = 4;

export type DoorState = 'closed' | 'opening' | 'open' | 'closing' | 'shut';

/**
 * Boss door: a 32x48 shutter that blocks Bob until he walks into it. It then slides open,
 * Bob walks through on his own, and it closes behind him for good (`shut`).
 * Placed by the bottom-left of its map cell.
 */
export class BossDoor extends Phaser.GameObjects.Sprite {
  state: DoorState = 'closed';
  private frames = 0;
  declare body: Phaser.Physics.Arcade.StaticBody;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'boss_door', 0);
    scene.add.existing(this);
    this.setOrigin(0, 1);
    scene.physics.add.existing(this, true);
  }

  /** Bob is scripted (no player control) from the moment the door opens until it is shut. */
  get busy(): boolean {
    return this.state === 'opening' || this.state === 'open' || this.state === 'closing';
  }

  /** Bob should walk right (through the doorway) this frame. */
  get walkThrough(): boolean {
    return this.state === 'open';
  }

  /**
   * One fixed logic step. Returns 'shut' on the frame the door closes behind Bob.
   * `bob` is his hitbox.
   */
  step(bob: Phaser.Geom.Rectangle): 'shut' | null {
    this.frames++;
    switch (this.state) {
      case 'closed': {
        // the collider stops Bob a pixel or two short of the shutter
        const left = this.body.x;
        const touching =
          bob.right >= left - TOUCH_SLACK && bob.left < left && bob.bottom > this.body.y && bob.top < this.body.bottom;
        if (touching) this.go('opening');
        break;
      }
      case 'opening':
        this.setFrame(Math.min(2, 1 + Math.floor(this.frames / STEP_FRAMES)));
        if (this.frames >= STEP_FRAMES * 2) {
          this.body.enable = false;
          this.go('open');
        }
        break;
      case 'open':
        if (bob.left > this.body.right + CLEARANCE) this.go('closing');
        break;
      case 'closing':
        this.setFrame(Math.max(0, 1 - Math.floor(this.frames / STEP_FRAMES)));
        if (this.frames >= STEP_FRAMES * 2) {
          this.body.enable = true;
          this.go('shut');
          return 'shut';
        }
        break;
      case 'shut':
        break;
    }
    return null;
  }

  /** Back to closed (Bob died in the boss room and respawns before the door). */
  reset(): void {
    this.go('closed');
    this.setFrame(0);
    this.body.enable = true;
  }

  private go(state: DoorState): void {
    this.state = state;
    this.frames = 0;
  }
}
