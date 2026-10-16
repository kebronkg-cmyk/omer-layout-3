#!/usr/bin/env python3
"""Baut alle Seiten aus tools/daten.json.

    python3 tools/thema.py     # Markenfarben auf Grunddesign übertragen
    python3 tools/karten.py    # Stadtpläne aus OpenStreetMap (einmal)
    python3 tools/build.py     # Seiten schreiben

Designkonzept: Die Seiten sind ein unverbindlicher Entwurf und keine offizielle Website des Betriebs.
Sie sind für Suchmaschinen gesperrt; Buchen und Anrufen führen zu den echten Kanälen des Betriebs.
"""
from __future__ import annotations

import hashlib
import html
import json
from pathlib import Path
from urllib.parse import quote_plus

WURZEL = Path(__file__).resolve().parent.parent
D = json.loads((WURZEL / 'tools' / 'daten.json').read_text())
SALONS = D['salons']
e = html.escape

ICO = {
    'kalender': '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    'telefon': '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M5.2 3.5h3.1l1.6 4.3-2.2 1.5a11.5 11.5 0 0 0 7 7l1.5-2.2 4.3 1.6v3.1a2 2 0 0 1-2.1 2A16.6 16.6 0 0 1 3.2 5.6a2 2 0 0 1 2-2.1Z"/></svg>',
    'route': '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/></svg>',
    'pfeil': '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    'extern': '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 16 16 8M9.5 8H16v6.5"/></svg>',
    'insta': '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.9"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor" stroke="none"/></svg>',
    'stern': '<svg class="ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3.2 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.5l6.1-.7Z"/></svg>',
    'ort': '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/><circle cx="12" cy="12" r="7"/></svg>',
    'zu': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    'links': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    'rechts': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    'chat': '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1.3-4A8 8 0 1 1 8.4 19Z"/></svg>',
    'schere': '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="6.5" cy="17" r="2.8"/><circle cx="17.5" cy="17" r="2.8"/><path d="M8.5 15 17 3.5M15.5 15 7 3.5"/></svg>',
}

TAGE = [('1', 'Montag'), ('2', 'Dienstag'), ('3', 'Mittwoch'), ('4', 'Donnerstag'), ('5', 'Freitag'), ('6', 'Samstag'), ('0', 'Sonntag')]


def ver(pfad):
    datei = WURZEL / pfad
    return '?v=' + hashlib.md5(datei.read_bytes()).hexdigest()[:8] if datei.exists() else ''


def breiten(name):
    """Vorhandene Breiten eines Bildes (assets/img/<name>-<b>.webp)."""
    bs = sorted(int(f.stem.rsplit('-', 1)[1]) for f in (WURZEL / 'assets/img').glob(f'{name}-*.webp') if f.stem.rsplit('-', 1)[1].isdigit())
    return bs or [900]


def bild(name, alt, p, groessen='(max-width: 40rem) 90vw, 33vw', laden='lazy', klasse='', prio=False):
    bs = breiten(name)
    u = lambda b: f'{p}assets/img/{name}-{b}.webp' + ver(f'assets/img/{name}-{b}.webp')
    srcset = ', '.join(f'{u(b)} {b}w' for b in bs)
    attr = f' class="{klasse}"' if klasse else ''
    fp = ' fetchpriority="high"' if prio else ''
    return f'<img{attr} src="{u(bs[0])}" srcset="{srcset}" sizes="{groessen}" alt="{e(alt)}" loading="{laden}" decoding="async"{fp}>'


def gross_src(name, p):
    return f'{p}assets/img/{name}-{breiten(name)[-1]}.webp'


def route(s):
    return 'https://www.google.com/maps/dir/?api=1&destination=' + quote_plus(f"{D['marke']}, {s['strasse']}, {s['plz']} {s['ort']}")


def zeiten_attr(s):
    return e(json.dumps(s['zeiten'], separators=(',', ':')))


def riesen(woerter, klasse='', tag='p'):
    teile, b = [], 0
    for w in woerter:
        z = ''
        for ch in w:
            z += f'<span class="b chrom" style="--b:{b}">{e(ch)}</span>'
            b += 1
        teile.append(f'<span class="w">{z}</span>')
    return f'<{tag} class="riesen marke-text {klasse}" aria-hidden="true">{" ".join(teile)}</{tag}>'


