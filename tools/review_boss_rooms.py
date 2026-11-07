"""Publish the actual StageScene room captures and verified collision callbacks."""
import json
import subprocess
from pathlib import Path

from PIL import Image

from ui_art import INK, ui_text

ROOT=Path(__file__).resolve().parents[1]
SAMPLES=[('memoryLeak','normal','Memory Leak / sala real'),('raceCondition','fury','Race Condition / furia'),
         ('nullPointer','normal','Null Pointer / sala real'),('nullPointer','fury','Null Pointer / copias'),
         ('techDebt','normal','Tech Debt / parede e minions'),('techDebt','core','Tech Debt / nucleo')]


def run():
    preview,export=ROOT/'art/preview',ROOT/'art/exports'
    smoke=json.loads((preview/'browser-assets-report.json').read_text(encoding='utf-8'))
    rooms=smoke['bossRooms']
    if len(rooms)!=4 or smoke['errors'] or smoke['warnings'] or smoke['failedRequests']:
        raise ValueError('Expected four verified rooms and a clean browser run')
    for room in rooms:
        if not room['projectileHit'] or not room['hazardHit'] or room['maxAlignment']>1e-6 or room['puddleFloorError']>1 or room['maxOpaqueClip']>1e-6:
            raise ValueError('Room collision/geometry verification failed: '+room['stage'])
        end=room['defeat']
        if end['phase']!='dead' or end['healthBar'] or end['liveHazards'] or end['minions'] or not end['stageOver']:
            raise ValueError('Room defeat cleanup failed: '+room['stage'])
    changed=subprocess.check_output(['git','diff','--name-only','2142002','--','public/assets'],cwd=ROOT,text=True).splitlines()
    if any(path.endswith('.png') for path in changed):
        raise ValueError('Production images changed during room inspection')
    canvas=Image.new('RGBA',(960,934),INK)
    ui_text(canvas,(12,8),'Megabob / quatro chefes nas salas reais / 16 bits',14)
    ui_text(canvas,(12,30),'Entrada direta para QA, Bob protegido; nao representa percurso completo.',10)
    for index,(stage,segment,label) in enumerate(SAMPLES):
        x,y=(index%2)*480,54+(index//2)*292
        ui_text(canvas,(x+12,y),label,10)
        image=Image.open(preview/f'boss-rooms/{stage}-{segment}.png').convert('RGBA')
        if image.size!=(960,540):
            raise ValueError('Expected a 2x integer-scale canvas capture')
        canvas.alpha_composite(image.resize((480,270),Image.Resampling.NEAREST),(x,y+20))
    canvas.save(export/'megabob-boss-room-review.png')
    report=dict(baseline='2142002',rooms=rooms,productionPngsChanged=False,
                errors=smoke['errors'],warnings=smoke['warnings'],failedRequests=smoke['failedRequests'],
                scope='Actual StageScene terrain, HUD, damage callbacks and defeat cleanup; direct QA entry, protected Bob, no full traversal.')
    (export/'boss-room-review.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('Four actual boss rooms: player shots, hazard damage, floor contact and defeat cleanup verified.')


if __name__=='__main__':
    run()
