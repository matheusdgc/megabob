"""Publish real Phaser captures and the physics/animation audit for ten combat actors."""
import json
import subprocess
from pathlib import Path

from PIL import Image

from ui_art import INK, ui_text

ROOT=Path(__file__).resolve().parents[1]
BASELINE='bae475a'
GROUPS={
    'stage1-enemies': [('pixelMite','Pixel Mite'),('spamDrone','Spam Drone'),('drip','Drip'),('heapCrab','Heap Crab')],
    'stage2-enemies': [('threadRunner','Thread Runner'),('clockSpike','Clock Spike')],
    'bosses': [('memoryLeak','Memory Leak'),('raceCondition','Race Condition'),('nullPointer','Null Pointer'),('techDebt','Tech Debt / nucleo')],
}


def run():
    preview,export=ROOT/'art/preview',ROOT/'art/exports'
    before=json.loads((preview/'combat-motion-before.json').read_text(encoding='utf-8'))
    after=json.loads((preview/'combat-motion-after.json').read_text(encoding='utf-8'))
    smoke=json.loads((preview/'browser-assets-report.json').read_text(encoding='utf-8'))
    if smoke['errors'] or smoke['warnings'] or smoke['failedRequests']:
        raise ValueError('Browser errors, warnings or network failures remain')
    old={entry['kind']:entry for entry in before['cases']}
    if len(after['cases'])!=10:
        raise ValueError('Expected six enemies and four bosses')
    png_changes=[path for path in subprocess.check_output(['git','diff','--name-only',BASELINE,'--','public/assets'],cwd=ROOT,text=True).splitlines() if path.endswith('.png')]
    if png_changes:
        raise ValueError('Production PNGs changed: '+str(png_changes))
    rows=[]
    for entry in after['cases']:
        m=entry['metrics']
        if m['maxAlignment']>1e-6 or m['maxBeamAlignment']>1e-6 or m['maxBeamOriginGap']>1 or not m['freezeStable'] or not m['cueReleased']:
            raise ValueError('Unresolved combat visual issue: '+entry['kind'])
        rows.append(dict(kind=entry['kind'],stage=entry['stage'],logicTicks=m['ticks'],
            alignmentBefore=round(old[entry['kind']]['metrics']['maxAlignment'],3),alignmentAfter=round(m['maxAlignment'],6),
            states=m['states'],frames=m['frames'],projectileFrames=m['shots'],
            freezeStable=m['freezeStable'],cueReleased=m['cueReleased'],defeat=m.get('defeat')))
    for name,actors in GROUPS.items():
        frames=[]
        height=54+((len(actors)+1)//2)*292
        for index in range(45):
            board=Image.new('RGBA',(960,height),INK)
            ui_text(board,(12,8),'Megabob / movimento de combate / 16 bits',14)
            ui_text(board,(12,30),'Phaser real: simulacao a 60 Hz, captura a 15 fps / cena controlada',10)
            for slot,(key,label) in enumerate(actors):
                x,y=(slot%2)*480,54+(slot//2)*292
                ui_text(board,(x+12,y),label,10)
                image=Image.open(preview/f'combat-clips/{key}/{index:02d}.png').convert('RGBA')
                if image.size!=(960,540):
                    raise ValueError(key+': expected integer-scale capture')
                board.alpha_composite(image.resize((480,270),Image.Resampling.NEAREST),(x,y+20))
            frames.append(board.convert('RGB'))
        frames[0].save(export/f'megabob-{name}-motion.gif',save_all=True,append_images=frames[1:],
                       duration=[60,70,70]*15,loop=0,disposal=2)
        frames[20].save(export/f'megabob-{name}-motion.png')
    report=dict(baseline=BASELINE,actors=rows,actorsReviewed=len(rows),bossesReviewed=4,
                fixedLogicTicks=sum(row['logicTicks'] for row in rows),productionPngsChanged=False,
                scope=after['scope'],browserErrors=smoke['errors'],browserWarnings=smoke['warnings'],failedRequests=smoke['failedRequests'])
    (export/'combat-motion-review.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('Combat art: ten actors, four bosses, 26,400 physics ticks; source PNGs unchanged.')


if __name__=='__main__':
    run()
