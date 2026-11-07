import {
  BOT_GUARD_FRAMES,
  BOT_OPEN_FRAMES,
  BOT_PUNCH_FRAMES,
  BOT_PUNCH_SPEED,
  BOT_REACH,
  TURRET_AIM_FRAMES,
  TURRET_COOLDOWN_FRAMES,
  TURRET_FIRE_FRAMES,
  TURRET_SIGHT,
  DANGLE_AMP,
  DANGLE_PERIOD,
  EYE_GLITCH_FRAMES,
  EYE_GONE_FRAMES,
  EYE_HOP,
  EYE_IDLE_FRAMES,
  EYE_SIGHT,
  EYE_WIDE_FRAMES,
  RUNNER_BRAKE_FRAMES,
  RUNNER_REST_FRAMES,
  RUNNER_REV_FRAMES,
  RUNNER_RUSH_SPEED,
  RUNNER_SIGHT_X,
  RUNNER_SIGHT_Y,
  SPIKE_CHARGE_FRAMES,
  SPIKE_COOLDOWN_FRAMES,
  SPIKE_FIRE_FRAMES,
  SPIKE_SIGHT_X,
  SPIKE_SIGHT_Y,
  BLOCK_FLIGHT_S,
  BLOCK_GRAVITY,
  BLOCK_MAX_VX,
  BLOCK_MAX_VY,
  CRAB_COOLDOWN_FRAMES,
  CRAB_RECOVER_FRAMES,
  CRAB_SIGHT_X,
  CRAB_WINDUP_FRAMES,
  DRIP_SIGHT_X,
  DRIP_SPLAT_FRAMES,
  DRONE_COOLDOWN_FRAMES,
  DRONE_DIVE_FRAMES,
  DRONE_DIVE_SPEED,
  DRONE_HOVER_AMP,
  DRONE_HOVER_PERIOD,
  DRONE_RISE_SPEED,
  DRONE_SIGHT_X,
} from '../data/enemies';

// ------------------------------------------------------------------ Pixel Mite

export interface Mite {
  facing: 1 | -1;
}

/**
 * Pixel Mite: walks along the floor and turns around at a wall or a ledge.
 * `wallAhead` / `floorAhead` describe the cell just in front of its feet.
 */
export function stepMite(m: Mite, s: { onGround: boolean; wallAhead: boolean; floorAhead: boolean }, speed: number): { vx: number } {
  if (!s.onGround) return { vx: 0 };
  if (s.wallAhead || !s.floorAhead) m.facing = m.facing === 1 ? -1 : 1;
  return { vx: m.facing * speed };
}

// ------------------------------------------------------------------ Spam Drone

export type DroneState = 'hover' | 'dive' | 'rise' | 'rest';

export interface Drone {
  state: DroneState;
  frames: number;
  /** Home height (y) it hovers at and returns to. */
  homeY: number;
  /** Dive direction, normalized. */
  dirX: number;
  dirY: number;
}

export const newDrone = (homeY: number): Drone => ({ state: 'hover', frames: 0, homeY, dirX: 0, dirY: 0 });

export interface DroneOut {
  vx: number;
  vy: number;
  /** Sheet frame: 0-1 flying (alternating), 2 diving. */
  frame: 0 | 1 | 2;
  facing: 1 | -1;
}

function enter(d: Drone, state: DroneState): void {
  d.state = state;
  d.frames = 0;
}

/**
 * Spam Drone, one frame. Hovers at home height; when Bob passes below within sight it dives
 * straight at where he was, then climbs back home and rests before it can dive again.
 */
