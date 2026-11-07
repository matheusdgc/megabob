import type Phaser from 'phaser';
import { MUSIC, type MusicId, musicKey } from '../data/music';
import { measure, normalizeGain } from '../systems/audioMath';
import type { Mixer } from './mixer';

interface Playing {
  id: MusicId;
  src: AudioBufferSourceNode;
  gain: GainNode;
}

/**
 * One music track at a time. Loops on the decoded samples (AudioBufferSourceNode loopStart /
 * loopEnd), so there is no gap at the seam; switching tracks crossfades over `fadeMs` (0 = cut).
 * Each track's loudness is measured once and matched (normalizeGain).
 */
export class MusicPlayer {
  private current?: Playing;
  private readonly gains = new Map<MusicId, number>();

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
    src.loop = def.loop;
    src.loopStart = def.loopStart;
    src.loopEnd = def.loopEnd ?? buffer.duration;
    const gain = ctx.createGain();
    const level = this.levelOf(id, buffer);
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

  private levelOf(id: MusicId, buffer: AudioBuffer): number {
    let g = this.gains.get(id);
    if (g === undefined) {
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
      g = normalizeGain(measure(channels));
      this.gains.set(id, g);
    }
    return g;
  }
}
