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
  // Zwei Sprachen, gleiche Daten. Der Finder fasst kein DOM an (K6), also
  // entscheidet er nicht selbst: das Seitenskript liest die Seitensprache und
  // ruft setLocale('fr') fuer grenchen-louer/. Ohne Aufruf bleibt es deutsch.
  // Zahlen und Waehrung sind in beiden Sprachen gleich.
  var LOCALES = {
    de: {
      months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
      rooms: function (n) { return String(n) + ' Zimmer'; }, floor: '. OG', from: 'ab ', first: '1.',
      flexible: ', früher nach Vereinbarung', onRequest: 'sofort frei, Bezug nach Vereinbarung'
    },
    fr: {
      months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
      rooms: function (n) { return String(n).replace('.', ',') + (n < 2 ? ' pièce' : ' pièces'); },
      floor: 'e étage', from: 'dès le ', first: '1er',
      flexible: ', plus tôt sur demande', onRequest: 'libre immédiatement, entrée selon entente'
    }
  };
  var locale = 'de';

  function setLocale(lang) {
    locale = LOCALES[lang] ? lang : 'de';
    return locale;
  }

  function L() { return LOCALES[locale]; }

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

  // ---- Beschriftungen ----------------------------------------------------
  //
  // Alles, was auf einer Karte steht, wird hier gebaut und nicht im
  // Seitenskript, damit die Schreibweise an einer Stelle liegt und pruefbar
  // ist. Ein unlesbarer Wert liefert den leeren String, nie "NaN" oder
  // "undefined" auf der Seite.

  // Schweizer Tausendertrennung mit dem geraden Apostroph: 1090 wird 1'090.
  function groupThousands(digits) {
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\'');
  }

  function formatChf(value) {
    var n = toNumber(value);
    if (n === null) return '';
    var rounded = Math.round(n);
    var sign = rounded < 0 ? '-' : '';
    return 'CHF ' + sign + groupThousands(String(Math.abs(rounded)));
  }

  // Eine Nachkommastelle, ohne angehaengte Null: 43.1 wird "43.1 m²", 42 wird
  // "42 m²". Der Dezimalpunkt ist der aus den Daten und dem Expose.
  function formatSqm(value) {
    var n = toNumber(value);
    if (n === null) return '';
    return String(Math.round(n * 10) / 10) + ' m²';
  }

  function roomsLabel(value) {
    var n = toNumber(value);
    if (n === null) return '';
    return L().rooms(n);
  }

  function floorLabel(value) {
    var n = toNumber(value);
    if (n === null) return '';
    return String(n) + L().floor;
  }

  /**
   * "ab 1. November 2026, früher nach Vereinbarung" bei flexiblem Datum, sonst
   * "ab 1. Oktober 2026". Ohne lesbares Datum "nach Vereinbarung", denn dann
   * ist der Bezug Verhandlungssache und kein Versprechen.
   */
  function availabilityLabel(unit) {
    var from = unit && typeof unit.availableFrom === 'string' ? unit.availableFrom : '';
    var l = L();
    if (!DATE_RE.test(from)) return l.onRequest;
    var day = parseInt(from.slice(8, 10), 10);
    var month = l.months[parseInt(from.slice(5, 7), 10) - 1];
    // Deutsch "1. November", Franzoesisch "1er novembre", sonst "2 novembre".
    var dayLabel = locale === 'fr' ? (day === 1 ? l.first : String(day)) : day + '.';
    var label = l.from + dayLabel + ' ' + month + ' ' + from.slice(0, 4);
    return unit.flexible === true ? label + l.flexible : label;
  }

  var api = {
    VERSION: '1',
    filter: filter,
    fallback: fallback,
    formatChf: formatChf,
    formatSqm: formatSqm,
    roomsLabel: roomsLabel,
    floorLabel: floorLabel,
    availabilityLabel: availabilityLabel,
    setLocale: setLocale
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && window) window.amGrenchenFinder = api;
})();
