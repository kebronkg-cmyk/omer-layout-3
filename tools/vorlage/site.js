/* Omer's Hair Professional — Funktionen aller Seiten.
   Jede Funktion steigt still aus, wenn ihr Element fehlt. Ohne Skript steht die Seite vollständig da. */
(() => {
  'use strict';
  const doc = document.documentElement;
  doc.classList.remove('js-aus');
  doc.classList.add('js');

  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const feinZeiger = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Ladevorhang: zählt echten Fortschritt (Schrift, erstes Bild, 3D), dann heben sich die Spalten ---------- */
  if (doc.dataset.vorhang === 'zu') {
    const kurz = doc.dataset.vorhangArt === 'kurz';
    const zahl = document.querySelector('.vorhang-zahl');
    const beginn = performance.now();
    const MIN = kurz ? 200 : 1400, MAX = kurz ? 1200 : 3000;
    const fertig = { schrift: false, bild: false, glas: false };
    const hat3d = !!document.querySelector('canvas.glas-3d, canvas.auftakt-3d');
    let webgl = false;
    try { const c = document.createElement('canvas'); webgl = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { /* keins */ }
    if (!hat3d || !webgl || doc.dataset.glas === 'bereit') fertig.glas = true;
    else document.addEventListener('glas-bereit', () => { fertig.glas = true; }, { once: true });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { fertig.schrift = true; });
    const erstes = document.querySelector('.auftakt-poster, .glas-poster img');
    if (!erstes || (erstes.complete && erstes.naturalWidth)) fertig.bild = true;
    else { const da = () => { fertig.bild = true; }; erstes.addEventListener('load', da, { once: true }); erstes.addEventListener('error', da, { once: true }); }
    let ist = 0, offen = false;
    const oeffnen = () => {
      if (offen) return; offen = true;
      doc.dataset.vorhangAuf = String(performance.now());
      doc.dataset.vorhang = 'auf';
      document.dispatchEvent(new Event('vorhang-auf'));
      setTimeout(() => { doc.dataset.vorhang = 'weg'; }, 1500);
    };
    const tick = (t) => {
      const zeit = t - beginn;
      const soll = (fertig.schrift ? 0.2 : 0.05) + (fertig.bild ? 0.3 : 0) + (fertig.glas ? 0.5 : 0);
      // nie schneller als die Mindestdauer, nie länger als die Höchstdauer
      const ziel = zeit >= MAX ? 1 : Math.min(soll, zeit / MIN);
      ist += (ziel - ist) * 0.16;
      if (zahl) { zahl.textContent = String(Math.round(ist * 100)).padStart(3, '0'); zahl.style.setProperty('--fortschritt', ist.toFixed(3)); }
      if (ist > 0.985 || (kurz && ziel >= 1)) { if (zahl) zahl.textContent = '100'; setTimeout(oeffnen, kurz ? 0 : 180); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Große Markenschrift genau auf die Rasterbreite einpassen ---------- */
  for (const el of document.querySelectorAll('.riesen.passend')) {
    const passen = () => {
      el.style.fontSize = '100px';
      const woerter = [...el.querySelectorAll('.w')];
      const block = woerter[0] && getComputedStyle(woerter[0]).display === 'block';
      let breite = 0;
      if (block) breite = Math.max(...woerter.map((w) => w.getBoundingClientRect().width));
      else { const b = el.querySelectorAll('.b'); breite = b[b.length - 1].getBoundingClientRect().right - b[0].getBoundingClientRect().left; }
      const platz = el.clientWidth;
      if (breite && platz) el.style.fontSize = (100 * platz / breite * 0.995).toFixed(2) + 'px';
    };
    passen();
    let letzteBreite = 0;
    new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (w !== letzteBreite) { letzteBreite = w; passen(); } }).observe(el.parentElement);
    document.fonts?.ready.then(passen);
  }
  const merken = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* privat */ } };
  const holen = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const klemmen = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---------- Kopf weicht beim Runterscrollen aus ---------- */
  const kopf = document.querySelector('.kopf');
  if (kopf) {
    let letzt = scrollY, weg = false;
    addEventListener('scroll', () => {
      const y = scrollY;
      if (Math.abs(y - letzt) < 6) return;
      const runter = y > letzt; letzt = y;
      const neu = runter && y > 220 ? true : (!runter || y < 80) ? false : weg;
      if (neu !== weg) { weg = neu; kopf.classList.toggle('weg', weg); doc.classList.toggle('kopf-weg', weg); }
    }, { passive: true });
  }

  /* Menü: nach Klick auf einen Link schließen (Sprungmarken auf derselben Seite) */
  const menue = document.getElementById('menue');
  menue?.addEventListener('click', (e) => { if (e.target.closest('a')) { menue.hidePopover?.(); menue.classList.remove('offen'); } });
  // Ältere Browser ohne Popover: Knöpfe schalten eine Klasse
  if (menue && !('showPopover' in HTMLElement.prototype)) {
    document.querySelectorAll('[popovertarget="menue"]').forEach((k) => k.addEventListener('click', () => {
      const auf = k.getAttribute('popovertargetaction') === 'hide' ? false : !menue.classList.contains('offen');
      menue.classList.toggle('offen', auf);
    }));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') menue.classList.remove('offen'); });
  }

  /* ---------- Aktionsleiste am Handy: erst nach dem ersten Bildschirm ---------- */
  const aktion = document.querySelector('.aktion');
  if (aktion && 'IntersectionObserver' in window) {
    const auftakt = document.querySelector('.ort-auftakt'), fuss = document.querySelector('.fuss');
    let imAuftakt = !!auftakt, imFuss = false;
    const b = new IntersectionObserver((es) => {
      for (const e of es) {
        if (e.target === auftakt) imAuftakt = e.isIntersecting && e.intersectionRatio > 0.4;
        if (e.target === fuss) imFuss = e.isIntersecting;
      }
      aktion.classList.toggle('versteckt', imAuftakt || imFuss);
    }, { threshold: [0, 0.4, 0.7] });
    if (auftakt) b.observe(auftakt);
    if (fuss) b.observe(fuss);
  }

  /* ---------- Öffnungsstand nach Münchner Uhr ---------- */
  const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  function ladenzeit() {
    const t = Object.fromEntries(new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((p) => [p.type, p.value]));
    return { tag: { So: 0, Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5, Sa: 6 }[t.weekday.replace('.', '')], h: (+t.hour % 24) + t.minute / 60 };
  }
  const uhr = (h) => String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.round((h % 1) * 60)).padStart(2, '0');
  function stand(zeiten) {
    const { tag, h } = ladenzeit();
    const heute = zeiten[tag] || [];
    for (const [a, b] of heute) if (h >= a && h < b) return { text: 'Jetzt geöffnet · bis ' + uhr(b) + ' Uhr', offen: true };
    const spaeter = heute.find(([a]) => h < a);
    if (spaeter) return { text: 'Heute ab ' + uhr(spaeter[0]) + ' Uhr geöffnet', offen: false };
    for (let i = 1; i <= 7; i++) {
      const t = (tag + i) % 7;
      if ((zeiten[t] || []).length) return { text: 'Geschlossen · ' + (i === 1 ? 'morgen' : TAGE[t]) + ' ab ' + uhr(zeiten[t][0][0]) + ' Uhr', offen: false };
    }
    return null;
  }
  const zeitenVon = (el) => { try { return JSON.parse(el.dataset.zeiten); } catch (e) { return null; } };
  function staendeZeigen() {
    for (const el of document.querySelectorAll('[data-zeiten]')) {
      const z = zeitenVon(el); if (!z) continue;
      const s = stand(z); if (!s) continue;
      el.textContent = s.text; el.classList.toggle('offen', s.offen);
    }
    // „3 von 5 Salons jetzt geöffnet“
    const zaehler = document.querySelector('[data-offen-zaehler]');
    if (zaehler) {
      const alle = [...document.querySelectorAll('.ring-karte .stand[data-zeiten]')];
      const offen = alle.filter((el) => stand(zeitenVon(el))?.offen).length;
      zaehler.querySelector('b').textContent = offen + '/' + alle.length;
      zaehler.querySelector('span').textContent = offen === 1 ? 'Salon jetzt geöffnet' : 'Salons jetzt geöffnet';
    }
    const { tag } = ladenzeit();
    for (const tr of document.querySelectorAll('.zeiten tr[data-tag]')) tr.classList.toggle('heute', +tr.dataset.tag === tag);
  }
  staendeZeigen();
  setInterval(staendeZeigen, 60000);

  /* ---------- Salon-Ring: Karten außen auf einer Trommel, die Mitte wölbt sich nach vorn ----------
     Selbstlauf: gleichmäßig und sehr ruhig. Nur im Selbstlauf springt ein blauer Lichtimpuls um den Rahmen,
     als Blitz zur nächsten Karte und lädt deren Rahmen auf. Jede Berührung beendet das sofort.
     Antippen holt eine Karte leicht nach vorn (unten geht es zum Salon), Tippen daneben lässt sie wieder laufen. */
  const ringBox = document.querySelector('[data-ring]');
  const ring = (() => {
    if (!ringBox || !CSS.supports('transform-style', 'preserve-3d')) return null;
    const liste = ringBox.querySelector('.ring');
    const buehne = ringBox.querySelector('.ring-buehne');
    const karten = [...liste.querySelectorAll('.ring-karte')];
    const n = karten.length;
    const panel = ringBox.querySelector('.ring-panel-info');
    const zaehler = ringBox.querySelector('.zaehler');
    if (!n || !panel || !buehne) return null;

    ringBox.classList.add('ring-3d');
    const welt = document.createElement('div');
    welt.className = 'ring-welt';
    // Zweite Reihe für die Rückseite der Trommel: gleiche Salons, nur Bild, für Vorleser und Tastatur unsichtbar
    const kopien = karten.map((k) => {
      const c = k.cloneNode(true);
      c.classList.add('kopie'); c.setAttribute('aria-hidden', 'true'); c.removeAttribute('data-lat'); c.removeAttribute('data-lon');
      c.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));
      return c;
    });
    const plaetze = [...karten, ...kopien];
    const N = plaetze.length;
    plaetze.forEach((k) => welt.append(k));
    liste.append(welt);
    liste.setAttribute('tabindex', '0');
    liste.setAttribute('aria-roledescription', 'Karussell');

    // Leinwand für das Licht: liegt über der Bühne, fängt keine Berührungen
    const RAND = 90;
    const licht = document.createElement('canvas');
    licht.className = 'ring-licht';
    licht.setAttribute('aria-hidden', 'true');
    buehne.append(licht);
    const lc = licht.getContext('2d');

    let K = 0, R = 0, W = 0, H = 0, schritt = 1, abstandPx = 0, P = 1400, breite = 0, dpr = 1;
    const NEIGUNG = -11;      // Trommel leicht gekippt: die Rückseite zeigt sich verblasst über der vorderen Reihe
    const PO_Y = 0.8;          // Augenhöhe weit unten: die Oberkanten wölben sich wie in der Referenz
    const RUND = 22;           // Eckradius der Karten (wie --rund)
    const bilder = plaetze.map((k) => k.querySelector('img'));
    bilder.forEach((img) => { if (img) img.loading = 'eager'; });   // versteckte Bilder laden sonst nie

    const masse = () => {
      const vw = liste.clientWidth || innerWidth;
      const schmal = vw < 760;
      const SEITE = 4 / 3;     // Format der Ladenfronten, nichts wird angeschnitten
      W = schmal ? Math.min(vw * 0.8, 440) : klemmen(vw * 0.42, 400, 660);
      H = Math.min(W / SEITE, innerHeight * (schmal ? 0.5 : 0.62));
      abstandPx = schmal ? 30 : 92;   // Fuge wie in der Referenz, Platz für den Blitz
      // geschlossene Trommel: alle Plätze zusammen ergeben genau einen Umlauf
      schritt = (Math.PI * 2) / N;
      R = (W + abstandPx) / schritt;
      P = R * (schmal ? 2.1 : 1.85);
      // so viele Streifen, dass die Krümmung auch ganz außen glatt bleibt (Streifen nie schmaler als die Ecke)
      const neuK = Math.max(10, Math.floor(W / (schmal ? 24 : 26)));
      const theta = W / R, delta = theta / neuK;
      const sw = 2 * R * Math.tan(delta / 2);
      let bgw, bgh, ox = 0, oy = 0;
      if (W / H > SEITE) { bgw = W; bgh = W / SEITE; oy = (H - bgh) / 2; } else { bgh = H; bgw = H * SEITE; ox = (W - bgw) / 2; }
      const s = liste.style;
      s.setProperty('--kh', H.toFixed(1) + 'px');
      s.setProperty('--r', R.toFixed(1) + 'px');
      s.setProperty('--sw', (sw + 0.9).toFixed(2) + 'px');
      s.setProperty('--schritt', sw.toFixed(3) + 'px');
      s.setProperty('--bgw', bgw.toFixed(1) + 'px'); s.setProperty('--bgh', bgh.toFixed(1) + 'px');
      s.setProperty('--ox', ox.toFixed(1) + 'px'); s.setProperty('--oy', oy.toFixed(1) + 'px');
      s.perspective = P.toFixed(0) + 'px';
      s.perspectiveOrigin = `50% ${(H * PO_Y).toFixed(1)}px`;
      if (neuK !== K) {
        K = neuK;
        plaetze.forEach((k, i) => {
          const halter = k.querySelector('.ring-bild');
          halter.querySelectorAll('.streifen').forEach((x) => x.remove());
          for (let j = 0; j < K; j++) {
            const st = document.createElement('span');
            st.className = 'streifen' + (j === 0 ? ' erster' : '') + (j === K - 1 ? ' letzter' : '');
            st.style.setProperty('--j', j);
            halter.append(st);
          }
          bildSetzen(i);
        });
      }
      plaetze.forEach((k) => k.querySelectorAll('.streifen').forEach((st, j) => st.style.setProperty('--a', ((j - (K - 1) / 2) * delta).toFixed(5) + 'rad')));
      // Lichtleinwand
      breite = vw;
      dpr = 1;
      licht.style.top = -RAND + 'px';
      licht.style.height = (H + 2 * RAND) + 'px';
      licht.width = Math.round(breite * dpr); licht.height = Math.round((H + 2 * RAND) * dpr);
      rahmen = rahmenPunkte();
    };
    const bildSetzen = (i) => {
      const img = bilder[i]; if (!img) return;
      const setzen = () => plaetze[i].querySelector('.ring-bild').style.setProperty('--bild', `url("${img.currentSrc || img.src}")`);
      img.complete && img.naturalWidth ? setzen() : img.addEventListener('load', setzen, { once: true });
    };

    const glatt = (a, b, x) => { const t = klemmen((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    let pos = 0, ziel = 0, tau = 140, aktiv = -1, tempo = 0;
    let kipp = { x: 0, y: 0 }, kippZiel = { x: 0, y: 0 };
    let gewaehlt = -1;
    const vor = plaetze.map(() => 0);
    const zuletztGesetzt = plaetze.map(() => ({ d: -1, g: -1, h: -1, t: '' }));
    const versatz = (i) => { let o = i - pos; o -= Math.round(o / N) * N; return o; };
    const vornPlatz = () => ((Math.round(pos) % N) + N) % N;
    const index = (p) => ((Math.round(p) % n) + n) % n;
    const vorWeg = () => R * 0.085;   // wie weit eine gewählte Karte nach vorn kommt

    const zeichnen = () => {
      for (let i = 0; i < N; i++) {
        const o = versatz(i), a = o * schritt, b = Math.abs(o);
        const k = plaetze[i];
        const t = `rotateY(${a.toFixed(5)}rad) translateZ(${(vor[i] * vorWeg()).toFixed(2)}px) translateY(${(-vor[i] * 6).toFixed(2)}px)`;
        const merk = zuletztGesetzt[i];
        if (t !== merk.t) { k.style.transform = t; merk.t = t; }
        // Abdunkeln und Glanz nur schreiben, wenn sie sich sichtbar ändern (spart Malarbeit)
        // Rückseite: verblasst und dunkel, dreht sichtbar hinten mit
        const hinten = Math.round(glatt(1.3, 1.85, Math.abs(a)) * 100) / 100;
        const dunkel = Math.round(Math.min(0.82, b * 0.45 + hinten * 0.3 + (gewaehlt >= 0 && i % n !== gewaehlt ? 0.25 : 0)) * 100) / 100;
        const glanz = Math.round(Math.max(0, 1 - b) * 100) / 100;
        if (dunkel !== merk.d) { k.style.setProperty('--dunkel', dunkel); merk.d = dunkel; }
        if (glanz !== merk.g) { k.style.setProperty('--glanz', glanz); merk.g = glanz; }
        if (hinten !== merk.h) { k.style.setProperty('--deck', (1 - hinten * 0.55).toFixed(2)); merk.h = hinten; }
      }
      welt.style.transform = `rotateX(${(kipp.y + NEIGUNG).toFixed(3)}deg) rotateY(${kipp.x.toFixed(3)}deg) translateZ(${(-R).toFixed(1)}px)`;
      const neu = index(pos);
      if (neu !== aktiv) { aktiv = neu; aktivZeigen(); }
    };

    // Platz unter dem Ring so hoch wie die längste Salon-Info, damit beim Wechsel nichts darunter springt
    const panelHoehe = () => {
      panel.style.minHeight = '';
      let max = 0;
      for (const k of karten) { panel.replaceChildren(k.querySelector('.ring-info').cloneNode(true)); max = Math.max(max, panel.offsetHeight); }
      panel.style.minHeight = max + 'px';
      if (aktiv >= 0) { panel.replaceChildren(karten[aktiv].querySelector('.ring-info').cloneNode(true)); }
    };
    const aktivZeigen = () => {
      const vorn = vornPlatz();
      plaetze.forEach((k, i) => k.classList.toggle('aktiv', i === vorn));
      karten.forEach((k, i) => k.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', i === aktiv && vorn === i ? '0' : '-1')));
      const info = karten[aktiv].querySelector('.ring-info').cloneNode(true);
      info.classList.add('neu');
      panel.replaceChildren(info);
      if (zaehler) zaehler.textContent = String(aktiv + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
    };

    /* ---------- Projektion: derselbe Weg wie im CSS (Streifen → Karte → Welt → Perspektive) ---------- */
    let rahmen = [];
    function rahmenPunkte() {
      // abgerundetes Rechteck in (u = Bogenlänge, v = Höhe), im Uhrzeigersinn ab oben links
      const pts = [], r = Math.min(RUND, W / 4, H / 4), hw = W / 2;
      const gerade = (u0, v0, u1, v1, m) => { for (let k = 0; k < m; k++) pts.push([u0 + (u1 - u0) * k / m, v0 + (v1 - v0) * k / m]); };
      const bogen = (cu, cv, w0) => { for (let k = 0; k < 6; k++) { const w = w0 + (k / 6) * Math.PI / 2; pts.push([cu + r * Math.cos(w), cv + r * Math.sin(w)]); } };
      gerade(-hw + r, 0, hw - r, 0, 40); bogen(hw - r, r, -Math.PI / 2);
      gerade(hw, r, hw, H - r, 24); bogen(hw - r, H - r, 0);
      gerade(hw - r, H, -hw + r, H, 40); bogen(-hw + r, H - r, Math.PI / 2);
      gerade(-hw, H - r, -hw, r, 24); bogen(-hw + r, r, Math.PI);
      return pts;
    }
    const projizieren = (i, u, v) => {   // i = Platz
      const o = versatz(i), a = o * schritt, be = u / R;
      let x = R * Math.sin(be), y = v - H / 2, z = R * Math.cos(be) + vor[i] * vorWeg();
      y -= vor[i] * 6;
      // Karte: rotateY(a)
      let x2 = x * Math.cos(a) + z * Math.sin(a), z2 = -x * Math.sin(a) + z * Math.cos(a);
      // Welt: translateZ(-R), dann rotateY(kipp.x), dann rotateX(kipp.y)
      z2 -= R;
      const ky = kipp.x * Math.PI / 180, kx = (kipp.y + NEIGUNG) * Math.PI / 180;
      const x3 = x2 * Math.cos(ky) + z2 * Math.sin(ky), z3 = -x2 * Math.sin(ky) + z2 * Math.cos(ky);
      const y4 = y * Math.cos(kx) - z3 * Math.sin(kx), z4 = y * Math.sin(kx) + z3 * Math.cos(kx);
      const X = breite / 2 + x3, Y = H / 2 + y4, ox = breite / 2, oy = H * PO_Y, f = P / (P - z4);
      return [ox + (X - ox) * f, oy + (Y - oy) * f + RAND, z4];
    };
    const rahmenVon = (i) => rahmen.map(([u, v]) => projizieren(i, u, v));
    const punktAuf = (pfad, s) => { const L = pfad.length, f = ((s % 1) + 1) % 1 * L, k = Math.floor(f), t = f - k, p = pfad[k], q = pfad[(k + 1) % L]; return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };

    /* ---------- Licht: Umlauf, Sammeln, Blitz, Aufladen ---------- */
    const sRechtsMitte = () => { const pts = rahmen; let best = 0, d = Infinity; pts.forEach(([u, v], k) => { const e = Math.abs(u - W / 2) + Math.abs(v - H / 2); if (e < d) { d = e; best = k; } }); return best / pts.length; };
    const sLinksMitte = () => { const pts = rahmen; let best = 0, d = Infinity; pts.forEach(([u, v], k) => { const e = Math.abs(u + W / 2) + Math.abs(v - H / 2); if (e < d) { d = e; best = k; } }); return best / pts.length; };
    let funken = [], blitzForm = null, blitzZeit = 0, scharf = -1, effekt = 0, effektZiel = 0, letzteZeichnung = false;

    const leeren = () => { lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, licht.width, licht.height); };
    const linie = (pfad, von, bis, breiteL, farbe, schein) => {
      lc.beginPath();
      const L = pfad.length, a = Math.floor(von * L), b = Math.ceil(bis * L);
      for (let k = a; k <= b; k++) { const p = pfad[((k % L) + L) % L]; k === a ? lc.moveTo(p[0], p[1]) : lc.lineTo(p[0], p[1]); }
      lc.lineCap = 'round'; lc.lineJoin = 'round';
      if (schein) { lc.lineWidth = breiteL * 4.5; lc.strokeStyle = schein; lc.stroke(); }   // Schein als breiter, blasser Strich (statt teurem Schatten)
      lc.lineWidth = breiteL; lc.strokeStyle = farbe; lc.stroke();
    };
    const ganzerRahmen = (pfad, alpha, dicke = 1.6) => {
      if (alpha <= 0.01) return;
      lc.beginPath(); pfad.forEach((p, k) => (k ? lc.lineTo(p[0], p[1]) : lc.moveTo(p[0], p[1]))); lc.closePath();
      lc.lineJoin = 'round';
      lc.lineWidth = dicke * 9; lc.strokeStyle = `rgba(63,130,255,${(alpha * 0.1).toFixed(3)})`; lc.stroke();
      lc.lineWidth = dicke * 3.5; lc.strokeStyle = `rgba(63,130,255,${(alpha * 0.3).toFixed(3)})`; lc.stroke();
      lc.lineWidth = dicke; lc.strokeStyle = `rgba(200,225,255,${(alpha * 0.95).toFixed(3)})`; lc.stroke();
    };
    const komet = (pfad, kopf, laenge, alpha) => {
      const schritte = 12;
      for (let k = 0; k < schritte; k++) {
        const s1 = kopf - (k / schritte) * laenge, s0 = kopf - ((k + 1) / schritte) * laenge;
        const t = 1 - k / schritte;
        linie(pfad, s0, s1, 1 + 3.2 * t * t, `rgba(${(150 + 105 * t) | 0},${(195 + 60 * t) | 0},255,${(alpha * t * t).toFixed(3)})`, `rgba(63,130,255,${(alpha * t * 0.16).toFixed(3)})`);
      }
      const [x, y] = punktAuf(pfad, kopf);
      punkt(x, y, 34 * alpha, alpha);
    };
    const punkt = (x, y, r, alpha) => {
      if (alpha <= 0.01 || r <= 0.5) return;
      const g = lc.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${alpha.toFixed(3)})`); g.addColorStop(0.18, `rgba(200,225,255,${(alpha * 0.85).toFixed(3)})`);
      g.addColorStop(0.45, `rgba(63,130,255,${(alpha * 0.35).toFixed(3)})`); g.addColorStop(1, 'rgba(63,130,255,0)');
      lc.fillStyle = g; lc.beginPath(); lc.arc(x, y, r, 0, Math.PI * 2); lc.fill();
    };
    // Blitz: Mittelpunkt-Verschiebung, dazu ein, zwei Seitenäste
    const blitzBauen = (a, b) => {
      let zufall = Math.random;
      const pts = [a, b];
      const versetzen = (p, q, tief, weite, aus) => {
        if (tief === 0) { aus.push(q); return; }
        const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
        const m = [mx + (-dy / l) * (zufall() - 0.5) * weite, my + (dx / l) * (zufall() - 0.5) * weite];
        versetzen(p, m, tief - 1, weite * 0.55, aus); versetzen(m, q, tief - 1, weite * 0.55, aus);
      };
      const haupt = [a]; versetzen(a, b, 6, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.32, haupt);
      const aeste = [];
      for (let k = 0; k < 2; k++) {
        const s = haupt[Math.floor(haupt.length * (0.3 + zufall() * 0.4))];
        const w = Math.atan2(b[1] - a[1], b[0] - a[0]) + (zufall() - 0.5) * 1.6, l = Math.hypot(b[0] - a[0], b[1] - a[1]) * (0.12 + zufall() * 0.16);
        const ast = [s]; versetzen(s, [s[0] + Math.cos(w) * l, s[1] + Math.sin(w) * l], 4, l * 0.4, ast); aeste.push(ast);
      }
      return { haupt, aeste };
    };
    const zug2 = (pts, dicke, farbe, schein) => {
      lc.beginPath(); pts.forEach((p, k) => (k ? lc.lineTo(p[0], p[1]) : lc.moveTo(p[0], p[1])));
      lc.lineWidth = dicke; lc.strokeStyle = farbe; lc.lineJoin = 'round'; lc.lineCap = 'round'; lc.stroke();
    };

    const lichtZeichnen = (t, dt) => {
      // Effekt nur im Selbstlauf; bei Berührung blendet er in wenigen Hundertstel aus
      effekt += (effektZiel - effekt) * (1 - Math.exp(-dt / (effektZiel > effekt ? 260 : 90)));
      const zyklus = Math.floor(pos), phi = pos - zyklus;
      if (effekt < 0.004 || scharf !== zyklus) {
        if (letzteZeichnung) { leeren(); letzteZeichnung = false; }
        funken = [];
        return;
      }
      leeren(); letzteZeichnung = true;
      lc.setTransform(dpr, 0, 0, dpr, 0, 0);
      lc.globalCompositeOperation = 'lighter';
      const quelle = ((zyklus % N) + N) % N, zielK = (quelle + 1) % N;
      const A = rahmenVon(quelle), B = rahmenVon(zielK);
      const sR = sRechtsMitte(), sL = sLinksMitte();
      const e = effekt;
      // 1 Umlauf: ein Lichtkopf läuft einmal um den Rahmen und endet rechts in der Mitte
      const lauf = glatt(0.08, 0.42, phi);
      if (phi > 0.08 && phi < 0.46) {
        const kopf = sR - 1 + lauf * 1.0;
        ganzerRahmen(A, e * (0.15 + 0.55 * lauf), 1.4);
        komet(A, kopf, 0.26, e * Math.min(1, (phi - 0.08) / 0.04) * (1 - glatt(0.42, 0.46, phi) * 0.4));
      }
      const pA = punktAuf(A, sR), pB = punktAuf(B, sL);
      // 2 Sammeln: die Ladung ballt sich an der Kante
      if (phi > 0.38 && phi < 0.5) {
        const s = glatt(0.38, 0.47, phi) * (1 - glatt(0.48, 0.5, phi));
        punkt(pA[0], pA[1], 18 + 46 * s + Math.sin(t / 30) * 4 * s, e * (0.5 + 0.5 * s));
        ganzerRahmen(A, e * 0.7 * (1 - glatt(0.47, 0.56, phi)), 1.6);
      }
      // 3 Blitz: springt zur nächsten Karte, flackert
      if (phi > 0.455 && phi < 0.56) {
        if (!blitzForm || t - blitzZeit > 48) { blitzForm = blitzBauen(pA, pB); blitzZeit = t; }
        const s = glatt(0.455, 0.47, phi) * (1 - glatt(0.53, 0.56, phi));
        const flacker = 0.75 + 0.25 * Math.sin(t / 11);
        const a = e * s * flacker;
        for (const p of [blitzForm.haupt, ...blitzForm.aeste]) {
          const ast = p !== blitzForm.haupt;
          zug2(p, ast ? 14 : 26, `rgba(63,130,255,${(a * 0.08).toFixed(3)})`, 0);
          zug2(p, ast ? 6 : 12, `rgba(63,130,255,${(a * 0.22).toFixed(3)})`, 30);
          zug2(p, ast ? 2 : 4, `rgba(143,186,255,${(a * 0.75).toFixed(3)})`, 14);
          zug2(p, ast ? 0.8 : 1.6, `rgba(255,255,255,${a.toFixed(3)})`, 4);
        }
        punkt(pA[0], pA[1], 40, a * 0.8); punkt(pB[0], pB[1], 56, a);
        if (phi < 0.5 && funken.length < 2) {
          for (let k = 0; k < 18; k++) { const w = Math.random() * Math.PI * 2, v = 0.06 + Math.random() * 0.22; funken.push({ x: pB[0], y: pB[1], vx: Math.cos(w) * v, vy: Math.sin(w) * v, leben: 1 }); }
        }
      } else blitzForm = null;
      // Funken am Einschlag
      funken = funken.filter((f) => (f.leben -= dt / 650) > 0);
      for (const f of funken) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.985; f.vy *= 0.985; punkt(f.x, f.y, 6 * f.leben + 2, e * f.leben); }
      // 4 Aufladen: zwei Lichtfronten laufen von links um den Rahmen und treffen sich rechts
      if (phi > 0.5 && phi < 0.98) {
        const f = glatt(0.5, 0.8, phi);
        const halb = 0.5 * f;
        const nachglut = 1 - glatt(0.84, 0.98, phi);
        linie(B, sL - halb, sL + halb, 2.2, `rgba(200,225,255,${(e * 0.85 * nachglut).toFixed(3)})`, `rgba(63,130,255,${(e * 0.2 * nachglut).toFixed(3)})`);
        if (f < 1) { const p1 = punktAuf(B, sL + halb), p2 = punktAuf(B, sL - halb); punkt(p1[0], p1[1], 26, e); punkt(p2[0], p2[1], 26, e); }
        // Treffen: der ganze Rahmen blitzt einmal auf
        const blitzAuf = glatt(0.78, 0.82, phi) * (1 - glatt(0.82, 0.95, phi));
        ganzerRahmen(B, e * blitzAuf * 1.2, 2.2);
        if (blitzAuf > 0.05) { const pR = punktAuf(B, sR); punkt(pR[0], pR[1], 60 * blitzAuf, e * blitzAuf); }
      }
      lc.globalCompositeOperation = 'source-over';
    };

    /* ---------- Selbstlauf ---------- */
    const SEKUNDEN_JE_KARTE = 5.6;
    let autoAn = !ruhig, pauseBis = 0, ringSichtbar = false, driftet = false;
    const autoLaeuft = (jetzt) => autoAn && ringSichtbar && !zug && gewaehlt < 0 && jetzt > pauseBis && !document.hidden;
    const effektAus = () => { effektZiel = 0; scharf = -1; };
    const pausieren = (ms = 5000) => {
      pauseBis = performance.now() + ms; effektAus();
      if (driftet) { driftet = false; ziel = pos; tempo = 0; }
      anstossen();
    };

    let bild = 0, zuletzt = 0;
    const schrittBild = (t) => {
      const dt = zuletzt ? Math.min(50, t - zuletzt) : 16; zuletzt = t;
      if (autoLaeuft(t)) {
        if (!driftet) {
          // erst auf die nächste ganze Karte einrasten lassen, dann weich anfahren
          if (Math.abs(ziel - pos) > 0.002) { pos += (ziel - pos) * (1 - Math.exp(-dt / tau)); }
          else { driftet = true; pos = ziel; tempo = 0; }
        }
        if (driftet) {
          tempo += (1 - tempo) * (1 - Math.exp(-dt / 1100));          // sanft anfahren
          pos += (dt / (SEKUNDEN_JE_KARTE * 1000)) * tempo; ziel = pos;
          // Licht nur für einen Übergang, der im Selbstlauf begonnen hat
          const phi = pos - Math.floor(pos);
          if (phi < 0.08 && tempo > 0.35 && scharf !== Math.floor(pos)) { scharf = Math.floor(pos); effektZiel = 1; }
        }
      } else {
        if (driftet) { driftet = false; ziel = pos; }
        pos += (ziel - pos) * (1 - Math.exp(-dt / (ruhig ? 1 : tau)));
        if (Math.abs(ziel - pos) < 0.0004) pos = ziel;
      }
      for (let i = 0; i < N; i++) { const soll = i % n === gewaehlt && Math.abs(versatz(i)) < 0.5 ? 1 : 0; vor[i] += (soll - vor[i]) * (1 - Math.exp(-dt / 240)); if (Math.abs(soll - vor[i]) < 0.002) vor[i] = soll; }
      kipp.x += (kippZiel.x - kipp.x) * (1 - Math.exp(-dt / 300));
      kipp.y += (kippZiel.y - kipp.y) * (1 - Math.exp(-dt / 300));
      zeichnen();
      if (!ruhig) lichtZeichnen(t, dt);
      const ruhe = pos === ziel && !autoLaeuft(t) && vor.every((v) => v === 0 || v === 1)
        && Math.abs(kippZiel.x - kipp.x) < 0.01 && Math.abs(kippZiel.y - kipp.y) < 0.01 && effekt < 0.004;
      if (ruhe && autoAn && ringSichtbar && gewaehlt < 0 && performance.now() <= pauseBis) setTimeout(anstossen, pauseBis - performance.now() + 20);
      bild = ruhe ? 0 : requestAnimationFrame(schrittBild);
      if (!bild) { zuletzt = 0; if (letzteZeichnung) { leeren(); letzteZeichnung = false; } }
    };
    const anstossen = () => { if (!bild) bild = requestAnimationFrame(schrittBild); };
    const geheZu = (i) => {
      let d = i - index(ziel); d -= Math.round(d / n) * n;   // kürzester Weg rund um den Ring
      ziel = Math.round(ziel) + d; anstossen();
    };

    /* ---------- Auswahl: Karte rückt nach vorn ---------- */
    const waehlen = (i) => {
      effektAus();
      if (driftet) { driftet = false; ziel = pos; }
      gewaehlt = i; tau = 360; geheZu(i);
      ringBox.classList.add('vorne');
      anstossen();
    };
    const loesen = () => {
      if (gewaehlt < 0) return;
      gewaehlt = -1; ringBox.classList.remove('vorne');
      pauseBis = performance.now() + 450;   // kurz zurückgleiten lassen, dann weich weiterdrehen
      anstossen();
    };
    document.addEventListener('pointerdown', (e) => {
      if (gewaehlt < 0) return;
      const k = e.target.closest?.('.ring-karte');
      if (k && plaetze.indexOf(k) % n === gewaehlt) return;
      if (e.target.closest?.('.ring-panel, .ring-steuer')) return;
      if (!k) loesen();
    }, true);

    masse();
    zeichnen();
    panelHoehe();
    let panelBreite = panel.clientWidth;
    new ResizeObserver(() => { masse(); zeichnen(); if (panel.clientWidth !== panelBreite) { panelBreite = panel.clientWidth; panelHoehe(); } }).observe(liste);
    document.fonts?.ready.then(panelHoehe);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { ringSichtbar = e.isIntersecting; if (ringSichtbar) anstossen(); else effektAus(); }, { threshold: 0.15 }).observe(liste);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { zuletzt = 0; anstossen(); } else effektAus(); });

    /* ---------- Ziehen und Wischen: folgt dem Finger 1:1, Schwung beim Loslassen ---------- */
    let zug = null, gezogen = false;
    liste.addEventListener('dragstart', (e) => e.preventDefault());
    karten.forEach((k) => k.querySelectorAll('a, img').forEach((x) => x.setAttribute('draggable', 'false')));
    liste.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      // Auf eine Karte: anhalten. Daneben: nichts anhalten, damit der Ring nach dem Loslassen gleich weiterdreht
      if (e.target.closest('.ring-karte')) pausieren(5000);
      zug = { x: e.clientX, y: e.clientY, p: pos, fest: false, spur: [[performance.now(), e.clientX]] };
      gezogen = false;
    });
    addEventListener('pointermove', (e) => {
      if (feinZeiger && !zug) {
        const r = liste.getBoundingClientRect();
        if (e.clientY > r.top - 100 && e.clientY < r.bottom + 100) {
          kippZiel.x = ((e.clientX / innerWidth) - 0.5) * 4;
          kippZiel.y = -(((e.clientY - r.top) / r.height) - 0.5) * 3;
          anstossen();
        }
      }
      if (!zug) return;
      const dx = e.clientX - zug.x, dy = e.clientY - zug.y;
      if (!zug.fest) {
        if (Math.hypot(dx, dy) < 7) return;
        if (Math.abs(dy) > Math.abs(dx) * 1.1) { zug = null; return; }   // eher senkrecht: Seite scrollen
        zug.fest = true; gezogen = true; liste.classList.add('zieht'); pausieren(5000); zug.p = pos + dx / (W + abstandPx);
        if (gewaehlt >= 0) { gewaehlt = -1; ringBox.classList.remove('vorne'); }
        try { liste.setPointerCapture(e.pointerId); } catch (x) { /* egal */ }
      }
      const jetzt = performance.now();
      zug.spur.push([jetzt, e.clientX]); while (zug.spur.length > 2 && jetzt - zug.spur[0][0] > 110) zug.spur.shift();
      ziel = zug.p - dx / (W + abstandPx); tau = 18; anstossen();
    });
    const loslassen = () => {
      if (!zug) return;
      if (zug.fest) {
        const a = zug.spur[0], b = zug.spur[zug.spur.length - 1];
        const v = (b[1] - a[1]) / Math.max(16, b[0] - a[0]);          // px je ms
        const wurf = -v * 300 / (W + abstandPx);
        ziel = Math.round(ziel + klemmen(wurf, -3, 3)); tau = 230; anstossen();
      }
      const warFest = zug.fest;
      zug = null; liste.classList.remove('zieht');
      if (warFest) pausieren(4000);
    };
    addEventListener('pointerup', loslassen);
    addEventListener('pointercancel', loslassen);

    /* Antippen: erst nach vorn holen, zweites Tippen öffnet den Salon */
    liste.addEventListener('click', (e) => {
      if (gezogen) { e.preventDefault(); e.stopPropagation(); gezogen = false; return; }
      const k = e.target.closest('.ring-karte');
      if (!k) { loesen(); return; }
      const i = plaetze.indexOf(k) % n;
      if (i === gewaehlt) {                           // zweites Tippen öffnet den Salon
        if (k.classList.contains('kopie')) { e.preventDefault(); location.href = karten[i].querySelector('.ring-bild').href; }
        return;
      }
      e.preventDefault();
      waehlen(i);
    }, true);
    liste.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); loesen(); pausieren(8000); tau = 220; geheZu(index(ziel) + (e.key === 'ArrowRight' ? 1 : -1)); }
      if (e.key === 'Enter' && gewaehlt < 0) { e.preventDefault(); waehlen(index(ziel)); }
      if (e.key === 'Escape') loesen();
    });
    let radRuhe = 0;
    liste.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault(); loesen();
      pausieren(6000); ziel += e.deltaX / (W * 1.4); tau = 90; anstossen();
      clearTimeout(radRuhe); radRuhe = setTimeout(() => { ziel = Math.round(ziel); tau = 240; anstossen(); }, 140);
    }, { passive: false });
    ringBox.querySelector('[data-ring-zurueck]')?.addEventListener('click', () => { loesen(); pausieren(8000); tau = 240; geheZu(index(ziel) - 1); });
    ringBox.querySelector('[data-ring-vor]')?.addEventListener('click', () => { loesen(); pausieren(8000); tau = 240; geheZu(index(ziel) + 1); });

    return {
      karten, geheZu: (i) => { loesen(); pausieren(12000); tau = ruhig ? 1 : 420; geheZu(i); },
      neuZeigen: () => { aktiv = -1; zeichnen(); },
    };
  })();

  /* ---------- Kapitelleiste der Standortseiten ---------- */
  const kapLeiste = document.querySelector('.kapitel');
  if (kapLeiste && 'IntersectionObserver' in window) {
    const links = [...kapLeiste.querySelectorAll('a[href^="#"]')];
    const ziele = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    const sichtbar = new Set();
    const b = new IntersectionObserver((es) => {
      for (const e of es) e.isIntersecting ? sichtbar.add(e.target) : sichtbar.delete(e.target);
      const aktiv = ziele.find((z) => sichtbar.has(z));
      links.forEach((a) => {
        const an = aktiv && a.getAttribute('href') === '#' + aktiv.id;
        a.classList.toggle('an', !!an);
        // nur die Leiste waagrecht verschieben, nie die Seite (scrollIntoView bremst am iPhone das Scrollen aus)
        if (an && kapLeiste.scrollWidth > kapLeiste.clientWidth) {
          const l = a.offsetLeft - (kapLeiste.clientWidth - a.offsetWidth) / 2;
          if (Math.abs(kapLeiste.scrollLeft - l) > 8) kapLeiste.scrollTo({ left: Math.max(0, l), behavior: ruhig ? 'auto' : 'smooth' });
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    ziele.forEach((z) => b.observe(z));
  }

  /* ---------- Welcher Salon liegt am nächsten? (nur im Browser) ---------- */
  const finderKnoepfe = document.querySelectorAll('[data-finder]');
  if (finderKnoepfe.length) {
    const antworten = document.querySelectorAll('.finder-antwort');
    const sagen = (html) => antworten.forEach((a) => { a.innerHTML = html; });
    if (!('geolocation' in navigator)) finderKnoepfe.forEach((k) => { k.hidden = true; });
    const km = (a, b) => {
      const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
      return 2 * 6371 * Math.asin(Math.sqrt(h));
    };
    const suchen = () => {
      sagen('Einen Moment, Ihr Standort wird ermittelt …');
      finderKnoepfe.forEach((k) => k.setAttribute('aria-busy', 'true'));
      navigator.geolocation.getCurrentPosition((p) => {
        finderKnoepfe.forEach((k) => k.removeAttribute('aria-busy'));
        const ich = { lat: p.coords.latitude, lon: p.coords.longitude };
        const karten = [...document.querySelectorAll('.ring-karte[data-lat]')];
        const liste = karten.map((k, i) => ({ k, i, d: km(ich, { lat: +k.dataset.lat, lon: +k.dataset.lon }) })).sort((a, b) => a.d - b.d);
        if (!liste.length) return;
        const { k, i, d } = liste[0];
        const weg = d < 1 ? Math.round(d * 1000) + ' m' : d.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' km';
        karten.forEach((x) => {
          const l = x.querySelector('.ring-lage');
          if (l?.dataset.text) { l.textContent = l.dataset.text; l.classList.remove('naechster'); }
        });
        const lage = k.querySelector('.ring-lage');
        if (lage) { lage.dataset.text = lage.textContent; lage.textContent = 'Am nächsten · ' + weg + ' Luftlinie'; lage.classList.add('naechster'); }
        const name = k.querySelector('h2')?.textContent || '';
        sagen(`<b>${name}</b> ist am nächsten, etwa ${weg}.`);
        const ziel = document.getElementById('salons');
        if (ziel && ziel.getBoundingClientRect().top > innerHeight * 0.4) ziel.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth' });
        if (ring) { ring.neuZeigen(); setTimeout(() => ring.geheZu(i), ruhig ? 0 : 450); }
        else k.parentElement?.scrollTo({ left: k.offsetLeft - 16, behavior: ruhig ? 'auto' : 'smooth' });
      }, () => {
        finderKnoepfe.forEach((k) => k.removeAttribute('aria-busy'));
        sagen('Standort nicht verfügbar. Wählen Sie Ihren Salon einfach im Ring.');
      }, { timeout: 10000, maximumAge: 300000 });
    };
    finderKnoepfe.forEach((k) => k.addEventListener('click', suchen));
  }

  /* ---------- Neonlinien zeichnen sich beim Hereinscrollen ---------- */
  if ('IntersectionObserver' in window) {
    const b = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { e.target.classList.add('an'); b.unobserve(e.target); }
    }, { rootMargin: '0px 0px -15% 0px' });
    document.querySelectorAll('.trenner').forEach((t) => b.observe(t));
  }

  /* ---------- Preis-Studio: Reiter, Auswahl, Summe ---------- */
  const studio = document.querySelector('.preis-studio');
  if (studio) {
    studio.classList.add('ps-an');
    const reiter = [...studio.querySelectorAll('[data-reiter]')];
    const tafeln = [...studio.querySelectorAll('.ps-tafel')];
    const licht = studio.querySelector('.ps-licht');
    const leiste = studio.querySelector('.ps-reiter-leiste');
    const lichtSetzen = (r) => {
      if (!licht || !r) return;
      licht.style.setProperty('--x', r.offsetLeft + 'px');
      licht.style.setProperty('--b', r.offsetWidth + 'px');
    };
    const zeigen = (k, merk = true) => {
      reiter.forEach((r) => { const an = r.dataset.reiter === k; r.setAttribute('aria-selected', String(an)); r.tabIndex = an ? 0 : -1; if (an) lichtSetzen(r); });
      tafeln.forEach((tf) => { tf.hidden = tf.id !== 'art-' + k; });
      if (merk) merken('preis-art', k);
      const aktiv = reiter.find((r) => r.dataset.reiter === k);
      if (aktiv && leiste.scrollWidth > leiste.clientWidth) leiste.scrollTo({ left: aktiv.offsetLeft - 16, behavior: ruhig ? 'auto' : 'smooth' });
    };
    reiter.forEach((r, i) => {
      r.addEventListener('click', (e) => { e.preventDefault(); zeigen(r.dataset.reiter); });
      r.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
        e.preventDefault(); const n = reiter[(i + d + reiter.length) % reiter.length]; n.focus(); zeigen(n.dataset.reiter);
      });
    });
    const start = (location.hash.startsWith('#art-') && location.hash.slice(5)) || new URLSearchParams(location.search).get('art') || holen('preis-art') || reiter[0]?.dataset.reiter;
    zeigen(reiter.some((r) => r.dataset.reiter === start) ? start : reiter[0].dataset.reiter, false);
    new ResizeObserver(() => lichtSetzen(reiter.find((r) => r.getAttribute('aria-selected') === 'true'))).observe(leiste);

    // Auswahl und Summe
    const summe = studio.querySelector('[data-summe]');
    const auswahl = studio.querySelector('[data-auswahl]');
    const leeren = studio.querySelector('[data-leeren]');
    const box = studio.querySelector('.ps-summe');
    const rechnen = () => {
      const gew = [...studio.querySelectorAll('.ps-leistung[aria-pressed="true"]')];
      let min = 0, max = 0, offen = false, anfrage = false;
      for (const g of gew) {
        const a = g.dataset.min, b = g.dataset.max;
        if (!a) { anfrage = true; continue; }
        min += +a; if (b) max += +b; else { max += +a; offen = true; }
      }
      box.classList.toggle('voll', gew.length > 0);
      leeren.hidden = !gew.length;
      if (!gew.length) { summe.textContent = 'Tippen Sie Leistungen an'; auswahl.textContent = ''; return; }
      const preis = min === max ? (offen ? 'ab ' : '') + min + ' €' : (offen ? 'ab ' + min + ' €' : min + ' bis ' + max + ' €');
      summe.innerHTML = '<b>' + (min ? preis : 'Preis auf Anfrage') + '</b>' + (anfrage && min ? ' <small>plus Leistung auf Anfrage</small>' : '');
      auswahl.textContent = gew.length + (gew.length === 1 ? ' Leistung: ' : ' Leistungen: ') + gew.map((g) => g.dataset.name).join(', ');
      if (!ruhig) { summe.classList.remove('puls'); void summe.offsetWidth; summe.classList.add('puls'); }
    };
    studio.addEventListener('click', (e) => {
      const l = e.target.closest('.ps-leistung'); if (!l) return;
      l.setAttribute('aria-pressed', String(l.getAttribute('aria-pressed') !== 'true')); rechnen();
    });
    leeren.addEventListener('click', () => { studio.querySelectorAll('.ps-leistung[aria-pressed="true"]').forEach((l) => l.setAttribute('aria-pressed', 'false')); rechnen(); });
    rechnen();
  }

  /* ---------- Fan Card: stanzt sich selbst, Hologramm folgt dem Finger ---------- */
  const fan = document.querySelector('.karte-fan');
  if (fan) {
    if (!ruhig && 'IntersectionObserver' in window && fan.getBoundingClientRect().top > innerHeight * 0.85) {
      [...fan.querySelectorAll('.loch')].forEach((l, i) => l.style.setProperty('--i', i));
      fan.classList.add('wartet');
      const b = new IntersectionObserver((es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        b.disconnect(); requestAnimationFrame(() => fan.classList.add('da'));
      }, { rootMargin: '0px 0px -22% 0px' });
      b.observe(fan);
    }
    if (!ruhig) {
      const buehne = fan.parentElement;
      const bewegen = (x, y) => {
        const r = fan.getBoundingClientRect();
        const px = klemmen((x - r.left) / r.width, 0, 1), py = klemmen((y - r.top) / r.height, 0, 1);
        fan.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        fan.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        fan.style.setProperty('--ry', ((px - 0.5) * 18).toFixed(2) + 'deg');
        fan.style.setProperty('--rx', ((0.5 - py) * 14).toFixed(2) + 'deg');
      };
      buehne.addEventListener('pointermove', (e) => bewegen(e.clientX, e.clientY));
      buehne.addEventListener('pointerleave', () => { fan.style.setProperty('--rx', '0deg'); fan.style.setProperty('--ry', '0deg'); });
      if (!feinZeiger) {
        // Am Handy wandert das Hologramm beim Scrollen über die Karte
        addEventListener('scroll', () => {
          const r = fan.getBoundingClientRect();
          const p = klemmen(1 - (r.top + r.height) / (innerHeight + r.height), 0, 1);
          fan.style.setProperty('--mx', (p * 100).toFixed(1) + '%');
          fan.style.setProperty('--my', (30 + p * 40).toFixed(1) + '%');
        }, { passive: true });
      }
    }
  }

  /* ---------- Auftritt in Dreiergruppen ---------- */
  // Einblenden nur mit Maus: am Handy bewegt sich beim Scrollen nichts von selbst
  if (!ruhig && feinZeiger && 'IntersectionObserver' in window) {
    const stuecke = [...document.querySelectorAll('.abschnitt-kopf, .haus-liste li, .galerie button, .insta-kacheln a, .ruf, .gruppe-kopf, .etage, .bald, .ring-kopf, .fuss-orte li')]
      .filter((el) => el.getBoundingClientRect().top > innerHeight);
    stuecke.forEach((el) => el.classList.add('auftritt'));
    const b = new IntersectionObserver((es) => {
      es.filter((e) => e.isIntersecting).forEach((e, i) => {
        setTimeout(() => e.target.classList.add('auftritt-da'), Math.floor(i / 3) * 90 + (i % 3) * 50);
        b.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -3% 0px' });
    stuecke.forEach((el) => b.observe(el));
  }

  /* ---------- Großes Bild mit Blättern und Rückkehr an dieselbe Stelle ---------- */
  const dialog = document.getElementById('gross');
  if (dialog && typeof dialog.showModal === 'function') {
    const fig = dialog.querySelector('figure');
    const img = document.createElement('img');
    img.decoding = 'async';
    fig.prepend(img);
    const unter = fig.querySelector('figcaption');
    let liste = [], pos = 0, zurueck = null;
    const zeigen = async (i) => {
      pos = (i + liste.length) % liste.length;
      const k = liste[pos];
      const neu = new Image(); neu.src = k.dataset.gross;
      try { await neu.decode(); } catch (e) { /* zeigt trotzdem */ }
      img.src = neu.src; img.alt = k.querySelector('img')?.alt || '';
      unter.textContent = img.alt + '  ·  ' + (pos + 1) + ' / ' + liste.length;
    };
    document.addEventListener('click', (e) => {
      const k = e.target.closest('[data-gross]'); if (!k) return;
      liste = [...k.parentElement.querySelectorAll('[data-gross]')];
      zurueck = k; zeigen(liste.indexOf(k)); dialog.showModal();
    });
    dialog.querySelector('.gross-vor')?.addEventListener('click', () => zeigen(pos + 1));
    dialog.querySelector('.gross-zurueck')?.addEventListener('click', () => zeigen(pos - 1));
    dialog.querySelector('.gross-zu')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') zeigen(pos + 1);
      if (e.key === 'ArrowLeft') zeigen(pos - 1);
    });
    let x0 = null;
    dialog.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    dialog.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) zeigen(pos + (dx < 0 ? 1 : -1));
    });
    dialog.addEventListener('close', () => zurueck?.focus({ preventScroll: true }));
  }

  /* ---------- Karte erst nach Klick laden (Datenschutz) ---------- */
  for (const knopf of document.querySelectorAll('[data-karte]')) {
    knopf.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = knopf.dataset.karte; f.title = knopf.dataset.titel || 'Karte';
      f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade'; f.allowFullscreen = true;
      knopf.closest('.karte-hier').replaceChildren(f);
    }, { once: true });
  }

  for (const j of document.querySelectorAll('[data-jahr]')) j.textContent = new Date().getFullYear();
})();
