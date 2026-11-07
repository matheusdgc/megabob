import { JINGLES, type JingleId, jingleDuration, schedule, SFX, type SfxId, type Voice } from '../data/sfx';
import { noteFreq } from '../systems/audioMath';
import type { Mixer } from './mixer';

/** The same effect retriggered faster than this plays once (no stacked, doubled-volume hits). */
const RETRIGGER_S = 0.03;
const SILENT = 0.0001;

/** Plays the synthesized SFX and jingles (src/data/sfx.ts) into the SFX bus. */
export class Synth {
  private readonly noise: AudioBuffer;
  private readonly last = new Map<SfxId, number>();

  constructor(private readonly mixer: Mixer) {
    const ctx = mixer.ctx;
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  play(id: SfxId): void {
    const def = SFX[id];
    const now = this.mixer.ctx.currentTime;
    if (now - (this.last.get(id) ?? -1) < RETRIGGER_S) return;
    this.last.set(id, now);
    const vary = 'vary' in def ? def.vary : 0;
    const pitch = 1 + (Math.random() * 2 - 1) * vary;
    for (const v of def.voices as readonly Voice[]) this.voice(v, now + (v.at ?? 0), pitch);
  }

  /** Plays a jingle; returns its length in seconds. */
  jingle(id: JingleId): number {
    const j = JINGLES[id];
    const t0 = this.mixer.ctx.currentTime + 0.02;
    for (const n of schedule(j.notes, j.bpm)) this.note(j.wave, noteFreq(n.midi), t0 + n.t, n.dur, j.vol);
    if ('bass' in j) for (const n of schedule(j.bass, j.bpm)) this.note('triangle', noteFreq(n.midi), t0 + n.t, n.dur, j.vol * 0.9);
    return jingleDuration(j);
  }

  private voice(v: Voice, t: number, pitch: number): void {
    const ctx = this.mixer.ctx;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(v.vol, t);
    gain.gain.exponentialRampToValueAtTime(SILENT, t + v.dur);
    gain.connect(this.mixer.sfx);
    let src: AudioScheduledSourceNode;
    if (v.wave === 'noise') {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(v.from * pitch, t);
      filter.frequency.exponentialRampToValueAtTime(v.to * pitch, t + v.dur);
      noise.connect(filter).connect(gain);
      src = noise;
    } else {
      const osc = ctx.createOscillator();
      osc.type = v.wave;
      osc.frequency.setValueAtTime(v.from * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(v.to * pitch, t + v.dur);
      osc.connect(gain);
      src = osc;
    }
    src.start(t);
    src.stop(t + v.dur + 0.02);
  }

  /** One jingle note: quick attack, held, short release (chiptune envelope). */
  private note(wave: Voice['wave'], freq: number, t: number, dur: number, vol: number): void {
    if (wave === 'noise') return;
    const ctx = this.mixer.ctx;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    const gain = ctx.createGain();
    const end = t + dur * 0.92;
    gain.gain.setValueAtTime(SILENT, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.setValueAtTime(vol * 0.8, end - 0.03);
    gain.gain.linearRampToValueAtTime(SILENT, end);
    osc.connect(gain).connect(this.mixer.sfx);
    osc.start(t);
    osc.stop(end + 0.02);
  }
}
