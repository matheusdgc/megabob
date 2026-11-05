# Megabob: prompts de arte para o ChatGPT

Este documento tem tudo o que vai para o ChatGPT gerar: Bob, inimigos, chefes, cenários, efeitos e UI.
Os prompts estão em **inglês** porque o gerador de imagem segue instruções técnicas de pixel art com mais precisão nesse idioma. As explicações estão em português.

---

## Como usar

1. **Uma conversa por categoria** (Bob, inimigos, chefes, cenários, efeitos, UI). Conversas longas fazem o estilo "derivar".
2. **Comece toda conversa nova colando o [Bloco de estilo](#0-bloco-de-estilo-cole-primeiro-em-toda-conversa)**. Em seguida, **anexe a imagem oficial do Bob** e a **folha do Bob aprovada (B1)**, assim tudo sai no mesmo estilo.
3. **Gere na ordem:** B1 (folha do Bob) → aprove → todo o resto usando a B1 como referência.
4. Cole **um prompt por vez**. Se sair errado, peça um ajuste ("same image, but…") em vez de gerar de novo do zero.
5. Peça sempre **PNG com fundo transparente**. Se o fundo vier sólido, tudo bem, desde que seja magenta puro `#FF00FF`.
6. Salve com o **nome indicado** em cada prompt, na pasta `art/raw/<categoria>/`.
7. **Não anexe sprites de outros jogos ao ChatGPT** (por exemplo, folhas de Mega Man X). O gerador copia o que vê: capacete, armadura, cores, proporções. Use essas folhas só para conferir **quais poses e quantos quadros** cada animação precisa. Isso já está traduzido nos prompts abaixo. Também não coloque essas folhas no repositório (ele vai ser público).

### O que eu faço depois (pós-processamento)

O ChatGPT gera imagens grandes (cerca de 1024 px) que imitam pixel art, mas os pixels não caem numa grade exata. Por isso **não precisa acertar o tamanho final**. Eu passo um script que:

- remove o fundo (transparente ou `#FF00FF`)
- reduz para a resolução real com nearest-neighbor (Bob ≈ 32 px de altura, tiles 16×16 etc.)
- trava as cores na paleta do jogo
- recorta os quadros e monta os spritesheets em `public/assets/`

O que **importa** no ChatGPT: silhueta legível, contorno escuro, poucas cores, quadros **do mesmo tamanho, alinhados numa linha, com espaço entre eles** e personagem **sempre virado para a direita** (o jogo espelha para a esquerda).

---

## 0. Bloco de estilo (cole primeiro em toda conversa)

```
You are the pixel artist for "Megabob", an ORIGINAL 16-bit era side-scrolling action platformer.
Follow these rules in every image I ask for in this conversation:

STYLE
- Authentic 16-bit console pixel art (SNES / Mega Drive era look).
- Hard-edged pixels only: NO anti-aliasing, NO blur, NO gradients, NO soft shadows, NO glow halos, NO dithering noise.
- 1-pixel dark outline (#161616 or a darker shade of the local color) around every character and object.
- Limited palette: max 4 shades per color ramp, light source from the top-left.
- Chunky, readable silhouettes; the art must still read clearly when shrunk to ~32 pixels tall.
- Strict side view (profile), characters FACING RIGHT unless told otherwise.

LAYOUT
- PNG with TRANSPARENT background. If transparency is impossible, use a flat pure magenta #FF00FF background with no texture.
- When I ask for animation frames: all frames in ONE horizontal row, equal-size cells, evenly spaced, same scale, same ground line, character centered in each cell, generous empty space between cells. No overlapping.
- NO text, NO labels, NO numbers, NO watermark, NO frame borders, NO grid lines, NO scenery behind characters.

ORIGINALITY
- All designs must be original. Do NOT imitate Mega Man / Rockman, Mega Man X or any other existing game character, enemy, boss or logo.

GLOBAL PALETTE (stay close to these)
Neutrals:   #161616 #393939 #6F6F6F #A8A8A8 #E0E0E0 #FFFFFF
IBM blues:  #001D6C #0043CE #0F62FE #4589FF #A6C8FF
Teal:       #004144 #007D79 #08BDBA #9EF0F0
Red/orange: #750E13 #DA1E28 #FF832B #F1C21B
Purple:     #31135E #6929C4 #A56EFF #E8DAFF
Legacy:     #3E2B1F #8D6E4F #C9B48A #EFE3C2   CRT green: #198038 #42BE65

Reply "Style locked" and wait for my next request.
```

---

## 1. Bob (personagem jogável)

> Anexe a **imagem oficial do Bob** na B1. Se a anatomia do Bob for diferente do que os prompts presumem (por exemplo, sem braços), ajuste a linha marcada com ⚙️. Atirar pode ser pela mão, por um pequeno blaster ou pelo próprio corpo.

### B1: Folha de personagem (âncora de estilo) → `art/raw/bob/B1_bob_sheet.png`
```
Using the attached image as the official reference for the character "Bob" (the IBM mascot), create a 16-bit pixel art CHARACTER SHEET of Bob as the hero of an action platformer.
Keep Bob's recognizable shape, proportions and colors from the reference, simplified into pixel art about 32 pixels tall.
⚙️ Bob fires energy shots from his right hand / a small IBM-blue arm blaster.
Show 4 poses in one row, facing right: 1) neutral standing, 2) running mid-stride, 3) jumping, 4) shooting forward.
Heroic, friendly, determined expression.
```

### B2: Parado → `art/raw/bob/B2_idle.png`
```
Same Bob as the approved character sheet. Animation: IDLE, 3 frames in a row.
Frame 1 neutral stance, frame 2 slight breathing (1 pixel down), frame 3 blink. Facing right.
```

### B3: Correndo → `art/raw/bob/B3_run.png`
```
Same Bob. Animation: RUN cycle, 6 frames in a row, facing right, smooth loop.
Frames: 1) right foot contact, 2) down/compress, 3) passing (left leg forward), 4) left foot contact, 5) down/compress, 6) passing (right leg forward).
Leaning slightly forward, energetic. Frame 6 must flow back into frame 1.
```

### B4: Pulo, queda e aterrissagem → `art/raw/bob/B4_jump_fall.png`
```
Same Bob. 5 frames in a row, facing right:
1) TAKEOFF (crouched, about to spring), 2) RISING (body stretched up, knees tucked slightly),
3) APEX (body curling, turning from rise to fall), 4) FALLING (limbs slightly raised, body compressed),
5) LANDING (knees bent absorbing impact).
```

### B5: Atirando (variações) → `art/raw/bob/B5_shoot.png`
```
Same Bob, shooting pose (blaster/hand pointed straight forward at chest height). 7 frames in a row, facing right:
1) standing shoot, 2) jumping shoot, 3) falling shoot, 4-7) running shoot cycle (same legs as the run cycle, upper body in shoot pose).
Do not draw the projectile.
```

### B6: Dash → `art/raw/bob/B6_dash.png`
```
Same Bob. Animation: DASH (fast ground burst), 4 frames in a row, facing right:
1) DASH START (low crouched launch), 2) DASH (low forward-leaning glide, body very low and horizontal),
3) DASH STOP (braking, leaning back, recovering to standing), 4) DASH while SHOOTING (same as frame 2, arm/blaster pointed forward).
Sense of speed through the pose only. No dust (that is a separate effect).
```

### B7: Parede → `art/raw/bob/B7_wall.png`
```
Same Bob. 3 frames in a row, facing right, wall is on the RIGHT side (do not draw the wall):
1) WALL SLIDE (pressed against the wall, one hand/side touching it, sliding down),
2) WALL SLIDE while shooting AWAY from the wall (pointing left),
3) WALL JUMP kick-off (pushing away from the wall up and to the left).
```

### B8: Dano → `art/raw/bob/B8_hurt.png`
```
Same Bob. Animation: HURT / knockback, 2 frames in a row, facing right.
Frame 1 recoiling backwards with a pained expression, frame 2 same pose slightly more recoiled. Body pushed back to the left.
```

### B9: Entrada na fase ("compilando") → `art/raw/bob/B9_compile_in.png`
```
Same Bob. Animation: Bob materializes into the level by being "compiled" from falling blue pixel blocks. 5 frames in a row:
1) a thin column of small IBM-blue square pixels falling, 2) pixels piling into Bob's rough silhouette (low resolution blocky),
3) half-formed Bob made of blocks, 4) Bob almost complete with a few loose pixels, 5) Bob complete, landing pose.
Original effect: blocky digital assembly, not a beam of light.
```

### B10: Vitória / arma ganha → `art/raw/bob/B10_victory.png`
```
Same Bob. 2 frames in a row, facing the viewer at 3/4 angle:
1) VICTORY pose (fist/arm raised confidently), 2) POWER-UP pose (arms out, absorbing energy, eyes closed).
```

### Variações feitas em código (não precisa gerar)

- **Piscar branco/amarelo ao levar dano:** tint/flash no Phaser em cima do B8.
- **Cor por arma equipada:** troca de paleta em código em cima de todos os quadros.
- **Brilho do tiro carregado no corpo:** o aura do FX1 desenhado por cima, mais o tint pulsando.
- **Versões viradas para a esquerda:** espelhamento horizontal.

### Inventário de animações do Bob (referência para o código)

| Animação | Origem | Quadros | Loop | fps sugerido |
|---|---|---|---|---|
| idle | B2 | 3 | sim | 4 |
| run | B3 | 6 | sim | 12 |
| takeoff / rise / apex / fall / land | B4 | 1 cada | não | — (por estado) |
| shoot (stand / jump / fall) | B5 1-3 | 1 cada | não | — |
| run_shoot | B5 4-7 | 4 | sim | 12 (sincronizado com o run) |
| dash_start / dash / dash_stop / dash_shoot | B6 | 1 cada | não | — |
| wall_slide / wall_shoot / wall_kick | B7 | 1 cada | não | — |
| hurt | B8 | 2 | não | 8 |
| compile_in | B9 | 5 | não | 10 |
| victory / power_up | B10 | 1 cada | não | — |
| death (decompile) | FX4 linha 4 | 6 | não | 12 |

### B11: Ícone de vida extra e retrato do HUD → `art/raw/bob/B11_icons.png`
```
Same Bob. 2 small icons in a row, front-facing head only:
1) "extra life" icon of Bob's head, very simple, 2) slightly larger HUD portrait of Bob's head with a determined look.
```

---

## 1b. Armadura Firmware (upgrades do Bob)

São 4 peças escondidas nas fases, cada uma liberada num **Update Terminal**. O visual é inspirado em hardware de servidor (placas de rack, frestas de ventilação, faixas de LED, aletas de dissipador), justamente para **não** lembrar o capacete com gema e as botas/luvas redondas do Mega Man X.

| Peça | Nome | Efeito |
|---|---|---|
| Cabeça | **Debug Visor** | revela paredes quebráveis e passagens escondidas, e mostra a vida dos chefes |
| Braço | **Compiler Cannon** | libera o tiro carregado nível 3 e permite carregar as armas especiais |
| Corpo | **Firewall Plating** | reduz o dano recebido pela metade e diminui o recuo |
| Pernas | **Turbo Boots** | dash no ar (1 por pulo) |

**Como vira animação:** você gera o Bob **completo com a armadura** em todas as animações. Para cada uma, **anexe a imagem base correspondente (B2-B10)** e peça as mesmas poses. Assim os quadros ficam alinhados com os do Bob base. Meu script recorta cada peça por região (cabeça, braço, tronco, pernas) e o jogo empilha só as peças que o jogador já coletou.

### A1: Conceito da armadura → `art/raw/bob_armor/A1_armor_sheet.png`
```
Same Bob as the attached approved character sheet. Design an original modular "Firmware Armor" for him, inspired by server hardware: rack-mount plating with vent slits, thin LED status strips, small heatsink fins and cable ports, in IBM blues, white and neutrals that complement Bob's own colors.
Avoid the look of existing robot heroes: no helmet crest or forehead gem, no bulky round boots or round gauntlets.
In one row, facing right: 1) Bob wearing the FULL armor, standing, 2) Bob wearing full armor, shooting.
On a second row, the 4 parts as separate floating items: HEAD (Debug Visor: a sleek visor/headpiece with a scan lens), ARM (Compiler Cannon: an arm-mounted cannon casing with heatsink fins), BODY (Firewall Plating: chest and shoulder plates with vent slits), LEGS (Turbo Boots: boots with small thruster vents at the heels).
```

### A2: Animações com armadura completa → `art/raw/bob_armor/A2_<nome>.png`

Repita **B2 a B10** com este prefixo, anexando a imagem base de cada uma e salvando com o mesmo nome em `bob_armor/` (ex.: `A2_B3_run.png`):
```
Same Bob, now wearing the FULL Firmware Armor exactly as in the approved armor sheet.
Redraw the attached animation frames with the SAME poses, SAME frame count, SAME cell size and SAME positions - only add the armor on top. Do not change Bob's proportions or the pose silhouettes.
```
Mais 1 animação exclusiva da armadura:
```
Same armored Bob. AIR DASH, 2 frames in a row, facing right: 1) mid-air horizontal launch with heel thrusters firing small blue flames (hard pixels), 2) mid-air glide, body horizontal.
```
→ `art/raw/bob_armor/A2_air_dash.png`

### A3: Update Terminal → `art/raw/bob_armor/A3_update_terminal.png`
```
Original object "Update Terminal": a tall slim server-rack kiosk (about 32x56 pixels in game) in white and IBM blue, with a glass front pod big enough for Bob to step into, a vertical progress bar of blue LED segments on its side, and cable bundles at the base.
6 frames in one row: 1) CLOSED idle (LEDs dim), 2) ACTIVATING (LEDs filling up), 3) OPEN (pod glass slid up, inner light), 4-6) INSTALLING: blue square pixels streaming down inside the pod in 3 frames (leave the inside empty of characters - Bob is drawn separately).
No text.
```

### A4: Ícones das peças → `art/raw/bob_armor/A4_part_icons.png`
```
4 small 16x16 HUD/menu icons in one row, same style as the armor sheet: Debug Visor, Compiler Cannon, Firewall Plating, Turbo Boots. Each also in a greyed-out "not collected" version on a second row.
```

### A5: Tiro do Compiler Cannon → `art/raw/fx/A5_compiler_shot.png`
```
Charged level 3 shot for Bob's Compiler Cannon, in IBM blue and white, facing right, each on its own row:
row 1) a large spiraling double helix of two blue energy streams wrapped around a bright white core, 4 frames,
row 2) its impact burst, 4 frames, with square pixel fragments,
row 3) a stronger charge aura (blue to white, with small brackets "{ }" made of pixels orbiting), 3 frames.
```

---

## 2. Inimigos comuns

Tamanho alvo: 16 a 32 px. Pode pedir **2 inimigos por imagem**, cada um na sua linha, se o ChatGPT mantiver a qualidade.

### E1: Pixel Mite (todas as fases) → `art/raw/enemies/E1_pixel_mite.png`
```
Original enemy "Pixel Mite": a tiny beetle-shaped robot bug made of chunky dark grey plates with a single red glowing pixel eye and six stubby legs. About 16 pixels wide in game.
It crawls along floors and walls. Animation: WALK 2 frames + DESTROYED 1 frame (cracked, sparking), all in one row, facing right.
```

### E2: Spam Drone (todas as fases) → `art/raw/enemies/E2_spam_drone.png`
```
Original enemy "Spam Drone": a small flying envelope-shaped drone with tiny propellers on top, an angry slit visor, colored light grey and red. About 20 pixels wide.
It swoops at the player. Animation: FLY 2 frames (propeller blur alternating) + ATTACK dive 1 frame, in one row, facing right.
```

### E3: Drip (fase Memory Leak) → `art/raw/enemies/E3_drip.png`
```
Original enemy "Drip": a blob of translucent-looking teal goo (use solid teal shades, no transparency effects) with a small metal RAM chip floating inside as its core, two simple eyes.
It hangs from the ceiling, drops down and splats. 4 frames in one row:
1) hanging from ceiling (stretched down), 2) falling (teardrop shape), 3) landed puddle with eyes, 4) crawling puddle.
```

### E4: Heap Crab (fase Memory Leak) → `art/raw/enemies/E4_heap_crab.png`
```
Original enemy "Heap Crab": a crab-like robot whose shell is a messy stack of mismatched memory blocks (teal, grey, blue rectangles), two pincers, short legs. About 28 pixels wide.
It walks sideways and throws a memory block. 3 frames in one row: WALK A, WALK B, THROW (one pincer raised holding a block). Plus the thrown block as a separate tiny 8-pixel object at the end of the row.
```

### E5: Thread Runner (fase Race Condition) → `art/raw/enemies/E5_thread_runner.png`
```
Original enemy "Thread Runner": a single-wheel robot with a sleek orange body, a long trailing cable like a thread behind it, and a stopwatch-like face. About 24 pixels wide.
It speeds along the ground. 3 frames in one row: ROLL A, ROLL B (wheel rotated), BRAKE (leaning back, sparks under the wheel).
```

### E6: Clock Spike (fase Race Condition) → `art/raw/enemies/E6_clock_spike.png`
```
Original enemy "Clock Spike": a wall-mounted turret shaped like a round clock with yellow and red markings; its clock hand is a spike launcher. About 24 pixels.
3 frames in one row: IDLE (hand at 12), CHARGING (hand spinning, face flashing yellow), FIRE (hand pointing forward, recoil). Plus its projectile, a small spinning clock-hand spike, at the end of the row.
```

### E7: Void Eye (fase Null Pointer) → `art/raw/enemies/E7_void_eye.png`
```
Original enemy "Void Eye": a floating black orb with a glitchy purple outline and one big white eye with a mouse-cursor-arrow-shaped pupil. About 20 pixels.
It blinks out and teleports. 4 frames in one row: IDLE, EYE OPEN WIDE (about to shoot), GLITCH OUT (sliced horizontally, offset scanlines), GONE (only a few purple pixels).
```

### E8: Dangling Ref (fase Null Pointer) → `art/raw/enemies/E8_dangling_ref.png`
```
Original enemy "Dangling Ref": a robotic claw hanging from a broken purple chain/cable link that leads nowhere (the top end of the chain fades into broken pixels). About 16 pixels wide, 40 tall.
It swings like a pendulum. 3 frames in one row: swing LEFT, CENTER, swing RIGHT (rotated around the top of the chain).
```

### E9: Legacy Turret (fortaleza) → `art/raw/enemies/E9_legacy_turret.png`
```
Original enemy "Legacy Turret": a bulky beige 1970s-style computer cabinet with a rotating cannon, tape reels on its front, small blinking CRT-green lights. About 32 pixels.
3 frames in one row: IDLE, AIM (cannon raised 30 degrees), FIRE (muzzle flash). Plus its bullet, a small punched-card-shaped projectile, at the end of the row.
```

### E10: Deprecated Bot (fortaleza) → `art/raw/enemies/E10_deprecated_bot.png`
```
Original enemy "Deprecated Bot": an old, patched-up humanoid robot in beige and brown, covered in duct tape and warning stickers (no readable text), holding a big riveted shield in front of it. About 32 pixels tall.
It blocks shots with the shield and lowers it to attack. 4 frames in one row: WALK A, WALK B, SHIELD UP (blocking), SHIELD DOWN SWING (attacking).
```

---

## 3. Chefes

Tamanho alvo: 48 a 64 px de altura (a Tech Debt é bem maior). Cada chefe tem 3 imagens: **folha de conceito**, **animações** e **retrato + arma**.

### Memory Leak

**Fase:** data center inundado, com um lodo de memória que sobe e desce.
**Personalidade:** preguiçoso, ganancioso, nunca devolve nada.
**Padrões:** atira bolhas de lodo que viram poças, afunda no chão e emerge debaixo do Bob, e numa fúria (vida baixa) faz o nível do lodo subir.
**Fraco contra:** Mutex Lock. **Dá ao Bob:** Garbage Collector.

#### BS1a: Conceito → `art/raw/bosses/BS1a_memory_leak_sheet.png`
```
Original boss "Memory Leak": a large hunched robot whose body is a heavy server chassis leaking thick teal goo from every seam. RAM sticks stick out of its back like spines. The goo drips constantly and forms its lower body (no legs, a puddle base). Two big goo-covered arms, glowing teal eyes behind a cracked visor. Lazy, greedy look.
About 56 pixels tall in game. Character sheet: 3 poses in a row facing LEFT (bosses face the player): neutral, attacking, damaged.
Main palette: teal ramp + neutrals.
```

#### BS1b: Animações → `art/raw/bosses/BS1b_memory_leak_anim.png`
```
Same Memory Leak boss, facing LEFT. 8 frames in one row:
1-2) IDLE (goo dripping, body bobbing), 3) SHOOT (arm thrust forward, goo ball forming in the palm),
4-5) SINK (melting down into a puddle), 6) EMERGE (rising out of the puddle, arms up),
7) HURT (recoiling, white flash), 8) DEFEATED (melting apart, RAM sticks falling).
```

#### BS1c: Retrato e projéteis → `art/raw/bosses/BS1c_memory_leak_extras.png`
```
Same Memory Leak boss. In one row:
1) a square 48x48-style PORTRAIT of its head/upper body for a stage select screen, framed with no border,
2) its projectile: a teal goo ball (2 frames, wobbling),
3) a goo puddle on the floor (2 frames, bubbling).
```

### Race Condition

**Fase:** barramento de alta velocidade, com esteiras e plataformas que se movem rápido.
**Personalidade:** impaciente, competitivo, sempre "chegou primeiro".
**Padrões:** dashes cruzando a arena, se divide em dois clones que agem fora de sincronia (só um é real) e arremessa ponteiros de relógio.
**Fraco contra:** Null Pointer. **Dá ao Bob:** Mutex Lock.

#### BS2a: Conceito → `art/raw/bosses/BS2a_race_condition_sheet.png`
```
Original boss "Race Condition": a sleek, aerodynamic speedster robot in red, orange and yellow, with a stopwatch embedded in its chest, two clock-hand blades on its forearms, and exhaust vents on its back. Its silhouette is slightly blurred into a doubled "ghost" of itself (draw a second faint offset outline in a darker shade, still hard pixels).
About 52 pixels tall. Character sheet: 3 poses in a row facing LEFT: neutral ready stance, dashing, damaged.
Main palette: red/orange ramp + neutrals.
```

#### BS2b: Animações → `art/raw/bosses/BS2b_race_condition_anim.png`
```
Same Race Condition boss, facing LEFT. 8 frames in one row:
1-2) IDLE (bouncing impatiently on its toes), 3) DASH START (crouched sprinter pose), 4) DASH (horizontal blur pose),
5) SPLIT (body separating into two overlapping copies), 6) THROW (flinging a clock-hand blade),
7) HURT, 8) DEFEATED (stopwatch shattering, sparks).
```

#### BS2c: Retrato e projéteis → `art/raw/bosses/BS2c_race_condition_extras.png`
```
Same Race Condition boss. In one row:
1) square PORTRAIT of its head/upper body for the stage select screen,
2) its projectile: a spinning clock-hand blade (4 rotation frames),
3) a speed afterimage silhouette of the boss in a single dark-red tone (used as a trail effect).
```

### Null Pointer

**Fase:** vazio digital, com plataformas que somem e reaparecem.
**Personalidade:** misterioso, silencioso, nunca está onde você espera.
**Padrões:** teletransporta para pontos aleatórios, dispara setas de cursor, faz o chão "desaparecer" em alguns blocos e cria cópias falsas de si.
**Fraco contra:** Garbage Collector. **Dá ao Bob:** Null Pointer.

#### BS3a: Conceito → `art/raw/bosses/BS3a_null_pointer_sheet.png`
```
Original boss "Null Pointer": a tall, thin, hollow humanoid robot whose body is an empty black void with a glitching purple and white outline, as if it is not really there. Its head is shaped like a mouse-cursor arrow. Floating detached hands. Small "missing texture" checkerboard patches (purple/black) glitch across its body.
About 60 pixels tall, floats above the ground. Character sheet: 3 poses in a row facing LEFT: neutral floating, casting, damaged.
Main palette: purple ramp + #161616 + white.
```

#### BS3b: Animações → `art/raw/bosses/BS3b_null_pointer_anim.png`
```
Same Null Pointer boss, facing LEFT. 8 frames in one row:
1-2) IDLE (floating, outline flickering), 3) TELEPORT OUT (body sliced into horizontal glitch strips), 4) TELEPORT IN (strips reassembling),
5) SHOOT (cursor-head pointing forward, hands spread), 6) SUMMON (hands raised, purple squares around),
7) HURT, 8) DEFEATED (collapsing into a single blinking pixel).
```

#### BS3c: Retrato e projéteis → `art/raw/bosses/BS3c_null_pointer_extras.png`
```
Same Null Pointer boss. In one row:
1) square PORTRAIT for the stage select screen,
2) its projectile: a white mouse-cursor arrow with a purple outline (2 frames, flickering),
3) a "missing tile" void square, 16x16 style, black with purple checkerboard glitch (2 frames).
```

### Tech Debt (chefe final)

**Fase:** fortaleza legada, cheia de gabinetes antigos, fitas e cabos.
**Personalidade:** gigante, lenta, acumulada ao longo de décadas, "sempre funcionou assim".
**Padrões (2 fases):**
1. Mainframe parede que ocupa a tela: abre gavetas que atiram cartões perfurados, solta inimigos *Deprecated Bot* e tem o núcleo CRT exposto como ponto fraco.
2. Núcleo exposto que voa: carrega um laser de CRT e chama os 3 chefes como "patches" (ataques rápidos de cada um).

**Fraqueza:** qualquer arma. O tiro carregado faz um pouco mais de dano.

#### BS4a: Conceito → `art/raw/bosses/BS4a_tech_debt_sheet.png`
```
Original final boss "Tech Debt": a colossal wall-sized machine built from decades of stacked legacy computer hardware: beige 1970s mainframe cabinets, spinning tape reels, tangled cables, floppy disks, duct-taped patches, warning stickers (no readable text) and blinking CRT-green lights. In its center, a big CRT monitor acts as its face, showing a simple angry green pixel face.
It fills most of a 256x224 game screen (about 160 pixels tall). Draw it front-facing as a single large sprite, plus a second smaller sprite of its exposed CRT core (about 48 pixels) with sparking cables hanging below it, floating.
Main palette: legacy beige/brown ramp + CRT green + neutrals.
```

#### BS4b: Partes animadas (fase 1) → `art/raw/bosses/BS4b_tech_debt_parts.png`
```
Same Tech Debt boss, separate animated PARTS in one row (they will be placed on top of the big sprite in code):
1-2) CRT face: normal angry face / face flashing white when hit,
3-4) a cabinet DRAWER closed / drawer open shooting out,
5-6) a tape reel spinning (2 rotation frames),
7) punched-card projectile (small beige rectangle with holes),
8) cracked/broken version of the CRT face.
```

#### BS4c: Núcleo (fase 2) → `art/raw/bosses/BS4c_tech_debt_core.png`
```
Same Tech Debt exposed CRT core, floating, facing LEFT. 6 frames in one row:
1-2) IDLE floating (cables swaying), 3) LASER CHARGE (screen glowing bright green, still hard pixels), 4) LASER FIRE (screen fully green, recoil),
5) HURT, 6) DEFEATED (screen cracked, static noise pattern, sparks).
Plus at the end of the row: a horizontal green CRT laser beam segment that can be tiled (32 pixels long).
```

---

## 4. Armas e efeitos

Tudo pequeno: 8 a 32 px. Pode juntar vários efeitos numa imagem, **cada um na sua linha**.

### FX1: Tiros do Bob → `art/raw/fx/FX1_buster.png`
```
Projectiles for Bob's default blaster, in IBM blue and white, facing right. Each on its own row:
row 1) small basic shot: a short blue-white energy pellet, 2 frames,
row 2) charged level 1: a medium blue energy bolt with a short tail, 2 frames,
row 3) charged level 2: a large blue-and-white energy wave/bolt, roughly 3x the size of the small shot, 3 frames,
row 4) charge aura around a character silhouette area: blue sparks converging (3 frames, then a stronger white-blue version 3 frames),
row 5) muzzle flash, 2 frames.
Original shapes: think "code/data energy", e.g. bolts with small square pixel particles.
```

### FX2: Armas ganhas → `art/raw/fx/FX2_weapons.png`
```
Three special weapon projectiles for Bob, each on its own row:
row 1) GARBAGE COLLECTOR: a swirling teal vortex orb that pulls small debris pixels into it, 4 frames,
row 2) MUTEX LOCK: a glowing yellow padlock icon projectile (2 frames) and a freeze effect - a yellow lock-shaped crystal shell that encases an enemy-sized area (2 frames),
row 3) NULL POINTER: a purple cursor-arrow bolt with a glitch trail, 3 frames, plus a 2-frame "phase through wall" glitch burst.
```

### FX3: Impacto e explosões → `art/raw/fx/FX3_explosions.png`
```
Impact and explosion effects, each on its own row:
row 1) small hit spark when a shot hits something, 3 frames, white and blue,
row 2) small enemy explosion, 5 frames, orange/yellow/grey smoke with square pixel debris,
row 3) big boss explosion, 6 frames, larger, with flying square debris,
row 4) "shot blocked" deflect spark (shot bouncing off a shield), 3 frames, white/grey.
```

### FX4: Movimento do Bob → `art/raw/fx/FX4_movement.png`
```
Movement effects, each on its own row:
row 1) dash dust burst behind the feet, 4 frames, light grey,
row 2) wall-slide sparks/dust, 3 frames,
row 3) landing dust puff, 3 frames,
row 4) Bob "decompile" death effect: a character-sized blob breaking apart into flying IBM-blue square pixels that scatter and fade, 6 frames. Original look - digital pixel disintegration, NOT expanding ring orbs.
```

### FX5: Itens → `art/raw/fx/FX5_pickups.png`
```
Collectible pickups, each with 2 blinking frames, in one row:
1) small health: a small blue capsule with a white plus sign,
2) large health: a bigger version of the same capsule,
3) small weapon energy: a small yellow battery cell,
4) large weapon energy: a bigger yellow battery cell,
5) extra life: a small floppy disk in IBM blue with Bob's simplified face on its label (no text).
```

---

## 5. Cenários (tiles e fundos)

**Tiles:** grade de **16×16**, peça um *tileset* organizado. **Fundos:** 3 camadas de parallax (longe, meio, perto). A camada longe e a do meio precisam emendar na horizontal (repetição sem costura).

Em todas as fases, peça os tiles assim:
```
16-bit pixel art TILESET for an original platformer, square tiles on a strict 16x16 grid with 1 empty tile of spacing between tiles, flat transparent background, top-down light. Include:
ground top edge, ground fill, left and right edges, inner and outer corners, a one-way thin platform (3 pieces: left, middle, right), a solid wall column, a deadly spike/hazard tile, a background wall tile (darker, non-solid look), 2 decorative props.
Theme: [TEMA DA FASE]. Palette: [PALETA DA FASE].
```
E os fundos assim:
```
16-bit pixel art PARALLAX BACKGROUND for an original platformer, wide horizontal image that tiles seamlessly left-to-right, 256x224 game screen proportions but twice as wide.
Draw 3 separate layers stacked vertically in one image, each on its own band: FAR (sky/distant, low contrast, darkest), MID (structures), NEAR (foreground silhouettes, top-heavy, transparent bottom).
Theme: [TEMA DA FASE]. Palette: [PALETA DA FASE]. Keep it muted so the characters stand out.
```

| ID | Fase | [TEMA DA FASE] | [PALETA DA FASE] | Arquivos |
|---|---|---|---|---|
| T1 | Memory Leak | flooded data center: server racks, cable trays, metal grates, leaking teal goo pipes, puddles of goo, hazard = boiling goo surface | teal ramp + neutrals + a little IBM blue | `art/raw/tiles/T1_memory_leak_tiles.png`, `art/raw/bg/T1_memory_leak_bg.png` |
| T2 | Race Condition | high-speed data bus: circuit-board floors, glowing orange data lanes, conveyor belts (also draw a 2-frame conveyor tile), giant clocks, hazard = electric rail | red/orange ramp + neutrals + yellow | `art/raw/tiles/T2_race_condition_tiles.png`, `art/raw/bg/T2_race_condition_bg.png` |
| T3 | Null Pointer | digital void: floating platforms made of wireframe blocks, broken grid lines, missing-texture checkerboards, hazard = void pit edge; also a 3-frame "disappearing block" tile (solid, flickering, gone) | purple ramp + #161616 + white | `art/raw/tiles/T3_null_pointer_tiles.png`, `art/raw/bg/T3_null_pointer_bg.png` |
| T4 | Tech Debt (fortaleza) | legacy fortress: stacked beige mainframe cabinets, tape reel walls, tangled cables, CRT screens with green static, hazard = exposed sparking wires | legacy beige/brown + CRT green + neutrals | `art/raw/tiles/T4_tech_debt_tiles.png`, `art/raw/bg/T4_tech_debt_bg.png` |

### T5: Objetos comuns → `art/raw/tiles/T5_common.png`
```
Shared level objects, 16x16 grid based, in one row:
1) boss door (32x48, closed, with an IBM-blue frame and a warning stripe) + 2 frames of it opening (sliding up),
2) checkpoint: a small terminal post with a screen, OFF (grey) and ON (glowing blue) states,
3) a moving platform 48x16, metallic with blue lights.
```

---

## 6. UI

Os textos do jogo são renderizados em código com fonte pixel. **Não peça texto ao ChatGPT**, a não ser no logo.

### U1: Logo → `art/raw/ui/U1_logo.png`
```
16-bit pixel art TITLE LOGO for an original game called "MEGABOB". Bold chunky metallic letters in IBM blue (#0F62FE, #4589FF, #A6C8FF) with a dark #161616 outline and a white highlight edge, slight perspective, a small pixel-circuit motif. Exactly the text "MEGABOB", spelled correctly, no other text. Transparent background.
Do not imitate the logo style of any existing game.
```

### U2: Tela de título (fundo) → `art/raw/ui/U2_title_bg.png`
```
16-bit pixel art TITLE SCREEN background, 256x224 proportions: Bob (same character as the reference) standing heroically on a rooftop/ledge, seen from behind at 3/4, looking at a distant corrupted glitching city of server towers under a dark blue sky. Leave the top third empty for the logo. No text.
```

### U3: Seleção de fases (moldura) → `art/raw/ui/U3_stage_select.png`
```
16-bit pixel art STAGE SELECT screen frame, 256x224 proportions: a dark tech panel with 4 empty square portrait slots arranged around a center slot (center slot for Bob's portrait), circuit-line decorations in IBM blue, one "locked" padlock overlay version of a slot shown separately at the side. No text, no characters inside the slots.
```

### U4: HUD → `art/raw/ui/U4_hud.png`
```
16-bit pixel art HUD elements, in one row:
1) a vertical health bar frame (empty, 8 pixels wide, tall, rounded metal ends, IBM blue trim),
2) a single health bar segment (light blue),
3) a weapon energy segment (yellow),
4) 4 small weapon icons 16x16: blue blaster shot, teal vortex, yellow padlock, purple cursor arrow,
5) a pause menu panel background (dark, rounded corners, blue border).
```

---

## Checklist de entrega

Em `art/raw/`, ao final:

- [ ] `bob/`: B1 a B11
- [ ] `bob_armor/`: A1, A2 (B2-B10 + air dash), A3, A4 (e `fx/A5`)
- [ ] `enemies/`: E1 a E10
- [ ] `bosses/`: BS1a-c, BS2a-c, BS3a-c, BS4a-c
- [ ] `fx/`: FX1 a FX5
- [ ] `tiles/` e `bg/`: T1 a T5
- [ ] `ui/`: U1 a U4

**Prioridade, se o tempo apertar:** B1-B8 → FX1, FX3, FX5 → E1, E2 → T1 + BS1 → T2 + BS2 → T3 + BS3 → A1, A3, A4 → A2 (run, jump, shoot, dash, wall primeiro) → T4 + BS4 → UI → o resto.
Enquanto a arte não chega, eu uso placeholders geométricos no mesmo tamanho, e a troca vira só mudar o arquivo.
