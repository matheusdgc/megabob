"""Boss asset inventory and pose contacts; runtime review coverage is recorded separately."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw
from palette import PALETTE
from sprites import pixels
from ui_art import INK, ui_text

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'art/exports'
MAIN = {'boss_memory_leak', 'boss_race_condition', 'boss_null_pointer', 'boss_tech_core'}


def run():
    manifest = json.loads((ROOT / 'public/assets/art-manifest.json').read_text())
    entries, hashes = [], {}
    for entry in manifest:
        if entry['group'] != 'bosses':
            continue
        path = ROOT / 'public' / entry['file']
        hashes[path] = hashlib.sha256(path.read_bytes()).hexdigest()
        source = Image.open(path).convert('RGBA')
        w, h, n = entry['frameWidth'], entry['frameHeight'], entry['frames']
        if source.size != (w * n, h):
            raise ValueError(entry['key'] + ': wrong frame geometry')
        if not set(pixels(source.getchannel('A'))) <= {0, 255}:
            raise ValueError(entry['key'] + ': partial alpha')
        if not {p[:3] for p in pixels(source) if p[3]} <= set(PALETTE):
            raise ValueError(entry['key'] + ': color outside palette')
        bounds = [source.crop((i * w, 0, (i + 1) * w, h)).getbbox() for i in range(n)]
        if any(box is None for box in bounds):
            raise ValueError(entry['key'] + ': empty frame')
        if entry['key'] in MAIN:
            cols = min(4, n)
            image = Image.new('RGBA', (cols * (w * 2 + 8), ((n + cols - 1) // cols) * (h * 2 + 24)), INK)
            for i in range(n):
                x, y = i % cols * (w * 2 + 8), i // cols * (h * 2 + 24)
                ui_text(image, (x + 4, y + 4), entry['key'] + ' / ' + str(i), 9)
                image.alpha_composite(source.crop((i * w, 0, (i + 1) * w, h)).resize((w * 2, h * 2), Image.Resampling.NEAREST), (x + 4, y + 20))
            image.save(OUT / (entry['key'].replace('_', '-') + '-review.png'))
        entries.append(dict(key=entry['key'], frames=n, frameSize=[w, h], bounds=bounds))
    # A 4-fps preview of the implemented idle loop; other bosses remain pose contacts.
    sheet = Image.open(ROOT / 'public/assets/bosses/boss_memory_leak.png').convert('RGBA')
    bob = Image.open(ROOT / 'public/assets/bob/bob_idle.png').convert('RGBA').crop((0, 0, 48, 48))
    frames = []
    for index in [0, 1]:
        frame = Image.new('RGBA', (176, 110), INK)
        frame.alpha_composite(bob, (8, 54))
        frame.alpha_composite(sheet.crop((index * 96, 0, (index + 1) * 96, 80)), (72, 22))
        ImageDraw.Draw(frame).line((0, 102, 175, 102), fill=(168, 168, 168, 255))
        frames.append(frame.resize((352, 220), Image.Resampling.NEAREST).convert('RGB'))
    frames[0].save(OUT / 'megabob-memory-leak-idle.gif', save_all=True, append_images=frames[1:], duration=250, loop=0)
    if any(hashlib.sha256(p.read_bytes()).hexdigest() != digest for p, digest in hashes.items()):
        raise RuntimeError('Boss review changed production PNGs')
    report = dict(sheets=len(entries), frames=sum(e['frames'] for e in entries), binaryAlpha=True,
                  paletteColors=29, emptyFrames=0, productionPngsUnchanged=True,
                  runtimeBossesReviewed=['memoryLeak', 'raceCondition'], pendingRuntimeReview=['nullPointer', 'techDebt'],
                  note='Pose contacts alone are not evidence of implemented attacks.', entries=entries)
    (OUT / 'boss-art-review.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f"{len(entries)} boss assets / {report['frames']} frames checked; 4 pose contacts and Memory Leak idle exported.")


if __name__ == '__main__':
    run()
