# Banner do Megabob para itch.io

Esta versão isolada foi substituída, para a página, pelo [conjunto integrado de três artes](../itch-theme/README.md), feito após o pedido de continuidade entre Banner, Background e Embed BG. Use o conjunto novo inteiro para obter o encaixe.

Envie **`megabob-itch-banner.png` (960×240)** ao campo **Banner**, com alinhamento central. A versão **`megabob-itch-banner-2x.png` (1920×480)** oferece a mesma composição em maior resolução.

O banner final já contém a logo **MEGABOB** aprovada, Bob à esquerda e Memory Leak à direita, sobre a cidade de servidores que acompanha os fundos da página. A imagem `source/banner-plate-generated.png` é a base original sem letras; use os PNGs finais para o campo Banner.

## Processo e originais

- Cena composta com a ferramenta integrada **image_gen**, usando o fundo do itch e recortes de Bob/Memory Leak da capa aprovada como referências.
- Prompt integral: [`source/banner-plate.prompt.txt`](source/banner-plate.prompt.txt).
- A logo vem de `art/exports/megabob-logo.png`, preservada sem redesenho. Sua suavidade é a exceção de identidade já aprovada; personagens e cenário continuam em 16 bits.
- `py -3 tools/export_itch_banner.py` recorta a área segura 4:1 e normaliza o cenário para 480×120 com nearest-neighbor. Os finais usam grade 2×/4×; a logo é amostrada da fonte aprovada para manter a leitura.
- Originais e hashes registrados em `manifest.json`. Nenhum asset ou código do jogo foi alterado.

Os fundos externos e o **Embed BG** estão em `../itch-background/`; cada arquivo corresponde ao seu próprio campo no editor de tema. A prévia local da composição completa está no `preview.html` daquela pasta.
