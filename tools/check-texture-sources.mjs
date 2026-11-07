/** Verify decoded PNG identity; Phaser's loader uses revoked blob URLs, so compare pixels. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkTextureSources(send, manifest, baseUrl, output, sceneName, reportName = sceneName.toLowerCase()) {
  const response = await send('Runtime.evaluate', {
    expression: `(async () => {
      const manifest = ${JSON.stringify(manifest)}, base = ${JSON.stringify(baseUrl + '/')};
      const game = window.__game;
      const canvasFor = image => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        canvas.getContext('2d', {willReadFrequently:true}).drawImage(image,0,0);
        return canvas;
      };
      const digest = async image => {
        const c = canvasFor(image), data = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
        const hash = await crypto.subtle.digest('SHA-256',data);
        return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
      };
      const verify = async (image,expected,entry) => {
        if(!(image instanceof HTMLImageElement)) throw new Error(entry.key+': generated source, expected PNG image');
        if(image.naturalWidth!==expected.width || image.naturalHeight!==expected.height
          || expected.width!==entry.frameWidth*entry.frames || expected.height!==entry.frameHeight) {
          throw new Error(entry.key+': source dimensions do not match PNG');
        }
        const actualHash=await digest(image), expectedHash=await digest(expected);
        if(actualHash!==expectedHash) throw new Error(entry.key+': loaded pixels differ from PNG');
        return actualHash;
      };
      const rejects = async (image,expected,entry,reason) => {
        try { await verify(image,expected,entry); return false; }
        catch(error) { if(!error.message.includes(reason)) throw error; return true; }
      };
      const rows = [];
      // Keep decoding bounded while covering every registered texture, not just visible ones.
      let next = 0;
      await Promise.all(Array.from({length:8},async () => {
        while(next < manifest.length) {
          const entry = manifest[next++], texture = game.textures.get(entry.key);
          const image = texture.getSourceImage();
          const file = await fetch(new URL(entry.file,base),{cache:'no-store'});
          if(!file.ok) throw new Error(entry.key+': expected PNG unavailable');
          const expected = await createImageBitmap(await file.blob());
          try {
            const actualHash = await verify(image,expected,entry);
            rows.push({key:entry.key,file:entry.file,width:expected.width,height:expected.height,sha256:actualHash});
          } finally { expected.close(); }
        }
      }));
      const { generatePlaceholder } = await import('/src/systems/placeholders.ts');
      const controlKey = 'art-audit-placeholder-control';
      const original = game.textures.get(manifest[0].key).getSourceImage();
      const reference = await createImageBitmap(original);
      const control = {key:controlKey,frameWidth:reference.width,frameHeight:reference.height,frames:1};
      let placeholderDetected, alteredImageDetected;
      try {
        generatePlaceholder(game.scene.getScene(${JSON.stringify(sceneName)}),{
          ...control,placeholder:{color:0xff0000,shape:'fx'}
        });
        placeholderDetected = await rejects(game.textures.get(controlKey).getSourceImage(),reference,control,'generated source');
        const copy = canvasFor(original), ctx = copy.getContext('2d'), pixel = ctx.getImageData(0,0,1,1);
        pixel.data[3] = pixel.data[3]===255 ? 0 : 255;
        ctx.putImageData(pixel,0,0);
        const altered = new Image(); altered.src = copy.toDataURL('image/png'); await altered.decode();
        alteredImageDetected = await rejects(altered,reference,control,'loaded pixels differ');
      } finally {
        reference.close();
        if(game.textures.exists(controlKey)) game.textures.remove(controlKey);
      }
      const bindings = [];
      if(${JSON.stringify(sceneName)}==='Stage') {
        const { ENEMIES } = await import('/src/data/enemies.ts');
        const stage = game.scene.getScene('Stage');
        const bind = (role,actual,expected) => {
          if(actual!==expected) throw new Error(role+': wrong texture binding '+actual+' / '+expected);
          bindings.push({role,texture:actual});
        };
        if(!stage.player.texture.key.startsWith('bob_') || stage.player.frame.realWidth!==48 || stage.player.frame.realHeight!==48) {
          throw new Error('Player is not using a Bob pose sheet');
        }
        bindings.push({role:'player',texture:stage.player.texture.key});
        for(const enemy of stage.enemies.getChildren()) bind('enemy:'+enemy.kind,enemy.texture.key,ENEMIES[enemy.kind].sheet);
        for(const terminal of stage.checkpoints) bind('checkpoint',terminal.texture.key,'checkpoint');
        if(stage.door) bind('bossDoor',stage.door.texture.key,'boss_door');
        // TileSprite renders through a generated canvas; displayTexture is its source pattern.
        stage.parallax.forEach((layer,i)=>bind('parallax:'+i,layer.displayTexture.key,stage.def.parallax[i]));
        bind('terrain',stage.layer.tileset[0].name,stage.def.tileset);
        for(const mover of stage.movers ?? []) bind('movingPlatform',mover.texture.key,'moving_platform');
        if(stage.goo) bind('risingGoo',stage.goo.displayTexture.key,stage.def.tileset);
      }
      return {textures:rows.sort((a,b)=>a.key.localeCompare(b.key)),bindings,placeholderDetected,alteredImageDetected};
    })()`,
    awaitPromise:true, returnByValue:true,
  });
  if(response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  const report=response.result.value;
  if(!report.placeholderDetected || !report.alteredImageDetected || report.textures.length!==manifest.length) {
    throw new Error('Texture identity guard failed');
  }
  await writeFile(join(output,'texture-sources-'+reportName+'.json'),JSON.stringify(report,null,2)+'\n');
  return {verifiedPngSources:report.textures.length,activeBindingsVerified:report.bindings.length,
    placeholderControlDetected:true,alteredImageControlDetected:true};
}
