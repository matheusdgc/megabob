# Fundos da página do Megabob no itch.io

Artes originais geradas com a ferramenta integrada **image_gen**, mantendo a cidade de servidores cyberpunk do projeto em estilo 16 bits. Sem personagens, texto ou logo embutidos. Detalhes de arquitetura nas laterais; centro escuro para o jogo e a descrição.

## Arquivos para enviar

| Campo do editor de tema | Arquivo | Tamanho |
|---|---|---|
| **Background** — recomendado | `megabob-itch-background-wide.png` | 1920×1080 |
| **Embed BG** — área anterior ao início do jogo | `megabob-itch-embed-bg.png` | 960×540 |
| **Background** — alternativa vertical | `megabob-itch-background-portrait.png` | 1080×1920 |

O arquivo de Embed BG usa o centro discreto do cenário horizontal. Assim a área do jogo não cria outra moldura de prédios. A imagem vertical é uma alternativa para o fundo externo.

O ZIP `megabob-itch-backgrounds.zip` reúne os três PNGs, este guia, o manifesto, a prévia HTML, os originais e os prompts. Extraia o ZIP para escolher os PNGs no editor de tema. `PROMPTS.md` contém o conjunto final completo; `preview.html` permite conferir a composição localmente.

## Aplicação sugerida

1. Abra **Edit theme** na [página do Megabob](https://matheusdgc.itch.io/megabob).
2. Em **Background**, envie a versão horizontal; escolha alinhamento central, sem repetição e marque **Fixed**.
3. Em **Embed BG**, envie o arquivo de 960×540. Mantenha o embed do jogo em 960×540.
4. Confira a página com o editor fechado, em janela larga e estreita, e então salve o tema.

Paleta sugerida para acompanhar a arte: BG `#041126`, BG2 `#061326`, texto `#E5F2FF`, links/botões `#3DDBD9`. A opacidade do painel de conteúdo pode ficar em 100% para garantir leitura. Essas cores são uma sugestão de composição.

Referência dos campos e cores: [guia oficial do editor de tema do itch.io](https://itch.io/docs/creators/design#the-itchio-theme-editor).

## Originais e reprodução

As gerações originais estão em `source/city-wide-generated.png` e `source/city-portrait-generated.png`. Os prompts integrais ficam nos arquivos `.prompt.txt` ao lado. A versão vertical foi recomposta por image_gen a partir da horizontal, preservando a família visual.

`py -3 tools/export_itch_backgrounds.py` exporta uma paleta compartilhada de 256 cores, com grade de pixels ampliada 2×, nearest-neighbor e sem dithering. Os originais permanecem intactos; o manifesto registra seus hashes. Nenhuma textura ou código do jogo foi alterado.
