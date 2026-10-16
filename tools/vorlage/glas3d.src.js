/* Glasschrift der Standortseiten: der Name als Röhren aus klarem Glas, randlos und schräg im Raum
   wie in der Referenz. Weiße Lichtkanten, Blau aus dem Leuchtschild, dahinter weiche Lichtwolken,
   die sich im Glas brechen. Die Buchstaben sind eigene Linienzüge (kein Schriftumriss), damit sie
   als runde Glasröhren mit durchgehenden Kanten gebaut werden können.
   Quelle für assets/js/glas3d.js, bündeln mit:
   npx esbuild tools/glas3d.src.js --bundle --minify --format=esm --outfile=assets/js/glas3d.js
   Steuerung über <canvas class="glas-3d">:
     data-zeilen="MIRA"          Zeilen im Querformat, | = neue Zeile
     data-zeilen-hoch="MI|RA"    Zeilen im Hochformat (Handy)
     data-farbe="blau|eis|gold"  Lichtstimmung je Salon */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, BufferGeometry, BufferAttribute,
  MeshPhysicalMaterial, MeshBasicMaterial, PlaneGeometry, BoxGeometry, PMREMGenerator, Sprite, SpriteMaterial,
  CanvasTexture, ShaderMaterial, WebGLCubeRenderTarget, CubeCamera, CubeRefractionMapping, HalfFloatType, Vector2, Vector3, Color, NeutralToneMapping, SRGBColorSpace, BackSide, AdditiveBlending,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const leinwand = document.querySelector('canvas.glas-3d');
const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
const klein = matchMedia('(max-width: 52rem)').matches;

function webglMoeglich() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

/* ---------------------------------------------------------------- Buchstaben
   Mittellinien in Einheiten der Versalhöhe 100. M/L = Gerade, A = Bogen (Mitte, Radius, Winkel von → bis in Grad),
   Z = geschlossen. Ecken zwischen Geraden werden gerundet. b = Breite der Mittellinie. */
