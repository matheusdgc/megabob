"""Pixel-art compositions from existing UI pieces; no gameplay/menu logic."""
from PIL import Image, ImageDraw, ImageFont
from palette import PALETTE, _dist
from sprites import pixels

SIZE = (480, 270)
SLOT_SIZE = 64
STAGE_SLOTS = {
    'memoryLeak': (240, 62), 'raceCondition': (112, 135), 'bob': (240, 135),
    'nullPointer': (368, 135), 'techDebt': (240, 208),
}
INK = (22, 22, 22, 255)
BLUE = (15, 98, 254, 255)
FOCUS = (241, 194, 27, 255)
PAUSE_SIZE = (352, 208)
PAUSE_POSITION = (64, 31)
METER_CHANNEL = (3, 8, 6, 56)


def frame_panel(source, size, edge, fill=INK, opaque=True):
    """Resize the straight borders while preserving the source corners at native size."""
    source = source.convert('RGBA')
    border = source.crop(source.getbbox())
    w, h = border.size
    target_w, target_h = size
    image = Image.new('RGBA', size, fill if opaque else (0, 0, 0, 0))
    if not opaque:
        ImageDraw.Draw(image).rectangle((edge, edge, target_w - edge - 1, target_h - edge - 1), fill=fill)
    for a, b, x0, x1 in [(0, edge, 0, edge), (edge, w - edge, edge, target_w - edge),
                          (w - edge, w, target_w - edge, target_w)]:
        for c, d, y0, y1 in [(0, edge, 0, edge), (edge, h - edge, edge, target_h - edge),
                              (h - edge, h, target_h - edge, target_h)]:
            if x0 == edge and y0 == edge:
                continue
            piece = border.crop((a, c, b, d)).resize((x1 - x0, y1 - y0), Image.Resampling.NEAREST)
            image.alpha_composite(piece, (x0, y0))
    return image


def stage_assets(panel, locked):
    """Reuse U3's corners and border strips while rebuilding its interior for 16:9."""
    panel = panel.convert('RGBA')
    if panel.size != (256, 224) or locked.size != (48, 48):
        raise ValueError('expected the existing 256x224 U3 panel and 48x48 locked slot')
    frame = panel.crop((101, 22, 155, 75)).resize((64, 64), Image.Resampling.NEAREST)
    image = frame_panel(panel, SIZE, 16)
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


def hud_assets(frame, blue_segment, yellow_segment, pause_panel):
    frame = frame.convert('RGBA').resize((12, 72), Image.Resampling.NEAREST)
    # The channel is explicit: 28 one-pixel segments on a two-pixel pitch, with 8px caps.
    ImageDraw.Draw(frame).rectangle((3, 8, 8, 63), fill=(0, 0, 0, 0))
    pause = frame_panel(pause_panel, PAUSE_SIZE, 8, fill=(57, 57, 57, 255), opaque=False)
    return {
        'hud_meter_frame': frame,
        'hud_segment_blue': blue_segment.convert('RGBA').crop((0, 0, 4, 1)).resize((6, 1), Image.Resampling.NEAREST),
        'hud_segment_yellow': yellow_segment.convert('RGBA').crop((0, 0, 4, 1)).resize((6, 1), Image.Resampling.NEAREST),
        'pause_panel_wide': pause,
    }


def draw_meter(image, assets, position, value, energy=False):
    """Preview renderer; gameplay updates its own values using the exported geometry."""
    if not 0 <= value <= 28:
        raise ValueError('meter preview value must be in [0, 28]')
    x, y = position
    dx, dy, width, height = METER_CHANNEL
    ImageDraw.Draw(image).rectangle((x + dx, y + dy, x + dx + width - 1, y + dy + height - 1), fill=INK)
    segment = assets['hud_segment_yellow' if energy else 'hud_segment_blue']
    for i in range(value):
        image.alpha_composite(segment, (x + dx, y + dy + height - 2 - i * 2))
    image.alpha_composite(assets['hud_meter_frame'], (x, y))
    return image


