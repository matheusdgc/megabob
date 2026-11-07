# Pendências de arte

O lote atual de 123 strips/imagens passou nas verificações de recorte, dimensões, transparência, paleta e carregamento. A montagem das fases e dos menus ainda precisa de revisão no contexto de cada tela.

Correção de enquadramento concluída:

- O encaixe agora compara a armadura inteira e só aceita posições dentro do quadro. Idle, salto e dash foram reprocessados; as duas poses de air dash usam uma escala compartilhada que conserva o desenho inteiro. Os seis avisos de recorte foram eliminados, mantendo os quadros 48×48 e as fontes intactas. Comparação em `art/preview/bob_bounds_comparison.png`.

Correção de composição concluída:

- As poses B6 `dash[1]` e `dash[3]` têm regiões anatômicas próprias para cabeça, peito, braços e botas; deixaram de usar cortes horizontais por altura. A mesma arte é usada pelo air dash com armadura parcial. Comparação em `art/preview/bob_parts_comparison.png`.
- `compile[0]` é um efeito neutro de partículas, sem partes do corpo. Agora todas as 16 combinações usam os mesmos pixels e a mesma posição do Bob base. O relatório registra esse quadro em `shared_effect_frames`; os outros quatro continuam usando a arte de cada combinação.

O relatório atual do Bob está sem avisos de recorte ou sobreposição. As fontes não foram alteradas. Os recortes anatômicos anotados acima são específicos das duas poses B6.

Revisão de movimento concluída por `tools/review_animations.py`: 145 strips e 594 quadros não vazios, alpha binário e paleta global. Os GIFs de idle, corrida e corrida com tiro comparam as 16 combinações a 2×, usando as sequências de `BOB_LOOPS` (3/12/8 fps). O Phaser confirmou as 288 posições de quadro e os 48 retornos de ciclo. Salto, dash, parede, dano, compilação e vitória foram conferidos em contatos com base/cabeça/botas/completa; air dash com a armadura completa. Nenhum problema novo de recorte foi identificado nas poses conferidas. Os PNGs brutos e de produção mantiveram seus hashes. A validação da sensação e da leitura no percurso jogável continua nos checkpoints de fase.

Comparações animadas em `art/exports/megabob-{idle,run,shoot}-review.gif`; relatório `art/exports/bob-animation-review.json`. Contatos por pose e screenshots do Phaser em `art/preview/`. As poses por estado não receberam tempos fictícios de animação.

Título panorâmico: fundo 480×270 recomposto em 16:9 com `imagegen`, mantendo a fonte U2 original, e variante `title_logo_night` com contorno claro. Prévia em `art/exports/megabob-title-preview.png`; layouts e arquivos em `docs/art-pipeline.md`.

Seleção panorâmica: bordas de U3 recompostas sem deformar os retratos, cinco molduras 64×64, cadeado e foco separados. Os slots e o foco cabem no viewport e não se sobrepõem. Prévias bloqueada/liberada em `art/exports/megabob-stage-select-locked.png` e `megabob-stage-select-unlocked.png`; coordenadas em `art/exports/stage-select-layout.json`.

HUD/pausa: moldura com canal transparente de 6×56, 28 segmentos separados e painel vazio 352×208 com cantos preservados. Medidores vazio, de 1 ponto e cheio foram conferidos. Prévias em `art/exports/megabob-hud-preview.png`, `megabob-pause-start-preview.png` e `megabob-pause-complete-preview.png`; geometria em `hud-pause-layout.json`. As peças usam corretamente os quadros colorido/coletado e cinza/inativo.

Cenários: blocos/bordas sem margens no quadro 16×16; plataformas finas alinhadas ao topo. Doze variantes 512×270 mantêm a escala, o alpha e as emendas horizontais; Tech Debt MID/NEAR têm contraste reduzido para o piso permanecer legível. Galeria em `art/exports/megabob-environments.png`, dados em `environment-art-layout.json`, repetições 3×3 e relatório do pack gamedev em `art/preview/`. Os PNGs brutos foram preservados; ambas as alturas de T1 recebem a revisão de cor abaixo.

Contraste da Memory Leak revisado a pedido do usuário: fundo escuro/dessaturado, interiores sem o ruído repetido e contato das plataformas em cinza claro. O lodo conserva os pixels originais e se destaca do cenário. Comparação `art/exports/megabob-memory-contrast.png`, versão em cinza e perfil `memory-color-profile.json`. Mudaram apenas cores nas cópias processadas de T1; alpha, dimensões, emendas, mapas e fontes foram preservados.

Chefes: 20 assets / 57 quadros conferidos, sem novos recortes identificados nas folhas. O Memory Leak não selecionava seus quadros de ataque/mergulho; a seleção visual foi ligada aos estados existentes. Bolhas e poças agora animam e restauram textura/origem ao reutilizar o pool. Race Condition, Null Pointer e Tech Debt continuam como poses disponíveis para integração, sem simular animações de jogo ainda inexistentes. Contatos e relatório em `art/exports/boss-*-review.png` / `boss-art-review.json`; detalhes em `docs/art-pipeline.md`.
