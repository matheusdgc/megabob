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
- Jogo: 120 strips/imagens em `public/assets/`, cada PNG acompanhado de atlas JSON para ferramentas externas. O Phaser usa os tamanhos de quadro do manifesto de spritesheets.
- Registro: `public/assets/art-manifest.json` e `src/data/processedArt.ts`, ambos gerados. `src/data/assets.ts` conserva as chaves anteriores e inclui os novos registros.
- Revisão: contatos, repetições de fundos e `art_report.json` em `art/preview/`, fora do Git. O relatório distingue fontes processadas, conceitos de referência e fontes do pipeline anterior do Bob.
- Logo: `art/exports/megabob-logo.png`, recortada com transparência e resolução da fonte; `public/assets/ui/title_logo.png`, versão 224×48 para o jogo. A versão atual tem lettering MEGABOB com faixas azuis inspiradas na referência IBM. A anterior está preservada em `art/raw/ui/U1_logo-original.png`.

## Composição do título em 480×270

A fonte adicional `art/raw/ui/U2_title_bg_wide.png` foi gerada com `imagegen`, usando U2 como referência, e recomposta em 16:9. Bob permanece inteiro no canto inferior esquerdo, com céu livre para a logo. O fundo original 256×224 continua disponível.

| Elemento | Textura | Posição e escala sugeridas |
|---|---|---|
| Fundo panorâmico | `title_background_wide`, 480×270 | `(0, 0)`, origem superior esquerda, escala 1 |
| Logo sobre o céu | `title_logo_night`, 224×48 | `(16, 8)`, origem superior esquerda, escala 2 |

`title_logo_night` deriva da mesma fonte da logo: azuis/neutros, remoção de pixels isolados e contorno claro de 1 px para separar as letras do céu. A versão original fica intacta. A margem interna evita cortar o contorno.

`py -3 tools/art.py ui` também monta `art/exports/megabob-title-preview.png` (480×270) e a ampliação nearest-neighbor `art/preview/title_wide_2x.png`. O prompt do fundo está em `art/exports/megabob-title-wide.prompt.txt`. A prévia é uma composição de arte; a cena, os textos e a navegação do menu ficam para T13.

## Seleção de fases em 480×270

`tools/ui_art.py` recompõe as peças de U3: preserva os cantos da moldura, redimensiona só as bordas e monta o interior com cinco slots quadrados. Retratos e texto não ficam gravados no fundo. O cadeado e o foco são texturas independentes.

| Textura | Tamanho | Uso |
|---|---|---|
| `stage_select_wide` | 480×270 | Fundo e cinco molduras vazias, em `(0, 0)`, origem superior esquerda |
| `stage_locked_wide` | 64×64 | Cobertura do slot da fortaleza enquanto bloqueada, centrada em `(240, 208)` |
| `stage_focus` | 72×72 | Cantos amarelos de foco, centrados no slot selecionado |

Centros: Memory Leak `(240,62)`, Race Condition `(112,135)`, Bob `(240,135)`, Null Pointer `(368,135)` e fortaleza `(240,208)`. Cada moldura tem 64×64; os retratos dos chefes permanecem em 48×48 e o de Bob em 32×32, sem deformação.

`py -3 tools/art.py ui` exporta `art/exports/stage-select-layout.json` e as prévias `megabob-stage-select-locked.png` / `megabob-stage-select-unlocked.png`. As ampliações em `art/preview/` usam nearest-neighbor. São exemplos visuais de estado; os critérios de liberação, a escolha de fase e o save pertencem à T13.

## HUD e pausa em 480×270

U4 também fornece os componentes abaixo. Os arquivos anteriores continuam disponíveis.

| Textura | Tamanho | Uso |
|---|---|---|
| `hud_meter_frame` | 12×72 | Moldura com canal transparente de 6×56, começando em `(3,8)` |
| `hud_segment_blue` | 6×1 | Segmento de vida |
| `hud_segment_yellow` | 6×1 | Segmento de energia |
| `pause_panel_wide` | 352×208 | Painel vazio, centralizado no viewport, canto superior esquerdo `(64,31)` |

