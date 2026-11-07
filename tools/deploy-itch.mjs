/** Compatibility entry point: prepare the HTML5 ZIP without changing Vite's bundle format. */
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

execSync('npm run package:itch', {
  cwd: resolve(import.meta.dirname, '..'),
  stdio: 'inherit',
  windowsHide: true,
});
