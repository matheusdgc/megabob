import Phaser from 'phaser';
import { ARMOR_BITS, TILE } from '../data/assets';
import { CONVEYOR_ANIM_FRAMES, CONVEYOR_SPEED } from '../data/tuning';
import { MAX_LIVES, type PickupKind, PICKUPS, rollDrop } from '../data/drops';
import { BossDoor } from '../entities/BossDoor';
import type { Boss } from '../entities/Boss';
import { createBoss } from '../entities/bosses';
import { Checkpoint } from '../entities/Checkpoint';
import { Enemy, type EnemyWorld } from '../entities/Enemy';
import { EnemyShot } from '../entities/EnemyShot';
import { MovingPlatform } from '../entities/MovingPlatform';
import { UpdateTerminal } from '../entities/UpdateTerminal';
import { hasPart, installPart, partEffects } from '../systems/upgrades';
import { addToRun, recordClear } from '../systems/save';
import { loopAnim, playOnce } from '../entities/effects';
import { Feedback } from '../entities/feedback';
import { GameAudio, loadMusic } from '../audio';
import type { SfxId } from '../data/sfx';
import type { MusicId } from '../data/music';
import { createEnemy } from '../entities/enemies';
import { Pickup } from '../entities/Pickup';
import type { Projectile } from '../entities/Projectile';
import { Player, type Special } from '../entities/Player';
import { skinTiles, solidFrames } from '../stages/autotile';
import { conveyorDir, conveyorUnder, isSolid, type EnemyKind, type MapEnemy, parseMap, T, terminalPart, vanishGroup } from '../stages/map';
import { vanishSolid, vanishState } from '../systems/vanish';
import { bossRoomIndex, DEFAULT_STAGE, type StageDef, type StageId, STAGES } from '../stages/stages';
import { type Action, ActionState } from '../systems/actions';
import { cameraScroll, type Section, sectionAt, sectionOf, sectionsFromTiles } from '../systems/camera';
import { heal, loseLife } from '../systems/damage';
import { gooTop, inGoo } from '../systems/goo';
import { GameInput } from '../systems/input';
import { grant, newArsenal, refill } from '../systems/weapons';
import { BOSS_WEAPON, damageFor, freezeFrames, WEAPON_MAX_ENERGY, WEAPONS } from '../data/weapons';
import { GcOrb } from '../entities/weapons/GarbageCollector';
import type { PauseData } from './PauseScene';
import { commitSave, getSave } from './progress';
import type { UpgradeData } from './UpgradeScene';
import { fadeTo, UI, uiText } from '../ui/text';
import { BossHealthBar } from '../ui/BossHealthBar';
import { Hud } from '../ui/Hud';

/**
 * Arcade may hand overlap pairs in either order (also sprite vs group), so callbacks sort
 * them by type: returns [the one matching `is`, the other].
 */
const pick = <A>(a: unknown, b: unknown, is: (o: unknown) => o is A): [A, unknown] => (is(a) ? [a, b] : [b as A, a]);

/** Camera looks this far above Bob's feet, so he sits slightly below screen center. */
const CAMERA_LOOK_UP = 24;
/** Body of the rising goo: the lower half of the hazard tile (deep goo and bubbles), repeated. */
const GOO_BODY_ROWS = 8;
/** How fast each parallax layer scrolls with the camera, far to near. */
const PARALLAX_SPEED = [0.15, 0.35, 0.6];
/** Camera pan between sections; the game freezes meanwhile, like the genre. */
const TRANSITION_MS = 450;

interface RespawnPoint {
  x: number;
  y: number;
  section: number;
}

/** Scene events that must not outlive one run of the stage (Phaser keeps them across restarts). */
const RUN_EVENTS = ['bossIntro', 'bossHurt', 'bossSfx', 'bossSummon', 'bossPhase', 'bossDefeated', 'bossRoomUnlocked', 'gameOver'] as const;

