"""Viewport-sized environment art and review compositions; no playable map definitions."""
from PIL import Image, ImageDraw
from sprites import pixels

THEMES = [('t1', 'memory_leak', 'Memory Leak'), ('t2', 'race_condition', 'Race Condition'),
          ('t3', 'null_pointer', 'Null Pointer'), ('t4', 'tech_debt', 'Tech Debt')]


def quiet_legacy_layer(image):
    """Keep bright beige machinery behind the playable floor; retain the green CRT identity."""
    ramp = {
        (239, 227, 194): (141, 110, 79), (201, 180, 138): (62, 43, 31),
        (141, 110, 79): (62, 43, 31), (62, 43, 31): (22, 22, 22),
        (255, 255, 255): (168, 168, 168), (224, 224, 224): (111, 111, 111),
        (168, 168, 168): (57, 57, 57), (111, 111, 111): (57, 57, 57),
        (57, 57, 57): (22, 22, 22), (66, 190, 101): (25, 128, 56),
    }
    result = image.convert('RGBA').copy()
    result.putdata([(*ramp.get((r, g, b), (r, g, b)), a) for r, g, b, a in pixels(result)])
    return result


def extend_view(image, layer, height=270):
    if height < image.height or layer not in ('far', 'mid', 'near'):
        raise ValueError('expected a taller viewport and a far/mid/near layer')
    image = image.convert('RGBA')
    extra = height - image.height
    result = Image.new('RGBA', (image.width, height))
    if layer == 'far' and extra:
        result.alpha_composite(image.crop((0, 0, image.width, 1)).resize((image.width, extra), Image.Resampling.NEAREST))
    result.alpha_composite(image, (0, 0 if layer == 'near' else extra))
    return result


def environment_preview(layers, tiles, bob, mite, drone):
    """One art board shared by all themes, not a playable level or collision map."""
    image = Image.new('RGBA', (480, 270))
    for layer in layers:
        image.alpha_composite(layer.convert('RGBA').crop((0, 0, 480, 270)))

    def tile(index, col, row):
        piece = tiles.crop((index * 16, 0, (index + 1) * 16, 16)).convert('RGBA')
        image.alpha_composite(piece, (col * 16, row * 16))

    def block(col, row, width, height):
        for y in range(height):
            for x in range(width):
                if y == 0:
                    index = 4 if x == 0 else 5 if x == width - 1 else 0
                elif y == height - 1:
                    index = 6 if x == 0 else 7 if x == width - 1 else 1
                else:
                    index = 2 if x == 0 else 3 if x == width - 1 else 1
                tile(index, col + x, row + y)

    block(0, 15, 30, 2)
    block(20, 12, 8, 3)
    for x in range(7, 14):
        tile(12 if x == 7 else 14 if x == 13 else 13, x, 9)
    for x in range(15, 18):
        tile(16, x, 15)
    tile(18, 3, 14)
    tile(19, 5, 14)
    image.alpha_composite(bob.convert('RGBA').crop((0, 0, 48, 48)), (144, 96))
    image.alpha_composite(mite.convert('RGBA').crop((0, 0, mite.width // 3, mite.height)), (64, 216))
    image.alpha_composite(drone.convert('RGBA').crop((0, 0, drone.width // 3, drone.height)), (354, 98))
    return image


def tile_repeat_preview(tiles):
    """3x3 fill, a repeated top edge and a joined three-piece platform at native scale."""
    image = Image.new('RGBA', (144, 80), (22, 22, 22, 255))
    fill = tiles.crop((16, 0, 32, 16)).convert('RGBA')
    top = tiles.crop((0, 0, 16, 16)).convert('RGBA')
    for y in range(3):
        for x in range(3):
            image.alpha_composite(fill, (x * 16, y * 16))
    for x in range(5):
        image.alpha_composite(top, (64 + x * 16, 0))
        index = 12 if x == 0 else 14 if x == 4 else 13
        image.alpha_composite(tiles.crop((index * 16, 0, (index + 1) * 16, 16)).convert('RGBA'), (64 + x * 16, 40))
    return image


def environment_gallery(images):
    image = Image.new('RGBA', (960, 580), (22, 22, 22, 255))
    draw = ImageDraw.Draw(image)
    draw.fontmode = '1'
    for i, ((_, _, label), scene) in enumerate(zip(THEMES, images)):
        x, y = (i % 2) * 480, (i // 2) * 290
        draw.text((x + 8, y + 3), label, fill=(224, 224, 224, 255))
        image.alpha_composite(scene, (x, y + 20))
    return image
