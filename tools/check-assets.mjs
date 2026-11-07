/** Local asset smoke test through an isolated headless Edge and the native DevTools protocol. */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { checkAnimationLoops } from './check-animation-loops.mjs';
import { captureStageColors } from './check-stage-colors.mjs';
import { checkBossArt } from './check-boss-art.mjs';
import { checkStageInteractives } from './check-stage-interactives.mjs';
import { checkTextureSources } from './check-texture-sources.mjs';
import { checkBobWeaponArt } from './check-bob-weapon-art.mjs';
import { checkRaceArt } from './check-race-art.mjs';
import { checkNullEnemyArt } from './check-null-enemy-art.mjs';
import { captureNullContext } from './check-null-context.mjs';
import { checkNullMotion } from './check-null-motion.mjs';
import { checkCombatMotion } from './check-combat-motion.mjs';

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
  const manifest = JSON.parse(await readFile(join(root, 'public/assets/art-manifest.json'), 'utf8'));
  // Bob has its own importer, so include its actual strips in addition to the new catalog.
  for (const name of await readdir(join(root, 'public/assets/bob'))) {
    if (!name.endsWith('.png')) continue;
    const png = await readFile(join(root, 'public/assets/bob', name));
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    if (height !== 48 || width % 48 !== 0) throw new Error(`Invalid Bob strip: ${name}`);
    manifest.push({ key: name.slice(0, -4), file: 'assets/bob/' + name,
      frameWidth: 48, frameHeight: height, frames: width / 48 });
  }
  const scenes = [];
  let nullContext;
  for (const [query, scene, name] of [['?sprites', 'Debug', 'debug'], ['?stage=raceCondition', 'Stage', 'race-condition'], ['?stage=nullPointer', 'Stage', 'null-pointer'], ['?stage=techDebt', 'Stage', 'tech-debt'], ['?stage=memoryLeak', 'Stage', 'stage']]) {
    const expectedStage = new URLSearchParams(query).get('stage');
    await send('Page.navigate', { url: `${baseUrl}/${query}` });
    let state;
    for (let i = 0; i < 120; i++) {
      const result = await send('Runtime.evaluate', {
        expression: `JSON.stringify(window.__game ? {scenes: window.__game.scene.getScenes(true).map(s => s.sys.settings.key), stage:window.__game.scene.keys.Stage?.def?.id, textures: Object.fromEntries(Object.entries(window.__game.textures.list).map(([key, texture]) => [key, texture.getFrameNames().length]))} : null)`,
        returnByValue: true,
      });
      state = JSON.parse(result.result.value ?? 'null');
      if (state?.scenes.includes(scene) && (!expectedStage || state.stage === expectedStage)) break;
      await sleep(100);
    }
    if (!state?.scenes.includes(scene) || (expectedStage && state.stage !== expectedStage)) throw new Error(`${scene} ${expectedStage ?? ''} did not become active`);
    const mismatches = manifest.filter((entry) => state.textures[entry.key] !== entry.frames);
    if (mismatches.length) throw new Error(`Texture layout mismatches: ${mismatches.map((e) => e.key).join(', ')}`);
    const sourceAudit = await checkTextureSources(send, manifest, baseUrl, output, scene, name);
    await sleep(300);
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(output, `browser-assets-${name}.png`), Buffer.from(screenshot.data, 'base64'));
    scenes.push({ scene, ...(expectedStage ? {stage:expectedStage} : {}), verifiedTextures: manifest.length, ...sourceAudit });
    if (expectedStage === 'nullPointer') nullContext = await captureNullContext(send, output);
  }
  const colorArg = process.argv.find(arg => arg.startsWith('--stage-colors='));
  const stageColors = colorArg ? await captureStageColors(send, output, colorArg.split('=')[1]) : undefined;
  // Temporary QA scene: inspect new art in Phaser without editing production scenes.
  const layout = JSON.parse(await readFile(join(root, 'art/exports/presentation-layout.json'), 'utf8'));
  const presentations = [];
  for (const kind of ['boss', 'reward']) {
    const result = await send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__game, kind = ${JSON.stringify(kind)}, layout = ${JSON.stringify(layout)};
        const cfg = layout[kind];
        if (game.scene.keys.ArtPresentationCheck) game.scene.remove('ArtPresentationCheck');
        game.scene.add('ArtPresentationCheck', { create() {
          this.cameras.main.setBackgroundColor('#161616');
          const x = this.scale.width / 2 + cfg.offset[0], y = this.scale.height / 2 + cfg.offset[1];
          this.add.image(x, y, cfg.texture).setOrigin(0);
          const text = (slot, value, color = '#e0e0e0') => this.add.text(
            x + slot.position[0], y + slot.position[1], value,
            { fontFamily: 'monospace', fontSize: slot.fontSize + 'px', color });
          if (kind === 'boss') {
            this.add.image(x + cfg.portrait.position[0], y + cfg.portrait.position[1], 'portrait_memory_leak').setOrigin(0).setScale(2);
            text(cfg.heading, 'CHEFE DETECTADO', '#08bdba');
            text(cfg.name, 'MEMORY LEAK'); text(cfg.caption, 'PREPARE-SE', '#08bdba');
          } else {
            this.add.sprite(x + cfg.bob.position[0], y + cfg.bob.position[1], 'bob_victory_a8', cfg.bob.frame).setOrigin(0).setScale(2);
            this.add.sprite(x + cfg.icon.position[0], y + cfg.icon.position[1], 'armor_legs', 0).setOrigin(0).setScale(2);
            text(cfg.heading, 'UPGRADE INSTALADO', '#4589ff'); text(cfg.name, 'TURBO BOOTS');
            text(cfg.description, 'Libera um dash no ar\\na cada pulo.');
            text(cfg.footer, 'FIRMWARE ATUALIZADO', '#4589ff').setOrigin(0.5, 0);
          }
        } }, true);
        return game.scene.isActive('ArtPresentationCheck');
      })()`,
      returnByValue: true,
    });
    if (result.exceptionDetails || result.result.value !== true) throw new Error('Presentation scene failed');
    await sleep(300);
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(output, `browser-presentation-${kind}.png`), Buffer.from(screenshot.data, 'base64'));
    presentations.push(kind);
  }
  const endLayout = JSON.parse(await readFile(join(root, 'art/exports/end-screen-layout.json'), 'utf8'));
  const endScreens = [];
  for (const kind of ['ending', 'gameOver']) {
    const result = await send('Runtime.evaluate', {
      expression: `(() => {
        const game = window.__game, kind = ${JSON.stringify(kind)}, layout = ${JSON.stringify(endLayout)};
        game.scene.remove('ArtPresentationCheck');
        game.scene.add('ArtPresentationCheck', { create() {
          this.cameras.main.setBackgroundColor('#161616');
          const cfg = layout[kind], x = this.scale.width / 2 - 240, y = this.scale.height / 2 - 135;
          const text = (slot, value, color = '#e0e0e0') => this.add.text(
            x + slot.position[0], y + slot.position[1], value,
            { fontFamily: 'monospace', fontSize: slot.fontSize + 'px', color });
          if (kind === 'ending') {
            this.add.image(x, y, cfg.background).setOrigin(0);
            this.add.image(x + cfg.logo.position[0], y + cfg.logo.position[1], cfg.logo.texture).setOrigin(0);
            text(cfg.heading, 'SISTEMA RESTAURADO'); text(cfg.thanks, 'Obrigado por jogar!');
          } else {
            this.add.image(x + cfg.panel.position[0], y + cfg.panel.position[1], cfg.panel.texture).setOrigin(0);
            this.add.sprite(x + cfg.bob.position[0], y + cfg.bob.position[1], cfg.bob.texture, cfg.bob.frame).setOrigin(0).setScale(2);
            text(cfg.heading, 'GAME OVER', '#f1c21b');
            text(cfg.description, 'A compilação foi interrompida.\\nHora de tentar outra vez.');
            const [rx, ry, rw, rh] = cfg.action.rect;
            this.add.rectangle(x + rx, y + ry, rw, rh).setOrigin(0).setStrokeStyle(2, 0x4589ff);
            this.add.text(x + cfg.action.center[0], y + cfg.action.center[1], cfg.action.label,
              { fontFamily: 'monospace', fontSize: cfg.action.fontSize + 'px', color: '#e0e0e0' }).setOrigin(0.5);
          }
        } }, true);
        return game.scene.isActive('ArtPresentationCheck');
      })()`,
      returnByValue: true,
    });
    if (result.exceptionDetails || result.result.value !== true) throw new Error('End screen art scene failed');
    await sleep(300);
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(output, `browser-end-screen-${kind}.png`), Buffer.from(screenshot.data, 'base64'));
    endScreens.push(kind);
  }
  const animationLoops = await checkAnimationLoops(send, root, output);
  const bossArt = await checkBossArt(send, output);
  const raceArt = await checkRaceArt(send, output);
  const nullEnemyArt = await checkNullEnemyArt(send, output);
  const nullMotion = await checkNullMotion(send, output, process.argv.find(arg=>arg.startsWith('--null-motion='))?.split('=')[1] ?? 'after');
  const interactives = await checkStageInteractives(send, output);
  const bobWeaponArt = await checkBobWeaponArt(send, output);
  const combatMode=process.argv.find(arg=>arg.startsWith('--combat-review='))?.split('=')[1];
  const combatMotion=combatMode?await checkCombatMotion(send,output,combatMode,process.argv.includes('--combat-clips')):undefined;
  const report = { scenes, stageColors, presentations, endScreens, animationLoops, bossArt, raceArt, nullEnemyArt, nullMotion, nullContext, interactives, bobWeaponArt, combatMotion, errors, warnings, failedRequests };
  await writeFile(join(output, 'browser-assets-report.json'), JSON.stringify(report, null, 2) + '\n');
  if (errors.length || warnings.length || failedRequests.length) throw new Error(JSON.stringify(report));
  console.log(JSON.stringify(report));
} finally {
  socket?.close();
  browser.kill();
}
