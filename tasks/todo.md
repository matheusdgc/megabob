# Megabob: lista de tarefas

> Plano: [plan.md](plan.md) · Spec: [SPEC.md](../SPEC.md)
> Toda tarefa só fecha com: `npm test` ✔ · `npm run typecheck` ✔ · `npm run build` ✔ · sem erro no console · commit.

---

## Fase 1: Fundação

### T1: Scaffold do projeto [S] ✅
Vite + Phaser 3 + TypeScript strict + Vitest. Config do Phaser em 256×224 com escala inteira, `pixelArt: true` e física Arcade a 60 Hz. BootScene vazia e `.gitignore`.
- [x] `npm run dev` abre uma tela 256×224 escalada sem borrão
- [x] Os scripts `dev`, `build`, `preview`, `test` e `typecheck` funcionam
- [x] Existe 1 teste Vitest de exemplo e ele passa

**Verificar:** os 5 comandos e abrir no navegador · **Dep.:** nenhuma
**Arquivos:** `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/scenes/BootScene.ts`

### T2: Input e placeholders [S] ✅
Mapeamento de teclado (setas/WASD, Z, X, C, Q/E, Enter) e de gamepad numa interface única (`isDown`, `justPressed`), com buffer de pulo. Manifesto de assets e gerador de texturas placeholder com as chaves e tamanhos finais.
- [x] Teclado e gamepad disparam as mesmas ações (teclado verificado no navegador; gamepad mapeado, mas ainda sem teste com controle físico)
- [x] Os placeholders do Bob (quadros 48×48) e dos tiles 16×16 aparecem com as chaves do manifesto

**Verificar:** cena de debug mostrando as ações ativas · **Dep.:** T1
**Arquivos:** `src/systems/input.ts`, `src/data/assets.ts`, `src/systems/placeholders.ts`

### T3: Movimento base do Bob [M] ✅
Máquina de estados pura (`idle/run/jump/fall/land`) com testes. Andar, pulo variável, coyote time e gravidade. Mapa ASCII de teste com colisão de tiles e câmera seguindo.
- [x] Testes cobrem as transições idle ↔ run ↔ jump → fall → land e o corte do pulo ao soltar o botão
- [x] O Bob anda e pula no mapa de teste sem atravessar tiles
- [x] Todas as constantes ficam em `tuning.ts`

**Verificar:** `npm test` e jogar o mapa de teste · **Dep.:** T2
**Arquivos:** `src/systems/playerState.ts`, `src/entities/Player.ts`, `src/data/tuning.ts`, `src/stages/test.ts`, `src/scenes/StageScene.ts`, `tests/playerState.test.ts`

### T4: Parede e dash [M] ✅
Deslizar na parede, pulo da parede (com uma pequena trava de input horizontal) e dash no chão com duração e cancelamento. O dash no ar fica por trás da flag `hasTurboBoots`.
- [x] Testes: wall slide só ao segurar contra a parede durante a queda, wall jump empurra para longe, dash no ar bloqueado sem botas e limitado a 1×/pulo com botas
- [x] Dá para subir um poço vertical alternando paredes

**Verificar:** `npm test` e um poço vertical no mapa de teste · **Dep.:** T3
**Arquivos:** `src/systems/playerState.ts`, `src/entities/Player.ts`, `src/data/tuning.ts`, `tests/playerState.test.ts`

### T4a: Pipeline de sprites [M] ✅
`tools/sprites.py`: lê `art/raw/<cat>/*.png`, remove o fundo transparente ou magenta e detecta os quadros por componentes e colunas vazias. Normaliza pela linha do chão e pelo centro, reduz com nearest-neighbor até a altura alvo e quantiza na paleta global. Gera `public/assets/<cat>/<nome>.png` + `.json` (formato de spritesheet do Phaser) e uma imagem de prévia com a grade, para conferir.
- [x] B1 e B2 viram spritesheets com a quantidade certa de quadros, alinhados pela linha do chão
- [x] A prévia em `art/preview/` mostra os quadros lado a lado em 4×
- [x] O jogo carrega o sheet real no lugar do placeholder sem mudar código

