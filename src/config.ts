import { parseView } from './systems/scaling';

/**
 * Default internal resolution. 16:9 so it fills a widescreen window; at ~1080p browsers this
 * renders at 3x (Bob ~108 px tall on screen) and shows 30x17 tiles of the stage.
 */
export const DEFAULT_VIEW = { width: 480, height: 270 } as const;

/** Dev-only `?view=WxH` override, to compare framings without rebuilding. */
const view =
  import.meta.env?.DEV && typeof location !== 'undefined' ? parseView(location.search, DEFAULT_VIEW) : DEFAULT_VIEW;

/** Internal resolution. Everything is drawn at this size, then scaled by an integer zoom. */
export const GAME_WIDTH = view.width;
export const GAME_HEIGHT = view.height;

/** Fixed physics step, in Hz. */
export const PHYSICS_FPS = 60;
