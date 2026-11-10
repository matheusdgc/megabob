# Prompts finais — fundos do Megabob

Ferramenta: image_gen integrada. As duas gerações originais foram preservadas em `source/`. Os PNGs de upload recebem somente normalização por Pillow em grade 2×, com paleta compartilhada.

## Background horizontal

```text
Use case: stylized-concept. Asset type: a finished website BACKGROUND IMAGE for the official Megabob itch.io game page.
Create one original wide landscape 16:9 composition, at the largest available size. Faithful to richly textured 16-bit console pixel art, a cyberpunk SERVER MEGACITY at night. This is artwork to sit BEHIND a centered web content column, NOT a screenshot, mockup, banner, cover or poster.
COMPOSITION IS CRITICAL: the middle 52 percent of the image width must remain a coherent extremely dark navy atmospheric open space with only subtle faraway server silhouettes and restrained detail. Place the most beautiful detailed architecture in the OUTER LEFT AND RIGHT QUARTERS, reaching from near the top edge down to the bottom edge. The empty center is still part of the city scene, not a black rectangular cutout, no explicit frame or panel. At the far left a close industrial server tower with ribbed steel, ventilation grilles, connected cables, glowing cyan server slots, small conduits and rain-wet metal panels; at the far right a DIFFERENT asymmetrical tall cluster of server buildings with pipes, magenta-purple window strips, a small satellite dish and pixel antenna tips. Distant bridges and smaller buildings subtly connect across the LOWER third. Upper central sky stays dark and quiet. Architectural density and interesting textures remain at the margins so a wide centered game embed can overlay the middle without hiding the best art. No hero foreground, no big centered focal object.
COLOR AND STYLE LOCKS: deep midnight navy #041126 and #081b36, cobalt blue metal, cyan #08bdba/#3ddbd9 highlights, selective electric violet and magenta, a few tiny warm utility lights. Most of the scene is dark, with carefully chosen bright pixel accents confined to side architecture. Keep individual panel textures, tiny patterned grilles, pixel rain streaks, layered silhouettes and material shading. Strong depth separation, far skyline darker and lower contrast. Crisp intentional pixel clusters, stepped contours, limited controlled color ramps, nearest-neighbor pixel-art appearance equivalent to a detailed 640x360 master enlarged in clean pixel steps. No soft airbrush, photographic light, blurry bloom or smooth 3D forms. Do not erase texture to make quiet areas; instead use darker related tones.
Mood: adventurous, charming original retro technology world that matches a blue-and-violet helmeted programmer robot game. Environment only: absolutely NO ROBOTS, NO PEOPLE, NO GAME CHARACTERS, NO LOGOS, NO WORDS OR LETTERS, no HUD, no UI panels, no watermark, no borders. Solid opaque background. Produce ONE full-bleed landscape artwork.
```

## Background vertical

Referência de edição: `source/city-wide-generated.png`.

```text
Create a PORTRAIT 9:16 companion background from this approved Megabob website city artwork. This is an edit/recomposition of the referenced environment, not a new visual style. Tall vertical canvas, largest available portrait size.
Preserve the exact original retro 16-bit pixel-art identity, deep midnight navy palette, textured blue steel, cyan server slots, selective violet/magenta lighting, tiny warm utility lamps, rainy nocturnal atmosphere and original industrial server architecture. Keep sharp stepped pixel clusters and rich small panel/grille textures. No blur, smoothing, photorealism or 3D surfaces.
Rearrange and extend the architecture to form tall asymmetrical server structures along the OUTER LEFT AND RIGHT EDGES for the full height of the portrait. Keep the MIDDLE 50% of the width as a quiet very dark navy open canyon with low-contrast far skyline and atmospheric depth so web page content remains legible over it. Dense architectural interest belongs at the margins, not in the center. Keep a small satellite dish at the right, occasional overhead cables near the corners, slim antenna points and wet metal toward the lower edges. Distant bridges may cross the lower third but remain low contrast. Do not merely crop the landscape center and lose the interesting side buildings: compose the two side structures to be visible in a vertical design.
Environment ONLY: no robots, characters, people, vehicles in foreground, logo, words, letters, symbols resembling text, interface, banner or rectangular content frame. Do not add labels. One full-bleed opaque portrait artwork.
```

## Embed BG

Recorte determinístico do fundo horizontal normalizado: caixa `(480, 0, 1440, 540)`, sem nova geração e sem alterar os originais.
