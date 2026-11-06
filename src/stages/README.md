# Stages: how to add one

A stage is **data**. `StageScene` builds whatever `StageDef` it is started with
(`scene.start('Stage', { stage: 'memoryLeak' })`); no stage gets its own scene.
Memory Leak (`memoryLeak.ts`) is the reference to copy.

## 1. The map file: `src/stages/<stage>.ts`

- `<STAGE>_MAP`: ASCII rows, all the same width. Legend (`map.ts`):
  `#` solid, `=` one-way platform, `^` hazard (instant death, like spikes), `-` background
  wall, `.` empty, `P` spawn, `C` checkpoint, `B` boss door (its bottom-left cell).
  Enemies: `m` Pixel Mite, `d` Spam Drone, `v` Drip (the cell right under a ceiling),
  `h` Heap Crab. A marker cell takes the tile to its left.
- `<STAGE>_SECTIONS`: camera sections in tiles, each at least one screen (30x17). The camera
  never shows outside the current one. The **last** section is the boss room, `locked: true`,
  with its floor on its bottom two rows (the boss stands there).
- Optional extras, as data: a rising goo (`GooDef`: section, rows, speed, delay).

## 2. The entry in `stages.ts`

Add the id to `StageId` and an entry to `STAGES`: map, sections, boss, `tileset`
(`tiles_<stage>`), `skin: STAGE_SKIN` (picks edges, corners and platform ends from the
24-frame stage tilesets, see `autotile.ts`), `parallax` (the three `t<N>_<stage>_*_wide`
layers, far to near) and a `background` color.

## 3. New enemies

- Behaviour as a pure function in `src/systems/enemyAI.ts` (state in, velocity and frame out),
  with tests. Numbers in `src/data/enemies.ts`, plus an `ENEMIES` stats row.
- A thin class in `src/entities/enemies/<Name>.ts` that feeds it the physics contacts, and a
  case in `createEnemy` (`enemies/index.ts`). Add its map marker to `ENEMY_MARKERS`.
- Make the hitbox at least 14 px tall, or a standing shot (16 px above the feet) misses it.
- Enemy projectiles go through `EnemyWorld.throwBlock` (an `EnemyShot`): they break on walls,
  hurt Bob, and the Garbage Collector swallows them.

## 4. Design rules (gamedev `level-design` skill)

- Size gaps and steps by Bob's jump: about 53 px (3.3 tiles) high and 63 px far. Mandatory
  jumps stay well inside that; edge-of-reach jumps are for optional paths.
- Teach each hazard alone where failing is cheap (near a checkpoint), then combine it.
- `tests/stages.test.ts` and `tests/reach.test.ts` run for every entry automatically. The reach
  test plays the real Bob controller from the spawn to the boss door with 75% air control and
  no dash; if it fails, fix the map, not the test. Then play it in the browser.
