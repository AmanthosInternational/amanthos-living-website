/**
 * Amanthos Living: Konstanten des Abschnitts Wohnen auf Zeit auf /zurich/
 * (Kontrakt K1 des Bauplans living-wohnen-nyon-fr).
 *
 * Alles, was Abschnitt (Segment 1) und Seitenskript (Segment 2) an festen
 * Werten brauchen, steht hier und nur hier. Keine Logik, kein DOM, keine
 * Preiszahl: der Monatspreis kommt zur Laufzeit aus /api/offers (K2).
 *
 * API_BASE prueft bewusst auf typeof ... === 'string' statt auf den
 * Wahrheitswert: der Test-Harness setzt window.AMANTHOS_API_BASE auf den leeren
 * String (gleiche Origin), und ein leerer String ist falsy (Muster
 * js/grenchen-config.js).
 *
 * ADS_SEND_TO bleibt leer, bis die Verdrahtung das Label der Conversion-Aktion
 * eintraegt; leer heisst, kein Conversion-Aufruf (K4). MAX_PERSONS entspricht
 * MAX_GUESTS.GBAL in js/booking.js. Telefonnummer aus dem JSON-LD von
 * zurich/index.html.
 */
(function () {
  'use strict';

  var api = {
    API_BASE: (typeof window !== 'undefined' && typeof window.AMANTHOS_API_BASE === 'string')
      ? window.AMANTHOS_API_BASE : 'https://amanthos-website-api.onrender.com',
    CONTACT_PATH: '/api/contact',
    OFFERS_PATH: '/api/offers',
    PROPERTY: 'GBAL',
    NIGHTS: 30,
    MAX_PERSONS: 3,
    FORM: 'living-longstay',
    SECTION_ID: 'wohnen-auf-zeit',
    PAGE_URL: 'https://www.amanthosliving.com/zurich/',
    GA4_ID: 'G-8LPLG0BPJ6',
    ADS_ID: 'AW-702540316',
    ADS_SEND_TO: '',
    PHONE: '+41 41 562 97 00',
    PHONE_HREF: 'tel:+41415629700',
    EMAIL: 'info@amanthosliving.com',
    VERSION: '1'
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && window) window.LONGSTAY_CONFIG = api;
})();
