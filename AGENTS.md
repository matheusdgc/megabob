# Megabob: instruções para agentes

Jogo de plataforma e ação em 16 bits estrelado pelo IBM Bob (Phaser 3 + TypeScript). Prazo: **07/11/2026**.

**Leia antes de mexer:**
- [SPEC.md](SPEC.md): o que é o jogo (aprovado)
- [tasks/plan.md](tasks/plan.md): arquitetura e ordem das fases
- [tasks/todo.md](tasks/todo.md): tarefas, com ✅ nas concluídas
- [docs/HANDOFF.md](docs/HANDOFF.md): **estado atual e próximos passos**
- [docs/art-prompts.md](docs/art-prompts.md) e [docs/soundtrack.md](docs/soundtrack.md): arte e música

## Skills de game dev (pack `gamedev@awesome-gamedev-agent-skills`)

O ponto de entrada do pack é o `router`. Motor detectado: **Phaser 3.90**. Leia antes de cada tarefa:

| Tarefa | Skills do pack |
|---|---|
| T12, T14, T15, T18 (fases) | `disciplines/level-design`, `genres/platformer` (e `references/feel-tuning.md`) |
| Inimigos e chefes (T12-T19) | `disciplines/game-ai`, `web-engines/phaser-arcade-physics` |
| T11, T20 (áudio) | `disciplines/audio-design` |
| T13 (título, seleção, save, pausa) | `disciplines/save-systems`, `disciplines/game-ui-ux`, `web-engines/phaser-core` (`references/scene-flow.md`) |
| T13b (remapear controles) | `disciplines/input-systems` (`references/buffering-and-accessibility.md`) |
| T21, T22 (polimento, desempenho) | `disciplines/game-feel`, `disciplines/camera-systems`, `disciplines/performance-optimization` |
| T23 (deploy) | `workflows/itch-publish` (GitHub Pages: sem skill no pack) |

Regras que o pack reforça e que já valem aqui:
- **Medidas do Bob dimensionam o mapa.** O pulo alcança cerca de 53 px de altura (3,3 tiles) e 63 px de distância parado no chão (cerca de 4 tiles), medidos no jogo. Vãos obrigatórios devem ter no máximo uns 70% disso. Os vãos no limite ficam para caminhos opcionais.
- **Toda fase precisa de um caminho crítico jogável do início ao chefe**, verificado em teste e no navegador, sem teletransporte. O teste já existe: `tests/reach.test.ts` roda o controle real do Bob (`src/systems/reach.ts`) em cada fase de `STAGES`, com 75% do controle aéreo e sem dash.
- **Pelo menos 4 inimigos em cada seção de cada fase** (fora a sala do chefe), regra do usuário verificada por `tests/stages.test.ts`. Inimigos sobre chão firme onde um golpe jogaria o Bob num poço.
- **Descanso antes do chefe:** saúde na última seção e nenhum inimigo nos 6 tiles antes da porta (teste em `tests/stages.test.ts`).
- **Retorno proporcional ao evento:** congelamento, tremor e flash vêm da tabela `FEEDBACK` (`src/data/tuning.ts`), por `this.fx.play(evento)`. Ações rotineiras não tremem a tela.

## Comandos

```
npm install
npm run dev          # http://localhost:5173 (porta fixa)
npm test             # vitest run
npm run typecheck    # tsc --noEmit
npm run build        # typecheck + vite build -> dist/
python tools/sprites.py bob   # art/raw -> public/assets/bob (Python + Pillow)
```

Toda tarefa só fecha com `npm test`, `npm run typecheck` e `npm run build` passando, o console do navegador sem erros e um commit.

## Git

- Trabalhe no branch **`dev`**. O `main` só recebe o merge final. Não dê push sem pedir ao usuário.
- Faça um commit por tarefa ou fatia, com mensagem no estilo `feat: <o que> (T5)` e um corpo curto explicando o porquê.
- **Não inclua agentes como coautores:** nada de linha `Co-Authored-By` (nem outra atribuição a IA) em commits ou PRs, até o usuário autorizar.
- `art/raw/soundtrack/` fica fora do git (64 MB brutos). As faixas convertidas vão para `public/assets/music/`.

## Arquitetura (não quebre isto)

