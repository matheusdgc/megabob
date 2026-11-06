# Handoff: estado do projeto

> Atualizado em 06/11/2026, depois da T10 e da auditoria pelo pack de skills de game dev (editor). Branch `dev`.
> Quem continuar: atualize este arquivo ao terminar cada tarefa.

## Feito (tudo commitado no `dev`)

| Tarefa | O que entrega |
|---|---|
| T1 | Vite 8 + Phaser 3.90 + TS 7 + Vitest 5, tela com escala inteira (hoje 480×270) |
| T2 | Input (teclado e gamepad) com buffer de pulo, manifesto de assets e placeholders |
| T4a | Pipeline `tools/sprites.py`: remove o fundo magenta, normaliza a escala pelo capacete, encaixa a armadura por sobreposição e pré-compõe as 15 combinações de peças |
| T3 | Movimento base (correr, pulo variável, coyote time), parser de mapa ASCII e mapa de teste |
| T4 | Deslize e chute na parede, dash, dash-jump e dash no ar (só com as Turbo Boots, 1 por pulo) |
| T4b | Pipeline `py -3 tools/art.py all`: 120 strips/imagens registrados no Boot; UI em 480×270, tiles normalizados e doze variantes de parallax com 270 px de altura. Veja `docs/art-pipeline.md` |
| Enquadramento | Resolução interna de 256×224 para 480×270, a pedido do usuário (câmera estava próxima demais). `?view=LxA` compara opções em dev |
| T5 | Tiro: básico (máx. 3 na tela), carga em 2 níveis (3 com o bit de braço), aura, flash do cano, pose de tiro em todos os estados |
| T6 | Vida (28), recuo sem controle e piscar, espinhos e poço matam, descompilação (`fx_decompile`), 3 vidas, barra de vida (`src/ui/Hud.ts`). A Firewall Plating (bit 4) corta o dano pela metade e encurta o recuo |
| T7 | Inimigos: base `Enemy` (vida, dano por contato, flash, explosão `fx_explosion`), Pixel Mite (anda e vira em paredes e beiradas) e Spam Drone (paira e mergulha). Marcadores `m`/`d` no mapa. Itens com tabela de drop (`src/data/drops.ts`), piscam e somem. Tiros carregados (nível 2+) atravessam o inimigo que destroem |
| T8 | Câmera por seções (`src/systems/camera.ts`, `TEST_SECTIONS` em tiles): a câmera nunca sai da seção atual, e a troca de seção desliza a câmera com o jogo congelado. Inimigos pertencem a uma seção e renascem ao reentrar. Checkpoint (`C`) muda o ponto de respawn. Porta do chefe (`B`) abre ao encostar, leva o Bob sozinho, fecha atrás e emite `bossIntro`; a sala do chefe é `locked` |
| T9 | Chefe Memory Leak: `src/systems/boss.ts` (máquina de estados pura intro/fight/dead, dano com i-frames, 15 testes), `src/entities/Boss.ts` (sprite base, dispara `bossDefeated`), `src/entities/bosses/MemoryLeak.ts` (3 padrões: volley de bolhas → poças, afundar/emergir, fúria a 1/3 de vida), `src/ui/BossHealthBar.ts` (barra horizontal com fill na intro). StageScene spawna o chefe no `bossIntro` e reinicia no `afterDeath`. |
| T10 | Armas: `src/data/weapons.ts` (tabela, `WEAKNESS`, `damageFor`, arma de cada chefe) e `src/systems/weapons.ts` (arsenal: armas ganhas, troca Q/E pulando as não ganhas, energia por arma, recarga). Bob tingido pela arma. Garbage Collector (`src/entities/weapons/GarbageCollector.ts`): orbe lento, 1 na tela, 2 de energia, atravessa inimigos acertando cada um uma vez e engole o lodo do chefe. HUD com barra de energia; barras verticais reutilizáveis (`src/ui/meter.ts`), a do chefe à direita. `WeaponGetScene` depois do chefe, gravando a arma no registry (`ownedWeapons`) e voltando à fase. Dev key G dá o Garbage Collector |
| Auditoria gamedev | Código de T1–T10 revisado contra as skills do pack (`phaser-core`, `input-systems`, `level-design`, `game-feel`, `platformer`). **Cenas:** a `StageScene` zera o estado da partida em `init()` e solta seus eventos no `shutdown` (antes, `bossIntro`/`bossDefeated` se acumulavam a cada reinício); a `WeaponGet` não se pula mais sozinha. **Fase como dado:** `StageDef` em `src/stages/stages.ts` (mapa, seções, chefe, tileset), `scene.start('Stage', { stage })`. **Controles como dado:** `src/systems/bindings.ts` (`rebind` troca em conflito, `normalizeBindings` valida o save), lidos do registry `bindings`; teclas de dev só no build de dev. **Caminho crítico:** `src/systems/reach.ts` roda o `stepMotion` real num colisor de tiles e `tests/reach.test.ts` exige que toda fase chegue à porta do chefe com 75% do controle aéreo e sem dash. **Retorno:** níveis em `FEEDBACK` (`tuning.ts`): congelamento, tremor e flash por importância, poeira no pouso; `src/entities/feedback.ts` controla a pausa da física por motivos (congelamento e troca de seção). **Pulo:** correção de quina de até 4 px (`src/systems/corner.ts`) |

