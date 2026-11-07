# Tiles e objetos — artes brutas

Cinco folhas geradas com a ferramenta integrada `imagegen`, seguindo `docs/art-prompts.md`. Os prompts completos estão nos arquivos `.prompt.txt` correspondentes. Os conceitos dos chefes e a B1 do Bob serviram como referências de material, paleta e estilo, sem incluir personagens nas folhas.

| Folha | Tema | Extras na última linha |
|---|---|---|
| T1_memory_leak_tiles.png | Data center inundado, metal e lodo teal | Cano vazando e pequeno rack |
| T2_race_condition_tiles.png | Barramento, circuitos e trilho elétrico | Relógio, acoplador e dois quadros de esteira |
| T3_null_pointer_tiles.png | Vazio, wireframes e blocos incompletos | Cubo, fragmento e estados do bloco que desaparece |
| T4_tech_debt_tiles.png | Gabinetes legados, cabos e CRT verde | Gabinete de fitas e terminal CRT |
| T5_common.png | Objetos compartilhados | Porta e checkpoint em estados distintos, plataforma móvel |

## Organização das quatro folhas de fase

Organização conceitual de seis colunas por quatro linhas, da esquerda para a direita:

1. Borda superior, preenchimento, borda esquerda, borda direita, canto externo superior esquerdo, canto externo superior direito.
2. Cantos externos inferiores esquerdo/direito, cantos internos superiores esquerdo/direito, cantos internos inferiores esquerdo/direito.
3. Plataforma esquerda/meio/direita, coluna de parede, perigo da fase, parede de fundo escura.
4. Dois objetos decorativos, seguidos pelos extras específicos ou espaço magenta vazio.

Na T2, as colunas 3–4 da última linha são os dois quadros da esteira. Na T3, a coluna 3 é o bloco sólido, a 4 é o bloco intermitente e a 5 é o estado desaparecido: esta célula fica intencionalmente vazia. A coluna 6 é espaço não usado.

T5 tem uma única linha com seis células: porta fechada, porta parcialmente aberta, porta aberta, checkpoint desligado, checkpoint ligado e plataforma móvel. O interior da porta aberta é magenta para remoção.

## Preparação para o jogo

- As folhas T1–T4 medem 1536 × 1024; T5 mede 2172 × 724. São fontes de arte, não tilesets prontos para carregar no motor.
- A organização conceitual não é uma grade física de 16 pixels no PNG. Recortar as peças, registrar os contornos, ajustar a grade final 16 × 16, limitar a paleta e verificar as junções entre bordas, cantos e preenchimentos.
- O espaçamento de geração também precisa ser normalizado. Não extrair os tiles cortando o PNG diretamente a cada 16 pixels.
- O fundo magenta é aproximado pelo gerador; remover com tolerância de cor, preservando o roxo da T3 e os pixels claros internos.
- Conferir o alinhamento dos três estados da porta e dos dois estados do checkpoint; ajustar os tamanhos lógicos conforme o documento (porta 32 × 48, plataforma móvel 48 × 16).
- Processamento atual: quadros sólidos/bordas/perigos preenchem 16×16; plataformas ocupam os 16 px de largura, mantêm o perfil fino e começam em `y=0`. Isso elimina margens vazias sem mudar índices ou colisões. Os tiles estão registrados no Boot; `tiles_test` usa T1. Repetições 3×3 e composições dos temas ficam em `art/preview/` e `art/exports/`; detalhes em `docs/art-pipeline.md`.
