import { describe, expect, it } from 'vitest';
import { JUMP_BUFFER_FRAMES } from '../src/data/tuning';
import { type Action, ActionState } from '../src/systems/actions';

const frame = (s: ActionState, ...held: Action[]) => s.update(new Set(held));

describe('ActionState edges', () => {
  it('reports justPressed only on the first frame held', () => {
    const s = new ActionState();
    frame(s, 'shoot');
    expect(s.justPressed('shoot')).toBe(true);
    expect(s.isDown('shoot')).toBe(true);
    frame(s, 'shoot');
    expect(s.justPressed('shoot')).toBe(false);
    expect(s.isDown('shoot')).toBe(true);
  });

  it('reports justReleased on the frame the action is let go', () => {
    const s = new ActionState();
    frame(s, 'jump');
    frame(s);
    expect(s.justReleased('jump')).toBe(true);
    expect(s.isDown('jump')).toBe(false);
    frame(s);
    expect(s.justReleased('jump')).toBe(false);
  });

  it('horizontal cancels out when both directions are held', () => {
    const s = new ActionState();
    frame(s, 'left');
    expect(s.horizontal).toBe(-1);
    frame(s, 'left', 'right');
    expect(s.horizontal).toBe(0);
    frame(s, 'right');
    expect(s.horizontal).toBe(1);
  });
});

describe('jump buffer', () => {
  it('keeps a jump press alive for JUMP_BUFFER_FRAMES frames', () => {
    const s = new ActionState();
    frame(s, 'jump');
    for (let i = 0; i < JUMP_BUFFER_FRAMES; i++) frame(s);
    expect(s.hasBufferedJump()).toBe(true);
    frame(s);
    expect(s.hasBufferedJump()).toBe(false);
  });

  it('is consumed once, so one press never jumps twice', () => {
    const s = new ActionState();
    frame(s, 'jump');
    expect(s.consumeJump()).toBe(true);
    expect(s.consumeJump()).toBe(false);
    frame(s, 'jump'); // still held: no new press
    expect(s.hasBufferedJump()).toBe(false);
  });

  it('a new press after release re-arms the buffer', () => {
    const s = new ActionState();
    frame(s, 'jump');
    s.consumeJump();
    frame(s);
    frame(s, 'jump');
    expect(s.consumeJump()).toBe(true);
  });
});
