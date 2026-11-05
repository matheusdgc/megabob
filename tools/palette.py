"""Global game palette (docs/art-prompts.md) and nearest-color lookup."""

HEX = [
    # neutrals
    "161616", "393939", "6F6F6F", "A8A8A8", "E0E0E0", "FFFFFF",
    # IBM blues
    "001D6C", "0043CE", "0F62FE", "4589FF", "A6C8FF",
    # teal
    "004144", "007D79", "08BDBA", "9EF0F0",
    # red / orange / yellow
    "750E13", "DA1E28", "FF832B", "F1C21B",
    # purple
    "31135E", "6929C4", "A56EFF", "E8DAFF",
    # legacy + CRT green
    "3E2B1F", "8D6E4F", "C9B48A", "EFE3C2", "198038", "42BE65",
]
PALETTE = [tuple(int(h[i : i + 2], 16) for i in (0, 2, 4)) for h in HEX]

_cache: dict[tuple[int, int, int], tuple[int, int, int]] = {}


def _dist(a, b):
    # "redmean" weighted RGB distance: cheap and close to perceptual.
    rm = (a[0] + b[0]) / 2
    dr, dg, db = a[0] - b[0], a[1] - b[1], a[2] - b[2]
    return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db


def nearest(rgb):
    hit = _cache.get(rgb)
    if hit is None:
        hit = min(PALETTE, key=lambda p: _dist(rgb, p))
        _cache[rgb] = hit
    return hit
