"""Compare current Bob with the exact pre-refinement PNGs from Git, not a mutable backup."""
import hashlib
import io
import json
import subprocess
from pathlib import Path

from PIL import Image

from bob_colors import BOB_PALETTE
from sprites import pixels
from ui_art import ui_text, INK

ROOT = Path(__file__).resolve().parents[1]
BASELINE = '397c487'


def old_image(path):
    raw = subprocess.check_output(['git', 'show', f'{BASELINE}:{path.as_posix()}'], cwd=ROOT)
    return Image.open(io.BytesIO(raw)).convert('RGBA')


def run():
    rows, frames = [], 0
    for path in sorted((ROOT / 'public/assets/bob').glob('*.png')):
        relative = path.relative_to(ROOT)
        old, new = old_image(relative), Image.open(path).convert('RGBA')
        if old.size != new.size or old.getchannel('A').tobytes() != new.getchannel('A').tobytes():
            raise ValueError(f'{path.name}: pose silhouette or layout changed')
        if not {p[:3] for p in pixels(new) if p[3]} <= set(BOB_PALETTE):
            raise ValueError(f'{path.name}: color outside Bob palette')
        frames += new.width // 48
        rows.append(dict(file=path.name, frames=new.width // 48,
                         changedPixels=sum(a != b for a, b in zip(pixels(old), pixels(new)))))
    report_path = ROOT / 'art/exports/bob-refinement-review.json'
    previous = json.loads(report_path.read_text(encoding='utf-8')) if report_path.exists() else {}
    recorded = previous.get('rawPngSha256') or json.loads(
        (ROOT / 'art/preview/bob-refinement-source-hashes.json').read_text(encoding='utf-8'))
    current = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
               for p in (ROOT / 'art/raw').rglob('*.png')}
    if recorded != current:
        raise ValueError('raw PNG source changed')
    canvas = Image.new('RGBA', (960, 540), INK)
    ui_text(canvas, (16, 10), 'BOB / antes e depois / pixel art 16 bits', 14)
    for column, (label, image) in enumerate([
        ('Jogo: antes / 4x', old_image(Path('public/assets/bob/bob_idle.png')).crop((0, 0, 48, 48))),
        ('Jogo: depois / 4x', Image.open(ROOT / 'public/assets/bob/bob_idle.png').crop((0, 0, 48, 48))),
    ]):
        ui_text(canvas, (16 + column * 240, 42), label, 10)
        canvas.alpha_composite(image.resize((192, 192), Image.Resampling.NEAREST), (16 + column * 240, 64))
    before = old_image(Path('public/assets/bob/bob_idle.png')).crop((0, 0, 48, 48)).resize((96, 96), Image.Resampling.NEAREST)
    after = Image.open(ROOT / 'public/assets/ui/title_bob_idle.png').convert('RGBA').crop((0, 0, 96, 96))
    for column, (label, image) in enumerate([('Menu: antes / 2x', before), ('Menu: depois / 2x', after)]):
        ui_text(canvas, (16 + column * 240, 282), label, 10)
        canvas.alpha_composite(image.resize((192, 192), Image.Resampling.NEAREST), (16 + column * 240, 304))
    for row, mask in enumerate([1, 8, 15]):
        suffix = '_a' + str(mask)
        ui_text(canvas, (520, 42 + row * 160), 'a' + str(mask) + ' / antes - depois / 3x', 10)
        for column, image in enumerate([
            old_image(Path('public/assets/bob/bob_idle' + suffix + '.png')),
            Image.open(ROOT / ('public/assets/bob/bob_idle' + suffix + '.png')).convert('RGBA'),
        ]):
            canvas.alpha_composite(image.crop((0, 0, 48, 48)).resize((144, 144), Image.Resampling.NEAREST),
                                   (520 + column * 190, 55 + row * 160))
    canvas.save(ROOT / 'art/exports/megabob-bob-refinement.png')
    report = dict(baseline=BASELINE, strips=len(rows), frames=frames, paletteColors=len(BOB_PALETTE),
                  alphaAndLayoutUnchanged=True, rawPngSourcesUnchanged=True, menuFrame=[96, 96],
                  gameplayFrame=[48, 48], sourceCount=len(current), rawPngSha256=current, entries=rows)
    report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'Bob refinement: {len(rows)} strips / {frames} frames; alpha and raw PNGs unchanged.')


if __name__ == '__main__':
    run()
