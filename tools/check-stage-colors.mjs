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
  const samples = [['entrance', 0, 546], ['platforms', 544, 546], ['shaft', 1024, 350],
    ['checkpoint', 1504, 2], ['boss-room', 2304, 2], ['rising-goo', 1024, 430]];
  for (const [name, x, y] of samples) {
    await send('Runtime.evaluate', { expression: `(() => {
      const s = window.__game.scene.getScene('Stage');
      s.cameras.main.setScroll(${x}, ${y});
      if (${JSON.stringify(name)} === 'rising-goo') {
        // Static visual sample of the existing flood; no map/timing changes.
        s.goo.setY(${y + 210}); s.gooBody.setY(${y + 226});
      }
    })()` });
    // Let the camera and parallax render once with physics held.
    await new Promise(resolve => setTimeout(resolve, 100));
    const bounds = await send('Runtime.evaluate', {
      expression: `(() => { const r = window.__game.canvas.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}; })()`,
      returnByValue: true,
    });
    const screenshot = await send('Page.captureScreenshot', { format: 'png', clip: bounds.result.value });
    await writeFile(join(folder, name + '.png'), Buffer.from(screenshot.data, 'base64'));
  }
  return { label, samples: samples.map(sample => sample[0]) };
}
