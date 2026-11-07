import Phaser from 'phaser';
import { SPIKE_CHARGE_FRAMES, SPIKE_SHOT_SPEED } from '../../data/enemies';
import { COMBAT_ART } from '../../data/tuning';
import { warningArtFrame } from '../../systems/enemyArt';
import { CombatCue } from '../CombatCue';
import { newSpike, type Spike, stepSpike } from '../../systems/enemyAI';
import { Enemy, type EnemyWorld } from '../Enemy';

const TILE = 16;

/**
 * E6 Clock Spike (Race Condition): a turret on a wall that fires clock-hand spikes straight
 * out. Its marker goes in the cell beside the wall; it faces the open side.
 */
export class ClockSpike extends Enemy {
  readonly solid = false;
  private readonly ai: Spike;
  private readonly cue: CombatCue;

  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld) {
    // mounted on whichever side of its cell is solid
    const facing: 1 | -1 = world.floorAt(x - TILE, y - TILE / 2) ? 1 : -1;
    super(scene, x - facing * 6, y + 8, 'clockSpike', world);
    this.ai = newSpike(facing);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    const [w,h]=this.stats.body;
    this.body.setOffset((this.width-w)/2,(this.height-h)/2);
    this.cue=new CombatCue(this);
    this.setFlipX(facing < 0); // the sheet faces right
  }

  protected think(): void {
    const bob = this.world.bob();
    const b = this.body;
    const out = stepSpike(this.ai, bob ? { dx: bob.x - b.center.x, dy: bob.y - b.center.y } : null);
    this.setFrame(warningArtFrame(this.ai.state,this.ai.frames,out.frame));
    if (out.fire) this.world.shoot('clockSpike', b.center.x + this.ai.facing * 14, b.center.y, this.ai.facing * SPIKE_SHOT_SPEED, 0);
    this.cue.step({x:b.center.x+this.ai.facing*14,y:b.center.y,color:COMBAT_ART.amber,release:out.fire,
      ...(this.ai.state==='charge'?{charge:this.ai.frames/SPIKE_CHARGE_FRAMES}:{})});
  }
}
