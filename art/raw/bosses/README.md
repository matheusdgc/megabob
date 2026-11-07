# Chefes — artes brutas

Doze folhas geradas com a ferramenta integrada `imagegen`, seguindo `docs/art-prompts.md`. Cada conceito foi usado como referência nas animações e extras do mesmo chefe. Os prompts completos e as correções ficam nos arquivos `.prompt.txt` adjacentes.

| Folha | Células, da esquerda para a direita |
|---|---|
| BS1a_memory_leak_sheet.png | Neutro, ataque, dano |
| BS1b_memory_leak_anim.png | Parado A/B, tiro, afundar A/B, emergir, dano branco, derrota |
| BS1c_memory_leak_extras.png | Retrato, bola A/B, poça A/B |
| BS2a_race_condition_sheet.png | Pronto, dash, dano |
| BS2b_race_condition_anim.png | Parado A/B, início de dash, dash, divisão, arremesso, dano, derrota |
| BS2c_race_condition_extras.png | Retrato, lâmina em quatro rotações, silhueta de rastro |
| BS3a_null_pointer_sheet.png | Flutuando, conjurando, dano |
| BS3b_null_pointer_anim.png | Parado A/B, teleporte de saída/entrada, tiro, invocação, dano, pixel de derrota |
| BS3c_null_pointer_extras.png | Retrato, cursor A/B, bloco de vazio A/B |
| BS4a_tech_debt_sheet.png | Máquina frontal completa, núcleo CRT separado |
| BS4b_tech_debt_parts.png | Tela normal/branca, gaveta fechada/aberta, módulo de rolos A/B, cartão perfurado, tela quebrada |
| BS4c_tech_debt_core.png | Parado A/B, carga, disparo, dano, derrota, segmento de laser separado |

## Preparação para o jogo

- Todas as imagens são artes brutas em 2172 × 724, com fundo magenta. O gerador aproxima a cor pedida: remover com tolerância de cor, preservando os roxos de Null Pointer.
- Ainda é necessário registrar e recortar as células, reduzir com nearest-neighbor, limitar a paleta e montar os spritesheets de produção. O tamanho do canvas não determina o tamanho lógico do sprite.
- Referências de escala do documento: Memory Leak ≈56 px; Race Condition ≈52 px; Null Pointer ≈60 px; máquina Tech Debt ≈160 px; núcleo CRT ≈48 px. Redimensionar máquina e núcleo separadamente após extrair a BS4a.
- Retratos, projéteis, poças, blocos de vazio e rastros devem ser extraídos como objetos próprios, não como quadros de uma única animação.
- A divisão de Race Condition contém duas cópias sobrepostas dentro de uma única célula. O último quadro de Null Pointer é intencionalmente um pixel pequeno, não um arquivo incompleto.
- A pose de emergir de Memory Leak foi corrigida para erguer os dois braços. Os projéteis de Null Pointer foram corrigidos para formato de cursor. O núcleo CRT foi ajustado para vista em três quartos voltada à esquerda.
- As peças da BS4b precisam ser registradas sobre a máquina frontal antes da integração. Confirmar a emenda horizontal do segmento de laser da BS4c após redução e limitação da paleta.
- Nenhum destes arquivos foi integrado ao código do jogo nesta etapa.
