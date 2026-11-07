/** Find Python 3, including the Windows app execution alias outside npm's PATH. */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const script = join(import.meta.dirname, 'package_itch.py');
const candidates = process.env.PYTHON ? [[process.env.PYTHON, []]] : [];
candidates.push(['python3', []], ['python', []], ['py', ['-3']]);
if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
  candidates.push([join(process.env.LOCALAPPDATA, 'Microsoft/WindowsApps/py.exe'), ['-3']]);
}
for (const [command, args] of candidates) {
  const probe = spawnSync(command, [...args, '--version'], { encoding: 'utf8', windowsHide: true });
  if (probe.error || probe.status !== 0 || !/Python 3\./.test(probe.stdout + probe.stderr)) continue;
  const result = spawnSync(command, [...args, script, ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
console.error('Python 3 not found. Install it or set PYTHON to its executable path.');
process.exit(1);