export function stepDrone(d: Drone, at: { x: number; y: number }, bob: { x: number; y: number }): DroneOut {
  d.frames++;
  const dx = bob.x - at.x;
  const facing: 1 | -1 = dx < 0 ? -1 : 1;
  const flap = (Math.floor(d.frames / 4) % 2) as 0 | 1;
  switch (d.state) {
    case 'hover': {
      if (Math.abs(dx) <= DRONE_SIGHT_X && bob.y > at.y + 8) {
        const dy = bob.y - at.y;
        const len = Math.hypot(dx, dy) || 1;
        d.dirX = dx / len;
        d.dirY = dy / len;
        enter(d, 'dive');
        return { vx: d.dirX * DRONE_DIVE_SPEED, vy: d.dirY * DRONE_DIVE_SPEED, frame: 2, facing };
      }
      // gentle sine bob around home height
      const target = d.homeY + Math.sin((d.frames / DRONE_HOVER_PERIOD) * Math.PI * 2) * DRONE_HOVER_AMP;
      return { vx: 0, vy: (target - at.y) * 4, frame: flap, facing };
    }
    case 'dive':
      if (d.frames >= DRONE_DIVE_FRAMES) enter(d, 'rise');
      return { vx: d.dirX * DRONE_DIVE_SPEED, vy: d.dirY * DRONE_DIVE_SPEED, frame: 2, facing: d.dirX < 0 ? -1 : 1 };
    case 'rise':
      if (at.y <= d.homeY) {
        enter(d, 'rest');
        return { vx: 0, vy: 0, frame: flap, facing };
      }
      return { vx: 0, vy: -DRONE_RISE_SPEED, frame: flap, facing };
    case 'rest':
      if (d.frames >= DRONE_COOLDOWN_FRAMES) enter(d, 'hover');
      return { vx: 0, vy: (d.homeY - at.y) * 4, frame: flap, facing };
  }
}

/** What a ground walker senses about the cell in front of its feet. */
export interface WalkerSense {
  onGround: boolean;
  wallAhead: boolean;
  floorAhead: boolean;
}

// ------------------------------------------------------------------ Drip

export type DripState = 'hang' | 'fall' | 'splat' | 'crawl';

export interface Drip {
  state: DripState;
  frames: number;
  facing: 1 | -1;
}

export const newDrip = (): Drip => ({ state: 'hang', frames: 0, facing: -1 });

export interface DripOut {
  vx: number;
  gravity: boolean;
  /** Sheet frame: 0 hanging, 1 falling, 2 puddle, 3 crawling (alternates with 2). */
  frame: 0 | 1 | 2 | 3;
}

/**
 * Drip, one frame. Hangs from the ceiling until Bob passes underneath, lets go, splats on
 * landing, then crawls toward where Bob was, turning at walls and ledges like a Pixel Mite.
 * `bobDx` is Bob's horizontal offset (null while he is dead); `bobBelow` that he is lower.
 */
export function stepDrip(d: Drip, s: WalkerSense, bobDx: number | null, bobBelow: boolean, speed: number): DripOut {
  d.frames++;
  const go = (state: DripState) => {
    d.state = state;
    d.frames = 0;
  };
  switch (d.state) {
    case 'hang':
      if (bobDx !== null && bobBelow && Math.abs(bobDx) <= DRIP_SIGHT_X) {
        go('fall');
        return { vx: 0, gravity: true, frame: 1 };
      }
      return { vx: 0, gravity: false, frame: 0 };
    case 'fall':
      if (s.onGround) {
        go('splat');
        return { vx: 0, gravity: true, frame: 2 };
      }
      return { vx: 0, gravity: true, frame: 1 };
    case 'splat':
      if (d.frames >= DRIP_SPLAT_FRAMES) {
        if (bobDx !== null && bobDx !== 0) d.facing = bobDx < 0 ? -1 : 1;
        go('crawl');
      }
      return { vx: 0, gravity: true, frame: 2 };
    case 'crawl': {
      const frame = Math.floor(d.frames / 8) % 2 === 0 ? 3 : 2;
      return { vx: stepMite(d, s, speed).vx, gravity: true, frame };
    }
  }
}

// ------------------------------------------------------------------ Heap Crab

export type CrabState = 'walk' | 'windup' | 'recover';

export interface Crab {
  state: CrabState;
  frames: number;
  facing: 1 | -1;
  cooldown: number;
}

export const newCrab = (): Crab => ({ state: 'walk', frames: 0, facing: -1, cooldown: CRAB_COOLDOWN_FRAMES / 2 });

export interface CrabOut {
  vx: number;
  /** Sheet frame: 0-1 walking, 2 throwing. */
  frame: 0 | 1 | 2;
  /** Set on the frame it throws: the block's launch velocity. */
  throw?: { vx: number; vy: number };
}

/** Launch velocity that lands a block (gravity BLOCK_GRAVITY) on a target dx, dy away. */
export function lobVelocity(dx: number, dy: number): { vx: number; vy: number } {
  const t = BLOCK_FLIGHT_S;
  const vx = Math.max(-BLOCK_MAX_VX, Math.min(BLOCK_MAX_VX, dx / t));
  const vy = Math.max(-BLOCK_MAX_VY, Math.min(0, dy / t - 0.5 * BLOCK_GRAVITY * t));
  return { vx, vy };
}