São 411 testes TypeScript e 17 testes Python passando; typecheck e build também passam. O smoke test de arte confere 265 texturas nas cenas Debug e Stage sem erros ou avisos.

**Mudança importante:** a lógica da fase roda no evento `worldstep` da física (60 Hz fixos), e não no `update()` da cena. Antes, em monitores de 120 Hz ou mais, tudo o que conta quadros ficava 2 a 4 vezes mais rápido. Lógica nova que conte quadros deve entrar em `StageScene.tick()`.

## Pendente com o usuário

- **Checkpoint 1:** aprovado pelo usuário em 06/11, sem ajustes em `src/data/tuning.ts`.
- **Pedido novo:** uma tela de configuração para remapear teclas e botões. Virou a T13b em `tasks/todo.md`, depois da T13 (título, save e pausa), porque depende do save e dos menus.
- **Arte bruta fora do git:** `art/raw/enemies/`, `fx/`, `bosses/`, `bg/`, `tiles/` e `ui/`. A geração do lote terminou; fontes preservadas durante a importação. Confirme com o usuário antes de commitar essas pastas. Os arquivos processados ficam em `public/assets/`.
- **Deploy:** falta escolher onde publicar (GitHub Pages ou itch.io). Só é necessário na T23.
- **Licenças da trilha:** o usuário pediu para ignorar por enquanto. Faltam as faixas 05, 07, 08 e 09 em `docs/soundtrack.md`.

## Próximo passo: T11 (áudio) ou T12 (fase Memory Leak)

As duas não dependem uma da outra. Checkpoint 3 (fim do dia 1) pede a fase Memory Leak jogável de ponta a ponta, com o Garbage Collector no fim. Pontos de partida:

- **T12:** a fase nova é uma entrada em `STAGES` (`src/stages/stages.ts`) com mapa próprio (`src/stages/memoryLeak.ts`), seções (a última `locked`), `boss: 'memoryLeak'` e tileset `tiles_memory_leak`; depois, `DEFAULT_STAGE` passa a apontar para ela. Os testes de `tests/stages.test.ts` e `tests/reach.test.ts` rodam sozinhos para cada entrada: se o caminho crítico falhar, ajuste o mapa, não o teste. Falta na `StageScene`: o parallax (`t1_memory_leak_far/mid/near`, ver variantes `_wide` do agente de arte) e os inimigos novos (Drip, Heap Crab).
- **Armas:** `player.arsenal` vem de `registry.get('ownedWeapons')`. O save em `localStorage` é da T13. Mutex Lock e Null Pointer ainda não disparam (`fireSpecial` ignora); entram na T14 e T15. Carregar armas especiais com o Compiler Cannon não foi feito.
- **Overlaps:** sempre identifique cada lado pelo tipo (`pick` no topo da `StageScene`). O chefe da T9 sumia por causa disso.
- **Eventos da cena:** o Phaser não limpa `this.events` no reinício. Evento novo da partida entra em `RUN_EVENTS` (`StageScene`). Pausar a física só por `this.fx.hold(motivo)` / `release(motivo)`, nunca `world.pause()` direto.
- **Fora da auditoria, por mudar a sensação aprovada no Checkpoint 1:** gravidade de queda maior que a de subida (a skill `platformer` recomenda 1,5–2×). Só aplicar se o usuário pedir.

## Arte

