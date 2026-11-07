/** Actual enemy motion at 60 Hz; captures are a controlled art fixture. */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkNullMotion(send, output, mode = 'after') {
  if (!['before','after'].includes(mode)) throw new Error('Expected before/after');
  const evaluate = async expression => {
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await evaluate(`(async()=>{
    const game=window.__game;
    for(const key of ['ArtNullEnemyCheck','ArtNullMotionCheck'])if(game.scene.keys[key])game.scene.remove(key);
    const {VoidEye}=await import('/src/entities/enemies/VoidEye.ts');
    const {DanglingRef}=await import('/src/entities/enemies/DanglingRef.ts');
    const {EnemyShot}=await import('/src/entities/EnemyShot.ts');
    game.scene.add('ArtNullMotionCheck',{create(){
      for(const depth of ['far','mid','near'])this.add.image(0,0,'t3_null_pointer_'+depth+'_wide').setOrigin(0).setDepth(-10);
      this.add.tileSprite(0,240,480,16,'tiles_null_pointer',0).setOrigin(0);
      this.add.tileSprite(290,128,60,16,'tiles_null_pointer',0).setOrigin(0);
      this.add.sprite(100,240,'bob_idle',0).setOrigin(.5,1);
      this.shots=[];
      const world={bob:()=>({x:100,y:220}),floorAt:()=>true,shoot:(kind,x,y,vx,vy)=>this.shots.push(new EnemyShot(this,kind,x,y,vx,vy))};
      this.eye=new VoidEye(this,190,212,world);this.claw=new DanglingRef(this,320,160,world);
      this.metrics={clawAlignmentError:0,eyeAlignmentError:0,hiddenEyeHarmful:false,bodySizes:new Set()};
      // Match StageScene: enemy logic runs inside WORLD_STEP, before Arcade postUpdate.
      this.physics.world.on('worldstep',()=>{this.eye.step();this.claw.step();});
      this.physics.world.pause();this.scene.pause();
    }},true);
    if(game.domContainer)game.domContainer.style.visibility='hidden';
  })()`);
  const clip=await evaluate(`(()=>{const r=window.__game.canvas.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
  const folder=join(output,'null-motion-'+mode);await mkdir(folder,{recursive:true});
  const frames=[];
  for(let index=0;index<45;index++){
    frames.push(await evaluate(`(()=>{
      const s=window.__game.scene.getScene('ArtNullMotionCheck');
      for(let f=0;f<4;f++){
        s.physics.world.resume();s.physics.world.singleStep();s.physics.world.pause();
        const crop=s.claw._crop;
        if(s.claw.isCropped){
          const x=s.claw.x-s.claw.displayOriginX+crop.x+crop.width/2;
          const y=s.claw.y-s.claw.displayOriginY+crop.y+crop.height/2;
          s.metrics.clawAlignmentError=Math.max(s.metrics.clawAlignmentError,Math.hypot(x-s.claw.body.center.x,y-s.claw.body.center.y));
        }
        s.metrics.eyeAlignmentError=Math.max(s.metrics.eyeAlignmentError,Math.hypot(s.eye.x-s.eye.body.center.x,
          s.eye.y-s.eye.displayOriginY+s.eye.height/2-s.eye.body.center.y));
        if(s.eye.alpha===0&&s.eye.body.enable)s.metrics.hiddenEyeHarmful=true;
        s.metrics.bodySizes.add(s.eye.body.width+'x'+s.eye.body.height+'/'+s.claw.body.width+'x'+s.claw.body.height);
        for(const shot of s.shots.filter(x=>x.active))shot.anims.update(0,1000/60);
      }
      return {eye:[s.eye.x,s.eye.y,s.eye.frame.name,s.eye.alpha,s.eye.body.enable],
        claw:[s.claw.x,s.claw.y,s.claw.frame.name,s.claw.body.center.x,s.claw.body.center.y],
        shots:s.shots.filter(x=>x.active).map(x=>x.frame.name)};
    })()`));
    await new Promise(resolve=>setTimeout(resolve,20));
    const png=await send('Page.captureScreenshot',{format:'png',clip});
    await writeFile(join(folder,String(index).padStart(2,'0')+'.png'),Buffer.from(png.data,'base64'));
  }
  const metrics=await evaluate(`(()=>{
    const game=window.__game,s=game.scene.getScene('ArtNullMotionCheck');
    const snapshot=()=>JSON.stringify([s.eye.x,s.eye.y,s.eye.frame.name,s.eye.alpha,s.claw.x,s.claw.y,s.claw.frame.name,
      s.eye.pixels?.commandBuffer,s.claw.chainPixels?.commandBuffer]);
    const before=snapshot();s.eye.freeze(12);s.claw.freeze(12);
    for(let i=0;i<6;i++){s.eye.step();s.claw.step();}
    const freezeStable=snapshot()===before;
    const probe=s.physics.add.image(s.claw.body.center.x,s.claw.body.center.y,'fx_buster');
    probe.body.setAllowGravity(false).setSize(2,2);probe.body.updateFromGameObject();
    const clawContact=s.physics.overlap(s.claw,probe);
    probe.setPosition(s.claw.pivotX,s.claw.pivotY);probe.body.updateFromGameObject();
    const ceilingHarmless=!s.physics.overlap(s.claw,probe);probe.destroy();
    const graphics=[s.eye.pixels,s.claw.chainPixels].filter(Boolean);
    s.eye.destroy();s.claw.destroy();
    const result={...s.metrics,bodySizes:[...s.metrics.bodySizes],freezeStable,clawContact,ceilingHarmless,ownedGraphics:graphics.length,
      graphicsReleased:graphics.every(g=>!g.scene)};
    game.scene.remove('ArtNullMotionCheck');
    return result;
  })()`);
  if(mode==='after'&&(metrics.clawAlignmentError!==0||metrics.eyeAlignmentError!==0||metrics.hiddenEyeHarmful||!metrics.freezeStable
    ||!metrics.clawContact||!metrics.ceilingHarmless||metrics.ownedGraphics!==2||!metrics.graphicsReleased
    ||metrics.bodySizes.join(',')!=='18x18/18x16'))throw new Error(JSON.stringify(metrics));
  if(mode==='after'&&new Set(frames.flatMap(f=>f.shots)).size!==2)throw new Error('Cursor did not animate through both frames');
  const report={mode,logicHz:60,captureEvery:4,frames,metrics,scope:'Controlled enemy fixture; not a stage traversal.'};
  await writeFile(join(output,'null-motion-'+mode+'.json'),JSON.stringify(report,null,2)+'\n');
  return {mode,logicFrames:180,captures:frames.length};
}
