"""Publish the cursor heading regression from the actual three hostile emitters."""
import json
import subprocess
from pathlib import Path

from PIL import Image

from ui_art import INK, ui_text

ROOT=Path(__file__).resolve().parents[1]


def run():
    preview,export=ROOT/'art/preview',ROOT/'art/exports'
    before=json.loads((preview/'cursor-directions-before.json').read_text(encoding='utf-8'))
    after=json.loads((preview/'cursor-directions-after.json').read_text(encoding='utf-8'))
    smoke=json.loads((preview/'browser-assets-report.json').read_text(encoding='utf-8'))
    if smoke['errors'] or smoke['warnings'] or smoke['failedRequests'] or len(after['rows'])!=24:
        raise ValueError('Expected 24 clean production-emitter samples')
    if max(row['headingErrorDegrees'] for row in before['rows'] if row['emitter']=='voidEye')<179:
        raise ValueError('The baseline must reproduce the backward Void Eye cursor')
    for old,new in zip(before['rows'],after['rows']):
        if new['headingErrorDegrees']>1e-5 or new['body']!=old['body'] or new['velocity']!=old['velocity'] or new['frames']!=[0,1]:
            raise ValueError('Heading, collision, velocity or frame regression: '+str(new))
    changes=subprocess.check_output(['git','diff','--name-only','aaa47a1','--','public/assets'],cwd=ROOT,text=True).splitlines()
    if any(path.endswith('.png') for path in changes):
        raise ValueError('Production PNGs changed')
    canvas=Image.new('RGBA',(960,384),INK)
    ui_text(canvas,(12,8),'Megabob / cursores hostis / oito direcoes / 16 bits',14)
    labels=['D','DB','B','EB','E','EC','C','DC']
    for column,(mode,name) in enumerate([('before','Antes'),('after','Depois')]):
        x=column*480
        ui_text(canvas,(x+12,30),name,10)
        image=Image.open(preview/f'browser-cursor-directions-{mode}.png').convert('RGBA')
        if image.size!=(960,540):
            raise ValueError('Expected a 2x integer-scale canvas')
        canvas.alpha_composite(image.resize((480,270),Image.Resampling.NEAREST),(x,56))
        for index,label in enumerate(labels):
            ui_text(canvas,(x+38+index*56,72),label,9)
        for row,label in enumerate(['Void Eye','Null Pointer','Tech Debt']):
            ui_text(canvas,(x+12,56+48+row*72),label,10)
    ui_text(canvas,(12,338),'Marcadores cinza indicam o sentido real do movimento.',10)
    ui_text(canvas,(12,358),'Velocidade, dano, corpos, quadros e PNGs preservados.',10)
    canvas.save(export/'megabob-cursor-direction-review.png')
    report=dict(baseline='aaa47a1',sourceFaces='left',samples=24,
                maxErrorBefore={emitter:max(row['headingErrorDegrees'] for row in before['rows'] if row['emitter']==emitter)
                                for emitter in ['voidEye','nullPointer','techDebt']},
                maxErrorAfter=max(row['headingErrorDegrees'] for row in after['rows']),rows=after['rows'],
                productionPngsChanged=False,errors=smoke['errors'],warnings=smoke['warnings'],failedRequests=smoke['failedRequests'])
    (export/'cursor-direction-review.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('Three hostile emitters x eight headings: arrow tips match velocity; bodies, speeds and PNGs unchanged.')


if __name__=='__main__':
    run()