def buchen_knopf(s, klasse='knopf', text='Termin buchen'):
    if s.get('buchen'):
        return f'<a class="{klasse}" href="{s["buchen"]}" rel="noopener">{ICO["kalender"]}<span>{text}</span></a>'
    return f'<a class="{klasse}" href="tel:{s["tel_int"]}">{ICO["telefon"]}<span>Anrufen</span></a>'


# ---------------------------------------------------------------- Rahmen

VORHANG = ("<script>(function(d){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;"
           "d.dataset.vorhang='zu';var k='kz-vorhang';if(sessionStorage.getItem(k))d.dataset.vorhangArt='kurz';"
           "sessionStorage.setItem(k,'1')}catch(e){}})(document.documentElement)</script>")


def kopf(p, titel, beschreibung, *, drei=None, vorladen=None):
    extra = f'<script type="module" src="{p}assets/js/{drei}.js{ver(f"assets/js/{drei}.js")}"></script>\n' if drei else ''
    vor = f'<link rel="preload" as="image" href="{vorladen}" fetchpriority="high">\n' if vorladen else ''
    schriften = ''.join(f'<link rel="preload" href="{p}assets/fonts/{f}" as="font" type="font/woff2" crossorigin>\n' for f in D.get('schriften_vorladen', ['jost-latin-wght-normal.woff2']))
    return f'''<!doctype html>
<html lang="de" class="js-aus">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{VORHANG}
<title>{e(titel)}</title>
<meta name="description" content="{e(beschreibung)}">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="{D['thema'].get('grund', '#020203')}">
{schriften}{vor}<link rel="stylesheet" href="{p}assets/css/site.css{ver("assets/css/site.css")}">
<script src="{p}assets/js/site.js{ver("assets/js/site.js")}" defer></script>
{extra}</head>
'''


def marke_html(p):
    if D.get('logo'):
        return f'<img src="{p}assets/img/{D["logo"]}" alt="{e(D["marke"])}" width="200" height="80">'
    return f'<span class="wortmarke">{D["wortmarke_html"]}</span>'


def navi():
    eintraege = [('Salons', 'index.html#salons', 'start')]
    for s in SALONS:
        eintraege.append((s['kurzname'], f'{s["id"]}/', s['id']))
    return eintraege[:5]


def leiste(p, aktiv=None, termin=None):
    nv = navi()
    spalten = ''.join(f'<a href="{p}{h}"{" aria-current=\"page\"" if k == aktiv else ""}>{e(t)}</a>' for t, h, k in nv)
    menue = ''.join(f'<li><a href="{p}{h}"{" aria-current=\"page\"" if k == aktiv else ""}>{e(t)}<small>{i + 1:02d}</small></a></li>' for i, (t, h, k) in enumerate(nv))
    href, text, extern = termin or (f'{p}index.html#salons', 'Termin', False)
    ext = ' rel="noopener"' if extern else ''
    return f'''<div class="vorhang" aria-hidden="true">
  <div class="vorhang-spalten">{'<i></i>' * 6}</div>
  <div class="vorhang-mitte">{marke_html(p)}<span class="vorhang-zahl">000</span></div>
</div>
<a class="sprung" href="#inhalt">Zum Inhalt springen</a>
<div class="raster" aria-hidden="true"></div>
<header class="kopf">
  <div class="huelle kopf-innen">
    <a class="marke" href="{p}index.html" aria-label="{e(D['marke'])}, Startseite">{marke_html(p)}</a>
    <nav class="spalten" aria-label="Hauptnavigation">{spalten}</nav>
    <div class="kopf-termin"><a class="knopf knopf-klein" href="{href}"{ext}>{ICO["kalender"]}<span>{text}</span></a></div>
    <button class="kopf-menue" type="button" popovertarget="menue" aria-label="Menü öffnen"><span></span></button>
  </div>
</header>
<div class="menue" id="menue" popover>
  <button class="menue-zu" type="button" popovertarget="menue" popovertargetaction="hide" aria-label="Menü schließen">{ICO["zu"]}</button>
  <nav aria-label="Menü"><ul>{menue}<li><a href="{p}hinweis/">Hinweis<small>{len(nv) + 1:02d}</small></a></li></ul></nav>
  <div class="knoepfe"><a class="knopf" href="{href}"{ext}>{ICO["kalender"]}<span>Termin buchen</span></a></div>
</div>
'''


