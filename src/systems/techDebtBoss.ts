/**
 * Tech Debt, the final boss, as two pure state machines (gamedev game-ai skill: a readable
 * warning before every attack, a fixed cycle, faster when hurt).
 *
 * Phase 1, the wall: a mainframe filling the right of the room, its CRT face the only weak
 * point. Cycle: cards, cards, summon. A drawer slides open (the warning) and fires a run of
 * punched cards, low (jump them) or high (stay down); a summon sends a Deprecated Bot out.
 * Below a third of its health both drawers fire together.
 *
 * Phase 2, the core: the CRT tears free and flies. Cycle: laser, patch. The laser takes a side
 * and a height (low: jump it, high: stay down) and glows before it fires across the room; the
 * patches replay the three bosses in turn (goo, clock blades, a cursor fan).
 */

export const TECH_HP = 28;
export const TECH_CONTACT = 4;
export const CARD_SPEED = 150;
export const CARD_DAMAGE = 3;
export const LASER_DAMAGE = 5;
export const PATCH_DAMAGE = 3;
export const CORE_SPEED = 90;

/** Card heights above the floor: low hits a standing Bob, high passes over him. */
export const DRAWER_LOW = 12;
export const DRAWER_HIGH = 44;
/** Laser heights above the floor (centre): low hits a standing Bob, high only a jumping one. */
export const LASER_LOW = 22;
export const LASER_HIGH = 46;

const WALL_IDLE = [56, 36];
const DRAWER_WARN = [26, 18];
const CARD_GAP = 14;
const CARDS = 3;
const SUMMON_FRAMES = 40;
const CORE_IDLE = [40, 26];
const LASER_CHARGE = [44, 32];
const LASER_FIRE = 34;
const PATCH_AT = 14;
const PATCH_END = 34;

export type Drawer = 0 | 1; // 0 low, 1 high

// ------------------------------------------------------------------ phase 1: the wall

export type WallState = 'idle' | 'open' | 'fire' | 'summon';
const WALL_CYCLE: readonly ('cards' | 'summon')[] = ['cards', 'cards', 'summon'];

export interface Wall {
  state: WallState;
  frames: number;
  next: number;
  /** The drawer the next run of cards comes from (alternates). */
  drawer: Drawer;
  fired: number;
  fury: boolean;
}

export const newWall = (): Wall => ({ state: 'idle', frames: 0, next: 0, drawer: 0, fired: 0, fury: false });

export interface WallOut {
  /** Which drawers stand open (index 0 low, 1 high). */
  open: [boolean, boolean];
  /** Cards fired this frame, from these drawers. */
  cards?: Drawer[];
  /** Send a Deprecated Bot out this frame. */
  summon?: boolean;
  /** The CRT face glares (summon wind-up). */
  glare: boolean;
}

export function stepWall(w: Wall, hp: number): WallOut {
  w.frames++;
  w.fury ||= hp <= 1 / 3;
  const f = w.fury ? 1 : 0;
  const go = (state: WallState) => {
    w.state = state;
    w.frames = 0;
  };
  const drawers = (): Drawer[] => (w.fury ? [0, 1] : [w.drawer]);
  const openNow = (): [boolean, boolean] => [drawers().includes(0), drawers().includes(1)];
  switch (w.state) {
    case 'idle': {
      if (w.frames < WALL_IDLE[f]!) return { open: [false, false], glare: false };
      const attack = WALL_CYCLE[w.next]!;
      w.next = (w.next + 1) % WALL_CYCLE.length;
      go(attack === 'cards' ? 'open' : 'summon');
      return { open: attack === 'cards' ? openNow() : [false, false], glare: attack === 'summon' };
    }
    case 'open':
      if (w.frames >= DRAWER_WARN[f]!) {
        go('fire');
        w.fired = 0;
      }
      return { open: openNow(), glare: false };
    case 'fire': {
      const open = openNow();
      let cards: Drawer[] | undefined;
      if ((w.frames - 1) % CARD_GAP === 0 && w.fired < CARDS) {
        cards = drawers();
        w.fired++;
      }
      if (w.fired >= CARDS && w.frames > CARD_GAP * CARDS) {
        w.drawer = w.drawer === 0 ? 1 : 0;
        go('idle');
      }
      return { open, glare: false, ...(cards && { cards }) };
    }
    case 'summon': {
      const summon = w.frames === SUMMON_FRAMES / 2;
      if (w.frames >= SUMMON_FRAMES) go('idle');
      return { open: [false, false], glare: true, ...(summon && { summon }) };
    }
  }
}

