/** Visual bindings of the real Player across armor/weapon combinations, in an isolated scene. */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkBobWeaponArt(send, output) {
  const response = await send('Runtime.evaluate', {
    expression: `(async () => {
      const {Player}=await import('/src/entities/Player.ts');
      const {WEAPONS}=await import('/src/data/weapons.ts');
      const {poseSheet}=await import('/src/systems/bobPose.ts');
      const game=window.__game;
      for(const key of ['ArtAnimationCheck','ArtBossCheck','ArtPresentationCheck','ArtInteractiveCheck']) {
        if(game.scene.keys[key]) game.scene.remove(key);
      }
      for(const scene of game.scene.getScenes(true)) {
        scene.scene.pause();scene.scene.setVisible(false);
        for(const child of scene.children.list) if(child.node) child.setVisible(false);
      }
      if(game.domContainer) game.domContainer.style.visibility='hidden';
      game.scene.add('ArtBobWeaponCheck',{create(){
        this.cameras.main.setBackgroundColor('#161616');
        this.reviewBackgrounds=['far','mid','near'].map(name=>this.add.image(0,0,'t1_memory_leak_'+name+'_wide').setOrigin(0));
        this.reviewPlatforms=[];
        this.reviewPlayers=[];this.reviewLabels=[];
        const weapons=Object.keys(WEAPONS);
        weapons.forEach((weapon,column)=>this.add.text(8+column*120,4,WEAPONS[weapon].name,
          {fontFamily:'monospace',fontSize:'8px',color:'#e0e0e0'}));
        for(let row=0;row<4;row++) {
          const y=72+row*58;
          this.reviewPlatforms.push(this.add.tileSprite(0,y,480,8,'tiles_memory_leak',0).setOrigin(0));
          this.reviewLabels.push(this.add.text(2,y-48,'',{fontFamily:'monospace',fontSize:'8px',color:'#e0e0e0'}));
        }
        for(let mask=0;mask<16;mask++) for(let column=0;column<weapons.length;column++) {
          const player=new Player(this,60+column*120,72+(mask%4)*58);
          player.armor=mask;player.arsenal.current=weapons[column];player.applyWeaponTint();
          this.reviewPlayers.push({player,weapon:weapons[column],mask});
        }
        this.scene.pause();
      }},true);
      const scene=game.scene.getScene('ArtBobWeaponCheck');
      const poses=[
        {anim:'idle',loop:true,facing:1},{anim:'run',loop:true,facing:1},
        {anim:'shoot',loop:true,facing:1},{anim:'dash',loop:false,frame:1,facing:-1},
        {anim:'wall',loop:false,frame:0,facing:-1},{anim:'hurt',loop:false,frame:0,facing:1},
        {anim:'airdash',loop:false,frame:0,facing:1}
      ];
      const mismatches=[];let bindings=0;
      for(const {player,weapon,mask} of scene.reviewPlayers) {
        const body=[player.body.width,player.body.height,player.body.offset.x,player.body.offset.y];
        for(const pose of poses) {
          player.show(pose);player.anims.pause();
          const expected=poseSheet(pose.anim,pose.loop?0:pose.frame,mask);
          if(player.texture.key!==expected.key||player.tintTopLeft!==WEAPONS[weapon].tint||player.flipX!==(pose.facing<0)
             ||JSON.stringify(body)!==JSON.stringify([player.body.width,player.body.height,player.body.offset.x,player.body.offset.y])) {
            mismatches.push({weapon,mask,pose:pose.anim,texture:player.texture.key,tint:player.tintTopLeft,body});
          }
          bindings++;
        }
        player.arsenal.current='buster';player.applyWeaponTint();
        if(player.isTinted) mismatches.push({weapon,mask,reason:'special tint leaked into buster'});
        player.arsenal.current=weapon;player.applyWeaponTint();
      }
      return {weapons:Object.keys(WEAPONS),armorVariants:16,poseVariants:poses.length,
        verifiedBindings:bindings,body:[scene.reviewPlayers[0].player.body.width,scene.reviewPlayers[0].player.body.height],mismatches};
    })()`, awaitPromise: true, returnByValue: true,
  });
  if(response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  const report=response.result.value;
  if(report.mismatches.length||report.verifiedBindings!==448) throw new Error(JSON.stringify(report));
  const bounds=await send('Runtime.evaluate',{expression:`(() => {const r=window.__game.canvas.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`,returnByValue:true});
  report.backgroundThemes=['memory_leak','race_condition','null_pointer','tech_debt'];
  for(const [themeIndex,theme] of report.backgroundThemes.entries()) for(let page=0;page<4;page++) {
    await send('Runtime.evaluate',{expression:`(() => {
      const scene=window.__game.scene.getScene('ArtBobWeaponCheck');
      scene.reviewBackgrounds.forEach((image,i)=>image.setTexture('t'+(${themeIndex}+1)+'_'+${JSON.stringify(theme)}+'_'+['far','mid','near'][i]+'_wide'));
      scene.reviewPlatforms.forEach(image=>image.setTexture('tiles_'+${JSON.stringify(theme)},0));
      scene.reviewLabels.forEach((label,row)=>label.setText('a'+(${page}*4+row)));
      for(const {player,mask} of scene.reviewPlayers) {
        player.setVisible(Math.floor(mask/4)===${page});
        player.show({anim:'idle',loop:true,facing:1});player.anims.pause();
      }
    })()`});
    const frame=await send('Page.captureScreenshot',{format:'png',clip:bounds.result.value});
    await writeFile(join(output,'browser-bob-weapons-'+theme+'-'+page+'.png'),Buffer.from(frame.data,'base64'));
  }
  await writeFile(join(output,'bob-weapon-art-review.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
