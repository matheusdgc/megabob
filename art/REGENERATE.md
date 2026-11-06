# Pendências de arte

O lote atual de 108 strips/imagens passou nas verificações de recorte, dimensões, transparência, paleta e carregamento. A montagem das fases e dos menus ainda precisa de revisão no contexto de cada tela.

Correção de enquadramento concluída:

- O encaixe agora compara a armadura inteira e só aceita posições dentro do quadro. Idle, salto e dash foram reprocessados; as duas poses de air dash usam uma escala compartilhada que conserva o desenho inteiro. Os seis avisos de recorte foram eliminados, mantendo os quadros 48×48 e as fontes intactas. Comparação em `art/preview/bob_bounds_comparison.png`.

Correção de composição concluída:

- As poses B6 `dash[1]` e `dash[3]` têm regiões anatômicas próprias para cabeça, peito, braços e botas; deixaram de usar cortes horizontais por altura. A mesma arte é usada pelo air dash com armadura parcial. Comparação em `art/preview/bob_parts_comparison.png`.
- `compile[0]` é um efeito neutro de partículas, sem partes do corpo. Agora todas as 16 combinações usam os mesmos pixels e a mesma posição do Bob base. O relatório registra esse quadro em `shared_effect_frames`; os outros quatro continuam usando a arte de cada combinação.

O relatório atual do Bob está sem avisos de recorte ou sobreposição. As fontes não foram alteradas. A revisão das animações no contexto das fases e menus continua nas tarefas correspondentes; os recortes anatômicos anotados acima são específicos das duas poses B6.

Título panorâmico: fundo 480×270 recomposto em 16:9 com `imagegen`, mantendo a fonte U2 original, e variante `title_logo_night` com contorno claro. Prévia em `art/exports/megabob-title-preview.png`; layouts e arquivos em `docs/art-pipeline.md`.

Seleção panorâmica: bordas de U3 recompostas sem deformar os retratos, cinco molduras 64×64, cadeado e foco separados. Os slots e o foco cabem no viewport e não se sobrepõem. Prévias bloqueada/liberada em `art/exports/megabob-stage-select-locked.png` e `megabob-stage-select-unlocked.png`; coordenadas em `art/exports/stage-select-layout.json`.

HUD/pausa: moldura com canal transparente de 6×56, 28 segmentos separados e painel vazio 352×208 com cantos preservados. Medidores vazio, de 1 ponto e cheio foram conferidos. Prévias em `art/exports/megabob-hud-preview.png`, `megabob-pause-start-preview.png` e `megabob-pause-complete-preview.png`; geometria em `hud-pause-layout.json`. As peças usam corretamente os quadros colorido/coletado e cinza/inativo.
