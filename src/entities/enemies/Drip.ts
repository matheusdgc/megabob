import Phaser from 'phaser';
import { DRIP_HANG_TOP, DRIP_PUDDLE_BODY } from '../../data/enemies';
import { GRAVITY, MAX_FALL_SPEED } from '../../data/tuning';
import { type Drip as DripAI, newDrip, stepDrip } from '../../systems/enemyAI';
import { Enemy, type EnemyWorld } from '../Enemy';
import { syncBodyTransform } from '../bodyTransform';
import { CombatCue } from '../CombatCue';
import { COMBAT_ART } from '../../data/tuning';

const TILE = 16;
const FRAME_H = 40;

/**
 * E3 Drip (Memory Leak): hangs under the ceiling, drops when Bob walks below, splats into a
 * puddle and crawls after him. Its map marker sits in the cell right under the ceiling.
 */
export class Drip extends Enemy {
  readonly solid = true;
  private readonly ai: DripAI = newDrip();
  private puddle = false;
  private readonly cue: CombatCue;

  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld) {
    // marker y is the bottom of its cell; the ceiling is the top of that cell
    super(scene, x, y - TILE + FRAME_H - DRIP_HANG_TOP, 'drip', world);
    this.body.setGravityY(GRAVITY);
    this.body.setMaxVelocityY(MAX_FALL_SPEED);
    this.body.setAllowGravity(false);
    this.cue = new CombatCue(this);
  }

  protected think(): void {
    const b = this.body;
    const bob = this.world.bob();
    const f = this.ai.facing;
    const out = stepDrip(
      this.ai,
      {
        onGround: b.blocked.down,
        wallAhead: f > 0 ? b.blocked.right : b.blocked.left,
        floorAhead: this.world.floorAt(b.center.x + f * (b.width / 2 + 2), b.bottom + 2),
      },
      bob ? bob.x - this.x : null,
      !!bob && bob.y > b.bottom,
      this.stats.speed,
    );
    const landed = !this.puddle && this.ai.state === 'splat';
    if (landed) this.becomePuddle();
    b.setAllowGravity(out.gravity);
    b.setVelocityX(out.vx);
    this.setFrame(out.frame);
    this.setFlipX(this.ai.facing > 0);
    this.cue.step({x:b.center.x,y:b.bottom-3,color:COMBAT_ART.teal,release:landed,
      ...(this.ai.state==='fall' ? {trail:{x:0,y:1}} : {})});
  }

  /** Landed: a low, wide hitbox, still tall enough for a standing shot. */
  private becomePuddle(): void {
    this.puddle = true;
    const [w, h] = DRIP_PUDDLE_BODY;
    this.body.setSize(w, h, false);
    this.body.setOffset((this.width - w) / 2, this.height - h);
    syncBodyTransform(this);
  }
}
