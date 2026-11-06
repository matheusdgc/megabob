/** Read-only engine QA, called from check-assets.mjs in its isolated browser. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkAnimationLoops(send, root, output) {
  const review = JSON.parse(await readFile(join(root, 'art/exports/bob-animation-review.json'), 'utf8'));
  const hash = createHash('sha256').update(await readFile(join(root, 'src/systems/bobPose.ts'))).digest('hex');
  if (hash !== review.loopsSourceSha256) throw new Error('Regenerate the animation review: BOB_LOOPS changed');
  const results = [];
  for (const [anim, definition] of Object.entries(review.loops)) {
    const response = await send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__game, anim = ${JSON.stringify(anim)}, def = ${JSON.stringify(definition)};
        if (game.scene.keys.ArtPresentationCheck) game.scene.remove('ArtPresentationCheck');
        if (game.scene.keys.ArtAnimationCheck) game.scene.remove('ArtAnimationCheck');
        game.scene.add('ArtAnimationCheck', { create() {
          this.cameras.main.setBackgroundColor('#161616');
          this.reviewSprites = [];
          for (let mask = 0; mask < 16; mask++) {
            const sheet = 'bob_' + anim + (mask ? '_a' + mask : '');
            const key = 'art-review:' + sheet;
            this.anims.create({ key, frames: def.frames.map(frame => ({ key: sheet, frame })), frameRate: def.fps, repeat: -1 });
            const x = mask % 4 * 120 + 36, y = Math.floor(mask / 4) * 60 + 8;
            const sprite = this.add.sprite(x, y, sheet).setOrigin(0).play(key);
            sprite.anims.pause();
            this.add.text(x, y + 48, 'a' + mask + ' / ' + anim,
              { fontFamily: 'monospace', fontSize: '8px', color: '#e0e0e0' });
            this.reviewSprites.push(sprite);
          }
        } }, true);
        const scene = game.scene.getScene('ArtAnimationCheck');
        return scene.reviewSprites.map((sprite, mask) => {
          const observed = [];
          for (let i = 0; i < def.frames.length; i++) {
            observed.push(Number(sprite.frame.name));
            sprite.anims.resume();
            sprite.anims.update(0, 1000 / def.fps + 0.000001);
            sprite.anims.pause();
          }
          return { mask, observed, wrap: Number(sprite.frame.name), fps: sprite.anims.currentAnim.frameRate };
        });
      })()`,
      returnByValue: true,
    });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    const rows = response.result.value;
    if (rows.length !== 16 || rows.some(row => JSON.stringify(row.observed) !== JSON.stringify(definition.frames)
      || row.wrap !== definition.frames[0] || row.fps !== definition.fps)) {
      throw new Error(`${anim}: engine cycle mismatch: ${JSON.stringify(rows)}`);
    }
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(output, `browser-animation-${anim}.png`), Buffer.from(screenshot.data, 'base64'));
    results.push({ anim, fps: definition.fps, armorVariants: rows.length,
      verifiedFramePositions: rows.length * definition.frames.length, wrapVerified: true });
  }
  return results;
}
