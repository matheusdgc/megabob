import { dbToGain, sliderToGain } from '../systems/audioMath';

/** Settings sliders, 0..1 (the options screen, T13b, edits them; registry `volume`). */
export interface Volumes {
  master: number;
  music: number;
  sfx: number;
}

export const DEFAULT_VOLUMES: Volumes = { master: 0.8, music: 0.7, sfx: 0.8 };
export const VOLUME = 'volume';

/**
 * The mixing graph: every sound goes into a bus, never straight to the speakers.
 *   music tracks -> duck -> music -> master -> output
 *   sfx, jingles ->          sfx  -> master
 * Sliders set the bus gains; ducking uses its own bus so it never overwrites the player's
 * music volume.
 */
export class Mixer {
  readonly master: GainNode;
  readonly music: GainNode;
  readonly duckBus: GainNode;
  readonly sfx: GainNode;
  private volumes: Volumes = { ...DEFAULT_VOLUMES };
  private muted = false;

  constructor(readonly ctx: AudioContext) {
    this.master = ctx.createGain();
    this.music = ctx.createGain();
    this.duckBus = ctx.createGain();
    this.sfx = ctx.createGain();
    this.master.connect(ctx.destination);
    this.music.connect(this.master);
    this.duckBus.connect(this.music);
    this.sfx.connect(this.master);
    this.apply();
  }

  setVolumes(v: Partial<Volumes>): void {
    this.volumes = { ...this.volumes, ...v };
    this.apply();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.apply();
    return this.muted;
  }

  /** Dip the music by `db` (negative) over `ms`, e.g. under a jingle; `unduck()` brings it back. */
  duck(db: number, ms = 150): void {
    this.ramp(this.duckBus.gain, dbToGain(db), ms);
  }

  unduck(ms = 400): void {
    this.ramp(this.duckBus.gain, 1, ms);
  }

  private apply(): void {
    const v = this.volumes;
    this.ramp(this.master.gain, this.muted ? 0 : sliderToGain(v.master), 30);
    this.ramp(this.music.gain, sliderToGain(v.music), 30);
    this.ramp(this.sfx.gain, sliderToGain(v.sfx), 30);
  }

  /** Short ramps instead of jumps, so volume changes never click. */
  private ramp(p: AudioParam, to: number, ms: number): void {
    const t = this.ctx.currentTime;
    p.cancelScheduledValues(t);
    p.setValueAtTime(p.value, t);
    p.linearRampToValueAtTime(to, t + ms / 1000);
  }
}
