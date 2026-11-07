"""Compare T1 color topology with its textured baseline, then export palette review."""
import io
import json
from pathlib import Path
import subprocess

from PIL import Image, ImageOps
from memory_colors import BACKGROUND, METAL, MEMORY_PALETTE
from sprites import pixels
from ui_art import INK, ui_text

ROOT = Path(__file__).resolve().parents[1]
BASELINE = 'f4eb18a'  # Last committed T1 art before the rejected texture flattening.


def signature(image):
    ids = {}
    return [ids.setdefault(pixel, len(ids)) for pixel in pixels(image)]


def hex_color(rgb):
    return '#' + ''.join(f'{c:02X}' for c in rgb)


def run():
    paths = sorted((ROOT / 'public/assets/bg').glob('t1_memory_leak_*.png'))
    paths.append(ROOT / 'public/assets/tiles/tiles_memory_leak.png')
    entries = []
    for path in paths:
        relative = path.relative_to(ROOT).as_posix()
        original = subprocess.check_output(['git', 'show', BASELINE + ':' + relative], cwd=ROOT)
        old, new = Image.open(io.BytesIO(original)).convert('RGBA'), Image.open(path).convert('RGBA')
        if old.size != new.size or old.getchannel('A').tobytes() != new.getchannel('A').tobytes():
            raise ValueError(relative + ': image geometry changed')
        count = 24 if path.parent.name == 'tiles' else 1
        for i in range(count):
            width = 16 if count == 24 else new.width
            box = (i * width, 0, (i + 1) * width, new.height)
            if signature(old.crop(box)) != signature(new.crop(box)):
                raise ValueError(f'{relative}[{i}]: texture pattern changed')
        colors = {p[:3] for p in pixels(new) if p[3]}
        if not colors <= MEMORY_PALETTE:
            raise ValueError(relative + ': undeclared local color')
        if count == 24:
            if old.crop((256, 0, 272, 16)).tobytes() != new.crop((256, 0, 272, 16)).tobytes():
                raise ValueError('Hazard pixels changed')
        elif new.crop((0, 0, 1, new.height)).tobytes() != new.crop((511, 0, 512, new.height)).tobytes():
            raise ValueError(relative + ': seam mismatch')
        entries.append(dict(file=relative, colors=len(colors), texturePatternPreserved=True, alphaUnchanged=True))
    export = ROOT / 'art/exports'
    report = dict(stage='memoryLeak', textureBaselineCommit=BASELINE,
                  texturePatternPreserved=True, checkedRegions=30, hazardPixelsUnchanged=True,
                  roles=dict(background='blue-grey', metal='warm neutral', hazard='original teal'),
                  palettePolicy='Local T1 color maps; default palette and other stages unchanged.',
                  backgroundMapping={hex_color(a): hex_color(b) for a, b in BACKGROUND.items()},
                  metalMapping={hex_color(a): hex_color(b) for a, b in METAL.items()}, layers=entries)
    (export / 'memory-color-profile.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    comparison = Image.new('RGBA', (960, 580), INK)
    for row, key in enumerate(['entrance', 'shaft']):
        for col, version in enumerate(['before', 'after']):
            capture = ROOT / ('art/preview/memory-contrast-' + version) / (key + '.png')
            image = Image.open(capture).convert('RGBA').resize((480, 270), Image.Resampling.NEAREST)
            x, y = col * 480, row * 290
            label = ('VERSÃO REJEITADA' if col == 0 else 'TEXTURA RESTAURADA') + ' / ' + ('ENTRADA' if row == 0 else 'POÇO')
            ui_text(comparison, (x + 8, y + 4), label, 10)
            comparison.alpha_composite(image, (x, y + 20))
            if row == 0 and col == 1:
                image.save(export / 'megabob-memory-palette.png')
    comparison.save(export / 'megabob-memory-contrast.png')
    ImageOps.grayscale(comparison.convert('RGB')).save(export / 'megabob-memory-contrast-gray.png')
    preview = ROOT / 'art/preview'
    gallery = Image.new('RGBA', (960, 580), INK)
    samples = [('ENTRADA', preview / 'memory-contrast-after/entrance.png'),
               ('CHECKPOINT', preview / 'memory-contrast-after/checkpoint.png'),
               ('LODO: AMOSTRA DE ALTURA', preview / 'memory-contrast-after/rising-goo.png'),
               ('CHEFE: POSE DE INSPEÇÃO', preview / 'browser-boss-memory-leak-right.png')]
    for i, (label, path) in enumerate(samples):
        x, y = i % 2 * 480, i // 2 * 290
        ui_text(gallery, (x + 8, y + 4), label, 10)
        gallery.alpha_composite(Image.open(path).convert('RGBA').resize((480, 270), Image.Resampling.NEAREST), (x, y + 20))
    gallery.save(export / 'megabob-memory-context.png')
    facing = Image.new('RGBA', (960, 290), INK)
    for i, (key, label) in enumerate([('left', 'CHEFE VOLTADO À ESQUERDA'), ('right', 'CHEFE VOLTADO À DIREITA')]):
        ui_text(facing, (i * 480 + 8, 4), label, 10)
        image = Image.open(preview / ('browser-boss-memory-leak-' + key + '.png')).convert('RGBA')
        facing.alpha_composite(image.resize((480, 270), Image.Resampling.NEAREST), (i * 480, 20))
    facing.save(export / 'megabob-memory-leak-facing.png')
    print('7 textures / 30 regions preserve the original texture pattern and alpha; comparisons exported.')


if __name__ == '__main__':
    run()
