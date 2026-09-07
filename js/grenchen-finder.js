/**
 * Amanthos Living: Wohnungsfinder Bettlachstrasse 20, Grenchen (Kontrakt K6).
 *
 * Reine Funktionen ueber die Wohnungsdaten aus js/grenchen-units.js: kein DOM,
 * kein Zugriff auf window ausser dem Export am Ende, keine eigenen Daten. Die
 * Datendatei ist die Quelle der Wahrheit, hier wird nur gerechnet und
 * beschriftet. Damit laeuft die Datei unveraendert unter node --test und im
 * Browser, genau wie js/deeplink.js.
 *
 * Grundsatz fuer die Kriterien: was fehlt oder unlesbar ist, schraenkt nicht
 * ein. Ein kaputtes Budget aus einem Formularfeld darf die Liste nie leeren,
 * sondern hoechstens nicht filtern.
 */
(function () {
  'use strict';

  var MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
  var DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  var DEFAULT_FALLBACK = 3;

  // Zahl aus Zahl oder Zeichenkette; alles andere ist null. Number('') ist 0,
  // deshalb faellt der leere String vorher heraus.
  function toNumber(raw) {
    if (typeof raw === 'number') return isFinite(raw) ? raw : null;
    if (typeof raw === 'string' && raw.trim() !== '') {
      var n = Number(raw);
      return isFinite(n) ? n : null;
    }
    return null;
  }

  function text(raw) {
    return raw === null || raw === undefined ? '' : String(raw).trim();
  }

  /**
   * Prueffunktion fuer die Zimmerwahl oder null fuer "alle".
   *
   * '' und jeder unlesbare Wert heissen alle, '3+' heisst drei und mehr, jede
   * lesbare Zahl heisst genau diese Zimmerzahl. Die Kontraktwerte '1.5' und '2'
   * fallen damit unter dieselbe Regel wie ein spaeteres '3.5'.
   */
  function roomsTest(raw) {
    var value = text(raw);
    if (value === '') return null;
    if (value === '3+') return function (rooms) { return toNumber(rooms) !== null && toNumber(rooms) >= 3; };
    var wanted = toNumber(value);
    if (wanted === null) return null;
    return function (rooms) { return toNumber(rooms) === wanted; };
  }

  // Ein Budget von null, 0 oder darunter ist keine Obergrenze, sondern eine
  // fehlende Angabe.
  function budgetLimit(raw) {
    var n = toNumber(raw);
    return n !== null && n > 0 ? n : null;
  }

  // Nur ein vollstaendiges YYYY-MM zaehlt; '2026-13' ist kein Monat und
  // schraenkt deshalb nicht ein.
  function moveInLimit(raw) {
    var value = text(raw);
    return MONTH_RE.test(value) ? value : null;
  }

  function grossOf(unit) {
    var n = toNumber(unit.gross);
    return n === null ? Infinity : n;
  }

  /**
   * Ein flexibles Datum ist ein Richtwert und schliesst nie aus. Ein hartes
   * Datum schliesst nur aus, wenn es nach dem gewuenschten Monat liegt. Der
   * Vergleich laeuft als Zeichenkette ueber YYYY-MM; fuer dieses Format ist das
   * dieselbe Ordnung wie auf dem Kalender.
   */
  function availableBy(unit, moveIn) {
    if (unit.flexible !== false) return true;
    var from = typeof unit.availableFrom === 'string' ? unit.availableFrom : '';
    if (!DATE_RE.test(from)) return true;
    return from.slice(0, 7) <= moveIn;
  }

  function compareNr(a, b) {
    var na = toNumber(a);
    var nb = toNumber(b);
    if (na !== null && nb !== null && na !== nb) return na - nb;
    var sa = String(a);
    var sb = String(b);
    if (sa < sb) return -1;
    return sa > sb ? 1 : 0;
  }

  function byPrice(a, b) {
    var diff = grossOf(a) - grossOf(b);
    if (diff !== 0 && !isNaN(diff)) return diff;
    return compareNr(a.nr, b.nr);
  }

  /**
   * Die gelisteten Wohnungen, die zu den Kriterien passen, aufsteigend nach
   * Bruttomiete und bei Gleichstand nach Wohnungsnummer.
   *
   * Ohne Nebenwirkung: das uebergebene Array wird gelesen, nie umsortiert.
   * Ein Parkplatzwunsch filtert nicht, jede Wohnung kann einen Aussenparkplatz
   * separat anmieten; er wandert nur in die Anfrage.
   */
  function filter(units, criteria) {
    var list = Array.isArray(units) ? units : [];
    var wish = criteria && typeof criteria === 'object' ? criteria : {};
    var wantsRooms = roomsTest(wish.rooms);
    var budget = budgetLimit(wish.budget);
    var moveIn = moveInLimit(wish.moveIn);
    var hits = [];

    for (var i = 0; i < list.length; i++) {
      var unit = list[i];
      if (!unit || typeof unit !== 'object') continue;
      if (unit.listed !== true) continue;
      if (wantsRooms && !wantsRooms(unit.rooms)) continue;
      if (budget !== null && grossOf(unit) > budget) continue;
      if (moveIn !== null && !availableBy(unit, moveIn)) continue;
      hits.push(unit);
    }

    return hits.sort(byPrice);
  }

  /**
   * Die n guenstigsten gelisteten Wohnungen, die nur die Zimmerwahl erfuellen.
   * Fuer den Fall, dass zum Budget oder zum Einzugsmonat nichts passt: die
   * Seite zeigt dann diese Karten als "die guenstigsten in Ihrer Zimmerwahl".
   */
  function fallback(units, criteria, n) {
    var wish = criteria && typeof criteria === 'object' ? criteria : {};
    var count = toNumber(n);
    count = count === null || count < 0 ? DEFAULT_FALLBACK : Math.floor(count);
    return filter(units, { rooms: wish.rooms }).slice(0, count);
  }

  var api = {
    VERSION: '1',
    filter: filter,
    fallback: fallback
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && window) window.amGrenchenFinder = api;
})();
