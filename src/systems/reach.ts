import { BOB_BODY_H, BOB_BODY_W, CONVEYOR_SPEED, GRAVITY, MAX_FALL_SPEED } from '../data/tuning';
import { conveyorUnder, isFloor, isSolid, type ParsedMap, T } from '../stages/map';
import { type Action, ActionState } from './actions';
import { newMotion, stepMotion } from './motion';

/**
 * A headless Bob for level checks: the real controller (`stepMotion`) driving a small AABB
 * tile collider that follows Arcade's order (gravity, move, separate, then the controller reads
 * the contacts). It finds which spots of a map Bob can reach by plain play, so a test can prove
 * every stage has a critical path from the spawn to the boss door, with no teleports.
 */

const TILE = 16;
const DT = 1 / 60;
/** Boss door shutter, bottom-left at its map cell (see BossDoor). */
const DOOR_W = 32;
const DOOR_H = 48;
const DOOR_TOUCH = 4;
const MAX_AIR_FRAMES = 240;

export interface ReachOptions {
  /**
   * Scales Bob's horizontal speed in the air. Below 1 it asks for slack: a path found at 0.75
   * has no mandatory jump that needs more than 75% of Bob's reach (the level-design rule).
   */
  airControl?: number;
  /** Allow dash and dash-jumps (base Bob has them; the critical path should not need them). */
  dash?: boolean;
}

interface Box {
  x: number; // left
  y: number; // top
  vx: number;
  vy: number;
  gravity: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/** Feet position of a standing Bob: x = body centre, y = floor top. */
export interface Spot {
  x: number;
  y: number;
}

type Script = (frame: number) => Action[];

export class ReachSim {
  private readonly door: { x: number; y: number } | null;

  constructor(
    private readonly map: ParsedMap,
    private readonly opts: ReachOptions = {},
  ) {
    const d = map.objects.find((o) => o.kind === 'bossDoor');
    this.door = d ? { x: d.x, y: d.y - DOOR_H } : null;
  }

  private tile(c: number, r: number): number {
    if (c < 0 || c >= this.map.cols) return T.solid; // world bounds
    if (r < 0) return T.empty;
    return this.map.tiles[r]?.[c] ?? T.empty;
  }

  /** Any solid tile (or the closed boss door) overlapping the rectangle. */
  private blocked(x: number, y: number, w: number, h: number): { tx: number; ty: number } | null {
    const d = this.door;
    if (d && x < d.x + DOOR_W && x + w > d.x && y < d.y + DOOR_H && y + h > d.y) return { tx: d.x, ty: d.y };
    for (let r = Math.floor(y / TILE); r <= Math.floor((y + h - 0.001) / TILE); r++) {
      for (let c = Math.floor(x / TILE); c <= Math.floor((x + w - 0.001) / TILE); c++) {
        if (isSolid(this.tile(c, r))) return { tx: c * TILE, ty: r * TILE };
      }
    }
    return null;
  }

  private physics(b: Box): void {
    if (b.gravity) b.vy = Math.min(MAX_FALL_SPEED, Math.max(-MAX_FALL_SPEED, b.vy + GRAVITY * DT));
    b.down = b.left = b.right = false;
    const W = BOB_BODY_W;
    const H = BOB_BODY_H;

    // horizontal
    const nx = b.x + b.vx * DT;
    const hitX = this.blocked(nx, b.y, W, H);
    if (hitX && b.vx !== 0) {
      if (b.vx > 0) {
        b.x = this.wallEdge(nx, b.y, 1) - W;
        b.right = true;
      } else {
        b.x = this.wallEdge(nx, b.y, -1);
        b.left = true;
      }
    } else b.x = nx;

    // vertical (one-way platforms catch Bob only when he was above them)
    const prevBottom = b.y + H;
    const ny = b.y + b.vy * DT;
    if (b.vy > 0) {
      const floor = this.floorBelow(b.x, prevBottom, ny + H);
      if (floor !== null) {
        b.y = floor - H;
        b.vy = 0;
        b.down = true;
        return;
      }
    } else if (b.vy < 0 && this.blocked(b.x, ny, W, H)) {
      b.y = (Math.floor(ny / TILE) + 1) * TILE;
      b.vy = 0;
      return;
    }
    b.y = ny;
  }

