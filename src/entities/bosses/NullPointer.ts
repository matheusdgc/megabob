import Phaser from 'phaser';
import {
  newNullBoss,
  NULL_CONTACT,
  NULL_CURSOR_DAMAGE,
  NULL_HOVER,
  NULL_HP,
  NULL_VOID_DAMAGE,
  type NullBoss,
  stepNull,
  VOID_LIVE,
  VOID_WARN,
} from '../../systems/nullBoss';
import { Boss, type BossHazards } from '../Boss';
import { loopAnim } from '../effects';
import type { BobLocator } from './index';
import { CombatCue } from '../CombatCue';
import { COMBAT_ART } from '../../data/tuning';

const BODY: [number, number] = [26, 56];
const HURT_FRAME = 6;
const DEFEATED_FRAME = 7;
const TILE = 16;

interface Void {
  sprite: Phaser.GameObjects.TileSprite;
  frames: number;
}

/**
 * Boss 3, Null Pointer: a hollow, glitching figure that teleports between three spots, fans
 * cursor arrows at Bob, turns patches of floor into missing tiles and, when hurt, comes back
 * with fake copies. Weak to the Garbage Collector. Pattern: src/systems/nullBoss.ts.
 */
export class NullPointer extends Boss {
  readonly contactDamage = NULL_CONTACT;
  private readonly ai: NullBoss = newNullBoss();
  private readonly cursors: Phaser.Physics.Arcade.Group;
  private readonly voidGroup: Phaser.Physics.Arcade.Group;
  private voids: Void[] = [];
  private decoys: Phaser.GameObjects.Image[] = [];
  private readonly floorY: number;
  private tangible = true;
  private readonly cue: CombatCue;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly getBob: BobLocator,
  ) {
    super(scene, x, y - NULL_HOVER, 'boss_null_pointer', NULL_HP, BODY[0], BODY[1]);
    this.floorY = y;
    this.body.moves = false; // teleport poses must not be integrated a second time
    this.cursors = scene.physics.add.group({ allowGravity: false });
    this.voidGroup = scene.physics.add.group({ allowGravity: false });
    this.cue = new CombatCue(this);
  }

  override get hazards(): BossHazards[] {
    return [
      { group: this.cursors, damage: () => NULL_CURSOR_DAMAGE, swallow: (c) => c.destroy() },
      {
        group: this.voidGroup,
        damage: (v) => (this.voids.some((k) => k.sprite === v && k.frames >= VOID_WARN) ? NULL_VOID_DAMAGE : 0),
        swallow: () => {}, // the floor itself is missing: nothing to eat
      },
    ];
  }

  /** Untouchable while glitching out, hidden or reassembling. */
  override get isTangible(): boolean {
    return this.tangible;
  }

  protected think(): void {
    const out = stepNull(this.ai, {
      x: this.x,
      y: this.y,
      bob: this.getBob(),
      arenaLeft: this.arenaLeft,
      arenaRight: this.arenaRight,
      floorY: this.floorY,
      hp: this.hpFraction,
      rand: Math.random,
    });
    if (out.moveTo) this.setPosition(out.moveTo.x, out.moveTo.y);
    this.setVisible(out.visible);
    this.tangible = out.tangible;
    this.body.enable = out.tangible;
    this.setFrame(out.frame);
    this.body.updateFromGameObject();
    this.setFlipX(this.ai.facing > 0); // the sheet faces left
    if (out.frame === 2 && this.ai.frames === 1) this.scene.events.emit('bossSfx', 'glitch');
    if (out.clearDecoys) this.clearDecoys();
    for (const d of out.decoys ?? []) this.decoys.push(this.scene.add.image(d.x, d.y, 'boss_null_pointer', 0).setOrigin(0.5, 1).setAlpha(0.8).setFlipX(this.flipX));
    for (const c of out.cursors ?? []) this.fireCursor(c.vx, c.vy);
    for (const v of out.voids ?? []) this.openVoid(v.x, v.w);
    this.stepVoids();
    this.cue.step({x:this.body.center.x,y:this.body.center.y,color:COMBAT_ART.metal,
      release:!!out.moveTo||!!out.cursors,
      ...(this.ai.state==='in'?{charge:1}:{}),
      ...(this.ai.state==='out'?{trail:{x:this.ai.facing,y:0}}:{})});
  }

  override step(): void {
    super.step();
    if (this.phase === 'dead') this.setFrame(DEFEATED_FRAME);
    else if (this.isFlashing) this.setFrame(HURT_FRAME);
  }

  private fireCursor(vx: number, vy: number): void {
    const c = this.cursors.create(this.x + this.ai.facing * 12, this.y - 40, 'null_cursor', 0) as Phaser.Physics.Arcade.Sprite;
    c.setDepth(2).setFlipX(vx > 0).setRotation(Math.atan2(vy, vx) + (vx > 0 ? 0 : Math.PI));
    c.play(loopAnim(this.scene, 'null_cursor', [0, 1], 10));
    (c.body as Phaser.Physics.Arcade.Body).setSize(10, 10).setAllowGravity(false).setVelocity(vx, vy);
    this.scene.events.emit('bossSfx', 'nullPointer');
  }

  /** A patch of missing floor: flickers (harmless) first, then hurts, then closes. */
  private openVoid(x: number, w: number): void {
    const s = this.scene.add.tileSprite(x, this.floorY - TILE, w, TILE, 'null_missing_tile', 0).setOrigin(0, 0).setDepth(1).setAlpha(0.5);
    this.voidGroup.add(s);
    const body = s.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false).setSize(w, 6).setOffset(0, TILE - 6);
    this.voids.push({ sprite: s, frames: 0 });
  }

  private stepVoids(): void {
    for (const v of this.voids) {
      v.frames++;
      if (v.frames < VOID_WARN) v.sprite.setAlpha(Math.floor(v.frames / 4) % 2 === 0 ? 0.25 : 0.6);
      else v.sprite.setAlpha(1).setFrame(Math.floor(v.frames / 8) % 2);
      if (v.frames >= VOID_WARN + VOID_LIVE) v.sprite.destroy();
    }
    this.voids = this.voids.filter((v) => v.sprite.active);
    for (const c of this.cursors.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
      if (c.x < this.arenaLeft - 32 || c.x > this.arenaRight + 32 || c.y < -64 || c.y > this.floorY + 32) c.destroy();
    }
  }

  private clearDecoys(): void {
    for (const d of this.decoys) d.destroy();
    this.decoys = [];
  }

  protected override onDefeated(): void {
    this.cue.clear();
    this.cursors.clear(true, true);
    this.voidGroup.clear(true, true);
    this.voids = [];
    this.clearDecoys();
  }

  override destroy(fromScene?: boolean): void {
    this.cursors?.destroy(true);
    this.voidGroup?.destroy(true);
    this.clearDecoys();
    super.destroy(fromScene);
  }
}