// ------------------------------------------------------------------ phase 2: the core

export type CoreState = 'idle' | 'charge' | 'fire' | 'patch';
export type Patch = 'goo' | 'blades' | 'cursors';
const PATCHES: readonly Patch[] = ['goo', 'blades', 'cursors'];

export interface Core {
  state: CoreState;
  frames: number;
  facing: 1 | -1;
  /** Next attack: even = laser, odd = patch. */
  turn: number;
  /** Next patch, and whether the next laser goes low. */
  patch: number;
  low: boolean;
  fury: boolean;
}

export const newCore = (): Core => ({ state: 'idle', frames: 0, facing: -1, turn: 0, patch: 0, low: true, fury: false });

export interface CoreSense {
  x: number;
  bob: { x: number; y: number } | null;
  arenaLeft: number;
  arenaRight: number;
  floorY: number;
  hp: number;
}

export interface CoreOut {
  /** Where the core glides to (its centre). */
  target: { x: number; y: number };
  /** Sheet frame: 0-1 idle, 2 laser charge, 3 laser fire. */
  frame: 0 | 1 | 2 | 3;
  /** The beam is live this frame, at this height (world y of its centre). */
  beam?: number;
  /** A patch fires this frame. */
  patch?: Patch;
}

export function stepCore(c: Core, s: CoreSense): CoreOut {
  c.frames++;
  c.fury ||= s.hp <= 1 / 3;
  const f = c.fury ? 1 : 0;
  const go = (state: CoreState) => {
    c.state = state;
    c.frames = 0;
  };
  const mid = (s.arenaLeft + s.arenaRight) / 2;
  // the laser fires from the side Bob is NOT on, across the whole room
  const sideX = s.bob && s.bob.x > mid ? s.arenaLeft + 56 : s.arenaRight - 56;
  const laserY = s.floorY - (c.low ? LASER_LOW : LASER_HIGH);
  const hover = { x: s.bob ? Math.max(s.arenaLeft + 64, Math.min(s.arenaRight - 64, s.bob.x + (s.bob.x > mid ? -120 : 120))) : mid, y: s.floorY - 110 };
  if (s.bob && s.bob.x !== s.x && c.state !== 'fire') c.facing = s.bob.x < s.x ? -1 : 1;
  const idle = (Math.floor(c.frames / 10) % 2) as 0 | 1;
  switch (c.state) {
    case 'idle': {
      if (c.frames < CORE_IDLE[f]! || !s.bob) return { target: hover, frame: idle };
      const laser = c.turn % 2 === 0;
      c.turn++;
      go(laser ? 'charge' : 'patch');
      return { target: laser ? { x: sideX, y: laserY } : hover, frame: laser ? 2 : idle };
    }
    case 'charge':
      if (c.frames >= LASER_CHARGE[f]!) {
        go('fire');
        return { target: { x: s.x, y: laserY }, frame: 3, beam: laserY };
      }
      return { target: { x: sideX, y: laserY }, frame: 2 };
    case 'fire':
      if (c.frames >= LASER_FIRE) {
        c.low = !c.low;
        go('idle');
        return { target: hover, frame: idle };
      }
      return { target: { x: s.x, y: laserY }, frame: 3, beam: laserY };
    case 'patch': {
      let patch: Patch | undefined;
      if (c.frames === PATCH_AT) {
        patch = PATCHES[c.patch]!;
        c.patch = (c.patch + 1) % PATCHES.length;
      }
      if (c.frames >= PATCH_END) go('idle');
      return { target: hover, frame: idle, ...(patch && { patch }) };
    }
  }
}
