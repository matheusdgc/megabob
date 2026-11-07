/** Static camera samples of the actual stage, in an isolated QA browser. */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function captureStageColors(send, output, label) {
  if (!['before', 'after'].includes(label)) throw new Error('Expected before/after color review');
  const folder = join(output, 'memory-contrast-' + label);
  await mkdir(folder, { recursive: true });
  await send('Runtime.evaluate', { expression: `(() => {
    const s = window.__game.scene.getScene('Stage');
    s.fx.hold('art-color-review');
    s.cameras.main.stopFollow().setBounds(0, 0, s.worldWidth, s.worldHeight);
  })()` });
  for (const [name, x, y] of [['entrance', 0, 546], ['platforms', 544, 546], ['shaft', 1024, 350], ['boss-room', 2304, 2]]) {
    await send('Runtime.evaluate', { expression: `window.__game.scene.getScene('Stage').cameras.main.setScroll(${x}, ${y})` });
    // Let the camera and parallax render once with physics held.
    await new Promise(resolve => setTimeout(resolve, 100));
    const bounds = await send('Runtime.evaluate', {
      expression: `(() => { const r = window.__game.canvas.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}; })()`,
      returnByValue: true,
    });
    const screenshot = await send('Page.captureScreenshot', { format: 'png', clip: bounds.result.value });
    await writeFile(join(folder, name + '.png'), Buffer.from(screenshot.data, 'base64'));
  }
  return { label, samples: ['entrance', 'platforms', 'shaft', 'boss-room'] };
}
