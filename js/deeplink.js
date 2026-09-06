/**
 * Amanthos: Deep-Link-Parser fuer Google Free Booking Links (Kontrakt K1).
 *
 * Reine Funktion ohne DOM-Zugriff und ohne site-spezifische Konstanten: alles,
 * was je Haus verschieden ist, kommt ueber cfg herein. Damit ist die Datei auf
 * allen drei Sites austauschbar und laeuft unveraendert unter node --test.
 */
(function () {
  'use strict';

  var DATE_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  var INT_RE = /^[+-]?\d+$/;
  var UTM_RE = /^[A-Za-z0-9._-]{1,64}$/;
  var CURRENCY_RE = /^[A-Z]{3}$/;
  var GTOTAL_RE = /^\d+(\.\d{1,2})?$/;
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'];
  var MAX_NIGHTS = 30;
  var MAX_LEAD_DAYS = 365;
  var DAY_MS = 86400000;

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function value(params, key) {
    var raw = params.get(key);
    return raw === null || raw === undefined ? null : String(raw).trim();
  }

  // Tagesgenauer Zeitpunkt, unabhaengig von Sommerzeit und Uhrzeit.
  function midnight(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }

  function days(fromMs, toMs) { return Math.round((toMs - fromMs) / DAY_MS); }

  // YYYY-M-D mit ein- oder zweistelligem Monat und Tag; muss ein echtes
  // Kalenderdatum sein (der 30. Februar faellt hier durch).
  function toDate(raw) {
    if (!raw) return null;
    var m = DATE_RE.exec(raw);
    if (!m) return null;
    var y = parseInt(m[1], 10);
    var mon = parseInt(m[2], 10);
    var day = parseInt(m[3], 10);
    if (mon < 1 || mon > 12 || day < 1 || day > 31) return null;
    var d = new Date(y, mon - 1, day);
    if (d.getFullYear() !== y || d.getMonth() !== mon - 1 || d.getDate() !== day) return null;
    return d;
  }

  function toISO(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function toInt(raw, fallback) {
    if (!raw || !INT_RE.test(raw)) return fallback;
    var n = parseInt(raw, 10);
    return isNaN(n) ? fallback : n;
  }

  // Property case-insensitiv auf den kanonischen Code der Site abbilden.
  function canonicalProperty(raw, properties) {
    var codes = Object.keys(properties);
    var wanted = String(raw).toUpperCase();
    for (var i = 0; i < codes.length; i++) {
      if (codes[i].toUpperCase() === wanted) return codes[i];
    }
    return null;
  }

  function readCampaign(params) {
    var out = null;
    for (var i = 0; i < UTM_KEYS.length; i++) {
      var v = value(params, UTM_KEYS[i]);
      if (v && UTM_RE.test(v)) {
        if (!out) out = {};
        out[UTM_KEYS[i]] = v;
      }
    }
    return out;
  }

  // Deterministische Quellableitung in fester Reihenfolge (K1). Bewertet werden
  // nur die bereits geprueften utm-Werte; ein verworfenes utm_campaign kann also
  // keine Quelle mehr setzen.
  function readSource(params, campaign) {
    if (value(params, 'gverify') === 'true') return 'google_verify';
    if (!campaign) return null;
    if (campaign.utm_source !== 'google') return null;
    if (!campaign.utm_campaign || campaign.utm_campaign.indexOf('hotel-') !== 0) return null;
    if (campaign.utm_medium === 'organic') return 'google_fbl';
    if (campaign.utm_medium === 'cpc') return 'google_hotel_ads';
    return null;
  }

  function readGoogle(params) {
    var ucur = value(params, 'ucur');
    var gtotal = value(params, 'gtotal');
    if (!ucur || !CURRENCY_RE.test(ucur)) ucur = null;
    if (!gtotal || !GTOTAL_RE.test(gtotal)) gtotal = null;
    if (!ucur && !gtotal) return null;
    return { ucur: ucur, gtotal: gtotal };
  }

  function readPreselect(params) {
    var room = value(params, 'room');
    var rate = value(params, 'rate');
    room = room ? room.toUpperCase() : null;
    rate = rate ? rate.toUpperCase() : null;
    if (!room && !rate) return null;
    return { room: room, rate: rate };
  }

  function readSearch(params, cfg) {
    var properties = cfg.properties || {};
    var raw = value(params, 'property');
    var property = raw ? canonicalProperty(raw, properties) : (cfg.defaultProperty || null);
    if (!property || !properties.hasOwnProperty(property)) return null;

    var arrival = toDate(value(params, 'arrival'));
    var departure = toDate(value(params, 'departure'));
    if (!arrival || !departure) return null;

    var today = midnight(cfg.today ? cfg.today : new Date());
    var a = midnight(arrival);
    var d = midnight(departure);
    if (a < today || days(today, a) > MAX_LEAD_DAYS) return null;
    var nights = days(a, d);
    if (nights < 1 || nights > MAX_NIGHTS) return null;

    var max = properties[property];
    var adults = toInt(value(params, 'adults'), 2);
    var children = toInt(value(params, 'children'), 0);
    if (adults < 1) adults = 1;
    if (adults > max) adults = max;
    if (children < 0) children = 0;
    if (adults + children > max) children = max - adults;
    if (children < 0) children = 0;

    var langs = cfg.langs || [];
    var langRaw = value(params, 'lang');
    var lang = null;
    if (langRaw) {
      var two = langRaw.slice(0, 2).toLowerCase();
      lang = langs.indexOf(two) !== -1 ? two : 'en';
    }

    return {
      property: property,
      arrival: toISO(arrival),
      departure: toISO(departure),
      adults: adults,
      children: children,
      lang: lang
    };
  }

  /**
   * parse(search, cfg)
   * search: der Query-String der Seite, mit oder ohne fuehrendes Fragezeichen.
   * cfg: { today: Date, properties: { <code>: <MAX> }, langs: [..], defaultProperty }
   * Quelle, Kampagne und Google-Werte kommen auch dann zurueck, wenn die Suche
   * ungueltig ist; ungueltige Daten heissen search null, nicht Fehler.
   */
  function parse(search, cfg) {
    cfg = cfg || {};
    var params;
    try {
      params = new URLSearchParams(search || '');
    } catch (e) {
      params = new URLSearchParams('');
    }
    var campaign = readCampaign(params);
    return {
      search: readSearch(params, cfg),
      preselect: readPreselect(params),
      source: readSource(params, campaign),
      campaign: campaign,
      google: readGoogle(params)
    };
  }

  var api = { parse: parse, VERSION: '1' };

  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && window) {
    window.amDeepLink = api;
    try {
      document.dispatchEvent(new CustomEvent('am:deeplink-ready'));
    } catch (e) { /* aeltere Browser: booking.js prueft zusaetzlich window.amDeepLink */ }
  }
})();
