/** Compare the same original cursor asset through all three production emitters. */
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';

export async function checkCursorDirections(send, output, mode) {
  if(!['before','after'].includes(mode))throw new Error('Expected before/after cursor review');
  const evaluate=async expression=>{
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const report=await evaluate(`(async()=>{
    const {EnemyShot}=await import('/src/entities/EnemyShot.ts');
    const {NullPointer}=await import('/src/entities/bosses/NullPointer.ts');
    const {TechDebt}=await import('/src/entities/bosses/TechDebt.ts');
    const game=window.__game;
    for(const scene of [...game.scene.getScenes(false)])if(scene.sys.settings.key.startsWith('Art'))game.scene.remove(scene.sys.settings.key);
    for(const scene of game.scene.getScenes(true)){scene.scene.pause();scene.scene.setVisible(false);}
    if(game.domContainer)game.domContainer.style.visibility='hidden';
    game.scene.add('ArtCursorDirections',{create(){
      this.cameras.main.setBackgroundColor('#161616');
      this.target={x:0,y:0};
      this.nullBoss=new NullPointer(this,0,0,()=>this.target);
      this.tech=new TechDebt(this,0,0,()=>this.target);this.tech.setArena(0,480);
      for(const child of this.children.list)child.setVisible(false);
      this.scene.pause();
    }},true);
    const s=game.scene.getScene('ArtCursorDirections'),rows=[];
    const directions=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
    const guides=s.add.graphics().setDepth(-1).fillStyle(0x393939);
    for(let row=0;row<3;row++)for(let index=0;index<directions.length;index++){
      const [dx,dy]=directions[index],length=Math.hypot(dx,dy),vx=dx/length*140,vy=dy/length*140;
      const x=44+index*56,y=76+row*72;
      for(let k=12;k<=20;k+=4)guides.fillRect(x+Math.round(dx/length*k),y+Math.round(dy/length*k),1,1);
      let shot;
      if(row===0)shot=new EnemyShot(s,'cursor',x,y,vx,vy);
      else if(row===1){
        s.nullBoss.ai.facing=vx>0?1:-1;s.nullBoss.setPosition(x-s.nullBoss.ai.facing*12,y+40);
        s.nullBoss.fireCursor(vx,vy);shot=s.nullBoss.cursors.getChildren().at(-1);
      }else{
        s.target={x:x+dx*100,y:y+dy*100};
        s.tech.firePatch('cursors',{x,y});
        const fan=s.tech.shots.getChildren().slice(-5);shot=fan[2];
        for(const other of fan)if(other!==shot)other.destroy();
      }
      const frames=new Set();
      for(let tick=0;tick<18;tick++){shot.anims.update(0,1000/60);frames.add(Number(shot.frame.name));}
      shot.setFrame(0);
      const base=shot.flipX?1:-1;
      const nx=base*Math.cos(shot.rotation),ny=base*Math.sin(shot.rotation);
      const dot=(nx*shot.body.velocity.x+ny*shot.body.velocity.y)/Math.hypot(shot.body.velocity.x,shot.body.velocity.y);
      rows.push({emitter:['voidEye','nullPointer','techDebt'][row],direction:[dx,dy],position:[shot.x,shot.y],
        velocity:[shot.body.velocity.x,shot.body.velocity.y],flipX:shot.flipX,rotation:shot.rotation,
        headingErrorDegrees:Math.acos(Math.max(-1,Math.min(1,dot)))*180/Math.PI,
        body:[shot.body.width,shot.body.height],frames:[...frames].sort()});
    }
    return {mode:${JSON.stringify(mode)},sourceFaces:'left',directions:8,emitters:3,rows};
  })()`);
  const clip=await evaluate(`(()=>{const r=window.__game.canvas.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
  await new Promise(resolve=>setTimeout(resolve,80));
  const png=await send('Page.captureScreenshot',{format:'png',clip});
  await writeFile(join(output,'browser-cursor-directions-'+mode+'.png'),Buffer.from(png.data,'base64'));
  await writeFile(join(output,'cursor-directions-'+mode+'.json'),JSON.stringify(report,null,2)+'\n');
  if(mode==='after')for(const row of report.rows){
    const expectedBody=row.emitter==='techDebt'?'12,10':'10,10';
    if(row.headingErrorDegrees>1e-5||row.body.join(',')!==expectedBody||row.frames.join(',')!=='0,1')throw new Error(JSON.stringify(row));
  }
  await evaluate(`(()=>{window.__game.scene.remove('ArtCursorDirections');})()`);
  return report;
}