/**
 * A playable stage, built from its `StageDef` (map, camera sections, boss, tileset).
 * Start it with `scene.start('Stage', { stage })`; all per-run state is reset in `init()`.
 * Dev keys (dev build only): R back to the respawn point, F2 hitboxes + state readout (with fps), 1-4 armor
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
  /** The logical map (`T` values): collision, hazards and enemy queries read this, never tile frames. */
  private grid!: number[][];
  /** Conveyor tiles, animated on the logic tick. */
  private conveyors!: Phaser.Tilemaps.Tile[];
  private movers!: MovingPlatform[];
  private terminals!: UpdateTerminal[];
  private installing!: boolean;
  /** Items placed in the map (respawn with their section, like enemies). */
  private placedItems!: { kind: PickupKind; x: number; y: number }[];
  /** Hidden-passage tiles (the Debug Visor shows them). */
  private fakes!: Phaser.Tilemaps.Tile[];
  /** Placed items already collected this run (they do not come back). */
  private taken!: Set<string>;
  /** Vanishing-block tiles and their phase group. */
  private vanishing!: { tile: Phaser.Tilemaps.Tile; group: 0 | 1 | 2 }[];
  private ticks!: number;
  private hud!: Hud;
  private fx!: Feedback;
  /** Ticks during which the pause button is ignored (right after the menu closes). */
  private pauseLock!: number;
  /** The stage is ending (game over, exit, boss beaten): no more pausing. */
  private over!: boolean;
  /** This visit's enemies destroyed and fixed steps, not yet added to the run in the save. */
  private runKills!: number;
  private runFrames!: number;
  private audio!: GameAudio | null;
  private parallax!: Phaser.GameObjects.TileSprite[];
  /** Rising goo: its sprite, and frames since Bob entered its section. */
  private goo?: Phaser.GameObjects.TileSprite;
  private gooBody?: Phaser.GameObjects.TileSprite;
  private gooFrames!: number;

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
  private enemyShots!: Phaser.GameObjects.Group;

  private boss?: Boss;
  private bossHealthBar?: BossHealthBar;
  /** Overlaps and colliders tied to the current boss, removed with it. */
  private bossColliders!: Phaser.Physics.Arcade.Collider[];

  constructor() {
    super('Stage');
  }

  init(data: { stage?: StageId }): void {
    this.def = STAGES[data.stage ?? DEFAULT_STAGE];
    this.runKills = 0;
    this.runFrames = 0;
    this.scripted = new ActionState();
    this.readout = undefined;
    this.section = 0;
    this.bossRoom = bossRoomIndex(this.def);
    this.checkpoints = [];
    this.door = undefined;
    this.boss = undefined;
    this.bossHealthBar = undefined;
    this.bossColliders = [];
    this.goo = undefined;
    this.gooBody = undefined;
    this.gooFrames = 0;
    this.pauseLock = 0;
    this.over = false;
    this.conveyors = [];
    this.movers = [];
    this.terminals = [];
    this.installing = false;
    this.placedItems = [];
    this.fakes = [];
    this.vanishing = [];
    this.ticks = 0;
  }

  preload(): void {
    // the final boss leads straight into the credits: load their track now, so it starts on cue
    const after: MusicId[] = this.def.boss === 'techDebt' ? ['credits'] : [];
    loadMusic(this, [this.def.music, this.def.bossMusic, ...(this.def.bossMusic2 ? [this.def.bossMusic2] : []), ...after]);
  }

  create(): void {
    this.fx = new Feedback(this);
    this.audio = GameAudio.of(this.game);
    const parsed = parseMap(this.def.map);
    this.sections = sectionsFromTiles(this.def.sections, TILE);
    this.worldHeight = parsed.rows * TILE;
    this.respawnAt = { ...parsed.spawn, section: Math.max(0, sectionOf(this.sections, parsed.spawn.x, parsed.spawn.y)) };

    this.grid = parsed.tiles;
    const cam = this.cameras.main;
    if (this.def.background) cam.setBackgroundColor(this.def.background);
    this.parallax = (this.def.parallax ?? []).map((key, i) =>
      this.add.tileSprite(0, 0, cam.width, cam.height, key).setOrigin(0).setScrollFactor(0).setDepth(-10 + i),
    );
    const map = this.make.tilemap({ data: skinTiles(parsed.tiles, this.def.skin), tileWidth: TILE, tileHeight: TILE });
    const key = this.def.tileset;
    const tileset = map.addTilesetImage(key, key, TILE, TILE, 0, 0);
    if (!tileset) throw new Error('tileset missing');
    const layer = map.createLayer(0, tileset, 0, 0);
    if (!layer) throw new Error('tile layer missing');
    this.layer = layer;
    layer.setCollision(solidFrames(this.def.skin));
    layer.forEachTile((tile) => {
      const t = this.grid[tile.y]?.[tile.x];
      if (t === T.platform) tile.setCollision(false, false, true, false);
      const g = vanishGroup(t);
      if (g !== null) this.vanishing.push({ tile, group: g });
      if (t === T.fake) {
        tile.setCollision(false, false, false, false);
        this.fakes.push(tile);
      }
      if (conveyorDir(t) !== 0) {
        this.conveyors.push(tile);
        tile.flipX = conveyorDir(t) < 0;
      }
    });

    const goo = this.def.goo;
    if (goo) {
      const room = sectionsFromTiles(this.def.sections, TILE)[goo.section]!;
      // a churning surface (the hazard tile) over a flat body down past the section's bottom
      this.goo = this.add.tileSprite(room.x, gooTop(goo, 0), room.w, TILE, key, this.def.skin.hazard).setOrigin(0).setDepth(5);
      const tex = this.textures.get(key);
      const body = `goo_body_${this.def.skin.hazard}`;
      if (!tex.has(body)) {
        const f = tex.get(this.def.skin.hazard);
        tex.add(body, f.sourceIndex, f.cutX, f.cutY + TILE - GOO_BODY_ROWS, TILE, GOO_BODY_ROWS);
      }
      this.gooBody = this.add.tileSprite(room.x, gooTop(goo, 0) + TILE, room.w, room.h, key, body).setOrigin(0).setDepth(5);
    }

    const owned = getSave(this.registry).armor;
    for (const o of parsed.objects) {
      const part = terminalPart(o.kind);
      if (o.kind === 'checkpoint') this.checkpoints.push(new Checkpoint(this, o.x, o.y));
      else if (o.kind === 'bossDoor') this.door = new BossDoor(this, o.x, o.y);
      else if (part) this.terminals.push(new UpdateTerminal(this, o.x, o.y, part, hasPart(owned, part)));
      else this.placedItems.push({ kind: o.kind === 'itemLife' ? 'life' : 'healthLarge', x: o.x + 8, y: o.y });
    }

    this.physics.world.setBounds(0, 0, parsed.cols * TILE, this.worldHeight);
    this.player = new Player(this, this.respawnAt.x, this.respawnAt.y);
    // a Mutex Lock steers toward live enemies and a boss that can be hit
    this.player.lockTargets = () => {
      const out = (this.enemies.getChildren() as Enemy[]).filter((e) => e.active && e.body.enable).map((e) => e.body.center);
      const b = this.boss;
      if (b?.active && b.body.enable && b.phase === 'fight' && b.isTangible) out.push(b.body.center);
      return out;
    };
    this.physics.add.collider(this.player, layer);
    this.movers = (this.def.movers ?? []).map((m) => new MovingPlatform(this, m));
    if (this.movers.length) this.physics.add.collider(this.player, this.movers);
    if (this.door) this.physics.add.collider(this.player, this.door);
    this.player.solidAt = (x, y) => this.solidNow(x, y);
    this.player.on('deathDone', () => this.afterDeath());
    this.player.on('sfx', (id: SfxId) => this.sfx(id));
    this.player.on('hurt', () => {
      this.fx.play('bobHurt');
      this.sfx('hurt');
    });
    this.player.on('died', () => {
      this.flushRun(1);
      this.fx.play('bobDeath');
      this.audio?.music.stop();
      this.sfx('death');
    });
    this.player.on('dust', (key: string, x: number, y: number, facing: 1 | -1) => playOnce(this, key, x, y, 20).setFlipX(facing < 0));
    this.player.on('landed', (x: number, y: number) => {
      playOnce(this, 'fx_land_dust', x, y - 8, 20);
      this.fx.play('land');
      this.sfx('land');
    });
    const save = getSave(this.registry);
    this.player.arsenal = newArsenal(save.weapons);
    this.player.armor = save.armor;
    this.taken = new Set();
    this.player.applyWeaponTint();
    this.hud = new Hud(this);

    this.mapEnemies = parsed.enemies.map((e) => ({ ...e, section: sectionOf(this.sections, e.x, e.y) }));
    this.enemies = this.add.group();
    this.pickups = this.add.group();
    this.enemyShots = this.add.group();
    const isShot = (o: unknown): o is EnemyShot => o instanceof EnemyShot;
    const breakShot = (shot: EnemyShot) => {
      playOnce(this, 'fx_hit', shot.x, shot.y, 20);
      this.sfx('blockBreak');
      shot.destroy();
    };
    this.physics.add.collider(this.enemyShots, layer, (a, b) => breakShot(pick(a, b, isShot)[0]));
    // a blinking Bob lets enemy shots pass through, like contact damage
    this.physics.add.overlap(this.player, this.enemyShots, (a, b) => {
      const shot = pick(a, b, isShot)[0];
      if (shot.active && !this.player.isDead && this.player.takeHit(shot.damage, shot.x) !== 'ignored') breakShot(shot);
    });
    // the Garbage Collector swallows enemy projectiles
    this.physics.add.overlap(this.player.specials, this.enemyShots, (a, b) => pick(a, b, isShot)[0].destroy());
    this.physics.add.collider(this.enemies, layer, undefined, (e) => (e as Enemy).solid, this);
    this.physics.add.collider(this.pickups, layer);
    const isEnemy = (o: unknown): o is Enemy => o instanceof Enemy;
    this.physics.add.overlap(this.player.shots, this.enemies, (a, b) => {
      const [enemy, shot] = pick(a, b, isEnemy);
      this.shotHits(shot as Projectile, enemy);
    });
    this.physics.add.overlap(this.player, this.enemies, (a, b) => this.touchEnemy(pick(a, b, isEnemy)[0]));
    this.physics.add.overlap(this.player.specials, this.enemies, (a, b) => {
      const [enemy, special] = pick(a, b, isEnemy);
      this.hitWithSpecial(special as Special, enemy);
    });
    this.physics.add.overlap(this.player, this.pickups, (a, b) =>
      this.collect(pick(a, b, (o): o is Pickup => o instanceof Pickup)[0]),
    );

    this.enterSection(this.respawnAt.section, true);

    // A fresh boss spawns each time the door shuts behind Bob (Bob's death removes the old one)
    this.events.on('bossIntro', () => this.spawnBoss());
    this.events.on('bossSfx', (id: SfxId) => this.sfx(id));
    // a wall boss sends enemies out (two at a time at most)
    this.events.on('bossSummon', (kind: EnemyKind, x: number, y: number) => {
      if (this.player.isDead || this.enemies.countActive(true) >= 2) return;
      const e = createEnemy(kind, this, x, y, this.enemyWorld());
      e.once('destroyed', (ex: number, ey: number) => this.enemyDestroyed(ex, ey));
      this.enemies.add(e);
    });
    // a second boss phase: a big beat, then its own music
    this.events.on('bossPhase', () => {
      this.fx.play('bossDefeated');
      this.sfx('bossExplosion');
      if (this.def.bossMusic2) this.audio?.music.play(this.def.bossMusic2, 600);
    });
    this.events.on('bossHurt', () => {
      this.fx.play('bossHit');
      this.sfx('bossHit');
    });
    this.events.once('bossDefeated', () => {
      this.fx.play('bossDefeated');
      this.audio?.music.stop();
      this.sfx('bossExplosion');
      this.time.delayedCall(1200, () => this.audio?.sfx.jingle('bossDefeated'));
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
    this.showFakes();
    this.ready(true);
  }

  /** One fixed logic step, right after each physics step. */
  private tick(): void {
    const p = this.player;
    if (!this.over) this.runFrames++;
    let input = this.controls.poll();
    if (this.door?.busy) {
      // the door walks Bob through; the buster stays quiet
      this.scripted.update(new Set<Action>(this.door.walkThrough ? ['right'] : []));
      input = this.scripted;
      p.buster.charge = 0;
    }
    if (this.pauseLock > 0) this.pauseLock--;
    else if (input.justPressed('pause') && !p.isDead && !this.door?.busy && !this.over && !this.installing) {
      this.openPause();
      return;
    }
    // a conveyor under Bob's feet carries him (only while he stands on it)
    const b0 = p.body;
    p.step(input, b0.blocked.down ? conveyorUnder((x, y) => this.cellAt(x, y), b0.left, b0.right, b0.bottom) * CONVEYOR_SPEED : 0);
    for (const m of this.movers) m.step();
    this.stepVanishing();
    this.stopShotsAtThinWalls();
    if (++this.ticks % CONVEYOR_ANIM_FRAMES === 0 && this.conveyors.length) {
      const [a, b] = this.def.skin.conveyor;
      for (const t of this.conveyors) t.index = t.index === a ? b : a;
    }
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
      else if (this.touches(b.x, b.bottom - 4, b.width, 4, T.spike)) {
        p.touchSpikes();
      }
      for (const c of this.checkpoints) {
        if (c.check(box)) {
          this.respawnAt = { ...c.spot, section: this.section };
          this.sfx('checkpoint');
        }
      }
      for (const term of this.terminals) {
        if (!this.installing && term.touch(box)) {
          this.install(term);
          return;
        }
      }
      const doorWas = this.door?.state;
      if (this.door?.step(box) === 'shut') this.events.emit('bossIntro');
      if (doorWas !== this.door?.state && (this.door?.state === 'opening' || this.door?.state === 'closing')) this.sfx('door');
      const next = sectionAt(this.sections, b.center.x, b.center.y, this.section);
      if (next !== this.section) this.enterSection(next, false);
    }
    this.stepGoo();
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
    if (this.def.goo?.section === i) this.gooFrames = 0; // the flood starts over on every entry
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

  /**
   * A special-weapon shot meets an enemy or the boss: damage (weakness included for the boss),
   * the Mutex Lock's freeze with its padlock shell, then the shot stops unless it pierces.
   */
  private hitWithSpecial(special: Special, target: Enemy | Boss): void {
    if (!special.active || !target.active || !special.firstHit(target)) return;
    const isBoss = target === this.boss;
    const killed = target.hurt(isBoss ? damageFor(this.def.boss, special.weapon, special.damage) : special.damage);
    if (special.weapon === 'mutexLock' && !killed && target.freeze(freezeFrames(isBoss)) !== false) {
      this.lockShell(target, freezeFrames(isBoss));
      this.sfx('freeze');
    }
    if (!special.pierces) special.disableBody(true, true);
  }

  /** The padlock shell drawn over a frozen target, sized to it, gone when it thaws. */
  private lockShell(target: Enemy | Boss, frames: number): void {
    const b = target.body;
    const shell = this.add.sprite(b.center.x, b.center.y, 'fx_mutex_shell', 0).setDepth(3).setAlpha(0.85);
    shell.setScale(Math.max(1, Math.max(b.width, b.height) / 26));
    shell.play(loopAnim(this, 'fx_mutex_shell', [0, 1], 4));
    const follow = () => {
      if (!target.active || !target.isFrozen) {
        this.events.off(Phaser.Scenes.Events.UPDATE, follow);
        shell.destroy();
        return;
      }
      shell.setPosition(target.body.center.x, target.body.center.y);
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, follow);
    this.time.delayedCall((frames / 60) * 1000 + 100, follow);
  }

  /** Solid right now: like isSolid, but a vanishing block counts only while it is there. */
  private solidNow(x: number, y: number): boolean {
    const t = this.cellAt(x, y);
    const g = vanishGroup(t);
    return g === null ? isSolid(t) : vanishSolid(g, this.ticks);
  }

  /** Vanishing blocks follow the shared clock: solid, flickering (the warning), gone. */
  private stepVanishing(): void {
    if (!this.vanishing.length) return;
    const [solid, flicker] = this.def.skin.vanish;
    for (const v of this.vanishing) {
      const state = vanishState(v.group, this.ticks);
      const on = state !== 'gone';
      if (v.tile.collides !== on) {
        v.tile.setCollision(on, on, on, on);
        v.tile.setVisible(on);
      }
      if (on) v.tile.index = state === 'flicker' && Math.floor(this.ticks / 4) % 2 === 0 ? flicker : solid;
    }
  }

  /** Thin walls stop every player shot except the Null Pointer, which phases through. */
  private stopShotsAtThinWalls(): void {
    for (const s of [...this.player.shots.getChildren(), ...this.player.specials.getChildren()] as (Projectile | Special)[]) {
      if (!s.active || s.weapon === 'nullPointer' || this.cellAt(s.x, s.y) !== T.thin) continue;
      playOnce(this, 'fx_hit', s.x, s.y, 20);
      s.disableBody(true, true);
    }
  }

  /** The Debug Visor shows hidden passages as faint walls. */
  private showFakes(): void {
    const visor = partEffects(this.player.armor).visor;
    for (const t of this.fakes) t.setAlpha(visor ? 0.45 : 1);
  }

  /**
   * An Update Terminal: the stage freezes while it installs, the "upgrade installed" screen
   * shows, and the part is saved (a safe boundary: nothing is in motion).
   */
  private install(term: UpdateTerminal): void {
    if (this.installing || this.player.isDead || this.over) return;
    this.installing = true;
    this.player.body.stop();
    this.fx.hold('upgrade');
    this.audio?.mixer.duck(-12);
    this.sfx('checkpoint');
    this.time.delayedCall(1100, () => {
      term.done();
      const saved = installPart(getSave(this.registry), term.part);
      const armor = saved.armor;
      commitSave(this.registry, saved);
      this.player.armor = armor;
      this.showFakes();
      const data: UpgradeData = {
        part: term.part,
        armor,
        onClose: () => {
          this.audio?.mixer.unduck();
          this.controls.destroy();
          this.controls = new GameInput(this);
          this.scene.resume();
          this.installing = false;
          this.pauseLock = 10;
          this.fx.release('upgrade');
        },
      };
      this.scene.pause();
      this.scene.launch('Upgrade', data);
    });
  }

  /** Logical cell (`T`) at a world point; outside the map is empty. */
  private cellAt(x: number, y: number): number {
    return this.grid[Math.floor(y / TILE)]?.[Math.floor(x / TILE)] ?? T.empty;
  }

  /** Does the rectangle overlap any cell of `kind`? */
  private touches(x: number, y: number, w: number, h: number, kind: number): boolean {
    for (let r = Math.floor(y / TILE); r <= Math.floor((y + h - 0.01) / TILE); r++) {
      for (let c = Math.floor(x / TILE); c <= Math.floor((x + w - 0.01) / TILE); c++) if (this.grid[r]?.[c] === kind) return true;
    }
    return false;
  }

  /** What enemies may ask the stage about the world. */
  private enemyWorld(): EnemyWorld {
    return {
      floorAt: (x, y) => this.solidNow(x, y) || this.cellAt(x, y) === T.platform,
      bob: () => (this.player.isDead ? null : { x: this.player.body.center.x, y: this.player.body.center.y }),
      shoot: (kind, x, y, vx, vy) => {
        this.enemyShots.add(new EnemyShot(this, kind, x, y, vx, vy));
        this.sfx(kind === 'block' ? 'throw' : kind === 'cursor' ? 'glitch' : kind === 'card' ? 'cardShot' : 'clockShot');
      },
    };
  }

  /** The current section's enemies, fresh (they come back each time Bob re-enters). */
  private spawnEnemies(section: number): void {
    this.enemies.clear(true, true);
    this.enemyShots.clear(true, true);
    this.pickups.clear(true, true);
    const world = this.enemyWorld();
    for (const it of this.placedItems) {
      if (sectionOf(this.sections, it.x, it.y) !== section || this.taken.has(`${it.x},${it.y}`)) continue;
      this.pickups.add(new Pickup(this, it.x, it.y, it.kind, true).setData('spot', `${it.x},${it.y}`));
    }
    for (const m of this.mapEnemies) {
      if (m.section !== section) continue;
      const e = createEnemy(m.kind, this, m.x, m.y, world);
      e.once('destroyed', (x: number, y: number) => this.enemyDestroyed(x, y));
      this.enemies.add(e);
    }
  }

  private shotHits(shot: Projectile, enemy: Enemy): void {
    if (!shot.active || !enemy.active) return;
    // a shield in front bounces basic shots; charged ones (level 2+) break through
    if (shot.level < 2 && enemy.blocks(shot.x)) {
      playOnce(this, 'fx_deflect', shot.x, shot.y, 20);
      this.sfx('shieldBlock');
      shot.disableBody(true, true);
      return;
    }
    const killed = enemy.hurt(shot.damage);
    if (killed) this.fx.play('enemyKilled');
    this.sfx(killed ? 'explosion' : 'enemyHit');
    playOnce(this, shot.level === 3 ? 'fx_compiler_hit' : 'fx_hit', shot.x, shot.y, 20);
    // charged shots (level 2+) pass through enemies they destroy
    if (!(killed && shot.level >= 2)) shot.disableBody(true, true);
  }

  private touchEnemy(enemy: Enemy): void {
    if (enemy.active && !enemy.isFrozen && !this.player.isDead) this.player.takeHit(enemy.stats.contact, enemy.body.center.x);
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
    if (item.placed) this.taken.add(item.getData('spot') as string);
    item.destroy();
    this.sfx('pickup');
  }

  /** Bob back at the last checkpoint (or the stage start), boss door closed again. */
  private respawnBob(): void {
    const r = this.respawnAt;
    this.player.respawn(r.x, r.y);
    if (this.door && this.door.state !== 'closed') this.door.reset();
    // like the genre: the fight starts over from scratch next time the door shuts
    if (this.boss && this.boss.phase !== 'dead') this.despawnBoss();
    this.ready(false);
    this.enterSection(r.section, true);
  }

  private sfx(id: SfxId): void {
    this.audio?.sfx.play(id);
  }

  /** Remove the boss, its goo, its health bar and every overlap tied to it. */
  private despawnBoss(): void {
    for (const c of this.bossColliders) c.destroy();
    this.bossColliders = [];
    this.bossHealthBar?.destroy();
    this.bossHealthBar = undefined;
    this.boss?.destroy();
    this.boss = undefined;
  }

  private spawnBoss(): void {
    if (this.boss) return; // already spawned (shouldn't happen, but be safe)
    // a hard cut: the alarm, then the boss theme
    this.audio?.music.stop();
    const alarm = this.audio?.sfx.jingle('warning') ?? 0;
    this.time.delayedCall(alarm * 1000, () => {
      if (this.boss?.phase !== 'dead' && !this.player.isDead) this.audio?.music.play(this.def.bossMusic);
    });
    // centre of the boss room, feet on its floor (the bottom two rows are ground)
    const room = this.sections[this.bossRoom]!;
    const bob = () => (this.player.isDead ? null : { x: this.player.body.center.x, y: this.player.body.center.y });
    const boss = createBoss(this.def.boss, this, room.x + room.w / 2, room.y + room.h - 2 * TILE, this.worldHeight, bob);
    this.boss = boss;
    boss.setArena(room.x, room.x + room.w);
    const track = (c: Phaser.Physics.Arcade.Collider) => this.bossColliders.push(c);
    for (const w of boss.walls) {
      track(this.physics.add.collider(this.player, w));
      track(this.physics.add.collider(this.enemies, w));
    }
    const isBoss = (o: unknown): o is Boss => o === boss;
    // Bob's shots hit the boss (pairs sorted by type: the old version disabled the boss itself)
    track(this.physics.add.overlap(this.player.shots, boss, (a, b) => {
      const shot = pick(a, b, isBoss)[1] as Projectile;
      if (!shot.active || !boss.active) return;
      const killed = boss.hurt(damageFor(this.def.boss, shot.weapon, shot.damage));
      playOnce(this, shot.level === 3 ? 'fx_compiler_hit' : 'fx_hit', shot.x, shot.y, 20);
      if (!(killed && shot.level >= 2)) shot.disableBody(true, true);
    }));
    // special weapons: each projectile hits the boss once (see hitWithSpecial)
    track(this.physics.add.overlap(this.player.specials, boss, (a, b) => this.hitWithSpecial(pick(a, b, isBoss)[1] as Special, boss)));
    // the boss's own projectiles: they hurt Bob, the Garbage Collector eats them, some land
    const isBob = (o: unknown): o is Player => o === this.player;
    const isOrb = (o: unknown): o is GcOrb => o instanceof GcOrb;
    for (const h of boss.hazards) {
      track(this.physics.add.overlap(this.player, h.group, (a, b) => {
        const child = pick(a, b, isBob)[1] as Phaser.Physics.Arcade.Sprite;
        const damage = child.active ? h.damage(child) : 0; // 0: harmless right now (a clone still waiting)
        if (!this.player.isDead && damage > 0) this.player.takeHit(damage, child.x);
      }));
      track(this.physics.add.overlap(this.player.specials, h.group, (a, b) => {
        const [orb, child] = pick(a, b, isOrb);
        if (orb.active && (child as Phaser.GameObjects.GameObject).active) h.swallow(child as Phaser.GameObjects.GameObject);
      }, (a, b) => isOrb(a) || isOrb(b)));
      if (h.collidesWithTiles) track(this.physics.add.collider(h.group, this.layer, undefined, (c) => h.collidesWithTiles!(c as Phaser.GameObjects.GameObject), this));
    }
    // the boss's body hurts Bob on contact (not while the Mutex Lock holds it)
    track(this.physics.add.overlap(this.player, boss, () => {
      if (!this.player.isDead && boss.phase === 'fight' && !boss.isFrozen && boss.isTangible) this.player.takeHit(boss.contactDamage, boss.body.center.x);
    }));
    this.bossHealthBar = new BossHealthBar(this, this.def.name, partEffects(this.player.armor).visor);
    boss.startIntro();
  }

  private onBossDefeated(): void {
    this.bossHealthBar?.destroy();
    this.bossHealthBar = undefined;
    this.events.emit('bossRoomUnlocked');
    this.over = true;
    this.flushRun();
    // its minions go with it (they do not count as destroyed: the stage is over)
    for (const e of [...this.enemies.getChildren()] as Enemy[]) e.hurt(999);
    if (this.def.boss === 'techDebt') {
      // the end: the game is cleared, then the credits
      commitSave(this.registry, recordClear(getSave(this.registry), 'techDebt'));
      this.time.delayedCall(4500, () => fadeTo(this, 'Credits', undefined, 1200));
      return;
    }
    // after the explosion: the weapon-get screen (it records the clear), then the stage select
    const weapon = BOSS_WEAPON[this.def.boss];
    const boss = this.def.boss;
    this.time.delayedCall(3500, () =>
      weapon ? this.scene.start('WeaponGet', { weapon, boss, next: 'StageSelect' }) : fadeTo(this, 'StageSelect'),
    );
  }

  /** An enemy Bob destroyed: it counts for the records, and it may drop an item. */
  private enemyDestroyed(x: number, y: number): void {
    if (!this.over) this.runKills++;
    this.dropFrom(x, y);
  }

  /** Add this visit's counters (and a death) to the run in the save, which is written now. */
  private flushRun(deaths = 0): void {
    if (!deaths && !this.runKills && !this.runFrames) return;
    commitSave(this.registry, addToRun(getSave(this.registry), { deaths, kills: this.runKills, frames: this.runFrames }));
    this.runKills = 0;
    this.runFrames = 0;
  }

  /** Death animation over: spend a life and respawn. */
  private afterDeath(): void {
    if (loseLife(this.player.health) === 'respawn') {
      this.respawnBob();
      return;
    }
    // last life: GAME OVER, then back to the stage select (weapons won are kept in the save)
    this.over = true;
    this.flushRun();
    this.events.emit('gameOver');
    this.fx.hold('gameOver');
    const cam = this.cameras.main;
    uiText(this, cam.width / 2, cam.height / 2, 'GAME OVER', { size: 16, color: UI.danger, origin: 0.5 }).setScrollFactor(0).setDepth(100);
    const len = this.audio?.sfx.jingle('gameOver') ?? 2;
    this.time.delayedCall(Math.max(2500, len * 1000 + 500), () => fadeTo(this, 'StageSelect'));
  }

  /**
   * "READY": the stage holds still for a moment, blinking the word, before play (and the music)
   * starts. On the stage's first start it also plays the stage jingle.
   */
  private ready(first: boolean): void {
    this.fx.hold('ready');
    this.audio?.music.stop();
    const cam = this.cameras.main;
    const word = uiText(this, cam.width / 2, cam.height / 2 - 16, 'READY', { size: 12, origin: 0.5 }).setScrollFactor(0).setDepth(100);
    const ms = first ? Math.max(1400, (this.audio?.sfx.jingle('stageStart') ?? 0) * 1000) : 1000;
    // measure the boss tracks now, one per frame, so their entrance never hitches (T22)
    if (first) {
      const later = [this.def.bossMusic, ...(this.def.bossMusic2 ? [this.def.bossMusic2] : [])];
      later.forEach((id, i) => this.time.delayedCall(200 + i * 100, () => this.audio?.music.prepare(id)));
    }
    this.tweens.add({ targets: word, alpha: 0, duration: 120, yoyo: true, repeat: Math.floor(ms / 240) - 1 });
    this.time.delayedCall(ms, () => {
      word.destroy();
      this.fx.release('ready');
      this.audio?.music.play(this.def.music, first ? 0 : 200);
    });
  }

  /** Freeze the stage and open the pause menu over it. */
  private openPause(): void {
    this.audio?.mixer.duck(-10);
    this.sfx('weaponSwitch');
    const data: PauseData = {
      arsenal: this.player.arsenal,
      armor: this.player.armor,
      onClose: (exit) => {
        this.audio?.mixer.unduck();
        this.controls.destroy();
        this.controls = new GameInput(this);
        this.scene.resume();
        this.pauseLock = 10; // a held or repeating pause key must not reopen it at once
        this.player.applyWeaponTint();
        if (exit) {
          this.over = true;
          this.flushRun();
          this.audio?.music.stop(300);
          fadeTo(this, 'StageSelect');
        }
      },
    };
    this.scene.pause();
    this.scene.launch('Pause', data);
  }


  /** The goo rises while Bob is in its section, and swallows him if it catches up. */
  private stepGoo(): void {
    const def = this.def.goo;
    if (!def || !this.goo || this.section !== def.section || this.player.isDead) return;
    this.gooFrames++;
    const top = gooTop(def, this.gooFrames);
    this.goo.setY(top);
    this.gooBody?.setY(top + TILE);
    this.goo.tilePositionX += 0.25; // slow churn
    if (inGoo(def, this.gooFrames, this.player.body.bottom)) this.player.fallOut();
  }

  update(): void {
    const cam = this.cameras.main;
    this.parallax.forEach((layer, i) => (layer.tilePositionX = cam.scrollX * (PARALLAX_SPEED[i] ?? 1)));
    if (!this.readout) return;
    const p = this.player;
    const b = p.body;
    const m = p.motion;
    this.readout.setText(
      `${m.state} f${m.stateFrames}\nvx ${b.velocity.x.toFixed(0)} vy ${b.velocity.y.toFixed(0)}\n` +
        `ground ${b.blocked.down ? 'Y' : 'n'} wall ${b.blocked.left ? 'L' : b.blocked.right ? 'R' : '-'} coyote ${m.coyote}\n` +
        `hp ${p.health.hp} inv ${p.health.invuln} lives ${p.health.lives}\n` +
        `armor a${p.armor} airdash ${m.airDashesUsed}/${m.airDashes}\n` +
        `section ${this.section} door ${this.door?.state ?? '-'}
` +
        `fps ${this.game.loop.actualFps.toFixed(0)} objects ${this.children.list.length}`,
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
      .text(28, 4, '', { fontFamily: 'monospace', fontSize: '8px', color: '#f1c21b', resolution: 4 })
      .setScrollFactor(0)
      .setDepth(100);
  }
}