- **A lógica pura fica separada do Phaser.** `src/systems/` e `src/data/` não importam Phaser e são testados em `tests/`. Cenas (`src/scenes/`) e entidades (`src/entities/`) só orquestram.
- **Movimento do Bob:** a máquina de estados fica em `src/systems/motion.ts` (`stepMotion`) e a escolha do sprite em `src/systems/bobPose.ts`. `src/entities/Player.ts` só liga isso à física Arcade.
- **Números de ajuste** ficam só em `src/data/tuning.ts`.
- **Assets:** o manifesto `src/data/assets.ts` declara a chave e os quadros de cada sheet. O que não tiver arquivo vira placeholder gerado no Boot com o mesmo layout. `tests/assets.test.ts` confere se cada arquivo declarado existe com a largura certa.
- **Bob e a armadura:** a chave da textura é `bobKey(anim, armor)`. `armor` é um bitmask: cabeça=1, braço=2, corpo=4, pernas=8, e 15 é a armadura completa. O pipeline já gera as 15 combinações pré-compostas (`bob_<anim>_a<N>.png`).
- **Fases:** cada fase é um `StageDef` em `src/stages/stages.ts` (mapa, seções da câmera, chefe, tileset); a `StageScene` monta a que receber em `scene.start('Stage', { stage })`. Mapas ASCII em `src/stages/*.ts`, interpretados por `parseMap` (`src/stages/map.ts`). Legenda: `#` sólido, `=` plataforma de mão única, `^` espinho, `-` parede de fundo, `.` vazio, `P` início, `m`/`d` inimigos, `C` checkpoint, `B` porta do chefe.
- **Cenas (Phaser reaproveita a instância):** estado da partida é zerado em `init()`, nunca em inicializador de campo. Listeners em `this.events` não somem no reinício: registre o evento em `RUN_EVENTS` da `StageScene`. Pausa da física só por `this.fx.hold/release(motivo)`.
- **Texto de interface:** sempre `uiText` de `src/ui/text.ts` (HTML sobre o canvas, nítido em qualquer zoom), nunca `this.add.text`. Telas novas usam `fadeIn`/`fadeTo` do mesmo arquivo, e menus usam `new GameInput(this, true)` (ignora teclas ainda seguradas da tela anterior).
- **Save:** progresso só por `getSave`/`commitSave` (`src/scenes/progress.ts`); o formato é `src/systems/save.ts`. Mudou o formato? Suba `SAVE_VERSION` e escreva a migração no `parseSave`.
- **Controles:** a jogabilidade lê ações (`ActionState`), nunca teclas. O mapeamento é dado (`src/systems/bindings.ts`, registry `bindings`); a tela de controles (T13b) usa `rebind` e o save passa por `normalizeBindings`.
- **Quadros:** o Bob tem quadros de 48×48, com os pés na última linha e origin `(0.5, 1)`. A caixa de colisão é 14×30, e os tiles são 16×16. A tela interna é 480×270 (`src/config.ts`), com escala inteira. Em dev, `?view=640x360` testa outro enquadramento sem rebuild.

## Memória do projeto (ai-memory)

O servidor ai-memory roda num container Docker (`ai-memory`) em `http://127.0.0.1:49374`.

- **Escopo deste projeto:** `workspace: "default"`, `project: "matheusdgc-megabob"`. Com `matheusdgc` como workspace, o servidor responde "not found".
- **Se a memória não responder:** confira se o Docker está aberto e reconecte a ferramenta.
- **HTTP direto:** `POST http://127.0.0.1:49374/mcp` com os cabeçalhos `Content-Type: application/json` e `Accept: application/json, text/event-stream`, e um corpo JSON-RPC `tools/call`, passando o escopo acima em toda chamada. O wrapper de CLI `ai-memory` falha no Git Bash por causa do caminho de montagem do Docker.
- **Ao começar:** chame `memory_handoff_list` (ou aceite o handoff que o hook já mostrou). Ao encerrar, registre um handoff com `memory_handoff_begin`. O estado oficial continua sendo `docs/HANDOFF.md`, e o handoff do ai-memory só espelha esse arquivo.

## Testando no navegador

- `window.__game` existe só no modo dev.
- Se o painel do navegador estiver oculto, o `requestAnimationFrame` pausa. Avance os quadros manualmente com `__game.step(t, 16.6667)`, incrementando `t`.
- `?sprites` abre a tela de debug com todas as animações (teclas 1-4 ligam as peças da armadura).
- Na fase: **R** volta ao início, **F2** mostra as caixas de colisão e o estado do Bob, e **1-4** ligam as peças (4 = Turbo Boots, para o dash no ar), e **H** dá um golpe de 4 de dano no Bob.

## Limites (do SPEC)

- **Sempre:** conteúdo original. Nunca use sprites, música, nomes ou layouts de Mega Man ou de qualquer outro jogo. Não descaracterize o Bob em relação à referência.
- **Pergunte antes:** de adicionar dependências além de Phaser, Vite, TypeScript e Vitest (por exemplo, não instalamos `@types/node`; use `tests/node-shim.d.ts`), de mudar a resolução ou os controles, de cortar escopo, e de publicar o jogo ou dar push.
- **Versões:** Phaser **3.90**, propositalmente, e não o 4. TypeScript 7 strict com `noUncheckedIndexedAccess`.
- **Idioma:** responda ao usuário em português quando ele escrever em português. Código e commits ficam em inglês. **Todo texto que o jogador vê é em português (pt-BR)**, a pedido do usuário; nomes dos chefes e das armas (Memory Leak, Garbage Collector...) e o Buster ficam como termos de programação.
