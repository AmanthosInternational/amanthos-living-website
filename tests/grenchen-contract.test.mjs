/**
 * Kontrakttest fuer die Seite grenchen-mieten (Segment 0, Kontrakte K1 und K2).
 *
 * Prueft die Datendatei und die Konstanten. Der DOM-Teil (K5) kommt dazu,
 * sobald das Fixture, grenchen-mieten/index.html und js/grenchen-page.js
 * existieren; fehlt eine dieser Dateien, wird der jeweilige Teil uebersprungen
 * statt rot.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(import.meta.url);
const units = require(join(here, '..', 'js', 'grenchen-units.js'));
const config = require(join(here, '..', 'js', 'grenchen-config.js'));
const dom = JSON.parse(readFileSync(join(here, 'fixtures', 'grenchen-dom-contract.json'), 'utf8'));

const pageFile = join(root, 'grenchen-mieten', 'index.html');
const pageFrFile = join(root, 'grenchen-louer', 'index.html');
const scriptFile = join(root, 'js', 'grenchen-page.js');
const skeletonFile = join(here, 'fixtures', 'grenchen-skeleton.html');

// Masse direkt aus dem RIFF-Kopf der webp-Datei, damit die Werte im Fixture
// nicht von Hand gepflegt werden muessen und ein neu konvertiertes Bild sofort
// auffaellt (Segment 2 setzt width und height daraus, sonst springt das Layout).
function webpSize(buf) {
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buf.toString('ascii', 8, 12), 'WEBP');
  const kind = buf.toString('ascii', 12, 16);
  if (kind === 'VP8 ') {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (kind === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (kind === 'VP8X') {
    return {
      width: buf.readUIntLE(24, 3) + 1,
      height: buf.readUIntLE(27, 3) + 1
    };
  }
  throw new Error('unbekannter webp-Chunk ' + kind);
}

// ---- K1: Wohnungsdaten ----------------------------------------------------

test('K1: grenchen-units.js exportiert UNITS und VERSION', () => {
  assert.equal(config.VERSION, '1');
  assert.equal(units.VERSION, '1');
  assert.ok(Array.isArray(units.UNITS));
});

test('K1: 23 Wohnungen, davon 22 gelistet', () => {
  assert.equal(units.UNITS.length, 23);
  assert.equal(units.UNITS.filter((u) => u.listed === true).length, 22);
  assert.deepEqual(units.UNITS.filter((u) => u.listed === false).map((u) => u.nr), ['61']);
});

test('K1: Nummern sind eindeutige zweistellige Strings', () => {
  const nrs = units.UNITS.map((u) => u.nr);
  assert.equal(new Set(nrs).size, nrs.length);
  for (const nr of nrs) {
    assert.equal(typeof nr, 'string');
    assert.match(nr, /^\d{2}$/);
  }
});

test('K1: netto plus Nebenkosten ergibt brutto', () => {
  for (const u of units.UNITS) {
    assert.equal(u.net + u.extra, u.gross, `Wohnung ${u.nr}: ${u.net} + ${u.extra} !== ${u.gross}`);
  }
});

test('K1: jede Wohnung hat alle Felder im vereinbarten Typ', () => {
  for (const u of units.UNITS) {
    assert.deepEqual(
      Object.keys(u).sort(),
      ['availableFrom', 'availableUntil', 'extra', 'flexible', 'floor', 'gross', 'listed', 'net', 'nr', 'rooms', 'sqm'],
      `Wohnung ${u.nr} hat andere Felder`
    );
    for (const key of ['floor', 'rooms', 'sqm', 'net', 'extra', 'gross']) {
      assert.equal(typeof u[key], 'number', `Wohnung ${u.nr}: ${key} ist keine Zahl`);
      assert.ok(u[key] > 0, `Wohnung ${u.nr}: ${key} ist nicht positiv`);
    }
    for (const key of ['flexible', 'listed']) {
      assert.equal(typeof u[key], 'boolean', `Wohnung ${u.nr}: ${key} ist kein Boolean`);
    }
    for (const key of ['availableFrom', 'availableUntil']) {
      if (u[key] !== null) {
        assert.match(u[key], /^\d{4}-\d{2}-\d{2}$/, `Wohnung ${u.nr}: ${key} ist kein ISO-Datum`);
      }
    }
    assert.ok([1.5, 2, 3, 3.5].includes(u.rooms), `Wohnung ${u.nr}: unbekannte Zimmerzahl ${u.rooms}`);
    assert.ok(u.floor >= 3 && u.floor <= 6, `Wohnung ${u.nr}: Etage ${u.floor} ausserhalb 3 bis 6`);
  }
});

test('K1: die Etage steckt in der Wohnungsnummer', () => {
  for (const u of units.UNITS) {
    assert.equal(u.nr[0], String(u.floor), `Wohnung ${u.nr} liegt laut Daten im ${u.floor}. OG`);
  }
});

// ---- K2: Konstanten -------------------------------------------------------

test('K2: alle vereinbarten Schluessel sind vorhanden', () => {
  assert.deepEqual(
    Object.keys(config).sort(),
    ['ADS_ID', 'ADS_SEND_TO', 'API_BASE', 'CONTACT_PATH', 'EMAIL', 'GA4_ID', 'PAGE_URL', 'PHONE', 'PHONE_HREF', 'TERMIN_URL', 'VERSION'].sort()
  );
});

test('K2: ADS_SEND_TO hat das Format der Google-Ads-Conversion', () => {
  assert.match(config.ADS_SEND_TO, /^AW-\d+\/[A-Za-z0-9_-]+$/);
  assert.ok(config.ADS_SEND_TO.startsWith(config.ADS_ID + '/'));
});

test('K2: TERMIN_URL ist leer, bis die Verdrahtung sie setzt', () => {
  assert.equal(config.TERMIN_URL, '');
});

test('K2: API_BASE, Pfade und Kontaktdaten stehen fest', () => {
  assert.equal(config.API_BASE, 'https://amanthos-website-api.onrender.com');
  assert.equal(config.CONTACT_PATH, '/api/contact');
  assert.equal(config.GA4_ID, 'G-8LPLG0BPJ6');
  assert.equal(config.PAGE_URL, 'https://www.amanthosliving.com/grenchen-mieten/');
  assert.equal(config.PHONE, '+41 41 563 99 00');
  assert.equal(config.PHONE_HREF, 'tel:' + config.PHONE.replace(/\s/g, ''));
  assert.equal(config.EMAIL, 'info@amanthosliving.com');
});

// ---- K5: DOM-Kontrakt -----------------------------------------------------

test('K5: das Fixture traegt alle IDs aus dem Kontrakt, jede genau einmal', () => {
  assert.equal(dom.version, '1');
  assert.equal(dom.ids.length, 39);
  assert.equal(new Set(dom.ids).size, dom.ids.length);
  for (const id of ['f-form', 'f-rooms', 'f-budget', 'f-budget-out', 'f-movein', 'f-parking',
    'f-results', 'f-count', 'f-empty', 'a-form', 'a-name', 'a-email', 'a-phone', 'a-unit',
    'a-rooms', 'a-budget', 'a-parking', 'a-movein', 'a-slot-day', 'a-slot-time', 'a-message',
    'a-company-website', 'a-submit', 'a-status', 'a-success', 'a-termin', 'hamburger',
    'navLinks', 'a-consent']) {
    assert.ok(dom.ids.includes(id), `ID ${id} fehlt im Fixture`);
  }
});

test('K5: Abschnitte und Radio-IDs sind Teil der ID-Liste', () => {
  assert.deepEqual(dom.sections, ['finder', 'anfrage', 'lage', 'fotos', 'faq', 'kontakt']);
  for (const id of dom.sections) assert.ok(dom.ids.includes(id), `Abschnitt ${id} fehlt in ids`);
  assert.deepEqual(dom.radios, { 'f-rooms-all': '', 'f-rooms-15': '1.5', 'f-rooms-2': '2', 'f-rooms-3': '3+' });
  for (const id of Object.keys(dom.radios)) assert.ok(dom.ids.includes(id), `Radio ${id} fehlt in ids`);
});

test('K5: die Klassen der Karte stehen im Fixture', () => {
  assert.deepEqual(dom.classes, [
    'unit-card', 'unit-card-title', 'unit-card-meta', 'unit-card-price',
    'unit-card-gross', 'unit-card-avail', 'unit-card-cta', 'over-budget', 'hp'
  ]);
});

// ---- K9: Bilder -----------------------------------------------------------

test('K9: sieben webp-Dateien, gemessene Masse, je unter 200 KB', () => {
  assert.equal(dom.images.length, 7);
  assert.equal(dom.images.filter((i) => i.use === 'hero').length, 1);
  assert.equal(dom.images.filter((i) => i.use === 'hero-960').length, 1);
  assert.equal(dom.images.filter((i) => i.use === 'galerie').length, 5);
  for (const img of dom.images) {
    assert.match(img.file, /^images\/solothurn\/grenchen-[a-z0-9-]+\.webp$/);
    const abs = join(root, img.file);
    assert.ok(existsSync(abs), `${img.file} fehlt`);
    const bytes = statSync(abs).size;
    assert.ok(bytes < 200 * 1024, `${img.file} ist ${bytes} Bytes gross`);
    assert.deepEqual(webpSize(readFileSync(abs)), { width: img.width, height: img.height },
      `${img.file}: Masse im Fixture stimmen nicht mit der Datei ueberein`);
    assert.equal(img.width, img.use === 'hero-960' ? 960 : 1600);
    assert.ok(img.alt.length >= 20, `${img.file} hat keinen brauchbaren Alt-Text`);
  }
});

// ---- K5: Gegenprobe an Seite und Skript, sobald sie existieren -------------

test('K5: jede ID kommt in grenchen-mieten/index.html genau einmal vor',
  { skip: existsSync(pageFile) ? false : 'grenchen-mieten/index.html fehlt noch (Segment 2)' }, () => {
    const html = readFileSync(pageFile, 'utf8');
    for (const id of dom.ids) {
      const treffer = html.match(new RegExp('id="' + id + '"', 'g')) || [];
      assert.equal(treffer.length, 1, `ID ${id} kommt ${treffer.length} mal vor`);
    }
  });

// Die franzoesische Fassung ist dieselbe Seite mit anderen Texten: gleiche IDs,
// gleiche Skripte, gegenseitige hreflang-Verweise. Sonst spricht das Seitenskript
// ins Leere oder Google haelt die Seiten fuer Dubletten.
test('FR: jede ID kommt in grenchen-louer/index.html genau einmal vor',
  { skip: existsSync(pageFrFile) ? false : 'grenchen-louer/index.html fehlt noch' }, () => {
    const html = readFileSync(pageFrFile, 'utf8');
    for (const id of dom.ids) {
      const treffer = html.match(new RegExp('id="' + id + '"', 'g')) || [];
      assert.equal(treffer.length, 1, `ID ${id} kommt ${treffer.length} mal vor`);
    }
  });

test('FR: Sprache, Canonical, hreflang beidseitig und dieselben vier Skripte',
  { skip: existsSync(pageFrFile) && existsSync(pageFile) ? false : 'eine der Seiten fehlt noch' }, () => {
    const de = readFileSync(pageFile, 'utf8');
    const fr = readFileSync(pageFrFile, 'utf8');
    assert.match(de, /^<!DOCTYPE html>\s*<html lang="de">/);
    assert.match(fr, /^<!DOCTYPE html>\s*<html lang="fr">/);
    assert.match(fr, /<link rel="canonical" href="https:\/\/www\.amanthosliving\.com\/grenchen-louer\/">/);
    for (const html of [de, fr]) {
      assert.match(html, /hreflang="de" href="https:\/\/www\.amanthosliving\.com\/grenchen-mieten\/"/);
      assert.match(html, /hreflang="fr" href="https:\/\/www\.amanthosliving\.com\/grenchen-louer\/"/);
      assert.match(html, /hreflang="x-default" href="https:\/\/www\.amanthosliving\.com\/grenchen-mieten\/"/);
      for (const js of ['grenchen-config', 'grenchen-units', 'grenchen-finder', 'grenchen-page']) {
        assert.match(html, new RegExp('<script defer src="\\.\\./js/' + js + '\\.js"></script>'), js);
      }
    }
    // Die Wunschzeit geht in die Mail an den Verkauf und bleibt deshalb deutsch.
    for (const wert of ['09 bis 12 Uhr', '12 bis 15 Uhr', '15 bis 18 Uhr']) {
      assert.match(fr, new RegExp('<option value="' + wert + '">'), wert);
    }
    assert.match(fr, /tel:\+41415639900/);
    assert.equal((fr.match(/\u2014/g) || []).length, 0, 'kein Gedankenstrich');
    const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
    assert.match(sitemap, /<loc>https:\/\/www\.amanthosliving\.com\/grenchen-louer\/<\/loc>/);
  });

test('K5: das Skelett traegt jede ID genau einmal',
  { skip: existsSync(skeletonFile) ? false : 'grenchen-skeleton.html fehlt noch' }, () => {
    const html = readFileSync(skeletonFile, 'utf8');
    for (const id of dom.ids) {
      const treffer = html.match(new RegExp('id="' + id + '"', 'g')) || [];
      assert.equal(treffer.length, 1, `ID ${id} kommt im Skelett ${treffer.length} mal vor`);
    }
    assert.match(html, /<meta name="robots" content="noindex">/);
  });

test('K5: jedes getElementById-Literal in js/grenchen-page.js steht im Fixture',
  { skip: existsSync(scriptFile) ? false : 'js/grenchen-page.js fehlt noch (Segment 3)' }, () => {
    const src = readFileSync(scriptFile, 'utf8');
    const gefunden = [...src.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
    assert.ok(gefunden.length > 0, 'keine getElementById-Aufrufe gefunden');
    for (const id of new Set(gefunden)) {
      assert.ok(dom.ids.includes(id), `js/grenchen-page.js greift auf unbekannte ID ${id} zu`);
    }
  });
