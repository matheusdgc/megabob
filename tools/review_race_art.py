"""Verify Race's clone keyline and publish the engine's before/after captures."""
import io
import json
import subprocess
from pathlib import Path

from PIL import Image

from ui_art import INK, ui_text
from sprites import pixels

ROOT = Path(__file__).resolve().parents[1]
BASELINE = '12f4020'


def run():
    path = 'public/assets/bosses/race_afterimage.png'
    old = Image.open(io.BytesIO(subprocess.check_output(['git', 'show', BASELINE + ':' + path], cwd=ROOT))).convert('RGBA')
    new = Image.open(ROOT / path).convert('RGBA')
    if old.size != new.size:
        raise ValueError('clone frame dimensions changed')
    shift_y = old.height - old.getbbox()[3]
    aligned = Image.new('RGBA', old.size)
    aligned.paste(old, (0, shift_y))
    if sum(p[3] > 0 for p in pixels(old)) != sum(p[3] > 0 for p in pixels(aligned)):
        raise ValueError('foot alignment clipped original pixels')
    old = aligned
    if new.getbbox()[3] != new.height:
        raise ValueError('clone artwork does not reach its foot anchor')
    original, added = 0, 0
    for y in range(new.height):
        for x in range(new.width):
            before, after = old.getpixel((x, y)), new.getpixel((x, y))
            if before[3]:
                original += 1
                if before != after:
                    raise ValueError('original clone pixel modified')
            elif after[3]:
                adjacent = any(old.getpixel((xx, yy))[3] for yy in range(max(0, y - 1), min(old.height, y + 2))
                               for xx in range(max(0, x - 1), min(old.width, x + 2)))
                if not adjacent or after != (166, 200, 255, 255):
                    raise ValueError('keyline is not one binary pixel in the existing palette')
                added += 1
            elif after != (0, 0, 0, 0):
                raise ValueError('transparent pixels were not kept clean')
    preview = ROOT / 'art/preview'
    report = json.loads((preview / 'race-art-runtime-report.json').read_text(encoding='utf-8'))
    report['cloneOutline'] = dict(baseline=BASELINE, frame=list(new.size), originalVisiblePixelsPreserved=original,
                                 addedKeylinePixels=added, width=1, color='#A6C8FF', binaryAlpha=True,
                                 footAlignmentShiftY=shift_y,visibleFeetAtFrameBottom=True)
    report['scope'] = 'Actual RaceCondition entity and Arcade physics, 1800 normal + 1800 fury fixed steps; static art captures are not a complete gameplay playthrough.'
    canvas = Image.new('RGBA', (960, 640), INK)
    ui_text(canvas, (12, 8), 'Race Condition / clones / pixel art 16 bits', 14)
    for column, (mode, label) in enumerate([('before', 'Antes'), ('after', 'Depois / contorno de 1 px')]):
        image = Image.open(preview / ('browser-race-clones-' + mode + '.png')).convert('RGBA')
        native = image.resize((480, 270), Image.Resampling.NEAREST)
        ui_text(canvas, (column * 480 + 12, 32), label, 10)
        canvas.alpha_composite(native, (column * 480, 52))
        ui_text(canvas, (column * 480 + 12, 342), 'Clone aguardando / detalhe 3x', 10)
        detail = native.crop((212, 160, 308, 240)).resize((288, 240), Image.Resampling.NEAREST)
        canvas.alpha_composite(detail, (column * 480 + 96, 380))
    canvas.save(ROOT / 'art/exports/megabob-race-clones.png')
    (ROOT / 'art/exports/race-art-review.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'Race keyline: {original} original visible pixels preserved; {added} outline pixels added.')


if __name__ == '__main__':
    run()
