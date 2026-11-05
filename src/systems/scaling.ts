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
