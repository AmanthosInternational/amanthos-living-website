/**
 * Amanthos Living: Konstanten der Seite nyon-louer (Kontrakt K2).
 *
 * Alles, was Seite und Seitenskript an festen Werten brauchen, steht hier und
 * nur hier. Keine Logik, kein DOM. Aufbau bewusst identisch zu
 * js/grenchen-config.js, damit beide Seiten dasselbe Muster teilen.
 *
 * API_BASE prueft auf typeof ... === 'string' statt auf den Wahrheitswert: der
 * Test-Harness setzt window.AMANTHOS_API_BASE auf den leeren String (gleiche
 * Origin), und ein leerer String ist falsy.
 *
 * ADS_SEND_TO ist noch leer: Fuer Nyon existiert bisher keine eigene
 * Conversion-Aktion im Google-Ads-Konto 102-092-8693. Sie muss vor dem
 * Einschalten der Anzeigen angelegt und hier eingetragen werden, sonst zaehlt
 * die Kampagne wieder ins Leere (so geschehen bei Bad Wiessee: 54 EUR fuer 46
 * Klicks ohne jede Conversion, weil keine Aktion angelegt war).
 *
 * FORM_KIND geht als form=nyon an das Backend und steuert dort Empfaenger und
 * Betreff; der Wert muss mit _handle_contact in amanthos-group-booking
 * uebereinstimmen.
 */
(function () {
  'use strict';

  var api = {
    API_BASE: (typeof window !== 'undefined' && typeof window.AMANTHOS_API_BASE === 'string')
      ? window.AMANTHOS_API_BASE : 'https://amanthos-website-api.onrender.com',
    CONTACT_PATH: '/api/contact',
    FORM_KIND: 'nyon',
    GA4_ID: 'G-8LPLG0BPJ6',
    ADS_ID: 'AW-702540316',
    ADS_SEND_TO: '',
    TERMIN_URL: '',
    PAGE_URL: 'https://www.amanthosliving.com/nyon-louer/',
    PHONE: '+41 41 563 99 00',
    PHONE_HREF: 'tel:+41415639900',
    EMAIL: 'vertrieb@amanthos.com',
    VERSION: '1'
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && window) window.NYON_CONFIG = api;
})();
