# Pendências de arte

O lote novo de 99 strips/imagens passou nas verificações de recorte, dimensões, transparência, paleta e carregamento. A montagem das fases e dos menus ainda precisa de revisão no contexto de cada tela.

Pendências anteriores do Bob e da armadura, preservadas nesta importação:

- Alguns quadros com armadura em idle, jump, dash e air dash excedem o quadro de 48×48 em 1–2 pixels. Conferir os avisos de `art/preview/bob_report.json` antes de ajustar as fontes ou o encaixe.
- Nas poses horizontais, combinações com apenas algumas peças da armadura podem mostrar emendas porque o pipeline anterior separa regiões por altura. A armadura completa usa a fonte inteira.
- Conferir a transição inicial de `compile` com armadura, cujo encaixe tem sobreposição menor no relatório do pipeline anterior.

Essas pendências não foram corrigidas nem regeneradas nesta fatia. Veja `docs/HANDOFF.md` e `docs/art-pipeline.md`.