const ZEICHEN = {
  I: { b: 0, z: [[['M', 0, 0], ['L', 0, 100]]] },
  M: { b: 78, z: [[['M', 0, 0], ['L', 0, 100], ['L', 39, 26], ['L', 78, 100], ['L', 78, 0]]] },
  R: { b: 66, z: [[['M', 0, 0], ['L', 0, 100], ['L', 32, 100], ['A', 32, 74, 26, 90, -90], ['L', 0, 48]], [['M', 30, 48], ['L', 66, 0]]] },
  A: { b: 72, z: [[['M', 0, 0], ['L', 36, 100], ['L', 72, 0]], [['M', 15, 36], ['L', 57, 36]]] },
  B: { b: 58, z: [[['M', 0, 0], ['L', 0, 100], ['L', 28, 100], ['A', 28, 76, 24, 90, -90], ['L', 0, 52]], [['M', 0, 52], ['L', 32, 52], ['A', 32, 26, 26, 90, -90], ['L', 0, 0]]] },
  E: { b: 62, z: [[['M', 62, 100], ['L', 0, 100], ['L', 0, 0], ['L', 62, 0]], [['M', 0, 52], ['L', 52, 52]]] },
  S: { b: 55, z: [[['A', 30, 75, 25, 28, 270], ['A', 30, 25, 25, 90, -152]]] },
  T: { b: 72, z: [[['M', 0, 100], ['L', 72, 100]], [['M', 36, 100], ['L', 36, 0]]] },
  O: { b: 68, z: [[['M', 68, 34], ['L', 68, 66], ['A', 34, 66, 34, 0, 180], ['L', 0, 34], ['A', 34, 34, 34, 180, 360], ['Z']]] },
  C: { b: 64, z: [[['A', 34, 66, 34, 32, 180], ['L', 0, 34], ['A', 34, 34, 34, 180, 328]]] },
  D: { b: 62, z: [[['M', 0, 0], ['L', 0, 100], ['L', 28, 100], ['A', 28, 66, 34, 90, 0], ['L', 62, 34], ['A', 28, 34, 34, 0, -90], ['Z']]] },
  F: { b: 58, z: [[['M', 58, 100], ['L', 0, 100], ['L', 0, 0]], [['M', 0, 52], ['L', 46, 52]]] },
  G: { b: 68, z: [[['A', 34, 66, 34, 32, 180], ['L', 0, 34], ['A', 34, 34, 34, 180, 360], ['L', 68, 46], ['L', 40, 46]]] },
  H: { b: 66, z: [[['M', 0, 0], ['L', 0, 100]], [['M', 66, 0], ['L', 66, 100]], [['M', 0, 52], ['L', 66, 52]]] },
  J: { b: 50, z: [[['M', 50, 100], ['L', 50, 28], ['A', 25, 28, 25, 0, -180]]] },
  K: { b: 62, z: [[['M', 0, 0], ['L', 0, 100]], [['M', 60, 100], ['L', 4, 46]], [['M', 22, 63], ['L', 62, 0]]] },
  L: { b: 54, z: [[['M', 0, 100], ['L', 0, 0], ['L', 54, 0]]] },
  N: { b: 66, z: [[['M', 0, 0], ['L', 0, 100]], [['M', 2, 98], ['L', 64, 2]], [['M', 66, 0], ['L', 66, 100]]] },
  P: { b: 58, z: [[['M', 0, 0], ['L', 0, 100], ['L', 32, 100], ['A', 32, 74, 26, 90, -90], ['L', 0, 48]]] },
  Q: { b: 70, z: [[['M', 68, 34], ['L', 68, 66], ['A', 34, 66, 34, 0, 180], ['L', 0, 34], ['A', 34, 34, 34, 180, 360], ['Z']], [['M', 44, 22], ['L', 70, -4]]] },
  U: { b: 66, z: [[['M', 0, 100], ['L', 0, 33], ['A', 33, 33, 33, 180, 360], ['L', 66, 100]]] },
  V: { b: 72, z: [[['M', 0, 100], ['L', 36, 0], ['L', 72, 100]]] },
  W: { b: 96, z: [[['M', 0, 100], ['L', 22, 0], ['L', 48, 72], ['L', 74, 0], ['L', 96, 100]]] },
  X: { b: 64, z: [[['M', 0, 100], ['L', 64, 0]], [['M', 0, 0], ['L', 64, 100]]] },
  Y: { b: 68, z: [[['M', 0, 100], ['L', 34, 50], ['L', 68, 100]], [['M', 34, 50], ['L', 34, 0]]] },
  Z: { b: 62, z: [[['M', 0, 100], ['L', 62, 100], ['L', 0, 0], ['L', 62, 0]]] },
  "'": { b: 0, z: [[['M', 0, 100], ['L', 0, 76]]] },
  '-': { b: 40, z: [[['M', 0, 50], ['L', 40, 50]]] },
  '.': { b: 0, z: [[['M', 0, 2], ['L', 0, 3]]] },
  '&': { b: 70, z: [[['M', 70, 0], ['L', 14, 64], ['A', 30, 78, 22, 200, 0], ['L', 8, 30], ['A', 32, 26, 26, 160, 360], ['L', 66, 40]]] },
  ' ': { b: 18, z: [] },
};
// Umlaute: Grundbuchstabe plus zwei Punkte (kurze Röhren mit Kuppelenden werden zu runden Perlen)
for (const [u, g] of [['Ä', 'A'], ['Ö', 'O'], ['Ü', 'U']]) {
  const b = ZEICHEN[g].b, m = b / 2;
  ZEICHEN[u] = { b, z: [...ZEICHEN[g].z, [['M', m - 18, 126], ['L', m - 17, 126]], [['M', m + 17, 126], ['L', m + 18, 126]]] };
}
const HALB_B = 13;      // halbe Röhrenbreite in der Ebene
const HALB_T = 14;    // halbe Röhrentiefe
const ABSTAND = 2 * HALB_B + 24;
const ZEILE = 100 + 2 * HALB_B + 30;

