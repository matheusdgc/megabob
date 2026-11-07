/** Pause, Mutex and encounter restart through the actual StageScene lifecycle. */
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';

export async function checkBossLifecycle(send, output, stage, mode) {
  if(!['before','after'].includes(mode))throw new Error('Expected before/after lifecycle review');
  const evaluate=async expression=>{
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await evaluate(`(()=>{
    const s=window.__game.scene.getScene('Stage'),room=s.sections[s.bossRoom],floor=room.y+room.h-32;
    s.fx.hold('art-lifecycle');s.fx.release('ready');s.tweens.getDelta=()=>1000/60;
    s.__life={stage:s.def.id,mode:${JSON.stringify(mode)},restarts:[],scope:'Actual StageScene, direct QA room entry; protected Bob, no traversal claim.'};
    s.__lifeEnter=()=>{
      s.player.respawn(room.x+40,floor);s.player.health.invuln=100000;
      s.enterSection(s.bossRoom,true);s.events.emit('bossIntro');
    };
    s.__lifeAdvance=(ticks,physics=true)=>{
      for(let i=0;i<ticks;i++){
        if(!s.player.isDead)s.player.health.invuln=100000;
        for(const child of s.children.list)if(child.anims?.isPlaying)child.anims.update(0,1000/60);
        s.time.preUpdate();s.time.update(s.time.now+1000/60,1000/60);s.tweens.step(true);
        if(physics){s.physics.world.resume();s.physics.world.singleStep();s.physics.world.pause();}
      }
    };
    s.__lifePose=()=>JSON.stringify([s.boss.x,s.boss.y,s.boss.frame.name,s.boss.flipX,s.boss.alpha,s.boss.cue?.graphics.commandBuffer]);
    s.__lifeEnter();s.__lifeAdvance(200);
    const b=s.boss,before=s.__lifePose();
    s.__life.mutexAccepted=b.freeze(20);
    if(s.def.boss==='memoryLeak')s.player.respawn(b.x+80,floor);
    s.__lifeAdvance(6);s.__life.mutexPoseStable=s.__lifePose()===before;
    s.__lifeAdvance(30);s.__life.mutexReleased=!b.isFrozen;
    s.openPause();s.__life.pausePose=s.__lifePose();s.fx.release('art-lifecycle');
  })()`);
  await new Promise(resolve=>setTimeout(resolve,180));
  await evaluate(`(()=>{
    const game=window.__game,s=game.scene.getScene('Stage'),r=s.__life;
    r.pauseStable=s.__lifePose()===r.pausePose&&game.scene.isPaused('Stage')&&game.scene.isActive('Pause');
    r.pauseTick=s.ticks;
    game.scene.getScene('Pause').close(false);
  })()`);
  await new Promise(resolve=>setTimeout(resolve,150));
  const report=await evaluate(`(()=>{
    const game=window.__game,s=game.scene.getScene('Stage'),r=s.__life;
    r.resumeActive=game.scene.isActive('Stage')&&!game.scene.isActive('Pause');
    r.resumeTicks=s.ticks-r.pauseTick;s.fx.hold('art-lifecycle');
    s.__lifeAdvance(30);
    const listeners=()=>Object.fromEntries(['bossIntro','bossSfx','bossSummon','bossPhase','bossHurt','bossDefeated','afterDeath'].map(e=>[e,s.events.listenerCount(e)]));
    const baseline=listeners();
    const owned=b=>[...b.hazards.flatMap(h=>h.group.getChildren()),b.wallImg,...(b.reels??[]),...(b.drawers??[]),b.block,b.beam,b.cue?.graphics].filter(Boolean);
    for(let i=0;i<3;i++){
      const old=s.boss,children=owned(old),colliders=s.bossColliders.length;
      s.respawnBob();s.__lifeAdvance(2);
      const released=!old.scene&&children.every(child=>!child.scene)&&s.bossColliders.length===0&&!s.bossHealthBar;
      s.__lifeEnter();s.__lifeAdvance(100);
      r.restarts.push({oldReleased:released,collidersStable:s.bossColliders.length===colliders,
        fullHp:s.boss.hp===s.boss.maxHp,firstForm:s.def.boss!=='techDebt'||s.boss.phaseNo===1,
        listenersStable:JSON.stringify(listeners())===JSON.stringify(baseline)});
    }
    if(s.def.boss==='techDebt'){
      s.boss.hurt(999);r.transitionEntered=s.boss.phaseNo===2;
      const old=s.boss;s.respawnBob();
      try{s.__lifeAdvance(100,false);r.transitionRestartError=null;}
      catch(error){r.transitionRestartError=String(error);s.time.removeAllEvents();}
      r.transitionOwnerReleased=!old.scene;
      s.__lifeEnter();s.__lifeAdvance(100);
    }
    const old=s.boss,children=owned(old),lives=s.player.health.lives;
    s.player.health.invuln=0;s.player.takeHit(999,s.player.x+10);
    s.__lifeAdvance(150);
    r.deathRestart={oldReleased:!old.scene&&children.every(child=>!child.scene),colliders:s.bossColliders.length,
      bossAbsent:!s.boss,barAbsent:!s.bossHealthBar,bobAlive:!s.player.isDead,lifeSpent:s.player.health.lives===lives-1};
    delete r.pausePose;delete r.pauseTick;s.scene.pause();return r;
  })()`);
  await writeFile(join(output,'boss-lifecycle-'+stage+'-'+mode+'.json'),JSON.stringify(report,null,2)+'\n');
  if(mode==='after'&&(!report.mutexAccepted||!report.mutexPoseStable||!report.mutexReleased||!report.pauseStable||!report.resumeActive||report.resumeTicks<1
    ||stage==='techDebt'&&(!report.transitionEntered||!report.transitionOwnerReleased)
    ||report.restarts.some(r=>Object.values(r).some(v=>v!==true))||report.transitionRestartError
    ||Object.entries(report.deathRestart).some(([key,value])=>key==='colliders'?value!==0:value!==true)))throw new Error(JSON.stringify(report));
  return report;
}
