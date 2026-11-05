/**
 * Asset manifest. Every spritesheet the game uses is declared here with its final key and
 * frame size. If `file` is missing (or fails to load), Boot generates a placeholder with the
 * same key and frame layout, so swapping in real art never requires code changes.
 */
export interface SheetDef {
  key: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  /** Path under /public, e.g. 'assets/bob/bob_idle.png'. */
  file?: string;
  /** Placeholder look. */
  placeholder: { color: number; shape: 'body' | 'tile' | 'spike' | 'platform' };
}

export const BOB_FRAME = 48;
export const TILE = 16;

const bob = (name: string, frames: number): SheetDef => ({
  key: `bob_${name}`,
  frameWidth: BOB_FRAME,
  frameHeight: BOB_FRAME,
  frames,
  placeholder: { color: 0x0f62fe, shape: 'body' },
});

export const SHEETS: SheetDef[] = [
  // Bob (inventory in docs/art-prompts.md)
  bob('idle', 3),
  bob('run', 6),
  bob('jump', 5), // takeoff, rise, apex, fall, land
  bob('shoot', 7), // stand, jump, fall, run x4
  bob('dash', 4), // start, dash, stop, dash-shoot
  bob('wall', 3), // slide, slide-shoot, kick
  bob('hurt', 2),
  bob('compile', 5),
  bob('victory', 2),
  // Test tiles: 0 solid, 1 background wall, 2 spike, 3 one-way platform
  {
    key: 'tiles_test',
    frameWidth: TILE,
    frameHeight: TILE,
    frames: 4,
    placeholder: { color: 0x6f6f6f, shape: 'tile' },
  },
];

export const sheetByKey = (key: string): SheetDef => {
  const def = SHEETS.find((s) => s.key === key);
  if (!def) throw new Error(`Unknown sheet: ${key}`);
  return def;
};