**Verificar:** rodar `python tools/sprites.py bob` e ver a prévia e o jogo · **Dep.:** T2
**Arquivos:** `tools/sprites.py`, `tools/palette.py`, `src/data/assets.ts`

> Feito: escala por folha pela largura do capacete, chroma key magenta com tolerância, armadura ajustada por sobreposição de silhueta (0,84–0,96) e as 15 combinações de peças pré-compostas (`bob_<anim>_a<N>`, N = bitmask cabeça=1 braço=2 corpo=4 pernas=8). A prévia fica em `art/preview/`.

### T4b: Integração contínua de arte (recorrente)
A cada lote novo em `art/raw/`, rodar o pipeline, revisar a prévia e registrar as animações no manifesto. Os quadros ruins vão para uma lista de regeneração em `art/REGENERATE.md`.

**Lote completo de arte — pós-processamento autorizado em 05/11:**
- [x] Preservar os hashes das 65 fontes e testar recorte, transparência, escala e quadros vazios.
- [x] Processar os efeitos restantes, ícones do Bob e objetos da armadura.
- [x] Processar inimigos e chefes, separando projéteis, retratos e peças.
- [x] Normalizar tiles 16×16 e camadas 512×224, com relatório de emendas.
- [x] Processar UI e registrar os ativos no manifesto sem alterar a lógica das fases.
- [x] Revisar prévias, testes Python, `npm test`, typecheck, build e console no navegador; registrar pendências reais no handoff.
- [x] Corrigir os seis avisos de recorte da armadura sem alterar os quadros 48×48; testes de regressão e comparação visual em `art/preview/bob_bounds_comparison.png`.
- [x] Uniformizar `compile[0]` nas 16 combinações e revisar os recortes das peças em `dash[1,3]`; relatório do Bob sem avisos e comparação em `art/preview/bob_parts_comparison.png`.
- [x] Preparar fundo de título panorâmico 480×270, logo com contorno para céu escuro e prévia de composição, preservando as artes originais e deixando as cenas para T13.
- [x] Recompor a arte da seleção para 480×270 com retratos quadrados, cadeado e foco separados; exportar prévias bloqueada/liberada e coordenadas para T13.
- [x] Preparar medidores para 28 segmentos e painel de pausa 352×208; exportar HUD, pausas de início/equipamento completo e coordenadas, com textos só nas prévias.
- [x] Normalizar o encaixe dos tiles e plataformas, preparar doze variantes de parallax 512×270 e conferir repetição 3×3/contraste dos quatro temas com as skills do pack gamedev.
- [x] Preparar molduras de apresentação e onze prévias (quatro chefes, três armas e quatro peças), com layout centralizado e textos separados para integração nas cenas.
- [x] Preparar fundo de encerramento 480×270, composição de Game Over e layouts para créditos/textos dinâmicos, preservando as fontes e o fluxo de cenas.
- [x] Revisar os 145 strips do Bob, comparar os três ciclos reais nas 16 combinações de armadura e conferir as poses restantes, sem alterar o ritmo aprovado.
- [x] Melhorar o contraste da Memory Leak: fundo menos saturado, superfícies jogáveis claras e lodo destacado, com comparações no jogo e fontes preservadas.
- [x] Corrigir a composição rejeitada: restaurar todas as texturas de T1 e separar fundo/metal/perigos por paletas distintas, verificando os padrões originais quadro a quadro.
- [x] Revisar sprites dos quatro chefes e corrigir a apresentação visual do Memory Leak sem alterar os padrões de ataque.
- [x] Conferir no Phaser a leitura e as transições dos checkpoints e da porta do chefe na nova composição, preservando sprites e regras existentes.
- [x] Conferir a identidade dos PNGs carregados em Debug/Stage e os vínculos ativos da primeira fase, com controles negativos para placeholder e imagem alterada.

