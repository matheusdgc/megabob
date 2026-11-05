# Megabob: trilha sonora

Fonte: `art/raw/soundtrack/` (14 faixas). Análise feita por script (duração, volume RMS e de pico, tom, BPM, fade-in e fade-out, e o quanto o fim de cada faixa se parece com o começo, para o loop). **Nenhuma faixa foi ouvida**: a escolha final precisa ser confirmada de ouvido.

## Seleção

| # | Uso | Faixa | Duração | Tom / BPM | Por quê | Tratamento |
|---|---|---|---|---|---|---|
| 1 | Título | `01_titulo__8Bit_Title_Screen.mp3` (JPool, "(Game-1) Theme") | 22 s | Ré menor · 175 | Curta e enérgica, sem fade. Serve bem como abertura em loop | loop inteiro |
| 2 | Seleção de fases | `02_selecao_de_fases__Select_Mountain_120BPM.ogg` (MintoDog) | 32 s | Sol menor · 120 | Tempo médio, emenda bem no loop | loop inteiro |
| 3 | Fase Memory Leak | `03_fase_memory_leak__Sewer_Nightclub.ogg` (Section 31 - Tech) | 140 s | Dó maior · ~112 | A mais pesada nos graves (81% da energia abaixo de 200 Hz), com groove, e vai crescendo | começa em 0 s, loop a partir de ~4 s (pula o fade-in). Pico passa de 0 dB: reduzir o ganho |
| 4 | Fase Race Condition | `04_fase_race_condition__Castle_Stage_180BPM.ogg` (MintoDog) | 72 s | Dó# menor · 180 | A mais rápida, com intensidade constante, e emenda bem no loop | loop inteiro |
| 5 | Fase Null Pointer | `05_fase_null_pointer__CYBER_CELESTE.mp3` | 45 s | Dó menor · ~129 | Quase sem grave (6%), etérea, em tom menor: o "vazio" combina | **muito baixa** (RMS −28 dB): subir uns 15 dB |
| 6 | Chefes (os 3) | `06_chefes__8bit_Action_Boss_Battle_145BPM.ogg` (MintoDog) | 63 s | Dó maior · 145 | Tensa e constante, emenda bem no loop | loop inteiro |
| 7 | Fortaleza | `07_fortaleza__Last_Mission_FULL.mp3` | 124 s | Ré menor · 140 | Sombria, em tom menor e longa, para uma fase longa | reconverter (está em 320 kbps, 4,7 MB) |
| 8a | **Tech Debt, fase 1** ⭐ | `08a_tech_debt_fase1__phantasticbeats-boss-fight-301722.mp3` | 121 s | Dó maior · ~96/190 | **Faixa extra aproveitada.** É o loop mais limpo do lote e tem muita energia. Dá à luta final uma música própria, diferente da dos chefes comuns | loop inteiro. Pico passa de 0 dB: reduzir o ganho |
| 8b | Tech Debt, fase 2 | `08b_tech_debt_fase2__Final_Stand_Phase4_FinalMax.ogg` | 64 s | Ré menor · ~117 | O nome diz "fase final" e a intensidade cresce até o fim: serve para a escalada da fase 2 | subir uns 7 dB (RMS −20 dB) |
| 9 | Créditos | `09_creditos__lightyeartraxx-kim-lightyear-legends-109307.mp3` ⭐ | 195 s | **Dó maior** · ~129 | **Troca.** Créditos tocam uma vez e acabam, então uma faixa com fim natural (fade-out em ~185 s) é melhor que um loop. É em tom maior (a detecção de tom teve a maior confiança do lote) e o nome combina | toca uma vez, sem loop |

⭐ = sugestão minha, diferente da sua organização inicial.

## Reservas (não usadas)

| Faixa | Observação | Uso possível |
|---|---|---|
| `reserva_creditos__Electronic_Chiptune_3.wav` | Você tinha escolhido para os créditos. É WAV de 23 MB, em loop, com tom pouco definido | volta para os créditos se a "Legends" não agradar de ouvido (converter para OGG) |
| `reserva_fortaleza__retro-bgm-chan-factory-at-night-516327.mp3` | Industrial e grave, em Lá# menor, com intro de ~19 s e fade-out | alternativa para a Fortaleza ou a Memory Leak (loop de 19 s a 189 s) |
| `reserva_titulo__white_records-pixel-fight-8-bit-arcade-music-background-music-for-video-208775.mp3` | Fá maior, alto e animado, a mais "arcade" do lote | alternativa para o Título (loop de 0 a 58 s), se quiser uma abertura mais alegre |
| `reserva_sem_uso__lightyeartraxx-kim-lightyear-angel-eyes-chiptune-edit-110226.mp3` | Ré menor, 220 s, versão chiptune de uma música (é um cover) | dispensável |

## Processamento (feito na T11)

- **Volume:** normalizar todas as faixas para o mesmo volume percebido (RMS alvo ≈ −14 dB, pico ≤ −1 dB). Hoje vai de −28 dB (Null Pointer) até picos acima de 0 dB (Sewer Nightclub, Boss Fight).
- **Formato:** OGG Vorbis ~128 kbps + MP3 de fallback para o Safari. Os 64 MB atuais devem cair para algo em torno de 14 MB.
- **Loop:** os pontos de loop ficam num manifesto (`src/data/music.ts`, com `loopStart` e `loopEnd` em segundos), e o player faz o loop sem emenda via WebAudio.
- **Transições:** crossfade curto entre cenas, e corte seco na entrada do chefe.

## Licenças: preencha antes de publicar

Os arquivos `lightyeartraxx-*`, `phantasticbeats-*`, `retro-bgm-chan-*` e `white_records-*` seguem o padrão de nome do **Pixabay**: licença Pixabay, uso livre em projetos, sem crédito obrigatório (mas vamos creditar). As faixas 05, 07, 08 e 09 **não têm autor nos metadados**.

| Faixa usada | Autor | Fonte (URL) | Licença |
|---|---|---|---|
| (Game-1) Theme | JPool | | |
| Select Mountain | MintoDog | | |
| Sewer Nightclub | Section 31 - Tech | | |
| Castle Stage | MintoDog | | |
| CYBER CELESTE | ? | | |
| 8bit Action Boss Battle | MintoDog | | |
| Last Mission | ? | | |
| Boss Fight | phantasticbeats | Pixabay | Pixabay Content License |
| Final Stand | ? | | |
| Legends | Kim Lightyear (lightyeartraxx) | Pixabay | Pixabay Content License |
