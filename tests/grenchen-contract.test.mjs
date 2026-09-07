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
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const units = require(join(here, '..', 'js', 'grenchen-units.js'));
const config = require(join(here, '..', 'js', 'grenchen-config.js'));

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
  assert.equal(config.PHONE, '+41 41 562 97 00');
  assert.equal(config.PHONE_HREF, 'tel:' + config.PHONE.replace(/\s/g, ''));
  assert.equal(config.EMAIL, 'info@amanthosliving.com');
});
