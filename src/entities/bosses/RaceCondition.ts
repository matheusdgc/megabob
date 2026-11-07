import Phaser from 'phaser';
import {
  newRace,
  type Race,
  RACE_BLADE_DAMAGE,
  RACE_CLONE_DAMAGE,
  RACE_CONTACT,
  RACE_DASH_SPEED,
  RACE_HP,
  RACE_WALL_MARGIN,
  stepRace,
} from '../../systems/raceBoss';
import { Boss, type BossHazards } from '../Boss';
import { loopAnim } from '../effects';
import type { BobLocator } from './index';

/** Standing and dashing hitboxes (w, h): the dash is low enough for Bob to jump over. */
const STAND: [number, number] = [28, 48];
const LOW: [number, number] = [44, 22];
const HAND_Y = 30;
const DEFEATED_FRAME = 7;
const HURT_FRAME = 6;

interface Clone {
  sprite: Phaser.Physics.Arcade.Sprite;
  wait: number;
  dir: 1 | -1;
}

/**
 * Boss 2, Race Condition: a speedster that dashes across the room, flings clock-hand blades
 * and splits into out-of-sync copies that replay its dash late. Weak to the Null Pointer.
 * The pattern is the pure machine in src/systems/raceBoss.ts; this class only applies it.
 */
export class RaceCondition extends Boss {
  readonly contactDamage = RACE_CONTACT;
  private readonly ai: Race = newRace();
  private readonly blades: Phaser.Physics.Arcade.Group;
  private readonly cloneGroup: Phaser.Physics.Arcade.Group;
  private clones: Clone[] = [];
  private low = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly getBob: BobLocator,
  ) {
    super(scene, x, y, 'boss_race_condition', RACE_HP, STAND[0], STAND[1]);
    this.blades = scene.physics.add.group({ allowGravity: false });
    this.cloneGroup = scene.physics.add.group({ allowGravity: false });
  }

  override get hazards(): BossHazards[] {
    return [
      { group: this.blades, damage: () => RACE_BLADE_DAMAGE, swallow: (b) => b.destroy() },
      {
        group: this.cloneGroup,
        damage: (c) => (this.clones.some((k) => k.sprite === c && k.wait <= 0) ? RACE_CLONE_DAMAGE : 0),
        swallow: () => {}, // a copy is not a projectile: the Garbage Collector cannot eat it
      },
    ];
  }

  protected think(): void {
    const out = stepRace(this.ai, {
      x: this.x,
      bob: this.getBob(),
      hand: { x: this.x + this.ai.facing * 20, y: this.y - HAND_Y },
      arenaLeft: this.arenaLeft,
      arenaRight: this.arenaRight,
      hp: this.hpFraction,
    });
    if (out.vx !== 0 && this.body.velocity.x === 0) this.scene.events.emit('bossSfx', 'bossDash');
    this.body.setVelocityX(out.vx);
    this.setLow(out.low);
    this.setFrame(out.frame);
    this.setFlipX(this.ai.facing > 0); // the sheet faces left
    // never leave the arena, whatever the speed
    this.x = Phaser.Math.Clamp(this.x, this.arenaLeft + RACE_WALL_MARGIN, this.arenaRight - RACE_WALL_MARGIN);
    for (const v of out.blades ?? []) this.throwBlade(v.vx, v.vy);
    for (const c of out.clones ?? []) this.spawnClone(c.delay, c.dir);
    this.stepClones();
  }

  override step(): void {
    super.step();
    if (this.phase === 'dead') this.setFrame(DEFEATED_FRAME);
    else if (this.isFlashing) this.setFrame(HURT_FRAME);
  }

  private setLow(low: boolean): void {
    if (low === this.low) return;
    this.low = low;
    const [w, h] = low ? LOW : STAND;
    this.body.setSize(w, h, false);
    this.body.setOffset((this.width - w) / 2, this.height - h);
  }

  private throwBlade(vx: number, vy: number): void {
    const b = this.blades.create(this.x + this.ai.facing * 20, this.y - HAND_Y, 'clock_blade', 0) as Phaser.Physics.Arcade.Sprite;
    b.setDepth(2);
    b.play(loopAnim(this.scene, 'clock_blade', [0, 1, 2, 3], 16));
    (b.body as Phaser.Physics.Arcade.Body).setSize(14, 14).setAllowGravity(false).setVelocity(vx, vy);
    this.scene.events.emit('bossSfx', 'throw');
  }

  /** A copy waiting at the boss's side; it takes off `delay` frames later along `dir`. */
  private spawnClone(delay: number, dir: 1 | -1): void {
    const s = this.cloneGroup.create(this.x, this.y, 'race_afterimage', 0) as Phaser.Physics.Arcade.Sprite;
    s.setOrigin(0.5, 1).setAlpha(0.35).setFlipX(dir > 0).setDepth(-0.5);
    const body = s.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false).setSize(LOW[0], LOW[1]).setOffset((s.width - LOW[0]) / 2, s.height - LOW[1]);
    this.clones.push({ sprite: s, wait: delay, dir });
  }

  private stepClones(): void {
    for (const c of this.clones) {
      const body = c.sprite.body as Phaser.Physics.Arcade.Body;
      if (c.wait > 0 && --c.wait === 0) {
        c.sprite.setAlpha(0.75);
        body.setVelocityX(c.dir * RACE_DASH_SPEED);
      }
      const atWall = c.dir > 0 ? c.sprite.x >= this.arenaRight - RACE_WALL_MARGIN : c.sprite.x <= this.arenaLeft + RACE_WALL_MARGIN;
      if (c.wait <= 0 && atWall) c.sprite.destroy();
    }
    this.clones = this.clones.filter((c) => c.sprite.active);
    // blades fly out of the arena: drop them
    for (const b of this.blades.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
      if (b.x < this.arenaLeft - 32 || b.x > this.arenaRight + 32 || b.y < -64 || b.y > this.y + 64) b.destroy();
    }
  }

  protected override onDefeated(): void {
    this.blades.clear(true, true);
    this.cloneGroup.clear(true, true);
    this.clones = [];
  }

  override destroy(fromScene?: boolean): void {
    this.blades?.destroy(true);
    this.cloneGroup?.destroy(true);
    super.destroy(fromScene);
  }
}
