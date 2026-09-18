/**
 * Amanthos Living: Zimmerdaten Rue du Château 11, 1266 Duillier (Kontrakt K1).
 *
 * Die eine Datenquelle fuer Seite und Tests. Reine Daten, kein DOM, keine
 * Logik. Betraege sind CHF pro Monat, pauschal inklusive Nebenkosten.
 *
 * Anders als in Grenchen sind das keine einzelnen Wohnungen, sondern
 * Kategorien: die vier Classic-Zimmer sind untereinander identisch, die zwei
 * Luxury-Lakeview ebenfalls. Deshalb traegt jeder Eintrag ein Feld count.
 *
 * Quellen: Apaleo Unit Groups NYAL (Zimmernummern, Kategorien), Booking.com
 * fuer die Flaechen, Convention Art. 1.3 fuer die Lage im Gebaeude.
 * Preisherleitung: docs/research/nyon-langzeitmiete-2026-09-17.md im Repo
 * amanthos-standortabgabe.
 *
 * Warum nur zwei Kategorien: Die fuenf Premium-Zimmer erwirtschaften im
 * Hotelbetrieb 1747 CHF Deckungsbeitrag im Monat und gehoeren deshalb nicht in
 * die Langzeitvermietung. Classic schlaegt mit 1190 den Hotelbetrieb um 268,
 * Luxury Lakeview braucht dafuer mindestens 1250.
 *
 * minMonths 6 ist die Obergrenze, die Convention Art. 1.4 zusichert
 * ("d'une journée à 6 mois"); Verlaengerung ist moeglich, ein laengerer
 * Erstvertrag nicht.
 */
(function () {
  'use strict';

  var UNITS = [
    {
      key: 'classic',
      rooms: ['103', '104', '203', '204'],
      count: 4,
      sqm: 25,
      view: 'garden',
      floor: 1,
      net: 1190, extra: 0, gross: 1190,
      minMonths: 6,
      listed: true
    },
    {
      key: 'lakeview',
      rooms: ['201', '202'],
      count: 2,
      sqm: 30,
      view: 'lake',
      floor: 1,
      net: 1290, extra: 0, gross: 1290,
      minMonths: 6,
      listed: true
    }
  ];

  var api = { UNITS: UNITS, VERSION: '1' };

  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && window) window.NYON_UNITS = api;
})();
