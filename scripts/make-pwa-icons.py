"""Generate PWA / Apple / maskable icons for the Reconnct web app.

Style matches the Android app launcher: gold (#FFB900 -> #F9B402) square with
the white "reconnct" wordmark (public/reconnct-logo-white.png).

Run from frontend/:  python scripts/make-pwa-icons.py
Writes into public/icons/.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / "public" / "reconnct-logo-white.png"
OUT = ROOT / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

TOP = (0xFF, 0xB9, 0x00)
BOTTOM = (0xF9, 0xB4, 0x02)


def gold(size):
    img = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(1, size - 1)
        c = tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3))
        draw.line([(0, y), (size, y)], fill=c + (255,))
    return img


def icon(size, logo_width_ratio, rounded=False):
    img = gold(size)
    logo = Image.open(LOGO).convert("RGBA")
    w = round(size * logo_width_ratio)
    h = round(logo.height * w / logo.width)
    logo = logo.resize((w, h), Image.LANCZOS)
    img.alpha_composite(logo, ((size - w) // 2, (size - h) // 2))
    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=round(size * 0.22), fill=255)
        img.putalpha(mask)
    return img


# "any" purpose — full-bleed square, wordmark at ~68% width (like the launcher).
for s in (72, 96, 128, 144, 152, 192, 384, 512):
    icon(s, 0.68).save(OUT / f"icon-{s}.png", optimize=True)

# Maskable — Android may crop to a circle, keep the mark inside the 80% safe zone.
for s in (192, 512):
    icon(s, 0.56).save(OUT / f"maskable-{s}.png", optimize=True)

# Apple touch icon (iOS rounds it itself) + favicon sizes.
icon(180, 0.68).save(OUT / "apple-touch-icon.png", optimize=True)
icon(32, 0.8, rounded=True).save(OUT / "favicon-32.png", optimize=True)
icon(16, 0.85, rounded=True).save(OUT / "favicon-16.png", optimize=True)

print("icons written to", OUT)
