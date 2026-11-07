"""Bob-only 16-bit ramps: retain the base colors and add intermediate shade steps."""
from functools import lru_cache

from palette import PALETTE, _dist

BOB_PALETTE = list(PALETTE)
for indices in (range(0, 6), range(6, 11), range(19, 23)):
    ramp = [PALETTE[i] for i in indices]
    BOB_PALETTE.extend(tuple(round((a[c] + b[c]) / 2) for c in range(3))
                       for a, b in zip(ramp, ramp[1:]))
BOB_PALETTE = list(dict.fromkeys(BOB_PALETTE))


@lru_cache(maxsize=65536)
def nearest_bob(rgb):
    return min(BOB_PALETTE, key=lambda color: _dist(rgb, color))
