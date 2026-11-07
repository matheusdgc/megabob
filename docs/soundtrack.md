# Megabob: trilha sonora

Fonte: `art/raw/soundtrack/` (14 faixas). Análise feita por script (duração, volume RMS e de pico, tom, BPM, fade-in e fade-out, e o quanto o fim de cada faixa se parece com o começo, para o loop). **Nenhuma faixa foi ouvida**: a escolha final precisa ser confirmada de ouvido.

## Seleção

| # | Uso | Faixa | Duração | Tom / BPM | Por quê | Tratamento |
|---|---|---|---|---|---|---|
| 1 | Título | `reserva_fortaleza__retro-bgm-chan-factory-at-night-516327.mp3` (retro-bgm-chan, "Factory at Night") | 192 s | Lá# menor | **Escolha do usuário (07/11).** Industrial e grave, com intro de ~19 s e fade-out | loop de 19 s a 189 s (pula a intro e o fade-out) |
| 2 | Seleção de fases | `02_selecao_de_fases__Select_Mountain_120BPM.ogg` (MintoDog) | 32 s | Sol menor · 120 | Tempo médio, emenda bem no loop | loop inteiro |
| 3 | Fase Memory Leak | `03_fase_memory_leak__Sewer_Nightclub.ogg` (Section 31 - Tech) | 140 s | Dó maior · ~112 | A mais pesada nos graves (81% da energia abaixo de 200 Hz), com groove, e vai crescendo | começa em 0 s, loop a partir de ~4 s (pula o fade-in). Pico passa de 0 dB: reduzir o ganho |
| 4 | Fase Race Condition | `04_fase_race_condition__Castle_Stage_180BPM.ogg` (MintoDog) | 72 s | Dó# menor · 180 | A mais rápida, com intensidade constante, e emenda bem no loop | loop inteiro |
| 5 | Fase Null Pointer | `05_fase_null_pointer__CYBER_CELESTE.mp3` (GloryToTheMachine, CC-BY) | 45 s | Dó menor · ~129 | Quase sem grave (6%), etérea, em tom menor: o "vazio" combina | **muito baixa** (RMS −28 dB): subir uns 15 dB |
| 6 | Chefes (os 3) | `06_chefes__8bit_Action_Boss_Battle_145BPM.ogg` (MintoDog) | 63 s | Dó maior · 145 | Tensa e constante, emenda bem no loop | loop inteiro |
| 7 | Fortaleza | `07_fortaleza__Last_Mission_FULL.mp3` (HydroGene) | 124 s | Ré menor · 140 | Sombria, em tom menor e longa, para uma fase longa | reconverter (está em 320 kbps, 4,7 MB) |
| 8a | **Tech Debt, fase 1** ⭐ | `08a_tech_debt_fase1__phantasticbeats-boss-fight-301722.mp3` | 121 s | Dó maior · ~96/190 | **Faixa extra aproveitada.** É o loop mais limpo do lote e tem muita energia. Dá à luta final uma música própria, diferente da dos chefes comuns | loop inteiro. Pico passa de 0 dB: reduzir o ganho |
| 8b | Tech Debt, fase 2 | `08b_tech_debt_fase2__Final_Stand_Phase4_FinalMax.ogg` (Centurion_of_war) | 64 s | Ré menor · ~117 | O nome diz "fase final" e a intensidade cresce até o fim: serve para a escalada da fase 2 | subir uns 7 dB (RMS −20 dB) |
| 9 | Créditos | `09_creditos__lightyeartraxx-kim-lightyear-legends-109307.mp3` ⭐ | 195 s | **Dó maior** · ~129 | **Troca.** Créditos tocam uma vez e acabam, então uma faixa com fim natural (fade-out em ~185 s) é melhor que um loop. É em tom maior (a detecção de tom teve a maior confiança do lote) e o nome combina | toca uma vez, sem loop |

⭐ = sugestão minha, diferente da sua organização inicial.

## Reservas (não usadas)

| Faixa | Observação | Uso possível |
|---|---|---|
| `reserva_creditos__Electronic_Chiptune_3.wav` | Você tinha escolhido para os créditos. É WAV de 23 MB, em loop, com tom pouco definido | volta para os créditos se a "Legends" não agradar de ouvido (converter para OGG) |
| `01_titulo__8Bit_Title_Screen.mp3` (JPool, "(Game-1) Theme") | Era o título até 07/11; curta (22 s) e enérgica, sem fade | volta para o título se o usuário preferir |
| `reserva_titulo__white_records-pixel-fight-8-bit-arcade-music-background-music-for-video-208775.mp3` | Fá maior, alto e animado, a mais "arcade" do lote | alternativa para o Título (loop de 0 a 58 s), se quiser uma abertura mais alegre |
| `reserva_sem_uso__lightyeartraxx-kim-lightyear-angel-eyes-chiptune-edit-110226.mp3` | Ré menor, 220 s, versão chiptune de uma música (é um cover) | dispensável |

