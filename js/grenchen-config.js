/**
 * Amanthos Living: Konstanten der Seite grenchen-mieten (Kontrakt K2).
 *
 * Alles, was Seite, Finder und Seitenskript an festen Werten brauchen, steht
 * hier und nur hier. Keine Logik, kein DOM.
 *
 * API_BASE prueft bewusst auf typeof ... === 'string' statt auf den
 * Wahrheitswert: der Test-Harness setzt window.AMANTHOS_API_BASE auf den leeren
 * String (gleiche Origin), und ein leerer String ist falsy. Das Muster mit ||
 * in booking.js funktioniert dort nur, weil der Harness die Datei umschreibt.
 *
 * TERMIN_URL bleibt leer, bis die Verdrahtung den Wert eintraegt; leer heisst,
 * der Terminlink bleibt verborgen. ADS_SEND_TO wird nur bei erteilter
 * Einwilligung gerufen (K4).
 */
(function () {
  'use strict';

  var api = {
    API_BASE: (typeof window !== 'undefined' && typeof window.AMANTHOS_API_BASE === 'string')
      ? window.AMANTHOS_API_BASE : 'https://amanthos-website-api.onrender.com',
    CONTACT_PATH: '/api/contact',
    GA4_ID: 'G-8LPLG0BPJ6',
    ADS_ID: 'AW-702540316',
    ADS_SEND_TO: 'AW-702540316/x7S2CMfItfAcEJzU_84C',
    TERMIN_URL: '',
    PAGE_URL: 'https://www.amanthosliving.com/grenchen-mieten/',
    PHONE: '+41 41 562 97 00',
    PHONE_HREF: 'tel:+41415629700',
    EMAIL: 'info@amanthosliving.com',
    VERSION: '1'
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && window) window.GRENCHEN_CONFIG = api;
})();