def fuss(p):
    orte = []
    for s in SALONS:
        orte.append(f'''<li><h3><a href="{p}{s["id"]}/">{e(s["name"])}</a></h3><address>{e(s["strasse"])}<br>{s["plz"]} {e(s["ort"])}</address>
<p><a class="tel" href="tel:{s["tel_int"]}">{e(s["tel"])}</a><br>{e(s["zeiten_text"]).replace(" · ", "<br>")}</p></li>''')
    social = ''.join(f'<li><a href="{u}" rel="noopener">{e(n)}</a></li>' for n, u in D.get('social', []))
    return f'''<footer class="fuss">
  <div class="huelle">
    <ul class="fuss-orte"><li class="fuss-etikett"><span class="etikett">Salons</span></li>{''.join(orte)}</ul>
    <div class="fuss-unten">
      <span>{e(D['marke'])} · Designkonzept, keine offizielle Website</span>
      <ul>{social}<li><a href="{p}hinweis/">Hinweis &amp; Impressum</a></li></ul>
    </div>
    {riesen(D['riesen'], 'passend')}
  </div>
</footer>
'''


def ende():
    return '</body>\n</html>\n'


def schema_salon(s, p=''):
    namen = {'1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday', '0': 'Sunday'}
    f = lambda h: f'{int(h):02d}:{round((h % 1) * 60):02d}'
    return {
        '@context': 'https://schema.org', '@type': D.get('schema_typ', 'HairSalon'), 'name': f"{D['marke']} {s['kurzname']}",
        'telephone': s['tel_int'],
        'address': {'@type': 'PostalAddress', 'streetAddress': s['strasse'], 'postalCode': s['plz'], 'addressLocality': s['ort'], 'addressCountry': 'DE'},
        'geo': {'@type': 'GeoCoordinates', 'latitude': s['lat'], 'longitude': s['lon']},
        'openingHoursSpecification': [{'@type': 'OpeningHoursSpecification', 'dayOfWeek': namen[t], 'opens': f(a), 'closes': f(b)} for t, fe in s['zeiten'].items() for a, b in fe],
    }


def schreiben(pfad, inhalt):
    ziel = WURZEL / pfad
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(inhalt, encoding='utf-8')
    print('geschrieben:', pfad, f'{len(inhalt.encode()) // 1024} KB')


# ---------------------------------------------------------------- Bausteine

def ring_karte(s, p, i):
    href = f'{p}{s["id"]}/'
    haupt = buchen_knopf(s)
    zweit = f'<a class="knopf-still" href="{href}" data-salon><span>Zur Seite</span>{ICO["pfeil"]}</a>'
    return f'''<li class="ring-karte" data-lat="{s["lat"]}" data-lon="{s["lon"]}" aria-roledescription="Folie" aria-label="{i + 1} von {len(SALONS)}: {e(s["name"])}">
        <a class="ring-bild" href="{href}" aria-label="{e(s["name"])}">{bild(s["karte"], s["karte_alt"], p, "(max-width: 52rem) 74vw, 34vw", "eager")}</a>
        <div class="ring-info">
          <p class="ring-lage">{e(s["lage"])}</p>
          <h2><a href="{href}">{e(s["name"])}</a></h2>
          <address>{e(s["strasse"])} · {s["plz"]} {e(s["ort"])}</address>
          <p class="stand" data-zeiten="{zeiten_attr(s)}">{e(s["zeiten_text"])}</p>
          <div class="knoepfe">{haupt}{zweit}</div>
        </div>
      </li>'''


def ue_zeile(s, p, i):
    tun = buchen_knopf(s, 'knopf knopf-klein', 'Termin') if s.get('buchen') else f'<a class="knopf-still knopf-klein" href="tel:{s["tel_int"]}">{ICO["telefon"]}<span>Anrufen</span></a>'
    return (f'<li><div class="ue-name"><span class="nr">{i + 1:02d}</span><div><a href="{p}{s["id"]}/">{e(s["name"])}</a><small>{e(s["lage"])}</small></div></div>'
            f'<p class="ue-adresse">{e(s["strasse"])},<br> {s["plz"]} {e(s["ort"])}</p>'
            f'<p class="ue-stand"><span class="stand" data-zeiten="{zeiten_attr(s)}">{e(s["zeiten_text"])}</span></p>'
            f'<p class="ue-tel"><a href="tel:{s["tel_int"]}">{e(s["tel"])}</a></p>'
            f'<div class="ue-tun">{tun}</div></li>')


