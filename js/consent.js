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
      text: 'We use Google Analytics to see how this site is used. Analytics cookies are only set once you agree. Everything else on this site works either way.',
      accept: 'Accept',
      decline: 'Decline',
      more: 'Privacy Policy',
      label: 'Analytics consent'
    },
    de: {
      text: 'Wir nutzen Google Analytics, um die Nutzung dieser Seite zu verstehen. Analyse-Cookies werden erst nach Ihrer Zustimmung gesetzt. Alles andere funktioniert in beiden F\u00E4llen.',
      accept: 'Akzeptieren',
      decline: 'Ablehnen',
      more: 'Datenschutz',
      label: 'Einwilligung in die Analyse'
    },
    fr: {
      text: 'Nous utilisons Google Analytics pour comprendre l\u2019utilisation de ce site. Les cookies d\u2019analyse ne sont d\u00E9pos\u00E9s qu\u2019apr\u00E8s votre accord. Le reste du site fonctionne dans les deux cas.',
      accept: 'Accepter',
      decline: 'Refuser',
      more: 'Confidentialit\u00E9',
      label: 'Consentement \u00E0 la mesure d\u2019audience'
    },
    it: {
      text: 'Utilizziamo Google Analytics per capire come viene usato questo sito. I cookie di analisi vengono impostati solo dopo il suo consenso. Tutto il resto funziona in entrambi i casi.',
      accept: 'Accetta',
      decline: 'Rifiuta',
      more: 'Privacy',
      label: 'Consenso alla misurazione'
    },
    ja: {
      text: '\u3053\u306E\u30B5\u30A4\u30C8\u306E\u5229\u7528\u72B6\u6CC1\u3092\u628A\u63E1\u3059\u308B\u305F\u3081 Google Analytics \u3092\u4F7F\u7528\u3057\u307E\u3059\u3002\u5206\u6790\u7528 Cookie \u306F\u540C\u610F\u3055\u308C\u305F\u5834\u5408\u306B\u306E\u307F\u8A2D\u5B9A\u3055\u308C\u307E\u3059\u3002\u305D\u306E\u4ED6\u306E\u6A5F\u80FD\u306F\u3069\u3061\u3089\u3067\u3082\u5229\u7528\u3067\u304D\u307E\u3059\u3002',
      accept: '\u540C\u610F\u3059\u308B',
      decline: '\u540C\u610F\u3057\u306A\u3044',
      more: '\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC',
      label: '\u5206\u6790\u3078\u306E\u540C\u610F'
    },
    ko: {
      text: '\uC774 \uC0AC\uC774\uD2B8\uC758 \uC774\uC6A9 \uC0C1\uD669\uC744 \uD30C\uC545\uD558\uAE30 \uC704\uD574 Google Analytics\uB97C \uC0AC\uC6A9\uD569\uB2C8\uB2E4. \uBD84\uC11D \uCFE0\uD0A4\uB294 \uB3D9\uC758\uD558\uC2E0 \uACBD\uC6B0\uC5D0\uB9CC \uC124\uC815\uB429\uB2C8\uB2E4. \uADF8 \uC678 \uAE30\uB2A5\uC740 \uC5B4\uB290 \uCABD\uC774\uB4E0 \uC774\uC6A9\uD558\uC2E4 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
      accept: '\uB3D9\uC758',
      decline: '\uAC70\uBD80',
      more: '\uAC1C\uC778\uC815\uBCF4',
      label: '\uBD84\uC11D \uB3D9\uC758'
    },
    zh: {
      text: '\u6211\u4EEC\u4F7F\u7528 Google Analytics \u4E86\u89E3\u672C\u7F51\u7AD9\u7684\u4F7F\u7528\u60C5\u51B5\u3002\u4EC5\u5728\u60A8\u540C\u610F\u540E\u624D\u4F1A\u8BBE\u7F6E\u5206\u6790 Cookie\u3002\u5176\u4F59\u529F\u80FD\u5728\u4E24\u79CD\u60C5\u51B5\u4E0B\u5747\u53EF\u6B63\u5E38\u4F7F\u7528\u3002',
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
