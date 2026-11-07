/** Static camera inspection of real T3 map placements, not a traversal test. */
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';

export async function captureNullContext(send, output) {
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const original = await evaluate(`(() => {
    const game = window.__game, s = game.scene.getScene('Stage'), cam = s.cameras.main;
    if (s.def.id !== 'nullPointer') throw new Error('Expected the actual Null Pointer stage');
    s.fx.hold('art-null-context');
    const state = {section:s.section, x:cam.scrollX, y:cam.scrollY,
      visibility:game.domContainer?.style.visibility ?? ''};
    cam.stopFollow();
    if (game.domContainer) game.domContainer.style.visibility = 'hidden';
    return state;
  })()`);
  const report = { stage: 'nullPointer', scope: 'Static camera samples; original map placements, no traversal claim.', samples: [] };
  try {
    for (const [name, section, scroll] of [
      ['first-eye', 0, 100], ['low-ceiling', 0, 340],
      ['thin-walls', 1, 1000], ['vanishing-bridge', 2, 1720],
    ]) {
      const sample = await evaluate(`(() => {
        const s = window.__game.scene.getScene('Stage'), cam = s.cameras.main;
        const room = s.sections[${section}];
        s.spawnEnemies(${section});
        cam.setBounds(room.x, room.y, room.w, room.h).setScroll(${scroll}, 2);
        const enemies = s.enemies.getChildren().filter(e => {
          const r = e.getBounds();
          return r.right > ${scroll} && r.left < ${scroll + 480} && r.bottom > 2 && r.top < 272;
        }).map(e => ({texture:e.texture.key, frame:e.frame.name, x:e.x, y:e.y,
          body:[e.body.width,e.body.height]}));
        return {section:${section}, scroll:[${scroll},2], enemies};
      })()`);
      if (!sample.enemies.length) throw new Error(name + ': no actual map enemies visible');
      await new Promise(resolve => setTimeout(resolve, 100));
      const clip = await evaluate(`(() => {const r=window.__game.canvas.getBoundingClientRect();
        return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
      const screenshot = await send('Page.captureScreenshot', { format: 'png', clip });
      await writeFile(join(output, 'browser-null-context-' + name + '.png'), Buffer.from(screenshot.data, 'base64'));
      report.samples.push({name,...sample});
    }
  } finally {
    await evaluate(`(() => {
      const game=window.__game, s=game.scene.getScene('Stage'), saved=${JSON.stringify(original)};
      s.enterSection(saved.section,true);
      s.cameras.main.setScroll(saved.x,saved.y);
      if(game.domContainer)game.domContainer.style.visibility=saved.visibility;
      s.fx.release('art-null-context');
    })()`);
  }
  const textures = new Set(report.samples.flatMap(s => s.enemies.map(e => e.texture)));
  for (const key of ['enemy_void_eye','enemy_dangling_ref']) {
    if (!textures.has(key)) throw new Error('Missing real map placement: ' + key);
  }
  await writeFile(join(output,'null-context-review.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
