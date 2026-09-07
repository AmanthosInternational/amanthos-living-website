/**
 * Tests fuer js/grenchen-finder.js (Segment 1, Kontrakt K6).
 *
 * Gegen die echten Daten aus js/grenchen-units.js, nicht gegen ein eigenes
 * Fixture: die Datendatei ist die Quelle der Wahrheit, und ein Zahlendreher
 * dort soll hier auffallen und nicht von einer Kopie verdeckt werden.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const finder = require(join(here, '..', 'js', 'grenchen-finder.js'));
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