As fontes em `art/raw/` permanecem intactas durante a importação. A logo anterior foi preservada e foram acrescentados fundos panorâmicos de título e encerramento; total atual de 68 PNGs brutos. A implementação reaproveita Python/Pillow instalado, sem novas dependências. As 123 saídas ficam em `public/assets/`, com prévias e relatórios em `art/preview/`. Veja `docs/art-pipeline.md`.

## ✅ Checkpoint 1: sensação de jogo
- [x] Testes, typecheck e build passam
- [x] **Você joga o mapa de teste** e aprova pulo, dash e parede (aprovado em 06/11, sem ajustes)

---

## Fase 2: Combate

### T5: Tiro do Bob [M] ✅
Tiro básico com no máximo 3 na tela, carga em 2 níveis (com o nível 3 atrás de `hasCompilerCannon`), aura de carga e pool de projéteis. Tiro em todos os estados (no chão, no ar, correndo, na parede, no dash).
- [x] Testes: o nível de carga depende do tempo segurado e o 4º tiro é bloqueado
- [x] Os sprites de tiro aparecem certos em cada estado

> Feito: os tiros atravessam o cenário e somem fora da tela, e o tiro na parede sai para longe dela. A lógica do jogo passou a rodar no passo fixo de 60 Hz da física (`worldstep`), e não mais a cada atualização do monitor.

**Verificar:** `npm test` e jogar · **Dep.:** T4
**Arquivos:** `src/systems/charge.ts`, `src/entities/Projectile.ts`, `src/entities/Player.ts`, `tests/charge.test.ts`

### T6: Vida, dano e morte [M] ✅
HP, i-frames com piscar, recuo e espinhos com morte instantânea. Morte com o efeito "decompile", respawn no checkpoint e no máximo 3 vidas. HUD com a barra de vida.
- [x] Testes do módulo de dano (incluindo `hasFirewallPlating` ÷ 2)
- [x] Morrer volta ao checkpoint, e acabar as vidas dispara o evento de game over

**Verificar:** `npm test` e jogar · **Dep.:** T5
**Arquivos:** `src/systems/damage.ts`, `src/entities/Player.ts`, `src/ui/Hud.ts`, `tests/damage.test.ts`

### T7: Inimigos base e itens [M] ✅
Classe base `Enemy` (HP, dano por contato, drop) com Pixel Mite e Spam Drone. Itens de vida pequena/grande, energia e vida extra, com tabela de drop.
- [x] Os 2 inimigos se comportam como descrito e morrem com explosão
- [x] Os itens caem, piscam antes de sumir e aplicam o efeito

**Verificar:** jogar o mapa de teste com inimigos · **Dep.:** T6
**Arquivos:** `src/entities/Enemy.ts`, `src/entities/enemies/PixelMite.ts`, `src/entities/enemies/SpamDrone.ts`, `src/entities/Pickup.ts`, `src/data/drops.ts`

### T8: Seções, checkpoint e porta [M] ✅
Câmera por seções com transição, terminal de checkpoint, porta do chefe que trava a câmera e os inimigos voltando ao reentrar numa seção.
- [x] A câmera nunca mostra fora da seção atual
- [x] Passar pela porta trava a sala e dispara o evento `bossIntro`

**Verificar:** jogar o mapa de teste completo · **Dep.:** T7
**Arquivos:** `src/systems/camera.ts`, `src/entities/Checkpoint.ts`, `src/entities/BossDoor.ts`, `src/stages/test.ts`

## ✅ Checkpoint 2
- [x] Testes, typecheck e build passam
- [ ] O mapa de teste é jogável do início à porta do chefe, com inimigos, itens, morte e checkpoint

---