- **Processado:** Bob e armadura pelo pipeline anterior; lote completo de 120 strips/imagens por `tools/art.py`, incluindo ícones B11, terminal A3, peças A4, inimigos, chefes, efeitos, tiles, doze camadas originais e doze variantes de parallax para 270 px, e interface. Prévia e relatórios em `art/preview/`, fora do Git.
- **Reprodução:** `py -3 tools/art.py all`, ou uma categoria. Catálogo em `tools/art_catalog.py`, registro gerado em `src/data/processedArt.ts`. O job antigo `tools/sprites.py fx` continua disponível para o subconjunto anterior. `fx_hit` agora usa FX3, a fonte de impacto correto.
- **Conferência:** 67 PNGs brutos (65 previstos, fundo panorâmico adicional e backup da logo), hashes inalterados durante a importação, nenhuma fonte sem classificação, bordas horizontais iguais nas 24 camadas. Smoke test nas cenas Debug/Stage: 265 texturas (120 do lote e 145 do Bob), sem erros de console/rede. QA do pack gamedev em `art/preview/gamedev_asset_report.json`; detalhes em `docs/art-pipeline.md`.
- **Logo:** nova versão com faixas azuis inspiradas na IBM; export transparente em `art/exports/megabob-logo.png`, versão de jogo em `public/assets/ui/title_logo.png`. Logo anterior preservada em `art/raw/ui/U1_logo-original.png`.
- **Título panorâmico para T13:** usar `title_background_wide` (480×270) e `title_logo_night` (224×48, com contorno claro sobre o céu). Prévia em `art/exports/megabob-title-preview.png`, com fundo em `(0,0)` e logo em `(16,8)` a 2×. Artes originais preservadas; cena e navegação de menu ficam para T13.
- **Seleção para T13:** `stage_select_wide` (480×270) com cinco molduras vazias; `stage_locked_wide` (64×64) e `stage_focus` (72×72) separados. Coordenadas em `art/exports/stage-select-layout.json`; prévias `megabob-stage-select-locked.png` e `megabob-stage-select-unlocked.png` em `art/exports/`. Usar retratos existentes sem esticar; a lógica de seleção/liberação não foi alterada nesta fatia.
- **HUD/pausa para T13/T21:** `hud_meter_frame` (12×72, canal 6×56 para 28 segmentos), `hud_segment_blue` / `hud_segment_yellow` (6×1) e `pause_panel_wide` (352×208). Coordenadas em `art/exports/hud-pause-layout.json` e prévias `megabob-hud-preview.png`, `megabob-pause-start-preview.png`, `megabob-pause-complete-preview.png`. Ícones `armor_*`: quadro 0 coletado, quadro 1 inativo. Texturas sem texto; integração dos valores e menus fica com as tarefas correspondentes.
- **Referências:** B1, A1 e três conceitos de chefes não geram texturas. Os novos arquivos estão carregados, mas seu uso nas mecânicas e menus depende das tarefas seguintes.
- **Cenários para as fases:** tiles 0–11/15–17 ocupam seus 16×16; plataformas 12–14 ficam no topo e ocupam a largura, inclusive no alias `tiles_test`. Variantes de parallax `<chave_original>_wide` têm 512×270 e origem superior esquerda `(0,0)`. FAR/MID foram ancoradas embaixo e NEAR no alto, sem escalar; Tech Debt MID/NEAR usam tons mais escuros. Galeria `art/exports/megabob-environments.png`, quatro imagens de tema e `environment-art-layout.json`. As composições verificam arte; mapas e caminho crítico continuam sob as tarefas de fase.
- **Armadura revisada:** enquadramento dentro dos 48×48, escala compartilhada no air dash, partículas neutras de `compile[0]` iguais nas 16 combinações e divisões anatômicas específicas de `dash[1,3]`. O relatório do Bob está sem avisos. Prévia em `art/preview/bob_parts_comparison.png`; detalhes em `art/REGENERATE.md`. Trabalho de combate da T7 preservado.

## Problemas conhecidos

- **Gamepad:** está mapeado, mas não foi testado com um controle de verdade.
- **Tiles:** mapa de teste usa os tiles reais de T1. Montagem visual das quatro fases e integração do parallax entram nas tarefas de fases.
- **Escalada numa parede só:** funciona, mas é lenta (`WALL_LOCK_FRAMES` = 8). Se o usuário reclamar, um valor de 5 ou 6 deve resolver.
- **Tiros e cenário:** os tiros atravessam paredes, como é comum no gênero. Se o usuário preferir que parem na parede, basta um `collider` entre `player.shots` e a camada de tiles.

## Testando no navegador sem o painel do desktop

O navegador do Obscura bloqueia `localhost`. Funciona controlar o Edge em modo headless pelo protocolo DevTools com um script Node sem dependências (Node 26 tem `WebSocket` nativo): `--headless=new --remote-debugging-port=<porta>`, depois `Runtime.evaluate`, `Input.dispatchKeyEvent` e `Page.captureScreenshot`.

## Trilha sonora

A seleção das 10 faixas está em `docs/soundtrack.md`, e os arquivos já foram renomeados no formato `uso__nome-original`. Eles ficam em `art/raw/soundtrack/`, **só na máquina do usuário** (fora do git). A conversão e o player entram na T11.
