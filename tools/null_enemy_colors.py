"""Local, one-to-one color roles for threats against Null Pointer's purple scenery."""
from PIL import Image

from sprites import pixels


def rgb(value):
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


EYE = {rgb(a): rgb(b) for a, b in {
    '31135E': '750E13', '6929C4': 'FF832B', 'A56EFF': 'F1C21B', 'E8DAFF': 'EFE3C2',
}.items()}
CHAIN = {rgb(a): rgb(b) for a, b in {
    '31135E': '004144', '6929C4': '007D79', 'A56EFF': '08BDBA', 'E8DAFF': '9EF0F0',
    '393939': '0043CE', '6F6F6F': '4589FF', 'A8A8A8': 'A6C8FF', '3E2B1F': '001D6C',
}.items()}
REMAPS = {'enemy_void_eye': EYE, 'enemy_dangling_ref': CHAIN, 'null_cursor': EYE}


def recolor_null_enemy(image, key):
    mapping = REMAPS[key]
    data = pixels(image)
    colors = {p[:3] for p in data if p[3]}
    if len({mapping.get(color, color) for color in colors}) != len(colors):
        raise ValueError(key + ': remap would merge original texture colors')
    result = Image.new('RGBA', image.size)
    result.putdata([(*mapping.get(p[:3], p[:3]), p[3]) if p[3] else p for p in data])
    return result