/**
 * Heap Crab, one frame. Patrols sideways (turning at walls and ledges); when Bob is in sight
 * and the cooldown is over, it stops, raises a pincer, lobs a memory block at him and goes on.
 * `bob` is Bob's offset from the crab's hand (null while he is dead).
 */
export function stepCrab(c: Crab, s: WalkerSense, bob: { dx: number; dy: number } | null, speed: number): CrabOut {
  c.frames++;
  if (c.cooldown > 0) c.cooldown--;
  const go = (state: CrabState) => {
    c.state = state;
    c.frames = 0;
  };
  switch (c.state) {
    case 'walk':
      if (bob && c.cooldown === 0 && s.onGround && Math.abs(bob.dx) <= CRAB_SIGHT_X) {
        if (bob.dx !== 0) c.facing = bob.dx < 0 ? -1 : 1;
        go('windup');
        return { vx: 0, frame: 2 };
      }
      return { vx: stepMite(c, s, speed).vx, frame: Math.floor(c.frames / 10) % 2 === 0 ? 0 : 1 };
    case 'windup':
      if (c.frames >= CRAB_WINDUP_FRAMES) {
        go('recover');
        c.cooldown = CRAB_COOLDOWN_FRAMES;
        return { vx: 0, frame: 2, throw: bob ? lobVelocity(bob.dx, bob.dy) : undefined };
      }
      return { vx: 0, frame: 2 };
    case 'recover':
      if (c.frames >= CRAB_RECOVER_FRAMES) go('walk');
      return { vx: 0, frame: 2 };
  }
}

// ------------------------------------------------------------------ Thread Runner

export type RunnerState = 'idle' | 'rev' | 'rush' | 'brake';

export interface Runner {
  state: RunnerState;
  frames: number;
  facing: 1 | -1;
  rest: number;
}

export const newRunner = (): Runner => ({ state: 'idle', frames: 0, facing: -1, rest: 0 });

export interface RunnerOut {
  vx: number;
  /** Sheet frame: 0-1 rolling, 2 braking / revving. */
  frame: 0 | 1 | 2;
}

/**
 * Thread Runner, one frame. Waits until Bob is in sight and about level, revs in place facing
 * him (the warning), rushes straight at full speed until a wall or a ledge, brakes and rests.
 * `bob` is Bob's offset from it (null while he is dead).
 */
export function stepRunner(r: Runner, s: WalkerSense, bob: { dx: number; dy: number } | null): RunnerOut {
  r.frames++;
  const go = (state: RunnerState) => {
    r.state = state;
    r.frames = 0;
  };
  switch (r.state) {
    case 'idle':
      if (r.rest > 0) r.rest--;
      if (r.rest === 0 && bob && s.onGround && Math.abs(bob.dx) <= RUNNER_SIGHT_X && Math.abs(bob.dy) <= RUNNER_SIGHT_Y) {
        if (bob.dx !== 0) r.facing = bob.dx < 0 ? -1 : 1;
        go('rev');
        return { vx: 0, frame: 2 };
      }
      return { vx: 0, frame: 0 };
    case 'rev':
      if (r.frames >= RUNNER_REV_FRAMES) {
        go('rush');
        return { vx: r.facing * RUNNER_RUSH_SPEED, frame: 0 };
      }
      return { vx: 0, frame: Math.floor(r.frames / 3) % 2 === 0 ? 2 : 1 };
    case 'rush':
      if (s.wallAhead || !s.floorAhead) {
        go('brake');
        return { vx: 0, frame: 2 };
      }
      return { vx: r.facing * RUNNER_RUSH_SPEED, frame: Math.floor(r.frames / 3) % 2 === 0 ? 0 : 1 };
    case 'brake':
      if (r.frames >= RUNNER_BRAKE_FRAMES) {
        r.facing = r.facing === 1 ? -1 : 1;
        r.rest = RUNNER_REST_FRAMES;
        go('idle');
      }
      return { vx: 0, frame: 2 };
  }
}

// ------------------------------------------------------------------ Clock Spike

export type SpikeState = 'idle' | 'charge' | 'fire';

export interface Spike {
  state: SpikeState;
  frames: number;
  cooldown: number;
  /** The open side it faces (it is mounted on the other). */
  facing: 1 | -1;
}

export const newSpike = (facing: 1 | -1): Spike => ({ state: 'idle', frames: 0, cooldown: 30, facing });

