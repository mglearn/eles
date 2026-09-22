#!/usr/bin/env python3
"""Import generated photos into the site.

Reads ~/Desktop/eleimages/images/*.jpg (or a folder given as argv[1]) plus its
credits.json, and writes:
  assets/img/<name>.jpg        1600px wide, for banners and headers
  assets/img/thumb/<name>.jpg  720px wide, for catalog cards
  data/images.json             { "<name>": { "alt": "...", "w": .., "h": .. } }
Then run: node scripts/build.js
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else Path('~/Desktop/eleimages/images').expanduser()
OUT = ROOT / 'assets/img'
THUMB = OUT / 'thumb'
MANIFEST = ROOT / 'data/images.json'


def save(im, path, width, quality):
    w, h = im.size
    if w > width:
        im = im.resize((width, round(h * width / w)), Image.LANCZOS)
    im.save(path, 'JPEG', quality=quality, optimize=True, progressive=True)
    return im.size


def main():
    if not SRC.is_dir():
        sys.exit(f'No image folder at {SRC}')
    credits = {}
    for cfile in sorted(SRC.glob('*credits*.json')):   # credits.json, calendar-credits.json, …
        for c in json.loads(cfile.read_text()):
            credits[Path(c.get('file', '')).stem] = c
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    OUT.mkdir(parents=True, exist_ok=True)
    THUMB.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in SRC.iterdir() if p.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp'))
    missing_alt = []
    for p in files:
        name = p.stem.lower()
        im = ImageOps.exif_transpose(Image.open(p)).convert('RGB')  # drops metadata
        w, h = save(im, OUT / f'{name}.jpg', 1600, 80)
        save(im, THUMB / f'{name}.jpg', 720, 72)
        alt = (credits.get(p.stem) or credits.get(name) or {}).get('alt') or manifest.get(name, {}).get('alt', '')
        if not alt:
            missing_alt.append(name)
        manifest[name] = {'alt': alt, 'w': w, 'h': h}
    MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), indent=1, ensure_ascii=False) + '\n')
    print(f'Imported {len(files)} images from {SRC}')
    if missing_alt:
        print('Missing alt text (add "alt" in credits.json or data/images.json):', ', '.join(missing_alt))


if __name__ == '__main__':
    main()
