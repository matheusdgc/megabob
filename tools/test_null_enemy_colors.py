import unittest

from PIL import Image

from null_enemy_colors import EYE, recolor_null_enemy
from sprites import pixels


class NullEnemyColorsTests(unittest.TestCase):
    def test_color_roles_preserve_the_pattern_alpha_and_input(self):
        image = Image.new('RGBA', (4, 2))
        colors = list(EYE)
        image.putdata([(*colors[0], 255), (*colors[1], 255), (*colors[0], 255), (0, 0, 0, 0),
                       (*colors[2], 255), (*colors[3], 255), (*colors[2], 255), (255, 255, 255, 255)])
        before = image.tobytes()
        result = recolor_null_enemy(image, 'enemy_void_eye')
        self.assertEqual(image.tobytes(), before)
        self.assertEqual(image.getchannel('A').tobytes(), result.getchannel('A').tobytes())
        def pattern(source):
            ids = {}
            return [ids.setdefault(p, len(ids)) for p in pixels(source)]
        self.assertEqual(pattern(image), pattern(result))

    def test_rejects_a_remap_that_would_flatten_two_distinct_tones(self):
        source = next(iter(EYE))
        image = Image.new('RGBA', (2, 1))
        image.putdata([(*source, 255), (*EYE[source], 255)])
        with self.assertRaisesRegex(ValueError, 'merge'):
            recolor_null_enemy(image, 'enemy_void_eye')
