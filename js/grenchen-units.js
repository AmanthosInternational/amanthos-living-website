/**
 * Amanthos Living: Wohnungsdaten Bettlachstrasse 20, Grenchen (Kontrakt K1).
 *
 * Die eine Datenquelle fuer Seite, Finder und Tests. Reine Daten, kein DOM,
 * keine Logik. Quelle: Expose vom 03.09.2026 (Nummer, Etage, Zimmer, Flaeche,
 * Netto, Nebenkosten, Brutto) und die Apaleo-Belegung vom 07.09.2026, dort
 * bereits auf das Feld availableFrom reduziert. Betraege sind CHF pro Monat.
 *
 * availableFrom null heisst: sofort frei, Bezug nach Vereinbarung (Stand
 * 08.09.2026, Bogdan: nur 34 und 61 sind belegt, alle anderen frei). Ein Datum
 * mit flexible false ist hart (34: Bezug ab Januar 2027). flexible true bei
 * einem Datum heisst Richtwert, frueher nach Vereinbarung. listed false heisst:
 * der Finder zeigt die Wohnung nicht (61, belegt bis September 2027).
 */
(function () {
  'use strict';

  var UNITS = [
    { nr: '31', floor: 3, rooms: 1.5, sqm: 43.1, net: 720, extra: 150, gross: 870, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '32', floor: 3, rooms: 1.5, sqm: 46.6, net: 750, extra: 150, gross: 900, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '33', floor: 3, rooms: 1.5, sqm: 38.6, net: 670, extra: 150, gross: 820, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '34', floor: 3, rooms: 2, sqm: 53.6, net: 920, extra: 170, gross: 1090, availableFrom: '2027-01-01', availableUntil: null, flexible: false, listed: true },
    { nr: '35', floor: 3, rooms: 2, sqm: 35.6, net: 740, extra: 170, gross: 910, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '36', floor: 3, rooms: 2, sqm: 28.7, net: 670, extra: 170, gross: 840, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '37', floor: 3, rooms: 2, sqm: 38.7, net: 770, extra: 170, gross: 940, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '41', floor: 4, rooms: 2, sqm: 42.0, net: 810, extra: 170, gross: 980, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '42', floor: 4, rooms: 2, sqm: 40.0, net: 790, extra: 170, gross: 960, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '43', floor: 4, rooms: 2, sqm: 58.2, net: 950, extra: 170, gross: 1120, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '44', floor: 4, rooms: 2, sqm: 49.0, net: 880, extra: 170, gross: 1050, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '45', floor: 4, rooms: 2, sqm: 55.1, net: 930, extra: 170, gross: 1100, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '46', floor: 4, rooms: 2, sqm: 44.6, net: 810, extra: 170, gross: 980, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '51', floor: 5, rooms: 2, sqm: 42.0, net: 820, extra: 170, gross: 990, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '52', floor: 5, rooms: 2, sqm: 41.5, net: 800, extra: 170, gross: 970, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '53', floor: 5, rooms: 2, sqm: 58.2, net: 980, extra: 170, gross: 1150, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '54', floor: 5, rooms: 2, sqm: 58.2, net: 980, extra: 170, gross: 1150, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '55', floor: 5, rooms: 2, sqm: 55.1, net: 960, extra: 170, gross: 1130, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '56', floor: 5, rooms: 2, sqm: 44.6, net: 840, extra: 170, gross: 1010, availableFrom: null, availableUntil: null, flexible: false, listed: true },
    // 61 ist nur bis 30.04.2027 frei und passt damit nicht zur Mindestmietdauer
    // von 12 Monaten; deshalb listed false. availableUntil bleibt als Datenfeld.
    { nr: '61', floor: 6, rooms: 3, sqm: 101.6, net: 1400, extra: 210, gross: 1610, availableFrom: '2026-11-01', availableUntil: '2027-04-30', flexible: false, listed: false },
    { nr: '62', floor: 6, rooms: 3.5, sqm: 54.6, net: 960, extra: 170, gross: 1130, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '63', floor: 6, rooms: 2, sqm: 55.8, net: 960, extra: 170, gross: 1130, availableFrom: null, availableUntil: null, flexible: true, listed: true },
    { nr: '64', floor: 6, rooms: 2, sqm: 88.0, net: 1200, extra: 190, gross: 1390, availableFrom: null, availableUntil: null, flexible: false, listed: true }
  ];

  var api = { UNITS: UNITS, VERSION: '1' };

  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && window) window.GRENCHEN_UNITS = api;
})();
