# Combat animation review (T21)

Scope: phase 1/2 enemies (including the shared Pixel Mite and Spam Drone) and all four bosses. Preserve the 16-bit palette, environment textures, internal resolution, attack patterns and damage.

1. Inspect the real entities at fixed 60 Hz, with enemy/boss logic inside WORLD_STEP, then check the rendered position after Arcade postUpdate. Record animation frames, attack states, projectiles, collisions and cleanup.
2. Fix concrete visual/physics inconsistencies. Add short local pixel feedback where existing attack transitions lack a readable warning or release. Reuse original sprite pixels and existing effects.
3. Recheck normal/fury states and Tech Debt's phase transition, freeze and defeat. Export representative animations/screens and a machine-readable report.
4. Run Python tests, npm test, typecheck, build and the browser checks. Update the handoff and commit only this review's files on dev.

Static inspection/controlled animation fixtures do not prove a full stage traversal. Existing reach tests remain required.

Completed: six enemy types and all four bosses, including normal/fury modes and both Tech Debt phases. The review covers 26,400 fixed physics ticks, plus three-second animation clips. Fixed body transform synchronization, lingering Memory Leak goo, Tech Debt laser arrival/origin and reused projectile animations. New warnings and release cues reuse the existing pixel palette; production PNGs remain unchanged. Artifacts and runtime results: `art/exports/combat-motion-review.json` and the three `megabob-*-motion.gif` galleries.
