"""
Sprite pipeline: art/raw/** (ChatGPT output) -> public/assets/** (game-ready strips).

    python tools/sprites.py bob

For each Bob animation:
  1. background removal (real alpha, or approximate magenta chroma key)
  2. frame detection by empty-column gaps (merged/split to the expected count)
  3. per-sheet scale from the helmet brim width (the one part that never deforms), so every
     animation ends up the same size even though each raw sheet was drawn at its own scale
  4. box downscale, alpha threshold, palette quantization, magenta despill, speck removal
  5. placement in a 48x48 cell: helmet centered horizontally, feet on the bottom row
  6. armor sheets fitted onto the base frames (shared scale + per-frame offset that maximize
     silhouette overlap), then all 15 part combinations are pre-composed by replacing the
     base's head / arm / body / legs regions with the armored drawing

Outputs:
  public/assets/bob/bob_<anim>.png              base Bob
  public/assets/bob/bob_<anim>_a<N>.png         armor combination N (bitmask head=1 arm=2
                                                body=4 legs=8; a15 = full armor drawing)
  art/preview/bob_<anim>.png                    4x contact sheet for review
  art/preview/bob_report.json                   scales, offsets, overlap scores, warnings
"""

from __future__ import annotations

import json
import os
import statistics
import sys
from collections import deque

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from palette import nearest  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "art", "raw")
OUT = os.path.join(ROOT, "public", "assets")
PREVIEW = os.path.join(ROOT, "art", "preview")

CELL = 48
# Bob standing (B2 idle frame 0) is scaled to this height; every other sheet matches its helmet.
TARGET_STAND_HEIGHT = 36
PARTS = ("head", "arm", "body", "legs")

# anim name, raw base file (art/raw/bob/<name>.png), expected frames, options
#   scale_from: frame index whose helmet sets the sheet scale (default: median of all frames)
#   anchor:     "helmet" (helmet center -> cell center) or "bbox" (content center)
#   baseline:   "feet" (each frame's bottom on the floor) or "sheet" (keep the raw vertical
#               layout, the sheet's lowest pixel on the floor; for effects like compile-in)
BOB_ANIMS = [
    ("idle", "B2_idle", 3, {}),
    ("run", "B3_run", 6, {}),
    ("jump", "B4_jump_fall", 5, {}),
    ("shoot", "B5_shoot", 7, {}),
    ("dash", "B6_dash", 4, {}),
    ("wall", "B7_wall", 3, {}),
    ("hurt", "B8_hurt", 2, {}),
    ("compile", "B9_compile_in", 5, {"scale_from": 4, "anchor": "bbox", "baseline": "sheet"}),
    ("victory", "B10_victory", 2, {}),
]
# armor-only sheets (saved as the full-armor combo a15): (name, raw, frames, anim whose fit sets size)
ARMOR_ONLY = [("airdash", "A2_air_dash", 2, "dash")]

# armor fit search: scale multipliers over the height-matched estimate, per-frame offset range
ARMOR_SCALE_STEPS = [0.86 + 0.02 * i for i in range(13)]
ARMOR_SHIFT = 5


# ---------------------------------------------------------------- pixel helpers


def pixels(im: Image.Image) -> list:
    getter = getattr(im, "get_flattened_data", None)
    return list(getter() if getter else im.getdata())


def is_magenta(r: int, g: int, b: int) -> bool:
    """Approximate #FF00FF background, but never the purple helmet (r far below b)."""
    lo = min(r, b)
    return lo > 70 and abs(r - b) < 50 and g < lo * 0.45


