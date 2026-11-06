# Pendências de arte

O lote novo de 99 strips/imagens passou nas verificações de recorte, dimensões, transparência, paleta e carregamento. A montagem das fases e dos menus ainda precisa de revisão no contexto de cada tela.

Correção de enquadramento concluída:

- O encaixe agora compara a armadura inteira e só aceita posições dentro do quadro. Idle, salto e dash foram reprocessados; as duas poses de air dash usam uma escala compartilhada que conserva o desenho inteiro. Os seis avisos de recorte foram eliminados, mantendo os quadros 48×48 e as fontes intactas. Comparação em `art/preview/bob_bounds_comparison.png`.

Correção de composição concluída:

- As poses B6 `dash[1]` e `dash[3]` têm regiões anatômicas próprias para cabeça, peito, braços e botas; deixaram de usar cortes horizontais por altura. A mesma arte é usada pelo air dash com armadura parcial. Comparação em `art/preview/bob_parts_comparison.png`.
- `compile[0]` é um efeito neutro de partículas, sem partes do corpo. Agora todas as 16 combinações usam os mesmos pixels e a mesma posição do Bob base. O relatório registra esse quadro em `shared_effect_frames`; os outros quatro continuam usando a arte de cada combinação.

O relatório atual do Bob está sem avisos de recorte ou sobreposição. As fontes não foram alteradas. A revisão das animações no contexto das fases e menus continua nas tarefas correspondentes; os recortes anatômicos anotados acima são específicos das duas poses B6.
