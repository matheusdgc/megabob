"""Composition regressions for Bob's armor importer; no generation service is used."""
import unittest

from PIL import Image

from sprites import CELL, Frame, fit_armor, place, region_masks, combo_cell


class ArmorBoundsTests(unittest.TestCase):
    def test_horizontal_pose_assigns_face_chest_rear_boot_and_cannon_to_their_parts(self):
        base = Image.new('RGBA', (CELL, CELL))
        for point in [(29, 39), (18, 40), (10, 40), (39, 40)]:
            base.putpixel(point, (255, 255, 255, 255))
        masks = region_masks(base, horizontal=True)
        for part, point in [('head', (29, 39)), ('body', (18, 40)),
                            ('legs', (10, 40)), ('arm', (39, 40))]:
            x, y = point
            self.assertTrue(masks[part][y][x], (part, point))
            self.assertEqual(sum(mask[y][x] for mask in masks.values()), 1)
        armor = Image.new('RGBA', (CELL, CELL), (69, 137, 255, 255))
        head_only = combo_cell(base, armor, ('head',), masks)
        self.assertEqual(head_only.getpixel((29, 39)), (69, 137, 255, 255))
        self.assertEqual(head_only.getpixel((18, 40)), base.getpixel((18, 40)))

    def test_shared_effect_frame_keeps_canonical_particles_and_position(self):
        base = Frame(Image.new('RGBA', (3, 9), (15, 98, 254, 255)), None, 4)
        armor = Frame(Image.new('RGBA', (4, 10), (69, 137, 255, 255)), None, 0)

        class Sheet:
            crops = [armor.img]

            def frames(self, scale):
                return [armor]

        cell, _, _, _ = place(base, 22, 30)
        _, _, frames, picks = fit_armor([base], [(22, 30)], [cell], Sheet(), 1, shared_frames=(0,))
        self.assertEqual(frames[0].img.tobytes(), base.img.tobytes())
        self.assertEqual(picks[0], (22, 30, 1.0))

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
