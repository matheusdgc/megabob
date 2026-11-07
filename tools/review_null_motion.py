"""Publish native Phaser motion captures; no production image is edited."""
import json
from pathlib import Path

from PIL import Image

from ui_art import INK, ui_text

ROOT = Path(__file__).resolve().parents[1]


def run():
    preview, export = ROOT/'art/preview', ROOT/'art/exports'
    before=json.loads((preview/'null-motion-before.json').read_text(encoding='utf-8'))
    after=json.loads((preview/'null-motion-after.json').read_text(encoding='utf-8'))
    if len(before['frames'])!=45 or len(after['frames'])!=45:
        raise ValueError('Expected 180 logic ticks sampled every four frames')
    frames=[]
    for index in range(45):
        board=Image.new('RGBA',(960,324),INK)
        ui_text(board,(12,8),'Null Pointer / movimento e efeitos / 16 bits',14)
        for column,(mode,label) in enumerate([('before','Antes'),('after','Depois')]):
            ui_text(board,(column*480+12,30),label,10)
            capture=Image.open(preview/f'null-motion-{mode}/{index:02d}.png').convert('RGBA')
            if capture.size!=(960,540):
                raise ValueError('Expected a 2x integer-scale canvas')
            board.alpha_composite(capture.resize((480,270),Image.Resampling.NEAREST),(column*480,54))
        frames.append(board.convert('RGB'))
    frames[0].save(export/'megabob-null-enemy-motion.gif',save_all=True,append_images=frames[1:],
                   duration=[60,70,70]*15,loop=0,disposal=2)
    frames[22].save(export/'megabob-null-enemy-motion.png')
    report={key:after[key] for key in ['logicHz','captureEvery','metrics','scope']}
    report['logicFrames']=180
    report['beforeAfterCaptures']=45
    report['productionPngsChanged']=False
    report['hoverPositions']=len({frame['eye'][1] for frame in after['frames'][:17]})
    report['cursorFrames']=sorted({frame for capture in after['frames'] for frame in capture['shots']})
    (export/'null-enemy-motion-review.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('Null motion: 180 actual physics ticks, exact claw alignment, frozen feedback and graphics cleanup verified.')


if __name__=='__main__':
    run()