def uebersichtsplan(p):
    pos = json.loads((WURZEL / 'assets/karten/nadeln.json').read_text())
    nadeln = []
    for s in SALONS:
        x, y = pos[s['id']]
        nadeln.append(f'<a class="plan-punkt{" links" if x > 66 else ""}" href="{p}{s["id"]}/" style="left:{x}%;top:{y}%"><span class="plan-nadel"><i></i></span><span class="plan-name">{e(s["kurzname"])}</span></a>')
    datei = 'assets/karten/uebersicht.svg'
    return f'''<div class="stadtplan stadtplan-gross">
        <img src="{p}{datei}{ver(datei)}" alt="Stadtplan mit allen Salons von {e(D['marke'])}" loading="lazy" decoding="async">
        {''.join(nadeln)}
        <small class="plan-quelle">Karte © OpenStreetMap-Mitwirkende</small>
      </div>'''


def stadtplan(s, p):
    datei = f'assets/karten/{s["id"]}.svg'
    return f'''<a class="stadtplan" href="{route(s)}" rel="noopener" aria-label="Route zu {e(s['name'])} in Google Maps öffnen">
          <img src="{p}{datei}{ver(datei)}" alt="" loading="lazy" decoding="async">
          <span class="plan-nadel" style="left:50%;top:50%" aria-hidden="true"><i></i></span>
          <span class="plan-schild" style="left:50%;top:50%"><b>{e(s["name"])}</b>{e(s["strasse"])}</span>
          <span class="plan-route">{ICO["route"]}<span>Route öffnen</span></span>
          <small class="plan-quelle">Karte © OpenStreetMap-Mitwirkende</small>
        </a>'''


def zeiten_tabelle(s):
    f = lambda h: f'{int(h)}:{round((h % 1) * 60):02d}'
    zeilen = []
    for t, name in TAGE:
        fe = s['zeiten'].get(t, [])
        wert = ' · '.join(f'{f(a)} bis {f(b)} Uhr' for a, b in fe) or 'geschlossen'
        zeilen.append(f'<tr data-tag="{t}"><th scope="row">{name}</th><td>{wert}</td></tr>')
    return f'''<table class="zeiten"><caption class="nur-vorleser">Öffnungszeiten {e(s["name"])}</caption><tbody>{''.join(zeilen)}</tbody></table>
        <p class="zeiten-hinweis">An Feiertagen geschlossen.</p>'''


def galerie(bilder, p):
    k = ''.join(f'<button type="button" data-gross="{gross_src(n, p)}" aria-label="{e(a)}, groß anzeigen">{bild(n, a, p, "(max-width: 40rem) 92vw, 33vw")}</button>' for n, a in bilder)
    return f'<div class="galerie" data-anzahl="{len(bilder)}">{k}</div>'


def gross_dialog():
    return f'''<dialog class="gross" id="gross" aria-label="Bild groß">
  <figure style="margin:0"><figcaption></figcaption></figure>
  <button class="gross-zu" type="button" aria-label="Schließen">{ICO["zu"]}</button>
  <button class="gross-knopf gross-zurueck" type="button" aria-label="Vorheriges Bild">{ICO["links"]}</button>
  <button class="gross-knopf gross-vor" type="button" aria-label="Nächstes Bild">{ICO["rechts"]}</button>
</dialog>
'''


def preis_spanne(pr):
    if not pr:
        return '', ''
    z = pr.replace(' €', '').replace(',', '.')
    if z.startswith('ab '):
        return z[3:], ''
    if ' bis ' in z:
        a, b = z.split(' bis ')
        return a, b
    return z, z