def scene_preview(layers, tiles, bob):
    image = Image.new('RGBA', SIZE, (0, 29, 108, 255))
    for layer in layers:
        image.alpha_composite(layer.convert('RGBA').crop((16, 0, 496, 224)), (0, 30))
    tile = tiles.convert('RGBA').crop((0, 0, 16, 16))
    for x in range(0, SIZE[0], 16):
        image.alpha_composite(tile, (x, 254))
    image.alpha_composite(bob.convert('RGBA').crop((0, 0, 48, 48)), (70, 206))
    return image


def ui_text(image, position, text, size=9, fill=(224, 224, 224, 255), anchor=None):
    draw = ImageDraw.Draw(image)
    draw.fontmode = '1'  # Hard-edged preview text; runtime text remains the game's job.
    draw.text(position, text, font=ImageFont.load_default(size=size), fill=fill, anchor=anchor)


def hud_preview(background, assets, life_icon, weapon_icon=None, hp=18, energy=10):
    image = background.copy()
    draw_meter(image, assets, (8, 10), hp)
    if weapon_icon is not None:
        draw_meter(image, assets, (26, 10), energy, energy=True)
        image.alpha_composite(weapon_icon.convert('RGBA'), (24, 90))
    image.alpha_composite(life_icon.convert('RGBA'), (8, 112))
    ui_text(image, (27, 114), 'x03', 11)
    return image


def pause_preview(background, assets, weapons, armor, life_icon, complete=False):
    # Keep the dimmed data center on neutral/cool ramps instead of mapping grey to brown.
    allowed = PALETTE[:15] + PALETTE[19:23]
    colors = {rgb: min(allowed, key=lambda color: _dist(tuple(round(c * .4 + 22 * .6) for c in rgb), color))
              for rgb in {pixel[:3] for pixel in pixels(background)}}
    dim = Image.new('RGBA', SIZE)
    dim.putdata([(*colors[pixel[:3]], 255) for pixel in pixels(background)])
    image = hud_preview(dim, assets, life_icon, weapons['gc'] if complete else None,
                        hp=28, energy=16)
    image.alpha_composite(assets['pause_panel_wide'], PAUSE_POSITION)
    ui_text(image, (84, 46), 'PAUSA', 14)
    ImageDraw.Draw(image).line((84, 72, 396, 72), fill=BLUE)
    ui_text(image, (88, 86), 'ARMAS', 11)
    ui_text(image, (272, 86), 'ARMADURA', 11)
    selected_y = 140 if complete else 112
    image.alpha_composite(weapons['null'].convert('RGBA'), (78, selected_y - 8))
    for i, (name, label) in enumerate([('buster', 'BUSTER'), ('gc', 'GARBAGE COLLECTOR'),
                                      ('mutex', 'MUTEX LOCK'), ('null', 'NULL POINTER')]):
        y = 112 + i * 28
        unlocked = i == 0 or complete
        image.alpha_composite(weapons[name if unlocked else 'mutex'].convert('RGBA'), (98, y - 8))
        ui_text(image, (122, y - 4), label if unlocked else 'BLOQUEADO',
                fill=(224, 224, 224, 255) if unlocked else (168, 168, 168, 255))
    for name, label, x, y in [('head', 'VISOR', 288, 118), ('arm', 'CANHÃO', 360, 118),
                             ('body', 'PLACA', 288, 178), ('legs', 'BOTAS', 360, 178)]:
        start = 0 if complete else 16  # A4: frame 0 collected, frame 1 inactive.
        icon = armor[name].convert('RGBA').crop((start, 0, start + 16, 16))
        image.alpha_composite(icon.resize((32, 32), Image.Resampling.NEAREST), (x - 16, y - 16))
        ui_text(image, (x, y + 21), label, anchor='mt')
    ui_text(image, (324, 218), 'PEÇAS 4/4' if complete else 'PEÇAS 0/4', anchor='mt')
    return image


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
