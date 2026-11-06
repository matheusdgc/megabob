# Handoff: estado do projeto

> Atualizado em 06/11/2026, no fim da T6 (editor). Branch `dev`.
> Quem continuar: atualize este arquivo ao terminar cada tarefa.

## Feito (tudo commitado no `dev`)

| Tarefa | O que entrega |
|---|---|
| T1 | Vite 8 + Phaser 3.90 + TS 7 + Vitest 5, tela com escala inteira (hoje 480×270) |
| T2 | Input (teclado e gamepad) com buffer de pulo, manifesto de assets e placeholders |
| T4a | Pipeline `tools/sprites.py`: remove o fundo magenta, normaliza a escala pelo capacete, encaixa a armadura por sobreposição e pré-compõe as 15 combinações de peças |
| T3 | Movimento base (correr, pulo variável, coyote time), parser de mapa ASCII e mapa de teste |
| T4 | Deslize e chute na parede, dash, dash-jump e dash no ar (1 por pulo; 2 com as Turbo Boots, a pedido do usuário) |
| T4b | Job `python tools/sprites.py fx`: recorta as folhas de efeitos por grade e gera `public/assets/fx/` (tiros, auras, flash, impactos e os efeitos das 3 armas) |
| Enquadramento | Resolução interna de 256×224 para 480×270, a pedido do usuário (câmera estava próxima demais). `?view=LxA` compara opções em dev |
| T5 | Tiro: básico (máx. 3 na tela), carga em 2 níveis (3 com o bit de braço), aura, flash do cano, pose de tiro em todos os estados |
| T6 | Vida (28), recuo sem controle e piscar, espinhos e poço matam, descompilação (`fx_decompile`), 3 vidas, barra de vida (`src/ui/Hud.ts`). A Firewall Plating (bit 4) corta o dano pela metade e encurta o recuo |

São 240 testes passando, e o typecheck e o build também passam.

**Mudança importante:** a lógica da fase roda no evento `worldstep` da física (60 Hz fixos), e não no `update()` da cena. Antes, em monitores de 120 Hz ou mais, tudo o que conta quadros ficava 2 a 4 vezes mais rápido. Lógica nova que conte quadros deve entrar em `StageScene.tick()`.

## Pendente com o usuário

- **Checkpoint 1:** aprovado pelo usuário em 06/11, sem ajustes em `src/data/tuning.ts`.
- **Pedido novo:** uma tela de configuração para remapear teclas e botões. Virou a T13b em `tasks/todo.md`, depois da T13 (título, save e pausa), porque depende do save e dos menus.
- **Arte bruta fora do git:** `art/raw/enemies/`, `fx/`, `bosses/`, `bg/` e `tiles/`. O agente de arte continua gerando. Confirme com o usuário antes de commitar essas pastas. Os sheets de efeitos já processados estão em `public/assets/fx/` (commitados).
- **Deploy:** falta escolher onde publicar (GitHub Pages ou itch.io). Só é necessário na T23.
- **Licenças da trilha:** o usuário pediu para ignorar por enquanto. Faltam as faixas 05, 07, 08 e 09 em `docs/soundtrack.md`.

## Próximo passo: T7 (inimigos base e itens)

Veja os detalhes em `tasks/todo.md`. Pontos de partida:

- **Dano no Bob:** `player.takeHit(amount, fromX)` aplica dano, recuo e invulnerabilidade. `fromX` é a posição horizontal da origem do golpe, e o Bob é empurrado para longe dela. Para matar na hora, use `fallOut()` ou `touchSpikes()`.
- **Tiros contra inimigos:** `player.shots` é o grupo Arcade para o `overlap`. Cada `Projectile` tem `level` e `damage`. Use `fx_hit` (tiro básico) e `fx_compiler_hit` (nível 3) no impacto.
- **Itens de vida:** use `heal(player.health, n)` de `src/systems/damage.ts`.
- **Arte:** os inimigos estão em `art/raw/enemies/` (E1 Pixel Mite e E2 Spam Drone primeiro), e os itens em `art/raw/fx/FX5_pickups.png`. Nenhum dos dois foi processado ainda.
- **Morte:** quando a animação de morte termina, o `Player` emite `deathDone`, e a `StageScene.afterDeath()` gasta uma vida e faz o respawn no início (os checkpoints chegam na T8). Na última vida, a cena emite `gameOver`.

Depois vêm T7 (inimigos e itens) e T8 (seções, checkpoint e porta). Isso fecha o Checkpoint 2.

## Arte

- **Processado:** o Bob (B2-B10) e a armadura (A2), em `public/assets/bob/`, e os efeitos FX1, FX2 e A5, em `public/assets/fx/`. A prévia fica em `art/preview/`, fora do git, e é regenerada pelo script.
- **Job `fx`:** cada animação é declarada em `FX_SHEETS` (`tools/sprites.py`) com linha, células e tamanho do quadro. O tamanho do quadro define o tamanho no jogo. O manifesto correspondente é `FX` em `src/data/assets.ts`. Para inimigos e chefes, dá para reaproveitar o mesmo recorte por grade com um job novo.
- **Chegou mas não foi processado:** `art/raw/enemies/` (E1-E10, com README), `art/raw/bosses/`, `art/raw/bg/` e `art/raw/tiles/`.
- **Ainda não usados:** B1 (folha de conceito) e B11 (ícones), além de A1, A3 e A4 (conceito da armadura, Update Terminal e ícones das peças).

## Problemas conhecidos

- **Quadros que passam do limite:** 4 quadros com armadura passam 1-2 px do quadro de 48 px: idle[0], jump[3], dash[2] e o airdash. Veja os avisos em `art/preview/bob_report.json`.
- **Peças isoladas em poses horizontais:** no dash, a armadura com só algumas peças pode ter emendas, porque as regiões são divididas por altura. Com as 4 peças, o jogo usa o desenho completo.
- **Gamepad:** está mapeado, mas não foi testado com um controle de verdade.
- **Tiles:** ainda são placeholders.
- **Escalada numa parede só:** funciona, mas é lenta (`WALL_LOCK_FRAMES` = 8). Se o usuário reclamar, um valor de 5 ou 6 deve resolver.
- **Tiros e cenário:** os tiros atravessam paredes, como é comum no gênero. Se o usuário preferir que parem na parede, basta um `collider` entre `player.shots` e a camada de tiles.

## Testando no navegador sem o painel do desktop

O navegador do Obscura bloqueia `localhost`. Funciona controlar o Edge em modo headless pelo protocolo DevTools com um script Node sem dependências (Node 26 tem `WebSocket` nativo): `--headless=new --remote-debugging-port=<porta>`, depois `Runtime.evaluate`, `Input.dispatchKeyEvent` e `Page.captureScreenshot`.

## Trilha sonora

A seleção das 10 faixas está em `docs/soundtrack.md`, e os arquivos já foram renomeados no formato `uso__nome-original`. Eles ficam em `art/raw/soundtrack/`, **só na máquina do usuário** (fora do git). A conversão e o player entram na T11.
