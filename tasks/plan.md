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

### T4b — lote completo de arte (05/11)

Reaproveitar os helpers de `tools/sprites.py` e o Pillow instalado, acrescentando um catálogo declarativo e um comando para os lotes completos. Não implementar as mecânicas T6–T20 nesta fatia.

1. Testar chave magenta, quadros vazios intencionais, escala compartilhada e fechamento horizontal de fundos com imagens sintéticas em memória.
2. Recortar efeitos, ícones, objetos, inimigos e chefes em strips PNG com metadados e prévias; dimensões e quantidade de quadros devem corresponder ao catálogo.
3. Produzir tiles 16×16, camadas 512×224 e UI. Preservar vazios e registrar diferenças que exijam revisão visual.
4. Registrar os novos arquivos no manifesto, conferir os hashes das fontes, testes Python, testes TS, typecheck, build e carregamento real no navegador.

As fontes permanecem intactas. Conceitos usados apenas como referência não viram texturas duplicadas do jogo. Fundos recebem fechamento de bordas nas cópias processadas; as prévias mostram duas repetições para conferir. Commits desta fatia não incluem as pastas brutas que o handoff pede confirmar separadamente.

### T4b — revisão do enquadramento da armadura

Corrigir a busca de encaixe para comparar a silhueta completa e aceitar apenas posições dentro dos 48×48. Aplicar uma escala compartilhada limitada pelo maior quadro no air dash. Testar o recorte nas bordas antes da correção, regenerar as saídas e comparar as prévias. Preservar fontes, resolução e a implementação de combate da outra sessão.

Na revisão de composição, compartilhar o efeito neutro `compile[0]` entre as 16 combinações e anotar os limites das peças em `dash[1,3]`, com testes que preservem rosto, peito, botas e canhão. Conferir os 145 strips do Bob junto às 99 texturas do lote no navegador. T7 continua exclusivamente com a outra sessão, conforme orientação do usuário.

### T4b — seleção de fases em 480×270

Recompor a moldura U3 com bordas preservadas e cinco slots quadrados: Memory Leak acima, Race Condition à esquerda, Bob no centro, Null Pointer à direita e fortaleza abaixo. Reutilizar retratos e cadeado existentes. Preparar fundo vazio, slot bloqueado e foco separado, mais prévias com a fortaleza bloqueada/liberada e um arquivo de coordenadas para T13. Conferir limites dos slots, alpha, paleta e carregamento no navegador. A arte não implementa regras de desbloqueio, seleção ou save.

### T4b — título em 480×270

Gerar uma fonte panorâmica adicional a partir de U2 com `imagegen`, preservando o original e a identidade do Bob. Processar `title_background_wide` e derivar `title_logo_night` com contorno claro. Registrar as duas texturas, montar uma prévia com a logo a 2× e documentar coordenadas para T13. Conferir paleta, dimensões, integridade das fontes e carregamento das 246 texturas. Não alterar cenas, controles ou mecânicas da outra sessão.

### T4b — HUD e pausa em 480×270

Derivar uma moldura de medidor com canal de 6×56 para 28 segmentos de 1 px separados por 1 px, segmentos azuis/amarelos e painel vazio de pausa 352×208. Reutilizar os elementos U4, ícones de armas e peças da armadura. Exportar coordenadas, prévia de HUD e pausas de início/equipamento completo, sem gravar texto nos assets nem implementar menus. Verificar que os 28 segmentos cabem, que não há alpha parcial ou cores fora da paleta e que os arquivos carregam na base commitada enquanto a outra sessão cuida das mecânicas.

### T4b — cenários e plataformas no viewport atual

Normalizar blocos/bordas/perigos para preencher seus quadros 16×16 e plataformas para ocupar a largura e começar no topo, mantendo o perfil fino; não alterar as colisões. Preparar variantes das doze camadas em 512×270: FAR/MID ancoradas embaixo e NEAR no alto, mantendo a escala da arte e as bordas periódicas. Preservar as camadas 512×224. Exportar quatro composições de demonstração em 480×270 e uma galeria com os temas, sem alterar os mapas da outra sessão. Testar preservação dos pixels, ancoragem, transparência e repetição horizontal; validar assets, build e navegador.

### T4b — apresentação de chefes e recompensas

Derivar duas molduras vazias da U4 para entrada de chefe e recompensa, preservando cantos e paleta. Compor prévias nativas dos quatro retratos de chefes, três armas e quatro peças, reutilizando o Bob com a peça correspondente. Exportar medidas locais a um container central e manter textos fora das texturas. Validar dimensões, paleta, alpha, carregamento no Phaser e as verificações do projeto. Fluxo de cenas, controles e efeitos das recompensas continuam com a outra sessão.

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
