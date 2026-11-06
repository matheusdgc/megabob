"""Regression tests for the raw-art importer; run: py -3 -m unittest discover -s tools -p test_art.py."""
import unittest

from PIL import Image, ImageDraw

from art import clean, grid_regions, pack, periodic, background_quantize, quantize
from sprites import pixels
from art_catalog import catalog


class ArtProcessingTests(unittest.TestCase):
    def test_crt_green_stays_on_the_green_ramp_instead_of_teal_noise(self):
        image = Image.new('RGBA', (2, 1))
        image.putdata([(10, 80, 20, 255), (50, 180, 70, 255)])
        result = quantize(image)
        self.assertEqual(result.getpixel((0, 0)), (25, 128, 56, 255))
        self.assertEqual(result.getpixel((1, 0)), (66, 190, 101, 255))

    def test_distant_towers_do_not_collapse_into_the_same_color_as_the_sky(self):
        image = Image.new('RGBA', (64, 32), (3, 60, 65, 255))
        ImageDraw.Draw(image).rectangle((16, 16, 32, 31), fill=(0, 40, 43, 255))
        result = background_quantize(image, 'memory_leak')
        self.assertNotEqual(result.getpixel((0, 0)), result.getpixel((24, 24)))
        self.assertEqual(result.getchannel('A').getextrema(), (255, 255))

    def test_catalog_has_unique_runtime_keys_when_legacy_jobs_expand(self):
        keys = [entry['key'] for entry in catalog()]
        self.assertEqual(len(keys), len(set(keys)))

    def test_key_removes_approximate_magenta_but_keeps_purple_and_white(self):
        image = Image.new('RGBA', (3, 1))
        image.putdata([(241, 12, 242, 255), (165, 110, 255, 255), (255, 255, 255, 255)])
        result = clean(image)
        self.assertEqual(result.getpixel((0, 0))[3], 0)
        self.assertEqual(result.getpixel((1, 0)), (165, 110, 255, 255))
        self.assertEqual(result.getpixel((2, 0)), (255, 255, 255, 255))

    def test_grid_keeps_the_intentional_empty_last_cell(self):
        image = Image.new('RGBA', (120, 40), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        draw.rectangle((5, 10, 25, 30), fill='white')
        draw.rectangle((45, 15, 65, 30), fill='white')
        regions = grid_regions(image, 3, 1)
        result = pack([regions[0, i] for i in range(3)], (16, 16), (12, 12), empty=[2])
        self.assertEqual(result.size, (48, 16))
        self.assertIsNotNone(result.crop((0, 0, 16, 16)).getbbox())
        self.assertIsNone(result.crop((32, 0, 48, 16)).getbbox())

    def test_unexpected_empty_frame_is_an_error_instead_of_being_dropped(self):
        with self.assertRaisesRegex(ValueError, 'empty'):
            pack([Image.new('RGBA', (20, 20))], (16, 16), (16, 16))

    def test_one_shared_scale_preserves_relative_sizes_and_ground(self):
        big = Image.new('RGBA', (40, 40))
        small = Image.new('RGBA', (40, 40))
        ImageDraw.Draw(big).rectangle((0, 0, 19, 19), fill='white')
        ImageDraw.Draw(small).rectangle((0, 0, 9, 9), fill='white')
        result = pack([big, small], (20, 20), (16, 16), anchor='bottom')
        a = result.crop((0, 0, 20, 20)).getbbox()
        b = result.crop((20, 0, 40, 20)).getbbox()
        self.assertEqual(a[3], b[3])
        self.assertEqual(a[2] - a[0], 2 * (b[2] - b[0]))

    def test_a_tiny_final_pixel_survives_shared_downscaling(self):
        big = Image.new('RGBA', (100, 100), 'white')
        tiny = Image.new('RGBA', (100, 100))
        tiny.putpixel((50, 50), (255, 255, 255, 255))
        result = pack([big, tiny], (16, 16), (12, 12))
        self.assertIsNotNone(result.crop((16, 0, 32, 16)).getbbox())

    def test_periodic_edges_match_without_partial_alpha_or_magenta(self):
        image = Image.new('RGBA', (32, 8), (0, 29, 108, 255))
        ImageDraw.Draw(image).rectangle((0, 4, 15, 7), fill=(0, 0, 0, 0))
        result = periodic(image, 4)
        self.assertEqual(pixels(result.crop((0, 0, 1, 8))),
                         pixels(result.crop((31, 0, 32, 8))))
        self.assertLessEqual(set(pixels(result.getchannel('A'))), {0, 255})


if __name__ == '__main__':
    unittest.main()
