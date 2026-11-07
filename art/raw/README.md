# Megabob — inventário de arte bruta

A etapa de geração descrita em `docs/art-prompts.md` está concluída: **65 PNGs previstos**, todos acompanhados pelos prompts usados na ferramenta integrada `imagegen`. A conferência final abriu e decodificou cada arquivo esperado e confirmou a presença dos prompts.

| Categoria | Folhas | Inventário |
|---|---:|---|
| Bob base, B1–B11 | 11 | [Arquivos](bob/) |
| Firmware Armor, A1, A2 B2–B10 e air dash, A3, A4 | 13 | [Detalhes](bob_armor/README.md) |
| Inimigos E1–E10 | 10 | [Detalhes](enemies/README.md) |
| Quatro chefes, BS1a–BS4c | 12 | [Detalhes](bosses/README.md) |
| Efeitos FX1–FX5 e A5 Compiler Cannon | 6 | [Detalhes](fx/README.md) |
| Tiles T1–T4 e objetos T5 | 5 | [Detalhes](tiles/README.md) |
| Fundos T1–T4, com três camadas cada | 4 | [Detalhes](bg/README.md) |
| Interface U1–U4 | 4 | [Detalhes](ui/README.md) |
| **Total** | **65** | |

## Estado da entrega

- [x] Bob base B1–B11 gerado; B1 aprovada pelo usuário como referência visual.
- [x] Armadura, animações e objetos de upgrade gerados.
- [x] Dez inimigos comuns gerados.
- [x] Quatro chefes com conceitos, animações e extras gerados.
- [x] Tiros, armas especiais, efeitos e itens gerados.
- [x] Tiles, doze camadas-fonte de parallax e objetos comuns gerados.
- [x] Logo, fundo de título, seleção de fases e HUD gerados.
- [x] 65 PNGs esperados legíveis e com prompts correspondentes.
- [x] Pós-processamento do lote e preparação de 120 strips/imagens; Bob e armadura mantêm o pipeline anterior.
- [x] Registro no Boot e carregamento das 265 texturas (120 do lote e 145 do Bob) nas cenas Debug e Stage, sem erros de console/rede.
- [ ] Uso das novas animações, chefes, parallax e componentes de UI nas tarefas de mecânicas, fases e menus.

## Processamento e próximos passos

Estas imagens são **fontes de arte**. Os spritesheets para o motor ficam em `public/assets/`. Use `py -3 tools/art.py all` para reproduzir o lote; veja `docs/art-pipeline.md`. O relatório `art/preview/art_report.json` confirma 67 PNGs brutos (65 previstos acima, o fundo panorâmico adicional U2 e o backup da logo anterior), hashes preservados durante a importação e nenhuma fonte sem classificação. As notas de cada pasta registram células, estados e cuidados específicos.

1. Integrar animações, objetos e interface nas mecânicas e telas correspondentes.
2. Conferir o alinhamento das peças modulares da armadura com o Bob base; as pendências anteriores estão em `docs/HANDOFF.md`.
3. Montar as quatro fases com os tiles 16 × 16 e revisar transições no mapa completo.
4. Compor o parallax com as três camadas por fase. As doze camadas processadas têm bordas horizontais iguais; prévias repetidas ficam em `art/preview/`.

O magenta gerado aproxima `#FF00FF` e não deve ser removido por igualdade exata de RGB. Dimensões iguais de canvas não comprovam alinhamento exato dos sprites.

Nenhum arquivo de áudio existente foi alterado nesta etapa. O inventário acima cobre somente as imagens previstas no documento de prompts.
