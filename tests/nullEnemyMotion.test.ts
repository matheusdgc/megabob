import { describe, expect, it } from 'vitest';
import { DANGLE_LENGTH, DANGLE_PERIOD } from '../src/data/enemies';
import { NULL_ENEMY_ART } from '../src/data/tuning';
import { chainLinks, danglingPose, eyeHover } from '../src/systems/nullEnemyMotion';

describe('articulated Null Pointer enemies', () => {
  it('keeps every cropped claw centered on its collision box throughout the swing', () => {
    const poses = Array.from({ length: DANGLE_PERIOD }, (_, i) => danglingPose(i, 17, 100, 40));
    expect(new Set(poses.map(p => p.frame)).size).toBe(3);
    for (const p of poses) {
      expect(p.spriteX - 20 + p.cropX + p.width / 2).toBe(p.x);
      expect(p.spriteY - 48 + p.cropY + p.height / 2).toBe(p.y);
      expect(Math.hypot(p.x - 100, p.y - 40)).toBeCloseTo(DANGLE_LENGTH, 0);
    }
  });

  it('moves through intermediate pixel positions without snapping between sheet poses', () => {
    const poses = Array.from({ length: DANGLE_PERIOD + 1 }, (_, i) => danglingPose(i, 0, 0, 0));
    expect(new Set(poses.map(p => p.x)).size).toBeGreaterThan(30);
    for (let i = 1; i < poses.length; i++) expect(Math.hypot(poses[i]!.x - poses[i-1]!.x, poses[i]!.y - poses[i-1]!.y)).toBeLessThan(4);
    expect(poses[0]).toEqual(poses[DANGLE_PERIOD]);
  });

  it('anchors the pixel chain to the ceiling and follows the same pendulum tip', () => {
    for (let tick = 0; tick < DANGLE_PERIOD; tick++) {
      const p = danglingPose(tick, 0, 100, 40);
      const links = chainLinks(100, 40, p.x, p.y);
      expect(links[0]).toEqual({x:100,y:40});
      expect(Math.hypot(links.at(-1)!.x-p.x, links.at(-1)!.y-p.y)).toBeLessThan(6);
    }
  });

  it('hovers in integer pixels with no accumulated drift over repeated cycles', () => {
    const height = NULL_ENEMY_ART.hoverHeight;
    const samples = Array.from({length:600}, (_, i) => eyeHover(i, 43));
    expect(Math.min(...samples)).toBe(-height);
    expect(Math.max(...samples)).toBe(height);
    expect(samples.every(Number.isInteger)).toBe(true);
    for(let i=0;i<480;i++)expect(samples[i]).toBe(samples[i+NULL_ENEMY_ART.hoverPeriod]);
  });
});
