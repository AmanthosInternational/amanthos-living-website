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
 * ADS_SEND_TO zeigt auf die Conversion-Aktion "Amanthos Living Nyon - Demande
 * de location (Formular)" (7777087800), angelegt am 18.09.2026 im Konto
 * 102-092-8693: Typ WEBPAGE, Kategorie SUBMIT_LEAD_FORM, primaer, einmal je
 * Klick. Bis dahin stand hier bewusst der leere String, weil eine Kampagne ohne
 * Aktion ins Leere zaehlt (so geschehen bei Bad Wiessee: 54 EUR fuer 46 Klicks
 * ohne jede Conversion). Wird die Aktion im Konto geloescht, gehoert hier
 * wieder der leere String hin, nicht eine fremde Aktion.
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
    ADS_SEND_TO: 'AW-702540316/nEK1CLjis_wcEJzU_84C',
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
