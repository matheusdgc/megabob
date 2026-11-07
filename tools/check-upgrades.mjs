/** Local asset smoke test through an isolated headless Edge and the native DevTools protocol. */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

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
  const ev = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  const until = async expression => {
    for (let i = 0; i < 100; i++) { if (await ev(expression)) return; await sleep(100); }
    throw new Error('Timed out: ' + expression);
  };
  const reports = [];
  for (const [stage, part, bit] of [['raceCondition','legs',8],['memoryLeak','body',4],['memoryLeak','arm',2],['nullPointer','head',1]]) {
    await send('Page.navigate', { url: `${baseUrl}/?stage=${stage}` });
    await sleep(300);
    await until("!!window.__game?.scene.getScene('Stage')?.player?.body");
    await until("!__game.scene.getScene('Stage').physics.world.isPaused");
    // Inspect the real terminal, then position Bob in front of it to test the installation lifecycle.
    const before = await ev(`(() => { const sc = __game.scene.getScene('Stage'); const t = sc.terminals.find(t => t.part === '${part}');
      if (!t) throw new Error('Missing terminal ${part}');
      const section = sc.def.sections.findIndex(s => t.x >= s.x*16 && t.x < (s.x+s.w)*16 && t.y > s.y*16 && t.y <= (s.y+s.h)*16);
      sc.player.respawn(t.x, t.y); sc.enterSection(section, true); return { part:t.part, frame:t.frame.name }; })()`);
    await until("__game.scene.isActive('Upgrade')");
    const installed = await ev(`(() => { const sc=__game.scene.getScene('Stage'); return { armor:sc.player.armor, saved:__game.registry.get('save').armor, stagePaused:sc.sys.isPaused(), physicsPaused:sc.physics.world.isPaused, installing:sc.installing }; })()`);
    if (!(installed.armor & bit) || !(installed.saved & bit) || !installed.stagePaused || !installed.physicsPaused) throw new Error('Install regression: '+JSON.stringify(installed));
    await sleep(1000);
    const screenshot = await send('Page.captureScreenshot', { format:'png' });
    await writeFile(join(output,`upgrade-${part}.png`), Buffer.from(screenshot.data,'base64'));
    await send('Input.dispatchKeyEvent', { type:'keyDown', key:'Enter', code:'Enter', windowsVirtualKeyCode:13, nativeVirtualKeyCode:13 });
    await sleep(75);
    await send('Input.dispatchKeyEvent', { type:'keyUp', key:'Enter', code:'Enter', windowsVirtualKeyCode:13, nativeVirtualKeyCode:13 });
    await until("!__game.scene.isActive('Upgrade') && !__game.scene.getScene('Stage').physics.world.isPaused");
    await send('Page.reload');
    await sleep(300);
    await until("!!window.__game?.scene.getScene('Stage')?.player?.body");
    const persisted=await ev(`(() => { const sc=__game.scene.getScene('Stage'); const t=sc.terminals.find(t=>t.part==='${part}'); return {armor:sc.player.armor,terminalFrame:t.frame.name,repeat:t.touch(sc.player.body)}; })()`);
    if (!(persisted.armor & bit) || Number(persisted.terminalFrame)!==2 || persisted.repeat) throw new Error('Persistence regression: '+JSON.stringify(persisted));
    reports.push({stage,part,before,installed,persisted});
  }
  if(errors.length || failedRequests.length) throw new Error(JSON.stringify({errors,failedRequests}));
  await writeFile(join(output,'upgrades-report.json'), JSON.stringify({reports,errors,warnings},null,2));
  console.log(JSON.stringify({reports,errors,warnings},null,2));
} finally { socket?.close(); browser.kill(); }