export interface SpikeOut {
  /** Sheet frame: 0 idle, 1 charging, 2 fire. */
  frame: 0 | 1 | 2;
  /** True on the frame it fires (straight along `facing`). */
  fire: boolean;
}

/**
 * Clock Spike, one frame. When Bob is in front of it, about level and within range, it charges
 * (the hand spins and the face flashes), fires one spike straight ahead, then cools down.
 */
export function stepSpike(k: Spike, bob: { dx: number; dy: number } | null): SpikeOut {
  k.frames++;
  if (k.cooldown > 0) k.cooldown--;
  const go = (state: SpikeState) => {
    k.state = state;
    k.frames = 0;
  };
  switch (k.state) {
    case 'idle': {
      const inFront = bob && bob.dx * k.facing > 0 && Math.abs(bob.dx) <= SPIKE_SIGHT_X && Math.abs(bob.dy) <= SPIKE_SIGHT_Y;
      if (k.cooldown === 0 && inFront) go('charge');
      return { frame: 0, fire: false };
    }
    case 'charge':
      if (k.frames >= SPIKE_CHARGE_FRAMES) {
        go('fire');
        return { frame: 2, fire: true };
      }
      return { frame: Math.floor(k.frames / 4) % 2 === 0 ? 1 : 0, fire: false };
    case 'fire':
      if (k.frames >= SPIKE_FIRE_FRAMES) {
        k.cooldown = SPIKE_COOLDOWN_FRAMES;
        go('idle');
      }
      return { frame: 2, fire: false };
  }
}

// ------------------------------------------------------------------ Void Eye

export type EyeState = 'idle' | 'wide' | 'glitch' | 'gone';

export interface Eye {
  state: EyeState;
  frames: number;
  /** Where it floats around (it reappears near here, never far). */
  homeX: number;
  homeY: number;
}

export const newEye = (x: number, y: number): Eye => ({ state: 'idle', frames: 0, homeX: x, homeY: y });

export interface EyeOut {
  /** Sheet frame: 0 idle, 1 eye wide (about to shoot), 2 glitching out, 3 gone. */
  frame: 0 | 1 | 2 | 3;
  /** Hit and harmful (false while gone). */
  solid: boolean;
  /** Fire a cursor at Bob this frame. */
  fire: boolean;
  /** Reappear here this frame. */
  moveTo?: { x: number; y: number };
}

/**
 * Void Eye, one frame. Floats; when Bob is near it opens its eye wide (the warning), shoots a
 * cursor at him, glitches out, stays gone a moment (untouchable) and reappears near home.
 * `rand` (0..1) picks where it reappears, so the behaviour is testable.
 */
export function stepEye(e: Eye, bob: { dx: number; dy: number } | null, rand: () => number): EyeOut {
  e.frames++;
  const go = (state: EyeState) => {
    e.state = state;
    e.frames = 0;
  };
  switch (e.state) {
    case 'idle':
      if (e.frames >= EYE_IDLE_FRAMES && bob && Math.hypot(bob.dx, bob.dy) <= EYE_SIGHT) go('wide');
      return { frame: 0, solid: true, fire: false };
    case 'wide':
      if (e.frames >= EYE_WIDE_FRAMES) {
        go('glitch');
        return { frame: 2, solid: true, fire: true };
      }
      return { frame: 1, solid: true, fire: false };
    case 'glitch':
      if (e.frames >= EYE_GLITCH_FRAMES) go('gone');
      return { frame: 2, solid: true, fire: false };
    case 'gone':
      if (e.frames >= EYE_GONE_FRAMES) {
        go('idle');
        const a = rand() * Math.PI * 2;
        return { frame: 0, solid: true, fire: false, moveTo: { x: e.homeX + Math.cos(a) * EYE_HOP, y: e.homeY + Math.sin(a) * EYE_HOP * 0.5 } };
      }
      return { frame: 3, solid: false, fire: false };
  }
}

// ------------------------------------------------------------------ Dangling Ref

/** Swing angle (radians, 0 = straight down) of a pendulum at `frame`, started at `phase`. */
export const dangleAngle = (frame: number, phase = 0): number => DANGLE_AMP * Math.sin(((frame + phase) / DANGLE_PERIOD) * Math.PI * 2);

/** Sheet frame for an angle: 0 swung left, 1 center, 2 swung right. */
export const dangleFrame = (angle: number): 0 | 1 | 2 => (angle < -0.3 ? 0 : angle > 0.3 ? 2 : 1);

// ------------------------------------------------------------------ Legacy Turret

export type TurretState = 'idle' | 'aim' | 'fire';

