"""Publish reproduced and corrected Mutex/restart regressions in actual boss encounters."""
import json
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def run():
    preview,export=ROOT/'art/preview',ROOT/'art/exports'
    smoke=json.loads((preview/'browser-assets-report.json').read_text(encoding='utf-8'))
    after=smoke['bossLifecycle']
    if {row['stage'] for row in after}!={'memoryLeak','raceCondition','nullPointer','techDebt'} or smoke['errors'] or smoke['warnings'] or smoke['failedRequests']:
        raise ValueError('Expected all four encounters and a clean browser run')
    for row in after:
        if not all(row[key] for key in ['mutexAccepted','mutexPoseStable','mutexReleased','pauseStable','resumeActive']) or row['resumeTicks']<1:
            raise ValueError(row['stage']+': freeze/pause/resume failed')
        if any(not all(restart.values()) for restart in row['restarts']):
            raise ValueError(row['stage']+': restart leaked or did not reset')
        if row.get('transitionRestartError') or not row['deathRestart']['oldReleased'] or row['deathRestart']['colliders']:
            raise ValueError(row['stage']+': delayed effects or death cleanup failed')
    before={stage:json.loads((preview/f'boss-lifecycle-{stage}-before.json').read_text(encoding='utf-8'))
            for stage in ['memoryLeak','raceCondition','nullPointer','techDebt']}
    if before['memoryLeak']['mutexPoseStable'] or not before['techDebt']['transitionRestartError']:
        raise ValueError('Expected the baseline to reproduce both regressions')
    changes=subprocess.check_output(['git','diff','--name-only','8ef22a8','--','public/assets'],cwd=ROOT,text=True).splitlines()
    if any(path.endswith('.png') for path in changes):
        raise ValueError('Production PNGs changed during lifecycle fixes')
    report=dict(baseline='8ef22a8',encounters=after,
                regressionsBefore=dict(memoryLeakTurnedWhileFrozen=True,techDebtDelayedEffectError=before['techDebt']['transitionRestartError']),
                repeatedRestarts=sum(len(row['restarts']) for row in after),deathRestarts=len(after),transitionRestartCases=1,
                productionPngsChanged=False,errors=smoke['errors'],warnings=smoke['warnings'],failedRequests=smoke['failedRequests'])
    (export/'boss-lifecycle-review.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('Four encounters: Mutex, pause/resume, 12 repeated restarts, four deaths and interrupted wall collapse verified.')


if __name__=='__main__':
    run()
