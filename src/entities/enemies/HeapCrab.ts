import Phaser from 'phaser';
import { GRAVITY, MAX_FALL_SPEED } from '../../data/tuning';
import { type Crab, newCrab, stepCrab } from '../../systems/enemyAI';
import { Enemy, type EnemyWorld } from '../Enemy';
import { CRAB_WINDUP_FRAMES } from '../../data/enemies';
import { COMBAT_ART } from '../../data/tuning';
import { crabArtFrame } from '../../systems/enemyArt';
import { CombatCue } from '../CombatCue';

/** Where the raised pincer holds the block, from the feet (facing right). */
const HAND_X = 14;
const HAND_Y = 26;

/** E4 Heap Crab (Memory Leak): patrols sideways and lobs memory blocks at Bob. */
export class HeapCrab extends Enemy {
  readonly solid = true;
  private readonly ai: Crab = newCrab();
  private readonly cue: CombatCue;

  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld) {
    super(scene, x, y, 'heapCrab', world);
    this.body.setGravityY(GRAVITY);
    this.body.setMaxVelocityY(MAX_FALL_SPEED);
    this.cue = new CombatCue(this);
  }

  protected think(): void {
    const b = this.body;
    const f = this.ai.facing;
    const hand = { x: this.x + f * HAND_X, y: this.y - HAND_Y };
    const bob = this.world.bob();
    const out = stepCrab(
      this.ai,
      {
        onGround: b.blocked.down,
        wallAhead: f > 0 ? b.blocked.right : b.blocked.left,
        floorAhead: this.world.floorAt(b.center.x + f * (b.width / 2 + 2), b.bottom + 2),
      },
      bob ? { dx: bob.x - hand.x, dy: bob.y - hand.y } : null,
      this.stats.speed,
    );
    b.setVelocityX(out.vx);
    this.setFrame(crabArtFrame(this.ai.state, this.ai.frames, out.frame));
    // the sheet faces right
    this.setFlipX(this.ai.facing < 0);
    if (out.throw) this.world.shoot('block', this.x + this.ai.facing * HAND_X, hand.y, out.throw.vx, out.throw.vy);
    this.cue.step({x:this.x+this.ai.facing*HAND_X,y:hand.y,color:COMBAT_ART.teal,release:!!out.throw,
      ...(this.ai.state==='windup'?{charge:this.ai.frames/CRAB_WINDUP_FRAMES}:{})});
  }
}