def remove_background(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    if im.getchannel("A").getextrema()[0] < 16:  # real transparency present
        return im
    out = [(0, 0, 0, 0) if is_magenta(r, g, b) else (r, g, b, 255) for r, g, b, _ in pixels(im)]
    res = Image.new("RGBA", im.size)
    res.putdata(out)
    return res


def opaque_mask(im: Image.Image) -> Image.Image:
    return im.getchannel("A").point(lambda v: 255 if v >= 128 else 0)


# ---------------------------------------------------------------- frame detection


def frame_ranges(im: Image.Image, expected: int) -> list[tuple[int, int]]:
    w, _ = im.size
    cols = opaque_mask(im).resize((w, 1), Image.BOX)
    filled = [v > 0 for v in pixels(cols)]
    runs, start = [], None
    for x, f in enumerate(filled + [False]):
        if f and start is None:
            start = x
        elif not f and start is not None:
            if x - start >= 8:  # ignore specks
                runs.append([start, x])
            start = None
    while len(runs) > expected:  # merge across the smallest gap
        gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
        i = gaps.index(min(gaps))
        runs[i] = [runs[i][0], runs[i + 1][1]]
        del runs[i + 1]
    while 0 < len(runs) < expected:  # split the widest run in half
        i = max(range(len(runs)), key=lambda k: runs[k][1] - runs[k][0])
        a, b = runs[i]
        mid = (a + b) // 2
        runs[i : i + 1] = [[a, mid], [mid, b]]
    return [(a, b) for a, b in runs]


# ---------------------------------------------------------------- connected components


def components(mask: list[list[bool]]) -> list[list[tuple[int, int]]]:
    h, w = len(mask), len(mask[0]) if mask else 0
    seen = [[False] * w for _ in range(h)]
    comps = []
    for y in range(h):
        for x in range(w):
            if mask[y][x] and not seen[y][x]:
                q, comp = deque([(x, y)]), []
                seen[y][x] = True
                while q:
                    cx, cy = q.popleft()
                    comp.append((cx, cy))
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < w and 0 <= ny < h and mask[ny][nx] and not seen[ny][nx]:
                            seen[ny][nx] = True
                            q.append((nx, ny))
                comps.append(comp)
    return comps


def helmet_anchor(crop: Image.Image) -> tuple[float, float, float] | None:
    """(center_x, top_y, brim_width) of the helmet in crop pixels, or None if not found.

    Helmet = the largest blue/purple blob. Width is measured only over the dome + brim rows,
    so armor pieces attached below it (visor, ear module) do not inflate the measurement.
    """
    k = 4
    small = crop.resize((max(1, crop.width // k), max(1, crop.height // k)), Image.NEAREST)
    w, h = small.size
    mask = [[False] * w for _ in range(h)]
    for i, (r, g, b, a) in enumerate(pixels(small)):
        if a >= 128 and b > 150 and b > r + 30 and b > g + 60:
            mask[i // w][i % w] = True
    comps = components(mask)
    if not comps:
        return None
    blob = max(comps, key=len)
    if len(blob) < 12:
        return None
    xs = [p[0] for p in blob]
    top = min(p[1] for p in blob)
    limit = top + max(1, int((max(xs) - min(xs) + 1) * 0.55))
    rows: dict[int, list[int]] = {}
    for x, y in blob:
        if y <= limit:
            rows.setdefault(y, []).append(x)
    widest = max(rows.values(), key=lambda r: max(r) - min(r))
    brim_w = (max(widest) - min(widest) + 1) * k
    cx = (max(widest) + min(widest) + 1) / 2 * k
    return cx, top * k, brim_w


# ---------------------------------------------------------------- downscale + cleanup


def downscale(crop: Image.Image, s: float, speck: int = 3) -> Image.Image:
    w, h = max(1, round(crop.width * s)), max(1, round(crop.height * s))
    small = crop.convert("RGBa").resize((w, h), Image.BOX).convert("RGBA")
    out = [(*nearest((r, g, b)), 255) if a >= 128 else (0, 0, 0, 0) for r, g, b, a in pixels(small)]
    small.putdata(out)
    despill(small)
    remove_specks(small, speck)
    return small


def despill(im: Image.Image) -> None:
    """Edge pixels still tinted by the magenta background become transparent."""
    w, h = im.size
    px = im.load()
    kill = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a:
                continue
            edge = any(
                not (0 <= nx < w and 0 <= ny < h) or px[nx, ny][3] == 0
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
            )
            if edge and abs(r - b) < 40 and (r + b) / 2 - g > 50:
                kill.append((x, y))
    for x, y in kill:
        px[x, y] = (0, 0, 0, 0)


def remove_specks(im: Image.Image, min_size: int = 3) -> None:
    w, h = im.size
    px = im.load()
    mask = [[px[x, y][3] > 0 for x in range(w)] for y in range(h)]
    for comp in components(mask):
        if len(comp) < min_size:
            for x, y in comp:
                px[x, y] = (0, 0, 0, 0)


# ---------------------------------------------------------------- frames + placement


class Frame:
    def __init__(self, img: Image.Image, helmet, bottom_gap: int):
        self.img = img  # downscaled, cropped to content
        self.helmet = helmet  # (cx, top, brim) in downscaled pixels, or None
        self.bottom_gap = bottom_gap  # px between this frame's bottom and the sheet's floor


class RawSheet:
    def __init__(self, path: str, expected: int, warnings: list[str]):
        im = remove_background(Image.open(path))
        ranges = frame_ranges(im, expected)
        if len(ranges) != expected:
            warnings.append(f"{os.path.basename(path)}: found {len(ranges)} frames, expected {expected}")
        self.crops, self.anchors, bottoms = [], [], []
        for a, b in ranges:
            col = im.crop((a, 0, b, im.height))
            bbox = opaque_mask(col).getbbox()
            crop = col.crop(bbox) if bbox else col
            self.crops.append(crop)
            self.anchors.append(helmet_anchor(crop))
            bottoms.append(bbox[3] if bbox else im.height)
        floor = max(bottoms)
        self.gaps = [floor - b for b in bottoms]

    def scale_for(self, target_brim: float, scale_from: int | None = None) -> float | None:
        if scale_from is not None:
            a = self.anchors[scale_from]
            return target_brim / a[2] if a else None
        widths = [a[2] for a in self.anchors if a]
        return target_brim / statistics.median(widths) if widths else None

    def frames(self, scale: float) -> list[Frame]:
        out = []
        for crop, anc, gap in zip(self.crops, self.anchors, self.gaps):
            helm = (anc[0] * scale, anc[1] * scale, anc[2] * scale) if anc else None
            out.append(Frame(downscale(crop, scale), helm, round(gap * scale)))
        return out


def place(frame: Frame, dx=None, dy=None, anchor="helmet", baseline="feet"):
    """Paste a frame into a CELL x CELL canvas. Default: helmet center x -> CELL/2 (shifted
    back inside the cell if the pose is too wide), feet on the bottom row.
    Returns (cell, dx, dy, clipped)."""
    w, h = frame.img.size
    if dx is None:
        cx = frame.helmet[0] if (anchor == "helmet" and frame.helmet) else w / 2
        dx = round(CELL / 2 - cx)
        if w <= CELL:
            dx = min(max(dx, 0), CELL - w)
    if dy is None:
        dy = CELL - h - (frame.bottom_gap if baseline == "sheet" else 0)
    cell = Image.new("RGBA", (CELL, CELL))
    sx, sy = max(-dx, 0), max(-dy, 0)
    ex, ey = min(w, CELL - dx), min(h, CELL - dy)
    if ex > sx and ey > sy:
        cell.alpha_composite(frame.img.crop((sx, sy, ex, ey)), (dx + sx, dy + sy))
    clipped = dx < 0 or dy < 0 or dx + w > CELL or dy + h > CELL
    return cell, dx, dy, clipped


# ---------------------------------------------------------------- armor fit + layers


def row_masks(cell: Image.Image) -> list[int]:
    a = cell.getchannel("A").load()
    return [sum(1 << x for x in range(CELL) if a[x, y]) for y in range(CELL)]


def shifted_iou(base: list[int], other: list[int], dx: int, dy: int) -> float:
    full = (1 << CELL) - 1
    inter = union = 0
    for y in range(CELL):
        sy = y - dy
        o = other[sy] if 0 <= sy < CELL else 0
        o = ((o << dx) if dx >= 0 else (o >> -dx)) & full
        b = base[y]
        inter += (b & o).bit_count()
        union += (b | o).bit_count()
    return inter / union if union else 0.0


def bounded_scale(crops, scale: float) -> float:
    """Keep one shared scale for the sheet, shrinking only when a pose exceeds its cell."""
    return min(scale, CELL / max(c.width for c in crops), CELL / max(c.height for c in crops))


def fit_armor(base_frames, base_offsets, base_cells, armor: RawSheet, est_scale: float):
    """Shared armor scale + per-frame offsets maximizing silhouette overlap with the base."""
    base_masks = [row_masks(c) for c in base_cells]
    best = None
    for m in ARMOR_SCALE_STEPS:
        scale = bounded_scale(armor.crops, est_scale * m)
        frames = armor.frames(scale)
        total, picks = 0.0, []
        for i, (bf, af) in enumerate(zip(base_frames, frames)):
            bw, bh = bf.img.size
            aw, ah = af.img.size
            bdx, bdy = base_offsets[i]
            # start: armor bottom-center on the base bottom-center, then search around it
            dx0 = round(bdx + bw / 2 - aw / 2)
            dy0 = bdy + bh - ah
            # Score the complete drawing, never a mask already clipped at its initial offset.
            # Otherwise the overlap search can prefer losing protruding armor at an edge.
            cell, _, _, _ = place(af, 0, 0)
            amask = row_masks(cell)
            dx0 = min(max(dx0, 0), CELL - aw)
            dy0 = min(max(dy0, 0), CELL - ah)
            score, dx, dy = max(
                (shifted_iou(base_masks[i], amask, dx, dy), dx, dy)
                for dx in range(max(0, dx0 - ARMOR_SHIFT), min(CELL - aw, dx0 + ARMOR_SHIFT) + 1)
                for dy in range(max(0, dy0 - ARMOR_SHIFT), min(CELL - ah, dy0 + ARMOR_SHIFT) + 1)
            )
            total += score
            picks.append((dx, dy, round(score, 2)))
        mean = total / len(frames)
        if best is None or mean > best[0]:
            best = (mean, scale, frames, picks)
    return best


def region_masks(base: Image.Image) -> dict[str, list[list[bool]]]:
    """Which cell pixels belong to each armor part, from the base frame's body regions:
    head = top 56% of the figure, legs = bottom 20%, torso band split into body (center
    column) and arm (everything left/right of it)."""
    bpx = base.load()
    bbox = base.getchannel("A").getbbox() or (0, 0, CELL, CELL)
    top, height = bbox[1], bbox[3] - bbox[1]
    head_end = top + 0.56 * height
    legs_start = top + 0.80 * height
    torso_x = [x for y in range(int(head_end), int(legs_start)) for x in range(CELL) if bpx[x, y][3]]
    torso_cx = statistics.median(torso_x) if torso_x else CELL / 2
    masks = {p: [[False] * CELL for _ in range(CELL)] for p in PARTS}
    for y in range(CELL):
        for x in range(CELL):
            if y < head_end:
                part = "head"
            elif y >= legs_start:
                part = "legs"
            else:
                part = "body" if abs(x - torso_cx) <= 5 else "arm"
            masks[part][y][x] = True
    return masks


def combo_cell(base: Image.Image, armor: Image.Image, parts: tuple[str, ...], masks) -> Image.Image:
    """Base frame with the regions of the given parts replaced by the armored drawing."""
    out = base.copy()
    opx, apx = out.load(), armor.load()
    for y in range(CELL):
        for x in range(CELL):
            if any(masks[p][y][x] for p in parts):
                opx[x, y] = apx[x, y]
    return out


def combo_id(parts: tuple[str, ...]) -> int:
    return sum(1 << PARTS.index(p) for p in parts)


ALL_COMBOS = [tuple(p for i, p in enumerate(PARTS) if m & (1 << i)) for m in range(1, 1 << len(PARTS))]


# ---------------------------------------------------------------- output


def strip(cells: list[Image.Image]) -> Image.Image:
    s = Image.new("RGBA", (CELL * len(cells), CELL))
    for i, c in enumerate(cells):
        s.alpha_composite(c, (i * CELL, 0))
    return s


def contact_sheet(rows: list[list[Image.Image]], zoom: int = 4) -> Image.Image:
    n = max(len(r) for r in rows)
    pad = 2
    sheet = Image.new(
        "RGBA",
        ((CELL * n + pad * (n + 1)) * zoom, ((CELL + pad) * len(rows) + pad) * zoom),
        (40, 40, 48, 255),
    )
    for ri, cells in enumerate(rows):
        for ci, c in enumerate(cells):
            bg = Image.new("RGBA", (CELL, CELL), (70, 70, 80, 255) if (ri + ci) % 2 else (60, 60, 70, 255))
            bg.alpha_composite(c)
            x = (pad + ci * (CELL + pad)) * zoom
            y = (pad + ri * (CELL + pad)) * zoom
            sheet.alpha_composite(bg.resize((CELL * zoom, CELL * zoom), Image.NEAREST), (x, y))
    return sheet


def save(img: Image.Image, *parts: str) -> str:
    path = os.path.join(*parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    return os.path.relpath(path, ROOT).replace(os.sep, "/")


# ---------------------------------------------------------------- bob job


def run_bob() -> None:
    warnings: list[str] = []
    report: dict = {"cell": CELL, "anims": {}, "warnings": warnings}
    out_dir = os.path.join(OUT, "bob")

    # Reference: standing idle frame defines the helmet brim width at the target height.
    ref = RawSheet(os.path.join(RAW, "bob", "B2_idle.png"), 3, warnings)
    if not ref.anchors[0]:
        sys.exit("helmet not found in B2_idle frame 0")
    target_brim = ref.anchors[0][2] * TARGET_STAND_HEIGHT / ref.crops[0].height
    report["target_brim_px"] = round(target_brim, 2)
    armor_ratio: dict[str, float] = {}  # anim -> armor_scale / armor estimate (for armor-only sheets)

    for name, raw, n, opts in BOB_ANIMS:
        entry: dict = {"frames": n}
        anchor, baseline = opts.get("anchor", "helmet"), opts.get("baseline", "feet")
        base = RawSheet(os.path.join(RAW, "bob", f"{raw}.png"), n, warnings)
        b_scale = base.scale_for(target_brim, opts.get("scale_from"))
        if b_scale is None:
            warnings.append(f"{name}: no helmet found, using reference scale")
            b_scale = TARGET_STAND_HEIGHT / ref.crops[0].height
        base_frames = base.frames(b_scale)
        base_cells, offsets = [], []
        for i, f in enumerate(base_frames):
            cell, dx, dy, clipped = place(f, anchor=anchor, baseline=baseline)
            if clipped:
                warnings.append(f"{name}[{i}]: base clipped by the {CELL}px cell")
            base_cells.append(cell)
            offsets.append((dx, dy))
        entry["base_scale"] = round(b_scale, 4)
        entry["files"] = [save(strip(base_cells), out_dir, f"bob_{name}.png")]
        rows = [base_cells]

        armor_path = os.path.join(RAW, "bob_armor", f"A2_{raw}.png")
        if os.path.exists(armor_path):
            armor = RawSheet(armor_path, n, warnings)
            b_h = statistics.median(c.height for c in base.crops)
            a_h = statistics.median(c.height for c in armor.crops)
            est = b_scale * b_h / a_h  # same overall height as the base
            _, a_scale, armor_frames, picks = fit_armor(base_frames, offsets, base_cells, armor, est)
            armor_ratio[name] = a_scale / b_scale
            armor_cells = []
            for i, af in enumerate(armor_frames):
                dx, dy, _ = picks[i]
                acell, _, _, clipped = place(af, dx, dy)
                if clipped:
                    warnings.append(f"{name}[{i}]: armor clipped by the {CELL}px cell")
                armor_cells.append(acell)
            masks = [region_masks(c) for c in base_cells]
            scores = [p[2] for p in picks]
            entry["armor_scale"] = round(a_scale, 4)
            entry["armor_iou"] = scores
            preview_rows = [armor_cells]
            for parts in ALL_COMBOS:
                cid = combo_id(parts)
                if len(parts) == len(PARTS):  # all four: the clean full drawing
                    cells = armor_cells
                else:
                    cells = [combo_cell(base_cells[i], armor_cells[i], parts, masks[i]) for i in range(n)]
                    if len(parts) == 1 or len(parts) == 3:
                        preview_rows.append(cells)
                entry["files"].append(save(strip(cells), out_dir, f"bob_{name}_a{cid}.png"))
            rows += preview_rows
            low = [i for i, s in enumerate(scores) if s < 0.75]
            if low:
                warnings.append(f"{name}: armor overlap below 0.75 on frames {low} (check preview)")
        else:
            warnings.append(f"{name}: no armor sheet {os.path.basename(armor_path)}")

        save(contact_sheet(rows), PREVIEW, f"bob_{name}.png")
        report["anims"][name] = entry
        print(f"bob {name}: {n} frames, scale {entry['base_scale']}", file=sys.stderr)

    for name, raw, n, like in ARMOR_ONLY:
        sheet = RawSheet(os.path.join(RAW, "bob_armor", f"{raw}.png"), n, warnings)
        # same armored size as the reference anim: its armor/base ratio over our helmet scale
        scale = (sheet.scale_for(target_brim) or 0.1) * armor_ratio.get(like, 1.0)
        scale = bounded_scale(sheet.crops, scale)
        cells = []
        for i, f in enumerate(sheet.frames(scale)):
            cell, _, _, clipped = place(f)
            if clipped:
                warnings.append(f"{name}[{i}]: clipped by the {CELL}px cell")
            cells.append(cell)
        report["anims"][name] = {
            "frames": n,
            "armor_scale": round(scale, 4),
            "files": [save(strip(cells), out_dir, f"bob_{name}_a15.png")],
        }
        save(contact_sheet([cells]), PREVIEW, f"bob_{name}.png")

    os.makedirs(PREVIEW, exist_ok=True)
    with open(os.path.join(PREVIEW, "bob_report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
    for w in warnings:
        print("WARN", w, file=sys.stderr)


# ---------------------------------------------------------------- effects job

# Effect sheets are drawn on a regular grid: rows are found by empty-row gaps, cells by the
# sheet's column count. Each anim takes some cells of one row and becomes one strip.
#   (raw file in art/raw/fx, grid columns, rows, [(key, row, cells, (frame w, frame h), fit)])
#   fit: optional (w, h) box the largest frame is scaled into (default: the frame itself);
#        one scale per anim, so the frames keep their relative sizes
FX_SHEETS = [
    ("FX1_buster", 6, 5, [
        ("fx_buster", 0, [0, 1], (12, 8), None),
        ("fx_buster_c1", 1, [0, 1], (24, 12), None),
        ("fx_buster_c2", 2, [0, 1, 2], (32, 16), None),
        ("fx_charge1", 3, [0, 1, 2], (48, 48), (40, 40)),
        ("fx_charge2", 3, [3, 4, 5], (48, 48), (42, 42)),
        ("fx_muzzle", 4, [0, 1], (12, 12), None),
    ]),
    ("A5_compiler_shot", 4, 3, [
        ("fx_compiler", 0, [0, 1, 2, 3], (44, 16), None),
        ("fx_compiler_hit", 1, [0, 1, 2, 3], (32, 32), None),
        ("fx_charge3", 2, [0, 1, 2], (48, 48), (46, 46)),
    ]),
    ("FX2_weapons", 5, 3, [
        ("fx_gc", 0, [0, 1, 2, 3], (24, 24), None),
        ("fx_mutex", 1, [0, 1], (14, 14), None),
        ("fx_mutex_shell", 1, [2, 3], (32, 32), None),
        ("fx_null", 2, [0, 1, 2], (24, 12), None),
        ("fx_null_glitch", 2, [3, 4], (24, 16), None),
    ]),
    ("FX4_movement", 6, 4, [
        # Bob "decompiling" into pixels on death; sized like Bob standing (~36 px)
        ("fx_decompile", 3, [0, 1, 2, 3, 4, 5], (48, 48), (36, 38)),
    ]),
    ("FX3_explosions", 6, 4, [
        ("fx_hit", 0, [0, 1, 2], (16, 16), None),
    ]),
]


def run_fx() -> None:
    warnings: list[str] = []
    report: dict = {"anims": {}, "warnings": warnings}
    out_dir = os.path.join(OUT, "fx")
    for raw, cols, n_rows, anims in FX_SHEETS:
        im = remove_background(Image.open(os.path.join(RAW, "fx", f"{raw}.png")))
        # rows = column ranges of the transposed sheet
        rows = frame_ranges(im.transpose(Image.Transpose.TRANSPOSE), n_rows)
        if len(rows) != n_rows:
            warnings.append(f"{raw}: found {len(rows)} rows, expected {n_rows}")
        cell_w = im.width / cols
        for key, row, cells, (fw, fh), fit in anims:
            y0, y1 = rows[row]
            crops = []
            for c in cells:
                part = im.crop((round(c * cell_w), y0, round((c + 1) * cell_w), y1))
                bbox = opaque_mask(part).getbbox()
                if not bbox:
                    warnings.append(f"{key}: cell {c} of row {row} is empty")
                    continue
                crops.append(part.crop(bbox))
            bw, bh = fit or (fw, fh)
            scale = min(bw / max(c.width for c in crops), bh / max(c.height for c in crops))
            frames = []
            for i, crop in enumerate(crops):
                small = downscale(crop, scale, speck=2)
                w, h = small.size
                if w > fw or h > fh:
                    warnings.append(f"{key}[{i}]: {w}x{h} clipped by the {fw}x{fh} frame")
                frame = Image.new("RGBA", (fw, fh))
                frame.alpha_composite(small.crop((0, 0, min(w, fw), min(h, fh))), ((fw - min(w, fw)) // 2, (fh - min(h, fh)) // 2))
                frames.append(frame)
            sheet = Image.new("RGBA", (fw * len(frames), fh))
            for i, f in enumerate(frames):
                sheet.alpha_composite(f, (i * fw, 0))
            report["anims"][key] = {
                "frames": len(frames),
                "frame": [fw, fh],
                "scale": round(scale, 4),
                "file": save(sheet, out_dir, f"{key}.png"),
            }
            save(contact_sheet([frames]), PREVIEW, f"{key}.png")
            print(f"fx {key}: {len(frames)} frames {fw}x{fh}, scale {scale:.3f}", file=sys.stderr)
    with open(os.path.join(PREVIEW, "fx_report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
    for w in warnings:
        print("WARN", w, file=sys.stderr)


JOBS = {"bob": run_bob, "fx": run_fx}

if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in JOBS:
        sys.exit(f"usage: python tools/sprites.py [{'|'.join(JOBS)}]")
    JOBS[sys.argv[1]]()
