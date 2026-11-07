"""Export the generated storefront art on a crisp shared pixel grid, without touching game assets."""
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art/marketing/itch-background'


def run():
    wide_source=OUT/'source/city-wide-generated.png'
    tall_source=OUT/'source/city-portrait-generated.png'
    source_hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [wide_source,tall_source]}
    wide=Image.open(wide_source).convert('RGB').resize((960,540),Image.Resampling.NEAREST)
    tall=Image.open(tall_source).convert('RGB').resize((540,960),Image.Resampling.NEAREST)
    # Both images contribute to one color table; no dithering or soft interpolation.
    samples=Image.new('RGB',(1264,540))
    samples.paste(wide,(0,0))
    samples.paste(tall.resize((304,540),Image.Resampling.NEAREST),(960,0))
    palette=samples.quantize(colors=250,method=Image.Quantize.MEDIANCUT)
    # Small amber lamps must survive the large dark-blue sky's statistical weight.
    warm=[(255,131,43),(241,194,27),(255,222,125),(255,241,199),(166,95,22),(94,57,25)]
    palette.putpalette(palette.getpalette()[:750]+[channel for color in warm for channel in color])
    wide=wide.quantize(palette=palette,dither=Image.Dither.NONE)
    tall=tall.quantize(palette=palette,dither=Image.Dither.NONE)
    full=wide.resize((1920,1080),Image.Resampling.NEAREST)
    portrait=tall.resize((1080,1920),Image.Resampling.NEAREST)
    embed=full.crop((480,0,1440,540))
    images={
        'megabob-itch-background-wide.png':(full,'Background / fundo externo recomendado'),
        'megabob-itch-embed-bg.png':(embed,'Embed BG / antes de iniciar o jogo'),
        'megabob-itch-background-portrait.png':(portrait,'Background / alternativa vertical'),
    }
    rows=[]
    for name,(image,role) in images.items():
        path=OUT/name
        image.save(path,optimize=True)
        check=Image.open(path)
        if check.size!=image.size or check.mode!='P' or len(check.getcolors() or [])>256:
            raise ValueError(name+': invalid export')
        # Exact two-pixel blocks in both axes; do not soften the generated pixel art.
        recovered=check.resize((check.width//2,check.height//2),Image.Resampling.NEAREST).resize(check.size,Image.Resampling.NEAREST)
        if check.tobytes()!=recovered.tobytes():
            raise ValueError(name+': pixel grid lost')
        rows.append(dict(file=name,role=role,width=check.width,height=check.height,bytes=path.stat().st_size,
                         colors=len(check.getcolors()),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    if source_hashes!={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [wide_source,tall_source]}:
        raise ValueError('Generated originals were changed')
    report=dict(generator='Built-in image_gen',page='https://matheusdgc.itch.io/megabob',
                style='Original 16-bit cyberpunk server city',pixelScale=2,sharedPaletteColors=256,
                sourceHashes=source_hashes,files=rows,embedCrop=[480,0,1440,540],
                note='Embed BG is a quiet center crop, not a second architectural frame; portrait is an external-background alternative.')
    (OUT/'manifest.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    with ZipFile(OUT/'megabob-itch-backgrounds.zip','w',ZIP_DEFLATED) as archive:
        sources=[path.relative_to(OUT).as_posix() for path in sorted((OUT/'source').iterdir()) if path.is_file()]
        for name in [*images,'README.md','PROMPTS.md','manifest.json','preview.html',*sources]:
            archive.write(OUT/name,name)
    with ZipFile(OUT/'megabob-itch-backgrounds.zip') as archive:
        if archive.testzip():
            raise ValueError('Invalid art archive')
    print('\n'.join(f"{row['file']}: {row['width']}x{row['height']}, {row['bytes']//1024} KiB" for row in rows))


if __name__=='__main__':
    run()
