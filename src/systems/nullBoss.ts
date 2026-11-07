/**
 * Null Pointer, the boss, as a pure state machine (gamedev game-ai skill: a readable warning
 * before every attack, a fixed cycle, faster when hurt).
 *
 * Cycle: teleport + shoot, teleport + shoot, summon. It floats at one of three spots; it glitches
 * out (untouchable), reappears elsewhere and fans cursor arrows at Bob. Summoning turns patches
 * of floor into "missing tiles" that flicker first (the warning) and then hurt. Below a third of
 * its health it reappears with two fake copies at the other spots, and fires wider fans.
 */

export const NULL_HP = 28;
export const NULL_CONTACT = 4;
export const NULL_CURSOR_SPEED = 150;
export const NULL_CURSOR_DAMAGE = 3;
export const NULL_VOID_DAMAGE = 4;
/** A summoned void flickers (harmless) this long, then hurts for VOID_LIVE frames. */
export const VOID_WARN = 40;
export const VOID_LIVE = 150;
/** Void patch width (tiles) and how many (normal, fury). */
export const VOID_TILES = 2;
const VOIDS = [3, 4];
/** Hover height of its feet above the floor, px. */
export const NULL_HOVER = 14;
/** Spots from the arena walls, px. */
export const SPOT_MARGIN = 72;

const IDLE = [46, 28];
const OUT = 18;
const HIDDEN = 22;
const IN = 14;
const SHOOT_AT = 10;
const SHOOT_END = 28;
const SUMMON_AT = 14;
const SUMMON_END = 34;
/** Fan of cursors around the line to Bob, radians (normal, fury). */
const FAN: readonly (readonly number[])[] = [
  [-0.25, 0, 0.25],
  [-0.5, -0.25, 0, 0.25, 0.5],
];

export type NullState = 'idle' | 'out' | 'hidden' | 'in' | 'shoot' | 'summon';
const CYCLE: readonly ('teleport' | 'summon')[] = ['teleport', 'teleport', 'summon'];

export interface NullBoss {
  state: NullState;
  frames: number;
  facing: 1 | -1;
  next: number;
  /** Which of the three spots it is at (0 left, 1 middle, 2 right). */
  spot: number;
  fury: boolean;
}

export const newNullBoss = (): NullBoss => ({ state: 'idle', frames: 0, facing: -1, next: 0, spot: 1, fury: false });

export interface NullSense {
  x: number;
  y: number;
  bob: { x: number; y: number } | null;
  arenaLeft: number;
  arenaRight: number;
  /** World y of the arena floor. */
  floorY: number;
  hp: number;
  /** 0..1, for picking spots and void patches. */
  rand: () => number;
}

export interface NullOut {
  /** Sheet frame: 0-1 idle, 2 teleport out, 3 teleport in, 4 shoot, 5 summon. */
  frame: 0 | 1 | 2 | 3 | 4 | 5;
  visible: boolean;
  /** Can be hit and hurts on contact. */
  tangible: boolean;
  moveTo?: { x: number; y: number };
  cursors?: { vx: number; vy: number }[];
  voids?: { x: number; w: number }[];
  /** Fake copies to show at these points (fury), and when to drop them. */
  decoys?: { x: number; y: number }[];
  clearDecoys?: boolean;
}

/** The three spots it teleports between, as feet positions. */
export function nullSpots(s: Pick<NullSense, 'arenaLeft' | 'arenaRight' | 'floorY'>): { x: number; y: number }[] {
  const y = s.floorY - NULL_HOVER;
  return [s.arenaLeft + SPOT_MARGIN, (s.arenaLeft + s.arenaRight) / 2, s.arenaRight - SPOT_MARGIN].map((x) => ({ x, y }));
}

/** Void patches across the arena floor, never two overlapping, none under Bob's spawn edge. */
export function voidPatches(s: Pick<NullSense, 'arenaLeft' | 'arenaRight' | 'rand'>, count: number, tile = 16): { x: number; w: number }[] {
  const first = Math.ceil((s.arenaLeft + tile * 2) / tile);
  const last = Math.floor((s.arenaRight - tile * 2) / tile) - VOID_TILES;
  const slots = Math.floor((last - first + 1) / (VOID_TILES + 1));
  const chosen = new Set<number>();
  while (chosen.size < Math.min(count, slots)) chosen.add(Math.floor(s.rand() * slots));
  return [...chosen].sort((a, b) => a - b).map((i) => ({ x: (first + i * (VOID_TILES + 1)) * tile, w: VOID_TILES * tile }));
}

export function stepNull(b: NullBoss, s: NullSense): NullOut {
  b.frames++;
  b.fury ||= s.hp <= 1 / 3;
  const f = b.fury ? 1 : 0;
  const go = (state: NullState) => {
    b.state = state;
    b.frames = 0;
  };
  if (s.bob && s.bob.x !== s.x) b.facing = s.bob.x < s.x ? -1 : 1;
  const shown = { visible: true, tangible: true };
  switch (b.state) {
    case 'idle': {
      if (b.frames < IDLE[f]! || !s.bob) return { frame: (Math.floor(b.frames / 10) % 2) as 0 | 1, ...shown };
      const attack = CYCLE[b.next]!;
      b.next = (b.next + 1) % CYCLE.length;
      go(attack === 'teleport' ? 'out' : 'summon');
      return { frame: attack === 'teleport' ? 2 : 5, ...shown, clearDecoys: attack === 'teleport' };
    }
    case 'out':
      if (b.frames >= OUT) {
        go('hidden');
        return { frame: 2, visible: false, tangible: false };
      }
      return { frame: 2, visible: true, tangible: false };
    case 'hidden': {
      if (b.frames < HIDDEN) return { frame: 2, visible: false, tangible: false };
      // a new spot, never the one it left
      const others = [0, 1, 2].filter((i) => i !== b.spot);
      b.spot = others[Math.floor(s.rand() * others.length) % others.length]!;
      const spots = nullSpots(s);
      go('in');
      return {
        frame: 3,
        visible: true,
        tangible: false,
        moveTo: spots[b.spot]!,
        ...(b.fury && { decoys: spots.filter((_, i) => i !== b.spot) }),
      };
    }
    case 'in':
      if (b.frames >= IN) go('shoot');
      return { frame: 3, visible: true, tangible: false };
    case 'shoot': {
      let cursors: NullOut['cursors'];
      if (b.frames === SHOOT_AT && s.bob) {
        const a = Math.atan2(s.bob.y - (s.y - 40), s.bob.x - s.x);
        cursors = FAN[f]!.map((d) => ({ vx: Math.cos(a + d) * NULL_CURSOR_SPEED, vy: Math.sin(a + d) * NULL_CURSOR_SPEED }));
      }
      if (b.frames >= SHOOT_END) go('idle');
      return { frame: 4, ...shown, ...(cursors && { cursors }) };
    }
    case 'summon': {
      const voids = b.frames === SUMMON_AT ? voidPatches(s, VOIDS[f]!) : undefined;
      if (b.frames >= SUMMON_END) go('idle');
      return { frame: 5, ...shown, ...(voids && { voids }) };
    }
  }
}
