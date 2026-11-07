/** Real combat entities at WORLD_STEP -> postUpdate, in an isolated art fixture. */
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

export async function checkCombatMotion(send, output, mode, clips = false) {
  if (!['before','after'].includes(mode)) throw new Error('Expected before/after combat review');
  const evaluate=async expression=>{
    const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await evaluate(`(async()=>{
    const game=window.__game;
    for(const s of [...game.scene.getScenes(false)])if(s.sys.settings.key.startsWith('Art'))game.scene.remove(s.sys.settings.key);
    for(const s of game.scene.getScenes(true)){s.scene.pause();s.scene.setVisible(false);}
    if(game.domContainer)game.domContainer.style.visibility='hidden';
    const enemies=await import('/src/entities/enemies/index.ts');
    const {EnemyShot}=await import('/src/entities/EnemyShot.ts');
    const {MemoryLeak}=await import('/src/entities/bosses/MemoryLeak.ts');
    const {RaceCondition}=await import('/src/entities/bosses/RaceCondition.ts');
    const {NullPointer}=await import('/src/entities/bosses/NullPointer.ts');
    const {TechDebt}=await import('/src/entities/bosses/TechDebt.ts');
    window.__combatReview={enemies,EnemyShot,MemoryLeak,RaceCondition,NullPointer,TechDebt};
  })()`);
  const cases=[['pixelMite',1],['spamDrone',1],['drip',1],['heapCrab',1],['threadRunner',2],['clockSpike',2],
    ['memoryLeak',1],['raceCondition',2],['nullPointer',3],['techDebt',4]];
  const folder=join(output,'combat-motion-'+mode);await mkdir(folder,{recursive:true});
  const report={mode,scope:'Real combat entities in controlled physics fixtures; no full-playthrough claim.',cases:[]};
  for(const [kind,stage] of cases){
    await evaluate(`(()=>{
      const game=window.__game,types=window.__combatReview;
      if(game.scene.keys.ArtCombatCheck)game.scene.remove('ArtCombatCheck');
      game.scene.add('ArtCombatCheck',{create(){
        const theme=${JSON.stringify(['','memory_leak','race_condition','null_pointer','tech_debt'][stage])};
        for(const depth of ['far','mid','near'])this.add.image(0,0,'t${stage}_'+theme+'_'+depth+'_wide').setOrigin(0).setDepth(-10);
        this.add.tileSprite(0,240,480,30,'tiles_'+theme,0).setOrigin(0);
        this.bob=this.add.sprite(100,240,'bob_idle',0).setOrigin(.5,1);
        this.target={x:100,y:224};this.ticks=0;this.enemyShots=[];this.summons=0;
        this.tweens.getDelta=()=>1000/60;
        const floor=this.add.zone(240,248,480,16);this.physics.add.existing(floor,true);
        const edges=[8,472].map(x=>{const z=this.add.zone(x,120,16,240);this.physics.add.existing(z,true);return z;});
        const kind=${JSON.stringify(kind)};
        if(['memoryLeak','raceCondition','nullPointer','techDebt'].includes(kind)){
          this.actor=kind==='memoryLeak'?new types.MemoryLeak(this,350,240,270,()=>this.target)
            :new types[{raceCondition:'RaceCondition',nullPointer:'NullPointer',techDebt:'TechDebt'}[kind]](this,350,240,()=>this.target);
          this.actor.setArena(0,480);
          for(const h of this.actor.hazards)if(h.collidesWithTiles)this.physics.add.collider(h.group,floor,undefined,a=>h.collidesWithTiles(a));
        }else{
          const world={bob:()=>this.target,floorAt:(x,y)=>y>=240&&x>16&&x<464,
            shoot:(...args)=>this.enemyShots.push(new types.EnemyShot(this,...args))};
          this.actor=types.enemies.createEnemy(kind,this,kind==='clockSpike'?426:300,kind==='drip'?80:kind==='spamDrone'?100:kind==='clockSpike'?144:240,world);
          if(this.actor.solid)this.physics.add.collider(this.actor,[floor,...edges]);
        }
        this.metrics={ticks:0,frames:new Set(),states:new Set(),facings:new Set(),bodies:new Set(),maxAlignment:0,
          maxBeamAlignment:0,maxBeamOriginGap:0,shots:{},summons:0,visibleUntouchable:false};
        this.events.on('bossSummon',()=>this.metrics.summons++);
        this.physics.world.on('worldstep',()=>{
          this.ticks++;
          this.target.x=['drip','spamDrone'].includes(kind)&&this.ticks>=60?300:Math.floor(this.ticks/400)%2?390:100;
          this.target.y=kind==='clockSpike'?142:224;
          if(this.queuedDamage){this.actor.hurt(this.queuedDamage);this.queuedDamage=0;}
          this.bob.setX(this.target.x);this.actor.step();
        });
        this.physics.world.pause();this.scene.pause();
      }},true);
    })()`);
    const segments=['normal','fury',...(kind==='techDebt'?['core','core-fury']:[])];
    const entry={kind,stage,segments:[]};
    for(const segment of segments){
      const result=await evaluate(`(()=>{
        const s=window.__game.scene.getScene('ArtCombatCheck'),a=s.actor,segment=${JSON.stringify(segment)};
        if(segment==='fury'&&a.hurt&&a.maxHp)s.queuedDamage=20;
        if(segment==='core')s.queuedDamage=999;
        if(segment==='core-fury')s.queuedDamage=20;
        const m=s.metrics,start=s.ticks;
        for(let i=0;i<1200;i++){
          for(const child of s.children.list)if(child.anims?.isPlaying)child.anims.update(0,1000/60);
          s.time.preUpdate();s.time.update(s.ticks*1000/60,1000/60);s.tweens.step(true);
          s.physics.world.resume();s.physics.world.singleStep();s.physics.world.pause();
          m.ticks++;
          m.frames.add(Number(a.frame.name));m.facings.add(a.flipX);m.bodies.add(a.body.width+'x'+a.body.height);
          m.states.add((a.phaseNo??'')+':'+(a.mlState??a.ai?.state??(a.phaseNo===1?a.wall.state:a.core?.state)??'walk'));
          if(a.body.enable&&a.visible){
            const x=a.x-a.displayOriginX*a.scaleX+a.body.offset.x*a.scaleX;
            const y=a.y-a.displayOriginY*a.scaleY+a.body.offset.y*a.scaleY;
            const error=Math.hypot(x-a.body.x,y-a.body.y);
            if(error>m.maxAlignment){m.maxAlignment=error;m.alignmentExample={state:a.mlState??a.ai?.state??a.core?.state,
              x:a.x,y:a.y,body:[a.body.x,a.body.y],expected:[x,y]};}
          }
          if(a.visible&&a.isTangible===false)m.visibleUntouchable=true;
          if(a.beam?.visible){
            const b=a.beam.body;
            m.maxBeamAlignment=Math.max(m.maxBeamAlignment,Math.hypot(a.beam.x-b.x,a.beam.y-3-b.y));
            m.maxBeamOriginGap=Math.max(m.maxBeamOriginGap,Math.abs(a.beam.y-a.body.center.y));
          }
          const shots=[...s.enemyShots.filter(x=>x.active),...(a.hazards??[]).flatMap(h=>h.group.getChildren())];
          for(const shot of shots)if(shot.active&&shot.texture){
            const key=shot.displayTexture?.key??shot.texture.key;
            (m.shots[key]??=new Set()).add(Number(shot.frame.name)||0);
          }
          for(const shot of s.enemyShots)if(shot.active&&(shot.x< -32||shot.x>512||shot.y>272))shot.destroy();
        }
        return {segment,ticks:s.ticks-start,frame:Number(a.frame.name),phase:a.phase??null};
      })()`);
      entry.segments.push(result);
      await new Promise(resolve=>setTimeout(resolve,30));
      const clip=await evaluate(`(()=>{const r=window.__game.canvas.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
      const png=await send('Page.captureScreenshot',{format:'png',clip});
      await writeFile(join(folder,kind+'-'+segment+'.png'),Buffer.from(png.data,'base64'));
    }
    if(mode==='after'&&clips){
      const clipFolder=join(output,'combat-clips',kind);await mkdir(clipFolder,{recursive:true});
      for(let index=0;index<45;index++){
        await evaluate(`(()=>{
          const s=window.__game.scene.getScene('ArtCombatCheck');
          for(let i=0;i<4;i++){
            for(const child of s.children.list)if(child.anims?.isPlaying)child.anims.update(0,1000/60);
            s.time.preUpdate();s.time.update(s.ticks*1000/60,1000/60);s.tweens.step(true);
            s.physics.world.resume();s.physics.world.singleStep();s.physics.world.pause();
          }
        })()`);
        await new Promise(resolve=>setTimeout(resolve,20));
        const clip=await evaluate(`(()=>{const r=window.__game.canvas.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
        const png=await send('Page.captureScreenshot',{format:'png',clip});
        await writeFile(join(clipFolder,String(index).padStart(2,'0')+'.png'),Buffer.from(png.data,'base64'));
      }
    }
    entry.metrics=await evaluate(`(()=>{
      const s=window.__game.scene.getScene('ArtCombatCheck'),a=s.actor,m=s.metrics;
      const plain={...m,frames:[...m.frames].sort(),states:[...m.states].sort(),facings:[...m.facings],bodies:[...m.bodies],
        shots:Object.fromEntries(Object.entries(m.shots).map(([k,v])=>[k,[...v].sort()]))};
      const pose=()=>JSON.stringify([a.x,a.y,a.frame.name,a.flipX,a.cue?.graphics.commandBuffer]);
      const frozenPose=pose();a.freeze(12);
      for(let i=0;i<6;i++){
        for(const child of s.children.list)if(child.anims?.isPlaying)child.anims.update(0,1000/60);
        s.physics.world.resume();s.physics.world.singleStep();s.physics.world.pause();
      }
      plain.freezeStable=pose()===frozenPose;
      if(a.maxHp){a.hurt(999);a.step();plain.defeat={visible:a.visible,body:a.body.enable,
        hazards:a.hazards.reduce((n,h)=>n+h.group.getChildren().filter(c=>c.active&&c.visible&&c.body.enable).length,0)};}
      const cue=a.cue?.graphics;
      a.destroy();plain.destroyed=!a.scene;plain.cueReleased=!cue||!cue.scene;
      return plain;
    })()`);
    report.cases.push(entry);
  }
  await evaluate(`(()=>{window.__game.scene.remove('ArtCombatCheck');delete window.__combatReview;})()`);
  await writeFile(join(output,'combat-motion-'+mode+'.json'),JSON.stringify(report,null,2)+'\n');
  if(mode==='after'){
    const expected={pixelMite:['walk'],spamDrone:['hover','dive','rise','rest'],drip:['hang','fall','splat','crawl'],
      heapCrab:['walk','windup','recover'],threadRunner:['idle','rev','rush','brake'],clockSpike:['idle','charge','fire'],
      memoryLeak:['dive','lurk','rise','fury_volley'],raceCondition:['windup','dash','skid','split','throw'],
      nullPointer:['out','hidden','in','shoot','summon'],techDebt:['open','fire','summon','charge','patch']};
    for(const entry of report.cases){
      const m=entry.metrics;
      if(m.maxAlignment>1e-6||m.maxBeamAlignment>1e-6||m.maxBeamOriginGap>1||!m.freezeStable||!m.destroyed||!m.cueReleased
        ||m.defeat&&(m.defeat.visible||m.defeat.body||m.defeat.hazards))throw new Error('Combat art regression: '+JSON.stringify(entry));
      for(const state of expected[entry.kind])if(!m.states.some(s=>s.endsWith(':'+state)))throw new Error(entry.kind+': missing '+state);
    }
  }
  return report;
}
