# Megabob: instruções para agentes

Jogo de plataforma e ação em 16 bits estrelado pelo IBM Bob (Phaser 3 + TypeScript). Prazo: **07/11/2026**.

**Leia antes de mexer:**
- [SPEC.md](SPEC.md): o que é o jogo (aprovado)
- [tasks/plan.md](tasks/plan.md): arquitetura e ordem das fases
- [tasks/todo.md](tasks/todo.md): tarefas, com ✅ nas concluídas
- [docs/HANDOFF.md](docs/HANDOFF.md): **estado atual e próximos passos**
- [docs/art-prompts.md](docs/art-prompts.md) e [docs/soundtrack.md](docs/soundtrack.md): arte e música

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
- `art/raw/soundtrack/` fica fora do git (64 MB brutos). As faixas convertidas vão para `public/assets/music/`.

## Arquitetura (não quebre isto)

- **A lógica pura fica separada do Phaser.** `src/systems/` e `src/data/` não importam Phaser e são testados em `tests/`. Cenas (`src/scenes/`) e entidades (`src/entities/`) só orquestram.
- **Movimento do Bob:** a máquina de estados fica em `src/systems/motion.ts` (`stepMotion`) e a escolha do sprite em `src/systems/bobPose.ts`. `src/entities/Player.ts` só liga isso à física Arcade.
- **Números de ajuste** ficam só em `src/data/tuning.ts`.
- **Assets:** o manifesto `src/data/assets.ts` declara a chave e os quadros de cada sheet. O que não tiver arquivo vira placeholder gerado no Boot com o mesmo layout. `tests/assets.test.ts` confere se cada arquivo declarado existe com a largura certa.
- **Bob e a armadura:** a chave da textura é `bobKey(anim, armor)`. `armor` é um bitmask: cabeça=1, braço=2, corpo=4, pernas=8, e 15 é a armadura completa. O pipeline já gera as 15 combinações pré-compostas (`bob_<anim>_a<N>.png`).
- **Fases:** mapas ASCII em `src/stages/*.ts`, interpretados por `parseMap` (`src/stages/map.ts`). Legenda: `#` sólido, `=` plataforma de mão única, `^` espinho, `-` parede de fundo, `.` vazio, `P` início.
- **Quadros:** o Bob tem quadros de 48×48, com os pés na última linha e origin `(0.5, 1)`. A caixa de colisão é 14×30, e os tiles são 16×16. A tela interna é 480×270 (`src/config.ts`), com escala inteira. Em dev, `?view=640x360` testa outro enquadramento sem rebuild.

## Memória do projeto (ai-memory)

O servidor ai-memory roda num container Docker (`ai-memory`) em `http://127.0.0.1:49374`. O editor (inclusive a extensão dentro do IBM Bob) usa pelo plugin `ai-memory@ai-memory`, já ativado em `~/.agents/settings.json`.

- **Escopo deste projeto:** `workspace: "default"`, `project: "matheusdgc-megabob"`. Com `matheusdgc` como workspace, o servidor responde "not found".
- **Se as ferramentas `memory_*` não aparecerem:** o Docker provavelmente subiu depois da sessão, e o plugin falhou com "Connection closed". Com o Docker aberto, rode `/mcp`, escolha `plugin:ai-memory:ai-memory` e clique em **Reconnect**. Se não houver `/mcp`, abra uma sessão nova.
- **Último recurso (HTTP direto):** `POST http://127.0.0.1:49374/mcp` com os cabeçalhos `Content-Type: application/json` e `Accept: application/json, text/event-stream`, e um corpo JSON-RPC `tools/call`, passando o escopo acima em toda chamada. O wrapper de CLI `ai-memory` falha no Git Bash por causa do caminho de montagem do Docker.
- **Ao começar:** chame `memory_handoff_list` (ou aceite o handoff que o hook já mostrou). Ao encerrar, registre um handoff com `memory_handoff_begin`. O estado oficial continua sendo `docs/HANDOFF.md`, e o handoff do ai-memory só espelha esse arquivo.

## Testando no navegador

- `window.__game` existe só no modo dev.
- Se o painel do navegador estiver oculto, o `requestAnimationFrame` pausa. Avance os quadros manualmente com `__game.step(t, 16.6667)`, incrementando `t`.
- `?sprites` abre a tela de debug com todas as animações (teclas 1-4 ligam as peças da armadura).
- Na fase: **R** volta ao início, **F2** mostra as caixas de colisão e o estado do Bob, e **1-4** ligam as peças (4 = Turbo Boots, para o dash no ar).

## Limites (do SPEC)

- **Sempre:** conteúdo original. Nunca use sprites, música, nomes ou layouts de Mega Man ou de qualquer outro jogo. Não descaracterize o Bob em relação à referência.
- **Pergunte antes:** de adicionar dependências além de Phaser, Vite, TypeScript e Vitest (por exemplo, não instalamos `@types/node`; use `tests/node-shim.d.ts`), de mudar a resolução ou os controles, de cortar escopo, e de publicar o jogo ou dar push.
- **Versões:** Phaser **3.90**, propositalmente, e não o 4. TypeScript 7 strict com `noUncheckedIndexedAccess`.
- **Idioma:** responda ao usuário em português quando ele escrever em português. Código e commits ficam em inglês.