/* Linienzug abtasten: Bögen fein, Ecken gerundet, Geraden gleichmäßig unterteilt */
function abtasten(befehle, radius = 9, schritt = 2.2) {
  const p = [];
  let zu = false;
  const dazu = (x, y, ecke) => {
    const l = p[p.length - 1];
    if (l && Math.hypot(l.x - x, l.y - y) < 1e-6) { l.ecke = l.ecke && ecke; return; }
    p.push({ x, y, ecke });
  };
  for (let i = 0; i < befehle.length; i++) {
    const [typ, ...w] = befehle[i];
    const naechster = befehle[i + 1]?.[0];
    if (typ === 'M') dazu(w[0], w[1], false);
    else if (typ === 'L') {
      if (p.length) p[p.length - 1].ecke = p[p.length - 1].ecke || befehle[i - 1]?.[0] === 'L';
      dazu(w[0], w[1], naechster === 'L' || naechster === 'Z');
    } else if (typ === 'A') {
      const [cx, cy, r, a0, a1] = w;
      const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * Math.PI / 180 * r / schritt));
      for (let k = 0; k <= n; k++) {
        const a = (a0 + (a1 - a0) * (k / n)) * Math.PI / 180;
        dazu(cx + r * Math.cos(a), cy + r * Math.sin(a), false);
      }
    } else if (typ === 'Z') zu = true;
  }
  if (zu && p.length > 2 && Math.hypot(p[0].x - p.at(-1).x, p[0].y - p.at(-1).y) < 1e-6) p.pop();
  // gesetzte Ecken: nur dort, wo zwei Geraden zusammenstoßen
  const runde = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[(i - 1 + p.length) % p.length], b = p[i], c = p[(i + 1) % p.length];
    const offen = !zu && (i === 0 || i === p.length - 1);
    if (!b.ecke || offen) { runde.push(b); continue; }
    const u1 = new Vector2(a.x - b.x, a.y - b.y), u2 = new Vector2(c.x - b.x, c.y - b.y);
    const l1 = u1.length(), l2 = u2.length(); u1.normalize(); u2.normalize();
    const th = Math.acos(Math.max(-1, Math.min(1, u1.dot(u2))));
    if (th > Math.PI - 0.05) { runde.push(b); continue; }
    let d = radius / Math.tan(th / 2);
    d = Math.min(d, l1 * 0.48, l2 * 0.48);
    const r = d * Math.tan(th / 2);
    const mitte = new Vector2().addVectors(u1, u2).normalize().multiplyScalar(r / Math.sin(th / 2)).add(new Vector2(b.x, b.y));
    const p1 = new Vector2(b.x + u1.x * d, b.y + u1.y * d), p2 = new Vector2(b.x + u2.x * d, b.y + u2.y * d);
    let w1 = Math.atan2(p1.y - mitte.y, p1.x - mitte.x), w2 = Math.atan2(p2.y - mitte.y, p2.x - mitte.x);
    let dw = w2 - w1; while (dw > Math.PI) dw -= 2 * Math.PI; while (dw < -Math.PI) dw += 2 * Math.PI;
    const n = Math.max(4, Math.ceil(Math.abs(dw) * r / (schritt * 0.7)));
    for (let k = 0; k <= n; k++) { const w = w1 + dw * (k / n); runde.push({ x: mitte.x + r * Math.cos(w), y: mitte.y + r * Math.sin(w) }); }
  }
  // Geraden gleichmäßig unterteilen
  const fein = [];
  const m = zu ? runde.length : runde.length - 1;
  for (let i = 0; i < m; i++) {
    const a = runde[i], b = runde[(i + 1) % runde.length];
    const l = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(l / schritt));
    for (let k = 0; k < n; k++) fein.push(new Vector2(a.x + (b.x - a.x) * (k / n), a.y + (b.y - a.y) * (k / n)));
  }
  if (!zu) fein.push(new Vector2(runde.at(-1).x, runde.at(-1).y));
  return { punkte: fein, zu };
}

