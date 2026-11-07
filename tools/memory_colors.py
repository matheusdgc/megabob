"""Texture-preserving local palettes: blue-grey depth, warm metal, original teal hazards."""
from palette import PALETTE
from sprites import pixels


def color_map(warm=False):
    """Keep every source tone distinct; never merge texture classes by brightness."""
    result, used = {}, set()
    for r, g, b in PALETTE:
        light = .2126 * r + .7152 * g + .0722 * b
        if warm:
            color = (round(34 + .73 * light + .04 * r), round(28 + .68 * light + .03 * g),
                     round(23 + .56 * light + .025 * b))
        else:
            color = (round(12 + .22 * light + .025 * r), round(20 + .26 * light + .025 * g),
                     round(28 + .28 * light + .025 * b))
        while color in used:
            color = (color[0], color[1], color[2] + 1)
        result[(r, g, b)] = color
        used.add(color)
    return result


BACKGROUND = color_map()
METAL = color_map(warm=True)
MEMORY_PALETTE = set(PALETTE) | set(BACKGROUND.values()) | set(METAL.values())


def luminance(rgb):
    values = [c / 3294.6 if c <= 10 else ((c / 255 + .055) / 1.055) ** 2.4 for c in rgb]
    return sum(c * weight for c, weight in zip(values, (.2126, .7152, .0722)))


def recolor(image, colors):
    result = image.convert('RGBA').copy()
    result.putdata([(*colors[(r, g, b)], a) if a else (r, g, b, a) for r, g, b, a in pixels(result)])
    return result


def quiet_memory_layer(image):
    return recolor(image, BACKGROUND)


def memory_tiles(image):
    """One-to-one recoloring of existing pixels; no fills, new stripes or smoothing."""
    result = image.convert('RGBA').copy()
    for index in list(range(16)) + [17]:
        box = (index * 16, 0, (index + 1) * 16, 16)
        result.paste(recolor(image.crop(box), BACKGROUND if index == 17 else METAL), box[:2])
    return result
