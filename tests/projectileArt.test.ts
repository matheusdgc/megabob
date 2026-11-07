import { describe, expect, it } from 'vitest';
import { hostileCursorPose } from '../src/systems/projectileArt';

describe('hostile cursor heading', () => {
  it.each([[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]])('points the original left-facing tip along velocity (%s, %s)', (vx,vy) => {
    const pose=hostileCursorPose(vx,vy),base=pose.flipX?1:-1,speed=Math.hypot(vx,vy);
    expect(base*Math.cos(pose.rotation)).toBeCloseTo(vx/speed);
    expect(base*Math.sin(pose.rotation)).toBeCloseTo(vy/speed);
  });
  it('keeps nominally vertical fan shots consistent despite floating point roundoff', () => {
    for(const vy of [-150,150]){
      expect(hostileCursorPose(0,vy).flipX).toBe(false);
      expect(hostileCursorPose(Math.cos(Math.PI/2)*150,vy).flipX).toBe(false);
    }
  });
  it('keeps a stationary preview in the original drawing orientation', () => {
    expect(hostileCursorPose(0,0)).toEqual({flipX:false,rotation:0});
  });
});
