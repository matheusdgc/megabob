# Handoff: estado do projeto

> Atualizado em 06/11/2026, no fim da T7 (editor). Branch `dev`.
> Quem continuar: atualize este arquivo ao terminar cada tarefa.

## Feito (tudo commitado no `dev`)

| Tarefa | O que entrega |
|---|---|
| T1 | Vite 8 + Phaser 3.90 + TS 7 + Vitest 5, tela com escala inteira (hoje 480×270) |
| T2 | Input (teclado e gamepad) com buffer de pulo, manifesto de assets e placeholders |
| T4a | Pipeline `tools/sprites.py`: remove o fundo magenta, normaliza a escala pelo capacete, encaixa a armadura por sobreposição e pré-compõe as 15 combinações de peças |
| T3 | Movimento base (correr, pulo variável, coyote time), parser de mapa ASCII e mapa de teste |
| T4 | Deslize e chute na parede, dash, dash-jump e dash no ar (só com as Turbo Boots, 1 por pulo) |
| T4b | Pipeline `py -3 tools/art.py all`: 99 strips/imagens de efeitos, inimigos, chefes, ícones, tiles, fundos e UI registrados no Boot; logo recriada com faixas azuis inspiradas na IBM. Veja `docs/art-pipeline.md` |
| Enquadramento | Resolução interna de 256×224 para 480×270, a pedido do usuário (câmera estava próxima demais). `?view=LxA` compara opções em dev |
| T5 | Tiro: básico (máx. 3 na tela), carga em 2 níveis (3 com o bit de braço), aura, flash do cano, pose de tiro em todos os estados |
| T6 | Vida (28), recuo sem controle e piscar, espinhos e poço matam, descompilação (`fx_decompile`), 3 vidas, barra de vida (`src/ui/Hud.ts`). A Firewall Plating (bit 4) corta o dano pela metade e encurta o recuo |
| T7 | Inimigos: base `Enemy` (vida, dano por contato, flash, explosão `fx_explosion`), Pixel Mite (anda e vira em paredes e beiradas) e Spam Drone (paira e mergulha). Marcadores `m`/`d` no mapa. Itens com tabela de drop (`src/data/drops.ts`), piscam e somem. Tiros carregados (nível 2+) atravessam o inimigo que destroem |

São 332 testes passando, e o typecheck e o build também passam.

**Mudança importante:** a lógica da fase roda no evento `worldstep` da física (60 Hz fixos), e não no `update()` da cena. Antes, em monitores de 120 Hz ou mais, tudo o que conta quadros ficava 2 a 4 vezes mais rápido. Lógica nova que conte quadros deve entrar em `StageScene.tick()`.

## Pendente com o usuário

- **Checkpoint 1:** aprovado pelo usuário em 06/11, sem ajustes em `src/data/tuning.ts`.
- **Pedido novo:** uma tela de configuração para remapear teclas e botões. Virou a T13b em `tasks/todo.md`, depois da T13 (título, save e pausa), porque depende do save e dos menus.
- **Arte bruta fora do git:** `art/raw/enemies/`, `fx/`, `bosses/`, `bg/`, `tiles/` e `ui/`. A geração do lote terminou; fontes preservadas durante a importação. Confirme com o usuário antes de commitar essas pastas. Os arquivos processados ficam em `public/assets/`.
- **Deploy:** falta escolher onde publicar (GitHub Pages ou itch.io). Só é necessário na T23.
- **Licenças da trilha:** o usuário pediu para ignorar por enquanto. Faltam as faixas 05, 07, 08 e 09 em `docs/soundtrack.md`.

## Próximo passo: T8 (seções, checkpoint e porta)

Veja os detalhes em `tasks/todo.md`. Pontos de partida:

