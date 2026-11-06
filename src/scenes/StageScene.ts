import Phaser from 'phaser';
import { ARMOR_BITS, TILE } from '../data/assets';
import { MAX_LIVES, PICKUPS, rollDrop } from '../data/drops';
import { BossDoor } from '../entities/BossDoor';
import type { Boss } from '../entities/Boss';
import { MemoryLeak, MEMORY_LEAK_CONTACT } from '../entities/bosses/MemoryLeak';
import { Checkpoint } from '../entities/Checkpoint';
import { Enemy, type EnemyWorld } from '../entities/Enemy';
import { playOnce } from '../entities/effects';
import { Feedback } from '../entities/feedback';
import { createEnemy } from '../entities/enemies';
import { Pickup } from '../entities/Pickup';
import type { Projectile } from '../entities/Projectile';
import { Player } from '../entities/Player';
import { type MapEnemy, parseMap, T } from '../stages/map';
import { bossRoomIndex, DEFAULT_STAGE, type StageDef, type StageId, STAGES } from '../stages/stages';
import { type Action, ActionState } from '../systems/actions';
import { cameraScroll, type Section, sectionAt, sectionOf, sectionsFromTiles } from '../systems/camera';
import { heal, loseLife } from '../systems/damage';
import { GameInput } from '../systems/input';
import { grant, newArsenal, refill } from '../systems/weapons';
import { BOSS_WEAPON, damageFor, WEAPON_MAX_ENERGY, WEAPONS } from '../data/weapons';
import { GcOrb } from '../entities/weapons/GarbageCollector';
import { OWNED_WEAPONS } from './WeaponGetScene';
import { BossHealthBar } from '../ui/BossHealthBar';
import { Hud } from '../ui/Hud';

/**
 * Arcade may hand overlap pairs in either order (also sprite vs group), so callbacks sort
 * them by type: returns [the one matching `is`, the other].
 */
const pick = <A>(a: unknown, b: unknown, is: (o: unknown) => o is A): [A, unknown] => (is(a) ? [a, b] : [b as A, a]);

/** Camera looks this far above Bob's feet, so he sits slightly below screen center. */
const CAMERA_LOOK_UP = 24;
/** Camera pan between sections; the game freezes meanwhile, like the genre. */
const TRANSITION_MS = 450;

interface RespawnPoint {
  x: number;
  y: number;
  section: number;
}

/** Scene events that must not outlive one run of the stage (Phaser keeps them across restarts). */
const RUN_EVENTS = ['bossIntro', 'bossHurt', 'bossDefeated', 'bossRoomUnlocked', 'gameOver'] as const;

/**
 * A playable stage, built from its `StageDef` (map, camera sections, boss, tileset).
 * Start it with `scene.start('Stage', { stage })`; all per-run state is reset in `init()`.
 * Dev keys (dev build only): R back to the respawn point, F2 hitboxes + state readout, 1-4 armor
 * parts (4 = Turbo Boots: air dash), H take a 4-point hit from the front, G grant the Garbage Collector.
 * Emits `bossIntro` when the boss door shuts behind Bob, `gameOver` on the last life.
 */
export class StageScene extends Phaser.Scene {
  // Per-run state. The scene instance is reused on restart, so all of it is set in init().
  private def!: StageDef;
  private controls!: GameInput;
  /** Input fed to Bob while the boss door walks him through. */
  private scripted!: ActionState;
  private player!: Player;
  private worldHeight!: number;
  private readout?: Phaser.GameObjects.Text;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private hud!: Hud;
  private fx!: Feedback;

  private sections!: Section[];
  private section!: number;
  private bossRoom!: number;
  private respawnAt!: RespawnPoint;
  private checkpoints!: Checkpoint[];
  private door?: BossDoor;

  private mapEnemies!: (MapEnemy & { section: number })[];
  /** Live enemies and pickups of the current section; stepped on the fixed logic tick. */
  private enemies!: Phaser.GameObjects.Group;
  private pickups!: Phaser.GameObjects.Group;

  private boss?: Boss;
  private bossHealthBar?: BossHealthBar;