def leistungen_block(p, buchen):
    """Mit Preisen: Preis-Studio (Reiter, Antippen, Richtwert). Ohne Preise: Leistungskacheln."""
    gruppen = D.get('preise')
    if gruppen:
        reiter = ''.join(f'<a class="ps-reiter" href="#art-{g["id"]}" role="tab" id="tab-{g["id"]}" aria-controls="art-{g["id"]}" data-reiter="{g["id"]}"><span>{e(g["reiter"])}</span><small>{len(g["zeilen"])}</small></a>' for g in gruppen)
        tafeln = []
        for g in gruppen:
            kacheln, mins = [], []
            for n, x, pr in g['zeilen']:
                a, b = preis_spanne(pr)
                if a:
                    mins.append(float(a))
                kacheln.append(f'<li><button type="button" class="ps-leistung" aria-pressed="false" data-name="{e(n)}" data-min="{a}" data-max="{b}"><span class="ps-haken" aria-hidden="true"></span><span class="ps-name">{e(n)}{f"<small>{e(x)}</small>" if x else ""}</span><span class="ps-preis{" anfrage" if not pr else ""}">{e(pr) if pr else "auf Anfrage"}</span></button></li>')
            ab = f'{min(mins):g}'.replace('.', ',') if mins else ''
            tafeln.append(f'''<div class="ps-tafel" id="art-{g["id"]}" role="tabpanel" aria-labelledby="tab-{g["id"]}">
            <div class="ps-tafel-kopf"><div><h3>{e(g["titel"])}</h3><p>{e(g.get("text", ""))}</p></div><p class="ps-ab"><small>ab</small><b class="chrom">{ab}</b><small>€</small></p></div>
            <ul class="ps-liste">{''.join(kacheln)}</ul></div>''')
        return f'''<div class="preis-studio" data-buchen="{buchen}">
        <nav class="ps-reiter-leiste" role="tablist" aria-label="Preisgruppen"><span class="ps-licht" aria-hidden="true"></span>{reiter}</nav>
        <div class="ps-tafeln">{''.join(tafeln)}</div>
        <div class="ps-summe" aria-live="polite">
          <div class="ps-summe-text"><p class="ps-summe-titel">Ihr Termin</p><p class="ps-summe-wert"><span data-summe>Tippen Sie Leistungen an</span></p><p class="ps-summe-auswahl" data-auswahl></p></div>
          <div class="ps-summe-knoepfe"><button class="knopf-still knopf-klein" type="button" data-leeren hidden>Leeren</button><a class="knopf" href="{buchen}" rel="noopener">{ICO["kalender"]}<span class="ps-lang">Termin buchen</span><span class="ps-kurz">Buchen</span></a></div>
        </div>
        <p class="ps-hinweis">{e(D.get("preise_hinweis", "Inklusive Mehrwertsteuer. Die Summe ist ein Richtwert."))}</p>
      </div>'''
    kacheln = ''.join(f'<li><span class="nr">{i + 1:02d}</span><h3>{e(l["name"])}</h3><p>{e(l["text"])}</p></li>' for i, l in enumerate(D['leistungen']))
    return f'<ul class="haus-liste leistung-raster">{kacheln}</ul>'


def team_block(p):
    t = D.get('team')
    if not t:
        return ''
    k = ''.join(f'<li class="person"><figure>{bild(m["bild"], m["name"] + ", " + m["rolle"], p, "(max-width: 40rem) 46vw, 22vw")}<figcaption><b>{e(m["name"])}</b><span>{e(m["rolle"])}</span></figcaption></figure></li>' for m in t)
    return f'<ul class="team">{k}</ul>'


def abschnitt(nr, etikett, titel, inhalt, anker='', text='', klasse=''):
    a = f' id="{anker}"' if anker else ''
    tid = (anker or etikett.lower().replace(' ', '-')) + '-titel'
    p = f'<p>{text}</p>' if text else ''
    return f'''<section class="abschnitt {klasse}"{a} aria-labelledby="{tid}">
    <div class="huelle">
      <div class="abschnitt-kopf">
        <p class="etikett"><b>{nr}</b> {etikett}</p>
        <h2 class="titel-m" id="{tid}">{titel}</h2>
        {p}
      </div>
      {inhalt}
    </div>
  </section>
'''


# ---------------------------------------------------------------- Startseite

