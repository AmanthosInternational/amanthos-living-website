/**
 * Amanthos Living -- Consent Mode v2 defaults + Cookie-Banner
 *
 * Laedt SYNCHRON und VOR dem gtag-Loader: nur so stehen die Consent-Defaults,
 * bevor gtag.js konfiguriert. Die Datei wirft nie -- alles in try/catch; ohne
 * localStorage verhaelt sich die Seite wie "noch keine Wahl".
 *
 * Regionslogik: EWR + UK warten auf die Einwilligung (analytics_storage denied),
 * alle uebrigen Regionen inklusive der Schweiz messen sofort (revDSG: Widerspruch
 * genuegt). Ads-Signale sind ueberall und dauerhaft denied -- es gibt keine
 * Ads-Verknuepfung.
 *
 * Ablehnung ist strikt: sie setzt zusaetzlich den offiziellen Kill-Switch
 * window['ga-disable-<ID>'], damit auch kein cookieloser Ping mehr rausgeht.
 */
(function () {
  'use strict';

  var GA4_ID = 'G-8LPLG0BPJ6';
  var LANG_KEY = 'amanthos_lang';
  var STORE_KEY = 'am_consent_analytics';
  var PRIVACY_URL = '/privacy/';
  var FALLBACK_LANG = 'en';

  // EU-27 + IS/LI/NO + GB. CH steht bewusst NICHT darin.
  var EEA_UK = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE',
    'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
    'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB'];

  var TEXTS = {
    en: {
      text: 'We use Google Analytics to see how this site is used, and the Meta pixel to measure how our advertising performs. The Meta pixel only loads once you agree. Everything else on this site works either way.',
      accept: 'Accept',
      decline: 'Decline',
      more: 'Privacy Policy',
      label: 'Analytics consent'
    },
    de: {
      text: 'Wir nutzen Google Analytics, um die Nutzung dieser Seite zu verstehen, und den Meta-Pixel, um den Erfolg unserer Werbung zu messen. Der Meta-Pixel wird erst nach Ihrer Zustimmung geladen. Alles andere funktioniert in beiden F\u00E4llen.',
      accept: 'Akzeptieren',
      decline: 'Ablehnen',
      more: 'Datenschutz',
      label: 'Einwilligung in die Analyse'
    },
    fr: {
      text: 'Nous utilisons Google Analytics pour comprendre l\u2019utilisation de ce site, et le pixel Meta pour mesurer la performance de nos publicit\xe9s. Le pixel Meta n\u2019est charg\xe9 qu\u2019apr\xe8s votre accord. Le reste du site fonctionne dans les deux cas.',
      accept: 'Accepter',
      decline: 'Refuser',
      more: 'Confidentialit\u00E9',
      label: 'Consentement \u00E0 la mesure d\u2019audience'
    },
    it: {
      text: 'Utilizziamo Google Analytics per capire come viene usato questo sito e il pixel Meta per misurare l\u2019efficacia della nostra pubblicit\xe0. Il pixel Meta viene caricato solo dopo il suo consenso. Tutto il resto funziona in entrambi i casi.',
      accept: 'Accetta',
      decline: 'Rifiuta',
      more: 'Privacy',
      label: 'Consenso alla misurazione'
    },
    ja: {
      text: '\u3053\u306e\u30b5\u30a4\u30c8\u306e\u5229\u7528\u72b6\u6cc1\u3092\u628a\u63e1\u3059\u308b\u305f\u3081 Google Analytics \u3092\u3001\u5e83\u544a\u306e\u52b9\u679c\u3092\u6e2c\u5b9a\u3059\u308b\u305f\u3081 Meta \u30d4\u30af\u30bb\u30eb\u3092\u4f7f\u7528\u3057\u307e\u3059\u3002Meta \u30d4\u30af\u30bb\u30eb\u306f\u540c\u610f\u3055\u308c\u305f\u5834\u5408\u306b\u306e\u307f\u8aad\u307f\u8fbc\u307e\u308c\u307e\u3059\u3002\u305d\u306e\u4ed6\u306e\u6a5f\u80fd\u306f\u3069\u3061\u3089\u3067\u3082\u5229\u7528\u3067\u304d\u307e\u3059\u3002',
      accept: '\u540C\u610F\u3059\u308B',
      decline: '\u540C\u610F\u3057\u306A\u3044',
      more: '\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC',
      label: '\u5206\u6790\u3078\u306E\u540C\u610F'
    },
    ko: {
      text: '\uc774 \uc0ac\uc774\ud2b8\uc758 \uc774\uc6a9 \uc0c1\ud669\uc744 \ud30c\uc545\ud558\uae30 \uc704\ud574 Google Analytics\ub97c, \uad11\uace0 \uc131\uacfc\ub97c \uce21\uc815\ud558\uae30 \uc704\ud574 Meta \ud53d\uc140\uc744 \uc0ac\uc6a9\ud569\ub2c8\ub2e4. Meta \ud53d\uc140\uc740 \ub3d9\uc758\ud558\uc2e0 \uacbd\uc6b0\uc5d0\ub9cc \ub85c\ub4dc\ub429\ub2c8\ub2e4. \uadf8 \uc678 \uae30\ub2a5\uc740 \uc5b4\ub290 \ucabd\uc774\ub4e0 \uc774\uc6a9\ud558\uc2e4 \uc218 \uc788\uc2b5\ub2c8\ub2e4.',
      accept: '\uB3D9\uC758',
      decline: '\uAC70\uBD80',
      more: '\uAC1C\uC778\uC815\uBCF4',
      label: '\uBD84\uC11D \uB3D9\uC758'
    },
    zh: {
      text: '\u6211\u4eec\u4f7f\u7528 Google Analytics \u4e86\u89e3\u672c\u7f51\u7ad9\u7684\u4f7f\u7528\u60c5\u51b5\uff0c\u5e76\u4f7f\u7528 Meta \u50cf\u7d20\u8861\u91cf\u5e7f\u544a\u6548\u679c\u3002Meta \u50cf\u7d20\u4ec5\u5728\u60a8\u540c\u610f\u540e\u624d\u4f1a\u52a0\u8f7d\u3002\u5176\u4f59\u529f\u80fd\u5728\u4e24\u79cd\u60c5\u51b5\u4e0b\u5747\u53ef\u6b63\u5e38\u4f7f\u7528\u3002',
      accept: '\u540C\u610F',
      decline: '\u62D2\u7EDD',
      more: '\u9690\u79C1\u653F\u7B56',
      label: '\u5206\u6790\u540C\u610F'
    }
  };

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  function readStored() {
    try {
      var v = window.localStorage.getItem(STORE_KEY);
      return (v === 'granted' || v === 'denied') ? v : null;
    } catch (e) { return null; }
  }

  function writeStored(state) {
    try { window.localStorage.setItem(STORE_KEY, state); } catch (e) { /* Private Mode */ }
  }

  /*
   * Bereits gesetzte Google-Cookies entfernen.
   *
   * `analytics_storage: denied` und der ga-disable-Kill-Switch verhindern NEUE
   * Cookies und neue Hits. Was schon auf dem Geraet liegt, raeumen sie nicht
   * weg: die Kennung _ga ueberlebt eine Ablehnung sonst zwei Jahre lang.
   *
   * Zwei Fallstricke, die den naiven Einzeiler wirkungslos machen:
   *  - Geloescht wird nur, wenn Name, Pfad UND Domain exakt zur Setzung passen.
   *    GA4 setzt _ga auf der registrierbaren Domain (".example.com"), nicht auf
   *    dem Host. Darum jede Domain-Variante durchgehen.
   *  - Der Name von _ga_<ID> haengt an der Mess-ID, und aus der GTM-Zeit koennen
   *    _gcl_*-Cookies liegen. Darum document.cookie lesen statt Namen raten.
   */
  function clearGoogleCookies() {
    try {
      var parts = String(location.hostname || '').split('.');
      var scopes = [''];
      for (var i = 0; i < parts.length - 1; i++) {
        var d = parts.slice(i).join('.');
        scopes.push('; domain=.' + d);
        scopes.push('; domain=' + d);
      }
      var names = { '_ga': true };
      names['_ga_' + String(GA4_ID).replace(/^G-/, '')] = true;
      var raw = document.cookie ? document.cookie.split(';') : [];
      for (var j = 0; j < raw.length; j++) {
        var n = raw[j].split('=')[0].trim();
        if (/^(_ga|_gid|_gat|_gac_|_gcl_)/.test(n)) { names[n] = true; }
      }
      var dead = '=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0';
      for (var name in names) {
        if (!Object.prototype.hasOwnProperty.call(names, name)) { continue; }
        for (var k = 0; k < scopes.length; k++) {
          document.cookie = name + dead + scopes[k];
        }
      }
    } catch (e) { /* nie werfen */ }
  }

  function applyState(state) {
    if (state === 'denied') {
      // Offizieller Kill-Switch: kein Hit, auch kein cookieloser.
      window['ga-disable-' + GA4_ID] = true;
      gtag('consent', 'update', { analytics_storage: 'denied' });
      clearGoogleCookies();
    } else if (state === 'granted') {
      window['ga-disable-' + GA4_ID] = false;
      gtag('consent', 'update', { analytics_storage: 'granted' });
    }
    // meta.js haengt an dieser Meldung: es laedt mit defer und damit NACH
    // dem synchronen Erstlauf, bekommt spaetere Wechsel aber sofort mit.
    try {
      document.dispatchEvent(new CustomEvent('am:consent-change', { detail: { state: state } }));
    } catch (e) { /* nie werfen */ }
  }

  // 1. Global-Default: Messen erlaubt, Ads-Signale immer aus.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted'
  });

  // 2. Regional-Default EWR + UK: alles denied bis zur echten Wahl.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    region: EEA_UK
  });

  // 3. Gespeicherte Wahl anwenden.
  applyState(readStored());

  function pickLang() {
    var lang = null;
    try {
      if (LANG_KEY) lang = window.localStorage.getItem(LANG_KEY);
    } catch (e) { lang = null; }
    if (!lang) {
      var nav = (window.navigator && (navigator.language || navigator.userLanguage)) || '';
      lang = nav.slice(0, 2).toLowerCase();
    }
    return TEXTS[lang] ? lang : FALLBACK_LANG;
  }

  var STYLE_ID = 'amConsentStyle';
  var BANNER_ID = 'amConsentBanner';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '.am-consent{position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#1c1c1c;color:#f5f5f5;' +
      'font-family:inherit;font-size:14px;line-height:1.5;box-shadow:0 -2px 12px rgba(0,0,0,.25)}' +
      '.am-consent-inner{max-width:1100px;margin:0 auto;padding:16px 20px;display:flex;flex-wrap:wrap;' +
      'gap:12px 20px;align-items:center;justify-content:space-between}' +
      '.am-consent-text{margin:0;flex:1 1 320px}' +
      '.am-consent-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}' +
      '.am-consent-btn{font:inherit;font-weight:600;padding:10px 22px;min-width:130px;border:1px solid #f5f5f5;' +
      'border-radius:4px;background:#f5f5f5;color:#1c1c1c;cursor:pointer}' +
      '.am-consent-btn:hover{opacity:.85}' +
      '.am-consent-btn:focus-visible{outline:2px solid #8B6914;outline-offset:2px}' +
      '.am-consent-link{color:#f5f5f5;text-decoration:underline;white-space:nowrap}';
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(el);
  }

  function render() {
    try {
      if (!document.body) return;
      var existing = document.getElementById(BANNER_ID);
      if (existing) { existing.style.display = ''; return; }
      injectStyle();
      var t = TEXTS[pickLang()];
      var box = document.createElement('div');
      box.id = BANNER_ID;
      box.className = 'am-consent';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', t.label);
      // Beide Schaltflaechen: gleicher Container, gleiche Klasse, gleiche Groesse,
      // keine Vorbelegung. Ausdruecklich keine Dark Patterns.
      box.innerHTML =
        '<div class="am-consent-inner">' +
          '<p class="am-consent-text"></p>' +
          '<div class="am-consent-actions">' +
            '<button type="button" class="am-consent-btn" data-am-consent="granted"></button>' +
            '<button type="button" class="am-consent-btn" data-am-consent="denied"></button>' +
            '<a class="am-consent-link" href="' + PRIVACY_URL + '"></a>' +
          '</div>' +
        '</div>';
      box.querySelector('.am-consent-text').textContent = t.text;
      var btns = box.querySelectorAll('.am-consent-btn');
      btns[0].textContent = t.accept;
      btns[1].textContent = t.decline;
      box.querySelector('.am-consent-link').textContent = t.more;
      box.addEventListener('click', function (ev) {
        var target = ev.target;
        while (target && target !== box && !target.getAttribute) target = target.parentNode;
        var choice = target && target.getAttribute ? target.getAttribute('data-am-consent') : null;
        if (choice === 'granted' || choice === 'denied') api.set(choice);
      });
      document.body.appendChild(box);
    } catch (e) { /* Der Banner darf die Seite nie brechen */ }
  }

  function hide() {
    try {
      var el = document.getElementById(BANNER_ID);
      if (el) el.style.display = 'none';
    } catch (e) { /* egal */ }
  }

  var api = {
    get: function () {
      return readStored();
    },
    set: function (state) {
      try {
        if (state !== 'granted' && state !== 'denied') return;
        writeStored(state);
        applyState(state);
        hide();
      } catch (e) { /* nie werfen */ }
    },
    open: function () {
      try { render(); } catch (e) { /* nie werfen */ }
    }
  };

  window.amConsent = api;

  function onReady() {
    try { if (readStored() === null) render(); } catch (e) { /* nie werfen */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
