import type { MusicId } from './music';

/**
 * Who made each track, where it came from and under which license (docs/soundtrack.md has the
 * same table). Every track of the manifest must be here: tests/credits.test.ts checks it, and
 * the credits roll is built from this table, so a new track cannot ship uncredited.
 */
export type MusicLicense = 'CC0' | 'CC-BY 4.0' | 'Pixabay Content License';

export interface TrackCredit {
  title: string;
  author: string;
  license: MusicLicense;
  /** Where the file was downloaded (without https://). */
  source: string;
}

export const MUSIC_CREDITS: Record<MusicId, TrackCredit> = {
  title: { title: 'Factory at Night', author: 'Retro-BGM-Chan', license: 'Pixabay Content License', source: 'pixabay.com/music (#516327)' },
  select: { title: 'Select Mountain', author: 'MintoDog', license: 'CC0', source: 'opengameart.org/content/8bit-action-stage-select' },
  memoryLeak: { title: 'Sewer Nightclub', author: 'Section 31 - Tech (s31tech.org)', license: 'CC0', source: 'opengameart.org/content/sewer-nightclub' },
  raceCondition: { title: 'Castle Stage', author: 'MintoDog', license: 'CC0', source: 'opengameart.org/content/castle-stage' },
  nullPointer: { title: 'CYBER_CELESTE', author: 'GloryToTheMachine', license: 'CC-BY 4.0', source: 'opengameart.org/content/cyberceleste-gl0ryt0th3m4ch1n3' },
  boss: { title: '8bit Action Boss Battle', author: 'MintoDog', license: 'CC0', source: 'opengameart.org/content/8bit-action-boss-battle' },
  fortress: { title: '8-bit - Last Mission', author: 'HydroGene', license: 'CC0', source: 'opengameart.org/content/8-bit-last-mission' },
  techDebt1: { title: 'Boss Fight', author: 'phantasticbeats', license: 'Pixabay Content License', source: 'pixabay.com/music (#301722)' },
  techDebt2: { title: 'Final Stand (Phase 4 FinalMax)', author: 'Centurion_of_war', license: 'CC0', source: 'opengameart.org/content/final-stand-0' },
  credits: { title: 'Legends', author: 'Kim Lightyear (lightyeartraxx)', license: 'Pixabay Content License', source: 'pixabay.com/music (#109307)' },
};

/** Order the tracks appear in the roll: the order the player hears them. */
const ROLL_ORDER: readonly MusicId[] = ['title', 'select', 'memoryLeak', 'raceCondition', 'nullPointer', 'boss', 'fortress', 'techDebt1', 'techDebt2', 'credits'];

/** The roll is 216 px wide at 8 px: split a long path at its slashes so no line overflows. */
export const MAX_LINE = 40;
export function wrapPath(path: string, max = MAX_LINE): string[] {
  const lines: string[] = [];
  let line = '';
  for (const part of path.split(/(?<=\/)/)) {
    if (line && (line + part).length > max) {
      lines.push(line);
      line = '';
    }
    line += part;
  }
  return line ? [...lines, line] : lines;
}

/** One track in the roll: title, author, license; CC-BY also gets its source and license link. */
function trackLines(c: TrackCredit): string[] {
  const lines = [`"${c.title}"`, `por ${c.author}`, c.license];
  if (c.license === 'CC-BY 4.0') lines.push(...wrapPath(c.source), ...wrapPath('creativecommons.org/licenses/by/4.0/'));
  return [...lines, ' ']; // a blank line between tracks
}

export type CreditBlock = readonly [string, ...string[]];

/** The credits, top to bottom (a heading in caps, then its lines). */
export const CREDITS: readonly CreditBlock[] = [
  ['MEGABOB', 'Um jogo de plataforma 16 bits', 'estrelado pelo IBM Bob'],
  ['DESIGN E CÓDIGO', 'Matheus D. Gomes'],
  ['ARTE', 'Sprites, tiles e cenários', 'gerados com o ChatGPT', 'e tratados para o jogo'],
  ['MÚSICA', ...ROLL_ORDER.flatMap((id) => trackLines(MUSIC_CREDITS[id])), 'Todas as faixas recodificadas,', 'com volume igualado e em loop', 'para o jogo'],
  ['EFEITOS SONOROS', 'Sintetizados no código'],
  ['MOTOR', 'Phaser 3'],
  ['OS BUGS', 'Memory Leak', 'Race Condition', 'Null Pointer', 'Tech Debt'],
  ['OBRIGADO', 'por jogar'],
];