- **Respawn:** hoje a morte volta ao `P` do mapa (`StageScene.afterDeath()`), e os inimigos renascem via `spawnEnemies()`. O checkpoint deve trocar o ponto de respawn.
- **Arte pronta:** `checkpoint` (16×32, 2 quadros: desligado e ligado) e `boss_door` (32×48, 3 quadros) em `src/data/processedArt.ts`.
- **Energia de arma:** o item de energia só emite `weaponEnergy` na cena. O sistema de armas (T10) deve escutar esse evento.
- **Overlap entre grupos:** o Arcade pode entregar o par em qualquer ordem, por isso a `StageScene` identifica cada lado pelo tipo (`pick`). Faça o mesmo em overlaps novos.

Depois vêm T7 (inimigos e itens) e T8 (seções, checkpoint e porta). Isso fecha o Checkpoint 2.

## Arte

- **Processado:** Bob e armadura pelo pipeline anterior; lote completo de 99 strips/imagens por `tools/art.py`, incluindo ícones B11, terminal A3, peças A4, inimigos, chefes, efeitos, tiles, doze camadas de parallax e interface. Prévia e relatórios em `art/preview/`, fora do Git.
- **Reprodução:** `py -3 tools/art.py all`, ou uma categoria. Catálogo em `tools/art_catalog.py`, registro gerado em `src/data/processedArt.ts`. O job antigo `tools/sprites.py fx` continua disponível para o subconjunto anterior. `fx_hit` agora usa FX3, a fonte de impacto correto.
- **Conferência:** 66 PNGs brutos (65 canônicos e backup da logo), hashes inalterados durante a importação, nenhuma fonte sem classificação, bordas horizontais iguais nas doze camadas. Smoke test nas cenas Debug/Stage: 99 texturas, sem erros de console/rede. Detalhes em `docs/art-pipeline.md`.
- **Logo:** nova versão com faixas azuis inspiradas na IBM; export transparente em `art/exports/megabob-logo.png`, versão de jogo em `public/assets/ui/title_logo.png`. Logo anterior preservada em `art/raw/ui/U1_logo-original.png`.
- **Referências:** B1, A1 e três conceitos de chefes não geram texturas. Os novos arquivos estão carregados, mas seu uso nas mecânicas e menus depende das tarefas seguintes.

## Problemas conhecidos

- **Recorte da armadura corrigido:** o encaixe agora considera o desenho inteiro e só aceita posições dentro dos 48×48; air dash mantém uma escala compartilhada para caber inteiro. Os seis avisos de recorte foram eliminados. Restou o aviso de baixa sobreposição de `compile[0]`; ver `art/REGENERATE.md` e `art/preview/bob_report.json`.
- **Peças isoladas em poses horizontais:** no dash, a armadura com só algumas peças pode ter emendas, porque as regiões são divididas por altura. Com as 4 peças, o jogo usa o desenho completo.
- **Gamepad:** está mapeado, mas não foi testado com um controle de verdade.
- **Tiles:** mapa de teste usa os tiles reais de T1. Montagem visual das quatro fases e integração do parallax entram nas tarefas de fases.
- **Escalada numa parede só:** funciona, mas é lenta (`WALL_LOCK_FRAMES` = 8). Se o usuário reclamar, um valor de 5 ou 6 deve resolver.
- **Tiros e cenário:** os tiros atravessam paredes, como é comum no gênero. Se o usuário preferir que parem na parede, basta um `collider` entre `player.shots` e a camada de tiles.

## Testando no navegador sem o painel do desktop

O navegador do Obscura bloqueia `localhost`. Funciona controlar o Edge em modo headless pelo protocolo DevTools com um script Node sem dependências (Node 26 tem `WebSocket` nativo): `--headless=new --remote-debugging-port=<porta>`, depois `Runtime.evaluate`, `Input.dispatchKeyEvent` e `Page.captureScreenshot`.

## Trilha sonora

A seleção das 10 faixas está em `docs/soundtrack.md`, e os arquivos já foram renomeados no formato `uso__nome-original`. Eles ficam em `art/raw/soundtrack/`, **só na máquina do usuário** (fora do git). A conversão e o player entram na T11.
