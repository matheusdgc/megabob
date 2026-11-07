"""Protect visual color roles and collision-independent sprite geometry."""
import unittest
from PIL import Image
from memory_colors import quiet_memory_layer, memory_tiles
from palette import PALETTE
from sprites import pixels


def signature(image):
    """Color-independent spatial pattern: equal input pixels must remain equal."""
    ids = {}
    return [ids.setdefault(pixel, len(ids)) for pixel in pixels(image)]


class MemoryColorsTests(unittest.TestCase):
    def test_scenery_preserves_every_texture_tone_and_alpha(self):
        source = Image.new('RGBA', (len(PALETTE), 2))
        source.putdata([(*rgb, 255) for rgb in PALETTE] * 2)
        source.putpixel((1, 1), (0, 0, 0, 0))
        result = quiet_memory_layer(source)
        self.assertEqual(result.getchannel('A').tobytes(), source.getchannel('A').tobytes())
        self.assertEqual(signature(result), signature(source))
        self.assertTrue(all(b > r for r, g, b, a in pixels(result) if a))

    def test_every_tile_keeps_its_texture_without_painting_new_edges(self):
        source = Image.new('RGBA', (384, 16))
        source.putdata([(*PALETTE[i % len(PALETTE)], 255) for i in range(384 * 16)])
        source.putpixel((5, 5), (0, 0, 0, 0))
        result = memory_tiles(source)
        self.assertEqual(result.getchannel('A').tobytes(), source.getchannel('A').tobytes())
        for i in range(24):
            box = (i * 16, 0, (i + 1) * 16, 16)
            self.assertEqual(signature(result.crop(box)), signature(source.crop(box)), f'tile {i}')
        self.assertEqual(result.crop((256, 0, 272, 16)).tobytes(), source.crop((256, 0, 272, 16)).tobytes())
        self.assertTrue(all(r > b for r, g, b, a in pixels(result.crop((16, 0, 32, 16))) if a))


if __name__ == '__main__':
    unittest.main()
