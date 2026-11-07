import unittest

from PIL import Image, ImageDraw

from bob_colors import BOB_PALETTE
from palette import PALETTE
from sprites import downscale, pixels


class BobRefinementTests(unittest.TestCase):
    def test_refinement_keeps_binary_silhouette_and_adds_interior_shade_steps(self):
        source = Image.new('RGBA', (40, 40))
        ImageDraw.Draw(source).polygon([(5, 35), (15, 5), (35, 35)], fill=(196, 196, 196, 255))
        old = downscale(source, .5)
        refined = downscale(source, .5, refined=True)
        self.assertEqual(refined.getchannel('A').tobytes(), old.getchannel('A').tobytes())
        visible = {p[:3] for p in pixels(refined) if p[3]}
        self.assertLessEqual(visible, set(BOB_PALETTE))
        self.assertTrue(visible - set(PALETTE))
        self.assertLessEqual({p[:3] for p in pixels(old) if p[3]}, set(PALETTE))
