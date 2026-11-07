# Interface — artes brutas

Quatro folhas-base, uma variante panorâmica e um fundo de encerramento gerados com a ferramenta integrada `imagegen`. Os prompts completos estão nos arquivos `.prompt.txt` correspondentes. A B1 aprovada foi usada para a identidade do Bob, e as folhas existentes para a linguagem visual e os ícones.

| Arquivo | Conteúdo | Dimensões da fonte |
|---|---|---|
| U1_logo.png | Palavra MEGABOB com sete letras e faixas horizontais azuis inspiradas na referência IBM fornecida pelo usuário | 2172 × 724 |
| U2_title_bg.png | Bob de costas em três quartos, cidade de servidores e céu livre no terço superior | 1341 × 1173 |
| U2_title_bg_wide.png | Variante 16:9 recomposta para o viewport 480×270, com Bob inteiro à esquerda e céu reservado à logo | 1672 × 941 |
| U3_stage_select.png | Painel com cinco espaços vazios e quadro bloqueado separado à direita | 1402 × 1122 |
| U4_hud.png | Oito componentes isolados em uma linha | 2172 × 724 |
| U5_ending_bg.png | Encerramento com os dois olhos do Bob visíveis à esquerda e céu livre à direita para créditos dinâmicos | 1672 × 941 |

U4, da esquerda para a direita: moldura vertical vazia da vida, segmento azul, segmento amarelo, ícone de tiro azul, vórtice teal, cadeado amarelo, cursor roxo e painel vazio de pausa. Os textos de menus, valores e nomes devem ser renderizados no código; apenas U1 contém uma palavra.

## Preparação para o jogo

- U1 e U4 usam fundo magenta; U3 usa magenta fora do painel e do quadro bloqueado. O gerador aproxima a cor pedida, portanto remover com tolerância, preservando os detalhes roxos e as regiões claras internas.
- U2 é uma cena opaca em proporção 8:7; reduzir para 256 × 224 sem remover o céu azul. O logo permanece separado para composição posterior.
- Para o viewport atual, usar a variante `title_background_wide` (480×270) com `title_logo_night`, que tem contorno claro para o céu azul. Prévia em `art/exports/megabob-title-preview.png`; coordenadas e escalas em `docs/art-pipeline.md`.
- Recortar o painel principal e o quadro bloqueado de U3 como ativos distintos. Ajustar a composição final ao viewport 256 × 224 mantendo os retratos quadrados; não redimensionar o arquivo inteiro junto com o item separado.
- Para 480×270, `tools/ui_art.py` recompõe as bordas e usa cinco slots 64×64. As texturas são `stage_select_wide`, `stage_locked_wide` e `stage_focus`; coordenadas em `art/exports/stage-select-layout.json`, prévias bloqueada/liberada em `art/exports/`. Os retratos permanecem sem deformação.
- U4 não usa uma única escala final pronta para o motor: normalizar a moldura, ajustar a largura dos segmentos ao canal interno e reduzir os quatro ícones para a grade pretendida, preservando seus contornos. Remover o magenta do canal vazio da moldura de vida.
- Derivados U4 para o viewport atual: `hud_meter_frame` 12×72 com canal 6×56, segmentos 6×1 e `pause_panel_wide` 352×208. Os 28 pontos cabem com espaçamento de 1 px. Prévias e coordenadas ficam em `art/exports/`; as texturas não contêm texto de menu.
- Recorte, alinhamento, redução com nearest-neighbor e limitação da paleta concluídos por `tools/art.py ui`. As texturas estão registradas no Boot; a composição das telas entra nas tarefas de menus.

A logo anterior foi preservada em `U1_logo-original.png`, com seu prompt. A versão atual usa o prompt `U1_logo.prompt.txt` (também salvo como `U1_logo_ibm.prompt.txt`). Export transparente em `art/exports/megabob-logo.png`; versão de jogo 224×48 em `public/assets/ui/title_logo.png`. Veja `docs/art-pipeline.md`.
