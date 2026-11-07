/** Real component states over the T1 art; no production scene or rule changes. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkStageInteractives(send, output) {
  const response = await send('Runtime.evaluate', {
    expression: `(async () => {
      const { Checkpoint } = await import('/src/entities/Checkpoint.ts');
      const { BossDoor } = await import('/src/entities/BossDoor.ts');
      const game = window.__game;
      const rect = (x,y,w,h) => ({x,y,width:w,height:h,left:x,right:x+w,top:y,bottom:y+h});
      let report;
      game.scene.add('ArtInteractiveCheck', { create() {
        this.cameras.main.setBackgroundColor('#161616');
        const backgrounds = ['far','mid','near'].map((depth,i) =>
          this.add.image(0,0,'t1_memory_leak_'+depth+'_wide').setOrigin(0).setDepth(-10+i));
        this.add.tileSprite(0,240,480,16,'tiles_memory_leak',0).setOrigin(0);
        this.add.tileSprite(0,256,480,14,'tiles_memory_leak',1).setOrigin(0);
        const text = (x,y,label) => this.add.text(x,y,label,{fontFamily:'monospace',fontSize:'8px',color:'#e0e0e0'});
        this.add.rectangle(0,0,480,24,0x161616).setOrigin(0);
        text(8,8,'CHECKPOINTS E PORTA / ESTADOS REAIS');
        const off = new Checkpoint(this,88,240), on = new Checkpoint(this,168,240);
        const spot = {...on.spot};
        const away = on.check(rect(0,0,14,30));
        const activated = on.check(rect(on.x-7,210,14,30));
        const repeat = on.check(rect(on.x-7,210,14,30));
        const closed = new BossDoor(this,250,240), half = new BossDoor(this,326,240), open = new BossDoor(this,402,240);
        const touch = door => rect(door.body.x-14,210,14,30);
        const originalBody = [open.body.width,open.body.height];
        half.step(touch(half));
        for(let i=0;i<4;i++) half.step(touch(half));
        open.step(touch(open));
        for(let i=0;i<16;i++) open.step(touch(open));
        const openState = {state:open.state,frame:Number(open.frame.name),blocking:open.body.enable};
        const past = rect(open.body.right+25,210,14,30);
        open.step(past);
        let shuts=0;
        for(let i=0;i<16;i++) if(open.step(past)==='shut') shuts++;
        const shutState = {state:open.state,frame:Number(open.frame.name),blocking:open.body.enable};
        open.reset();
        const resetState = {state:open.state,frame:Number(open.frame.name),blocking:open.body.enable};
        const bodyStable = JSON.stringify(originalBody)===JSON.stringify([open.body.width,open.body.height]);
        // Leave the last sample genuinely open for the visual comparison.
        open.step(touch(open));
        for(let i=0;i<16;i++) open.step(touch(open));
        text(72,194,'DESLIGADO');text(160,194,'LIGADO');
        text(244,178,'FECHADA');text(316,178,'ABRINDO');text(400,178,'ABERTA');
        report = {
          checkpoint:{away,activated,repeat,frames:[Number(off.frame.name),Number(on.frame.name)],spotStable:JSON.stringify(spot)===JSON.stringify(on.spot),
            aboveBackground:off.depth>Math.max(...backgrounds.map(layer=>layer.depth))},
          door:{closedFrame:Number(closed.frame.name),halfFrame:Number(half.frame.name),open:openState,shut:shutState,reset:resetState,shuts,bodyStable}
        };
        this.scene.pause();
      } },true);
      return report;
    })()`,
    awaitPromise:true, returnByValue:true,
  });
  if(response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  const report=response.result.value,c=report.checkpoint,d=report.door;
  await writeFile(join(output,'stage-interactives-report.json'),JSON.stringify(report,null,2)+'\n');
  if(c.away || !c.activated || c.repeat || !c.spotStable || !c.aboveBackground || JSON.stringify(c.frames)!=='[0,1]'
    || d.closedFrame!==0 || d.halfFrame!==1 || d.open.frame!==2 || d.open.state!=='open' || d.open.blocking
    || d.shut.state!=='shut' || d.shut.frame!==0 || !d.shut.blocking || d.shuts!==1
    || d.reset.state!=='closed' || d.reset.frame!==0 || !d.reset.blocking || !d.bodyStable) {
    throw new Error('Interactive presentation regression: '+JSON.stringify(report));
  }
  await new Promise(resolve=>setTimeout(resolve,100));
  const bounds=await send('Runtime.evaluate',{
    expression:`(() => {const r=window.__game.canvas.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`,returnByValue:true,
  });
  const screenshot=await send('Page.captureScreenshot',{format:'png',clip:bounds.result.value});
  await writeFile(join(output,'browser-memory-interactives.png'),Buffer.from(screenshot.data,'base64'));
  return report;
}
