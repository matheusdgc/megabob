"""Pixel-art compositions from existing UI pieces; no gameplay/menu logic."""
from PIL import Image, ImageDraw

SIZE = (480, 270)
SLOT_SIZE = 64
STAGE_SLOTS = {
    'memoryLeak': (240, 62), 'raceCondition': (112, 135), 'bob': (240, 135),
    'nullPointer': (368, 135), 'techDebt': (240, 208),
}
INK = (22, 22, 22, 255)
BLUE = (15, 98, 254, 255)
FOCUS = (241, 194, 27, 255)


def stage_assets(panel, locked):
    """Reuse U3's corners and border strips while rebuilding its interior for 16:9."""
    panel = panel.convert('RGBA')
    if panel.size != (256, 224) or locked.size != (48, 48):
        raise ValueError('expected the existing 256x224 U3 panel and 48x48 locked slot')
    frame = panel.crop((101, 22, 155, 75)).resize((64, 64), Image.Resampling.NEAREST)
    border = panel.crop(panel.getbbox())
    w, h = border.size
    target_w, target_h = SIZE
    edge = 16
    image = Image.new('RGBA', SIZE, INK)
    for a, b, x0, x1 in [(0, edge, 0, edge), (edge, w - edge, edge, target_w - edge),
                          (w - edge, w, target_w - edge, target_w)]:
        for c, d, y0, y1 in [(0, edge, 0, edge), (edge, h - edge, edge, target_h - edge),
                              (h - edge, h, target_h - edge, target_h)]:
            if x0 == edge and y0 == edge:
                continue
            piece = border.crop((a, c, b, d)).resize((x1 - x0, y1 - y0), Image.Resampling.NEAREST)
            image.alpha_composite(piece, (x0, y0))
    draw = ImageDraw.Draw(image)
    for path in [[(144, 135), (169, 135), (177, 127), (200, 127), (208, 135)],
                 [(272, 135), (280, 127), (303, 127), (311, 135), (336, 135)],
                 [(240, 94), (240, 103)], [(240, 167), (240, 176)]]:
        draw.line(path, fill=BLUE, width=2)
    for x, y in STAGE_SLOTS.values():
        image.alpha_composite(frame, (x - SLOT_SIZE // 2, y - SLOT_SIZE // 2))
    locked_frame = frame.copy()
    lock = locked.convert('RGBA').crop((10, 10, 38, 39)).resize((42, 44), Image.Resampling.NEAREST)
    locked_frame.alpha_composite(lock, (11, 10))
    focus = Image.new('RGBA', (72, 72))
    draw = ImageDraw.Draw(focus)
    for path in [[(2, 12), (2, 2), (12, 2)], [(59, 2), (69, 2), (69, 12)],
                 [(2, 59), (2, 69), (12, 69)], [(59, 69), (69, 69), (69, 59)]]:
        draw.line(path, fill=FOCUS, width=2)
    return {'stage_select_wide': image, 'stage_locked_wide': locked_frame, 'stage_focus': focus}


def stage_preview(assets, portraits, unlocked=False):
    """The two previews demonstrate artwork states; the game supplies its own unlock state."""
    image = assets['stage_select_wide'].copy()
    for name, (x, y) in STAGE_SLOTS.items():
        if name == 'techDebt' and not unlocked:
            image.alpha_composite(assets['stage_locked_wide'], (x - 32, y - 32))
        else:
            portrait = portraits[name].convert('RGBA')
            image.alpha_composite(portrait, (x - portrait.width // 2, y - portrait.height // 2))
    selected = 'techDebt' if unlocked else 'memoryLeak'
    x, y = STAGE_SLOTS[selected]
    image.alpha_composite(assets['stage_focus'], (x - 36, y - 36))
    return image
