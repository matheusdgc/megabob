import type Phaser from 'phaser';
import { MUSIC, type MusicId, musicKey } from '../data/music';
import { measure, normalizeGain, snapLoop } from '../systems/audioMath';
import type { Mixer } from './mixer';

interface Playing {
  id: MusicId;
  src: AudioBufferSourceNode;
  gain: GainNode;
}

/**
 * One music track at a time. Loops on the decoded samples (AudioBufferSourceNode loopStart /
 * loopEnd), so there is no gap at the seam; switching tracks crossfades over `fadeMs` (0 = cut).
 * Each track is measured once: its loudness is matched (normalizeGain) and its loop points are
 * moved onto zero crossings (snapLoop), so the seam does not click.
 */
export class MusicPlayer {
  private current?: Playing;
  /** Per track, measured once: loudness gain and click-free loop points. */
  private readonly tuned = new Map<MusicId, { gain: number; start: number; end: number }>();

  constructor(
    private readonly mixer: Mixer,
    private readonly cache: Phaser.Cache.BaseCache,
  ) {}

  get playing(): MusicId | null {
    return this.current?.id ?? null;
  }

  /** Is the track decoded and ready? (Scenes load it in preload.) */
  has(id: MusicId): boolean {
    return this.cache.exists(musicKey(id));
  }

  play(id: MusicId, fadeMs = 0): void {
    if (this.current?.id === id) return;
    const buffer = this.cache.get(musicKey(id)) as AudioBuffer | undefined;
    this.stop(fadeMs);
    if (!buffer) return;
    const ctx = this.mixer.ctx;
    const def = MUSIC[id];
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const tune = this.tune(id, buffer);
    src.loop = def.loop;
    src.loopStart = tune.start;
    src.loopEnd = tune.end;
    const gain = ctx.createGain();
    const level = tune.gain;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(fadeMs > 0 ? 0 : level, t);
    if (fadeMs > 0) gain.gain.linearRampToValueAtTime(level, t + fadeMs / 1000);
    src.connect(gain).connect(this.mixer.duckBus);
    src.start();
    src.onended = () => {
      if (this.current?.src === src) this.current = undefined;
    };
    this.current = { id, src, gain };
  }

  /**
   * Measure a loaded track now (its loudness and loop points) instead of when it first plays.
   * The measurement reads every sample (20-40 ms for a two-minute track on a fast machine), so a
   * scene does it while nothing moves, not at a boss's entrance. False when the track is not loaded.
   */
  prepare(id: MusicId): boolean {
    const buffer = this.cache.get(musicKey(id)) as AudioBuffer | undefined;
    if (!buffer) return false;
    this.tune(id, buffer);
    return true;
  }

  /** Fade the current track out over `fadeMs` (0 = stop now). */
  stop(fadeMs = 0): void {
    const c = this.current;
    if (!c) return;
    this.current = undefined;
    const t = this.mixer.ctx.currentTime;
    const end = t + fadeMs / 1000;
    c.gain.gain.cancelScheduledValues(t);
    c.gain.gain.setValueAtTime(c.gain.gain.value, t);
    c.gain.gain.linearRampToValueAtTime(0, end);
    c.src.stop(end + 0.02);
  }

  private tune(id: MusicId, buffer: AudioBuffer): { gain: number; start: number; end: number } {
    let t = this.tuned.get(id);
    if (!t) {
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
      const def = MUSIC[id];
      t = { gain: normalizeGain(measure(channels)), ...snapLoop(channels, buffer.sampleRate, def.loopStart, def.loopEnd) };
      this.tuned.set(id, t);
    }
    return t;
  }
}
