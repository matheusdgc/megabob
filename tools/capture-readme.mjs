/** Local asset smoke test through an isolated headless Edge and the native DevTools protocol. */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:5173').replace(/\/$/, '');
const output = join(root, 'docs/screenshots');
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 810, deviceScaleFactor: 1, mobile: false });
  const ev = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  const until = async expression => {
    for (let i = 0; i < 400; i++) { if (await ev(expression)) return; await sleep(100); }
    throw new Error('Timed out: ' + expression + JSON.stringify({errors,warnings,failedRequests, state:await ev("window.__game?.scene.scenes.map(s=>[s.sys.settings.key,s.sys.settings.status])")}));
  };
  const capture = async name => {
    const clip = await ev(`(() => {const r=__game.canvas.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
    const shot=await send('Page.captureScreenshot',{format:'png',clip});
    await writeFile(join(output,name),Buffer.from(shot.data,'base64'));
  };
  await send('Page.navigate',{url:baseUrl});
  await sleep(500);
  await until("!!window.__game?.scene.isActive('Title')");
  await sleep(1600);
  await capture('01-menu.png');
  await send('Page.navigate',{url:baseUrl+'/?stage=memoryLeak'});
  await sleep(500);
  await until("!!window.__game?.scene.getScene('Stage')?.player?.body");
  await until("!__game.scene.getScene('Stage').physics.world.isPaused");
  const key=async(type,key,code,kc)=>send('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:kc,nativeVirtualKeyCode:kc});
  await key('keyDown','ArrowRight','ArrowRight',39);
  await sleep(1350);
  await key('keyUp','ArrowRight','ArrowRight',39);
  await key('keyDown','z','KeyZ',90);
  await sleep(200);
  await until("__game.scene.getScene('Stage').player.visible");
  await ev("__game.scene.getScene('Stage').fx.hold('screenshot')");
  await capture('02-gameplay.png');
  await ev("__game.scene.getScene('Stage').fx.release('screenshot')");
  await key('keyUp','z','KeyZ',90);
  // Use the real door and boss lifecycle to stage a combat screenshot.
  await ev(`(() => {const s=__game.scene.getScene('Stage'); const door=s.door; const target=s.sections.findIndex(r=>door.x>=r.x&&door.x<r.x+r.w&&door.y>r.y&&door.y<=r.y+r.h); s.player.respawn(door.x-24,door.y);s.enterSection(target,true);})()`);
  await key('keyDown','ArrowRight','ArrowRight',39);
  await sleep(400);
  await key('keyUp','ArrowRight','ArrowRight',39);
  await until("__game.scene.getScene('Stage').boss?.phase==='fight'");
  await key('keyDown','ArrowRight','ArrowRight',39);
  await sleep(800);
  await key('keyUp','ArrowRight','ArrowRight',39);
  await key('keyDown','z','KeyZ',90);
  await sleep(350);
  await key('keyUp','z','KeyZ',90);
  await until("(() => { const s=__game.scene.getScene('Stage'); if(s.player.visible && s.boss.visible && !s.boss.tintFill && Number(s.boss.frame.name)<=2) {s.fx.hold('screenshot');return true;} return false; })()");
  await capture('03-boss.png');
  await key('keyUp','z','KeyZ',90);
  if(errors.length || failedRequests.length)throw new Error(JSON.stringify({errors,failedRequests}));
  console.log(JSON.stringify({screenshots:['01-menu.png','02-gameplay.png','03-boss.png'],errors,warnings}));
}finally{socket?.close();browser.kill();}
