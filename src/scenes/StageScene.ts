import Phaser from 'phaser';
import { ARMOR_BITS, TILE } from '../data/assets';
import { MAX_LIVES, PICKUPS, rollDrop } from '../data/drops';
import { BossDoor } from '../entities/BossDoor';
import { Checkpoint } from '../entities/Checkpoint';
import { Enemy, type EnemyWorld } from '../entities/Enemy';
import { playOnce } from '../entities/effects';
import { createEnemy } from '../entities/enemies';
import { Pickup } from '../entities/Pickup';
import type { Projectile } from '../entities/Projectile';
import { Player } from '../entities/Player';
import { type MapEnemy, parseMap, T } from '../stages/map';
import { TEST_MAP, TEST_SECTIONS } from '../stages/test';
import { type Action, ActionState } from '../systems/actions';
import { cameraScroll, type Section, sectionAt, sectionOf, sectionsFromTiles } from '../systems/camera';
import { heal, loseLife } from '../systems/damage';
import { GameInput } from '../systems/input';
import { Hud } from '../ui/Hud';

/** Camera looks this far above Bob's feet, so he sits slightly below screen center. */
const CAMERA_LOOK_UP = 24;
/** Camera pan between sections; the game freezes meanwhile, like the genre. */
const TRANSITION_MS = 450;

interface RespawnPoint {
  x: number;
  y: number;
  section: number;
}

/**
 * A playable stage built from an ASCII map and its camera sections (for now: the test map).
 * Dev keys: R back to the respawn point, F2 hitboxes + state readout, 1-4 armor parts
 * (4 = Turbo Boots: air dash), H take a 4-point hit from the front.
 * Emits `bossIntro` when the boss door shuts behind Bob, `gameOver` on the last life.
 */
export class StageScene extends Phaser.Scene {
  private controls!: GameInput;
  /** Input fed to Bob while the boss door walks him through. */
  private readonly scripted = new ActionState();
  private player!: Player;
  private worldHeight = 0;
  private readout?: Phaser.GameObjects.Text;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private hud!: Hud;

  private sections: Section[] = [];
  private section = 0;
  private respawnAt: RespawnPoint = { x: 0, y: 0, section: 0 };
  private checkpoints: Checkpoint[] = [];
  private door?: BossDoor;

  private mapEnemies: (MapEnemy & { section: number })[] = [];
  /** Live enemies and pickups of the current section; stepped on the fixed logic tick. */
  private enemies!: Phaser.GameObjects.Group;
  private pickups!: Phaser.GameObjects.Group;

  constructor() {
    super('Stage');
  }

  create(): void {
    const parsed = parseMap(TEST_MAP);
    this.sections = sectionsFromTiles(TEST_SECTIONS, TILE);
    this.worldHeight = parsed.rows * TILE;
    this.respawnAt = { ...parsed.spawn, section: Math.max(0, sectionOf(this.sections, parsed.spawn.x, parsed.spawn.y)) };
    this.checkpoints = [];
    this.door = undefined;

    const map = this.make.tilemap({ data: parsed.tiles, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles_test', 'tiles_test', TILE, TILE, 0, 0);
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
    this.player.on('deathDone', () => this.afterDeath());
    this.hud = new Hud(this);

    this.mapEnemies = parsed.enemies.map((e) => ({ ...e, section: sectionOf(this.sections, e.x, e.y) }));
    this.enemies = this.add.group();
    this.pickups = this.add.group();
    this.physics.add.collider(this.enemies, layer, undefined, (e) => (e as Enemy).solid, this);
    this.physics.add.collider(this.pickups, layer);
    // Arcade may hand group-vs-group pairs in either order, so sort them by type
    const pick = <A>(a: unknown, b: unknown, is: (o: unknown) => o is A): [A, unknown] => (is(a) ? [a, b] : [b as A, a]);
    const isEnemy = (o: unknown): o is Enemy => o instanceof Enemy;
    this.physics.add.overlap(this.player.shots, this.enemies, (a, b) => {
      const [enemy, shot] = pick(a, b, isEnemy);
      this.shotHits(shot as Projectile, enemy);
    });
    this.physics.add.overlap(this.player, this.enemies, (a, b) => this.touchEnemy(pick(a, b, isEnemy)[0]));
    this.physics.add.overlap(this.player, this.pickups, (a, b) =>
      this.collect(pick(a, b, (o): o is Pickup => o instanceof Pickup)[0]),
    );

    this.enterSection(this.respawnAt.section, true);

    this.controls = new GameInput(this);
    const kb = this.input.keyboard!;
    kb.on('keydown-R', () => !this.player.isDead && this.respawnBob());
    kb.on('keydown-F2', () => this.toggleDebug());
    kb.on('keydown-H', () => this.player.takeHit(4, this.player.body.center.x + this.player.motion.facing * 16));
    const parts: [string, number][] = [
      ['ONE', ARMOR_BITS.head],
      ['TWO', ARMOR_BITS.arm],
      ['THREE', ARMOR_BITS.body],
      ['FOUR', ARMOR_BITS.legs],
    ];
    for (const [key, bit] of parts) kb.on(`keydown-${key}`, () => (this.player.armor ^= bit));

    // Game logic counts frames, so it runs on the fixed 60 Hz physics step rather than on
    // every display refresh (which is 120-240 Hz on many monitors).
    const world = this.physics.world;
    world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, this.tick, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.tick, this));
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
    this.hud.update(h.hp, h.max, h.lives);
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
    this.physics.world.pause();
    this.tweens.add({
      targets: cam,
      scrollX: target.x,
      scrollY: target.y,
      duration: TRANSITION_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        attach();
        this.physics.world.resume();
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
        // weapon energy: the weapon system (T10) listens for this
        this.events.emit('weaponEnergy', item.amount);
    }
    item.destroy();
  }

  /** Bob back at the last checkpoint (or the stage start), boss door closed again. */
  private respawnBob(): void {
    const r = this.respawnAt;
    this.player.respawn(r.x, r.y);
    if (this.door && this.door.state !== 'closed') this.door.reset();
    this.enterSection(r.section, true);
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
