/** Actual third-stage enemies with legacy/current textures over unchanged T3 scenery. */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';

export async function checkNullEnemyArt(send, output) {
  const specs=[['enemy_void_eye','enemies',32,32,4],['enemy_dangling_ref','enemies',40,48,3],['null_cursor','bosses',16,16,2]];
  const legacy=specs.map(([key,group,w,h,n])=>({key,w,h,n,data:'data:image/png;base64,'+
    execFileSync('git',['show','1df2de2:public/assets/'+group+'/'+key+'.png']).toString('base64')}));
  const evaluate=async expression=>{
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const report=await evaluate(`(async()=>{
    const {VoidEye}=await import('/src/entities/enemies/VoidEye.ts');
    const {DanglingRef}=await import('/src/entities/enemies/DanglingRef.ts');
    const {EnemyShot}=await import('/src/entities/EnemyShot.ts');
    const game=window.__game;
    for(const spec of ${JSON.stringify(legacy)}){
      const image=new Image();image.src=spec.data;await image.decode();
      const texture=game.textures.addImage('art-null-before-'+spec.key,image);
      for(let i=0;i<spec.n;i++)texture.add(i,0,i*spec.w,0,spec.w,spec.h);
    }
    if(game.domContainer)game.domContainer.style.visibility='hidden';
    game.scene.add('ArtNullEnemyCheck',{create(){
      for(const depth of ['far','mid','near'])this.add.image(0,0,'t3_null_pointer_'+depth+'_wide').setOrigin(0).setDepth(-10);
      this.add.tileSprite(0,240,480,16,'tiles_null_pointer',0).setOrigin(0);
      this.add.tileSprite(0,256,480,14,'tiles_null_pointer',1).setOrigin(0);
      this.add.tileSprite(295,128,50,16,'tiles_null_pointer',0).setOrigin(0);
      this.add.sprite(50,240,'bob_idle',0).setOrigin(.5,1);
      this.shots=[];
      const world={bob:()=>({x:100,y:220}),floorAt:()=>true,shoot:(kind,x,y,vx,vy)=>this.shots.push(new EnemyShot(this,kind,x,y,vx,vy))};
      this.eye=new VoidEye(this,190,212,world);this.claw=new DanglingRef(this,320,160,world);
      this.scene.pause();
    }},true);
    const s=game.scene.getScene('ArtNullEnemyCheck');
    const eyeFrames=new Set(),clawFrames=new Set(),eyeBodies=new Set(),clawBodies=new Set();let goneHarmless=true;
    for(let i=0;i<350;i++){
      s.eye.step();s.claw.step();eyeFrames.add(Number(s.eye.frame.name));clawFrames.add(Number(s.claw.frame.name));
      eyeBodies.add(s.eye.body.width+'x'+s.eye.body.height);clawBodies.add(s.claw.body.width+'x'+s.claw.body.height);
      if(Number(s.eye.frame.name)===3)goneHarmless&&=!s.eye.body.enable;
    }
    const fired=s.shots.length;for(const shot of s.shots)shot.destroy();
    s.eye.setPosition(190,212).setFrame(1);s.claw.frames=0;s.claw.place();
    s.cursor=new EnemyShot(s,'cursor',245,212,-140,0);
    return {eyeFrames:[...eyeFrames].sort(),clawFrames:[...clawFrames].sort(),eyeBodies:[...eyeBodies],clawBodies:[...clawBodies],
      firedCursorShots:fired,goneHarmless,cursor:{texture:s.cursor.texture.key,body:[s.cursor.body.width,s.cursor.body.height]}};
  })()`);
  if(JSON.stringify(report.eyeFrames)!=='[0,1,2,3]'||JSON.stringify(report.clawFrames)!=='[0,1,2]'
    ||report.eyeBodies.join(',')!=='18x18'||report.clawBodies.join(',')!=='18x16'||!report.goneHarmless
    ||report.firedCursorShots<1||report.cursor.texture!=='null_cursor'||report.cursor.body.join(',')!=='10,10')throw new Error(JSON.stringify(report));
  const clip=await evaluate(`(()=>{const r=window.__game.canvas.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
  for(const mode of ['before','after']){
    await evaluate(`(()=>{
      const s=window.__game.scene.getScene('ArtNullEnemyCheck'),prefix=${JSON.stringify(mode==='before'?'art-null-before-':'')};
      s.eye.setTexture(prefix+'enemy_void_eye',1);s.claw.setTexture(prefix+'enemy_dangling_ref',1);s.cursor.setTexture(prefix+'null_cursor',0);
      s.claw.place();
    })()`);
    await new Promise(resolve=>setTimeout(resolve,100));
    const png=await send('Page.captureScreenshot',{format:'png',clip});
    await writeFile(join(output,'browser-null-enemies-'+mode+'.png'),Buffer.from(png.data,'base64'));
  }
  await writeFile(join(output,'null-enemy-runtime-review.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