## Fase 3: Primeira fatia vertical (Memory Leak)

### T9: Chefe base e Memory Leak [M]
Classe base `Boss`: máquina de estados, barra de vida que enche na entrada, i-frames, derrota com explosão grande e evento `bossDefeated`. IA do Memory Leak: bolhas de lodo que viram poças, afundar e emergir, e a fúria que sobe o lodo.
- [ ] O chefe tem os 3 padrões descritos e escolhe entre eles
- [ ] Derrotar o chefe dispara o evento de vitória

**Verificar:** lutar no mapa de teste · **Dep.:** T8
**Arquivos:** `src/entities/Boss.ts`, `src/entities/bosses/MemoryLeak.ts`, `src/ui/BossHealthBar.ts`

### T10: Sistema de armas e Garbage Collector [M] ✅
Tabela de armas e fraquezas com testes. Energia por arma, troca com Q/E, troca de paleta do Bob, tela "arma ganha" e a arma Garbage Collector.
- [x] Testes: fraqueza = 3×, energia consome e recarrega, troca de arma pula as que não foram ganhas
- [x] Depois do Memory Leak, o Garbage Collector está equipável e funcionando

**Verificar:** `npm test` e jogar · **Dep.:** T9
**Arquivos:** `src/data/weapons.ts`, `src/systems/weapons.ts`, `src/entities/weapons/GarbageCollector.ts`, `src/scenes/WeaponGetScene.ts`, `tests/weapons.test.ts`

### ✅ T11: Áudio: pipeline de música, player e SFX [M]
`tools/music.py` normaliza as 10 faixas de [docs/soundtrack.md](../docs/soundtrack.md) (RMS ≈ −14 dB, pico ≤ −1 dB) e gera OGG + MP3 em `public/assets/music/`. Manifesto `src/data/music.ts` com `loopStart`/`loopEnd`. Player WebAudio com loop sem emenda, crossfade e desbloqueio do áudio no primeiro input. SFX sintetizados (pulo, tiro, tiro carregado, dano, explosão, item, porta) e jingles.
- [x] As 10 faixas saem convertidas, com volume parecido entre si, e o total fica abaixo de ~20 MB (~12 MB em OGG; volume igualado no jogo)
- [x] A música toca em loop sem emenda audível e os SFX não cortam a música (emendas medidas; falta ouvir)
- [x] Existe um controle de volume (mudo com M; sliders na T13b)

**Verificar:** rodar `python tools/music.py` e jogar com som · **Dep.:** T1
**Arquivos:** `tools/music.py`, `src/data/music.ts`, `src/audio/musicPlayer.ts`, `src/audio/sfx.ts`, `src/audio/jingles.ts`

### ✅ T12: Fase Memory Leak [M]
Mapa ASCII completo (cerca de 4 seções, 1 checkpoint), inimigos Drip e Heap Crab, perigo do lodo que sobe, tiles e fundo (placeholder ou real).
- [x] Dá para terminar a fase do início até o chefe derrotado (caminho crítico em `tests/reach.test.ts`; seções conferidas no navegador)
- [x] O padrão de fase (arquivo de dados + inimigos próprios) fica documentado no topo de `src/stages/README.md`, para replicar nas outras fases

**Verificar:** uma partida completa · **Dep.:** T10, T11
**Arquivos:** `src/stages/memoryLeak.ts`, `src/entities/enemies/Drip.ts`, `src/entities/enemies/HeapCrab.ts`, `src/stages/README.md`

## ✅ Checkpoint 3 (fim do dia 1)
- [ ] Testes, typecheck e build passam
- [ ] **Você joga a Memory Leak de ponta a ponta** e ganha o Garbage Collector

---

## Fase 4: Fluxo do jogo

