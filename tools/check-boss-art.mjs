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
        for (const depth of ['far', 'mid', 'near']) this.add.image(0, 0, 't1_memory_leak_' + depth + '_wide').setOrigin(0);
        this.add.tileSprite(0, 240, 480, 16, 'tiles_memory_leak', 0).setOrigin(0);
        this.add.tileSprite(0, 256, 480, 14, 'tiles_memory_leak', 1).setOrigin(0);
        this.reviewBob = this.add.sprite(100, 240, 'bob_idle', 0).setOrigin(0.5, 1);
        this.reviewTarget = {x:100,y:240};
        this.reviewBoss = new MemoryLeak(this, 340, 240, 270, () => this.reviewTarget);
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
      const bodyBefore = [boss.body.width, boss.body.height];
      scene.reviewTarget.x = boss.x + 80; boss.step();
      const towardRight = boss.flipX;
      scene.reviewTarget.x = boss.x; boss.step();
      const alignedKeepsDirection = boss.flipX === towardRight;
      scene.reviewTarget.x = boss.x - 80; boss.step();
      const towardLeft = !boss.flipX;
      return {frames:[...seen].sort(), reused, bubbleFrames:[...bubbleFrames].sort(), puddleFrames:[...puddleFrames].sort(), hurtFrame,
        facing:{towardRight,towardLeft,alignedKeepsDirection}, bodyUnchanged:JSON.stringify(bodyBefore) === JSON.stringify([boss.body.width,boss.body.height])};
    })()`,
    awaitPromise: true, returnByValue: true,
  });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  const report = response.result.value;
  await writeFile(join(output, 'boss-art-runtime-report.json'), JSON.stringify(report, null, 2) + '\n');
  if (JSON.stringify(report.frames) !== '[0,1,2,3,4,5]' || report.hurtFrame !== 6
    || report.reused.texture !== 'memory_goo' || report.reused.originY !== 0.5
    || JSON.stringify(report.reused.body) !== '[10,10]'
    || JSON.stringify(report.bubbleFrames) !== '[0,1]' || JSON.stringify(report.puddleFrames) !== '[0,1]'
    || !report.facing.towardRight || !report.facing.towardLeft || !report.facing.alignedKeepsDirection || !report.bodyUnchanged) {
    throw new Error('Boss visual regression: ' + JSON.stringify(report));
  }
  for (const [facing, bossX, bobX] of [['left', 340, 100], ['right', 140, 380]]) {
    await send('Runtime.evaluate', { expression: `(() => {
      const s = window.__game.scene.getScene('ArtBossCheck'), b = s.reviewBoss;
      s.reviewTarget.x = ${bobX}; s.reviewBob.setX(${bobX}).setFlipX(${bossX < bobX});
      b.setPosition(${bossX}, 240); b.step();
      b.setPosition(${bossX}, 240).setAlpha(1).setVisible(true).setFrame(2);
      for (const blob of b.goo.getChildren()) blob.deactivate();
    })()` });
    await new Promise(resolve => setTimeout(resolve, 100));
    const bounds = await send('Runtime.evaluate', {
      expression: `(() => { const r = window.__game.canvas.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}; })()`,
      returnByValue: true,
    });
    const screenshot = await send('Page.captureScreenshot', { format: 'png', clip: bounds.result.value });
    const png = Buffer.from(screenshot.data, 'base64');
    await writeFile(join(output, 'browser-boss-memory-leak-' + facing + '.png'), png);
    if (facing === 'left') await writeFile(join(output, 'browser-boss-memory-leak.png'), png);
  }
  return report;
}