O canal comporta 28 segmentos em passo de 2 px (1 px preenchido, 1 px vazio). Para o segmento `i`, de baixo para cima, usar `x = frameX + 3` e `y = frameY + 8 + 56 - 2 - 2*i`. Preencher o fundo do canal com `#161616`. A prévia usa molduras em `(8,10)` e `(26,10)`.

`art/exports/hud-pause-layout.json` registra o painel, medidores, contador de vidas, linhas das armas e centros das quatro peças. Os ícones `armor_*` têm quadro 0 colorido/coletado e quadro 1 cinza/inativo; na pausa de exemplo são ampliados 2× com nearest-neighbor.

Prévias: `megabob-hud-preview.png`, `megabob-pause-start-preview.png` e `megabob-pause-complete-preview.png` em `art/exports/`, com ampliações em `art/preview/`. O cenário é uma composição de demonstração com os assets de Memory Leak. Texto e valores existem só nessas prévias; as texturas de jogo ficam vazias para a integração em T13/T21. As prévias não aplicam efeitos de armas, peças, coleta ou pausa ao jogo.

## Terreno e camadas para 480×270

A revisão segue `create-game-assets` e `phaser-core` do pack gamedev, preservando Phaser 3.90. Os materiais foram conferidos em repetições 3×3, em composições na escala nativa e no renderizador do jogo. O utilitário `asset_report.py` do pack verificou dimensões, alpha e limite de 29 cores; relatório local em `art/preview/gamedev_asset_report.json`.

Nos quatro tilesets, quadros 0–11 e 15–17 preenchem 16×16. Plataformas 12–14 ocupam a largura de 16 px e começam em `y=0`, mantendo o perfil fino. Isso remove as margens vazias que faziam o chão parecer separado e a plataforma ficar abaixo da linha de contato. `tiles_test` recebe a mesma normalização. Índices, tamanhos e colisões permanecem os mesmos; os detalhes aparecem em `frameSizing` e `topAlignedFrames` no manifesto.

As doze camadas originais continuam em 512×224. Cada uma ganhou a variante de chave `<chave_original>_wide`, em 512×270: FAR e MID ficam ancoradas embaixo; NEAR fica no alto. FAR estende sua linha superior para cobrir o céu, sem escalar os prédios; MID acrescenta transparência acima e NEAR abaixo. Os deslocamentos já estão gravados na imagem: desenhar todas em `(0,0)` com origem superior esquerda e repetir horizontalmente, sem esticar. Em Tech Debt, apenas MID/NEAR novas recebem uma rampa mais escura, mantendo os CRTs verdes para separar cenário e piso. A transformação está declarada em `depthAdjusted`; fontes e camadas originais ficam intactas.

`py -3 tools/art.py all`, ou os jobs `bg`/`tiles` após a primeira geração completa, montam `art/exports/megabob-environments.png` e quatro imagens `megabob-environment-<tema>.png`. `environment-art-layout.json` registra as chaves das camadas e tiles. São composições para revisar escala, contraste e encaixes; os mapas jogáveis continuam nas tarefas de fase. Repetições ampliadas dos tiles e camadas ficam em `art/preview/`.

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

O smoke test usa um perfil isolado do Edge headless, sem dependências adicionais. Confere as 120 texturas do lote e os 145 strips do Bob (265 no total), com seus quadros nas cenas Debug e Stage, registra erros de console/rede e salva screenshots em `art/preview/`. Requer Edge instalado no caminho indicado no script. Para outro servidor local, passe a URL: `node tools/check-assets.mjs http://127.0.0.1:5174`.

O lote está carregado pelo Boot e o mapa de teste usa os tiles reais. Animações e componentes ficam disponíveis para as tarefas de inimigos, chefes, fases e menus; o importador não implementa essas mecânicas.
