# Implementation Plan: Megabob

> Spec: [SPEC.md](../SPEC.md) · Arte: [docs/art-prompts.md](../docs/art-prompts.md) · Tarefas detalhadas: [todo.md](todo.md)
> Janela: noite de 05/11 + 06/11 (dia 1) + 07/11 (dia 2)

## Visão geral

Construir o jogo em **fatias jogáveis**. Primeiro o Bob se movendo com boa sensação de jogo num mapa de teste. Depois, uma fase completa com chefe e arma, de ponta a ponta. Só então replicar o padrão para as outras fases, a armadura e a fortaleza. A arte chega em paralelo (um agente já está gerando os sprites do Bob) e entra pelo pipeline sem bloquear o código: até lá, o jogo usa placeholders do mesmo tamanho.

## Decisões de arquitetura

- **Lógica pura separada do Phaser.** `src/data/` (tabelas) e `src/systems/` (dano, armas, upgrades, save, máquina de estados do player) não importam Phaser e são testados com Vitest. Cenas e entidades só orquestram.
- **Mapas em ASCII dentro do TS, não no Tiled.** Eu consigo escrever e revisar cada fase como um grid de caracteres (`#` chão, `^` espinho, `=` plataforma, `E1` inimigo…), sem ferramenta externa, e o diff fica legível. O spec já previa isso como alternativa.
- **Câmera por seções.** Cada fase é uma lista de retângulos de seção. A câmera rola dentro da seção atual e trava nas bordas, e a sala do chefe trava a câmera.
- **Física Arcade a 60 Hz fixos.** A colisão com tiles é AABB. Deslizar na parede, coyote time e buffer de pulo ficam na máquina de estados do player, não na física.
- **Placeholders com as mesmas chaves dos assets reais.** No boot, gero texturas geométricas com o mesmo nome e tamanho de quadro que os spritesheets finais (`src/data/assets.ts` é o manifesto). Trocar pela arte real não exige mudar código.
- **Pipeline de arte em Python + Pillow** (`tools/sprites.py`, já instalado na máquina, sem dependência no npm). O script lê `art/raw/`, remove o fundo, detecta cada quadro pelo bounding box, reduz com nearest-neighbor até a altura alvo, quantiza na paleta global e escreve o PNG mais o JSON de spritesheet em `public/assets/`.
- **Armadura em camadas.** O player é um container com o sprite base e até 4 camadas de peças que compartilham o índice de quadro. O pipeline recorta cada peça da versão com armadura completa por máscara de região.
- **Áudio:** música de faixas livres (ver `docs/soundtrack.md`), normalizada e convertida por `tools/music.py`, tocada por um player WebAudio com loop sem emenda. SFX e jingles são sintetizados em código.
- **Save versionado** no `localStorage` (`megabob.save.v1`).
- **Pooling de projéteis e partículas** desde o início, para garantir os 60 fps.

## Ordem das fases (resumo — detalhes em todo.md)

| Fase | Tarefas | Quando | Saída |
|---|---|---|---|
| 1. Fundação | T1-T4 | noite 05/11 → manhã 06/11 | Bob anda, pula, dasha e escala parede num mapa de teste. O pipeline transforma B1/B2 em sprites. |
| ✅ Checkpoint 1 | | | **Você testa a sensação de jogo** (é o maior risco do projeto) |
| 2. Combate | T5-T8 | 06/11 | Tiro e carga, vida e morte, inimigos, itens, seções, checkpoint e porta |
| ✅ Checkpoint 2 | | | Fase de teste jogável com inimigos |
| 3. Primeira fatia vertical | T9-T12 | 06/11 | Fase Memory Leak completa: chefe, arma ganha, música e SFX |
| ✅ Checkpoint 3 (fim do dia 1) | | | Dá para terminar a Memory Leak de ponta a ponta |
| 4. Fluxo do jogo | T13, T13b | manhã 07/11 | Título, seleção de fases, save, game over, pausa e configuração de controles |
| 5. Outras fases | T14-T15 | 07/11 | Race Condition e Null Pointer com chefes e armas |
| ✅ Checkpoint 4 | | | 3 chefes em qualquer ordem, com o ciclo de fraquezas funcionando |
| 6. Armadura | T16-T17 | 07/11 | 4 peças, Update Terminal e camadas no sprite |
| 7. Final | T18-T20 | 07/11 | Fortaleza, Tech Debt (2 fases), créditos e todas as músicas |
| ✅ Checkpoint 5 | | | Jogo completo de ponta a ponta |
| 8. Polimento e entrega | T21-T23 | fim do 07/11 | Arte real integrada, performance, balanceamento, build e deploy |

**Contínua (paralela a tudo):** T4b, integrar cada lote de arte novo assim que ele chegar em `art/raw/`.

## Paralelização

- **A arte** já roda em paralelo (agente seu). Eu integro por lotes.
- **T14 e T15** (Race Condition e Null Pointer) mexem em arquivos separados (`stages/`, `bosses/`, `enemies/` de cada uma) depois que a T12 fixar o padrão de fase. Podem rodar em sessões paralelas, se você quiser.
- **T20 (músicas)** é independente depois que o motor de áudio (T11) estiver pronto.

## Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Sensação de jogo ruim (pulo/dash/parede) | Alto | Fica na fase 1, com o Checkpoint 1 com você. Todas as constantes de ajuste ficam num arquivo só (`src/data/tuning.ts`). |
| Arte do GPT inconsistente entre quadros ou desalinhada | Alto | O pipeline normaliza pela linha do chão e pelo centro. Os quadros problemáticos voltam para regeneração com a lista do que corrigir. |
| Camadas da armadura desalinhadas | Médio | Plano B do spec: só trocar para a armadura completa com 4/4 peças, e mostrar as peças parciais por detalhes de cor. |
| Escopo (4 fases, 4 chefes, armadura) em 2 dias | Alto | Fatias verticais e uma lista de corte pré-definida (abaixo). O jogo continua jogável a cada checkpoint. |
| Gradientes e anti-aliasing nos PNGs do GPT (já visto no capacete do B1) | Baixo | A quantização na paleta global achata tudo em blocos de cor. |
| Performance com muitos projéteis | Baixo | Pooling e limite de 3 tiros do Bob na tela. |

## Lista de corte (nesta ordem, se o tempo apertar)

1. Clones fora de sincronia do Race Condition → vira só dashes e arremessos
2. Fase 2 do Tech Debt → luta de fase única
3. Camadas parciais da armadura → plano B (armadura completa com 4/4)
4. Debug Visor revelando passagens → só mostra a vida do chefe
5. Faixas próprias da fortaleza e do Tech Debt → reaproveitar a música dos chefes
6. Remapear o gamepad na tela de controles (T13b) → só teclado remapeável
7. Suporte a gamepad

## Perguntas em aberto

- **Onde publicar** (GitHub Pages ou itch.io): só preciso saber na T23.
- **Seu agente de sprites:** ele está seguindo a ordem de prioridade do `art-prompts.md` (B1-B8 → FX1/FX3/FX5 → E1/E2 → …)? Se estiver, o pipeline já consome os lotes nessa ordem.
