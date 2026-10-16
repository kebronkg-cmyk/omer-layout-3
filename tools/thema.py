#!/usr/bin/env python3
"""Farbthema: überträgt die Markenfarben aus tools/daten.json auf das Grunddesign.

    python3 tools/thema.py

Liest die Vorlagen aus tools/vorlage/ (Stylesheet, Skript, Quellen der 3D-Szenen) und schreibt
die eingefärbten Fassungen nach assets/ bzw. tools/. Das Grunddesign arbeitet mit einem Blau;
jede Stelle dieses Blaus wird hier durch die Markenfarbe ersetzt (Hex, rgb() und rgba()).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
VORLAGE = WURZEL / 'tools' / 'vorlage'


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hexa(t):
    return '#' + ''.join(f'{max(0, min(255, round(v))):02x}' for v in t)


def mischen(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(rgb(a), rgb(b)))


def tabelle(th):
    """Grundblau → Markenfarben. th: a (Akzent), hell, eis, tief."""
    a, hell, eis, tief = th['a'], th['hell'], th['eis'], th['tief']
    mittel = hexa(mischen(a, '#7a8296', 0.45))
    dunkel = hexa(mischen(tief, '#05060a', 0.72))
    paare = {
        '#3f82ff': a, '#5b8cff': a, '#4f8dff': a, '#2f74ff': a, '#2a62d6': hexa(mischen(a, tief, .5)),
        '#8fbaff': hell, '#9cc2ff': hell, '#5f97ff': hexa(mischen(a, hell, .4)), '#a8c6ff': hell, '#c9d6ff': hexa(mischen(hell, '#ffffff', .5)),
        '#d9e7ff': eis, '#dde9ff': eis, '#c8d4ff': eis, '#b9d0ff': hexa(mischen(hell, eis, .5)), '#f2f7ff': hexa(mischen(eis, '#ffffff', .6)),
        '#8fd0ff': hexa(mischen(hell, eis, .3)), '#2f6bff': tief, '#1747c9': tief, '#1f5ee8': tief, '#14408f': tief, '#183a80': hexa(mischen(tief, '#05060a', .45)),
        '#0b2350': hexa(mischen(tief, '#05060a', .65)), '#0b1a3d': dunkel, '#0a1222': hexa(mischen(tief, '#05060a', .85)),
        '#5c7fc4': mittel, '#222b42': dunkel,
        '#020203': th.get('grund', '#020203'),   # Seitengrund, auch hinter den 3D-Szenen
    }
    rgbs = {
        (63, 130, 255): rgb(a), (91, 140, 255): rgb(a), (23, 71, 201): rgb(tief), (143, 186, 255): rgb(hell),
        (200, 225, 255): rgb(eis), (190, 220, 255): rgb(eis), (120, 170, 255): rgb(hell), (220, 235, 255): rgb(eis),
    }
    return paare, rgbs


def einfaerben(text, th):
    paare, rgbs = tabelle(th)
    for alt, neu in paare.items():
        text = re.sub(re.escape(alt), neu, text, flags=re.I)
    for (r, g, b), (R, G, B) in rgbs.items():
        text = text.replace(f'rgb({r} {g} {b}', f'rgb({R} {G} {B}')
        text = text.replace(f'rgba({r},{g},{b},', f'rgba({R},{G},{B},')
    # Lichtkopf im Ring: von Hell nach Weiß statt von Hellblau nach Weiß
    H = rgb(th['hell'])
    text = text.replace('`rgba(${(150 + 105 * t) | 0},${(195 + 60 * t) | 0},255,',
                        f'`rgba(${{({H[0]} + {255 - H[0]} * t) | 0}},${{({H[1]} + {255 - H[1]} * t) | 0}},${{({H[2]} + {255 - H[2]} * t) | 0}},')
    # kühle Dunkeltöne der Vorlage (Glasflächen) an den Seitengrund angleichen
    g = th.get('grund', '#020203')
    for alt, anteil in (('12 14 24', .045), ('20 20 28', .075)):
        R, G, B = (round(v) for v in mischen(g, '#ffffff', anteil))
        text = text.replace(f'rgb({alt} ', f'rgb({R} {G} {B} ')
    # Kopfkommentare der Vorlage auf die Marke umstellen
    text = text.replace("Omer's Hair Professional", MARKE)
    text = text.replace(' (Blau aus dem Leuchtschild am Isartor)', '')
    return text


MARKE = json.loads((WURZEL / 'tools' / 'daten.json').read_text())['marke']


if __name__ == '__main__':
    daten = json.loads((WURZEL / 'tools' / 'daten.json').read_text())
    th = daten['thema']
    ziele = {
        'site.css': WURZEL / 'assets' / 'css' / 'site.css',
        'site.js': WURZEL / 'assets' / 'js' / 'site.js',
        'glas3d.src.js': WURZEL / 'tools' / 'glas3d.src.js',
        'straehnen.src.js': WURZEL / 'tools' / 'straehnen.src.js',
    }
    for name, ziel in ziele.items():
        text = einfaerben((VORLAGE / name).read_text(), th)
        if name == 'site.css' and th.get('zusatz_css'):
            text += '\n' + (WURZEL / 'tools' / th['zusatz_css']).read_text()
        ziel.parent.mkdir(parents=True, exist_ok=True)
        ziel.write_text(text)
        print('eingefärbt:', ziel.relative_to(WURZEL))
