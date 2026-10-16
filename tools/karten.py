#!/usr/bin/env python3
"""Eigene Stadtpläne aus OpenStreetMap: Straßen als leuchtende Linien in der Markenfarbe auf Schwarz.

    python3 tools/karten.py

Lädt Straßen und Wasser einmal über Overpass (zwischengespeichert in tools/.osm/)
und schreibt SVG-Dateien nach assets/karten/. Kein Kartendienst wird beim Besuch
geladen, damit ist die Karte sofort sichtbar und datenschutzfreundlich.
Daten © OpenStreetMap-Mitwirkende, ODbL.
"""
from __future__ import annotations

import json
import math
import time
import urllib.parse
import urllib.request
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
CACHE = Path(__file__).resolve().parent / '.osm'
ZIEL = WURZEL / 'assets' / 'karten'
OVERPASS = ['https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter']

DATEN = json.loads((WURZEL / 'tools' / 'daten.json').read_text())
SALONS = DATEN['salons']
SEITE = 1.25   # Höhe = Breite / SEITE  (Querformat 5:4)

KLASSEN = {   # Straßenart → (Stufe, Strichbreite in Pixeln bei 1000 px Breite)
    'motorway': (0, 4.2), 'trunk': (0, 3.8), 'primary': (0, 3.2), 'secondary': (1, 2.4),
    'tertiary': (1, 1.9), 'unclassified': (2, 1.2), 'residential': (2, 1.1), 'living_street': (2, 1.0),
    'pedestrian': (2, 1.0), 'service': (3, .6),
}


def holen(name, abfrage):
    CACHE.mkdir(exist_ok=True)
    datei = CACHE / f'{name}.json'
    if datei.exists():
        return json.loads(datei.read_text())
    daten = urllib.parse.urlencode({'data': abfrage}).encode()
    for url in OVERPASS:
        for versuch in range(2):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, daten, {'User-Agent': 'stadtplan-entwurf/1.0'}), timeout=120) as r:
                    j = json.loads(r.read())
                datei.write_text(json.dumps(j))
                return j
            except Exception as fehler:  # noqa: BLE001
                print('  Overpass', url, fehler); time.sleep(3 * (versuch + 1))
    raise SystemExit('Overpass nicht erreichbar')


def merc(lat, lon):
    x = math.radians(lon) * 6378137
    y = math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) * 6378137
    return x, y


def vereinfachen(punkte, eps):
    """Douglas-Peucker, damit die Datei klein bleibt."""
    if len(punkte) < 3:
        return punkte
    (x1, y1), (x2, y2) = punkte[0], punkte[-1]
    dx, dy = x2 - x1, y2 - y1
    n = math.hypot(dx, dy) or 1e-9
    i_max, d_max = 0, 0.0
    for i, (x, y) in enumerate(punkte[1:-1], 1):
        d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / n
        if d > d_max:
            i_max, d_max = i, d
    if d_max <= eps:
        return [punkte[0], punkte[-1]]
    return vereinfachen(punkte[:i_max + 1], eps)[:-1] + vereinfachen(punkte[i_max:], eps)