  /** The x of the wall face Bob ran into, moving in `dir`. */
  private wallEdge(nx: number, y: number, dir: 1 | -1): number {
    const W = BOB_BODY_W;
    const d = this.door;
    if (dir === 1) {
      if (d && nx + W > d.x && nx < d.x && y < d.y + DOOR_H && y + BOB_BODY_H > d.y) return d.x;
      return Math.floor((nx + W) / TILE) * TILE;
    }
    return (Math.floor(nx / TILE) + 1) * TILE;
  }

  /** Top of the first floor (solid, platform or door) crossed between two bottoms, or null. */
  private floorBelow(x: number, fromBottom: number, toBottom: number): number | null {
    const W = BOB_BODY_W;
    for (let r = Math.floor(fromBottom / TILE); r <= Math.floor(toBottom / TILE); r++) {
      const top = r * TILE;
      if (top < fromBottom - 0.001 || top > toBottom) continue;
      for (let c = Math.floor(x / TILE); c <= Math.floor((x + W - 0.001) / TILE); c++) {
        const t = this.tile(c, r);
        if (isFloor(t)) return top;
      }
      const d = this.door;
      if (d && top === d.y && x < d.x + DOOR_W && x + W > d.x) return top;
    }
    return null;
  }

  /** A conveyor under either of Bob's feet pushes him along, like in the game. */
  private carry(b: Box): number {
    const at = (x: number, y: number) => this.tile(Math.floor(x / TILE), Math.floor(y / TILE));
    return conveyorUnder(at, b.x, b.x + BOB_BODY_W, b.y + BOB_BODY_H) * CONVEYOR_SPEED;
  }

  private dead(b: Box): boolean {
    if (b.y + BOB_BODY_H > this.map.rows * TILE + 8) return true;
    const bottom = b.y + BOB_BODY_H;
    for (let c = Math.floor(b.x / TILE); c <= Math.floor((b.x + BOB_BODY_W - 0.001) / TILE); c++) {
      for (let r = Math.floor((bottom - 4) / TILE); r <= Math.floor((bottom - 0.001) / TILE); r++) {
        if (this.tile(c, r) === T.spike) return true;
      }
    }
    return false;
  }

  /** Bob's hitbox touches the boss door's left face. */
  private atDoor(b: Box): boolean {
    const d = this.door;
    return !!d && b.x + BOB_BODY_W >= d.x - DOOR_TOUCH && b.x < d.x && b.y + BOB_BODY_H > d.y && b.y < d.y + DOOR_H;
  }

