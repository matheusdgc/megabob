# Inimigos comuns — artes brutas

Dez folhas geradas com a ferramenta integrada `imagegen`, seguindo `docs/art-prompts.md`. A B1 aprovada do Bob foi anexada como referência de estilo e escala de pixels; os inimigos têm designs próprios. Cada PNG tem um arquivo `.prompt.txt` correspondente.

| Folha | Conteúdo das células, da esquerda para a direita |
|---|---|
| E1_pixel_mite.png | Caminhada A, caminhada B, destruído |
| E2_spam_drone.png | Voo A, voo B, mergulho de ataque |
| E3_drip.png | Preso ao teto, queda, poça, rastejando |
| E4_heap_crab.png | Caminhada A, caminhada B, arremesso, bloco separado |
| E5_thread_runner.png | Rolagem A, rolagem B, freio |
| E6_clock_spike.png | Parado, carregando, disparando, espinho separado |
| E7_void_eye.png | Parado, olho aberto, desmaterializando, desaparecido |
| E8_dangling_ref.png | Balanço à esquerda, centro, direita |
| E9_legacy_turret.png | Parado, mira elevada, disparo, cartão perfurado separado |
| E10_deprecated_bot.png | Caminhada A, caminhada B, defesa, ataque |

## Preparação para o jogo

- Todas as folhas usam fundo magenta. O gerador aproxima a cor pedida, portanto a remoção requer tolerância de cor em vez de comparação exata com `#FF00FF`. Preservar os tons roxos de Void Eye e Dangling Ref.
- Os projéteis das folhas E4, E6 e E9 ocupam a última célula e devem ser extraídos como objetos separados, não como quadros da animação do inimigo.
- As imagens são artes brutas em 2172 × 724. Ainda precisam de recorte, registro dos quadros, redução com nearest-neighbor e limitação da paleta antes da montagem dos spritesheets de produção.
- Os tamanhos lógicos indicados nos prompts variam por inimigo. O canvas comum não significa que todos devam ter o mesmo tamanho no jogo.
- Nenhuma destas folhas foi integrada ao código do jogo nesta etapa.