def karte(name, lat, lon, halb):
    m_pro_grad = 111320 * math.cos(math.radians(lat))
    dlon = halb / m_pro_grad
    dlat = halb / SEITE / 111320
    s, w, n, o = lat - dlat * 1.1, lon - dlon * 1.1, lat + dlat * 1.1, lon + dlon * 1.1
    gross = halb > 3000
    arten = 'motorway|trunk|primary|secondary|tertiary' if gross else '|'.join(KLASSEN)
    abfrage = f'''[out:json][timeout:110];
(way["highway"~"^({arten})$"]({s},{w},{n},{o});
 way["waterway"~"^(river|canal)$"]({s},{w},{n},{o});
 way["natural"="water"]({s},{w},{n},{o});
 relation["natural"="water"]({s},{w},{n},{o});
 way["leisure"="park"]({s},{w},{n},{o}););
out geom;'''
    daten = holen(name, abfrage)

    B, H = 1000, 1000 / SEITE
    cx, cy = merc(lat, lon)
    skala = B / (2 * halb / math.cos(math.radians(lat)))   # Mercator dehnt um 1/cos(lat)
    def p(pt):
        x, y = merc(pt['lat'], pt['lon'])
        return ((x - cx) * skala + B / 2, H / 2 - (y - cy) * skala)

    stufen = {0: [], 1: [], 2: [], 3: []}
    wasser, gruen, fluss = [], [], []
    for el in daten['elements']:
        geo = el.get('geometry')
        teile = [geo] if geo else [m['geometry'] for m in el.get('members', []) if m.get('geometry')]
        tags = el.get('tags', {})
        for g in teile:
            pts = vereinfachen([p(q) for q in g], 0.6 if not gross else 0.9)
            if len(pts) < 2:
                continue
            d = 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in pts)
            if 'highway' in tags and tags['highway'] in KLASSEN:
                stufe, breite = KLASSEN[tags['highway']]
                stufen[stufe].append(d)
            elif tags.get('waterway'):
                fluss.append(d)
            elif tags.get('natural') == 'water':
                wasser.append(d + 'Z')
            elif tags.get('leisure') == 'park':
                gruen.append(d + 'Z')

    def lage(ds, **attr):
        if not ds:
            return ''
        a = ' '.join(f'{k.replace("_", "-")}="{v}"' for k, v in attr.items())
        return f'<path {a} d="{"".join(ds)}"/>'

    f = 1.0 if not gross else 0.8
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {B} {H:.0f}" preserveAspectRatio="xMidYMid slice">',
           '<defs><radialGradient id="v" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#0b1a3d" stop-opacity=".55"/><stop offset=".6" stop-color="#050507" stop-opacity="0"/></radialGradient></defs>',
           f'<rect width="{B}" height="{H:.0f}" fill="#050507"/>',
           f'<rect width="{B}" height="{H:.0f}" fill="url(#v)"/>',
           lage(gruen, fill='#0a1222', fill_opacity='.7'),
           lage(wasser, fill='#0b2350', fill_opacity='.85'),
           lage(fluss, fill='none', stroke='#14408f', stroke_width=f'{6 * f:.1f}', stroke_linecap='round', stroke_opacity='.8'),
           '<g fill="none" stroke-linecap="round" stroke-linejoin="round">',
           # Nebenstraßen: dunkles Blau, kein Schein
           lage(stufen[3], stroke='#183a80', stroke_width=f'{.8 * f:.2f}'),
           lage(stufen[2], stroke='#2a62d6', stroke_width=f'{1.35 * f:.2f}', stroke_opacity='.95'),
           # Hauptstraßen: breiter weicher Schein + heller Kern
           lage(stufen[1], stroke='#3f82ff', stroke_width=f'{7 * f:.1f}', stroke_opacity='.16'),
           lage(stufen[0], stroke='#3f82ff', stroke_width=f'{10 * f:.1f}', stroke_opacity='.18'),
           lage(stufen[1], stroke='#5f97ff', stroke_width=f'{2 * f:.1f}'),
           lage(stufen[0], stroke='#9cc2ff', stroke_width=f'{2.8 * f:.1f}'),
           '</g></svg>']
    ZIEL.mkdir(parents=True, exist_ok=True)
    out = ZIEL / f'{name}.svg'
    out.write_text(''.join(svg))
    print(out.relative_to(WURZEL), f'{out.stat().st_size // 1024} KB')
    return lambda la, lo: tuple(round(v / d * 100, 2) for v, d in zip(p({'lat': la, 'lon': lo}), (B, H)))


def ortsplan():
    """Name → Mittelpunkt (lat, lon), halbe Breite in Metern; Übersicht passt alle Salons ein."""
    orte = {s['id']: (s['lat'], s['lon'], 800) for s in SALONS}
    la = [s['lat'] for s in SALONS]; lo = [s['lon'] for s in SALONS]
    mla, mlo = (min(la) + max(la)) / 2, (min(lo) + max(lo)) / 2
    breite = (max(lo) - min(lo)) * 111320 * math.cos(math.radians(mla))
    hoehe = (max(la) - min(la)) * 111320
    halb = max(max(breite / 2, hoehe / 2 * SEITE) * 1.45 + 600, 1600)
    orte['uebersicht'] = (mla, mlo, halb)
    return orte


if __name__ == '__main__':
    import sys
    sys.path.insert(0, str(WURZEL / 'tools'))
    from thema import einfaerben
    lagen = {}
    for n, (la, lo, h) in ortsplan().items():
        lagen[n] = karte(n, la, lo, h)
        datei = ZIEL / f'{n}.svg'
        datei.write_text(einfaerben(datei.read_text(), DATEN['thema']))
    # Position der Salons auf der Übersichtskarte (Prozent), für die Nadeln im HTML
    pos = {s['id']: lagen['uebersicht'](s['lat'], s['lon']) for s in SALONS}
    (ZIEL / 'nadeln.json').write_text(json.dumps(pos))
    print('Nadeln', pos)