  /**
   * Plays `script` from a standing spot until Bob stands still again. Returns where he ended
   * (null if he died or never landed) and whether he touched the boss door on the way.
   */
  play(from: Spot, script: Script, onFrame?: (feet: Spot) => void): { spot: Spot | null; door: boolean } {
    const b: Box = { x: from.x - BOB_BODY_W / 2, y: from.y - BOB_BODY_H, vx: 0, vy: 0, gravity: true, down: true, left: false, right: false };
    const motion = newMotion();
    const input = new ActionState();
    const air = this.opts.airControl ?? 1;
    let door = false;
    let grounded = 0;
    for (let f = 0; f < MAX_AIR_FRAMES; f++) {
      const held = new Set(script(f));
      if (!this.opts.dash) held.delete('dash');
      input.update(held);
      const out = stepMotion(motion, input, { onGround: b.down, vy: b.vy, wallLeft: b.left, wallRight: b.right });
      b.vx = b.down ? out.vx + this.carry(b) : out.vx * air;
      if (out.vy !== undefined) b.vy = out.vy;
      b.gravity = out.gravity;
      this.physics(b);
      onFrame?.({ x: b.x + BOB_BODY_W / 2, y: b.y + BOB_BODY_H });
      if (this.dead(b)) return { spot: null, door };
      if (this.atDoor(b)) door = true;
      // done once the script is over and Bob has stood still for a few frames
      grounded = b.down && held.size === 0 ? grounded + 1 : 0;
      if (grounded >= 3) return { spot: { x: b.x + BOB_BODY_W / 2, y: b.y + BOB_BODY_H }, door };
    }
    return { spot: null, door };
  }
}

/** The moves tried from every spot: walk a tile, and jumps of several heights and drifts. */
function moves(): Script[] {
  const list: Script[] = [];
  for (const d of ['left', 'right'] as const) {
    list.push((f) => (f < 11 ? [d] : [])); // walk one tile
    for (const hold of [4, 10, 40]) {
      for (const driftFrom of [0, 8, 16]) {
        for (const driftTo of [24, 60, 200]) {
          list.push((f) => {
            const a: Action[] = [];
            if (f < hold) a.push('jump');
            if (f >= driftFrom && f < driftTo) a.push(d);
            return a;
          });
        }
      }
    }
    list.push((f) => (f < 20 ? ['dash', d] : [])); // dash (only with opts.dash)
    list.push((f) => (f < 40 ? (f < 2 ? ['dash', d] : ['dash', 'jump', d]) : f < 200 ? [d] : [])); // dash-jump
  }
  return list;
}

/** Spots keyed to a 4 px grid, so the search does not revisit near-identical spots. */
const key = (s: Spot) => `${Math.round(s.x / 4)},${Math.round(s.y)}`;

export interface ReachResult {
  /** Bob can walk/jump from the spawn to the boss door. */
  door: boolean;
  /** Every standing spot reached. */
  spots: Spot[];
}

/** Breadth-first search over standing spots, from the map's spawn. */
export function reachable(map: ParsedMap, opts: ReachOptions = {}): ReachResult {
  const sim = new ReachSim(map, opts);
  const scripts = moves();
  const first = sim.play(map.spawn, () => []).spot ?? map.spawn;
  const seen = new Map<string, Spot>([[key(first), first]]);
  const queue: Spot[] = [first];
  let door = false;
  while (queue.length && !door) {
    const s = queue.shift()!;
    for (const script of scripts) {
      const r = sim.play(s, script);
      if (r.door) door = true;
      if (r.spot && !seen.has(key(r.spot))) {
        seen.set(key(r.spot), r.spot);
        queue.push(r.spot);
      }
    }
  }
  return { door, spots: [...seen.values()] };
}

/** Bob's jump measured on flat ground: peak height (jump held) and run-jump distance, px. */
export function jumpMetrics(): { height: number; distance: number } {
  const cols = 40;
  const tiles = Array.from({ length: 12 }, (_, r) => Array.from({ length: cols }, () => (r >= 10 ? T.solid : T.empty)));
  const spawn = { x: 8 * TILE, y: 10 * TILE };
  const sim = new ReachSim({ tiles, cols, rows: 12, spawn, enemies: [], objects: [] });
  let top = spawn.y;
  sim.play(spawn, (f) => (f < 60 ? ['jump'] : []), (feet) => (top = Math.min(top, feet.y)));
  // run-jump: where the feet first touch the floor again
  let landX: number | null = null;
  let airborne = false;
  sim.play(spawn, (f) => (f < 60 ? ['jump', 'right'] : []), (feet) => {
    if (feet.y < spawn.y) airborne = true;
    else if (airborne && landX === null) landX = feet.x;
  });
  return { height: Math.round(spawn.y - top), distance: Math.round((landX ?? spawn.x) - spawn.x) };
}
