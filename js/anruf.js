/**
 * Amanthos Living: Anrufmessung fuer jede Seite mit sichtbarer Telefonnummer.
 *
 * Zwei Messungen, beide im Google-Ads-Konto AW-702540316, angelegt am 09.09.2026
 * mit AmanthosWebseiten/scripts/ads-living-anruf.py:
 *
 *   7756094157  Anruf von der Website (ab 60 s), Typ WEBSITE_CALL. Besucher, die
 *               ueber eine Anzeige kamen, sehen statt der Hausnummer eine
 *               Weiterleitungsnummer von Google; Google zaehlt das Gespraech ab
 *               60 Sekunden. Ohne Anzeigenklick liefert Google keine Nummer, dann
 *               bleibt die Seite unveraendert.
 *   7756094559  Telefonklick, Typ WEBPAGE. Zaehlt den Tipp auf die Nummer. Das ist
 *               die Untergrenze: sie greift auch ohne Weiterleitungsnummer und bei
 *               kurzen Gespraechen.
 *
 * Die Nummer der Seite wird nicht hier eingetragen, sondern aus dem ersten
 * tel:-Verweis im Dokument gelesen. So traegt die Startseite die Zuercher Nummer
 * und die Grenchner Seiten ihre eigene, ohne dass diese Datei sie kennt.
 *
 * Getauscht wird ausschliesslich innerhalb der tel:-Verweise, nie im uebrigen
 * Text. Grund: die Nummer steht auf jeder Seite ausserdem im JSON-LD als
 * "telephone" des Betriebs. Stuende dort die Weiterleitungsnummer, veroeffentlichte
 * die Seite eine Nummer, die nur fuer Anzeigenbesucher gilt.
 *
 * Kanaele wie in js/longstay-page.js: GA4 laeuft immer (der Consent Mode regelt die
 * Uebertragung), Ads und Meta nur bei erteilter Einwilligung, Plausible ist
 * cookiefrei und laeuft immer. Reine Helfer als module.exports und
 * window.amAnruf, DOM-Start nur mit document und mindestens einem tel:-Verweis.
 */
