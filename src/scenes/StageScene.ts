import Phaser from 'phaser';
import { ARMOR_BITS, TILE } from '../data/assets';
import { Player } from '../entities/Player';
import { parseMap, T } from '../stages/map';
import { TEST_MAP } from '../stages/test';
import { GameInput } from '../systems/input';

/** Camera looks this far above Bob's feet, so he sits slightly below screen center. */
const CAMERA_LOOK_UP = 24;

/**
 * A playable stage built from an ASCII map. For now: the movement test map.
 * Dev keys: R respawn, F2 toggle hitboxes + state readout, 1-4 toggle armor parts
 * (4 = Turbo Boots: air dash).
 */
export class StageScene extends Phaser.Scene {
  private controls!: GameInput;
  private player!: Player;
  private spawn = { x: 0, y: 0 };
  private worldHeight = 0;
  private readout?: Phaser.GameObjects.Text;

  constructor() {
    super('Stage');
  }

  create(): void {
    const parsed = parseMap(TEST_MAP);
    this.spawn = parsed.spawn;
    const width = parsed.cols * TILE;
    this.worldHeight = parsed.rows * TILE;

    const map = this.make.tilemap({ data: parsed.tiles, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles_test', 'tiles_test', TILE, TILE, 0, 0);
    if (!tileset) throw new Error('tileset missing');
    const layer = map.createLayer(0, tileset, 0, 0);
    if (!layer) throw new Error('tile layer missing');
    layer.setCollision([T.solid]);
    layer.forEachTile((tile) => {
      if (tile.index === T.platform) tile.setCollision(false, false, true, false);
    });

    this.physics.world.setBounds(0, 0, width, this.worldHeight);
    this.player = new Player(this, this.spawn.x, this.spawn.y);
    this.physics.add.collider(this.player, layer);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, width, this.worldHeight);
    cam.startFollow(this.player, true, 1, 1, 0, CAMERA_LOOK_UP);

    this.controls = new GameInput(this);
    const kb = this.input.keyboard!;
    kb.on('keydown-R', () => this.player.respawn(this.spawn.x, this.spawn.y));
    kb.on('keydown-F2', () => this.toggleDebug());
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
    const input = this.controls.poll();
    this.player.step(input);
    // fell out of the map (spike pit): back to spawn until damage exists (T6)
    if (this.player.body.bottom > this.worldHeight + 32) this.player.respawn(this.spawn.x, this.spawn.y);
  }

  update(): void {
    if (this.readout) {
      const b = this.player.body;
      const m = this.player.motion;
      this.readout.setText(
        `${m.state} f${m.stateFrames}\nvx ${b.velocity.x.toFixed(0)} vy ${b.velocity.y.toFixed(0)}\n` +
          `ground ${b.blocked.down ? 'Y' : 'n'} wall ${b.blocked.left ? 'L' : b.blocked.right ? 'R' : '-'} coyote ${m.coyote}\n` +
          `armor a${this.player.armor} airdash ${m.canAirDash ? (m.airDashUsed ? 'used' : 'ready') : 'no boots'}`,
      );
    }
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
      .text(4, 4, '', { fontFamily: 'monospace', fontSize: '8px', color: '#f1c21b' })
      .setScrollFactor(0)
      .setDepth(100);
  }
}
