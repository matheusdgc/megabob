# Spec: Megabob

> Status: **rascunho — aguardando aprovação**
> Prazo: 2 dias (a partir de 2026-11-05)

## Objetivo

Um jogo de plataforma e ação em 2D com cara de 16 bits, no gênero "run-and-gun com chefes robôs", estrelado pelo mascote IBM Bob. A gente pega as mecânicas que definem o gênero (escolher a fase, derrotar o chefe, ganhar a arma dele, explorar as fraquezas entre chefes) e faz tudo o mais original: personagens, fases, chefes e arte. A música vem de faixas livres de direitos autorais, com crédito.

**Fora do escopo:** sprites, músicas, nomes, personagens ou layouts de fase de qualquer jogo existente. A referência é o gênero e a sensação de jogar, não o conteúdo de outro jogo.

**Quem joga:** quem for avaliar o desafio, direto no navegador, sem instalar nada.

**Sucesso:** dá para jogar do começo ao fim em uns 15 a 25 minutos: título, seleção de fases, 3 fases com chefe, 4 peças de armadura escondidas, fase final e créditos. Tudo roda a 60 fps estáveis num notebook comum.

### Conceito (liberdade criativa)

Bob invade um sistema corrompido para eliminar 3 "bugs" que viraram chefes. Cada um dá uma arma:

| Chefe | Fase | Arma ganha | Fraco contra |
|---|---|---|---|
| **Memory Leak** | Data center inundado (lodo de memória que sobe) | *Garbage Collector*: orbe que suga projéteis e passa através dos inimigos | Mutex Lock |
| **Race Condition** | Barramento de alta velocidade (esteiras e plataformas rápidas) | *Mutex Lock*: congela por um instante os inimigos na tela | Null Pointer |
| **Null Pointer** | Vazio digital (plataformas que somem e reaparecem) | *Null Pointer*: tiro que teleporta curto e atravessa paredes finas | Garbage Collector |
| **Tech Debt** (final) | Fortaleza legada | — | qualquer arma, um pouco mais com o tiro carregado |

O ciclo de fraquezas fecha (Memory Leak → Race Condition → Null Pointer → Memory Leak), então qualquer ordem de fases funciona e sempre existe uma ordem "ideal".

### Mecânicas do Bob (sensação de 16 bits)

- Andar, pulo com altura variável (soltar o botão corta o pulo), cair com controle no ar
- Tiro básico (no máximo 3 projéteis na tela) e tiro carregado em 2 níveis (o 3º nível vem com a armadura)
- Dash no chão (o dash no ar vem com a armadura)
- Deslizar na parede e pular da parede
- Invencibilidade com piscar e recuo (knockback) ao levar dano
- Trocar de arma (L/R ou Q/E) e barra de energia por arma
- Itens que caem: vida pequena/grande, energia de arma, vida extra
- Entrada na fase: Bob se "compila" a partir de pixels que caem. Na morte, ele se "descompila" em pixels. Os dois efeitos são originais do jogo.
- A cor do Bob muda conforme a arma equipada (troca de paleta feita em código)

### Armadura Firmware (upgrades)

São 4 peças, cada uma liberada num **Update Terminal** escondido numa fase. São opcionais, mas facilitam bastante o jogo.

| Peça | Efeito | Onde fica |
|---|---|---|
| **Turbo Boots** (pernas) | dash no ar, 1 por pulo | Race Condition, num caminho alternativo, sem pré-requisito |
| **Firewall Plating** (corpo) | dano recebido ÷ 2 e recuo menor | Memory Leak, numa sala atrás de um poço de lodo |
| **Debug Visor** (cabeça) | revela passagens escondidas e mostra a vida dos chefes | Null Pointer, num ponto alto, sem pré-requisito |
| **Compiler Cannon** (braço) | tiro carregado nível 3 e armas especiais carregáveis | Memory Leak, atrás de um vão que só se cruza com dash no ar (exige voltar à fase) |

- **Visual:** cada peça coletada aparece no sprite do Bob, desenhada em camadas (Bob base + só as peças que o jogador tem).
- **Arte:** gerada pelos prompts A1-A5 de [docs/art-prompts.md](docs/art-prompts.md).
- **Telas:** pegar uma peça abre uma tela curta de "upgrade instalado" com o nome e o efeito. O menu de pausa mostra as peças coletadas.