### T13: Título, seleção, save e pausa [M]
Tela de título, seleção de fases com retratos (fortaleza travada até 3/3), save versionado e testado, game over voltando para a seleção e menu de pausa (troca de arma e peças coletadas).
- [ ] Testes do save: round-trip, versão inválida volta ao padrão, liberação da fortaleza
- [ ] O fluxo título → seleção → fase → seleção funciona, e o progresso persiste ao recarregar

**Verificar:** `npm test` e recarregar o navegador no meio do jogo · **Dep.:** T12
**Arquivos:** `src/systems/save.ts`, `src/scenes/TitleScene.ts`, `src/scenes/StageSelectScene.ts`, `src/scenes/PauseScene.ts`, `tests/save.test.ts`

### T13b: Configuração de controles [M]
Tela de opções (pelo título e pelo menu de pausa) que lista as ações (`ACTIONS` em `src/systems/actions.ts`) e deixa trocar a tecla e o botão do gamepad de cada uma: seleciona a ação, aperta a nova tecla ou botão. Os mapeamentos hoje fixos em `KEYS` e `PAD_BUTTONS` (`src/systems/input.ts`) passam a vir de um módulo puro de bindings, salvo no save.
- [ ] Testes do módulo de bindings: trocar uma tecla já usada por outra ação troca as duas (sem ação sem tecla), "restaurar padrão" volta ao mapeamento de hoje, e um save inválido ou antigo cai no padrão
- [ ] Teclas de sistema ficam reservadas (Esc sempre volta ou pausa, e F2/R/1-4 de debug não podem ser atribuídas)
- [ ] Os mapeamentos persistem ao recarregar e valem na hora, sem reiniciar a fase

**Verificar:** `npm test` e trocar o pulo para outra tecla, recarregar e jogar · **Dep.:** T13
**Arquivos:** `src/systems/bindings.ts`, `src/systems/input.ts`, `src/scenes/OptionsScene.ts`, `src/systems/save.ts`, `tests/bindings.test.ts`

---

## Fase 5: Outras fases (podem rodar em paralelo)

### T14: Race Condition (fase, inimigos, chefe, Mutex Lock) [M]
Esteiras e plataformas rápidas, Thread Runner e Clock Spike, chefe com dashes, clones fora de sincronia e arremesso, e a arma Mutex Lock (congela os inimigos).
- [ ] Dá para terminar a fase, e o chefe recebe 3× de dano do Null Pointer
- [ ] O Mutex Lock congela os inimigos comuns por um tempo fixo, e os chefes por menos tempo

**Verificar:** uma partida completa · **Dep.:** T13
**Arquivos:** `src/stages/raceCondition.ts`, `src/entities/enemies/{ThreadRunner,ClockSpike}.ts`, `src/entities/bosses/RaceCondition.ts`, `src/entities/weapons/MutexLock.ts`

### T15: Null Pointer (fase, inimigos, chefe, arma Null Pointer) [M]
Blocos que somem e reaparecem, Void Eye e Dangling Ref, chefe com teleporte, setas, chão que some e cópias falsas, e a arma Null Pointer (atravessa paredes finas).
- [ ] Dá para terminar a fase, e o chefe recebe 3× de dano do Garbage Collector
- [ ] O tiro Null Pointer atravessa tiles marcados como "finos"

**Verificar:** uma partida completa · **Dep.:** T13
**Arquivos:** `src/stages/nullPointer.ts`, `src/entities/enemies/{VoidEye,DanglingRef}.ts`, `src/entities/bosses/NullPointer.ts`, `src/entities/weapons/NullPointerShot.ts`

## ✅ Checkpoint 4
- [ ] Testes, typecheck e build passam
- [ ] Os 3 chefes podem ser vencidos em qualquer ordem, o ciclo de fraquezas funciona e a fortaleza libera com 3/3

---

## Fase 6: Armadura Firmware

