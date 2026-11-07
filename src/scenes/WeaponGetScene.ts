import Phaser from 'phaser';
import { bobKey } from '../data/assets';
import { WEAPONS, type WeaponId } from '../data/weapons';
import { GameAudio } from '../audio';
import { GameInput } from '../systems/input';

/** Registry key holding the weapons Bob has won (until the save system, T13). */
export const OWNED_WEAPONS = 'ownedWeapons';

/** Earliest a key press may skip the screen, and when it moves on by itself. */
const MIN_MS = 1500;
const AUTO_MS = 6000;

/**
 * "Weapon get" screen after a boss: Bob absorbs the weapon, its name and how to use it.
 * Records the weapon in the registry, then starts `next` with `nextData` (the stage, until T13's select).
 */
export class WeaponGetScene extends Phaser.Scene {
  private weapon: WeaponId = 'garbageCollector';
  private next = 'Stage';
  private nextData?: object;
  /** Set once MIN_MS has passed. (Not `time.now`: on a scene's first run it is stale until the first update.) */
  private ready = false;
  private controls!: GameInput;

  constructor() {
    super('WeaponGet');
  }

  init(data: { weapon?: WeaponId; next?: string; nextData?: object }): void {
    this.weapon = data.weapon ?? 'garbageCollector';
    this.next = data.next ?? 'Stage';
    this.nextData = data.nextData;
    this.ready = false;
  }

  create(): void {
    const owned = new Set<WeaponId>(this.registry.get(OWNED_WEAPONS) ?? []);
    owned.add(this.weapon);
    this.registry.set(OWNED_WEAPONS, [...owned]);

    const { width: w, height: h } = this.cameras.main;
    const def = WEAPONS[this.weapon];
    this.cameras.main.setBackgroundColor('#001d6c');
    this.add.rectangle(w / 2, h / 2, w, 120, 0x161616).setAlpha(0.85);

    // Bob in the power-up pose, flashing between his colors and the weapon's
    const bob = this.add.sprite(w / 2 - 90, h / 2 + 30, bobKey('victory'), 1).setOrigin(0.5, 1).setScale(2);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 180,
      yoyo: true,
      repeat: 7,
      onUpdate: (t) => (t.getValue()! > 0.5 ? bob.setTint(def.tint) : bob.clearTint()),
      onComplete: () => (def.tint === 0xffffff ? bob.clearTint() : bob.setTint(def.tint)),
    });

    const font = { fontFamily: 'monospace', color: '#e0e0e0' };
    this.add.text(w / 2 - 40, h / 2 - 36, 'WEAPON GET', { ...font, fontSize: '16px', color: '#4589ff' });
    this.add.image(w / 2 - 40, h / 2 - 4, def.icon).setOrigin(0, 0.5);
    this.add.text(w / 2 - 18, h / 2 - 4, def.name, { ...font, fontSize: '12px', color: Phaser.Display.Color.IntegerToColor(def.color).rgba }).setOrigin(0, 0.5);
    this.add.text(w / 2 - 40, h / 2 + 18, 'Q / E  switch weapons', { ...font, fontSize: '8px', color: '#a8a8a8' });
    const prompt = this.add.text(w / 2, h / 2 + 48, 'PRESS Z', { ...font, fontSize: '8px' }).setOrigin(0.5).setVisible(false);

    GameAudio.of(this.game)?.sfx.jingle('weaponGet');
    this.controls = new GameInput(this);
    this.time.delayedCall(MIN_MS, () => {
      this.ready = true;
      prompt.setVisible(true);
    });
    this.time.delayedCall(AUTO_MS, () => this.leave());
  }

  update(): void {
    const s = this.controls.poll();
    if (this.ready && (s.justPressed('jump') || s.justPressed('pause') || s.justPressed('shoot'))) {
      this.leave();
    }
  }

  private leave(): void {
    if (!this.scene.isActive()) return;
    this.scene.start(this.next, this.nextData);
  }
}