def startseite():
    p = ''
    s0 = SALONS[0]
    buchen0 = s0.get('buchen') or f'tel:{s0["tel_int"]}'
    seite = kopf(p, D['titel'], D['beschreibung'], drei='straehnen', vorladen=f'assets/img/auftakt-poster.webp{ver("assets/img/auftakt-poster.webp")}')
    seite += '<body>\n' + leiste(p, 'start')
    h1a, h1b = D['h1']
    w = D.get('bewertung')
    wert = f'<p class="auftakt-wertung">{ICO["stern"]}<span><b>{w["wert"]}</b> · {w["anzahl"]} Bewertungen auf {e(w["quelle"])}</span></p>' if w else ''
    seite += f'''<main id="inhalt">
  <section class="auftakt" data-glas aria-labelledby="auftakt-titel">
    <img class="auftakt-poster" src="{p}assets/img/auftakt-poster.webp{ver("assets/img/auftakt-poster.webp")}" alt="" aria-hidden="true" fetchpriority="high">
    <canvas class="auftakt-3d" aria-hidden="true"></canvas>
    <div class="huelle glas-raster" aria-hidden="true">{'<i></i>' * 5}</div>
    <div class="huelle auftakt-oben">{riesen(D['riesen'], 'passend')}</div>
    <div class="huelle auftakt-unten">
      <div class="auftakt-text">
        <p class="etikett">{e(D['etikett'])}</p>
        <h1 id="auftakt-titel">{e(h1a)} <span>{e(h1b)}</span></h1>
        <div class="knoepfe">
          <button class="knopf" type="button" data-finder>{ICO["ort"]}<span>Nächsten Salon finden</span></button>
          <a class="knopf-still" href="#salons"><span>Alle Salons</span>{ICO["pfeil"]}</a>
        </div>
        <p class="finder-antwort" aria-live="polite"></p>
        {wert}
      </div>
      <div class="auftakt-staende" data-offen-zaehler><b>{len(SALONS)}</b><span>Salons jetzt geöffnet</span>
        <a class="runter" href="#salons">Scrollen<i aria-hidden="true"></i></a></div>
    </div>
  </section>

  <section class="ring-abschnitt" id="salons" data-ring aria-labelledby="ring-titel">
    <div class="huelle abschnitt-kopf" style="margin-bottom:0">
      <p class="etikett"><b>01</b> Salons</p>
      <h2 class="titel-m" id="ring-titel">{e(D['ring_titel'])}</h2>
      <div class="kopf-seite ring-finder">
        <button class="knopf-still" type="button" data-finder>{ICO["ort"]}<span>Nächsten Salon finden</span></button>
        <p class="finder-antwort" aria-live="polite"></p>
      </div>
    </div>
    <div class="ring-buehne">
      <ul class="ring" aria-label="Unsere Salons. Ziehen, wischen oder Pfeiltasten">
      {''.join(ring_karte(s, p, i) for i, s in enumerate(SALONS))}
      </ul>
      <span class="ring-schatten" aria-hidden="true"></span>
    </div>
    <div class="huelle ring-panel">
      <div class="ring-panel-info" aria-live="polite"></div>
      <div class="ring-steuer">
        <button class="ring-pfeil" type="button" data-ring-zurueck aria-label="Vorheriger Salon">{ICO["links"]}</button>
        <button class="ring-pfeil" type="button" data-ring-vor aria-label="Nächster Salon">{ICO["rechts"]}</button>
        <span class="zaehler">01 / {len(SALONS):02d}</span>
      </div>
    </div>
  </section>

  {abschnitt("02", "Auf einen Blick", "Alle Salons, Zeiten und Nummern.", f'<div class="ue-raster"><ul class="uebersicht">{"".join(ue_zeile(s, p, i) for i, s in enumerate(SALONS))}</ul>{uebersichtsplan(p)}</div>')}
  {abschnitt("03", "Leistungen", e(D['leistungen_titel']), leistungen_block(p, buchen0), 'leistungen', e(D.get('leistungen_text', '')))}
'''
    nr = 4
    if D.get('team'):
        seite += abschnitt(f'{nr:02d}', 'Team', e(D['team_titel']), team_block(p), 'team', e(D.get('team_text', '')))
        nr += 1
    if D.get('galerie'):
        seite += abschnitt(f'{nr:02d}', 'Einblicke', e(D['galerie_titel']), galerie([(g[0], g[1]) for g in D['galerie']], p), 'einblicke')
        nr += 1
    if D.get('social_kanaele'):
        k = ''.join(f'<a class="knopf-still" href="{u}" rel="noopener">{ICO["chat" if "wa.me" in u else "insta"]}<span>{e(n)}</span></a>' for n, u in D['social_kanaele'])
        seite += f'''<section class="abschnitt anschluss" aria-labelledby="social-titel">
    <div class="huelle"><div class="ruf"><div><h2 id="social-titel">{e(D["social_titel"])}</h2><p>{e(D["social_text"])}</p></div><div class="knoepfe">{k}</div></div></div>
  </section>
'''
    seite += '</main>\n' + gross_dialog() + fuss(p) + ende()
    schreiben('index.html', seite)