export interface Turret {
  state: TurretState;
  frames: number;
  cooldown: number;
  facing: 1 | -1;
}

export const newTurret = (): Turret => ({ state: 'idle', frames: 0, cooldown: 40, facing: -1 });

export interface TurretOut {
  /** Sheet frame: 0 idle, 1 aiming (the warning), 2 firing. */
  frame: 0 | 1 | 2;
  /** Fire a card along this unit direction this frame. */
  fire?: { dx: number; dy: number };
}

/** Legacy Turret, one frame: turns to Bob in range, aims (the warning), fires one aimed card, cools down. */
export function stepTurret(t: Turret, bob: { dx: number; dy: number } | null): TurretOut {
  t.frames++;
  if (t.cooldown > 0) t.cooldown--;
  const go = (state: TurretState) => {
    t.state = state;
    t.frames = 0;
  };
  if (bob && bob.dx !== 0 && t.state === 'idle') t.facing = bob.dx < 0 ? -1 : 1;
  switch (t.state) {
    case 'idle':
      if (bob && t.cooldown === 0 && Math.hypot(bob.dx, bob.dy) <= TURRET_SIGHT) go('aim');
      return { frame: 0 };
    case 'aim':
      if (t.frames >= TURRET_AIM_FRAMES) {
        go('fire');
        const len = bob ? Math.hypot(bob.dx, bob.dy) || 1 : 1;
        return { frame: 2, fire: bob ? { dx: bob.dx / len, dy: bob.dy / len } : { dx: t.facing, dy: 0 } };
      }
      return { frame: 1 };
    case 'fire':
      if (t.frames >= TURRET_FIRE_FRAMES) {
        t.cooldown = TURRET_COOLDOWN_FRAMES;
        go('idle');
      }
      return { frame: 2 };
  }
}

// ------------------------------------------------------------------ Deprecated Bot

export type BotState = 'walk' | 'guard' | 'punch' | 'open';

export interface Bot {
  state: BotState;
  frames: number;
  facing: 1 | -1;
}

export const newBot = (): Bot => ({ state: 'walk', frames: 0, facing: -1 });

export interface BotOut {
  vx: number;
  /** Sheet frame: 0-1 walking, 2 guard (wind-up), 3 punch / open. */
  frame: 0 | 1 | 2 | 3;
  /** The shield is in front: basic shots from the side it faces bounce off. */
  shielded: boolean;
}

/**
 * Deprecated Bot, one frame. Walks at Bob behind its shield (turning at walls and ledges);
 * close and level with him it guards (the warning), punches forward, then stands open,
 * shield away, before walking on.
 */
export function stepBot(b: Bot, s: WalkerSense, bob: { dx: number; dy: number } | null, speed: number): BotOut {
  b.frames++;
  const go = (state: BotState) => {
    b.state = state;
    b.frames = 0;
  };
  switch (b.state) {
    case 'walk': {
      if (bob && bob.dx !== 0) b.facing = bob.dx < 0 ? -1 : 1;
      if (bob && s.onGround && Math.abs(bob.dx) <= BOT_REACH && Math.abs(bob.dy) <= 24) {
        go('guard');
        return { vx: 0, frame: 2, shielded: true };
      }
      const blocked = s.wallAhead || !s.floorAhead;
      return { vx: blocked || !s.onGround ? 0 : b.facing * speed, frame: Math.floor(b.frames / 10) % 2 === 0 ? 0 : 1, shielded: true };
    }
    case 'guard':
      if (b.frames >= BOT_GUARD_FRAMES) {
        go('punch');
        return { vx: s.floorAhead ? b.facing * BOT_PUNCH_SPEED : 0, frame: 3, shielded: false };
      }
      return { vx: 0, frame: 2, shielded: true };
    case 'punch':
      if (b.frames >= BOT_PUNCH_FRAMES) go('open');
      return { vx: s.floorAhead && !s.wallAhead ? b.facing * BOT_PUNCH_SPEED : 0, frame: 3, shielded: false };
    case 'open':
      if (b.frames >= BOT_OPEN_FRAMES) go('walk');
      return { vx: 0, frame: 3, shielded: false };
  }
}

/** A shot travelling from `shotX` meets a bot's shield when it comes from the side the bot faces. */
export const shieldBlocks = (bot: { shielded: boolean; facing: 1 | -1; x: number }, shotX: number): boolean =>
  bot.shielded && (shotX - bot.x) * bot.facing > 0;
