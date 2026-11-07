/** Exercise the animated title through real keyboard events, not scene.start shortcuts. */
export async function checkTitleNavigation(send, evaluate, sleep) {
  const step = frames => evaluate(`(() => {
    for(let i=0;i<${frames};i++) {
      window.__titleTick+=1000/60;
      window.__game.step(window.__titleTick,1000/60);
    }
  })()`);
  const press = async (key, code, vk) => {
    const event = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...event });
    await step(2);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...event });
    await step(2);
  };
  const state = () => evaluate(`(() => {
    const g=window.__game,s=g.scene.getScene('Title');
    const labels=s.children.list.filter(o=>o.node);
    return {
      active:g.scene.getScenes(true).map(s=>s.sys.settings.key),
      paused:g.scene.isPaused('Title'),cursor:s.cursor,
      titleLabelsHidden:labels.length>0&&labels.every(o=>!o.visible),
      children:s.children.length,listeners:s.events.listenerCount('update'),
      bobFrame:s.children.getByName('title-bob')?.frame.name,
      titleMotionCount:g.scene.getScenes(true).flatMap(s=>s.children.list)
        .filter(o=>o.name==='title-bob'||o.name==='title-shine'||o.name==='title-rain').length
    };
  })()`);
  const require = (condition, message, detail) => {
    if (!condition) throw new Error(`${message}: ${JSON.stringify(detail)}`);
  };
  const waitFor = async name => {
    for(let i=0;i<30;i++) {
      await step(3);
      if(await evaluate(`window.__game.scene.isActive(${JSON.stringify(name)})`)) {
        // New menu readers deliberately arm after observing a released-input frame.
        await step(2);
        return;
      }
      await sleep(30);
    }
    const diagnostic=await evaluate(`(() => {
      const g=window.__game,s=g.scene.getScenes(true)[0];
      return {active:g.scene.getScenes(true).map(s=>s.sys.settings.key),leaving:s?.leaving,
        cameraFade:s?{running:s.cameras.main.fadeEffect.isRunning,direction:s.cameras.main.fadeEffect.direction,progress:s.cameras.main.fadeEffect.progress}:null};
    })()`);
    throw new Error(`${name} did not become active through menu input: ${JSON.stringify(diagnostic)}`);
  };

  await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await sleep(300);
  const baseline=await state();
  const options=[],selection=[];
  for(let cycle=0;cycle<2;cycle++) {
    const menu=await evaluate(`(() => {const s=window.__game.scene.getScene('Title');return {cursor:s.cursor,count:s.items.length,options:s.items.findIndex(i=>i.label==='OPÇÕES')};})()`);
    require(menu.options>=0,'Options item missing',menu);
    for(let i=0;i<(menu.options-menu.cursor+menu.count)%menu.count;i++) await press('ArrowDown','ArrowDown',40);
    await press('Enter','Enter',13);
    await waitFor('Options');
    const before=await state();
    await step(90);
    const after=await state();
    require(before.paused&&after.paused&&after.titleLabelsHidden,
      'Title labels or state leaked through options',after);
    require(before.bobFrame===after.bobFrame,'Title animation continued while paused',{before,after});
    await press('Escape','Escape',27);
    await waitFor('Title');
    const returned=await state();
    require(returned.cursor===menu.options&&returned.children===baseline.children&&returned.listeners===baseline.listeners,
      'Options return lost focus or accumulated title objects',returned);
    options.push({paused:true,labelsHidden:true,animationPaused:true,returnCursor:returned.cursor,
      children:returned.children,listeners:returned.listeners});

    for(let i=0;i<returned.cursor;i++) await press('ArrowUp','ArrowUp',38);
    await press('Enter','Enter',13);
    await waitFor('StageSelect');
    const departed=await state();
    require(departed.titleMotionCount===0&&departed.children===0,
      'Title decorations survived departure to stage select',departed);
    await press('Escape','Escape',27);
    await waitFor('Title');
    const back=await state();
    require(back.children===baseline.children&&back.listeners===baseline.listeners&&back.titleMotionCount===3,
      'Stage-select return accumulated or lost title decoration',back);
    selection.push({departedDecorationCount:departed.titleMotionCount,returnDecorationCount:back.titleMotionCount,
      children:back.children,listeners:back.listeners});
  }
  return {input:'native DevTools keyboard events',options,selection};
}