# ---------------------------------------------------------------- Standortseiten

def poster_pfad(sid, p, art='quer'):
    datei = f'assets/img/glas-{sid}-{art}.webp'
    return f'{p}{datei}{ver(datei)}'


def seite_salon(s):
    p = '../'
    ld = json.dumps(schema_salon(s), ensure_ascii=False, separators=(',', ':'))
    seite = kopf(p, f"{s['name']} | {D['marke']}", s['beschreibung'], drei='glas3d', vorladen=poster_pfad(s['id'], p))
    seite = seite.replace('</head>', f'<script type="application/ld+json">{ld}</script>\n</head>')
    termin = (s['buchen'], 'Termin', True) if s.get('buchen') else (f'tel:{s["tel_int"]}', 'Anrufen', False)
    seite += '<body>\n' + leiste(p, s['id'], termin)
    knoepfe = [buchen_knopf(s)]
    if s.get('buchen'):
        knoepfe.append(f'<a class="knopf-still" href="tel:{s["tel_int"]}">{ICO["telefon"]}<span>Anrufen</span></a>')
    knoepfe.append(f'<a class="knopf-still" href="{route(s)}" rel="noopener">{ICO["route"]}<span>Route</span></a>')
    kapitel = [('laden', 'Laden'), ('leistungen', 'Leistungen'), ('anfahrt', 'Anfahrt')]
    kap = ''.join(f'<a href="#{k}"><small>{i + 1:02d}</small>{t}</a>' for i, (k, t) in enumerate(kapitel))
    kap += buchen_knopf(s, 'knopf knopf-klein kapitel-termin', 'Termin buchen') if s.get('buchen') else f'<a class="knopf knopf-klein kapitel-termin" href="tel:{s["tel_int"]}">{ICO["telefon"]}<span>{e(s["tel"])}</span></a>'
    glas = s['glas']
    licht = e(json.dumps(D['licht'], separators=(',', ':')))
    nr = SALONS.index(s) + 1
    w = s.get('bewertung')
    wert = f'<span class="ort-wertung">{ICO["stern"]}<span><b>{w["wert"]}</b> · {w["anzahl"]} Bewertungen</span></span>' if w else ''
    daten = [('Adresse', f'{e(s["strasse"])}<br>{s["plz"]} {e(s["ort"])}'), ('Lage', e(s['lage_lang'])),
             ('Geöffnet', e(s['zeiten_text']).replace(' · ', '<br>')), ('Telefon', f'<a href="tel:{s["tel_int"]}">{e(s["tel"])}</a>')]
    dl = ''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in daten)
    hinweise = ''.join(f'<span>{e(x)}</span>' for x in s.get('hinweise', []))
    social = f'<a class="knopf-still" href="{s["instagram"]}" rel="noopener">{ICO["insta"]}<span>Instagram</span></a>' if s.get('instagram') else ''
    seite += f'''<main id="inhalt">
  <section class="ort-auftakt" data-glas aria-labelledby="ort-titel">
    <div class="glas-buehne">
      <picture class="glas-poster"><source media="(max-aspect-ratio: 19/20)" srcset="{poster_pfad(s['id'], p, 'hoch')}"><img src="{poster_pfad(s['id'], p)}" alt="" fetchpriority="high"></picture>
      <canvas class="glas-3d" data-zeilen="{e(glas)}" data-zeilen-hoch="{e(s.get('glas_hoch', glas))}" data-farbe="blau" data-licht="{licht}" aria-hidden="true"></canvas>
      <div class="huelle glas-raster" aria-hidden="true">{'<i></i>' * 5}</div>
      <div class="huelle ort-oben"><p class="etikett"><b>{nr:02d}</b> {e(s["lage"])}</p><p class="etikett ort-zurueck"><a href="{p}index.html#salons">Alle Salons</a></p></div>
      <div class="huelle ort-unten">
        <div class="ort-text">
          <h1 id="ort-titel"><span class="nur-vorleser">{e(s["name"])}: </span>{e(s["h1"])}</h1>
          <div class="ort-fakten"><p class="stand" data-zeiten="{zeiten_attr(s)}">{e(s["zeiten_text"])}</p>{wert}</div>
        </div>
        <div class="knoepfe">{''.join(knoepfe)}</div>
      </div>
    </div>
  </section>
  <div class="kapitel-halter"><nav class="huelle kapitel" aria-label="Auf dieser Seite">{kap}</nav></div>

  <section class="ladenfront" id="laden" aria-label="Laden">
    <div class="huelle ladenfront-raster">
      <figure class="front-bild">{bild(s["karte"], s["karte_alt"], p, "(max-width: 52rem) 92vw, 64vw", "eager")}</figure>
      <dl class="front-daten">{dl}</dl>
    </div>
  </section>

  {abschnitt("01", "Leistungen", e(D['leistungen_titel']), leistungen_block(p, s.get('buchen') or f'tel:{s["tel_int"]}'), 'leistungen', e(D.get('leistungen_text', '')))}

  <section class="abschnitt" id="anfahrt" aria-labelledby="anfahrt-titel">
    <div class="huelle">
      <div class="abschnitt-kopf"><p class="etikett"><b>02</b> Anfahrt &amp; Zeiten</p><h2 class="titel-m" id="anfahrt-titel">So finden Sie uns.</h2></div>
      <div class="anfahrt">
        <div class="anfahrt-text">
          <address>{e(s["strasse"])}<br>{s["plz"]} {e(s["ort"])}</address>
          <p class="anfahrt-hinweis">{hinweise}</p>
          <div class="knoepfe"><a class="knopf" href="{route(s)}" rel="noopener">{ICO["route"]}<span>Route planen</span></a><a class="knopf-still" href="tel:{s["tel_int"]}">{ICO["telefon"]}<span>{e(s["tel"])}</span></a>{social}</div>
          {zeiten_tabelle(s)}
        </div>
        {stadtplan(s, p)}
      </div>
    </div>
  </section>
</main>
'''
    teile = [f'<a class="haupt" href="{s["buchen"]}" rel="noopener">{ICO["kalender"]}<span>Buchen</span></a>', f'<a href="tel:{s["tel_int"]}">{ICO["telefon"]}<span>Anrufen</span></a>'] if s.get('buchen') else [f'<a class="haupt" href="tel:{s["tel_int"]}">{ICO["telefon"]}<span>Anrufen</span></a>']
    teile.append(f'<a href="{route(s)}" rel="noopener">{ICO["route"]}<span>Route</span></a>')
    seite += f'<nav class="aktion versteckt" style="--n:{len(teile)}" aria-label="Schnellzugriff">{"".join(teile)}</nav>\n'
    seite += gross_dialog() + fuss(p) + ende()
    schreiben(f'{s["id"]}/index.html', seite)


