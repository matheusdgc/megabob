"""Protect visual color roles and collision-independent sprite geometry."""
import unittest
from PIL import Image
from memory_colors import quiet_memory_layer, memory_tiles, luminance, SHADE, EDGE
from sprites import pixels


class MemoryColorsTests(unittest.TestCase):
    def test_scenery_cannot_reuse_bright_teal_hazard_or_bob_blue(self):
        source = Image.new('RGBA', (3, 1))
        source.putdata([(8, 189, 186, 255), (15, 98, 254, 255), (22, 22, 22, 0)])
        result = quiet_memory_layer(source)
        self.assertEqual(result.getchannel('A').tobytes(), source.getchannel('A').tobytes())
        self.assertTrue(all(luminance(pixel[:3]) <= luminance(SHADE) for pixel in pixels(result)))
        self.assertGreater((luminance(EDGE) + .05) / (luminance(SHADE) + .05), 8)

    def test_fill_is_quiet_but_hazard_pixels_and_tile_alpha_are_exact(self):
        source = Image.new('RGBA', (384, 16), (8, 189, 186, 255))
        source.putpixel((5, 5), (0, 0, 0, 0))
        source.putpixel((18, 3), (224, 224, 224, 255))
        result = memory_tiles(source)
        self.assertEqual(result.getchannel('A').tobytes(), source.getchannel('A').tobytes())
        self.assertEqual(set(pixels(result.crop((16, 0, 32, 16)))), {(*SHADE, 255)})
        self.assertEqual(result.crop((256, 0, 272, 16)).tobytes(), source.crop((256, 0, 272, 16)).tobytes())
        self.assertEqual(result.getpixel((0, 0)), (*EDGE, 255))


if __name__ == '__main__':
    unittest.main()
