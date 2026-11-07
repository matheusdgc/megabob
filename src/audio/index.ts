import Phaser from 'phaser';
import { MUSIC, type MusicId, musicKey } from '../data/music';
import { DEFAULT_VOLUMES, Mixer, VOLUME, type Volumes } from './mixer';
import { MusicPlayer } from './musicPlayer';
import { Synth } from './synth';

const systems = new WeakMap<Phaser.Game, GameAudio>();

/**
 * The game's audio: one mixer, music player and synth per game, on Phaser's WebAudio context
 * (Phaser unlocks it on the first click or key press; sounds asked for before then start
 * when it unlocks). M toggles mute anywhere.
 */
export class GameAudio {
  readonly mixer: Mixer;
  readonly music: MusicPlayer;
  readonly sfx: Synth;

  private constructor(game: Phaser.Game, ctx: AudioContext) {
    this.mixer = new Mixer(ctx);
    this.mixer.setVolumes({ ...DEFAULT_VOLUMES, ...(game.registry.get(VOLUME) as Partial<Volumes> | undefined) });
    this.music = new MusicPlayer(this.mixer, game.cache.audio);
    this.sfx = new Synth(this.mixer);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && !e.repeat) this.mixer.toggleMute();
    });
  }

  /** The game's audio, or null when the browser gives no WebAudio (the game then runs silent). */
  static of(game: Phaser.Game): GameAudio | null {
    let a = systems.get(game);
    if (!a && game.sound instanceof Phaser.Sound.WebAudioSoundManager) {
      a = new GameAudio(game, game.sound.context);
      systems.set(game, a);
      if (import.meta.env.DEV) (window as unknown as { __audio: GameAudio }).__audio = a;
    }
    return a ?? null;
  }
}

/** Queue the tracks a scene needs in its preload (already decoded ones are skipped). */
export function loadMusic(scene: Phaser.Scene, ids: readonly MusicId[]): void {
  for (const id of ids) if (!scene.cache.audio.exists(musicKey(id))) scene.load.audio(musicKey(id), MUSIC[id].file);
}
