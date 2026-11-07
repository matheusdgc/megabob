import { PHYSICS_FPS } from '../config';

/** Arrive at the committed laser position before its existing warning timer expires. */
export function chargeVelocity(at: {x:number;y:number}, target: {x:number;y:number}, remaining: number) {
  const seconds = Math.max(1, remaining) / PHYSICS_FPS;
  return {x:(target.x-at.x)/seconds,y:(target.y-at.y)/seconds};
}