/* Röhre mit abgerundet-eckigem Querschnitt (Superellipse) entlang eines ebenen Linienzugs, offene Enden als Kuppel */
function roehre({ punkte, zu }, rund, ox, oy, HB = HALB_B, HT = HALB_T, oz = 0) {
  const n = punkte.length;
  const profil = [];
  const EXP = 2.6;
  for (let j = 0; j < rund; j++) {
    const w = (j / rund) * Math.PI * 2, c = Math.cos(w), s = Math.sin(w);
    const px = Math.sign(c) * Math.pow(Math.abs(c), 2 / EXP) * HB, py = Math.sign(s) * Math.pow(Math.abs(s), 2 / EXP) * HT;
    const nx = Math.sign(c) * Math.pow(Math.abs(px / HB), EXP - 1) / HB, ny = Math.sign(s) * Math.pow(Math.abs(py / HT), EXP - 1) / HT;
    const l = Math.hypot(nx, ny) || 1;
    profil.push([px, py, nx / l, ny / l]);
  }
  const ringe = [];   // { p, t, normale, skala, vor }
  const tangente = (i) => {
    const a = punkte[zu ? (i - 1 + n) % n : Math.max(0, i - 1)], b = punkte[zu ? (i + 1) % n : Math.min(n - 1, i + 1)];
    return new Vector2(b.x - a.x, b.y - a.y).normalize();
  };
  const KUPPEL = klein ? 4 : 6;
  if (!zu) {
    const t = tangente(0);
    for (let k = KUPPEL; k >= 1; k--) { const th = (k / KUPPEL) * Math.PI / 2; ringe.push({ p: punkte[0].clone().addScaledVector(t, -Math.sin(th) * HB), t, s: Math.max(0.03, Math.cos(th)), v: -Math.sin(th) }); }
  }
  for (let i = 0; i < n; i++) ringe.push({ p: punkte[i], t: tangente(i), s: 1, v: 0 });
  if (!zu) {
    const t = tangente(n - 1);
    for (let k = 1; k <= KUPPEL; k++) { const th = (k / KUPPEL) * Math.PI / 2; ringe.push({ p: punkte[n - 1].clone().addScaledVector(t, Math.sin(th) * HB), t, s: Math.max(0.03, Math.cos(th)), v: Math.sin(th) }); }
  }
  const pos = new Float32Array(ringe.length * rund * 3), nor = new Float32Array(pos.length);
  ringe.forEach((r, i) => {
    const nx = -r.t.y, ny = r.t.x;
    for (let j = 0; j < rund; j++) {
      const [px, py, qx, qy] = profil[j], k = i * rund + j;
      pos[k * 3] = ox + r.p.x + nx * px * r.s; pos[k * 3 + 1] = oy + r.p.y + ny * px * r.s; pos[k * 3 + 2] = oz + py * r.s;
      const c = Math.sqrt(Math.max(0, 1 - r.v * r.v));
      let wx = (nx * qx) * c + r.t.x * r.v, wy = (ny * qx) * c + r.t.y * r.v, wz = qy * c;
      const l = Math.hypot(wx, wy, wz) || 1;
      nor[k * 3] = wx / l; nor[k * 3 + 1] = wy / l; nor[k * 3 + 2] = wz / l;
    }
  });
  const idx = [];
  const m = zu ? ringe.length : ringe.length - 1;
  for (let i = 0; i < m; i++) {
    const a0 = i * rund, b0 = ((i + 1) % ringe.length) * rund;
    for (let j = 0; j < rund; j++) {
      const j1 = (j + 1) % rund;
      idx.push(a0 + j, a0 + j1, b0 + j, b0 + j, a0 + j1, b0 + j1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('normal', new BufferAttribute(nor, 3));
  g.setIndex(idx);
  return { g, ringe, profil };
}

/* ---------------------------------------------------------------- Licht */

const STIMMUNG = {
  // weiß = harte Lichtkanten, blau = Leuchtschild, eis = kühle Spiegelung, warm = Akzent
  blau: { weiss: 1, blau: '#1769ff', eis: '#8cd0ff', warm: null, glas: '#cfe0ff', wolken: ['#1f5fff', '#3f8cff', '#bfe4ff'], winkel: -0.34 },
  eis: { weiss: 1.15, blau: '#2b6fe8', eis: '#cfe9ff', warm: null, glas: '#eef5ff', wolken: ['#2b4fb8', '#8fb8ff', '#e8f3ff'], winkel: 1.15 },
  gold: { weiss: 1, blau: '#1769ff', eis: '#9fd6ff', warm: '#ffd7a1', glas: '#d6e4ff', wolken: ['#1f5fff', '#3f8cff', '#ffe6c4'], winkel: 0.12 },
};

function umgebung(renderer, st) {
  const raum = new Scene();
  raum.background = new Color('#020203');
  raum.add(new Mesh(new BoxGeometry(40, 40, 40), new MeshBasicMaterial({ color: '#030305', side: BackSide })));
  const leiste = (farbe, x, y, z, b, h, rx, ry, staerke) => {
    const m = new Mesh(new PlaneGeometry(b, h), new MeshBasicMaterial({ color: new Color(farbe).multiplyScalar(staerke), side: 2 }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.lookAt(0, 0, 0); m.rotateZ(rx); raum.add(m);
  };
  const w = st.weiss;
  // harte weiße Leisten: geben die glühenden Kanten
  leiste('#ffffff', 0, 14, 4, 26, 0.7, 0, 0, 16 * w);
  leiste('#ffffff', -13, 3, 8, 0.45, 22, 0, 0, 12 * w);
  leiste('#ffffff', 13, -2, 9, 0.4, 20, 0, 0, 10 * w);
  leiste('#ffffff', 6, 9, 14, 12, 0.35, 0.5, 0, 9 * w);
  leiste('#ffffff', -8, -10, 12, 14, 0.3, -0.4, 0, 7 * w);
  // weiche Flächen in Blau und Eis: färben Flanken und Inneres
  leiste(st.blau, -16, -4, -6, 6, 26, 0, 0, 4.4);
  leiste(st.blau, 16, 5, -4, 5, 24, 0, 0, 4.0);
  leiste(st.eis, -6, 8, -14, 10, 2.5, 0.3, 0, 3.0);
  leiste(st.eis, 0, -15, 6, 30, 3, 0, 0, 2.6);
  leiste(st.blau, 0, 4, -18, 30, 8, 0, 0, 1.4);
  if (st.warm) leiste(st.warm, 10, 12, -8, 9, 0.6, 0.3, 0, 4.5);
  // große weiche Flächen über und vor dem Wort: die liegenden Buchstaben spiegeln sie breit
  leiste('#dfeaff', 0, 16, 16, 30, 6, 0, 0, 1.1 * w);
  leiste(st.blau, 0, -12, 18, 34, 7, 0, 0, 2.2);
  leiste(st.eis, -18, 10, 12, 6, 14, 0, 0, 2.0);
  // hinter dem Wort: was man durch das Glas hindurch gebrochen sieht
  leiste('#ffffff', 3, -1, -16, 26, 0.45, 0.35, 0, 5 * w);
  leiste('#ffffff', -5, 6, -15, 0.4, 18, 0.2, 0, 4 * w);
  leiste(st.blau, 8, 7, -13, 4, 16, 0, 0, 3.4);
  leiste(st.blau, -9, -6, -14, 8, 3, 0.4, 0, 3.0);
  leiste(st.eis, -2, -8, -12, 18, 0.4, -0.3, 0, 3 * w);
  leiste('#ffffff', 10, -9, -10, 0.5, 14, -0.5, 0, 6 * w);
  leiste('#ffffff', -12, 9, -9, 16, 0.5, 0.6, 0, 5 * w);
  leiste(st.eis, 0, 0, -19, 22, 6, 0, 0, 0.9);
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(raum, 0.02).texture;
  pmrem.dispose();
  // dieselbe Umgebung scharf als Würfel: aus ihr bricht das Glas sein Inneres
  const ziel = new WebGLCubeRenderTarget(klein ? 256 : 512, { type: HalfFloatType });
  new CubeCamera(0.1, 100, ziel).update(renderer, raum);
  ziel.texture.mapping = CubeRefractionMapping;
  return { env, bruch: ziel.texture };
}

/* Funkeln: Lichtstern mit langen waagrechten Strahlen */
function sternTextur() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const kern = x.createRadialGradient(64, 64, 0, 64, 64, 22);
  kern.addColorStop(0, 'rgba(255,255,255,1)'); kern.addColorStop(0.25, 'rgba(220,235,255,.65)'); kern.addColorStop(1, 'rgba(120,170,255,0)');
  x.fillStyle = kern; x.fillRect(0, 0, 128, 128);
  const strahl = (b, h, a) => {
    const g = x.createLinearGradient(64 - b, 0, 64 + b, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(64 - b, 64 - h / 2, b * 2, h);
  };
  strahl(64, 2.2, 1);
  x.save(); x.translate(64, 64); x.rotate(Math.PI / 2); x.translate(-64, -64); strahl(34, 1.6, 0.8); x.restore();
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
  return t;
}

/* ---------------------------------------------------------------- Aufbau */

function start() {
  let st = STIMMUNG[leinwand.dataset.farbe] || STIMMUNG.blau;
  try { if (leinwand.dataset.licht) st = { ...st, ...JSON.parse(leinwand.dataset.licht) }; } catch (e) { /* Standard behalten */ }
  const renderer = new WebGLRenderer({ canvas: leinwand, antialias: true, powerPreference: 'high-performance' });
  const dpr = Math.min(devicePixelRatio, klein ? 1.5 : 1.6);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = NeutralToneMapping;   // hält Blau rein (ACES kippt gesättigtes Blau ins Violette)
  renderer.toneMappingExposure = ruhig ? 1.05 : 0;
  renderer.outputColorSpace = SRGBColorSpace;

  const szene = new Scene();
  const licht = umgebung(renderer, st);
  szene.environment = licht.env;
  szene.background = new Color('#020203');
  const kamera = new PerspectiveCamera(36, 1, 0.1, 200);
  kamera.position.set(0, 0, 16);

  /* Hintergrund: weiche Lichtwolken weit hinten, die langsam wandern (deckend, damit das Glas sie bricht) */
  const wolkenZeit = { value: 0 };
  const wolken = new Mesh(new PlaneGeometry(1, 1), new ShaderMaterial({
    uniforms: { uZeit: wolkenZeit, uA: { value: new Color(st.wolken[0]) }, uB: { value: new Color(st.wolken[1]) }, uC: { value: new Color(st.wolken[2]) }, uWinkel: { value: st.winkel } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform float uZeit, uWinkel; uniform vec3 uA, uB, uC; varying vec2 vUv;
      float wolke(vec2 p, vec2 m, vec2 r) { vec2 d = (p - m) / r; return exp(-dot(d, d)); }
      void main() {
        vec2 p = vUv * 2.0 - 1.0; p.x *= 1.6;
        float t = uZeit;
        vec3 f = uA * wolke(p, vec2(-0.9 + 0.35 * sin(t * 0.07), 0.25 + 0.2 * cos(t * 0.05)), vec2(0.9, 0.45)) * 0.9
               + uB * wolke(p, vec2(0.85 + 0.3 * cos(t * 0.06), -0.2 + 0.25 * sin(t * 0.08)), vec2(0.8, 0.5)) * 0.75
               + uC * wolke(p, vec2(0.1 + 0.5 * sin(t * 0.045), 0.05 * cos(t * 0.09)), vec2(1.1, 0.22)) * 0.55;
        // ein schmaler Lichtstreif, der schräg langsam durchzieht
        vec2 q = vec2(cos(uWinkel) * p.x - sin(uWinkel) * p.y, sin(uWinkel) * p.x + cos(uWinkel) * p.y);
        float streif = exp(-pow((q.y - 0.55 * sin(t * 0.05)) / 0.035, 2.0)) * smoothstep(1.8, 0.0, abs(q.x));
        f += vec3(0.9, 0.95, 1.0) * streif * 0.12;
        gl_FragColor = vec4(f * 0.022, 1.0);
      }`,
    toneMapped: false,
  }));
  wolken.position.z = -30;
  szene.add(wolken);

  /* Glas */
  /* Glas in zwei Schichten: innen die gebrochene Umgebung, außen die Spiegelung (additiv, Fresnel aus dem Material) */
  const innen = new MeshBasicMaterial({ color: new Color(st.glas), envMap: licht.bruch, refractionRatio: 0.8 });
  const aussen = new MeshPhysicalMaterial({
    color: '#000000', metalness: 0, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.015,
    specularIntensity: 1, specularColor: new Color('#ffffff'), envMapIntensity: 3,
    transparent: true, blending: AdditiveBlending, depthWrite: false,
  });
  const rund = klein ? 18 : 26;
  const sterne = [];
  const sternMat = new SpriteMaterial({ map: sternTextur(), blending: AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });

  /* Wort aus Zeilen bauen (Welt-Einheit = Schrift-Einheit; skaliert wird die Gruppe) */
  function wortBauen(zeilen) {
    const gruppe = new Group();
    const breiten = zeilen.map((z) => [...z].reduce((s, ch, i) => s + (ZEICHEN[ch]?.b ?? 0) + (i ? ABSTAND : 0), 0));
    const maxB = Math.max(...breiten);
    let saat = 7;
    const zufall = () => (saat = (saat * 9301 + 49297) % 233280) / 233280;
    const kandidaten = [];
    zeilen.forEach((z, zi) => {
      // Zeilen gegeneinander versetzt, wie in der Referenz
      const versatz = zeilen.length > 1 ? (zi - (zeilen.length - 1) / 2) * maxB * 0.16 : 0;
      let x = -breiten[zi] / 2 + versatz;
      const y = ((zeilen.length - 1) / 2 - zi) * ZEILE - 50;
      for (const ch of z) {
        const zei = ZEICHEN[ch]; if (!zei) continue;
        for (const zug of zei.z) {
          const pfad = abtasten(zug);
          const { g, ringe } = roehre(pfad, rund, x, y);
          gruppe.add(new Mesh(g, innen));
          const spiegel = new Mesh(g, aussen); spiegel.renderOrder = 1;
          gruppe.add(spiegel);
          // Kandidaten für Funkeln: obere vordere Kante
          for (let k = 0; k < 3; k++) {
            const r = ringe[Math.floor(zufall() * ringe.length)];
            if (r.s < 1) continue;
            kandidaten.push(new Vector3(x + r.p.x - r.t.y * HALB_B * 0.55, y + r.p.y + r.t.x * HALB_B * 0.55, HALB_T * 0.85));
          }
        }
        x += zei.b + ABSTAND;
      }
    });
    const anzahl = klein ? 5 : 9;
    for (let i = 0; i < anzahl && kandidaten.length; i++) {
      const s = new Sprite(sternMat);
      s.position.copy(kandidaten.splice(Math.floor(zufall() * kandidaten.length), 1)[0]);
      s.userData = { phase: zufall() * Math.PI * 2, tempo: 0.5 + zufall() * 0.9, groesse: 34 + zufall() * 40 };
      s.scale.setScalar(0.001);
      gruppe.add(s); sterne.push(s);
    }
    return gruppe;
  }

  const zeilenQuer = (leinwand.dataset.zeilen || 'MIRA').split('|');
  const zeilenHoch = (leinwand.dataset.zeilenHoch || leinwand.dataset.zeilen || 'MIRA').split('|');
  const halter = new Group();
  szene.add(halter);
  let wort = null, wortHoch = null;

  /* Nachbearbeitung: Leuchten der weißen Kanten */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(szene, kamera));
  const bloom = new UnrealBloomPass(new Vector2(256, 256), klein ? 0.32 : 0.38, 0.35, 0.94);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* Größe: Wort randlos, leicht über den Rand hinaus, schräg nach hinten gelegt */
  let hochkant = false, basis = { x: -0.6, y: 0.2, z: 0.05 }, skala = 0.02;
  const ecken = [];
  const ndc = new Vector3();
  function messen() {
    halter.updateMatrixWorld(true);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const e of ecken) {
      ndc.copy(e).applyMatrix4(wort.matrixWorld).project(kamera);
      x0 = Math.min(x0, ndc.x); x1 = Math.max(x1, ndc.x); y0 = Math.min(y0, ndc.y); y1 = Math.max(y1, ndc.y);
    }
    return { b: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  function groesse() {
    const b = leinwand.clientWidth, h = leinwand.clientHeight;
    if (!b || !h) return;
    renderer.setSize(b, h, false);
    composer.setPixelRatio(dpr); composer.setSize(b, h);
    bloom.resolution.set(b / 2, h / 2);
    kamera.aspect = b / h;
    kamera.updateProjectionMatrix();
    const hoch = kamera.aspect < 0.95;
    if (!wort || hoch !== hochkant) {
      hochkant = hoch;
      if (wort) halter.remove(wort);
      sterne.length = 0;
      wort = wortBauen(hochkant ? zeilenHoch : zeilenQuer);
      halter.add(wort);
      // Rahmen des Worts für die Einpassung
      wort.updateMatrixWorld(true);
      ecken.length = 0;
      const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
      wort.children.forEach((m) => { if (!m.geometry) return; m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox; box.x0 = Math.min(box.x0, bb.min.x); box.x1 = Math.max(box.x1, bb.max.x); box.y0 = Math.min(box.y0, bb.min.y); box.y1 = Math.max(box.y1, bb.max.y); });
      for (const x of [box.x0, box.x1]) for (const y of [box.y0, box.y1]) for (const z of [-HALB_T, HALB_T]) ecken.push(new Vector3(x, y, z));
    }
    basis = hochkant ? { x: -0.26, y: 0.1, z: 0.04 } : { x: -0.58, y: 0.2, z: 0.06 };
    // gewünschte Fläche im Bild: Querformat etwas breiter als der Schirm (angeschnitten), Hochformat fast bis an die Ränder
    const sollB = hochkant ? (Math.max(...zeilenHoch.map((z) => z.length)) > 4 ? 1.94 : 2.06) : (Math.max(...zeilenQuer.map((z) => z.length)) > 4 ? 2.0 : 2.3), sollH = hochkant ? 1.12 : (zeilenQuer.length > 1 ? 1.5 : 1.8);
    halter.position.set(0, 0, 0);
    halter.rotation.set(basis.x, basis.y, basis.z);
    skala = 0.02; halter.scale.setScalar(skala);
    for (let i = 0; i < 4; i++) {
      const m = messen();
      skala *= Math.min(sollB / m.b, sollH / m.h);
      halter.scale.setScalar(skala);
      const m2 = messen();
      const sichtH = 2 * Math.tan((kamera.fov * Math.PI) / 360) * (kamera.position.z - halter.position.z);
      halter.position.x -= (m2.cx - (!hochkant && zeilenQuer.length > 1 ? 0.12 : 0)) * sichtH * kamera.aspect / 2;   // versetzte Zeilen wirken sonst nach links gerückt
      halter.position.y -= (m2.cy - (hochkant ? 0.3 : 0.1)) * sichtH / 2;   // oberhalb der Leiste unten
    }
    const wh = 2 * Math.tan((kamera.fov * Math.PI) / 360) * (kamera.position.z - wolken.position.z);
    wolken.scale.set(wh * kamera.aspect * 1.15, wh * 1.15, 1);
    basisPos.copy(halter.position);
  }
  const basisPos = new Vector3();
  groesse();
  new ResizeObserver(() => { groesse(); if (!lauf) einmal(); }).observe(leinwand);

  /* Zeiger und Scrollen */
  const ziel = { x: 0, y: 0, s: 0 }, ist = { x: 0, y: 0, s: 0 };
  addEventListener('pointermove', (e) => { ziel.x = (e.clientX / innerWidth - 0.5) * 2; ziel.y = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  addEventListener('scroll', () => { ziel.s = Math.min(1, scrollY / innerHeight); }, { passive: true });

  let auf = -1;

  let sichtbar = true, lauf = 0, letzt = performance.now(), sek = 0;
  const zeichnen = (t) => {
    const dt = Math.min(0.05, Math.max(0, (t - letzt) / 1000)); letzt = t;
    if (!ruhig) sek += dt;
    const k = 1 - Math.exp(-dt * 2.6);
    ist.x += (ziel.x - ist.x) * k; ist.y += (ziel.y - ist.y) * k; ist.s += (ziel.s - ist.s) * k;
    const p = auf < 0 ? 0 : ruhig ? 1 : Math.min(1, (t - auf) / 2600), e = 1 - Math.pow(1 - p, 4);
    renderer.toneMappingExposure = 1.05 * (ruhig ? 1 : Math.min(1, p * 1.6));
    // schwebt leicht, folgt dem Zeiger, kippt beim Scrollen weiter nach hinten
    const welle = ruhig ? 0 : Math.sin(sek * 0.4) * 0.025;
    halter.rotation.set(
      basis.x - (1 - e) * 0.85 + ist.y * 0.05 - ist.s * 0.3 + welle,
      basis.y + ist.x * 0.08 + welle * 0.6,
      basis.z,
    );
    halter.position.set(basisPos.x, basisPos.y + ist.s * 2.5, basisPos.z - (1 - e) * 9);
    // Licht wandert über die Kanten; beim Auftritt einmal kräftig darüber
    szene.environmentRotation.set(0.15 + ist.y * 0.1, -1.6 * (1 - e) + Math.sin(sek * 0.11) * 0.42 + ist.x * 0.3, 0);
    innen.envMapRotation.copy(szene.environmentRotation);
    wolkenZeit.value = sek + 20;
    for (const s of sterne) {
      const f = ruhig ? 0.5 : Math.pow(Math.max(0, Math.sin(sek * s.userData.tempo + s.userData.phase)), 6);
      s.scale.setScalar(Math.max(0.001, s.userData.groesse * f * e));
    }
    composer.render(dt);
    lauf = sichtbar && !ruhig && !document.hidden ? requestAnimationFrame(zeichnen) : 0;
  };
  const einmal = () => { if (!lauf) requestAnimationFrame((t) => { letzt = t; zeichnen(t); }); };
  /* Auftritt nach dem Ladevorhang */
  const los = () => { if (auf < 0) { const seit = performance.now() - (+document.documentElement.dataset.vorhangAuf || performance.now()); auf = performance.now() - (seit > 700 ? 2600 : 0); einmal(); } };
  if (document.documentElement.dataset.vorhang !== 'zu') los();
  else document.addEventListener('vorhang-auf', los, { once: true });
  renderer.compile(szene, kamera);
  requestAnimationFrame((t) => {
    letzt = t; zeichnen(t);
    leinwand.classList.add('bereit');
    leinwand.closest('[data-glas]')?.classList.add('glas-an');
    document.documentElement.dataset.glas = 'bereit';
    document.dispatchEvent(new Event('glas-bereit'));
  });
  new IntersectionObserver(([e]) => {
    sichtbar = e.isIntersecting;
    if (sichtbar && !lauf && !ruhig) { letzt = performance.now(); lauf = requestAnimationFrame(zeichnen); }
  }).observe(leinwand);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && sichtbar && !ruhig && !lauf) { letzt = performance.now(); lauf = requestAnimationFrame(zeichnen); }
  });
}

// erst hier starten: alle Konstanten oben sind dann gesetzt
if (leinwand && webglMoeglich()) start();
