#!/usr/bin/env python3
"""Bereitet die Fotos auf: Zuschnitt, einheitlicher Look, WebP in mehreren Breiten.

    python3 tools/bilder.py <ordner-mit-originalen>

Welche Datei zu welchem Bildnamen wird, steht in tools/daten.json unter "bilder":
    "name": {"datei": "...", "breiten": [900, 1600], "zuschnitt": [l, o, r, u], "seiten": 1.333}
hochrechnen: Faktor für kleine Originale. zuschnitt: Anteile (0 bis 1) des Originals. seiten: Seitenverhältnis Breite/Höhe, mittig zugeschnitten.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

WURZEL = Path(__file__).resolve().parent.parent
ZIEL = WURZEL / 'assets' / 'img'


def zuschneiden(im, z=None, seiten=None, oben=0.5):
    if z:
        w, h = im.size
        im = im.crop((round(z[0] * w), round(z[1] * h), round(z[2] * w), round(z[3] * h)))
    if seiten:
        w, h = im.size
        if w / h > seiten:
            nb = round(h * seiten); x = (w - nb) // 2
            im = im.crop((x, 0, x + nb, h))
        else:
            nh = round(w / seiten); y = round((h - nh) * oben)
            im = im.crop((0, y, w, y + nh))
    return im


def look(im, kontrast=1.06, hell=1.0):
    im = ImageEnhance.Contrast(im).enhance(kontrast)
    if hell != 1.0:
        im = ImageEnhance.Brightness(im).enhance(hell)
    return im


if __name__ == '__main__':
    quelle = Path(sys.argv[1])
    daten = json.loads((WURZEL / 'tools' / 'daten.json').read_text())
    ZIEL.mkdir(parents=True, exist_ok=True)
    for name, b in daten['bilder'].items():
        im = Image.open(quelle / b['datei']).convert('RGB')
        im = zuschneiden(im, b.get('zuschnitt'), b.get('seiten'), b.get('oben', 0.5))
        im = look(im, b.get('kontrast', 1.06), b.get('hell', 1.0))
        if b.get('hochrechnen'):   # kleine Originale behutsam vergrößern, damit sie auf großen Bildschirmen bestehen
            f = b['hochrechnen']
            im = im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=3))
        for breite in b.get('breiten', [900, 1600]):
            breite = min(breite, im.width)
            k = im.resize((breite, round(im.height * breite / im.width)), Image.LANCZOS) if breite < im.width else im
            k = k.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
            k.save(ZIEL / f'{name}-{breite}.webp', 'WEBP', quality=b.get('qualitaet', 80), method=6)
        print(name, im.size)
