# Handoff: estado do projeto

> Atualizado em 05/11/2026, à noite, no fim da sessão no editor (desktop). Branch `dev`, último commit `99d954c`.
> Quem continuar: atualize este arquivo ao terminar cada tarefa.

## Feito (tudo commitado no `dev`)

| Tarefa | O que entrega |
|---|---|
| T1 | Vite 8 + Phaser 3.90 + TS 7 + Vitest 5, tela de 256×224 com escala inteira |
| T2 | Input (teclado e gamepad) com buffer de pulo, manifesto de assets e placeholders |
| T4a | Pipeline `tools/sprites.py`: remove o fundo magenta, normaliza a escala pelo capacete, encaixa a armadura por sobreposição e pré-compõe as 15 combinações de peças |
| T3 | Movimento base (correr, pulo variável, coyote time), parser de mapa ASCII e mapa de teste |
| T4 | Deslize e chute na parede, dash, dash-jump e dash no ar (com as Turbo Boots) |

São 191 testes passando, e o typecheck e o build também passam.

## Pendente com o usuário

- **Checkpoint 1:** o usuário ainda **não aprovou a sensação de jogo** (pulo, dash e parede). Pergunte se aprova ou se quer ajustes antes de avançar muito. Os ajustes ficam em `src/data/tuning.ts`.
- **Deploy:** falta escolher onde publicar (GitHub Pages ou itch.io). Só é necessário na T23.
- **Licenças da trilha:** as faixas 05, 07, 08 e 09 estão sem autor ou fonte na tabela de `docs/soundtrack.md`. O usuário precisa preencher.

## Próximo passo: T5 (tiro do Bob)

Veja os detalhes em `tasks/todo.md`. Resumo:

- tiro básico (no máximo 3 na tela)
- carga em 2 níveis (o nível 3 só com o Compiler Cannon, bit de braço 2)
- aura de carga e pool de projéteis
- tiro em todos os estados

Pontos de partida:

- **Pose de tiro:** `src/systems/bobPose.ts` já tem as constantes de quadro `DASH.shoot` (3) e `WALL.shoot` (1). O sheet `bob_shoot` tem 7 quadros: parado, pulando, caindo e 4 de corrida.
- **Tiro na parede:** o tiro sai **para longe da parede**. O quadro foi desenhado com o canhão apontando para o lado oposto.
- **Corrida atirando:** o `run` tem 6 quadros e o `shoot` de corrida tem 4. Sincronize pela fração do ciclo.
- **Arte do tiro:** `art/raw/fx/FX1_buster.png` e `A5_compiler_shot.png` já chegaram, mas **ainda não foram processados**. O pipeline só tem o job `bob`. Crie um job genérico para efeitos e inimigos: tamanho de quadro por item, sem armadura, e linhas do arquivo como animações separadas.

Depois vêm T6 (vida, dano, morte), T7 (inimigos e itens) e T8 (seções, checkpoint e porta). Isso fecha o Checkpoint 2.

## Arte

- **Processado:** o Bob (B2-B10) e a armadura (A2), em `public/assets/bob/`. A prévia fica em `art/preview/`, fora do git, e é regenerada pelo script.
- **Chegou mas não foi processado nem commitado:** `art/raw/enemies/` (E1-E10, com README), `art/raw/fx/` (FX1, FX2, A5; o FX3 ainda só tem o prompt) e `art/raw/bosses/`. **O agente de arte do usuário ainda está gerando**, então confirme com o usuário antes de commitar essas pastas.
- **Ainda não usados:** B1 (folha de conceito) e B11 (ícones), além de A1, A3 e A4 (conceito da armadura, Update Terminal e ícones das peças).

## Problemas conhecidos

- **Quadros que passam do limite:** 4 quadros com armadura passam 1-2 px do quadro de 48 px: idle[0], jump[3], dash[2] e o airdash. Veja os avisos em `art/preview/bob_report.json`.
- **Peças isoladas em poses horizontais:** no dash, a armadura com só algumas peças pode ter emendas, porque as regiões são divididas por altura. Com as 4 peças, o jogo usa o desenho completo.
- **Gamepad:** está mapeado, mas não foi testado com um controle de verdade.
- **Tiles e espinhos:** os tiles ainda são placeholders. Os espinhos não causam dano antes da T6. Cair no poço só volta o Bob ao início.
- **Escalada numa parede só:** funciona, mas é lenta (`WALL_LOCK_FRAMES` = 8). Se o usuário reclamar, um valor de 5 ou 6 deve resolver.

## Trilha sonora

A seleção das 10 faixas está em `docs/soundtrack.md`, e os arquivos já foram renomeados no formato `uso__nome-original`. Eles ficam em `art/raw/soundtrack/`, **só na máquina do usuário** (fora do git). A conversão e o player entram na T11.