  constructor() {
    super('Stage');
  }

  init(data: { stage?: StageId }): void {
    this.def = STAGES[data.stage ?? DEFAULT_STAGE];
    this.scripted = new ActionState();
    this.readout = undefined;
    this.section = 0;
    this.bossRoom = bossRoomIndex(this.def);
    this.checkpoints = [];
    this.door = undefined;
    this.boss = undefined;
    this.bossHealthBar = undefined;
  }

  create(): void {
    this.fx = new Feedback(this);
    const parsed = parseMap(this.def.map);
    this.sections = sectionsFromTiles(this.def.sections, TILE);
    this.worldHeight = parsed.rows * TILE;
    this.respawnAt = { ...parsed.spawn, section: Math.max(0, sectionOf(this.sections, parsed.spawn.x, parsed.spawn.y)) };

    const map = this.make.tilemap({ data: parsed.tiles, tileWidth: TILE, tileHeight: TILE });
    const key = this.def.tileset;
    const tileset = map.addTilesetImage(key, key, TILE, TILE, 0, 0);
    if (!tileset) throw new Error('tileset missing');
    const layer = map.createLayer(0, tileset, 0, 0);
    if (!layer) throw new Error('tile layer missing');
    this.layer = layer;
    layer.setCollision([T.solid]);
    layer.forEachTile((tile) => {
      if (tile.index === T.platform) tile.setCollision(false, false, true, false);
    });

    for (const o of parsed.objects) {
      if (o.kind === 'checkpoint') this.checkpoints.push(new Checkpoint(this, o.x, o.y));
      else this.door = new BossDoor(this, o.x, o.y);
    }

    this.physics.world.setBounds(0, 0, parsed.cols * TILE, this.worldHeight);
    this.player = new Player(this, this.respawnAt.x, this.respawnAt.y);
    this.physics.add.collider(this.player, layer);
    if (this.door) this.physics.add.collider(this.player, this.door);
    this.player.solidAt = (x, y) => this.layer.getTileAtWorldXY(x, y)?.index === T.solid;
    this.player.on('deathDone', () => this.afterDeath());
    this.player.on('hurt', () => this.fx.play('bobHurt'));
    this.player.on('died', () => this.fx.play('bobDeath'));
    this.player.on('landed', (x: number, y: number) => {
      playOnce(this, 'fx_land_dust', x, y - 8, 20);
      this.fx.play('land');
    });
    this.player.arsenal = newArsenal(this.registry.get(OWNED_WEAPONS) ?? []);
    this.player.applyWeaponTint();
    this.hud = new Hud(this);

    this.mapEnemies = parsed.enemies.map((e) => ({ ...e, section: sectionOf(this.sections, e.x, e.y) }));
    this.enemies = this.add.group();
    this.pickups = this.add.group();
    this.physics.add.collider(this.enemies, layer, undefined, (e) => (e as Enemy).solid, this);
    this.physics.add.collider(this.pickups, layer);
    const isEnemy = (o: unknown): o is Enemy => o instanceof Enemy;
    this.physics.add.overlap(this.player.shots, this.enemies, (a, b) => {
      const [enemy, shot] = pick(a, b, isEnemy);
      this.shotHits(shot as Projectile, enemy);
    });
    this.physics.add.overlap(this.player, this.enemies, (a, b) => this.touchEnemy(pick(a, b, isEnemy)[0]));
    this.physics.add.overlap(this.player.specials, this.enemies, (a, b) => {
      const [enemy, orb] = pick(a, b, isEnemy) as [Enemy, GcOrb];
      // the orb passes through, hitting each enemy once
      if (orb.active && enemy.active && orb.firstHit(enemy)) enemy.hurt(orb.damage);
    });
    this.physics.add.overlap(this.player, this.pickups, (a, b) =>
      this.collect(pick(a, b, (o): o is Pickup => o instanceof Pickup)[0]),
    );

    this.enterSection(this.respawnAt.section, true);

    // Boss spawns when the door shuts behind Bob
    this.events.once('bossIntro', () => this.spawnBoss());
    this.events.on('bossHurt', () => this.fx.play('bossHit'));
    this.events.once('bossDefeated', () => {
      this.fx.play('bossDefeated');
      this.onBossDefeated();
    });

    this.controls = new GameInput(this);
    if (import.meta.env.DEV) this.devKeys();

    // Game logic counts frames, so it runs on the fixed 60 Hz physics step rather than on
    // every display refresh (which is 120-240 Hz on many monitors).
    const world = this.physics.world;
    world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, this.tick, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.tick, this);
      for (const e of RUN_EVENTS) this.events.off(e);
      this.fx.shutdown();
    });
  }

  /** One fixed logic step, right after each physics step. */
  private tick(): void {
    const p = this.player;
    let input = this.controls.poll();
    if (this.door?.busy) {
      // the door walks Bob through; the buster stays quiet
      this.scripted.update(new Set<Action>(this.door.walkThrough ? ['right'] : []));
      input = this.scripted;
      p.buster.charge = 0;
    }
    p.step(input);
    for (const e of this.enemies.getChildren() as Enemy[]) e.step();
    for (const k of [...this.pickups.getChildren()] as Pickup[]) k.step();
    if (this.boss) {
      this.boss.step();
      this.bossHealthBar?.update(this.boss);
    }

    if (!p.isDead) {
      const b = p.body;
      const box = new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
      if (b.bottom > this.worldHeight + 8) p.fallOut();
      // spikes: any spike tile under the bottom strip of the hitbox
      else if (this.layer.getTilesWithinWorldXY(b.x, b.bottom - 4, b.width, 4).some((t) => t.index === T.spike)) {
        p.touchSpikes();
      }
      for (const c of this.checkpoints) {
        if (c.check(box)) this.respawnAt = { ...c.spot, section: this.section };
      }
      if (this.door?.step(box) === 'shut') this.events.emit('bossIntro');
      const next = sectionAt(this.sections, b.center.x, b.center.y, this.section);
      if (next !== this.section) this.enterSection(next, false);
    }
    const h = p.health;
    const a = p.arsenal;
    const gauge = a.current === 'buster' ? null : { energy: a.energy[a.current], max: WEAPON_MAX_ENERGY, color: WEAPONS[a.current].color };
    this.hud.update(h.hp, h.max, h.lives, gauge);
  }

  /**
   * Switch the camera to section `i` and swap the enemies. `instant` (spawn, respawn) snaps;
   * otherwise the camera pans over while the game is frozen.
   */
  private enterSection(i: number, instant: boolean): void {
    const s = this.sections[i]!;
    this.section = i;
    this.spawnEnemies(i);
    const cam = this.cameras.main;
    const attach = () => {
      cam.setBounds(s.x, s.y, s.w, s.h);
      cam.startFollow(this.player, true, 1, 1, 0, CAMERA_LOOK_UP);
    };
    if (instant) {
      attach();
      return;
    }
    const target = cameraScroll(s, { w: cam.width, h: cam.height }, { x: this.player.x, y: this.player.y - CAMERA_LOOK_UP });
    cam.stopFollow();
    cam.removeBounds();
    this.fx.hold('section');
    this.tweens.add({
      targets: cam,
      scrollX: target.x,
      scrollY: target.y,
      duration: TRANSITION_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        attach();
        this.fx.release('section');
      },
    });
  }

  /** The current section's enemies, fresh (they come back each time Bob re-enters). */
  private spawnEnemies(section: number): void {
    this.enemies.clear(true, true);
    this.pickups.clear(true, true);
    const world: EnemyWorld = {
      floorAt: (x, y) => {
        const t = this.layer.getTileAtWorldXY(x, y);
        return !!t && (t.index === T.solid || t.index === T.platform);
      },
      bob: () => (this.player.isDead ? null : { x: this.player.body.center.x, y: this.player.body.center.y }),
    };
    for (const m of this.mapEnemies) {
      if (m.section !== section) continue;
      const e = createEnemy(m.kind, this, m.x, m.y, world);
      e.once('destroyed', (x: number, y: number) => this.dropFrom(x, y));
      this.enemies.add(e);
    }
  }

  private shotHits(shot: Projectile, enemy: Enemy): void {
    if (!shot.active || !enemy.active) return;
    const killed = enemy.hurt(shot.damage);
    if (killed) this.fx.play('enemyKilled');
    playOnce(this, shot.level === 3 ? 'fx_compiler_hit' : 'fx_hit', shot.x, shot.y, 20);
    // charged shots (level 2+) pass through enemies they destroy
    if (!(killed && shot.level >= 2)) shot.disableBody(true, true);
  }

  private touchEnemy(enemy: Enemy): void {
    if (enemy.active && !this.player.isDead) this.player.takeHit(enemy.stats.contact, enemy.body.center.x);
  }

  private dropFrom(x: number, y: number): void {
    const kind = rollDrop(Math.random());
    if (kind) this.pickups.add(new Pickup(this, x, y, kind));
  }

  private collect(item: Pickup): void {
    if (!item.active || this.player.isDead) return;
    const h = this.player.health;
    switch (item.kind) {
      case 'healthSmall':
      case 'healthLarge':
        heal(h, PICKUPS[item.kind].amount);
        break;
      case 'life':
        h.lives = Math.min(MAX_LIVES, h.lives + 1);
        break;
      default:
        refill(this.player.arsenal, item.amount);
    }
    item.destroy();
  }

  /** Bob back at the last checkpoint (or the stage start), boss door closed again. */
  private respawnBob(): void {
    const r = this.respawnAt;
    this.player.respawn(r.x, r.y);
    if (this.door && this.door.state !== 'closed') this.door.reset();
    // Restart the boss encounter if Bob died in the boss room
    if (this.boss && !this.boss.active) {
      // boss was already defeated — nothing to reset
    } else if (this.boss && this.boss.phase !== 'dead') {
      this.boss.reset();
    }
    this.enterSection(r.section, true);
  }

  private spawnBoss(): void {
    if (this.boss) return; // already spawned (shouldn't happen, but be safe)
    // centre of the boss room, feet on its floor (the bottom two rows are ground)
    const room = this.sections[this.bossRoom]!;
    const boss = new MemoryLeak(
      this,
      room.x + room.w / 2,
      room.y + room.h - 2 * TILE,
      this.worldHeight,
      () => (this.player.isDead ? null : { x: this.player.body.center.x, y: this.player.body.center.y }),
    );
    this.boss = boss;
    // Bob's shots hit the boss (pairs sorted by type: the old version disabled the boss itself)
    const isBoss = (o: unknown): o is MemoryLeak => o === boss;
    this.physics.add.overlap(this.player.shots, boss, (a, b) => {
      const shot = pick(a, b, isBoss)[1] as Projectile;
      if (!shot.active || !boss.active) return;
      const killed = boss.hurt(damageFor(this.def.boss, shot.weapon, shot.damage));
      playOnce(this, shot.level === 3 ? 'fx_compiler_hit' : 'fx_hit', shot.x, shot.y, 20);
      if (!(killed && shot.level >= 2)) shot.disableBody(true, true);
    });
    // Garbage Collector orbs: hit the boss once each, swallow goo
    const isOrb = (o: unknown): o is GcOrb => o instanceof GcOrb;
    this.physics.add.overlap(this.player.specials, boss, (a, b) => {
      const orb = pick(a, b, isOrb)[0];
      if (orb.active && boss.active && orb.firstHit(boss)) boss.hurt(damageFor(this.def.boss, orb.weapon, orb.damage));
    });
    this.physics.add.overlap(this.player.specials, boss.gooGroup, (a, b) => {
      const goo = pick(a, b, isOrb)[1] as { active: boolean; deactivate(): void };
      if (goo.active) goo.deactivate();
    });
    // Goo blobs and puddles hurt Bob
    const isBob = (o: unknown): o is Player => o === this.player;
    this.physics.add.overlap(this.player, boss.gooGroup, (a, b) => {
      if (this.player.isDead) return;
      const goo = pick(a, b, isBob)[1] as Parameters<typeof MemoryLeak.gooDamage>[0];
      this.player.takeHit(MemoryLeak.gooDamage(goo), goo.body.center.x);
    });
    // Boss body hurts Bob on contact
    this.physics.add.overlap(this.player, boss, () => {
      if (!this.player.isDead && boss.phase === 'fight') {
        this.player.takeHit(MEMORY_LEAK_CONTACT, boss.body.center.x);
      }
    });
    // Goo collides with the tile layer so it lands on the floor
    this.physics.add.collider(boss.gooGroup, this.layer, undefined, (g) => !(g as unknown as { isPuddle: boolean }).isPuddle, this);
    boss.setArena(room.x, room.x + room.w);
    this.bossHealthBar = new BossHealthBar(this, 'MEMORY LEAK');
    boss.startIntro();
  }

  private onBossDefeated(): void {
    this.bossHealthBar?.destroy();
    this.bossHealthBar = undefined;
    this.events.emit('bossRoomUnlocked');
    // after the explosion: the weapon-get screen, which then returns to the stage (T13: select)
    const weapon = BOSS_WEAPON[this.def.boss];
    const stage = { stage: this.def.id };
    this.time.delayedCall(2500, () =>
      weapon ? this.scene.start('WeaponGet', { weapon, next: 'Stage', nextData: stage }) : this.scene.restart(stage),
    );
  }

  /** Death animation over: spend a life and respawn. */
  private afterDeath(): void {
    const result = loseLife(this.player.health);
    this.respawnBob();
    if (result === 'gameOver') {
      this.events.emit('gameOver');
      const cam = this.cameras.main;
      const text = this.add
        .text(cam.width / 2, cam.height / 2, 'GAME OVER', { fontFamily: 'monospace', fontSize: '16px', color: '#da1e28' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(100);
      this.time.delayedCall(2000, () => text.destroy());
    }
  }

  update(): void {
    if (!this.readout) return;
    const p = this.player;
    const b = p.body;
    const m = p.motion;
    this.readout.setText(
      `${m.state} f${m.stateFrames}\nvx ${b.velocity.x.toFixed(0)} vy ${b.velocity.y.toFixed(0)}\n` +
        `ground ${b.blocked.down ? 'Y' : 'n'} wall ${b.blocked.left ? 'L' : b.blocked.right ? 'R' : '-'} coyote ${m.coyote}\n` +
        `hp ${p.health.hp} inv ${p.health.invuln} lives ${p.health.lives}\n` +
        `armor a${p.armor} airdash ${m.airDashesUsed}/${m.airDashes}\n` +
        `section ${this.section} door ${this.door?.state ?? '-'}`,
    );
  }

  /** Dev build only (they would clash with rebound controls in the real game). */
  private devKeys(): void {
    const kb = this.input.keyboard!;
    kb.on('keydown-R', () => !this.player.isDead && this.respawnBob());
    kb.on('keydown-F2', () => this.toggleDebug());
    kb.on('keydown-H', () => this.player.takeHit(4, this.player.body.center.x + this.player.motion.facing * 16));
    kb.on('keydown-G', () => grant(this.player.arsenal, 'garbageCollector'));
    const parts: [string, number][] = [
      ['ONE', ARMOR_BITS.head],
      ['TWO', ARMOR_BITS.arm],
      ['THREE', ARMOR_BITS.body],
      ['FOUR', ARMOR_BITS.legs],
    ];
    for (const [key, bit] of parts) kb.on(`keydown-${key}`, () => (this.player.armor ^= bit));
  }

  private toggleDebug(): void {
    const world = this.physics.world;
    if (this.readout) {
      this.readout.destroy();
      this.readout = undefined;
      world.debugGraphic?.clear();
      world.drawDebug = false;
      return;
    }
    if (!world.debugGraphic) world.createDebugGraphic();
    world.drawDebug = true;
    this.readout = this.add
      .text(28, 4, '', { fontFamily: 'monospace', fontSize: '8px', color: '#f1c21b' })
      .setScrollFactor(0)
      .setDepth(100);
  }
}
