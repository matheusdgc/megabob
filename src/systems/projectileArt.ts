/** The shared hostile cursor is drawn pointing left in both original frames. */
export function hostileCursorPose(vx: number, vy: number): {flipX:boolean;rotation:number} {
  const speed = Math.hypot(vx, vy);
  if (speed === 0) return {flipX:false,rotation:0};
  // Trigonometric fans produce tiny nonzero x values on nominally vertical shots.
  const flipX = vx > Number.EPSILON * speed;
  return {flipX,rotation:Math.atan2(vy,vx)+(flipX?0:Math.PI)};
}
