# Publicar no itch.io

## Gerar o pacote

Requisitos: Node.js, npm e Python 3 (somente biblioteca padrão para empacotar).

```sh
npm ci
npm test
npm run typecheck
npm run package:itch
npm run check:release
```

O comando gera `release/megabob-html5.zip`, o SHA-256 e um relatório de tamanho e quantidade de arquivos. O ZIP contém apenas o build de `dist/`, com `index.html` na raiz, scripts, arte e música locais. A pasta `release/` não entra no Git.

O verificador `check:release` primeiro compara todos os arquivos do ZIP com `dist/`. Usa um Microsoft Edge instalado no caminho padrão do Windows, com perfil temporário. Ele serve o build em uma subpasta dentro de um iframe, percorre título → seleção → gameplay por teclado, confere recursos e erros do navegador. Não depende dos atalhos de desenvolvimento do jogo.

## Configurar a página

1. Crie ou edite o projeto em [itch.io](https://itch.io/game/new), com título **Megabob** e **Kind of project: HTML**. Mantenha a visibilidade **Draft** enquanto configura e testa.
2. Em **Uploads**, envie `release/megabob-html5.zip` e marque **This file will be played in the browser**.
3. Use embed **960 × 540** (2× a resolução interna de 480 × 270), habilite o botão de tela cheia e use **Click to Play**. O clique também permite liberar o áudio no navegador.
4. Não habilite **Mobile friendly**: a jogabilidade usa teclado ou gamepad e não oferece controles de toque. Preencha os campos de conteúdo gerado por IA de acordo com as ferramentas efetivamente utilizadas.
5. Use `art/marketing/megabob-itch-cover.png` no campo **Cover image**. Adicione a descrição, controles e os três prints de `docs/screenshots/`. Preserve os créditos de música e personagem presentes no jogo e na documentação.
6. Salve e teste a página de rascunho: clique no jogo para focar, inicie uma fase, mova/pule/atire, pause, confira som, tela cheia e retorno ao título. Recarregue para conferir a persistência das opções e do progresso. Verifique em outro navegador antes de tornar a página pública.
7. Mude a visibilidade para **Public** quando a página e a partida estiverem aprovadas. Copie o endereço público para o README.

O save é local ao navegador e à origem do iframe. Um save do localhost não é transferido para o itch.io; configurações de privacidade do navegador podem impedir a persistência.

## Arte do tema

Fundos preparados para [a página do Megabob](https://matheusdgc.itch.io/megabob), em `art/marketing/itch-background/`:

- **Background:** `megabob-itch-background-wide.png` (1920×1080), centralizado, sem repetição e com Fixed marcado.
- **Embed BG:** `megabob-itch-embed-bg.png` (960×540), recorte central discreto para não duplicar os prédios na área do jogo.
- **Alternativa vertical para Background:** `megabob-itch-background-portrait.png` (1080×1920).

O ZIP `megabob-itch-backgrounds.zip` reúne os PNGs e o guia. Originais de image_gen e prompts estão preservados em `source/`. Reprodução: `py -3 tools/export_itch_backgrounds.py`. Detalhes em [README dos fundos](../art/marketing/itch-background/README.md); `preview.html` mostra uma composição local de tema, e não modifica a página publicada.

## Atualizar com butler (opcional)

Com uma página já criada e o butler instalado/autenticado, substitua `SEU_USUARIO` pelo subdomínio real da conta:

```sh
butler push dist SEU_USUARIO/megabob:html
```

O comando envia a pasta do build. Na primeira vez, confira na página se o canal está marcado como jogável no navegador. Atualizações usam o mesmo canal `html`.

## Estado da entrega

O pacote é preparado localmente; o envio e a publicação no itch.io dependem da página de destino. A validação automatizada não substitui a partida humana completa, a avaliação do mix de áudio e o teste de desempenho em hardware real (pendências em `tasks/todo.md`).

Referências: [HTML5 no itch.io](https://itch.io/docs/creators/html5) e [envios com butler](https://itch.io/docs/butler/pushing.html).
