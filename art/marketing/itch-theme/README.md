# Megabob: três artes que se completam

Este é o conjunto integrado recomendado. Os três PNGs são recortes da **mesma cena**, com prédios, chuva, plataformas e luzes contínuos. Substitua os três arquivos anteriores juntos.

| Campo no editor | Arquivo | Dimensões |
|---|---|---|
| Background | `01-background.png` | 1920×1080 |
| Banner | `02-banner.png` | 960×320 |
| Embed BG | `03-embed-bg.png` | 960×540 |

## Configuração

- **Background:** Repeat sem repetição, Align Center e **Fixed desmarcado**. O fundo precisa acompanhar a rolagem junto com o banner para manter a continuidade.
- **Banner:** Align Center. A logo MEGABOB já está incluída.
- **Embed:** mantenha 960×540, com início por clique. Use `03-embed-bg.png` no campo Embed BG.
- **BG 2:** Alpha 0 para o cenário aparecer no intervalo entre o banner e o jogo. Cor de fundo de apoio: `#041126`; texto `#e5f2ff`, links/botão `#3ddbd9`.

O encaixe exato foi preparado para a coluna de 960 px: banner de 320 px, intervalo padrão de 20 px do itch.io e embed de 540 px. No editor, a barra administrativa e o painel lateral mudam a área visível; confira também a página fora do editor. Em larguras menores, o itch.io pode redimensionar ou recortar áreas de forma diferente; o céu discreto mantém a composição, mas o encaixe pixel a pixel é específico deste enquadramento desktop.

`preview.html` mostra a composição local, com botão e descrição. `composition.png` mostra a cena completa com a logo. O ZIP `megabob-itch-tema-integrado.zip` reúne os três arquivos, guia, prévia, manifesto, fonte e prompt.

Prévia conferida no Edge em 1920×1080 e viewport emulado 390×844, sem rolagem horizontal ou erros de console/recursos; medidas em `preview-check.json`. O ajuste da página pública permanece no editor do itch.io.

## Origem e reprodução

Cena criada com **image_gen integrado**, usando a cidade de `../itch-background/` e a base de `../itch-banner/` como referências de ambiente e personagens. O [prompt completo](source/unified-scene.prompt.txt) e a imagem original estão preservados em `source/`. Não se trata de três gerações independentes.

Reprodução: `py -3 tools/export_itch_theme.py`. O cenário usa grade 2× com nearest-neighbor; a composição conserva a logo legível aprovada de `art/exports/megabob-logo.png`, aplicada separadamente. O manifesto registra hashes e posições dos recortes. A reconstrução dos três arquivos deve ser idêntica à cena única com a logo; o exportador verifica essa igualdade e a integridade do ZIP. A arte e o código do jogo não são alterados.

Referências de layout: [documentação do editor de tema](https://itch.io/docs/creators/design) e CSS público do itch.io (`.embed_wrapper` com margem vertical de 20 px).
