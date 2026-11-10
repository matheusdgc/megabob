"""Export three spatially continuous storefront images from one generated scene."""
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'art/marketing/itch-theme'


def run():
    source = OUT / 'source/unified-scene-generated.png'
    logo_source = ROOT / 'art/exports/megabob-logo.png'
    hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
              for p in [source, logo_source]}
    image = Image.open(source).convert('RGB').resize((960, 540), Image.Resampling.NEAREST)
    # Widen the outer towers slightly so both complete characters fit the 960px column.
    # Adjacent strips share source boundaries; every output still uses this same plane.
    master = Image.new('RGB', (960, 540))
    for source_left, source_right, target_left, target_width in [
        (0, 200, 0, 240), (200, 760, 240, 480), (760, 960, 720, 240),
    ]:
        strip = image.crop((source_left, 0, source_right, 540))
        master.paste(strip.resize((target_width, 540), Image.Resampling.NEAREST), (target_left, 0))
    scene = master.resize((1920, 1080), Image.Resampling.NEAREST)
    banner_box = (480, 0, 1440, 320)
    # itch.io's embed wrapper has a 20px top margin after the banner.
    embed_box = (480, 340, 1440, 880)
    banner = scene.crop(banner_box).convert('RGBA')
    logo = Image.open(logo_source).convert('RGBA').resize((500, 84), Image.Resampling.LANCZOS)
    banner.alpha_composite(logo, (204, 92))
    banner = banner.convert('RGB')
    embed = scene.crop(embed_box)
    images = {
        '01-background.png': (scene, 'Background', [0, 0, 1920, 1080]),
        '02-banner.png': (banner, 'Banner', list(banner_box)),
        '03-embed-bg.png': (embed, 'Embed BG', list(embed_box)),
    }
    rows = []
    for name, (asset, role, box) in images.items():
        path = OUT / name
        asset.save(path, optimize=True)
        decoded = Image.open(path).convert('RGB')
        assert decoded.size == asset.size and decoded.tobytes() == asset.tobytes()
        rows.append(dict(file=name, role=role, size=list(asset.size), crop=box,
                         bytes=path.stat().st_size,
                         sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    # Reconstruct the full scene: the only permitted difference is the original logo.
    assembled = scene.copy()
    assembled.paste(banner, banner_box[:2])
    assembled.paste(embed, embed_box[:2])
    expected = scene.convert('RGBA')
    expected.alpha_composite(logo, (684, 92))
    assert assembled.tobytes() == expected.convert('RGB').tobytes()
    assembled.save(OUT / 'composition.png', optimize=True)
    assert hashes == {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                      for p in [source, logo_source]}
    report = dict(generator='Built-in image_gen; deterministic Pillow crops and approved logo',
                  sourceHashes=hashes, canvas=[1920, 1080], pixelScale=2,
                  contentColumnWidth=960, headerHeight=320, embedTopMargin=20,
                  continuity='Exact reconstruction equals the same full scene plus the approved logo',
                  files=rows)
    (OUT / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    archive_path = OUT / 'megabob-itch-tema-integrado.zip'
    with ZipFile(archive_path, 'w', ZIP_DEFLATED) as archive:
        for name in [*images, 'composition.png', 'README.md', 'manifest.json', 'preview.html',
                     'source/unified-scene-generated.png', 'source/unified-scene.prompt.txt']:
            archive.write(OUT / name, name)
    with ZipFile(archive_path) as archive:
        assert archive.testzip() is None
    print('\n'.join(f"{row['role']}: {row['file']} {row['size']}" for row in rows))
    print('Exact scene reconstruction, original hashes and ZIP integrity: passed')


if __name__ == '__main__':
    run()
