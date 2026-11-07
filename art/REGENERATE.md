# Pendências de arte

O lote atual de 124 strips/imagens passou nas verificações de recorte, dimensões, transparência, paleta e carregamento. A montagem das fases e dos menus ainda precisa de revisão no contexto de cada tela.

Correção de enquadramento concluída:

Contraste de Null Pointer: Void Eye, Dangling Ref e o cursor usam mapas bijetivos em `tools/null_enemy_colors.py` (âmbar/creme e ciano/metal claro). Os nove quadros mantêm todos os tons distintos, padrões e alpha originais; os sete PNGs de cenário T3 não mudaram. Reproduzir com `py -3 tools/art.py enemies` e `py -3 tools/art.py bosses`; conferir por `py -3 tools/review_null_enemies.py` após o smoke test. Relatório e comparação `art/exports/null-enemy-contrast-review.json` / `megabob-null-enemy-contrast.png`.

Refinamento visual solicitado para menu e gameplay: `tools/bob_colors.py` usa rampas locais de 41 cores, conservando o alpha exato dos 594 quadros anteriores. A cor interna é amostrada com mais gradações; a exibição continua em pixels, sem blur e sem alterar poses, colisões ou fps. `title_bob_idle` amostra a fonte B2 em 96×96 para ocupar o mesmo tamanho de menu com mais detalhe. Comparação `art/exports/megabob-bob-refinement.png`; checker e hashes em `tools/review_bob_refinement.py` / `bob-refinement-review.json`. As fontes aprovadas foram reaproveitadas, sem geração de novas poses.

- O encaixe agora compara a armadura inteira e só aceita posições dentro do quadro. Idle, salto e dash foram reprocessados; as duas poses de air dash usam uma escala compartilhada que conserva o desenho inteiro. Os seis avisos de recorte foram eliminados, mantendo os quadros 48×48 e as fontes intactas. Comparação em `art/preview/bob_bounds_comparison.png`.

Correção de composição concluída:

- As poses B6 `dash[1]` e `dash[3]` têm regiões anatômicas próprias para cabeça, peito, braços e botas; deixaram de usar cortes horizontais por altura. A mesma arte é usada pelo air dash com armadura parcial. Comparação em `art/preview/bob_parts_comparison.png`.
- `compile[0]` é um efeito neutro de partículas, sem partes do corpo. Agora todas as 16 combinações usam os mesmos pixels e a mesma posição do Bob base. O relatório registra esse quadro em `shared_effect_frames`; os outros quatro continuam usando a arte de cada combinação.

O relatório atual do Bob está sem avisos de recorte ou sobreposição. As fontes não foram alteradas. Os recortes anatômicos anotados acima são específicos das duas poses B6.

Revisão de movimento concluída por `tools/review_animations.py`: 145 strips e 594 quadros não vazios, alpha binário e paleta local de 41 cores do Bob. Os GIFs de idle, corrida e corrida com tiro comparam as 16 combinações a 2×, usando as sequências de `BOB_LOOPS` (3/12/8 fps). O Phaser confirmou as 288 posições de quadro e os 48 retornos de ciclo. Salto, dash, parede, dano, compilação e vitória foram conferidos em contatos com base/cabeça/botas/completa; air dash com a armadura completa. Nenhum problema novo de recorte foi identificado nas poses conferidas. Os PNGs brutos e de produção mantiveram seus hashes. A validação da sensação e da leitura no percurso jogável continua nos checkpoints de fase.

Comparações animadas em `art/exports/megabob-{idle,run,shoot}-review.gif`; relatório `art/exports/bob-animation-review.json`. Contatos por pose e screenshots do Phaser em `art/preview/`. As poses por estado não receberam tempos fictícios de animação.

Título: fonte cyberpunk mais detalhada `U2_title_cyberpunk.png`, sem Bob embutido, processada em 480×270 com nearest-neighbor e 32 cores locais. Manter sempre o estilo de 16 bits no cenário, personagens e efeitos. Bob é separado e anima o idle real; entrada/brilho da logo e chuva são elementos da cena com movimento reduzido e descarte no shutdown. Logo recriada a pedido do usuário com letras mais legíveis e contornos suaves (`U1_logo_readable.png`), mantendo as versões anteriores. `readable_logo` conserva a rampa azul/alpha intermediário e reduz com Lanczos: exceção específica aprovada para a logo. As duas variantes continuam em 224×48. Prévia e GIF real em `art/exports/megabob-title-*`; checker `node tools/check-title-menu.mjs`, detalhes em `docs/art-pipeline.md`.

Seleção panorâmica: bordas de U3 recompostas sem deformar os retratos, cinco molduras 64×64, cadeado e foco separados. Os slots e o foco cabem no viewport e não se sobrepõem. Prévias bloqueada/liberada em `art/exports/megabob-stage-select-locked.png` e `megabob-stage-select-unlocked.png`; coordenadas em `art/exports/stage-select-layout.json`.

HUD/pausa: moldura com canal transparente de 6×56, 28 segmentos separados e painel vazio 352×208 com cantos preservados. Medidores vazio, de 1 ponto e cheio foram conferidos. Prévias em `art/exports/megabob-hud-preview.png`, `megabob-pause-start-preview.png` e `megabob-pause-complete-preview.png`; geometria em `hud-pause-layout.json`. As peças usam corretamente os quadros colorido/coletado e cinza/inativo.

Cenários: blocos/bordas sem margens no quadro 16×16; plataformas finas alinhadas ao topo. Doze variantes 512×270 mantêm a escala, o alpha e as emendas horizontais; Tech Debt MID/NEAR têm contraste reduzido para o piso permanecer legível. Galeria em `art/exports/megabob-environments.png`, dados em `environment-art-layout.json`, repetições 3×3 e relatório do pack gamedev em `art/preview/`. Os PNGs brutos foram preservados; ambas as alturas de T1 recebem a revisão de cor abaixo.

Memory Leak: o usuário rejeitou a redução de textura da primeira tentativa. A textura original foi restaurada com mapas de cor bijetivos: fundo azul acinzentado, metal quente e lodo teal original. `tools/review_memory_palette.py` confere a assinatura espacial dos 24 quadros de tiles e seis camadas contra a versão anterior ao achatamento. Não pintar faixas, juntar tons ou preencher padrões para corrigir contraste. Comparação `art/exports/megabob-memory-contrast.png`, captura `megabob-memory-palette.png` e perfil `memory-color-profile.json`. Alpha, dimensões, emendas, mapas e fontes preservados.

Chefes: 20 assets / 57 quadros conferidos, sem novos recortes identificados nas folhas. O Memory Leak não selecionava seus quadros de ataque/mergulho; a seleção visual foi ligada aos estados existentes. Bolhas e poças agora animam e restauram textura/origem ao reutilizar o pool. Race Condition, Null Pointer e Tech Debt continuam como poses disponíveis para integração, sem simular animações de jogo ainda inexistentes. Contatos e relatório em `art/exports/boss-*-review.png` / `boss-art-review.json`; detalhes em `docs/art-pipeline.md`.