### T16: Sistema de upgrades [M]
Tabela de peças com testes, Update Terminal, tela de "upgrade instalado", efeitos (botas, placas, visor e canhão) e o sprite do Bob em camadas.
- [ ] Testes: cada flag liga o efeito certo e o save guarda as peças
- [ ] O sprite do Bob mostra só as peças coletadas, nos quadros certos (ou o plano B, se o alinhamento falhar)

**Verificar:** `npm test` e um mapa de teste com os 4 terminais · **Dep.:** T13
**Arquivos:** `src/data/upgrades.ts`, `src/systems/upgrades.ts`, `src/entities/UpdateTerminal.ts`, `src/entities/Player.ts`, `tests/upgrades.test.ts`

### T17: Peças nas fases [S]
Colocar os 4 terminais conforme o spec, com o Compiler Cannon atrás do vão que exige dash no ar, e as passagens escondidas que o Debug Visor revela.
- [ ] As 4 peças podem ser coletadas, e o Compiler Cannon é inalcançável sem as Turbo Boots

**Verificar:** buscar as 4 peças · **Dep.:** T14, T15, T16
**Arquivos:** `src/stages/{memoryLeak,raceCondition,nullPointer}.ts`

---

## Fase 7: Final

### T18: Fortaleza e Tech Debt fase 1 [M]
A fase da fortaleza (Legacy Turret e Deprecated Bot com escudo), o chefe como mainframe parede (gavetas, cartões perfurados, invocação de bots) e o CRT como ponto fraco.
- [ ] Dá para terminar a fortaleza até o fim da fase 1 do chefe

**Verificar:** uma partida completa · **Dep.:** T17
**Arquivos:** `src/stages/techDebt.ts`, `src/entities/enemies/{LegacyTurret,DeprecatedBot}.ts`, `src/entities/bosses/TechDebt.ts`

### T19: Tech Debt fase 2 e créditos [M]
O núcleo voador com laser de CRT e os "patches" (ataques rápidos dos 3 chefes), a explosão final e a cena de créditos.
- [ ] Vencer a fase 2 leva aos créditos, e o save marca o jogo como zerado

**Verificar:** uma partida completa · **Dep.:** T18
**Arquivos:** `src/entities/bosses/TechDebtCore.ts`, `src/scenes/CreditsScene.ts`

### T20: Música em todas as cenas e créditos de áudio [S]
Ligar cada cena à sua faixa do manifesto, incluindo a troca de música entre as fases 1 e 2 do Tech Debt, e listar autor, fonte e licença de cada faixa na tela de créditos.
- [ ] Toda cena tem a música certa, e as transições não sobrepõem duas músicas
- [ ] A tabela de licenças em `docs/soundtrack.md` está completa e aparece nos créditos

**Verificar:** percorrer todas as cenas · **Dep.:** T11, T19
**Arquivos:** `src/data/music.ts`, `src/scenes/*.ts`, `src/scenes/CreditsScene.ts`

## ✅ Checkpoint 5
- [ ] **Partida completa, do título aos créditos**, sem travar

---

## Fase 8: Polimento e entrega

### T21: Arte real em tudo [M]
Trocar os placeholders que sobraram, calibrar hitboxes conforme os sprites reais e conferir as animações contra o inventário do `art-prompts.md`.
- [ ] Nenhum placeholder visível no jogo
**Verificar:** percorrer o jogo · **Dep.:** T4b

### T22: Performance e balanceamento [M]
Medir os fps no pior caso, ajustar vida e dano dos chefes, conferir os drops e corrigir os bugs da partida completa.
- [ ] 60 fps estáveis no pior caso, e cada chefe leva de 30 s a 2 min
**Verificar:** contador de fps de debug e uma partida completa · **Dep.:** Checkpoint 5

### T23: Build e deploy [S]
Build de produção, `base` do Vite correto para o host escolhido e deploy (GitHub Pages ou itch.io, **com o seu OK antes**).
- [ ] O link público abre e roda o jogo
**Verificar:** abrir o link numa aba anônima · **Dep.:** T22