(function () {
  'use strict';

  var ADS_ID = 'AW-702540316';
  var CALL_SEND_TO = ADS_ID + '/BBhHCM21svIcEJzU_84C';
  var CLICK_SEND_TO = ADS_ID + '/l7jOCN-4svIcEJzU_84C';

  // Eine Zeichenkette, die im Text eines Verweises wie eine Telefonnummer aussieht:
  // beginnt mit Ziffer oder Plus, endet auf einer Ziffer, dazwischen Ziffern und
  // uebliche Trenner. Mindestens acht Zeichen, damit eine Jahreszahl nicht passt.
  var TEL_RE = /\+?\d[\d\s ().\/-]{5,}\d/;

  // ---- reine Helfer --------------------------------------------------------

  function ziffern(wert) { return String(wert == null ? '' : wert).replace(/\D/g, ''); }

  /** 'tel:+41 41 562 97 00' wird zu '+41415629700'. Ohne tel: kommt ''. */
  function nummerAusHref(href) {
    var roh = String(href == null ? '' : href).trim();
    if (!/^tel:/i.test(roh)) return '';
    var rest = roh.slice(4).replace(/[^\d+]/g, '');
    var z = ziffern(rest);
    if (z.length < 7) return '';
    return (rest.charAt(0) === '+' ? '+' : '') + z;
  }

  /** Die Nummer im Text eines Verweises, oder '' wenn dort keine steht. */
  function anzeigeAusText(text) {
    var treffer = TEL_RE.exec(String(text == null ? '' : text));
    return treffer ? treffer[0] : '';
  }

  /**
   * Tauscht die Nummer im Text und laesst alles andere stehen, damit aus
   * '+41 41 563 99 00 anrufen' die neue Nummer plus 'anrufen' wird. Steht im Text
   * keine Nummer ('Jetzt anrufen'), bleibt er unveraendert.
   */
  function textErsetzen(text, anzeige) {
    var alt = String(text == null ? '' : text);
    var neu = String(anzeige == null ? '' : anzeige);
    if (!neu) return alt;
    var treffer = TEL_RE.exec(alt);
    if (!treffer) return alt;
    return alt.slice(0, treffer.index) + neu + alt.slice(treffer.index + treffer[0].length);
  }

  /** Aus einer Liste von Verweisen die Nummer, auf die die Seite zeigt. */
  function zielNummer(hrefs) {
    var liste = hrefs || [];
    for (var i = 0; i < liste.length; i += 1) {
      var n = nummerAusHref(liste[i]);
      if (n) return n;
    }
    return '';
  }

  /** Der tel:-Verweis, den Google zurueckgibt, in einer Form fuer das href. */
  function hrefAusMobil(mobil) {
    var roh = String(mobil == null ? '' : mobil).trim();
    if (/^tel:/i.test(roh)) roh = roh.slice(4);
    var rest = roh.replace(/[^\d+]/g, '');
    if (ziffern(rest).length < 7) return '';
    return 'tel:' + rest;
  }

  // ---- Messung -------------------------------------------------------------

  function granted() {
    try { return !!(window.amConsent && window.amConsent.get() === 'granted'); } catch (e) { return false; }
  }

  function ga4(name, params) {
    try {
      if (typeof window.gtag === 'function') { window.gtag('event', name, params || {}); }
    } catch (e) { /* nie werfen */ }
  }

  /**
   * Wo ein Seitenskript den Trichter kennt, meldet es den Klick selbst an GA4 und
   * gibt dabei das Formular mit (js/longstay-page.js, js/grenchen-page.js). Dort
   * schweigt diese Datei, sonst zaehlte GA4 denselben Klick zweimal. Auf allen
   * uebrigen Seiten, allen voran der Startseite, gaebe es sonst gar nichts.
   */
  function ga4Zustaendig() {
    try { return !(window.amLongstayPage || window.amGrenchenPage); } catch (e) { return false; }
  }

  function klickMelden(pfad) {
    if (ga4Zustaendig()) { ga4('phone_click', { page_path: pfad }); }
    if (granted() && typeof window.gtag === 'function') {
      try { window.gtag('event', 'conversion', { send_to: CLICK_SEND_TO }); } catch (e) { /* nie werfen */ }
    }
    if (granted() && typeof window.fbq === 'function') {
      try { window.fbq('track', 'Contact', { content_name: 'phone' }); } catch (e) { /* nie werfen */ }
    }
    try {
      if (typeof window.plausible === 'function') {
        window.plausible('Anruf geklickt', { props: { seite: pfad } });
      }
    } catch (e) { /* nie werfen */ }
  }

  // ---- DOM -----------------------------------------------------------------

  function telVerweise() {
    try {
      return Array.prototype.slice.call(document.querySelectorAll('a[href^="tel:"]'));
    } catch (e) { return []; }
  }

  function tauschen(verweise, anzeige, mobil) {
    var href = hrefAusMobil(mobil);
    var text = String(anzeige == null ? '' : anzeige).trim();
    if (!href || !text) return false;
    verweise.forEach(function (a) {
      try {
        a.setAttribute('href', href);
        a.textContent = textErsetzen(a.textContent, text);
      } catch (e) { /* nie werfen */ }
    });
    // Beleg fuer die Pruefung mit einer echten Klick-ID, wie am 06.09.2026 bei W5.
    try { window.amAnrufnummerGetauscht = text; } catch (e) { /* nie werfen */ }
    return true;
  }

  function weiterleitungsnummer(ziel, verweise) {
    if (typeof window.gtag !== 'function') return;
    try {
      window.gtag('config', CALL_SEND_TO, {
        phone_conversion_number: ziel,
        phone_conversion_callback: function (anzeige, mobil) { tauschen(verweise, anzeige, mobil); }
      });
    } catch (e) { /* nie werfen */ }
  }

  function initPage() {
    var alle = telVerweise();
    if (!alle.length) return;
    var ziel = zielNummer(alle.map(function (a) { return a.getAttribute('href'); }));
    if (!ziel) return;
    var zielZiffern = ziffern(ziel);
    var meine = alle.filter(function (a) {
      return ziffern(nummerAusHref(a.getAttribute('href'))) === zielZiffern;
    });
    var pfad = '';
    try { pfad = String(window.location && window.location.pathname || ''); } catch (e) { pfad = ''; }
    meine.forEach(function (a) {
      a.addEventListener('click', function () { klickMelden(pfad); });
    });
    weiterleitungsnummer(ziel, meine);
  }

  var api = {
    VERSION: '1',
    CALL_SEND_TO: CALL_SEND_TO,
    CLICK_SEND_TO: CLICK_SEND_TO,
    ziffern: ziffern,
    ga4Zustaendig: ga4Zustaendig,
    nummerAusHref: nummerAusHref,
    anzeigeAusText: anzeigeAusText,
    textErsetzen: textErsetzen,
    zielNummer: zielNummer,
    hrefAusMobil: hrefAusMobil
  };

  if (typeof module === 'object' && module.exports) { module.exports = api; }
  if (typeof window !== 'undefined' && window) { window.amAnruf = api; }

  if (typeof document !== 'undefined' && document) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPage);
    } else {
      initPage();
    }
  }
})();