### Estrutura do jogo

- Telas: Boot → Título → Seleção de fases (3 chefes, e a fortaleza libera depois dos 3) → Fase → Chefe → "Arma ganha" → Seleção → Fortaleza → Créditos
- Fases já vencidas podem ser jogadas de novo pela seleção, para buscar as peças que faltam
- Cada fase: aproximadamente 3 a 4 telas de largura × algumas seções, 1 checkpoint no meio e porta de chefe
- Vidas: 3. Game over volta para a seleção de fases e mantém as armas ganhas
- Progresso salvo no `localStorage` (chefes derrotados e peças de armadura coletadas)
- Controles: teclado (setas/WASD, Z = pular, X = atirar, C = dash, Q/E = trocar arma, Enter = pausar) e gamepad pela Gamepad API

## Tech Stack

- **Phaser 3** (última 3.x estável) com física Arcade
- **TypeScript** (strict)
- **Vite** para dev server e build estático
- **Tiled** (formato JSON) para os mapas das fases. Se o Tiled atrapalhar, os mapas viram arrays em TS
- **Arte:** gerada no ChatGPT pelos prompts de [docs/art-prompts.md](docs/art-prompts.md) (Bob, inimigos, chefes, cenários, efeitos, UI). As imagens brutas ficam em `art/raw/`. Um script de pós-processamento (`tools/`) remove o fundo, reduz com nearest-neighbor, trava as cores na paleta global e monta os spritesheets em `public/assets/`. Enquanto a arte não chega, o jogo usa placeholders geométricos do mesmo tamanho.
- **Música:** 10 faixas livres de direitos autorais, escolhidas em [docs/soundtrack.md](docs/soundtrack.md): título, seleção, 3 fases, chefes, fortaleza, Tech Debt fase 1 e 2, e créditos. As faixas são normalizadas e convertidas para OGG + MP3 por script, e tocam com loop sem emenda via WebAudio, com pontos de loop num manifesto.
- **SFX e jingles:** sintetizados em código com WebAudio. Os jingles são: início da fase, entrada do chefe, arma ganha, upgrade instalado e game over.
- **Resolução interna:** 256×224 (proporção de 16 bits), escala inteira, `pixelArt: true`
- **Testes:** Vitest

## Comandos

```
Instalar:   npm install
Dev:        npm run dev          # vite, http://localhost:5173
Build:      npm run build        # tsc --noEmit && vite build → dist/
Preview:    npm run preview
Testes:     npm test             # vitest run
Typecheck:  npm run typecheck    # tsc --noEmit
```

## Estrutura do projeto

```
src/
  main.ts              → config do Phaser e registro das cenas
  scenes/              → Boot, Title, StageSelect, Stage, BossIntro, WeaponGet, Credits, Pause
  entities/            → Player, Enemy (base + tipos), Boss (base + 4 chefes), Projectile, Pickup
  systems/             → input, câmera, dano/fraquezas, save, transição entre telas
  audio/               → player de música (loop/crossfade), sintetizador de SFX e jingles
  data/                → tabelas: armas, fraquezas, stats dos chefes, peças de armadura, definição das fases
  ui/                  → HUD (barras de vida/energia), menus
public/
  assets/sprites/      → spritesheets do Bob e dos outros personagens (PNG + JSON)
  assets/tiles/        → tilesets
  assets/maps/         → mapas Tiled (.json)
tests/                 → testes Vitest da lógica pura
art/raw/               → PNGs brutos gerados no ChatGPT (bob/, enemies/, bosses/, fx/, tiles/, bg/, ui/)
tools/                 → script de pós-processamento de sprites (raw → public/assets)
docs/art-prompts.md    → prompts de arte para o ChatGPT
SPEC.md                → este documento
tasks/                 → plan.md e todo.md (fase de planejamento)
```

## Estilo de código

- Lógica de jogo **pura e testável** fica separada do Phaser (`data/` e `systems/`). As cenas e entidades só orquestram.
- Máquinas de estado explícitas para o player e os chefes.
- Números de ajuste (velocidade, gravidade, i-frames) ficam em constantes nomeadas, nunca soltos no código.

