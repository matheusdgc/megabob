# Pendências de arte

O lote novo de 99 strips/imagens passou nas verificações de recorte, dimensões, transparência, paleta e carregamento. A montagem das fases e dos menus ainda precisa de revisão no contexto de cada tela.

Correção de enquadramento concluída:

- O encaixe agora compara a armadura inteira e só aceita posições dentro do quadro. Idle, salto e dash foram reprocessados; as duas poses de air dash usam uma escala compartilhada que conserva o desenho inteiro. Os seis avisos de recorte foram eliminados, mantendo os quadros 48×48 e as fontes intactas. Comparação em `art/preview/bob_bounds_comparison.png`.

Pendências que continuam:

- Nas poses horizontais, combinações com apenas algumas peças da armadura podem mostrar emendas porque o pipeline anterior separa regiões por altura. A armadura completa usa a fonte inteira.
- Conferir a transição inicial de `compile` com armadura, cujo encaixe tem sobreposição menor no relatório do pipeline anterior.

Essas duas pendências continuam documentadas, sem regeneração das fontes. Veja `docs/HANDOFF.md` e `docs/art-pipeline.md`.
