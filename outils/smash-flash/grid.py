"""Aperçu en grille : chaque pose dans une case avec son numéro « rangée.index »."""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from slice import slice_sheet, crop
from build_fighter import SHEETS
def grid(sheet, out, cell=64, cols=20, **kw):
    a, fg, lab, rows, bg = slice_sheet(os.path.join(SHEETS, sheet), **kw)
    items = [(r, i, c) for r, row in enumerate(rows) for i, c in enumerate(row)]
    font = ImageFont.load_default()
    n = len(items); R = (n + cols - 1) // cols
    W, H = cols * cell, R * (cell + 12)
    img = Image.new('RGB', (W, H), (40, 44, 70)); d = ImageDraw.Draw(img)
    for k, (r, i, c) in enumerate(items):
        sp = Image.fromarray(crop(a, fg, lab, c))
        s = min((cell - 4) / sp.width, (cell - 4) / sp.height, 2)
        sp = sp.resize((max(1, int(sp.width * s)), max(1, int(sp.height * s))), 0)
        x, y = (k % cols) * cell, (k // cols) * (cell + 12)
        col = (60, 70, 110) if r % 2 else (50, 56, 90)
        d.rectangle([x, y, x + cell - 1, y + cell + 11], fill=col)
        img.paste(sp, (x + (cell - sp.width) // 2, y + 12 + (cell - 12 - sp.height)), sp)
        d.text((x + 2, y), f'{r}.{i}', fill=(255, 230, 80), font=font)
    img.save(out); return [len(r) for r in rows]
if __name__ == '__main__':
    kw = eval(sys.argv[3]) if len(sys.argv) > 3 else {}
    print(grid(sys.argv[1], sys.argv[2], **kw))
