/** Local asset smoke test through an isolated headless Edge and the native DevTools protocol. */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
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
  const manifest = JSON.parse(await readFile(join(root, 'public/assets/art-manifest.json'), 'utf8'));
  const scenes = [];
  for (const [query, scene] of [['?sprites', 'Debug'], ['', 'Stage']]) {
    await send('Page.navigate', { url: `http://127.0.0.1:5173/${query}` });
    let state;
    for (let i = 0; i < 120; i++) {
      const result = await send('Runtime.evaluate', {
        expression: `JSON.stringify(window.__game ? {scenes: window.__game.scene.getScenes(true).map(s => s.sys.settings.key), textures: Object.fromEntries(Object.entries(window.__game.textures.list).map(([key, texture]) => [key, texture.getFrameNames().length]))} : null)`,
        returnByValue: true,
      });
      state = JSON.parse(result.result.value ?? 'null');
      if (state?.scenes.includes(scene)) break;
      await sleep(100);
    }
    if (!state?.scenes.includes(scene)) throw new Error(`${scene} did not become active`);
    const mismatches = manifest.filter((entry) => state.textures[entry.key] !== entry.frames);
    if (mismatches.length) throw new Error(`Texture layout mismatches: ${mismatches.map((e) => e.key).join(', ')}`);
    await sleep(300);
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(output, `browser-assets-${scene.toLowerCase()}.png`), Buffer.from(screenshot.data, 'base64'));
    scenes.push({ scene, verifiedTextures: manifest.length });
  }
  const report = { scenes, errors, warnings, failedRequests };
  await writeFile(join(output, 'browser-assets-report.json'), JSON.stringify(report, null, 2) + '\n');
  if (errors.length || warnings.length || failedRequests.length) throw new Error(JSON.stringify(report));
  console.log(JSON.stringify(report));
} finally {
  socket?.close();
  browser.kill();
}