```ts
// src/data/weapons.ts
export type WeaponId = 'buster' | 'garbageCollector' | 'mutexLock' | 'nullPointer';

export const WEAKNESS: Record<BossId, { weapon: WeaponId; multiplier: number }> = {
  memoryLeak:    { weapon: 'mutexLock',        multiplier: 3 },
  raceCondition: { weapon: 'nullPointer',      multiplier: 3 },
  nullPointer:   { weapon: 'garbageCollector', multiplier: 3 },
  techDebt:      { weapon: 'buster',           multiplier: 1 },
};

export function damageFor(boss: BossId, weapon: WeaponId, base: number): number {
  const w = WEAKNESS[boss];
  return w.weapon === weapon ? base * w.multiplier : base;
}
```

- Nomes: `PascalCase` para classes/cenas, `camelCase` para funções e variáveis, `SCREAMING_SNAKE` para constantes de ajuste.

## Estratégia de testes

- **Vitest (unitário):** tabela de dano e fraquezas, energia de arma, save/load do progresso, liberação da fortaleza, transições da máquina de estados do player (pulo → parede → pulo da parede, dash no ar 1×/pulo só com Turbo Boots), efeitos das peças de armadura (dano ÷ 2, nível 3 de carga liberado).
- **Manual (no navegador):** a sensação de jogar (game feel), colisões e padrões dos chefes. Cada fase é jogada de ponta a ponta antes de passar para a próxima.
- **Smoke de build:** `npm run build` passa e o `dist/` abre via `npm run preview` sem erro no console.
- Não vou buscar cobertura alta: o prazo é 2 dias e testo o que é lógica, não renderização.

## Limites

- **Sempre:** rodar `npm test` e `npm run typecheck` antes de cada commit, commits pequenos por fatia jogável, manter 60 fps, todo conteúdo original.
- **Perguntar antes:** adicionar dependências além de Phaser/Vite/TS/Vitest, mudar a resolução ou o esquema de controles, cortar um chefe ou mecânica do escopo, publicar o jogo (GitHub Pages/itch.io), dar push.
- **Nunca:** usar sprites, músicas, sons, nomes ou layouts de fase de jogos existentes, commitar segredos, descaracterizar o Bob em relação à referência oficial.

## Critérios de sucesso

1. `npm run build` gera um `dist/` estático que roda num navegador moderno sem erros no console.
2. O jogo vai do título aos créditos sem travar e sem ficar preso em nenhum ponto.
3. O Bob tem todas as mecânicas listadas, respondendo ao teclado e a um gamepad padrão.
4. As 3 fases podem ser jogadas em qualquer ordem. Cada chefe derrotado dá a arma correspondente, e a fraqueza causa 3× de dano.
5. A fortaleza só libera depois dos 3 chefes.
6. Toda cena tem música conforme [docs/soundtrack.md](docs/soundtrack.md), com volume uniforme e loop sem emenda audível. As ações principais têm SFX gerados em código, e toda faixa usada está creditada (autor, fonte e licença) na tela de créditos.
7. O progresso (chefes e peças) persiste ao recarregar a página.
9. As 4 peças de armadura podem ser coletadas. Cada uma aplica seu efeito e aparece no sprite do Bob. O Compiler Cannon só é alcançável com as Turbo Boots.
8. 60 fps estáveis com o número máximo de inimigos e projéteis na tela.

## Decisões tomadas

- **Arte:** toda gerada no ChatGPT pelo usuário, com base em [docs/art-prompts.md](docs/art-prompts.md). O pós-processamento e a integração ficam comigo.
- **Uso da marca:** o IBM Bob está liberado para o desafio.
- **Tema:** chefes como bugs de software (Memory Leak, Race Condition, Null Pointer, Tech Debt), aprovado.
- **Entrega:** link público. Onde publicar fica para depois.

## Perguntas em aberto

1. **Onde publicar:** GitHub Pages (grátis, sai direto do repo) ou itch.io (vitrine de jogos). O build estático serve para os dois, então dá para decidir no fim.
