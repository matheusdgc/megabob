/**
 * tools/deploy-itch.mjs
 *
 * Build de produção + patch para itch.io + geração do zip.
 *
 * Uso:
 *   node tools/deploy-itch.mjs
 *
 * Saída: megabob.zip na raiz do projeto, pronto para subir no itch.io.
 *
 * Por que o patch é necessário:
 *   O Vite 6+ injeta o script com type="module" crossorigin. O itch.io serve o
 *   jogo dentro de um <iframe sandbox> sem as permissões COOP/COEP necessárias
 *   para ES modules com crossorigin, resultando em tela preta silenciosa.
 *   Remover os dois atributos (type="module" e crossorigin) força o browser a
 *   carregar o bundle como script clássico, que funciona no sandbox do itch.io.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';

// ---------------------------------------------------------------------------
// 1. Build
// ---------------------------------------------------------------------------
console.log('▶ npm run build...');
execSync('npm run build', { stdio: 'inherit' });

// ---------------------------------------------------------------------------
// 2. Patch index.html — remove type="module" e crossorigin do <script>
// ---------------------------------------------------------------------------
const distDir = path.resolve('dist');
const indexPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const before = html;
// Remove type="module" e crossorigin (em qualquer ordem, com ou sem espaço)
html = html.replace(/\s*type="module"/g, '');
html = html.replace(/\s*crossorigin/g, '');

if (html === before) {
  console.log('⚠  index.html não continha type="module" — verifique o build.');
} else {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('✔ index.html: type="module" e crossorigin removidos.');
}

// ---------------------------------------------------------------------------
// 3. Criar megabob.zip com o conteúdo do dist/ na raiz
// ---------------------------------------------------------------------------
const zipPath = path.resolve('megabob.zip');

// Remove o zip anterior se existir
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

// Usa o módulo nativo do Node 18+: child_process com PowerShell
// (compatível com Windows onde este projeto roda)
try {
  // PowerShell: Compress-Archive espera os itens do dist, não o dist em si
  const items = fs.readdirSync(distDir).map(f => path.join(distDir, f)).join('","');
  execSync(
    `powershell -Command "Compress-Archive -Path @(\\"${items}\\") -DestinationPath '${zipPath}' -Force"`,
    { stdio: 'inherit' },
  );
} catch {
  // Fallback: python (disponível no ambiente do projeto)
  console.log('  (PowerShell falhou, tentando Python...)');
  execSync(
    `python -c "import zipfile,os,pathlib; root=pathlib.Path('dist'); z=zipfile.ZipFile('megabob.zip','w',zipfile.ZIP_DEFLATED); [z.write(f,f.relative_to(root)) for f in root.rglob('*') if f.is_file()]; z.close(); print('OK')"`,
    { stdio: 'inherit' },
  );
}

// ---------------------------------------------------------------------------
// 4. Relatório
// ---------------------------------------------------------------------------
const zipSize = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1);
console.log(`\n✅ megabob.zip gerado — ${zipSize} MB`);
console.log('\nPascos no itch.io:');
console.log('  1. Game page → Edit game → Uploads → Add file: megabob.zip');
console.log('  2. Marque "This file will be played in the browser"');
console.log('  3. Embed options: 1280 × 720');
console.log('  4. Clique "Save & view page" e teste antes de publicar.');
