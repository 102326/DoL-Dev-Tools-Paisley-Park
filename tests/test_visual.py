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
            self.assertEqual(report['automaticTestVerdict'], 'not-inferred')
            self.assertEqual(len(report['artifacts']), 3)
            with self.assertRaises(FileExistsError):
                visual.compare(root / 'golden.png', root / 'current.png', root / 'diff')
            report = visual.compare(root / 'golden.png', root / 'current.png', root / 'tolerated', 15)
            self.assertEqual(report['changedPixels'], 0)
            Image.new('RGB', (1, 1)).save(root / 'small.png')
            with self.assertRaises(ValueError):
                visual.compare(root / 'golden.png', root / 'small.png', root / 'invalid')
            self.assertFalse((root / 'invalid').exists())


if __name__ == '__main__':
    unittest.main()
