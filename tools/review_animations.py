"""Read-only Bob art QA: real looping sequences, pose contacts and source hashes."""
import hashlib
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw

from bob_colors import BOB_PALETTE as PALETTE
from sprites import BOB_ANIMS, pixels
from ui_art import INK, ui_text

ROOT = Path(__file__).resolve().parents[1]
OUT, PREVIEW = ROOT / 'art/exports', ROOT / 'art/preview'
CELL = (112, 128)


def hashes(folder):
    return {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(folder.rglob('*.png'))}


def loops():
    source = (ROOT / 'src/systems/bobPose.ts').read_text(encoding='utf-8')
    source = source.split('export const BOB_LOOPS:', 1)[1]
    result = {name: dict(frames=[int(n) for n in frames.split(',')], fps=int(fps))
              for name, frames, fps in re.findall(
                  r'(\w+):\s*\{\s*frames:\s*\[([\d,\s]+)\],\s*fps:\s*(\d+)\s*\}', source)}
    if set(result) != {'idle', 'run', 'shoot'}:
        raise ValueError('BOB_LOOPS changed; review the QA parser before continuing')
    return result


def strip(anim, mask):
    suffix = '' if mask == 0 else '_a' + str(mask)
    return Image.open(ROOT / ('public/assets/bob/bob_' + anim + suffix + '.png')).convert('RGBA')


def cell(image, frame, position, label):
    x, y = position
    ui_text(image, (x + 8, y + 5), label, 10)
    sprite = frame.resize((96, 96), Image.Resampling.NEAREST)
    image.alpha_composite(sprite, (x + 8, y + 24))
    ImageDraw.Draw(image).line((x + 8, y + 120, x + 103, y + 120), fill=(111, 111, 111, 255))


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    before_raw, before_processed = hashes(ROOT / 'art/raw'), hashes(ROOT / 'public/assets')
    counts = {name: n for name, _, n, _ in BOB_ANIMS} | {'airdash': 2}
    sheets, frame_count = [], 0
    for path in sorted((ROOT / 'public/assets/bob').glob('*.png')):
        image = Image.open(path).convert('RGBA')
        anim = path.stem.removeprefix('bob_').split('_a')[0]
        if image.size != (48 * counts[anim], 48):
            raise ValueError(f'{path.name}: incorrect dimensions')
        if not set(pixels(image.getchannel('A'))) <= {0, 255}:
            raise ValueError(f'{path.name}: partial alpha')
        if not {p[:3] for p in pixels(image) if p[3]} <= set(PALETTE):
            raise ValueError(f'{path.name}: color outside global palette')
        for i in range(counts[anim]):
            if image.crop((i * 48, 0, (i + 1) * 48, 48)).getbbox() is None:
                raise ValueError(f'{path.name}[{i}]: empty frame')
        frame_count += counts[anim]
        sheets.append(path.name)
    palette = Image.new('P', (1, 1))
    flat = [c for rgb in PALETTE for c in rgb]
    palette.putpalette(flat + [0] * (768 - len(flat)))
    animations = loops()
    for anim, definition in animations.items():
        frames = []
        for number in definition['frames']:
            image = Image.new('RGBA', (448, 536), INK)
            ui_text(image, (8, 6), f'{anim} / {definition["fps"]} fps / 16 armaduras / 2x', 10)
            for mask in range(16):
                frame = strip(anim, mask).crop((number * 48, 0, (number + 1) * 48, 48))
                cell(image, frame, (mask % 4 * CELL[0], 24 + mask // 4 * CELL[1]), 'a' + str(mask))
            frames.append(image.convert('RGB').quantize(palette=palette, dither=Image.Dither.NONE))
        # GIF has a 10ms clock: alternate durations to preserve the full cycle length.
        ticks = [round(i * 100 / definition['fps']) for i in range(len(frames) + 1)]
        durations = [(ticks[i + 1] - ticks[i]) * 10 for i in range(len(frames))]
        filename = 'megabob-' + anim + '-review.gif'
        frames[0].save(OUT / filename, save_all=True, append_images=frames[1:],
                       duration=durations, loop=0, optimize=False, disposal=2)
        definition.update(file=filename, gifDurationsMs=durations, cycleMs=sum(durations))
        # Retain every frame for visual review even if a viewer only displays GIF frame zero.
        frames[0].convert('RGB').save(PREVIEW / ('bob_' + anim + '_review.png'))
    poses = [name for name in counts if name not in animations]
    for anim in poses:
        masks = [15] if anim == 'airdash' else [0, 1, 8, 15]
        image = Image.new('RGBA', (counts[anim] * CELL[0], len(masks) * CELL[1] + 24), INK)
        ui_text(image, (8, 6), anim + ' / poses por estado / 2x', 10)
        for row, mask in enumerate(masks):
            source = strip(anim, mask)
            for i in range(counts[anim]):
                cell(image, source.crop((48 * i, 0, 48 * (i + 1), 48)),
                     (i * CELL[0], row * CELL[1] + 24), f'a{mask} / quadro {i}')
        image.save(PREVIEW / ('bob_' + anim + '_pose_review.png'))
    if before_raw != hashes(ROOT / 'art/raw') or before_processed != hashes(ROOT / 'public/assets'):
        raise RuntimeError('Review modified source or production PNGs')
    report = dict(sheets=len(sheets), frames=frame_count, rawPngs=len(before_raw),
                  sourceAndProductionPngsUnchanged=True, binaryAlpha=True, paletteColors=len(PALETTE),
                  emptyFrames=0, scale=2, loops=animations, posesReviewed=poses,
                  loopsSourceSha256=hashlib.sha256((ROOT / 'src/systems/bobPose.ts').read_bytes()).hexdigest(),
                  poseMasks=[0, 1, 8, 15], airDashMask=15,
                  note='Pose sheets are inspected manually, not assigned fictional animation timing.',
                  bobSha256={k: v for k, v in before_processed.items() if '/bob/' in k})
    (OUT / 'bob-animation-review.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'{len(sheets)} strips / {frame_count} frames checked; 3 loop GIFs and {len(poses)} pose contacts; PNGs unchanged.')


if __name__ == '__main__':
    run()
