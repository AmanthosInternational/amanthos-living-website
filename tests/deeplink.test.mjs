import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const deeplink = require(join(here, '..', 'js', 'deeplink.js'));
const cases = JSON.parse(readFileSync(join(here, 'fixtures', 'deeplink-cases.json'), 'utf8'));

// Das Fixture liefert "today" als YYYY-MM-DD; parse() erwartet ein Date auf
// lokaler Mitternacht, genau wie im Browser.
function toLocalDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

test('deeplink.js exportiert parse und VERSION', () => {
  assert.equal(typeof deeplink.parse, 'function');
  assert.equal(deeplink.VERSION, '1');
});

test('die Testvektoren aus tests/fixtures/deeplink-cases.json sind vollstaendig', () => {
  assert.ok(cases.length >= 18, `nur ${cases.length} Faelle`);
  assert.equal(cases.length, 46);
});

for (const c of cases) {
  test(`parse: ${c.name}`, () => {
    const cfg = {
      today: toLocalDate(c.today),
      properties: c.site.properties,
      langs: c.site.langs,
      defaultProperty: c.site.defaultProperty
    };
    const got = deeplink.parse(c.query, cfg);
    assert.deepEqual(got, c.expect);
  });
}

test('Living: property NYAL wird case-insensitiv erkannt und kanonisch geliefert', () => {
  const cfg = {
    today: toLocalDate('2026-09-06'),
    properties: { GBAL: 3, GNBE: 4, NYAL: 4 },
    langs: ['de', 'en', 'fr'],
    defaultProperty: null
  };
  const got = deeplink.parse('?property=nyal&arrival=2026-10-10&departure=2026-10-12', cfg);
  assert.equal(got.search.property, 'NYAL');
});

test('Living: ohne property gibt es keine Suche, aber weiter Quelle und Kampagne', () => {
  const cfg = {
    today: toLocalDate('2026-09-06'),
    properties: { GBAL: 3, GNBE: 4, NYAL: 4 },
    langs: ['de', 'en'],
    defaultProperty: null
  };
  const got = deeplink.parse(
    '?arrival=2026-10-10&departure=2026-10-12&utm_source=google&utm_medium=organic&utm_campaign=hotel-fbl',
    cfg
  );
  assert.equal(got.search, null);
  assert.equal(got.source, 'google_fbl');
  assert.deepEqual(got.campaign, {
    utm_source: 'google',
    utm_medium: 'organic',
    utm_campaign: 'hotel-fbl'
  });
});

test('google traegt beide Schluessel, wenn nur einer gueltig ist', () => {
  const cfg = {
    today: toLocalDate('2026-09-06'),
    properties: { NYAL: 4 },
    langs: ['en'],
    defaultProperty: 'NYAL'
  };
  const got = deeplink.parse('?arrival=2026-10-10&departure=2026-10-12&ucur=CHF&gtotal=abc', cfg);
  assert.deepEqual(got.google, { ucur: 'CHF', gtotal: null });
});

test('ohne cfg bricht parse nicht, liefert aber keine Suche', () => {
  const got = deeplink.parse('?arrival=2026-10-10&departure=2026-10-12');
  assert.equal(got.search, null);
  assert.equal(got.source, null);
});
