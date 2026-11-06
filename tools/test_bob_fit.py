"""Bounds regressions for Bob's armor importer; no generation service is used."""
import unittest

from PIL import Image

from sprites import CELL, Frame, fit_armor, place


class ArmorBoundsTests(unittest.TestCase):
    def test_fit_does_not_improve_overlap_by_cutting_off_armor_at_cell_edge(self):
        base = Frame(Image.new('RGBA', (10, 10), 'white'), None, 0)
        armor = Frame(Image.new('RGBA', (12, 10), 'white'), None, 0)

        class Sheet:
            crops = [armor.img]

            def frames(self, scale):
                return [armor]

        cell, _, _, _ = place(base, 0, CELL - 10)
        _, _, frames, picks = fit_armor([base], [(0, CELL - 10)], [cell], Sheet(), 1)
        dx, dy, _ = picks[0]
        self.assertGreaterEqual(dx, 0)
        self.assertGreaterEqual(dy, 0)
        self.assertLessEqual(dx + frames[0].img.width, CELL)
        self.assertLessEqual(dy + frames[0].img.height, CELL)

    def test_one_scale_fits_every_airdash_pose_and_never_enlarges_it(self):
        from sprites import bounded_scale
        crops = [Image.new('RGBA', (100, 50)), Image.new('RGBA', (80, 120))]
        scale = bounded_scale(crops, .6)
        self.assertEqual(scale, .4)
        self.assertEqual(bounded_scale(crops, .2), .2)
        for crop in crops:
            self.assertLessEqual(round(crop.width * scale), CELL)
            self.assertLessEqual(round(crop.height * scale), CELL)


if __name__ == '__main__':
    unittest.main()
