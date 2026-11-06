/**
 * Largest integer zoom at which a base resolution fits inside the available area.
 * Never returns less than 1, so tiny windows still show the game (cropped by the browser).
 */
export function integerZoom(
  availableWidth: number,
  availableHeight: number,
  baseWidth: number,
  baseHeight: number,
): number {
  const zoom = Math.floor(Math.min(availableWidth / baseWidth, availableHeight / baseHeight));
  return Number.isFinite(zoom) && zoom >= 1 ? zoom : 1;
}

/** Smallest and largest internal resolution accepted by `parseView`. */
const VIEW_MIN = { width: 256, height: 144 };
const VIEW_MAX = { width: 960, height: 540 };

/**
 * Reads a `view=WxH` query parameter (e.g. `?view=640x360`). Anything missing, malformed or
 * outside the allowed range falls back to `fallback`.
 */
export function parseView(
  search: string,
  fallback: { width: number; height: number },
): { width: number; height: number } {
  const match = /^(\d+)x(\d+)$/.exec(new URLSearchParams(search).get('view') ?? '');
  if (!match) return { ...fallback };
  const width = Number(match[1]);
  const height = Number(match[2]);
  const ok =
    width >= VIEW_MIN.width && width <= VIEW_MAX.width && height >= VIEW_MIN.height && height <= VIEW_MAX.height;
  return ok ? { width, height } : { ...fallback };
}
