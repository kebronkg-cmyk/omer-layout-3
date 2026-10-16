# HaarWerk München: Designkonzept

Unverbindlicher Entwurf für eine neue Website von **HaarWerk München** (Marienplatz, Bogenhausen, Blowdry Bar im Oberpollinger).
Keine offizielle Website des Betriebs. Alle Seiten sind für Suchmaschinen gesperrt (`noindex`). Buchen führt zu den echten Kanälen (Salonkee, Treatwell), Anrufen zur echten Nummer.

Vorschau: https://kebronkg-cmyk.github.io/omer-layout-3/

## Aufbau
- `index.html`: Startseite mit 3D-Strähnen, Salon-Ring, Übersicht mit Stadtplan, Preis-Studio, Team, Einblicke
- `<salon>/index.html`: je Salon eine Seite mit Glasschrift in Rosé, Öffnungszeiten, Route, Stadtplan, Schema.org `HairSalon`
- `hinweis/`: Hinweis zum Konzept, Quellen, Link zum Impressum des Betriebs

Feminine Handschrift: Rosé und Champagner, Schreibschrift Allura (lokal eingebunden), weiche Formen (`tools/zusatz.css`).

## Bauen
```
python3 tools/thema.py              # Markenfarben und feminine Ergänzungen auf das Grunddesign
python3 tools/bilder.py <originale> # Fotos zuschneiden, WebP in mehreren Breiten
python3 tools/karten.py             # Stadtpläne aus OpenStreetMap
python3 tools/build.py              # Seiten aus tools/daten.json
```

## Offen, vom Betrieb bestätigen lassen
- Bogenhausen: Adresse, Telefon und Öffnungszeiten (nicht auf der eigenen Website)
- Preise für Marienplatz und Bogenhausen (öffentlich nur die Liste der Blowdry Bar)
- Zuordnung der Salonfotos
