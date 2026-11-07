"""Guard unchanged pixel patterns and publish the third-stage threat-color comparison."""
import hashlib
import io
import json
import subprocess
from pathlib import Path

from PIL import Image

from null_enemy_colors import REMAPS
from palette import PALETTE
from sprites import pixels
from ui_art import INK, ui_text

ROOT = Path(__file__).resolve().parents[1]
BASELINE = '1df2de2'
SPECS = [('enemy_void_eye', 'enemies', 32, 32, 4), ('enemy_dangling_ref', 'enemies', 40, 48, 3), ('null_cursor', 'bosses', 16, 16, 2)]


def original(path):
    return subprocess.check_output(['git', 'show', BASELINE + ':' + path], cwd=ROOT)


def pattern(image):
    ids = {}
    return [ids.setdefault(p, len(ids)) for p in pixels(image)]


def run():
    rows, sheets = [], {}
    for key, group, w, h, count in SPECS:
        path = f'public/assets/{group}/{key}.png'
        old = Image.open(io.BytesIO(original(path))).convert('RGBA')
        new = Image.open(ROOT / path).convert('RGBA')
        if old.size != new.size or new.size != (w * count, h):
            raise ValueError(key + ': frame geometry changed')
        if old.getchannel('A').tobytes() != new.getchannel('A').tobytes() or pattern(old) != pattern(new):
            raise ValueError(key + ': original pixel pattern or alpha changed')
        mapping = REMAPS[key]
        if any(after != ((*mapping.get(before[:3],before[:3]),before[3]) if before[3] else before)
               for before,after in zip(pixels(old),pixels(new))):
            raise ValueError(key + ': configured threat colors were not applied exactly')
        if not {p[:3] for p in pixels(new) if p[3]} <= set(PALETTE):
            raise ValueError(key + ': color outside the established palette')
        rows.append(dict(key=key,frames=count,frame=[w,h],tones=len({p[:3] for p in pixels(new) if p[3]}),
                         changedColorPixels=sum(a!=b for a,b in zip(pixels(old),pixels(new))),patternAndAlphaPreserved=True))
        sheets[key]=(old,new)
    backgrounds=[p.relative_to(ROOT).as_posix() for p in sorted((ROOT/'public/assets/bg').glob('t3_null_pointer_*.png'))]
    backgrounds+=['public/assets/tiles/tiles_null_pointer.png']
    for path in backgrounds:
        if hashlib.sha256(original(path)).digest()!=hashlib.sha256((ROOT/path).read_bytes()).digest():
            raise ValueError(path + ': third-stage scenery was modified')
    runtime=json.loads((ROOT/'art/preview/null-enemy-runtime-review.json').read_text(encoding='utf-8'))
    report=dict(baseline=BASELINE,assets=rows,frames=sum(row['frames'] for row in rows),runtime=runtime,
                sceneryFilesUnchanged=backgrounds,texturePatternsPreserved=True,
                scope='Threat colors and actual enemy animation bindings; shared cursor also belongs to the Null Pointer boss. No gameplay or map changes.')
    export=ROOT/'art/exports'
    (export/'null-enemy-contrast-review.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    canvas=Image.new('RGBA',(960,670),INK)
    ui_text(canvas,(12,8),'Null Pointer / inimigos / contraste em 16 bits',14)
    for column,(mode,label) in enumerate([('before','Antes'),('after','Depois')]):
        ui_text(canvas,(column*480+12,32),label,10)
        image=Image.open(ROOT/('art/preview/browser-null-enemies-'+mode+'.png')).convert('RGBA')
        canvas.alpha_composite(image.resize((480,270),Image.Resampling.NEAREST),(column*480,54))
        for key,y,name in [('enemy_void_eye',366,'Void Eye / 3x'),('enemy_dangling_ref',504,'Dangling Ref / 3x')]:
            ui_text(canvas,(column*480+12,y-22),name,10)
            source=sheets[key][column]
            canvas.alpha_composite(source.resize((source.width*3,source.height*3),Image.Resampling.NEAREST),(column*480+16,y))
    canvas.save(export/'megabob-null-enemy-contrast.png')
    context=json.loads((ROOT/'art/preview/null-context-review.json').read_text(encoding='utf-8'))
    if context['stage']!='nullPointer' or len(context['samples'])!=4:
        raise ValueError('Expected four camera samples from the actual Null Pointer stage')
    gallery=Image.new('RGBA',(960,632),INK)
    ui_text(gallery,(12,8),'Null Pointer / contraste no mapa real / 16 bits',14)
    ui_text(gallery,(12,30),'Inspecao estatica de camera; nao comprova percurso completo.',10)
    labels=['Primeiro Void Eye','Garras sob teto baixo','Olhos entre paredes finas','Ponte de blocos temporarios']
    for index,(sample,label) in enumerate(zip(context['samples'],labels)):
        x,y=(index%2)*480,54+(index//2)*288
        ui_text(gallery,(x+12,y),label,10)
        capture=Image.open(ROOT/('art/preview/browser-null-context-'+sample['name']+'.png')).convert('RGBA')
        if capture.size!=(960,540):
            raise ValueError(sample['name']+': expected integer 2x canvas capture')
        gallery.alpha_composite(capture.resize((480,270),Image.Resampling.NEAREST),(x,y+18))
    gallery.save(export/'megabob-null-enemy-context.png')
    (export/'null-enemy-context-review.json').write_text(json.dumps(context,indent=2)+'\n',encoding='utf-8')
    print('Null contrast: 9 frames, all original patterns/alpha preserved; 7 scenery PNGs unchanged.')
    print('Real Null Pointer map: four static camera samples across three sections.')


if __name__=='__main__':
    run()