## Processamento (feito na T11)

- **Conversão:** `py -3 tools/music.py` (precisa do `ffmpeg`) gera `public/assets/music/<faixa>.ogg` (Vorbis q4, ~128 kbps) e um `.mp3` de reserva, e escreve `src/data/musicFiles.ts`. Em OGG são ~12 MB, o que o navegador baixa.
- **Volume:** igualado no jogo, sem mexer nos arquivos: o player mede RMS e pico de cada faixa ao carregar e aplica o ganho até −16 dBFS RMS, sem passar de −1 dBFS de pico (`normalizeGain` em `src/systems/audioMath.ts`). Medido: todas em −16, menos Null Pointer (−17,3, segura pelos próprios picos).
- **Loop:** `loopStart` em `src/data/music.ts` (a Memory Leak pula o fade-in de 4 s). O player ajusta os pontos para a emenda não estalar (`snapLoop`): o início num cruzamento por zero, o fim até 30 ms antes, onde as próximas amostras repetem as do início. Os créditos tocam uma vez.
- **Transições:** crossfade curto ao entrar numa fase; corte seco com alarme na entrada do chefe; a morte para a música e o respawn recomeça do início.

## Licenças (T20, conferidas em 07/11/2026)

Fontes conferidas nas páginas originais; as do OpenGameArt também pelo tamanho do arquivo, idêntico byte a byte ao de `art/raw/soundtrack/`. O Pixabay bloqueia acesso automático, então essas três ficam pelo ID que está no nome do arquivo. A mesma tabela, como dado, está em `src/data/credits.ts` (`MUSIC_CREDITS`), e é dela que sai a lista de músicas dos créditos; `tests/credits.test.ts` exige crédito para toda faixa do manifesto.

| Uso | Faixa | Autor | Fonte | Licença |
|---|---|---|---|---|
| Título | Factory at Night | Retro-BGM-Chan | Pixabay, faixa 516327 | Pixabay Content License |
| Seleção | Select Mountain (pacote "8bit Action Stage Select") | MintoDog | opengameart.org/content/8bit-action-stage-select | CC0 |
| Memory Leak | Sewer Nightclub | Section 31 - Tech (s31tech.org) | opengameart.org/content/sewer-nightclub | CC0 (o autor pede crédito, opcional) |
| Race Condition | Castle Stage | MintoDog | opengameart.org/content/castle-stage | CC0 |
| Null Pointer | CYBER_CELESTE | GloryToTheMachine | opengameart.org/content/cyberceleste-gl0ryt0th3m4ch1n3 | **CC-BY 4.0: crédito obrigatório** |
| Chefes | 8bit Action Boss Battle | MintoDog | opengameart.org/content/8bit-action-boss-battle | CC0 |
| Fortaleza | 8-bit - Last Mission | HydroGene | opengameart.org/content/8-bit-last-mission | CC0 |
| Tech Debt, fase 1 | Boss Fight | phantasticbeats | Pixabay, faixa 301722 | Pixabay Content License |
| Tech Debt, fase 2 | Final Stand (Phase 4 FinalMax) | Centurion_of_war | opengameart.org/content/final-stand-0 | CC0 |
| Créditos | Legends | Kim Lightyear (lightyeartraxx) | Pixabay, faixa 109307 | Pixabay Content License |

- **CC-BY 4.0** (só a CYBER_CELESTE) exige autor, título, link da fonte, link da licença e aviso de alteração. Os créditos mostram tudo isso, e a linha "All tracks re-encoded, loudness-matched and looped" é o aviso de alteração. Se a faixa for trocada por outra CC-BY, o teste cobra o mesmo.
- **CC0** e **Pixabay Content License** não exigem crédito; creditamos todas mesmo assim. A licença do Pixabay proíbe redistribuir a faixa isolada (como arquivo de música): no jogo publicado ela vai dentro do build, o que é permitido.
- **Reservas** não estão no jogo e não precisam de crédito. Se uma voltar, entra em `MUSIC_CREDITS` (o teste falha até isso).
