"""Complete raw-art importer. Usage: py -3 tools/art.py all (or a category).

Originals are read-only. Runtime strips/atlases go to public/assets; review images and
source-integrity/edge reports go to art/preview. Bob's established importer stays separate.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from palette import nearest, PALETTE, _dist
from sprites import frame_ranges, is_magenta, pixels, remove_specks
from art_catalog import EXISTING_FX, REFERENCE_ONLY, catalog
from ui_art import stage_assets, stage_preview, STAGE_SLOTS

ROOT = Path(__file__).resolve().parents[1]
RAW, OUT, PREVIEW = ROOT / 'art/raw', ROOT / 'public/assets', ROOT / 'art/preview'


def clean(image):
    image = image.convert('RGBA')
    result = Image.new('RGBA', image.size)
    result.putdata([(r, g, b, 255) if a >= 128 and not is_magenta(r, g, b)
                    else (0, 0, 0, 0) for r, g, b, a in pixels(image)])
    return result


def quantize(image):
    result = Image.new('RGBA', image.size)
    green = [(25, 128, 56), (66, 190, 101)]
    def color(r, g, b):
        # Generated CRT screens contain tiny green variations near a teal/green boundary.
        # Constrain strongly green hues to the two declared CRT colors to avoid speckling.
        return min(green, key=lambda candidate: _dist((r, g, b), candidate)) if (
            g > 45 and g > r * 1.5 and g > b * 1.5) else nearest((r, g, b))
    result.putdata([(*color(r, g, b), 255) if a >= 128 else (0, 0, 0, 0)
                    for r, g, b, a in pixels(image.convert('RGBA'))])
    return result


def background_quantize(image, stage):
    """Separate distant silhouettes from the sky without amplifying generated grain."""
    ramps = {
        'memory_leak': ['161616', '004144'],
        'race_condition': ['161616', '750E13'],
        'null_pointer': ['161616', '31135E'],
        'tech_debt': ['161616', '3E2B1F'],
    }
    allowed = [tuple(int(color[i:i + 2], 16) for i in (0, 2, 4)) for color in ramps[stage]]
    indexed = image.convert('RGB').quantize(colors=2, dither=Image.Dither.NONE)
    palette = indexed.getpalette()
    # Suppress low-amplitude generated grain before assigning the two distant tones.
    indices = Image.frombytes('L', indexed.size, indexed.tobytes()).filter(ImageFilter.ModeFilter(5))
    mapping = {}
    brightness = lambda color: color[0] * .2126 + color[1] * .7152 + color[2] * .0722
    source_indices = sorted((index for _, index in indexed.getcolors()),
                            key=lambda index: brightness(palette[index * 3:index * 3 + 3]))
    for index, target in zip(source_indices, sorted(allowed, key=brightness)):
        mapping[index] = (*target, 255)
    result = Image.new('RGBA', image.size)
    result.putdata([mapping[index] for index in pixels(indices)])
    return result


def grid_regions(image, columns, rows, mode='grid'):
    """Keep coordinates even when a declared frame is intentionally blank."""
    ys = [(0, image.height)] if rows == 1 else frame_ranges(image.transpose(Image.Transpose.TRANSPOSE), rows)
    if len(ys) != rows:
        raise ValueError(f'expected {rows} rows, found {len(ys)}')
    xs = (frame_ranges(image, columns) if mode == 'runs' else
          [(round(c * image.width / columns), round((c + 1) * image.width / columns))
           for c in range(columns)])
    if len(xs) != columns:
        raise ValueError(f'expected {columns} columns, found {len(xs)}')
    return {(r, c): image.crop((a, y0, b, y1))
            for r, (y0, y1) in enumerate(ys) for c, (a, b) in enumerate(xs)}


def pack(regions, size, fit, empty=(), anchor='center', stretch=False):
    boxes = [region.getbbox() for region in regions]
    for i, box in enumerate(boxes):
        if box is None and i not in empty:
            raise ValueError(f'unexpected empty frame {i}')
        if box is not None and i in empty:
            raise ValueError(f'expected empty frame {i} contains artwork')
    crops = [region.crop(box) if box else None for region, box in zip(regions, boxes)]
    occupied = [crop for crop in crops if crop is not None]
    scale = min(fit[0] / max(c.width for c in occupied),
                fit[1] / max(c.height for c in occupied)) if occupied else 1
    sheet = Image.new('RGBA', (size[0] * len(regions), size[1]))
    for i, crop in enumerate(crops):
        if crop is None:
            continue
        target = size if stretch else (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
        small = quantize(crop.resize(target, Image.Resampling.NEAREST))
        if small.width > size[0] or small.height > size[1]:
            raise ValueError(f'frame {i} would be clipped: {small.size} into {size}')
        x = (size[0] - small.width) // 2
        y = 0 if anchor == 'top' else size[1] - small.height if anchor == 'bottom' else (size[1] - small.height) // 2
        sheet.alpha_composite(small, (i * size[0] + x, y))
    return sheet


def periodic(image, border=8):
    """Close both horizontal edges in premultiplied color, then restore binary alpha/palette."""
    result = image.convert('RGBA').copy()
    original = result.copy()
    border = min(border, result.width // 2)
    for x in range(border):
        weight = (border - x) / (2 * border)
        for y in range(result.height):
            left, right = original.getpixel((x, y)), original.getpixel((result.width - 1 - x, y))
            for destination, a, b in [(x, left, right), (result.width - 1 - x, right, left)]:
                alpha = a[3] * (1 - weight) + b[3] * weight
                rgb = tuple(round((a[c] * a[3] * (1 - weight) + b[c] * b[3] * weight) / alpha)
                            for c in range(3)) if alpha else (0, 0, 0)
                result.putpixel((destination, y), (*rgb, round(alpha)))
    return quantize(result)


def edge_mismatch(image):
    return sum(image.getpixel((0, y)) != image.getpixel((image.width - 1, y))
               for y in range(image.height))


def save_asset(image, group, key, size, source, **details):
    directory = OUT / group
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / (key + '.png')
    image.save(path)
    count = image.width // size[0]
    frames = {f'{key}_{i}': dict(frame=dict(x=i * size[0], y=0, w=size[0], h=size[1]),
              rotated=False, trimmed=False, spriteSourceSize=dict(x=0, y=0, w=size[0], h=size[1]),
              sourceSize=dict(w=size[0], h=size[1])) for i in range(count)}
    metadata = dict(frames=frames, meta=dict(image=path.name, size=dict(w=image.width, h=image.height), scale='1'))
    path.with_suffix('.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    return dict(key=key, group=group, file=path.relative_to(ROOT / 'public').as_posix(),
                frameWidth=size[0], frameHeight=size[1], frames=count, source=source, **details)


def preview(entries, group):
    """Labeled contact sheet at integer zoom; these are review aids, not runtime art."""
    rows = []
    for entry in entries:
        image = Image.open(ROOT / 'public' / entry['file']).convert('RGBA')
        zoom = max(1, min(4, 1024 // image.width, 200 // image.height))
        image = image.resize((image.width * zoom, image.height * zoom), Image.Resampling.NEAREST)
        row = Image.new('RGBA', (max(640, image.width + 16), image.height + 30), (34, 34, 42, 255))
        ImageDraw.Draw(row).text((8, 5), entry['key'], fill='white')
        row.alpha_composite(image, (8, 22))
        rows.append(row)
    if rows:
        sheet = Image.new('RGBA', (max(r.width for r in rows), sum(r.height for r in rows)), (34, 34, 42, 255))
        y = 0
        for row in rows:
            sheet.alpha_composite(row, (0, y))
            y += row.height
        sheet.save(PREVIEW / (group + '_contact.png'))


def backgrounds():
    entries = []
    for source in sorted((RAW / 'bg').glob('T*_bg.png')):
        image = clean(Image.open(source))
        # The first band defines shared horizontal margins; retain MID/NEAR negative space.
        far_box = image.crop((0, 0, image.width, image.height // 3)).getbbox()
        if not far_box:
            raise ValueError(f'{source.name}: empty FAR layer')
        layers = []
        for i, name in enumerate(['far', 'mid', 'near']):
            region = image.crop((far_box[0], round(i * image.height / 3), far_box[2],
                                 round((i + 1) * image.height / 3)))
            if i == 0:
                region = region.crop(region.getbbox())
            resized = region.resize((512, 224), Image.Resampling.NEAREST)
            stage = source.stem[3:-3]
            resized = background_quantize(resized, stage) if i == 0 else quantize(resized)
            before = edge_mismatch(resized)
            layer = periodic(resized)
            if edge_mismatch(layer):
                raise ValueError(f'{source.name}/{name}: periodic edge did not close')
            key = source.stem[:-3].lower() + '_' + name
            entries.append(save_asset(layer, 'bg', key, (512, 224), source.relative_to(RAW).as_posix(),
                                      edgeMismatchBefore=before, edgeMismatchAfter=0))
            layers.append(layer)
        repeat = Image.new('RGBA', (1024, 672), (25, 25, 34, 255))
        for i, layer in enumerate(layers):
            repeat.alpha_composite(layer, (0, i * 224))
            repeat.alpha_composite(layer, (512, i * 224))
        repeat.save(PREVIEW / (source.stem + '_repeat.png'))
    return entries


def hashes():
    return {path.relative_to(RAW).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in sorted(RAW.rglob('*.png'))}


def night_logo(image):
    """A one-pixel light keyline keeps the striped wordmark readable over navy skies."""
    # The declared palette starts with six neutrals and five IBM blues. Avoid magenta
    # background fringe mapping to purple in this blue-only logo variant.
    allowed = PALETTE[:11]
    colors = {rgb: min(allowed, key=lambda color: _dist(rgb, color))
              for rgb in {pixel[:3] for pixel in pixels(image) if pixel[3]}}
    result = image.copy()
    result.putdata([(*colors[(r, g, b)], 255) if a else (0, 0, 0, 0)
                    for r, g, b, a in pixels(image)])
    remove_specks(result, 2)
    outline = Image.new('RGBA', result.size, (166, 200, 255, 255))
    outline.putalpha(result.getchannel('A').filter(ImageFilter.MaxFilter(3)))
    outline.alpha_composite(result)
    return outline


def title_preview():
    """Art-only layout at the approved 480x270 viewport; menu text stays in game code."""
    exports = ROOT / 'art/exports'
    exports.mkdir(parents=True, exist_ok=True)
    image = Image.open(OUT / 'ui/title_background_wide.png').convert('RGBA')
    logo = Image.open(OUT / 'ui/title_logo_night.png').convert('RGBA')
    image.alpha_composite(logo.resize((448, 96), Image.Resampling.NEAREST), (16, 8))
    image.save(exports / 'megabob-title-preview.png')
    image.resize((960, 540), Image.Resampling.NEAREST).save(PREVIEW / 'title_wide_2x.png')
    prompt = RAW / 'ui/U2_title_bg_wide.prompt.txt'
    if prompt.exists():
        (exports / 'megabob-title-wide.prompt.txt').write_text(prompt.read_text(encoding='utf-8'), encoding='utf-8')


def register(entries):
    """Generated TS has no Python/runtime dependency and uses the existing Boot loader."""
    declarations = []
    for entry in sorted(entries, key=lambda e: e['key']):
        if entry['key'] in EXISTING_FX | {'tiles_test'}:
            continue
        data = {k: entry[k] for k in ['key', 'frameWidth', 'frameHeight', 'frames', 'file']}
        data['placeholder'] = dict(color=0x6f6f6f, shape='fx')
        declarations.append('  ' + json.dumps(data, separators=(',', ':')) + ',')
    text = ('// Generated by tools/art.py; sources: tools/art_catalog.py; UI composition: tools/ui_art.py.\n'
            "import type { SheetDef } from './assets';\n\nexport const PROCESSED_ART: SheetDef[] = [\n"
            + '\n'.join(declarations) + '\n];\n')
    (ROOT / 'src/data/processedArt.ts').write_text(text, encoding='utf-8')


def run(group='all'):
    groups = {'fx', 'enemies', 'bosses', 'icons', 'tiles', 'bg', 'ui'}
    if group not in groups | {'all'}:
        raise ValueError(f'unknown category {group}')
    PREVIEW.mkdir(parents=True, exist_ok=True)
    before = hashes()
    path = OUT / 'art-manifest.json'
    previous = json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
    selected = groups if group == 'all' else {group}
    entries = [e for e in previous if e['group'] not in selected]
    cache, grids = {}, {}
    for item in catalog():
        if item['group'] not in selected:
            continue
        source = item['source']
        if source not in cache:
            image = Image.open(RAW / source).convert('RGBA')
            cache[source] = image if item.get('opaque') else clean(image)
        image = cache[source]
        if item['key'] == 'title_logo':
            exports = ROOT / 'art/exports'
            exports.mkdir(parents=True, exist_ok=True)
            image.crop(image.getbbox()).save(exports / 'megabob-logo.png')
            prompt = (RAW / source).with_suffix('.prompt.txt')
            if prompt.exists():
                (exports / 'megabob-logo.prompt.txt').write_text(prompt.read_text(encoding='utf-8'), encoding='utf-8')
        if item.get('rects'):
            regions = [image.crop(tuple(round(v * (image.width if i % 2 == 0 else image.height))
                                        for i, v in enumerate(rect))) for rect in item['rects']]
        else:
            grid_key = (source, item['cols'], item['rows'], item.get('mode', 'grid'))
            if grid_key not in grids:
                grids[grid_key] = grid_regions(image, item['cols'], item['rows'], item.get('mode', 'grid'))
            regions = [grids[grid_key][position] for position in item['selection']]
        result = pack(regions, item['size'], item['fit'], item.get('empty', ()),
                      item.get('anchor', 'center'), item.get('stretch', False))
        if item['key'] == 'title_logo_night':
            result = night_logo(result)
        if item['key'] == 'tech_laser':
            result = periodic(result, 2)
        entry = save_asset(result, item['group'], item['key'], item['size'], source,
                           emptyFrames=list(item.get('empty', ())), sourceCells=item['selection'])
        entries.append(entry)
        print(f"{entry['key']}: {entry['frames']} x {entry['frameWidth']}x{entry['frameHeight']}", flush=True)
    if 'bg' in selected:
        entries.extend(backgrounds())
    if 'ui' in selected:
        derived = stage_assets(Image.open(OUT / 'ui/stage_select.png'), Image.open(OUT / 'ui/stage_locked.png'))
        for key, image in derived.items():
            entries.append(save_asset(image, 'ui', key, image.size, 'ui/U3_stage_select.png'))
        portraits = {name: Image.open(OUT / path) for name, path in {
            'memoryLeak': 'bosses/portrait_memory_leak.png', 'raceCondition': 'bosses/portrait_race_condition.png',
            'bob': 'icons/bob_portrait.png', 'nullPointer': 'bosses/portrait_null_pointer.png',
            'techDebt': 'bosses/tech_debt_core_portrait.png',
        }.items()}
        exports = ROOT / 'art/exports'
        exports.mkdir(parents=True, exist_ok=True)
        for unlocked, name in [(False, 'locked'), (True, 'unlocked')]:
            image = stage_preview(derived, portraits, unlocked)
            image.save(exports / ('megabob-stage-select-' + name + '.png'))
            image.resize((960, 540), Image.Resampling.NEAREST).save(PREVIEW / ('stage_select_' + name + '_2x.png'))
        layout = dict(viewport=[480, 270], slotSize=64, portraitMaxSize=48, focusSize=72,
                      centers={name: list(center) for name, center in STAGE_SLOTS.items()})
        (exports / 'stage-select-layout.json').write_text(json.dumps(layout, indent=2) + '\n', encoding='utf-8')
    if before != hashes():
        raise RuntimeError('raw source hashes changed during import')
    path.write_text(json.dumps(entries, indent=2) + '\n', encoding='utf-8')
    register(entries)
    for category in selected:
        preview([e for e in entries if e['group'] == category], category)
    if 'ui' in selected:
        title_preview()
    legacy = [f'bob/{name}.png' for name in ['B2_idle', 'B3_run', 'B4_jump_fall', 'B5_shoot',
              'B6_dash', 'B7_wall', 'B8_hurt', 'B9_compile_in', 'B10_victory']]
    legacy += ['bob_armor/A2_' + Path(name).name for name in legacy] + ['bob_armor/A2_air_dash.png']
    covered = {e['source'] for e in entries} | set(REFERENCE_ONLY) | set(legacy)
    report = dict(rawFiles=len(before), outputs=len(entries), originalsUnchanged=True,
                  rawHashes=before, referenceOnly=REFERENCE_ONLY, legacyBobSources=legacy,
                  unhandledSources=sorted(set(before) - covered), entries=entries)
    (PREVIEW / 'art_report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f"Finished: {len(entries)} strips/images; {len(before)} raw sources unchanged.")


if __name__ == '__main__':
    run(sys.argv[1] if len(sys.argv) == 2 else 'all')
