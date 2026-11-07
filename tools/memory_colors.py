"""Memory Leak color roles: quiet scenery, steel contact edges, teal hazards."""
from sprites import pixels

INK = (22, 22, 22)
SHADE = (57, 57, 57)
STEEL = (111, 111, 111)
LIGHT = (168, 168, 168)
EDGE = (224, 224, 224)


def luminance(rgb):
    values = [c / 3294.6 if c <= 10 else ((c / 255 + .055) / 1.055) ** 2.4 for c in rgb]
    return sum(c * weight for c, weight in zip(values, (.2126, .7152, .0722)))


def background_color(rgb):
    light = luminance(rgb)
    return INK if light < .09 else SHADE


def quiet_memory_layer(image):
    result = image.convert('RGBA').copy()
    result.putdata([(*background_color((r, g, b)), a) for r, g, b, a in pixels(result)])
    return result


def memory_tiles(image):
    """Color-only changes: preserve every alpha pixel and all frame indices."""
    result = image.convert('RGBA').copy()
    for index in list(range(16)) + [17]:
        for y in range(16):
            for x in range(16):
                r, g, b, a = image.getpixel((index * 16 + x, y))
                if not a:
                    continue
                if index == 17:
                    color = INK  # Background-wall stamps must not compete with platforms.
                elif index == 1:
                    color = SHADE  # Collapse the high-contrast repeated fill pattern.
                else:
                    value = luminance((r, g, b))
                    color = INK if value < .012 else SHADE if value < .09 else STEEL if value < .3 else LIGHT
                    if index in (0, 2, 3, 4, 5, 12, 13, 14) and y < 2:
                        color = EDGE
                    elif index == 15 and x in (0, 15):
                        color = STEEL
                result.putpixel((index * 16 + x, y), (*color, a))
    return result
