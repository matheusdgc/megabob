# Armas e efeitos — artes brutas

FX1–FX5 foram geradas com a ferramenta integrada `imagegen`, seguindo `docs/art-prompts.md`. Cada PNG tem um `.prompt.txt` com o prompt completo. A folha A5 do Compiler Cannon, gerada na etapa da armadura, foi preservada.

| Folha | Linhas de cima para baixo | Quadros por linha | Total |
|---|---|---|---:|
| FX1_buster.png | Tiro básico; carga 1; carga 2; aura azul e aura branco-azul; flash do disparo | 2 / 2 / 3 / 6 / 2 | 15 |
| FX2_weapons.png | Garbage Collector; Mutex Lock; Null Pointer | 4 / 4 / 5 | 13 |
| FX3_explosions.png | Impacto; explosão pequena; explosão de chefe; desvio de tiro | 3 / 5 / 6 / 3 | 17 |
| FX4_movement.png | Poeira de dash; contato na parede; aterrissagem; descompilação | 4 / 3 / 3 / 6 | 16 |
| FX5_pickups.png | Vida pequena A/B; vida grande A/B; energia pequena A/B; energia grande A/B; vida extra A/B | 10, em uma linha | 10 |
| A5_compiler_shot.png | Hélice; impacto; aura com chaves | 4 / 4 / 3 | 11 |

## Recorte e integração

- FX1–FX5 somam 71 quadros. Há células vazias à direita das linhas curtas: elas não são quadros adicionais. FX1/FX3/FX4 usam até seis colunas; FX2 usa até cinco.
- Na linha 2 da FX2, as duas primeiras células são o cadeado-projétil e as duas seguintes são a casca de bloqueio. Na linha 3, as três primeiras são o cursor e as duas últimas são o efeito de atravessar parede. Extrair como animações distintas.
- As auras e cascas de bloqueio têm centro magenta vazio para receber personagens renderizados separadamente. A poeira de aterrissagem contém dois tufos por quadro, formando um único efeito em torno do ponto central.
- Todas as folhas usam fundo magenta. O gerador aproxima a cor pedida; remover com tolerância de cor, preservando os efeitos roxos. Não remover os centros brancos de projéteis, faíscas e explosões.
- Ainda é necessário registrar as células, remover o fundo, reduzir com nearest-neighbor e limitar a paleta. Ajustar os tamanhos lógicos de tiros pequenos/médios/grandes no pós-processamento; o canvas da imagem não determina a escala no jogo.
- A arte é bruta e não foi integrada ao código do jogo nesta etapa.
