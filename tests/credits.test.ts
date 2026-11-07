import { describe, expect, it } from 'vitest';
import { CREDITS, MAX_LINE, MUSIC_CREDITS, wrapPath } from '../src/data/credits';
import { MUSIC } from '../src/data/music';

const musicBlock = () => CREDITS.find(([head]) => head === 'MUSIC')!.slice(1);

describe('credits', () => {
  it('credit every track of the manifest: author, source and license', () => {
    for (const id of Object.keys(MUSIC) as (keyof typeof MUSIC)[]) {
      const c = MUSIC_CREDITS[id];
      expect(c, id).toBeDefined();
      expect(c.title && c.author && c.source && c.license, id).toBeTruthy();
    }
  });

  it('roll every track, by name and author, with its license', () => {
    const lines = musicBlock();
    for (const c of Object.values(MUSIC_CREDITS)) {
      const at = lines.indexOf(`"${c.title}"`);
      expect(at, c.title).toBeGreaterThanOrEqual(0);
      expect(lines[at + 1]).toBe(`by ${c.author}`);
      expect(lines[at + 2]).toBe(c.license);
    }
  });

  it('give CC-BY tracks their source and license link (attribution is required)', () => {
    const text = musicBlock().join('');
    for (const c of Object.values(MUSIC_CREDITS).filter((c) => c.license === 'CC-BY 4.0')) {
      expect(text).toContain(c.source);
      expect(text).toContain('creativecommons.org/licenses/by/4.0/');
    }
    expect(text).toContain('re-encoded'); // CC-BY asks to say the work was changed
  });

  it('fit every line in the roll window', () => {
    for (const block of CREDITS) for (const line of block) expect(line.length, line).toBeLessThanOrEqual(MAX_LINE);
    expect(wrapPath('a/bb/ccc/', 5)).toEqual(['a/bb/', 'ccc/']);
  });
});
