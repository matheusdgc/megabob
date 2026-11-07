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
- Jogo: 123 strips/imagens em `public/assets/`, cada PNG acompanhado de atlas JSON para ferramentas externas. O Phaser usa os tamanhos de quadro do manifesto de spritesheets.
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

## Apresentações de chefes, armas e upgrades

`tools/presentation_art.py` deriva `boss_intro_panel` (416×112) e `reward_panel` (416×192) da moldura U4 com cantos preservados. As duas texturas são vazias, usam a paleta global e alpha binário. Não incluem texto, retrato ou sprite do Bob.

`art/exports/presentation-layout.json` descreve um container ancorado no centro do viewport de referência 480×270, com deslocamento de metade da moldura e posições locais para seus filhos. Usar escala inteira com letterbox; manter retratos e Bob a 2× com nearest-neighbor. As quatro prévias de upgrades usam somente o bit da peça correspondente. Os ícones da armadura mostram o quadro 0, coletado.

O job `ui` produz onze prévias `megabob-boss-*-preview.png`, `megabob-weapon-*-preview.png` e `megabob-upgrade-*-preview.png`, além da galeria `megabob-presentations.png`. Textos são amostras de composição; descrições vêm do SPEC e as teclas Q/E representam o binding padrão. A cena deve resolver o binding atual e o momento de confirmar. As artes estão prontas para integração; este job não altera `WeaponGetScene`, introduções de chefe ou instalação de peças.

QA: `art/preview/presentation_asset_report.json` registra as verificações do pack gamedev. O smoke test também renderiza as duas molduras no Phaser em uma cena temporária, com retrato/Bob/ícone/texto separados; screenshots `browser-presentation-boss.png` e `browser-presentation-reward.png`. A cena existe somente no processo de validação.

## Encerramento e Game Over

`ending_background` é uma imagem opaca 480×270, sem texto ou logo. A fonte adicional `art/raw/ui/U5_ending_bg.png` foi criada com a ferramenta integrada `imagegen`, tomando como referências `U2_title_bg_wide.png` e o Bob fornecido pelo usuário em `F:/Downloads/bob-standing-BECrMjXJ.webp`. O Bob mostra os dois olhos e acena à esquerda; o céu azul à direita permanece livre para os créditos. Fonte preservada em 1672×941, prompt integral ao lado e em `art/exports/megabob-ending.prompt.txt`. O processamento usa nearest-neighbor e a paleta global de 29 cores.

O job `ui` exporta `megabob-ending-preview.png` e `megabob-game-over-preview.png`, além de `end-screen-layout.json`. O layout usa um container centralizado no viewport de referência com escala inteira/letterbox. No encerramento, a logo existente fica separada em `(240,16)` e a área de créditos em `(248,132,216,90)`; os nomes e licenças reais devem vir da cena. A prévia traz somente a mensagem de conclusão e agradecimento, sem inventar créditos.

Game Over reutiliza `reward_panel` e `bob_hurt[0]` ampliado 2×. A ação de voltar à seleção tem retângulo/foco renderizado em código, sem gerar outra textura. O layout indica foco inicial, mas não implementa input, save ou navegação. As cenas de produção continuam com as tarefas T13/T19/T20.

As três imagens de saída foram conferidas pelo verificador do pack gamedev (dimensões, paleta e opacidade) e no Phaser. Relatório em `art/preview/end_screen_asset_report.json`; screenshots `browser-end-screen-ending.png` e `browser-end-screen-gameOver.png`. A fonte extra leva o inventário a 68 PNGs brutos, todos preservados durante a importação.

## Terreno e camadas para 480×270

A revisão segue `create-game-assets` e `phaser-core` do pack gamedev, preservando Phaser 3.90. Os materiais foram conferidos em repetições 3×3, em composições na escala nativa e no renderizador do jogo. O utilitário `asset_report.py` do pack verificou dimensões, alpha e limite de 29 cores; relatório local em `art/preview/gamedev_asset_report.json`.

Nos quatro tilesets, quadros 0–11 e 15–17 preenchem 16×16. Plataformas 12–14 ocupam a largura de 16 px e começam em `y=0`, mantendo o perfil fino. Isso remove as margens vazias que faziam o chão parecer separado e a plataforma ficar abaixo da linha de contato. `tiles_test` recebe a mesma normalização. Índices, tamanhos e colisões permanecem os mesmos; os detalhes aparecem em `frameSizing` e `topAlignedFrames` no manifesto.

