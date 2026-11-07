/** Smoke-test dist in a nested iframe with an isolated Edge profile and native CDP. */
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
execFileSync(process.execPath, [join(root, 'tools/package-itch.mjs'), '--verify'], { stdio: 'inherit', windowsHide: true });
const build = join(root, 'dist');
await readFile(join(build, 'index.html')); // Fail before starting any processes if not built.
const prefix = '/uploads/megabob/';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
const requests = new Set();
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><link rel="icon" href="data:,"><iframe src="${prefix}index.html" width="960" height="540" sandbox="allow-scripts allow-same-origin allow-pointer-lock" allow="autoplay; fullscreen; gamepad" style="border:0"></iframe>`);
    return;
  }
  try {
    if (!path.startsWith(prefix)) throw new Error('Resource escaped the upload folder');
    const file = resolve(build, decodeURIComponent(path.slice(prefix.length)));
    if (!file.startsWith(build + sep)) throw new Error('Invalid resource path');
    const body = await readFile(file);
    requests.add(path);
    res.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const profile = await mkdtemp(join(tmpdir(), 'megabob-release-'));
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const errors = [], warnings = [], failedRequests = [];
let socket, launchError;
browser.on('error', error => { launchError = error; });
try {
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    if (launchError) throw launchError;
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; }
    catch { await sleep(100); }
  }
  if (!port) throw new Error('Edge did not expose a DevTools endpoint');
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
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
      const text = entry.args.map(arg => arg.value ?? arg.description).join(' ');
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
  const ev = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  const text = "document.querySelector('iframe')?.contentDocument?.body.innerText ?? ''";
  const until = async expression => {
    for (let i = 0; i < 300; i++) {
      if (errors.length || failedRequests.length) throw new Error(JSON.stringify({ errors, failedRequests }));
      if (await ev(expression)) return;
      await sleep(100);
    }
    throw new Error(`Timed out: ${expression}; text: ${await ev(text)}`);
  };
  const key = async (type, key, code, kc) => send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: kc, nativeVirtualKeyCode: kc });
  const press = async (name, code, kc, ms = 100) => {
    await key('keyDown', name, code, kc);
    await sleep(ms);
    await key('keyUp', name, code, kc);
  };
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 650, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await until(`(${text}).includes('COMEÇAR')`);
  await sleep(800);
  if (await ev("!!document.querySelector('iframe').contentWindow.__game")) throw new Error('Production debug handle leaked');
  const canvas = await ev(`(() => { const f = document.querySelector('iframe'); const c = f.contentDocument.querySelector('canvas'); const r = c.getBoundingClientRect(); const b = f.getBoundingClientRect(); return { width: c.width, height: c.height, displayWidth: r.width, displayHeight: r.height, x: b.x + r.x + 20, y: b.y + r.y + 20 }; })()`);
  if (canvas.width !== 480 || canvas.height !== 270 || canvas.displayWidth !== 960 || canvas.displayHeight !== 540) {
    throw new Error(`Unexpected embed dimensions: ${JSON.stringify(canvas)}`);
  }
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: canvas.x, y: canvas.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: canvas.x, y: canvas.y, button: 'left', clickCount: 1 });
  await press('Enter', 'Enter', 13);
  await until(`(${text}).includes('MEMORY LEAK')`);
  await sleep(700);
  await press('Enter', 'Enter', 13);
  await until(`/x[0-9]/.test(${text})`);
  await until(`!(${text}).includes('PRONTO')`);
  await sleep(700);
  await press('ArrowRight', 'ArrowRight', 39, 450);
  await press(' ', 'Space', 32);
  await press('z', 'KeyZ', 90, 250);
  await press('Escape', 'Escape', 27);
  await until(`(${text}).includes('PAUSA')`);
  await press('Escape', 'Escape', 27);
  await until(`!(${text}).includes('PAUSA')`);
  await sleep(500);
  await mkdir(join(root, 'release'), { recursive: true });
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(root, 'release/itch-smoke.png'), Buffer.from(shot.data, 'base64'));
  if (![...requests].some(path => /\.(ogg|mp3)$/.test(path))) throw new Error('No music was loaded');
  if (errors.length || failedRequests.length) throw new Error(JSON.stringify({ errors, failedRequests }));
  const report = { passed: true, embed: '960x540', screens: ['title', 'stageSelect', 'gameplay', 'pause'], resources: requests.size, debugHandle: false, errors, warnings, failedRequests };
  await writeFile(join(root, 'release/itch-smoke.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  socket?.close();
  browser.kill();
  server.closeAllConnections();
  server.close();
}
