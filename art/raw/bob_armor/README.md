# Firmware Armor — artes brutas

Geradas com a ferramenta integrada `imagegen`, usando `../bob/B1_bob_sheet.png` e as folhas-base B2–B10. O conceito A1 foi usado como referência nas demais folhas. Os prompts completos ficam nos arquivos `.prompt.txt` de mesmo nome; as correções de fundo também foram preservadas.

| Arquivo | Conteúdo | Quadros |
|---|---|---:|
| A1_armor_sheet.png | Conceito e quatro módulos separados | 2 poses + 4 peças |
| A2_B2_idle.png | Parado, respiração e piscada | 3 |
| A2_B3_run.png | Corrida | 6 |
| A2_B4_jump_fall.png | Pulo, queda e aterrissagem | 5 |
| A2_B5_shoot.png | Tiro parado, no ar e correndo | 7 |
| A2_B6_dash.png | Início, avanço, freio e tiro | 4 |
| A2_B7_wall.png | Deslize, tiro e salto na parede | 3 |
| A2_B8_hurt.png | Dano e recuo | 2 |
| A2_B9_compile_in.png | Montagem em blocos | 5 |
| A2_B10_victory.png | Vitória e arma ganha | 2 |
| A2_air_dash.png | Arranque e avanço no ar | 2 |
| A3_update_terminal.png | Terminal de instalação | 6 |
| A4_part_icons.png | Quatro peças coloridas e quatro cinzas | 8 |
| ../fx/A5_compiler_shot.png | Projétil, impacto e aura | 4 + 4 + 3 |

## Preparação para o jogo

- A1 tem canal alfa. As outras folhas usam fundo magenta para recorte. O gerador aproximou a cor pedida: os fundos não são exatamente `#FF00FF`; a remoção precisa tolerância de cor, preservando os detalhes roxos do capacete.
- As nove folhas A2_B2–A2_B10 têm a mesma dimensão das respectivas bases: 2172 × 724. Isso confirma o tamanho do canvas, não o registro exato de cada pixel ou peça.
- Antes de recortar as regiões para sobreposição modular, conferir e registrar cada quadro contra sua base. Ajustes locais de posição, escala e contorno podem ser necessários.
- Ainda é necessário remover o fundo, reduzir com nearest-neighbor, limitar a paleta e montar os spritesheets de produção. Estes arquivos não foram integrados ao jogo.
- O quadro central da parede mantém os dois olhos e o canhão voltado para a esquerda. As poses frontais de vitória têm os dois olhos ou as duas marcas de olhos fechados.
- B3 tem seis quadros; B5 mantém quatro quadros de corrida atirando, conforme o documento de prompts. A sincronização deve considerar essa diferença.
