import { describe, expect, it } from 'vitest';
import { COMBAT_ART } from '../src/data/tuning';
import { crabArtFrame, warningArtFrame } from '../src/systems/enemyArt';
import { chargeVelocity } from '../src/systems/combatArt';
import { LASER_CHARGE } from '../src/systems/techDebtBoss';
import { PHYSICS_FPS } from '../src/config';

describe('enemy presentation independent of attack timing', () => {
  it('keeps the raised pincer for windup/release, then lowers it during recovery', () => {
    expect(crabArtFrame('windup',100,2)).toBe(2);
    expect(crabArtFrame('recover',0,2)).toBe(2);
    expect(crabArtFrame('recover',COMBAT_ART.recoverArmFrames,2)).toBe(0);
    expect(crabArtFrame('walk',0,1)).toBe(1);
  });
  it('spaces warning pose changes, preserving the original rush/fire frames', () => {
    const ticks=COMBAT_ART.warningFrameTicks;
    for(let i=0;i<ticks;i++){
      expect(warningArtFrame('rev',i,0)).toBe(2);
      expect(warningArtFrame('charge',i,2)).toBe(1);
    }
    expect(warningArtFrame('rev',ticks,0)).toBe(1);
    expect(warningArtFrame('charge',ticks,2)).toBe(0);
    expect(warningArtFrame('rush',ticks,0)).toBe(0);
    expect(warningArtFrame('fire',ticks,2)).toBe(2);
  });
  it('brings the core to the laser origin within both existing charge durations', () => {
    for(const duration of LASER_CHARGE)for(const target of [{x:56,y:194},{x:424,y:218}]){
      const at={x:240,y:110};
      for(let remaining=duration;remaining>0;remaining--){
        const v=chargeVelocity(at,target,remaining);
        at.x+=v.x/PHYSICS_FPS;at.y+=v.y/PHYSICS_FPS;
      }
      expect(at.x).toBeCloseTo(target.x);
      expect(at.y).toBeCloseTo(target.y);
    }
  });
});
