"""Local diagnostic image comparison. Pillow is optional; never installs it."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import uuid
import warnings


def compare(golden, current, output, tolerance=8, region=None):
    from PIL import Image, ImageChops
    if not isinstance(tolerance, int) or not 0 <= tolerance <= 255:
        raise ValueError('Tolerance must be 0..255')
    Image.MAX_IMAGE_PIXELS = 8_000_000
    warnings.simplefilter('error', Image.DecompressionBombWarning)
    def load(filename):
        filename = Path(filename)
        if filename.stat().st_size > 64 * 1024 * 1024:
            raise ValueError('Image file too large')
        with Image.open(filename) as source:
            if source.width * source.height > 8_000_000:
                raise ValueError('Image dimensions too large')
            rgba = source.convert('RGBA')
            background = Image.new('RGBA', rgba.size, (255, 255, 255, 255))
            return Image.alpha_composite(background, rgba).convert('RGB')
    before, after = load(golden), load(current)
    if before.size != after.size:
        raise ValueError('Image dimensions differ; no implicit resize')
    source_dimensions = list(before.size)
    if region is not None:
        if isinstance(region, str):
            parts = [part.strip() for part in region.split(',')]
            if len(parts) != 4 or any(not part.isdecimal() for part in parts):
                raise ValueError('Region must be x,y,width,height')
            region = tuple(map(int, parts))
        if not isinstance(region, (tuple, list)) or len(region) != 4 or any(type(part) is not int for part in region):
            raise ValueError('Region must be four integers')
        x, y, width, height = region
        if x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > before.width or y + height > before.height:
            raise ValueError('Region outside image')
        before = before.crop((x, y, x + width, y + height))
        after = after.crop((x, y, x + width, y + height))
        region = [x, y, width, height]
    difference = ImageChops.difference(before, after)
    red, green, blue = difference.split()
    maximum = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    histogram = maximum.histogram()
    pixels = before.width * before.height
    changed = sum(histogram[tolerance + 1:])
    incident = str(uuid.uuid4())
    report = {'schemaVersion': 1, 'incidentId': incident,
              'source': 'local image comparison', 'capturedAt': datetime.now(timezone.utc).isoformat(),
              'status': 'partial', 'sourceDimensions': source_dimensions, 'region': region,
              'dimensions': list(before.size), 'tolerance': tolerance,
              'changedPixels': changed, 'totalPixels': pixels, 'changedRatio': changed / pixels,
              'meanMaxChannelDifference': sum(i * count for i, count in enumerate(histogram)) / pixels,
              'automaticTestVerdict': 'not-inferred', 'conditionsVerified': False,
              'compositing': 'RGBA over white; embedded metadata omitted',
              'requiresPrivacyReview': True, 'artifacts': []}
    destination = Path(output)
    destination.mkdir()  # Exclusive. Existing output and partial artifacts are preserved.
    try:
        for name, image in [('golden.png', before), ('current.png', after), ('diff.png', difference)]:
            with (destination / name).open('xb') as stream:
                image.save(stream, format='PNG')
            digest = hashlib.sha256((destination / name).read_bytes()).hexdigest()
            report['artifacts'].append({'filename': name, 'sha256': digest, 'incidentId': incident})
        report['status'] = 'complete'
    finally:
        with (destination / 'manifest.json').open('x', encoding='utf-8') as stream:
            json.dump(report, stream, indent=2)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--golden', type=Path, required=True)
    parser.add_argument('--current', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--tolerance', type=int, default=8)
    parser.add_argument('--region', help='x,y,width,height within both original images')
    args = parser.parse_args()
    try:
        report = compare(args.golden, args.current, args.out, args.tolerance, args.region)
    except ModuleNotFoundError:
        parser.exit(2, 'Optional visual comparison needs Python with Pillow; other tools remain available.\n')
    except Exception:
        parser.exit(1, 'Visual comparison failed: check equal dimensions, readable images and new output directory. Raw errors omitted.\n')
    print(f"Visual comparison {report['status']}; diagnostic statistics do not decide release acceptance.")


if __name__ == '__main__':
    main()
