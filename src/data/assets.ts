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

/** Bob animations and their frame counts (inventory in docs/art-prompts.md). */
export const BOB_ANIMS = {
  idle: 3,
  run: 6,
  jump: 5, // takeoff, rise, apex, fall, land
  shoot: 7, // stand, jump, fall, run x4
  dash: 4, // start, dash, stop, dash-shoot
  wall: 3, // slide, slide-shoot, kick
  hurt: 2,
  compile: 5,
  victory: 2,
} as const;
export type BobAnim = keyof typeof BOB_ANIMS;

/**
 * Armor combination id: bitmask of collected Firmware Armor parts. 0 = base Bob,
 * 15 = full armor. Sheets are pre-composed by tools/sprites.py.
 */
export const ARMOR_BITS = { head: 1, arm: 2, body: 4, legs: 8 } as const;
export const FULL_ARMOR = 15;

/** Texture key for a Bob animation with a given armor combination. */
export const bobKey = (anim: BobAnim | 'airdash', armor = 0): string =>
  armor === 0 ? `bob_${anim}` : `bob_${anim}_a${armor}`;

const bobSheet = (key: string, frames: number): SheetDef => ({
  key,
  frameWidth: BOB_FRAME,
  frameHeight: BOB_FRAME,
  frames,
  file: `assets/bob/${key}.png`,
  placeholder: { color: 0x0f62fe, shape: 'body' },
});

const bobSheets = (): SheetDef[] => {
  const out: SheetDef[] = [];
  for (const [anim, frames] of Object.entries(BOB_ANIMS) as [BobAnim, number][]) {
    for (let armor = 0; armor <= FULL_ARMOR; armor++) out.push(bobSheet(bobKey(anim, armor), frames));
  }
  // air dash only exists with the boots; drawn with the full armor
  out.push(bobSheet(bobKey('airdash', FULL_ARMOR), 2));
  return out;
};

export const SHEETS: SheetDef[] = [
  ...bobSheets(),
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
