# Pipeline de arte

`tools/art.py` prepara o lote de efeitos, inimigos, chefes, ícones, tiles, fundos e interface. Usa o Python/Pillow já instalado; não chama serviços de geração. O catálogo de células e tamanhos fica em `tools/art_catalog.py`.

```powershell
py -3 tools/art.py all
py -3 tools/art.py ui
py -3 -m unittest discover -s tools -p test_art.py
```

Categorias disponíveis: `fx`, `enemies`, `bosses`, `icons`, `tiles`, `bg` e `ui`. Uma execução parcial conserva as outras categorias do manifesto existente; em um checkout novo, execute `all` primeiro.

## Entradas e saídas

- Fontes: `art/raw/`, com os prompts ao lado. O importador compara os hashes SHA-256 antes e depois e falha se alguma fonte mudar.
- Jogo: 99 strips/imagens em `public/assets/`, cada PNG acompanhado de atlas JSON para ferramentas externas. O Phaser usa os tamanhos de quadro do manifesto de spritesheets.
- Registro: `public/assets/art-manifest.json` e `src/data/processedArt.ts`, ambos gerados. `src/data/assets.ts` conserva as chaves anteriores e inclui os novos registros.
- Revisão: contatos, repetições de fundos e `art_report.json` em `art/preview/`, fora do Git. O relatório distingue fontes processadas, conceitos de referência e fontes do pipeline anterior do Bob.
- Logo: `art/exports/megabob-logo.png`, recortada com transparência e resolução da fonte; `public/assets/ui/title_logo.png`, versão 224×48 para o jogo. A versão atual tem lettering MEGABOB com faixas azuis inspiradas na referência IBM. A anterior está preservada em `art/raw/ui/U1_logo-original.png`.

## Regras do processamento

O fundo magenta é removido com tolerância, preservando roxos e branco. Os strips usam alpha binário, nearest-neighbor e a paleta de `tools/palette.py`. Cada animação mantém uma escala compartilhada e a ancoragem declarada. Quadros vazios intencionais mantêm seus índices; vazios inesperados e recortes que excedam o quadro são erros.

Folhas com espaçamento irregular usam os intervalos de conteúdo; folhas de efeitos e tiles usam a grade declarada. Os tiles têm 16×16. Os fundos geram três camadas de 512×224 por fase: FAR com duas cores para preservar silhuetas, MID e NEAR com transparência. A correção de bordas garante igualdade entre as colunas inicial e final; as prévias repetidas permitem conferir a composição visual da emenda.

B1, A1, três conceitos de chefes e o logo anterior são referências, sem saída de runtime. Bob B2–B10, a armadura e air dash continuam no pipeline `py -3 tools/sprites.py bob`. O encaixe considera o desenho inteiro, restringe posições aos 48×48 e limita a escala compartilhada de poses grandes, sem recorte. `compile[0]` compartilha as partículas neutras entre todas as combinações. As duas poses horizontais B6 usam divisões anatômicas anotadas por peça. O relatório atual está sem avisos; veja `art/REGENERATE.md`.

Testes do enquadramento: `py -3 -m unittest discover -s tools -p test_bob_fit.py`. Para executar todos os testes Python, use `py -3 -m unittest discover -s tools -p 'test_*.py'`.

## Validação no jogo

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
# Com o servidor de desenvolvimento em http://127.0.0.1:5173:
node tools/check-assets.mjs
```

O smoke test usa um perfil isolado do Edge headless, sem dependências adicionais. Confere as 99 texturas do lote e os 145 strips do Bob (244 no total), com seus quadros nas cenas Debug e Stage, registra erros de console/rede e salva screenshots em `art/preview/`. Requer Edge instalado no caminho indicado no script.

O lote está carregado pelo Boot e o mapa de teste usa os tiles reais. Animações e componentes ficam disponíveis para as tarefas de inimigos, chefes, fases e menus; o importador não implementa essas mecânicas.
