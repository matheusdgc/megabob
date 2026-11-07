/** Race Condition's real entity, stepped in a disposable physics scene. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

export async function checkRaceArt(send, output) {
  const before = 'data:image/png;base64,' + execFileSync('git', ['show','12f4020:public/assets/bosses/race_afterimage.png']).toString('base64');
  const evaluate=async expression=>{
    const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if(r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const report=await evaluate(`(async()=>{
    const {RaceCondition}=await import('/src/entities/bosses/RaceCondition.ts');
    const game=window.__game;
    const legacy=new Image();legacy.src=${JSON.stringify(before)};await legacy.decode();
    game.textures.addImage('art-race-clone-before',legacy);
    if(game.domContainer) game.domContainer.style.visibility='hidden';
    game.scene.add('ArtRaceCheck',{create(){
      for(const depth of ['far','mid','near']) this.add.image(0,0,'t2_race_condition_'+depth+'_wide').setOrigin(0).setDepth(-10);
      this.add.tileSprite(0,240,480,16,'tiles_race_condition',0).setOrigin(0);
      this.add.tileSprite(0,256,480,14,'tiles_race_condition',1).setOrigin(0);
      this.add.sprite(40,240,'bob_idle',0).setOrigin(.5,1);
      this.target={x:80,y:224};
      this.boss=new RaceCondition(this,390,240,()=>this.target);
      this.boss.setArena(0,480);this.scene.pause();this.physics.world.resume();
    }},true);
    const s=game.scene.getScene('ArtRaceCheck'),b=s.boss;
    const normal={frames:new Set(),bodies:new Set(),facings:new Set(),bladeFrames:new Set(),cloneBlendModes:new Set(),clones:0,waiting:false,active:false};
    const run=(ticks,result)=>{
      for(let i=0;i<ticks;i++){
        s.target.x=b.x<240?400:80;
        s.physics.world.singleStep();b.step();
        result.frames.add(Number(b.frame.name));result.bodies.add(b.body.width+'x'+b.body.height);result.facings.add(b.flipX);
        for(const blade of b.blades.getChildren()) {blade.anims.update(0,1000/60);result.bladeFrames.add(Number(blade.frame.name));}
        result.clones=Math.max(result.clones,b.clones.length);
        for(const clone of b.clones){result.cloneBlendModes.add(clone.sprite.blendMode);result.waiting||=clone.wait>0&&clone.sprite.alpha===.35;result.active||=clone.wait<=0&&clone.sprite.alpha===.75;}
      }
    };
    run(1800,normal);
    b.hurt(20);b.step();const hurtFrame=Number(b.frame.name);
    const fury={frames:new Set(),bodies:new Set(),facings:new Set(),bladeFrames:new Set(),cloneBlendModes:new Set(),clones:0,waiting:false,active:false};
    run(1800,fury);
    const plain=r=>({...r,frames:[...r.frames].sort(),bodies:[...r.bodies].sort(),facings:[...r.facings].sort(),bladeFrames:[...r.bladeFrames].sort(),cloneBlendModes:[...r.cloneBlendModes].sort()});
    b.hurt(999);b.step();
    const defeat={frame:Number(b.frame.name),visible:b.visible,hazards:b.blades.countActive()+b.cloneGroup.countActive()};
    // A fresh real entity supplies the static visual samples, independent of the fight run.
    b.destroy();
    for(const child of [...s.children.list]) if(child.texture?.key==='fx_boss_explosion')child.destroy();
    s.boss=new RaceCondition(s,390,240,()=>s.target);s.boss.setArena(0,480);
    s.boss.setFrame(4);s.boss.spawnClone(1,-1);s.boss.stepClones();s.activeClone=s.boss.clones[0].sprite;s.activeClone.setPosition(150,240);
    s.boss.spawnClone(60,-1);s.waitingClone=s.boss.clones[1].sprite;s.waitingClone.setPosition(260,240);
    return {normal:plain(normal),fury:plain(fury),hurtFrame,defeat};
  })()`);
  await writeFile(join(output,'race-art-runtime-report.json'),JSON.stringify(report,null,2)+'\n');
  if(JSON.stringify(report.normal.frames)!=='[0,1,2,3,4,5]'||JSON.stringify(report.normal.bodies)!=='["28x48","44x22"]'
    ||JSON.stringify(report.normal.bladeFrames)!=='[0,1,2,3]'||!report.normal.waiting||!report.normal.active
    ||JSON.stringify(report.normal.cloneBlendModes)!=='[0]'||JSON.stringify(report.fury.cloneBlendModes)!=='[0]'
    ||report.normal.clones!==1||report.fury.clones!==2||report.hurtFrame!==6||report.defeat.frame!==7||report.defeat.visible||report.defeat.hazards!==0) {
    throw new Error('Race visual regression: '+JSON.stringify(report));
  }
  const clip=await evaluate(`(()=>{const r=window.__game.canvas.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
  await evaluate(`(()=>{const s=window.__game.scene.getScene('ArtRaceCheck');s.activeClone.setVisible(false);s.waitingClone.setVisible(false);})()`);
  await new Promise(resolve=>setTimeout(resolve,100));
  const clean=await send('Page.captureScreenshot',{format:'png',clip});
  await writeFile(join(output,'browser-race-clones-background.png'),Buffer.from(clean.data,'base64'));
  for(const mode of ['before','after']) {
    await evaluate(`(()=>{const s=window.__game.scene.getScene('ArtRaceCheck');for(const clone of [s.activeClone,s.waitingClone])clone.setVisible(true).setTexture(${JSON.stringify(mode==='before'?'art-race-clone-before':'race_afterimage')});})()`);
    await new Promise(resolve=>setTimeout(resolve,100));
    const frame=await send('Page.captureScreenshot',{format:'png',clip});
    await writeFile(join(output,'browser-race-clones-'+mode+'.png'),Buffer.from(frame.data,'base64'));
  }
  return report;
}
