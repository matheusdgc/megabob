/** A camera section, in pixels. The camera never shows anything outside the current one. */
export interface Section {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Once entered, Bob cannot leave (boss rooms). */
  locked?: boolean;
}

/** Sections given in tiles (as stage files declare them) to pixels. */
export const sectionsFromTiles = (list: readonly Section[], tile: number): Section[] =>
  list.map((s) => ({ ...s, x: s.x * tile, y: s.y * tile, w: s.w * tile, h: s.h * tile }));

const inside = (s: Section, x: number, y: number) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h;

/**
 * Which section Bob (at x, y) is in. Stays in `current` while he is still inside it (sections
 * may overlap), never leaves a locked one, and keeps `current` when he is in no section.
 */
export function sectionAt(sections: readonly Section[], x: number, y: number, current: number): number {
  const cur = sections[current];
  if (cur && (cur.locked || inside(cur, x, y))) return current;
  const i = sections.findIndex((s) => inside(s, x, y));
  return i === -1 ? current : i;
}

/**
 * Camera scroll (top-left) that centers `focus` but keeps the view inside the section.
 * A section smaller than the view is centered on that axis.
 */
export function cameraScroll(
  s: Section,
  view: { w: number; h: number },
  focus: { x: number; y: number },
): { x: number; y: number } {
  const axis = (start: number, size: number, viewSize: number, f: number) =>
    size <= viewSize ? start + (size - viewSize) / 2 : Math.min(Math.max(f - viewSize / 2, start), start + size - viewSize);
  return { x: Math.round(axis(s.x, s.w, view.w, focus.x)), y: Math.round(axis(s.y, s.h, view.h, focus.y)) };
}

/** Index of the section containing a point, or -1 (used to file enemies under a section). */
export const sectionOf = (sections: readonly Section[], x: number, y: number): number =>
  sections.findIndex((s) => inside(s, x, y - 1));
