import importlib.util
from pathlib import Path
import tempfile
import unittest

HAS_PILLOW = importlib.util.find_spec('PIL') is not None
spec = importlib.util.spec_from_file_location('visual', Path(__file__).parents[1] / 'scripts' / 'visual-diff.py')
visual = importlib.util.module_from_spec(spec)
spec.loader.exec_module(visual)


@unittest.skipUnless(HAS_PILLOW, 'Optional Pillow is not installed')
class VisualTest(unittest.TestCase):
    def test_pixel_change_tolerance_dimensions_and_output_protection(self):
        from PIL import Image
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            image = Image.new('RGB', (2, 2), 'white')
            image.save(root / 'golden.png')
            image.putpixel((0, 0), (240, 255, 255))
            image.save(root / 'current.png')
            report = visual.compare(root / 'golden.png', root / 'current.png', root / 'diff', 8)
            self.assertEqual(report['changedPixels'], 1)
            self.assertEqual(report['changedRatio'], .25)
            self.assertEqual(report['sourceDimensions'], [2, 2])
            self.assertIsNone(report['region'])
            self.assertEqual(report['automaticTestVerdict'], 'not-inferred')
            self.assertEqual(len(report['artifacts']), 3)
            with self.assertRaises(FileExistsError):
                visual.compare(root / 'golden.png', root / 'current.png', root / 'diff')
            report = visual.compare(root / 'golden.png', root / 'current.png', root / 'tolerated', 15)
            self.assertEqual(report['changedPixels'], 0)
            excluded = visual.compare(root / 'golden.png', root / 'current.png', root / 'excluded', 8, '1,0,1,1')
            self.assertEqual(excluded['changedPixels'], 0)
            self.assertEqual(excluded['totalPixels'], 1)
            self.assertEqual(excluded['sourceDimensions'], [2, 2])
            self.assertEqual(excluded['region'], [1, 0, 1, 1])
            with Image.open(root / 'excluded/golden.png') as cropped:
                self.assertEqual(cropped.size, (1, 1))
            inside = visual.compare(root / 'golden.png', root / 'current.png', root / 'inside', 8, (0, 0, 1, 1))
            self.assertEqual(inside['changedPixels'], 1)
            self.assertEqual(inside['dimensions'], [1, 1])
            for index, invalid_region in enumerate(['-1,0,1,1', '0,0,0,1', '1,1,2,1', (0, 0, True, 1)]):
                invalid_output = root / f'invalid-region-{index}'
                with self.assertRaises(ValueError):
                    visual.compare(root / 'golden.png', root / 'current.png', invalid_output, 8, invalid_region)
                self.assertFalse(invalid_output.exists())
            Image.new('RGB', (1, 1)).save(root / 'small.png')
            with self.assertRaises(ValueError):
                visual.compare(root / 'golden.png', root / 'small.png', root / 'invalid', 8, (0, 0, 1, 1))
            self.assertFalse((root / 'invalid').exists())


if __name__ == '__main__':
    unittest.main()