As doze camadas originais continuam em 512×224. Cada uma ganhou a variante de chave `<chave_original>_wide`, em 512×270: FAR e MID ficam ancoradas embaixo; NEAR fica no alto. FAR estende sua linha superior para cobrir o céu, sem escalar os prédios; MID acrescenta transparência acima e NEAR abaixo. Os deslocamentos já estão gravados na imagem: desenhar todas em `(0,0)` com origem superior esquerda e repetir horizontalmente, sem esticar. Em Tech Debt, apenas MID/NEAR novas recebem uma rampa mais escura, mantendo os CRTs verdes para separar cenário e piso. A transformação está declarada em `depthAdjusted`. As fontes brutas ficam intactas; a revisão de cor T1 descrita abaixo atualiza ambas as alturas processadas.

`py -3 tools/art.py all`, ou os jobs `bg`/`tiles` após a primeira geração completa, montam `art/exports/megabob-environments.png` e quatro imagens `megabob-environment-<tema>.png`. `environment-art-layout.json` registra as chaves das camadas e tiles. São composições para revisar escala, contraste e encaixes; os mapas jogáveis continuam nas tarefas de fase. Repetições ampliadas dos tiles e camadas ficam em `art/preview/`.

## Regras do processamento

### Contraste da primeira fase

**Preservar a textura é requisito do usuário.** A primeira tentativa, que achatava o fundo e o interior dos blocos, foi rejeitada. `tools/memory_colors.py` agora usa mapas de cor bijetivos: azul acinzentado no fundo, metal quente nas superfícies e verde-água original nos perigos. Cada tom de entrada continua distinto; não se pintam faixas novas, não se preenchem regiões e não se suavizam detalhes. O quadro 16 do lodo permanece idêntico. A alteração atinge somente as seis camadas T1 e `tiles_memory_leak`; dimensões, alpha, índices, colisões, outras fases e fontes brutas são preservados. O manifesto registra `colorRoles: memory-cool-warm-textured`.

As paletas locais ficam em `memory_colors.py`, sem ampliar os candidatos da quantização padrão nem afetar as outras fases. T1 usa 2/16/17 cores visíveis nas camadas FAR/MID/NEAR e 32 no strip de tiles completo (33 entradas contando transparência). O limite padrão de 29 continua nos demais assets. `py -3 tools/review_memory_palette.py` compara as assinaturas espaciais das 30 regiões com o commit `f4eb18a`, anterior ao achatamento: cores podem mudar, mas todos os padrões de pixels devem permanecer. O relatório `art/exports/memory-color-profile.json` inclui os mapas de cor e as verificações; o QA do pack está em `art/preview/gamedev_memory_palette_report.json`.

Comparações da versão rejeitada com a restauração: `art/exports/megabob-memory-contrast.png` e a versão `-gray.png`; captura nativa atual em `megabob-memory-palette.png`. O comando `node tools/check-assets.mjs http://127.0.0.1:5173 --stage-colors=after` captura entrada, plataformas, poço, checkpoint, sala do chefe e uma amostra estática do lodo em altura de inspeção; `before` registra a referência antes da alteração. As capturas ficam em `art/preview/memory-contrast-{before,after}/`; o script de revisão precisa delas para regenerar as comparações. A galeria `megabob-memory-context.png` mostra entrada, checkpoint, lodo e uma pose do chefe no cenário. São inspeções visuais, não uma partida completa.

### Estados dos elementos interativos

`tools/check-stage-interactives.mjs` usa as classes reais `Checkpoint` e `BossDoor` em uma cena descartável com as mesmas profundidades de fundo da fase. Confere ativação única do terminal, quadros off/on e ponto de respawn preservado. Na porta, confere quadros fechado/meio/aberto, bloqueio liberado somente quando aberta, fechamento com um único retorno `shut` e reset para fechado. As dimensões do corpo permanecem constantes. Não altera os componentes de produção.

Depois do smoke test, `py -3 tools/review_memory_palette.py` exporta `megabob-memory-interactives.png`, o detalhe 2× `megabob-memory-interactives-detail.png` e `stage-interactives-review.json` em `art/exports/`. Os estados já têm leitura distinta na composição atual; sprites, paleta, texturas e regras foram mantidos. A prancha é uma inspeção dos componentes, sem substituir uma partida completa.

### Sprites e apresentação dos chefes

`py -3 tools/review_bosses.py` verifica 20 assets / 57 quadros: tamanho, alpha binário, paleta e ausência de quadros vazios. Exporta `boss-{memory-leak,race-condition,null-pointer,tech-core}-review.png`, `megabob-memory-leak-idle.gif` e `boss-art-review.json` em `art/exports/`. Tech Debt parede/partes, retratos e projéteis também entram na auditoria técnica. As folhas de Race Condition, Null Pointer e Tech Debt são poses revisadas; suas mecânicas ainda dependem das respectivas tarefas.

O Memory Leak implementado estava preso no quadro 0. `src/systems/memoryLeakArt.ts` agora seleciona idle, disparo, afundamento, emergência e dano a partir dos estados/timers existentes. A derrota continua usando a explosão e o ocultamento atuais. Bolhas/poças alternam seus dois quadros; ao reutilizar um projétil, textura e origem voltam para `memory_goo` e `(0.5,0.5)`, corrigindo a poça que reaparecia voando. Dimensões das hitboxes, ataques, tempos de luta e dano são preservados.

