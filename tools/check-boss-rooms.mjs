/** Actual StageScene boss-room integration, with direct QA entry and protected Bob. */
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

export async function checkBossRoom(send, output, stage) {
  const evaluate=async expression=>{
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await evaluate(`(()=>{
    const s=window.__game.scene.getScene('Stage');
    if(s.def.id!==${JSON.stringify(stage)})throw new Error('Wrong stage for room review');
    const room=s.sections[s.bossRoom],floor=room.y+room.h-32;
    s.fx.hold('art-boss-room');s.fx.release('ready');
    s.player.respawn(room.x+40,floor);s.player.health.invuln=100000;
    s.enterSection(s.bossRoom,true);s.events.emit('bossIntro');
    s.__roomReview={stage:s.def.id,scope:'Direct QA entry into the actual StageScene boss room; protected Bob, no traversal claim.',
      arena:{x:room.x,y:room.y,w:room.w,h:room.h,floor},segments:[],maxAlignment:0,states:new Set(),
      maxPuddles:0,puddleFloorError:0,maxOpaqueClip:0,travelMin:Infinity,travelMax:-Infinity,
      projectileHit:false,hazardHit:false,hazardDamage:0};
    if(s.def.boss==='raceCondition'){
      const texture=s.boss.texture,source=texture.getSourceImage(),canvas=document.createElement('canvas');
      canvas.width=source.width;canvas.height=source.height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
      s.__roomReview.opaqueFrames={};
      for(const name of texture.getFrameNames()){
        const frame=texture.get(name),data=ctx.getImageData(frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight).data;
        let left=frame.cutWidth,right=0;
        for(let y=0;y<frame.cutHeight;y++)for(let x=0;x<frame.cutWidth;x++)if(data[(y*frame.cutWidth+x)*4+3]){
          left=Math.min(left,x);right=Math.max(right,x+1);
        }
        s.__roomReview.opaqueFrames[name]=[left,right];
      }
    }
    s.tweens.getDelta=()=>1000/60;
  })()`);
  await new Promise(resolve=>setTimeout(resolve,100));
  const folder=join(output,'boss-rooms');await mkdir(folder,{recursive:true});
  const segments=['normal','fury',...(stage==='techDebt'?['core','core-fury']:[])];
  for(const segment of segments){
    const data=await evaluate(`(()=>{
      const s=window.__game.scene.getScene('Stage'),r=s.__roomReview,b=s.boss;
      const damage=${JSON.stringify(segment)}==='fury'||${JSON.stringify(segment)}==='core-fury'?20:${JSON.stringify(segment)}==='core'?999:0;
      if(damage)s.physics.world.once('worldstep',()=>b.hurt(damage));
      const step=()=>{
        s.player.health.invuln=100000;
        for(const child of s.children.list)if(child.anims?.isPlaying)child.anims.update(0,1000/60);
        s.time.preUpdate();s.time.update((s.ticks+1)*1000/60,1000/60);s.tweens.step(true);
        s.physics.world.resume();s.physics.world.singleStep();s.physics.world.pause();
        if(b.body.enable&&b.visible){
          r.travelMin=Math.min(r.travelMin,b.body.center.x);r.travelMax=Math.max(r.travelMax,b.body.center.x);
          const x=b.x-b.displayOriginX*b.scaleX+b.body.offset.x*b.scaleX;
          const y=b.y-b.displayOriginY*b.scaleY+b.body.offset.y*b.scaleY;
          r.maxAlignment=Math.max(r.maxAlignment,Math.hypot(x-b.body.x,y-b.body.y));
          if(r.opaqueFrames){
            const bounds=r.opaqueFrames[b.frame.name];
            const left=b.x-b.displayOriginX+(b.flipX?b.width-bounds[1]:bounds[0]);
            const right=b.x-b.displayOriginX+(b.flipX?b.width-bounds[0]:bounds[1]);
            r.maxOpaqueClip=Math.max(r.maxOpaqueClip,r.arena.x+16-left,right-(r.arena.x+r.arena.w-16));
          }
        }
        r.states.add((b.phaseNo??'')+':'+(b.mlState??b.ai?.state??(b.phaseNo===1?b.wall.state:b.core?.state)));
        const puddles=(b.gooGroup?.getChildren()??[]).filter(g=>g.active&&g.isPuddle);
        r.maxPuddles=Math.max(r.maxPuddles,puddles.length);
        for(const g of puddles)r.puddleFloorError=Math.max(r.puddleFloorError,Math.abs(g.body.bottom-r.arena.floor));
      };
      const tryHazard=()=>{
        if(r.hazardHit)return;
        const room=r.arena;
        let candidate;
        for(const h of b.hazards)for(const c of h.group.getChildren()){
          if(!candidate&&c.active&&c.visible&&c.body.enable&&h.damage(c)>0&&c.body.center.x>room.x+20&&c.body.center.x<room.x+room.w-20
            &&c.body.center.y>room.y+40&&c.body.center.y<room.floor&&Math.abs(c.body.center.x-b.body.center.x)>80)candidate=c;
        }
        if(candidate){
          s.player.respawn(candidate.body.center.x,candidate.body.center.y+15);s.player.health.invuln=0;
          const hp=s.player.health.hp;
          s.physics.world.resume();s.physics.world.singleStep();s.physics.world.pause();
          r.hazardDamage=hp-s.player.health.hp;r.hazardHit=r.hazardDamage>0;
          s.player.respawn(room.x+40,room.floor);s.player.health.invuln=100000;
        }
      };
      for(let i=0;i<900;i++){step();if(i%30===0)tryHazard();}
      if(!r.projectileHit){
        for(let i=0;i<180&&(!b.visible||!b.body.enable||!b.isTangible||b.phase!=='fight');i++)step();
        const hp=b.hp;
        const shot=s.player.shots.get();shot.fire(b.body.center.x-4,b.body.center.y,1,0);
        for(let i=0;i<3;i++)step();
        r.projectileHit=b.hp<hp;
        for(const projectile of s.player.shots.getChildren())if(projectile.active)projectile.disableBody(true,true);
      }
      tryHazard();
      for(let i=0;i<30;i++)step();
      for(let i=0;i<180&&(!b.visible||b.alpha<0.99||!b.isTangible||b.isFlashing);i++)step();
      s.player.setVisible(true);
      const result={segment:${JSON.stringify(segment)},hp:b.hp,phase:b.phase,frame:Number(b.frame.name),
        colliderCount:s.bossColliders.length,minions:s.enemies.countActive(),healthBar:!!s.bossHealthBar};
      r.segments.push(result);return result;
    })()`);
    if(!data.healthBar||data.colliderCount<3)throw new Error('Missing boss-room integration: '+JSON.stringify(data));
    await new Promise(resolve=>setTimeout(resolve,100));
    const clip=await evaluate(`(()=>{const r=window.__game.canvas.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
    const png=await send('Page.captureScreenshot',{format:'png',clip});
    await writeFile(join(folder,stage+'-'+segment+'.png'),Buffer.from(png.data,'base64'));
  }
  const report=await evaluate(`(()=>{
    const s=window.__game.scene.getScene('Stage'),r=s.__roomReview,b=s.boss;
    for(let i=0;i<120;i++){s.player.health.invuln=100000;s.physics.world.resume();s.physics.world.singleStep();s.physics.world.pause();}
    b.hurt(999);
    const result={...r,states:[...r.states].sort(),defeat:{phase:b.phase,healthBar:!!s.bossHealthBar,
      liveHazards:b.hazards.reduce((n,h)=>n+h.group.getChildren().filter(c=>c.active&&c.visible&&c.body.enable).length,0),
      minions:s.enemies.countActive(),stageOver:s.over}};
    s.scene.pause();return result;
  })()`);
  await writeFile(join(folder,stage+'.json'),JSON.stringify(report,null,2)+'\n');
  if(stage==='raceCondition'&&report.travelMax-report.travelMin<report.arena.w-120-1)throw new Error('Race failed to cross its arena');
  if(report.maxAlignment>1e-6||report.maxOpaqueClip>1e-6||!report.projectileHit||!report.hazardHit||report.puddleFloorError>1
    ||report.defeat.phase!=='dead'||report.defeat.healthBar||report.defeat.liveHazards||report.defeat.minions||!report.defeat.stageOver){
    throw new Error('Boss-room regression: '+JSON.stringify(report));
  }
  return report;
}
