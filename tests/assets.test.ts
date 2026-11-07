import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FX, SHEETS } from '../src/data/assets';
import { PROCESSED_ART } from '../src/data/processedArt';

/** PNG width/height from the IHDR chunk. */
const pngSize = (path: string) => {
  const b = readFileSync(path);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};

describe('asset manifest matches the files in public/', () => {
  const withFiles = SHEETS.filter((s) => s.file);

  it('has unique keys', () => {
    const keys = SHEETS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(withFiles.map((s) => [s.key, s] as const))('%s exists with the declared frame layout', (_k, s) => {
    const path = join('public', s.file!);
    expect(existsSync(path), `${path} missing: run python tools/sprites.py`).toBe(true);
    const { w, h } = pngSize(path);
    expect(w).toBe(s.frameWidth * s.frames);
    expect(h).toBe(s.frameHeight);
  });
});

describe('every sheet that is loaded is shown somewhere (no art left behind a placeholder look)', () => {
  const manifests = ['data/processedArt.ts', 'data/assets.ts'];
  const code = readdirSync('src', { recursive: true })
    .map((f) => f.replaceAll('\\', '/'))
    .filter((f) => f.endsWith('.ts') && !manifests.includes(f))
    .map((f) => readFileSync(join('src', f), 'utf8'))
    .join('\n');
  const keys = [...PROCESSED_ART.map((s) => s.key), ...Object.keys(FX)];

  /** Kept from the art batch but replaced in the game by a better version, named here. */
  const SUPERSEDED: Record<string, string> = {
    hud_health_frame: 'hud_meter_frame',
    hud_health_segment: 'hud_segment_blue',
    hud_weapon_segment: 'hud_segment_yellow',
    title_logo: 'title_logo_night',
  };
  const used = (key: string) => new RegExp(`\\b${key}\\b`).test(code);

  it.each(keys)('%s is used by the game', (key) => {
    // a 480×270 `_wide` variant replaces the original framing
    const by = SUPERSEDED[key] ?? (keys.includes(`${key}_wide`) ? `${key}_wide` : undefined);
    if (by) expect(used(by), `${key} is replaced by ${by}, which must be used`).toBe(true);
    else expect(used(key), `${key} is loaded but never shown`).toBe(true);
  });
});
