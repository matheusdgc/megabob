/** Inspect the implemented boss and pooled projectile in a disposable scene. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkBossArt(send, output) {
  const response = await send('Runtime.evaluate', {
    expression: `(async () => {
      const { MemoryLeak } = await import('/src/entities/bosses/MemoryLeak.ts');
      const game = window.__game;
      game.scene.add('ArtBossCheck', { create() {
        this.cameras.main.setBackgroundColor('#161616');
        this.add.image(0, 0, 't1_memory_leak_near_wide').setOrigin(0);
        this.add.tileSprite(0, 240, 480, 16, 'tiles_memory_leak', 0).setOrigin(0);
        this.add.sprite(100, 240, 'bob_idle', 0).setOrigin(0.5, 1);
        this.reviewBoss = new MemoryLeak(this, 340, 240, 270, () => ({x:100,y:240}));
        this.reviewBoss.setArena(0, 480);
        this.scene.pause();
      } }, true);
      const scene = game.scene.getScene('ArtBossCheck'), boss = scene.reviewBoss;
      const seen = new Set();
      for (let i = 0; i < 1100; i++) { boss.step(); seen.add(Number(boss.frame.name)); }
      const blob = boss.goo.getChildren()[0];
      blob.deactivate();
      blob.fire(200, 120, 20); blob.splat(); blob.deactivate(); blob.fire(200, 120, 20);
      const reused = {texture:blob.texture.key, originY:blob.originY, body:[blob.body.width,blob.body.height]};
      const bubbleFrames = new Set();
      for (let i=0;i<18;i++) { blob.stepBlob(1000); bubbleFrames.add(Number(blob.frame.name)); }
      blob.splat();
      const puddleFrames = new Set();
      for (let i=0;i<30;i++) { blob.stepBlob(1000); puddleFrames.add(Number(blob.frame.name)); }
      blob.deactivate();
      boss.hurt(1); boss.step();
      const hurtFrame = Number(boss.frame.name);
      for (let i=0;i<120;i++) boss.step();
      return {frames:[...seen].sort(), reused, bubbleFrames:[...bubbleFrames].sort(), puddleFrames:[...puddleFrames].sort(), hurtFrame};
    })()`,
    awaitPromise: true, returnByValue: true,
  });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  const report = response.result.value;
  await writeFile(join(output, 'boss-art-runtime-report.json'), JSON.stringify(report, null, 2) + '\n');
  if (JSON.stringify(report.frames) !== '[0,1,2,3,4,5]' || report.hurtFrame !== 6
    || report.reused.texture !== 'memory_goo' || report.reused.originY !== 0.5
    || JSON.stringify(report.reused.body) !== '[10,10]'
    || JSON.stringify(report.bubbleFrames) !== '[0,1]' || JSON.stringify(report.puddleFrames) !== '[0,1]') {
    throw new Error('Boss visual regression: ' + JSON.stringify(report));
  }
  await new Promise(resolve => setTimeout(resolve, 100));
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(output, 'browser-boss-memory-leak.png'), Buffer.from(screenshot.data, 'base64'));
  return report;
}
