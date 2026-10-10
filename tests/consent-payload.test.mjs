/**
 * Einwilligung im Formular-JSON (11.10.2026).
 *
 * Das Backend meldet eine Anfrage nur dann als Lead an Meta, wenn der Body
 * `consent: 'granted'` traegt (amanthos-platform #251, Datenschutzerklaerung
 * Abschnitt 4.4). Geprueft wird je Formularskript: buildPayload gibt genau
 * 'granted' weiter und sonst einen leeren String, und collect() setzt den Wert
 * aus der Wahl im Banner (granted()), nicht aus einer Annahme.
 *
 * Alle Werte sind erfunden; keine echte Adresse, kein echter Name.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const SKRIPTE = ['grenchen-page', 'longstay-page', 'nyon-page', 'glattbrugg-page'];
const OHNE = [undefined, null, '', 'denied', 'GRANTED', ' granted', true, 'ja'];

for (const name of SKRIPTE) {
  const datei = join(here, '..', 'js', name + '.js');
  const page = require(datei);
  const src = readFileSync(datei, 'utf8');

  test(`${name}: mit Einwilligung traegt der Body consent 'granted'`, () => {
    assert.equal(page.buildPayload({ consent: 'granted' }).consent, 'granted');
  });

  test(`${name}: ohne Einwilligung ist consent ein leerer String`, () => {
    assert.equal(page.buildPayload().consent, '');
    for (const wert of OHNE) {
      assert.equal(page.buildPayload({ consent: wert }).consent, '', `consent ${String(wert)}`);
    }
  });

  test(`${name}: collect() nimmt die Wahl aus dem Banner`, () => {
    assert.match(src, /consent:\s*granted\(\)\s*\?\s*'granted'\s*:\s*''/);
  });
}
