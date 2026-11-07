/** Local asset smoke test through an isolated headless Edge and the native DevTools protocol. */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { checkTitleNavigation } from './check-title-navigation.mjs';

const root = resolve(import.meta.dirname, '..');
const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:5173').replace(/\/$/, '');
const output = join(root, 'art/preview');
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), 'megabob-assets-'));
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; }
    catch { await sleep(100); }
  }
  if (!port) throw new Error('Edge did not expose a DevTools endpoint');
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  const errors = [], warnings = [], failedRequests = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(JSON.stringify(message.error)));
      else request.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    } else if (message.method === 'Runtime.consoleAPICalled') {
      const entry = message.params;
      const text = entry.args.map((arg) => arg.value ?? arg.description).join(' ');
      if (entry.type === 'error') errors.push(text);
      if (entry.type === 'warning') warnings.push(text);
    } else if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
      failedRequests.push(message.params.response.url);
    } else if (message.method === 'Network.loadingFailed') {
      failedRequests.push(message.params.errorText);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.delete(id)) reject(new Error(`${method} timed out`)); }, 15000).unref();
  });
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 700, deviceScaleFactor: 1, mobile: false });
  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? 'Evaluation failed');
    return response.result.value;
  };
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await send('Page.navigate', { url: baseUrl + '/' });
  let active = false;
  for (let i = 0; i < 150 && !active; i++) {
    active = await evaluate(`!!window.__game?.scene.isActive('Title')`);
    if (!active) await sleep(100);
  }
  if (!active) throw new Error('Title did not load');
  await sleep(700); // Phaser's tween clock follows real time; let the label fade settle.
  const initial = await evaluate(`(() => {
    const g=window.__game, s=g.scene.getScene('Title'); g.loop.stop();
    window.__titleTick=performance.now();
    return {menu:s.items.map(i=>i.label), children:s.children.length, listeners:s.events.listenerCount('update')};
  })()`);
  const advance = async (frames) => evaluate(`(() => {
    const g=window.__game, s=g.scene.getScene('Title'), frames=[];
    for(let i=0;i<${frames};i++){window.__titleTick+=1000/60;g.step(window.__titleTick,1000/60);frames.push(s.children.getByName('title-bob').frame.name);}
    const bob=s.children.getByName('title-bob'), shine=s.children.getByName('title-shine');
    const logo=s.children.list.find(o=>o.texture?.key==='title_logo_night'&&o.name!=='title-shine');
    return {frames:[...new Set(frames)],bobY:bob.y,logo:{alpha:logo.alpha,y:logo.y},shine:shine.alpha,children:s.children.length,listeners:s.events.listenerCount('update')};
  })()`);
  const normal = await advance(240);
  const snapshot = () => evaluate(`(() => {window.__titleTick+=1000/60;window.__game.step(window.__titleTick,1000/60);return window.__game.canvas.toDataURL('image/png');})()`);
  const native = await snapshot();
  await writeFile(join(output,'browser-title-menu.png'),Buffer.from(native.split(',')[1],'base64'));
  const page = await send('Page.captureScreenshot', {format:'png'});
  await writeFile(join(output,'browser-title-menu-page.png'),Buffer.from(page.data,'base64'));
  // Capture the bounded sweep, not merely a configured tween or mask.
  await advance(360);
  let shineSeen = false;
  let shineAffectsPixels = false;
  let betweenSweeps = false;
  for(let i=0;i<480;i++) {
    const sample = await advance(1);
    if(sample.shine===0) betweenSweeps=true;
    if(sample.shine>0 && betweenSweeps) {
      shineSeen=true;
      await advance(30);
      const capture=await snapshot();
      await writeFile(join(output,'browser-title-shine.png'),Buffer.from(capture.split(',')[1],'base64'));
      shineAffectsPixels=await evaluate(`(() => {
        const g=window.__game,shine=g.scene.getScene('Title').children.getByName('title-shine');
        const c=document.createElement('canvas');c.width=480;c.height=104;const ctx=c.getContext('2d');
        const capture=()=>{g.step(window.__titleTick,0);ctx.clearRect(0,0,480,104);ctx.drawImage(g.canvas,0,0);return c.toDataURL();};
        const lit=capture();shine.setVisible(false);const dark=capture();shine.setVisible(true);return lit!==dark;
      })()`);
      break;
    }
  }
  await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await sleep(300);
  const preferenceState = await evaluate(`({reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,active:window.__game.scene.getScenes(true).map(s=>s.sys.settings.key)})`);
  const reduced = await advance(180);
  const stillA=await snapshot();
  await advance(60);
  const stillB=await snapshot();
  const restarts=[];
  for(let i=0;i<2;i++) {
    await evaluate(`void window.__game.scene.getScene('Title').scene.restart()`);
    await advance(3);
    restarts.push(await evaluate(`({children:window.__game.scene.getScene('Title').children.length,listeners:window.__game.scene.getScene('Title').events.listenerCount('update')})`));
  }
  const navigation = await checkTitleNavigation(send, evaluate, sleep);
  // Capture the actual menu (including its HTML labels) for a shareable GIF.
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await sleep(300);
  await evaluate(`void window.__game.scene.getScene('Title').scene.restart()`);
  await advance(1);
  const clip=await evaluate(`(() => {const r=window.__game.canvas.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
  const sequence=join(output,'title-menu-frames');await mkdir(sequence,{recursive:true});
  for(let i=0;i<48;i++) {
    const frame=await send('Page.captureScreenshot',{format:'png',clip});
    await writeFile(join(sequence,String(i).padStart(2,'0')+'.png'),Buffer.from(frame.data,'base64'));
    await advance(6);
    await sleep(30);
  }
  await writeFile(join(output,'title-reduced-a.png'),Buffer.from(stillA.split(',')[1],'base64'));
  await writeFile(join(output,'title-reduced-b.png'),Buffer.from(stillB.split(',')[1],'base64'));
  const report={initial,normal,shineSeen,shineAffectsPixels,preferenceState,reduced,reducedPixelsStable:stillA===stillB,restarts,navigation,errors,warnings,failedRequests};
  await writeFile(join(output,'title-menu-review.json'),JSON.stringify(report,null,2)+'\n');
  if(!initial.menu.length||normal.frames.length<2||normal.bobY!==214||normal.logo.alpha!==1||normal.logo.y!==8||!shineSeen||!shineAffectsPixels||reduced.frames.join(',')!=='0'||reduced.shine!==0||stillA!==stillB||restarts.some(r=>r.children!==initial.children||r.listeners!==initial.listeners)||errors.length||warnings.length||failedRequests.length)throw new Error(JSON.stringify(report));
  console.log(JSON.stringify(report));
} finally {
  socket?.close();
  browser.kill();
}
