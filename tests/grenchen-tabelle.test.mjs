/**
 * Haelt die statische Wohnungstabelle an js/grenchen-units.js fest.
 *
 * Die Tabelle wird von tools/grenchen-tabelle.mjs erzeugt und steht doppelt im Repo:
 * einmal als Daten, einmal als HTML. Ohne diesen Test faellt niemandem auf, wenn eine
 * Miete in den Daten geaendert und die Seite vergessen wird, und dann steht im Netz ein
 * Preis, den wir nicht mehr verlangen.
 *
 * Geprueft wird die Richtung, auf die es ankommt: jede gelistete Wohnung muss mit ihrer
 * Bruttomiete in beiden Sprachfassungen stehen.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { UNITS } = require(join(here, '..', 'js', 'grenchen-units.js'));
const SEITEN = ['grenchen-mieten/index.html', 'grenchen-louer/index.html'];

test('jede gelistete Wohnung steht mit ihrer Bruttomiete in beiden Fassungen', () => {
  const gelistet = UNITS.filter((u) => u.listed);
  assert.ok(gelistet.length > 0, 'keine gelistete Wohnung in den Daten');
  for (const seite of SEITEN) {
    // Die Betraege tragen den Schweizer Tausendertrenner (1'090). Fuer den Vergleich
    // faellt er raus, sonst prueft der Test die Schreibweise statt der Zahl.
    const html = readFileSync(join(here, '..', seite), 'utf8').replace(/(\d)['’ ](\d{3})/g, '$1$2');
    for (const u of gelistet) {
      const zeile = new RegExp(`<tr><td>${u.nr}</td>[^\\n]*CHF ${u.gross}</td>`);
      assert.match(html, zeile, `${seite}: Wohnung ${u.nr} fehlt oder hat eine andere Bruttomiete`);
    }
  }
});

test('nicht gelistete Wohnungen stehen nicht in der Tabelle', () => {
  // Wohnung 61 ist bis September 2027 belegt und soll nicht beworben werden.
  const versteckt = UNITS.filter((u) => !u.listed);
  for (const seite of SEITEN) {
    const html = readFileSync(join(here, '..', seite), 'utf8');
    const tabelle = html.slice(html.indexOf('grenchen-tabelle:anfang'), html.indexOf('grenchen-tabelle:ende'));
    for (const u of versteckt) {
      assert.ok(!tabelle.includes(`<tr><td>${u.nr}</td>`), `${seite}: Wohnung ${u.nr} ist nicht gelistet`);
    }
  }
});

test('die Tabelle steht innerhalb der Marken des Erzeugers', () => {
  for (const seite of SEITEN) {
    const html = readFileSync(join(here, '..', seite), 'utf8');
    const a = html.indexOf('grenchen-tabelle:anfang');
    const e = html.indexOf('grenchen-tabelle:ende');
    assert.ok(a > 0 && e > a, `${seite}: Marken fehlen, der Erzeuger findet die Tabelle nicht wieder`);
    assert.equal(html.split('grenchen-tabelle:anfang').length - 1, 1, `${seite}: Marke doppelt`);
  }
});
