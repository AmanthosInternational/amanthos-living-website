/**
 * Tests fuer js/grenchen-finder.js (Segment 1, Kontrakt K6).
 *
 * Gegen die echten Daten aus js/grenchen-units.js, nicht gegen ein eigenes
 * Fixture: die Datendatei ist die Quelle der Wahrheit, und ein Zahlendreher
 * dort soll hier auffallen und nicht von einer Kopie verdeckt werden.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const finderFile = join(here, '..', 'js', 'grenchen-finder.js');
const finder = require(finderFile);
const units = require(join(here, '..', 'js', 'grenchen-units.js'));

const UNITS = units.UNITS;
const nrs = (list) => list.map((u) => u.nr);
const listed = UNITS.filter((u) => u.listed === true);

test('K6: der Finder exportiert filter, fallback und VERSION', () => {
  assert.equal(finder.VERSION, '1');
  assert.equal(typeof finder.filter, 'function');
  assert.equal(typeof finder.fallback, 'function');
});

// ---- Pruefvektoren aus K6 -------------------------------------------------

test('K6 Vektor 1: rooms 1.5, budget 900 liefert 33, 31, 32', () => {
  const got = finder.filter(UNITS, { rooms: '1.5', budget: 900, moveIn: '' });
  assert.deepEqual(nrs(got), ['33', '31', '32']);
});

test('K6 Vektor 2: rooms 2, budget 900 liefert nur 36', () => {
  const got = finder.filter(UNITS, { rooms: '2', budget: 900, moveIn: '' });
  assert.deepEqual(nrs(got), ['36']);
});

test('K6 Vektor 3: rooms 3+, budget 1700 liefert nur 62, weil 61 nicht gelistet ist', () => {
  const got = finder.filter(UNITS, { rooms: '3+', budget: 1700, moveIn: '' });
  assert.deepEqual(nrs(got), ['62']);
  assert.equal(UNITS.find((u) => u.nr === '61').listed, false);
});

test('K6 Vektor 4: rooms alle, budget 1000, moveIn 2026-10 liefert 11 Treffer in Preisreihenfolge', () => {
  const got = finder.filter(UNITS, { rooms: '', budget: 1000, moveIn: '2026-10' });
  assert.deepEqual(nrs(got), ['33', '36', '31', '32', '35', '37', '42', '52', '41', '46', '51']);
  assert.equal(got.length, 11);
});

test('K6 Vektor 5: rooms 2, kein Budget, moveIn 2026-12 laesst 34 heraus', () => {
  const got = finder.filter(UNITS, { rooms: '2', budget: null, moveIn: '2026-12' });
  assert.equal(got.length, 17);
  assert.ok(!nrs(got).includes('34'));
});

test('K6 Vektor 6: rooms 2, kein Budget, moveIn 2027-01 nimmt 34 wieder auf', () => {
  const got = finder.filter(UNITS, { rooms: '2', budget: null, moveIn: '2027-01' });
  assert.equal(got.length, 18);
  assert.ok(nrs(got).includes('34'));
});

test('K6 Vektor 7: budget 800 liefert nichts, der Fallback die drei guenstigsten', () => {
  const criteria = { rooms: '', budget: 800, moveIn: '' };
  assert.deepEqual(finder.filter(UNITS, criteria), []);
  assert.deepEqual(nrs(finder.fallback(UNITS, criteria, 3)), ['33', '36', '31']);
});

test('K6 Vektor 8: ohne Kriterien alle 22 gelisteten, erste 33, letzte 64', () => {
  const got = finder.filter(UNITS, { rooms: '', budget: null, moveIn: '' });
  assert.equal(got.length, 22);
  assert.equal(got[0].nr, '33');
  assert.equal(got[got.length - 1].nr, '64');
  assert.ok(!nrs(got).includes('61'));
});

test('K6 Vektor 9: bei Gleichstand 1150 steht 53 vor 54', () => {
  const got = nrs(finder.filter(UNITS, { rooms: '', budget: null, moveIn: '' }));
  const a = UNITS.find((u) => u.nr === '53');
  const b = UNITS.find((u) => u.nr === '54');
  assert.equal(a.gross, b.gross);
  assert.equal(got.indexOf('54'), got.indexOf('53') + 1);
});

// ---- Sortierung, Reinheit, unlesbare Kriterien ----------------------------

test('K6: die Ergebnisliste ist nach Bruttomiete aufsteigend sortiert', () => {
  const got = finder.filter(UNITS, {});
  for (let i = 1; i < got.length; i++) {
    assert.ok(got[i - 1].gross <= got[i].gross, `${got[i - 1].nr} vor ${got[i].nr}`);
  }
});

test('K6: filter laesst das uebergebene Array unveraendert', () => {
  const before = UNITS.slice();
  const got = finder.filter(UNITS, { rooms: '2', budget: 1000, moveIn: '2026-11' });
  assert.ok(got.length > 0);
  assert.deepEqual(UNITS, before, 'Reihenfolge oder Inhalt der Datenquelle veraendert');
  assert.notEqual(got, UNITS);
});

test('K6: fehlende oder unlesbare Kriterien wirken wie kein Limit', () => {
  const alle = nrs(finder.filter(UNITS, { rooms: '', budget: null, moveIn: '' }));
  const wie_alle = [
    undefined,
    null,
    {},
    { rooms: undefined, budget: undefined, moveIn: undefined },
    { rooms: '', budget: 'abc', moveIn: '2026-13' },
    { rooms: 'egal', budget: '', moveIn: '2026-1' },
    { rooms: null, budget: 0, moveIn: 'bald' },
    { rooms: '', budget: -100, moveIn: '202611' }
  ];
  for (const criteria of wie_alle) {
    assert.deepEqual(nrs(finder.filter(UNITS, criteria)), alle, JSON.stringify(criteria));
  }
});

test('K6: filter wirft nie, auch nicht bei kaputten Eingaben', () => {
  assert.deepEqual(finder.filter(undefined, undefined), []);
  assert.deepEqual(finder.filter(null, { rooms: '2' }), []);
  assert.deepEqual(finder.filter('keine Liste', {}), []);
  assert.deepEqual(finder.filter([null, undefined, {}, { listed: true }], {}).length, 1);
});

test('K6: ein Budget als Zeichenkette wirkt wie dieselbe Zahl', () => {
  assert.deepEqual(
    nrs(finder.filter(UNITS, { rooms: '1.5', budget: '900', moveIn: '' })),
    nrs(finder.filter(UNITS, { rooms: '1.5', budget: 900, moveIn: '' }))
  );
});

test('K6: der Parkplatzwunsch filtert nicht', () => {
  const ohne = nrs(finder.filter(UNITS, { rooms: '2', budget: 1000, moveIn: '' }));
  const mit = nrs(finder.filter(UNITS, { rooms: '2', budget: 1000, moveIn: '', parking: true }));
  assert.deepEqual(mit, ohne);
});

// ---- Fallback -------------------------------------------------------------

test('K6: der Fallback achtet nur auf die Zimmerwahl, nicht auf Budget und Monat', () => {
  const got = finder.fallback(UNITS, { rooms: '2', budget: 500, moveIn: '2026-10' }, 3);
  assert.deepEqual(nrs(got), ['36', '35', '37']);
  assert.equal(nrs(got).includes('34'), false, '34 ist teurer, nicht durch den Monat draussen');
});

test('K6: der Fallback liefert hoechstens n und nie mehr als vorhanden', () => {
  assert.equal(finder.fallback(UNITS, { rooms: '' }, 1).length, 1);
  assert.equal(finder.fallback(UNITS, { rooms: '' }, 99).length, listed.length);
  assert.equal(finder.fallback(UNITS, { rooms: '3+' }, 5).length, 1);
  assert.deepEqual(finder.fallback(UNITS, { rooms: '' }, 0), []);
});

test('K6: ein unlesbares n im Fallback liefert drei Karten', () => {
  assert.equal(finder.fallback(UNITS, { rooms: '' }).length, 3);
  assert.equal(finder.fallback(UNITS, { rooms: '' }, 'drei').length, 3);
  assert.equal(finder.fallback(UNITS, { rooms: '' }, -2).length, 3);
});

// ---- Beschriftungen -------------------------------------------------------

test('K6: formatChf setzt den Schweizer Apostroph', () => {
  assert.equal(finder.formatChf(1090), 'CHF 1\'090');
  assert.equal(finder.formatChf(950), 'CHF 950');
  assert.equal(finder.formatChf(1150), 'CHF 1\'150');
  assert.equal(finder.formatChf(170), 'CHF 170');
  assert.equal(finder.formatChf('1120'), 'CHF 1\'120');
  assert.equal(finder.formatChf(null), '');
  assert.equal(finder.formatChf('abc'), '');
});

test('K6: jede gelistete Wohnung bekommt einen lesbaren Bruttopreis', () => {
  for (const u of listed) {
    const label = finder.formatChf(u.gross);
    assert.match(label, /^CHF \d(\d{0,2})?('\d{3})*$/, `${u.nr}: ${label}`);
    assert.equal(label.includes('\''), u.gross >= 1000);
  }
});

test('K6: formatSqm haengt keine Null an und nutzt den Dezimalpunkt', () => {
  assert.equal(finder.formatSqm(43.1), '43.1 m²');
  assert.equal(finder.formatSqm(42.0), '42 m²');
  assert.equal(finder.formatSqm(101.6), '101.6 m²');
  assert.equal(finder.formatSqm(undefined), '');
});

test('K6: roomsLabel fuer 1.5, 2, 3 und 3.5', () => {
  assert.equal(finder.roomsLabel(1.5), '1.5 Zimmer');
  assert.equal(finder.roomsLabel(2), '2 Zimmer');
  assert.equal(finder.roomsLabel(3), '3 Zimmer');
  assert.equal(finder.roomsLabel(3.5), '3.5 Zimmer');
  assert.equal(finder.roomsLabel('2'), '2 Zimmer');
  assert.equal(finder.roomsLabel(''), '');
});

test('K6: floorLabel schreibt die Etage als OG', () => {
  assert.equal(finder.floorLabel(4), '4. OG');
  assert.equal(finder.floorLabel(6), '6. OG');
  assert.equal(finder.floorLabel(null), '');
});

test('K6: availabilityLabel bei flexiblem Datum, hartem Datum und ohne Datum', () => {
  const byNr = (nr) => UNITS.find((u) => u.nr === nr);
  assert.equal(finder.availabilityLabel(byNr('31')), 'sofort frei, Bezug nach Vereinbarung');
  assert.equal(finder.availabilityLabel({ availableFrom: '2026-11-01', flexible: true }), 'ab 1. November 2026, früher nach Vereinbarung');
  assert.equal(finder.availabilityLabel({ availableFrom: '2026-10-01', flexible: false }), 'ab 1. Oktober 2026');
  assert.equal(finder.availabilityLabel(byNr('34')), 'ab 1. Januar 2027');
  assert.equal(finder.availabilityLabel({ availableFrom: null, flexible: true }), 'sofort frei, Bezug nach Vereinbarung');
  assert.equal(finder.availabilityLabel({ availableFrom: '2026-13-01', flexible: false }), 'sofort frei, Bezug nach Vereinbarung');
  assert.equal(finder.availabilityLabel(undefined), 'sofort frei, Bezug nach Vereinbarung');
});

test('K6: der Tag steht ohne fuehrende Null', () => {
  assert.equal(
    finder.availabilityLabel({ availableFrom: '2027-03-09', flexible: false }),
    'ab 9. März 2027'
  );
});

test('K5: die Kopfzeile einer Karte entsteht aus drei Beschriftungen', () => {
  const u = UNITS.find((x) => x.nr === '43');
  const meta = [finder.floorLabel(u.floor), finder.roomsLabel(u.rooms), finder.formatSqm(u.sqm)].join(', ');
  assert.equal(meta, '4. OG, 2 Zimmer, 58.2 m²');
  assert.equal(finder.formatChf(u.gross), 'CHF 1\'120');
});

// ---- Laden in Node und im Browser ----------------------------------------

test('K6: in Node laeuft die Datei ohne window', () => {
  assert.equal(typeof globalThis.window, 'undefined');
  assert.equal(typeof finder.filter, 'function');
});

test('K6: im Browser laeuft die Datei ohne module und haengt sich an window', () => {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(finderFile, 'utf8'), sandbox, { filename: 'grenchen-finder.js' });
  const browser = sandbox.window.amGrenchenFinder;
  assert.equal(typeof browser, 'object');
  assert.equal(browser.VERSION, '1');
  for (const name of ['filter', 'fallback', 'formatChf', 'formatSqm', 'roomsLabel', 'floorLabel', 'availabilityLabel']) {
    assert.equal(typeof browser[name], 'function', name);
  }
  // Die Liste stammt aus dem Sandbox-Realm; erst die Kopie ist mit einem
  // hiesigen Array vergleichbar.
  assert.deepEqual([...nrs(browser.filter(UNITS, { rooms: '1.5', budget: 900 }))], ['33', '31', '32']);
});

test('FR: setLocale(fr) beschriftet franzoesisch, setLocale(de) zurueck', () => {
  try {
    assert.equal(finder.setLocale('fr'), 'fr');
    assert.equal(finder.roomsLabel(1.5), '1,5 pièce');
    assert.equal(finder.roomsLabel(2), '2 pièces');
    assert.equal(finder.roomsLabel(3.5), '3,5 pièces');
    assert.equal(finder.floorLabel(4), '4e étage');
    assert.equal(finder.availabilityLabel({ availableFrom: '2026-11-01', flexible: true }),
      'dès le 1er novembre 2026, plus tôt sur demande');
    assert.equal(finder.availabilityLabel({ availableFrom: '2026-12-15', flexible: false }), 'dès le 15 décembre 2026');
    assert.equal(finder.availabilityLabel(undefined), 'libre immédiatement, entrée selon entente');
    assert.equal(finder.setLocale('xx'), 'de', 'unbekannte Sprache faellt auf Deutsch zurueck');
  } finally {
    finder.setLocale('de');
  }
  assert.equal(finder.roomsLabel(2), '2 Zimmer');
});

test('K6: die Datei fasst kein DOM an und nennt window nur im Export', () => {
  const src = readFileSync(finderFile, 'utf8');
  assert.equal(/\bdocument\b/.test(src), false, 'kein document');
  const code = src
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .filter((line) => /\bwindow\b/.test(line));
  assert.deepEqual(code, [
    "  if (typeof window !== 'undefined' && window) window.amGrenchenFinder = api;"
  ]);
});
