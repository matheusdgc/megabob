import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SHEETS } from '../src/data/assets';

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
