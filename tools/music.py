"""Prepare the soundtrack: art/raw/soundtrack -> public/assets/music.

    py -3 tools/music.py

The selection and the use of each track are in docs/soundtrack.md; the loop points live in
src/data/music.ts. Loudness is evened out in the game itself (src/audio/loudness.ts measures
each track when it loads), so a plain copy already plays at matching volumes.

With ffmpeg on PATH, tracks are re-encoded to OGG Vorbis ~128 kbps (the selection drops from
26 MB to about 14 MB) and loudness-normalised on the way; without it they are copied as they are.
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'raw' / 'soundtrack'
OUT = ROOT / 'public' / 'assets' / 'music'

# game id -> source file (see docs/soundtrack.md)
TRACKS = {
    'title': '01_titulo__8Bit_Title_Screen.mp3',
    'select': '02_selecao_de_fases__Select_Mountain_120BPM.ogg',
    'memory_leak': '03_fase_memory_leak__Sewer_Nightclub.ogg',
    'race_condition': '04_fase_race_condition__Castle_Stage_180BPM.ogg',
    'null_pointer': '05_fase_null_pointer__CYBER_CELESTE.mp3',
    'boss': '06_chefes__8bit_Action_Boss_Battle_145BPM.ogg',
    'fortress': '07_fortaleza__Last_Mission_FULL.mp3',
    'tech_debt_1': '08a_tech_debt_fase1__phantasticbeats-boss-fight-301722.mp3',
    'tech_debt_2': '08b_tech_debt_fase2__Final_Stand_Phase4_FinalMax.ogg',
    'credits': '09_creditos__lightyeartraxx-kim-lightyear-legends-109307.mp3',
}


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    ffmpeg = shutil.which('ffmpeg')
    total = 0
    for key, name in TRACKS.items():
        src = SRC / name
        if not src.exists():
            print(f'missing {src}', file=sys.stderr)
            return 1
        for old in OUT.glob(key + '.*'):
            old.unlink()
        if ffmpeg:
            dst = OUT / f'{key}.ogg'
            subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', str(src), '-af', 'loudnorm=I=-16:TP=-1',
                            '-c:a', 'libvorbis', '-q:a', '4', str(dst)], check=True)
        else:
            dst = OUT / (key + src.suffix.lower())
            shutil.copyfile(src, dst)
        total += dst.stat().st_size
        print(f'{dst.name:24} {dst.stat().st_size / 1e6:5.2f} MB')
    print(f'total {total / 1e6:.1f} MB' + ('' if ffmpeg else ' (copied: install ffmpeg to re-encode)'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