Cinco testes unitários cobrem os quadros por estado. O helper `tools/check-boss-art.mjs` reproduziu as falhas antes da correção e confirmou os quadros 0–5, dano no 6 e a reutilização de bolhas/poças no Phaser. Também verifica que o chefe espelha sua arte para olhar o Bob à direita, volta à esquerda e mantém o último sentido se os dois estão alinhados. O espelhamento não altera a hitbox. A comparação `art/exports/megabob-memory-leak-facing.png` mostra os dois sentidos em poses de inspeção; a escolha de quadros/ataques segue os estados existentes. Relatório e screenshots em `art/preview/boss-art-runtime-report.json` / `browser-boss-memory-leak-{left,right}.png`; a cena de QA é descartável e não modifica o mapa jogável.

O fundo magenta é removido com tolerância, preservando roxos e branco. Os strips usam alpha binário, nearest-neighbor e a paleta padrão de `tools/palette.py`, com os mapas locais de T1 descritos acima. Cada animação mantém uma escala compartilhada e a ancoragem declarada. Quadros vazios intencionais mantêm seus índices; vazios inesperados e recortes que excedam o quadro são erros.

Folhas com espaçamento irregular usam os intervalos de conteúdo; folhas de efeitos e tiles usam a grade declarada. Os tiles têm 16×16. Os fundos geram três camadas de 512×224 por fase: FAR com duas cores para preservar silhuetas, MID e NEAR com transparência. A correção de bordas garante igualdade entre as colunas inicial e final; as prévias repetidas permitem conferir a composição visual da emenda.

B1, A1, três conceitos de chefes e o logo anterior são referências, sem saída de runtime. Bob B2–B10, a armadura e air dash continuam no pipeline `py -3 tools/sprites.py bob`. O encaixe considera o desenho inteiro, restringe posições aos 48×48 e limita a escala compartilhada de poses grandes, sem recorte. `compile[0]` compartilha as partículas neutras entre todas as combinações. As duas poses horizontais B6 usam divisões anatômicas anotadas por peça. O relatório atual está sem avisos; veja `art/REGENERATE.md`.

Testes do enquadramento: `py -3 -m unittest discover -s tools -p test_bob_fit.py`. Para executar todos os testes Python, use `py -3 -m unittest discover -s tools -p 'test_*.py'`.

## Validação no jogo

### Revisão dos ciclos do Bob

`py -3 tools/review_animations.py` lê os 145 strips do Bob, verifica seus 594 quadros (tamanho, conteúdo, alpha e paleta) e garante que nenhum PNG bruto ou de produção mudou. A sequência e o fps vêm diretamente de `BOB_LOOPS` em `src/systems/bobPose.ts`. Não define tempos novos para as poses ligadas ao estado do personagem.

O comando exporta `art/exports/megabob-idle-review.gif` (3 fps), `megabob-run-review.gif` (12 fps) e `megabob-shoot-review.gif` (8 fps). Cada GIF compara as 16 combinações de armadura, com pixels ampliados 2× e linha de base. A escala de tempo do formato GIF é de 10 ms: os intervalos alternam para manter a duração total, com erro máximo de 5 ms no ciclo completo. Corrida e corrida com tiro duram ambas 500 ms. Metadados e hashes ficam em `bob-animation-review.json`; sete contatos de poses ficam em `art/preview/bob_*_pose_review.png`.

O smoke test verifica também os três ciclos no Phaser, nas 16 combinações, usando uma cena temporária e o avanço de `AnimationState`. Confere 288 posições de quadro, fps e 48 retornos ao primeiro quadro. O helper `tools/check-animation-loops.mjs` verifica o hash da definição; se ela mudar, regenere os GIFs/relatório antes de executar o smoke test. Isso confere a arte e as sequências; não substitui os checkpoints de jogabilidade.

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
# Com o servidor de desenvolvimento em http://127.0.0.1:5173:
node tools/check-assets.mjs
```

O smoke test usa um perfil isolado do Edge headless, sem dependências adicionais. Confere as 123 texturas do lote e os 145 strips do Bob (268 no total), com seus quadros nas cenas Debug e Stage, registra erros de console/rede e salva screenshots em `art/preview/`. Requer Edge instalado no caminho indicado no script. Para outro servidor local, passe a URL: `node tools/check-assets.mjs http://127.0.0.1:5174`.

O lote está carregado pelo Boot e o mapa de teste usa os tiles reais. Animações e componentes ficam disponíveis para as tarefas de inimigos, chefes, fases e menus; o importador não implementa essas mecânicas.
