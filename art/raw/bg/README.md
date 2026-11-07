# Fundos de parallax — artes brutas

Quatro folhas geradas com a ferramenta integrada `imagegen`, usando os tilesets das respectivas fases como referência. Cada PNG tem um `.prompt.txt`; T1 também preserva o prompt de correção de contraste da camada intermediária.

| Folha | Tema |
|---|---|
| T1_memory_leak_bg.png | Servidores, tubulações e lodo teal |
| T2_race_condition_bg.png | Relógios, circuitos e barramentos laranja |
| T3_null_pointer_bg.png | Grades quebradas, wireframes e fragmentos roxos |
| T4_tech_debt_bg.png | Mainframes legados, fitas, cabos e terminais CRT |

Cada imagem mede 1070 × 1470 e contém três faixas de paisagem empilhadas, de cima para baixo:

1. **FAR:** camada distante escura, com ambiente/céu opaco e estruturas de baixo contraste.
2. **MID:** estruturas intermediárias isoladas; espaços magenta devem ser removidos.
3. **NEAR:** silhuetas próximas concentradas no alto; metade inferior predominantemente magenta e vazia.

São doze camadas-fonte ao todo. O magenta das margens, separadores e espaços vazios é chave de recorte; o preto/azul/roxo escuro do ambiente e das estruturas é arte e deve permanecer opaco.

## Recorte e repetição

- Separar as três faixas e remover margens/separadores magenta. Conferir os limites visuais e os pontos de ancoragem de cada camada antes de normalizar o tamanho.
- Reduzir as camadas para a referência lógica de aproximadamente 512 × 224 (duas telas de 256 × 224), com nearest-neighbor e paleta limitada.
- A geração pediu repetição horizontal e usa motivos periódicos, mas as emendas não foram validadas pixel a pixel. Testar cada faixa repetida lado a lado e ajustar as extremidades após recorte, redução e normalização da paleta. Não tratar estes PNGs como texturas prontas sem costura.
- Remover o magenta com tolerância de cor, preservando especialmente os tons roxos da T3. Manter os centros escuros opacos da camada FAR.
- Verificar o contraste na composição com os personagens. A camada MID de T1 foi escurecida para não competir com o Bob.
- Processamento atual: doze camadas originais 512×224 e doze variantes `<chave>_wide` 512×270 estão registradas no Boot. FAR/MID novas são ancoradas embaixo e NEAR no alto, mantendo a escala. Tech Debt MID/NEAR novas usam cores mais escuras para separar fundo e piso; as originais são preservadas. Todas têm bordas horizontais conferidas. Prévias dos temas em `art/exports/megabob-environments.png`; integração do parallax nas fases segue as tarefas correspondentes.
