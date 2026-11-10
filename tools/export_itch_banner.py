"""Compose the approved readable wordmark over the generated 16-bit header plate."""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art/marketing/itch-banner'


def run():
    source=OUT/'source/banner-plate-generated.png'
    logo_path=ROOT/'art/exports/megabob-logo.png'
    hashes={str(path.relative_to(ROOT)):hashlib.sha256(path.read_bytes()).hexdigest() for path in [source,logo_path]}
    plate=Image.open(source).convert('RGB')
    if plate.size!=(2172,724):
        raise ValueError('Unexpected source; recheck the safe crop around both characters')
    crop=(0,80,2172,623)
    master=plate.crop(crop).resize((480,120),Image.Resampling.NEAREST)
    logo=Image.open(logo_path).convert('RGBA')
    entries=[]
    for scale,name in [(1,'megabob-itch-banner.png'),(2,'megabob-itch-banner-2x.png')]:
        canvas=master.resize((960*scale,240*scale),Image.Resampling.NEAREST).convert('RGBA')
        wordmark=logo.resize((540*scale,90*scale),Image.Resampling.LANCZOS)
        canvas.alpha_composite(wordmark,(210*scale,56*scale))
        path=OUT/name
        canvas.convert('RGB').save(path,optimize=True)
        check=Image.open(path)
        if check.size!=(960*scale,240*scale) or check.mode!='RGB':
            raise ValueError('Invalid header export')
        entries.append(dict(file=name,width=check.width,height=check.height,bytes=path.stat().st_size,
                            logoBox=[210*scale,56*scale,750*scale,146*scale]))
    if hashes!={str(path.relative_to(ROOT)):hashlib.sha256(path.read_bytes()).hexdigest() for path in [source,logo_path]}:
        raise ValueError('Original plate or approved logo changed')
    report=dict(generator='Built-in image_gen for the scene plate; approved original logo composited with Pillow',
                sourceHashes=hashes,sourceCrop=crop,pixelMaster=[480,120],files=entries,
                style='16-bit scene; readable smooth logo is the previously approved branding exception')
    (OUT/'manifest.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('\n'.join(f"{row['file']}: {row['width']}x{row['height']}, {row['bytes']//1024} KiB" for row in entries))


if __name__=='__main__':
    run()