def seite_hinweis():
    p = '../'
    seite = kopf(p, f"Hinweis | {D['marke']}", 'Hinweis zu diesem Designkonzept.') + '<body>\n' + leiste(p)
    seite += f'''<main id="inhalt" class="recht">
  <div class="huelle recht-innen">
    <p class="etikett">Hinweis</p>
    <h1>Designkonzept</h1>
    <p>Diese Seite ist ein unverbindlicher Entwurf für eine neue Website von {e(D['marke'])}. Sie ist <b>nicht</b> die offizielle Website des Betriebs und wird nicht in Suchmaschinen aufgenommen.</p>
    <p>Alle Angaben zu Salons, Zeiten und Leistungen stammen aus öffentlich zugänglichen Quellen ({e(D['quellen'])}). Stand: {e(D['stand'])}. Verbindlich sind die Angaben des Betriebs.</p>
    <p>Termine buchen Sie wie gewohnt direkt beim Salon; alle Knöpfe führen zu den echten Kanälen des Betriebs. Diese Seite setzt keine Cookies und erhebt keine Daten.</p>
    <h2>Impressum des Betriebs</h2>
    <p>Das Impressum von {e(D['marke'])} finden Sie auf der bisherigen Website: <a href="{D['original_impressum']}" rel="noopener">{e(D['original_impressum'])}</a></p>
    <h2>Bilder</h2>
    <p>Die Fotos stammen von den öffentlichen Seiten des Betriebs und werden hier nur zur Veranschaulichung des Entwurfs gezeigt. Kartendaten © OpenStreetMap-Mitwirkende (ODbL).</p>
  </div>
</main>
'''
    seite += fuss(p) + ende()
    schreiben('hinweis/index.html', seite)


if __name__ == '__main__':
    startseite()
    for s in SALONS:
        seite_salon(s)
    seite_hinweis()
    (WURZEL / '.nojekyll').write_text('')
