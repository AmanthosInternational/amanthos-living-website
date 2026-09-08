/**
 * Amanthos Living: Seitenskript grenchen-mieten (Kontrakte K3 bis K6).
 *
 * Den Finder steuern und Karten rendern, die Besichtigungsanfrage pruefen und
 * als JSON an POST /api/contact schicken, die vier Ereignisse aus K4 melden.
 *
 * Die Filterlogik steht bewusst NICHT hier, sondern in js/grenchen-finder.js
 * (K6). Fehlt das Modul, zeigt die Seite einen sichtbaren Hinweis statt Karten;
 * eine zweite Filterlogik hier waere der teuerste Fehler dieser Datei. Die
 * Wohnungsobjekte kommen als Referenz aus GRENCHEN_UNITS und werden nur
 * gelesen, nie veraendert.
 *
 * generate_lead und die Google-Ads-Conversion feuern erst nach einer
 * bestaetigten 200, nie beim Klick. Ads und Meta-Pixel laufen nur bei erteilter
 * Einwilligung, gepruefte Quelle ist window.amConsent wie in js/meta.js; die
 * Klick-IDs kommen allein aus window.amMeta.tracking(), die UTM-Werte liest die
 * Seite selbst aus der Adresse. Gespeichert wird nichts: kein localStorage,
 * kein Cookie. Reine Helfer als module.exports und window.amGrenchenPage
 * (Muster js/deeplink.js), DOM-Start nur, wenn es ein document gibt.
 */
(function () {
  'use strict';

  var CFG = (typeof window !== 'undefined' && window.GRENCHEN_CONFIG) ? window.GRENCHEN_CONFIG
    : (typeof require === 'function' ? require('./grenchen-config.js') : {});
  var DATA = (typeof window !== 'undefined' && window.GRENCHEN_UNITS) ? window.GRENCHEN_UNITS
    : (typeof require === 'function' ? require('./grenchen-units.js') : { UNITS: [] });

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'];
  var UTM_RE = /^[A-Za-z0-9._-]{1,64}$/;
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;
  var MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
  var UNIT_RE = /^\d{2}$/;
  var BUDGET_RE = /^\d{3,5}$/;
  var DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
  var ROOMS_OK = ['1.5', '2', '3', '3.5', '3+'];
  var WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  // Sichtbare Texte je Sprache (K3); der Servertext wird nie gezeigt. Die Seite
  // grenchen-louer/ (lang="fr") liest franzoesisch, alles andere deutsch. Was an
  // den Server geht (Wunschtermin, Parkplatz-Vermerk), bleibt deutsch, weil die
  // Mail an den Verkauf deutsch ist.
  var SPRACHEN = {
    de: {
      texte: {
        200: 'Vielen Dank. Wir melden uns bei Ihnen, um den Besichtigungstermin zu bestätigen.',
        400: 'Bitte prüfen Sie Name und E-Mail-Adresse.',
        429: 'Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es in einer Minute erneut.'
      },
      // Drei Teile, damit die Anzeige Telefon und E-Mail als echte Links setzen
      // kann, ohne dass der Satz zweimal in der Datei steht.
      kontakt: ['Die Anfrage konnte nicht gesendet werden. Rufen Sie uns an: ', ', oder schreiben Sie an ', '.'],
      slotFehler: 'Besichtigungen finden von Montag bis Freitag statt. Bitte wählen Sie einen Wochentag.',
      allePreise: 'alle Preise', bis: 'bis ', wohnung: 'Wohnung ', netto: 'Nettomiete', nebenkosten: 'Nebenkosten',
      brutto: 'Bruttomiete', besichtigung: 'Besichtigung anfragen', senden: 'Anfrage wird gesendet ...',
      fehlt: ['Die Wohnungsübersicht steht gerade nicht zur Verfügung. Bitte senden Sie uns die Anfrage unten oder rufen Sie uns an: ', '.'],
      zaehler: function (n, total) { return n + ' von ' + total + ' Wohnungen ' + (n === 1 ? 'passt' : 'passen'); }
    },
    fr: {
      texte: {
        200: 'Merci. Nous vous recontactons pour confirmer le rendez-vous de visite.',
        400: 'Veuillez vérifier le nom et l\'adresse e-mail.',
        429: 'Trop de demandes en peu de temps. Veuillez réessayer dans une minute.'
      },
      kontakt: ['La demande n\'a pas pu être envoyée. Appelez-nous au ', ' ou écrivez à ', '.'],
      slotFehler: 'Les visites ont lieu du lundi au vendredi. Veuillez choisir un jour de semaine.',
      allePreise: 'tous les prix', bis: 'jusqu\'à ', wohnung: 'Appartement ', netto: 'Loyer net', nebenkosten: 'Charges',
      brutto: 'Loyer brut', besichtigung: 'Demander une visite', senden: 'Envoi de la demande ...',
      fehlt: ['La liste des appartements n\'est pas disponible pour le moment. Envoyez-nous la demande ci-dessous ou appelez-nous au ', '.'],
      zaehler: function (n, total) { return n + (n === 1 ? ' logement sur ' : ' logements sur ') + total + (n === 1 ? ' correspond' : ' correspondent'); }
    }
  };
  var sprache = (typeof document !== 'undefined' && document && document.documentElement
    && /^fr/i.test(document.documentElement.lang || '')) ? 'fr' : 'de';
  function T() { return SPRACHEN[sprache]; }
  function setLocale(lang) {
    sprache = SPRACHEN[lang] ? lang : 'de';
    var f = finder();
    if (f && typeof f.setLocale === 'function') { f.setLocale(sprache); }
    return sprache;
  }

  function str(v) { return (v === undefined || v === null) ? '' : String(v).trim(); }

  // ---- Reine Helfer (K3) ---------------------------------------------------

  function newEventId() {
    try {
      if (typeof crypto === 'object' && crypto && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch (e) { /* aeltere Browser: Fallback unten */ }
    return 'g-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  // Jeder UTM-Wert wird einzeln geprueft: ein unbrauchbarer kostet nur sich selbst.
  function readCampaign(search) {
    var out = { utm_source: '', utm_medium: '', utm_campaign: '' };
    try {
      var params = new URLSearchParams(String(search || ''));
      UTM_KEYS.forEach(function (key) {
        var value = str(params.get(key));
        if (UTM_RE.test(value)) { out[key] = value; }
      });
    } catch (e) { /* alte Browser: dann eben keine Kampagne */ }
    return out;
  }

  function parseDay(value) {
    if (!DAY_RE.test(str(value))) { return null; }
    var day = new Date(str(value) + 'T00:00:00Z');
    return isNaN(day.getTime()) ? null : day;
  }

  function isWeekday(value) {
    var day = parseDay(value);
    return !!day && day.getUTCDay() >= 1 && day.getUTCDay() <= 5;
  }

  function composeWishSlot(value, time) {
    var day = parseDay(value);
    if (!day || !str(time)) { return ''; }
    var dd = ('0' + day.getUTCDate()).slice(-2);
    var mm = ('0' + (day.getUTCMonth() + 1)).slice(-2);
    return WEEKDAYS[day.getUTCDay()] + ' ' + dd + '.' + mm + '.' + day.getUTCFullYear()
      + ', ' + str(time);
  }

  function statusText(status) {
    var t = T();
    return t.texte[Number(status)]
      || (t.kontakt[0] + CFG.PHONE + t.kontakt[1] + CFG.EMAIL + t.kontakt[2]);
  }

  function needsContact(status) { return !T().texte[Number(status)]; }

  // Genau die 17 Schluessel aus K3, leere Werte als leerer String. Was das
  // Muster nicht trifft, faellt auf "" zurueck: ein Formatfehler kostet keinen
  // Lead, das Backend sanitisiert dieselben Felder ein zweites Mal.
  function buildPayload(input) {
    var i = input || {};
    var campaign = i.campaign || {};
    var rooms = str(i.rooms);
    var unit = str(i.unit);
    var budget = str(i.budget);
    var moveIn = str(i.moveIn);
    var message = str(i.message);
    if (i.parking) { message = str('Parkplatz: ja. ' + message); }
    var out = {
      form: 'grenchen',
      name: str(i.name).slice(0, 200),
      email: str(i.email).slice(0, 200),
      phone: str(i.phone).slice(0, 40),
      unit: UNIT_RE.test(unit) ? unit : '',
      rooms: ROOMS_OK.indexOf(rooms) === -1 ? '' : rooms,
      budget: BUDGET_RE.test(budget) ? budget : '',
      move_in: MONTH_RE.test(moveIn) ? moveIn : '',
      wish_slot: str(i.wishSlot).slice(0, 120),
      message: message.slice(0, 5000),
      event_id: str(i.eventId),
      gclid: str(i.gclid).slice(0, 512),
      fbclid: str(i.fbclid).slice(0, 512),
      company_website: str(i.companyWebsite)
    };
    UTM_KEYS.forEach(function (key) {
      var value = str(campaign[key]);
      out[key] = UTM_RE.test(value) ? value : '';
    });
    return out;
  }

  // ---- Messung (K4) --------------------------------------------------------

  function granted() {
    try { return !!(window.amConsent && window.amConsent.get() === 'granted'); } catch (e) { return false; }
  }

  function ga4(name, params) {
    // GA4 laeuft immer, der Consent Mode regelt die Uebertragung.
    try { if (typeof window.gtag === 'function') { window.gtag('event', name, params || {}); } } catch (e) { /* nie werfen */ }
  }

  // Der Lead, gemeldet an alle vier Kanaele. Ads und Meta nur mit Einwilligung;
  // die event_id ist dieselbe wie im Body, damit Meta den Server-Lead und den
  // Browser-Lead als ein Ereignis zaehlt.
  function leadEvents(payload) {
    ga4('generate_lead', { lead_form: 'grenchen', unit: payload.unit });
    if (granted() && typeof window.gtag === 'function') {
      try { window.gtag('event', 'conversion', { send_to: CFG.ADS_SEND_TO }); } catch (e) { /* nie werfen */ }
    }
    if (granted() && typeof window.fbq === 'function') {
      try {
        window.fbq('track', 'Lead', { content_name: 'grenchen-mieten' },
          { eventID: String(payload.event_id) });
      } catch (e) { /* nie werfen */ }
    }
    try { if (typeof window.plausible === 'function') { window.plausible('Lead'); } } catch (e) { /* nie werfen */ }
  }

  function clickIds() {
    var out = { gclid: '', fbclid: '' };
    try {
      var t = window.amMeta && window.amMeta.tracking();
      if (t) { out.gclid = str(t.gclid); out.fbclid = str(t.fbclid); }
    } catch (e) { /* ohne Einwilligung bleibt es leer */ }
    return out;
  }

  function finder() {
    try {
      var f = (typeof window !== 'undefined') ? window.amGrenchenFinder : null;
      if (f && typeof f.filter === 'function') {
        // Der Finder kennt die Seitensprache nicht (K6), er bekommt sie von hier.
        if (typeof f.setLocale === 'function') { f.setLocale(sprache); }
        return f;
      }
    } catch (e) { /* nie werfen */ }
    return null;
  }

  // ---- DOM (K5) ------------------------------------------------------------

  function initPage() {
    var D = {
      rooms: document.getElementById('f-rooms'), budget: document.getElementById('f-budget'),
      budgetOut: document.getElementById('f-budget-out'), moveIn: document.getElementById('f-movein'),
      parking: document.getElementById('f-parking'), results: document.getElementById('f-results'),
      count: document.getElementById('f-count'), empty: document.getElementById('f-empty'),
      anfrage: document.getElementById('anfrage'), form: document.getElementById('a-form'),
      name: document.getElementById('a-name'), email: document.getElementById('a-email'),
      phone: document.getElementById('a-phone'), unit: document.getElementById('a-unit'),
      aRooms: document.getElementById('a-rooms'), aBudget: document.getElementById('a-budget'),
      aParking: document.getElementById('a-parking'), aMoveIn: document.getElementById('a-movein'),
      slotDay: document.getElementById('a-slot-day'), slotTime: document.getElementById('a-slot-time'),
      message: document.getElementById('a-message'), honeypot: document.getElementById('a-company-website'),
      submit: document.getElementById('a-submit'), status: document.getElementById('a-status'),
      success: document.getElementById('a-success'), termin: document.getElementById('a-termin'),
      hamburger: document.getElementById('hamburger'), navLinks: document.getElementById('navLinks'),
      consent: document.getElementById('a-consent')
    };
    if (!D.form || !D.results) { return; }

    var eventId = newEventId();
    var campaign = readCampaign(location.search);
    var moveInTouched = false;
    var timer = null;

    function node(tag, cls, text) {
      var el = document.createElement(tag);
      if (cls) { el.className = cls; }
      if (text !== undefined) { el.textContent = text; }
      return el;
    }

    function on(el, type, fn) { if (el) { el.addEventListener(type, fn); } }

    function listed() { return DATA.UNITS.filter(function (u) { return u.listed === true; }); }

    function byNr(nr) {
      var hit = DATA.UNITS.filter(function (u) { return u.nr === str(nr); });
      return hit.length ? hit[0] : null;
    }

    function criteria() {
      var checked = D.rooms ? D.rooms.querySelector('input[name="rooms"]:checked') : null;
      var rooms = checked ? str(checked.value) : '';
      var moveIn = D.moveIn ? str(D.moveIn.value) : '';
      var value = D.budget ? Number(D.budget.value) : NaN;
      var max = D.budget ? Number(D.budget.max) : NaN;
      return {
        rooms: ROOMS_OK.indexOf(rooms) === -1 ? '' : rooms,
        // Der Regler auf dem Maximum heisst "alle Preise", nicht "bis 1700".
        budget: (isFinite(value) && (!isFinite(max) || value < max)) ? value : null,
        moveIn: MONTH_RE.test(moveIn) ? moveIn : ''
      };
    }

    function card(unit, overBudget, f) {
      var art = node('article', overBudget ? 'unit-card over-budget' : 'unit-card');
      art.setAttribute('data-unit', unit.nr);
      var t = T();
      art.appendChild(node('h3', 'unit-card-title', t.wohnung + unit.nr));
      art.appendChild(node('p', 'unit-card-meta', f.floorLabel(unit.floor) + ', '
        + f.roomsLabel(unit.rooms) + ', ' + f.formatSqm(unit.sqm)));
      var dl = node('dl', 'unit-card-price');
      [[t.netto, unit.net, ''], [t.nebenkosten, unit.extra, ''],
        [t.brutto, unit.gross, 'unit-card-gross']].forEach(function (r) {
        dl.appendChild(node('dt', '', r[0]));
        dl.appendChild(node('dd', r[2], f.formatChf(r[1])));
      });
      art.appendChild(dl);
      art.appendChild(node('p', 'unit-card-avail', f.availabilityLabel(unit)));
      var cta = node('button', 'btn btn-accent unit-card-cta', t.besichtigung);
      cta.type = 'button';
      cta.setAttribute('data-unit', unit.nr);
      art.appendChild(cta);
      return art;
    }

    // Ohne js/grenchen-finder.js gibt es keine Karten und keinen Ersatzfilter,
    // sondern einen sichtbaren Weg zur Anfrage.
    function renderMissing() {
      D.results.textContent = '';
      D.results.appendChild(node('p', '', T().fehlt[0] + CFG.PHONE + T().fehlt[1]));
      if (D.count) { D.count.textContent = ''; }
      if (D.empty) { D.empty.hidden = true; }
    }

    function render(fromUser) {
      var crit = criteria();
      mirror(crit);
      var f = finder();
      if (!f) { renderMissing(); return; }
      if (D.budgetOut) {
        D.budgetOut.textContent = crit.budget === null ? T().allePreise
          : T().bis + f.formatChf(crit.budget);
      }
      var treffer = f.filter(DATA.UNITS, crit);
      var over = treffer.length === 0;
      var karten = over ? f.fallback(DATA.UNITS, crit, 3) : treffer;
      D.results.textContent = '';
      karten.forEach(function (unit) { D.results.appendChild(card(unit, over, f)); });
      if (D.empty) { D.empty.hidden = !over; }
      if (D.count) {
        D.count.textContent = T().zaehler(treffer.length, listed().length);
      }
      // Entprellt, damit das Ziehen am Regler ein Ereignis erzeugt und nicht
      // zwanzig. Der erste Lauf beim Laden meldet nichts, er ist keine Wahl.
      if (!fromUser) { return; }
      if (timer) { clearTimeout(timer); }
      timer = setTimeout(function () {
        ga4('finder_result', {
          rooms: crit.rooms,
          budget: crit.budget === null ? '' : crit.budget,
          result_count: treffer.length
        });
      }, 1000);
    }

    function mirror(crit) {
      var chosen = byNr(D.unit ? D.unit.value : '');
      if (D.aRooms) { D.aRooms.value = chosen ? String(chosen.rooms) : crit.rooms; }
      if (D.aBudget) { D.aBudget.value = crit.budget === null ? '' : String(crit.budget); }
      if (D.aParking) { D.aParking.value = (D.parking && D.parking.checked) ? 'ja' : ''; }
      if (D.aMoveIn && !moveInTouched && crit.moveIn) { D.aMoveIn.value = crit.moveIn; }
    }

    function fillUnitSelect() {
      var f = finder();
      if (!f || !D.unit) { return; }
      listed().forEach(function (unit) {
        var opt = node('option', '', T().wohnung + unit.nr + ', ' + f.roomsLabel(unit.rooms)
          + ', ' + f.formatChf(unit.gross));
        opt.value = unit.nr;
        D.unit.appendChild(opt);
      });
    }

    function chooseUnit(nr) {
      var unit = byNr(nr);
      if (!unit) { return; }
      if (D.unit) { D.unit.value = unit.nr; }
      if (D.aRooms) { D.aRooms.value = String(unit.rooms); }
      ga4('select_unit', { unit: unit.nr });
      try { D.anfrage.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* egal */ }
      try { D.name.focus(); } catch (e) { /* egal */ }
    }

    function mark(el, bad) {
      if (el) { el[bad ? 'setAttribute' : 'removeAttribute']('aria-invalid', 'true'); }
    }

    // Der Fehlertext mit Telefon und E-Mail bekommt echte Links: auf dem Handy
    // ist der Anruf sonst ein Abschreibvorgang.
    function setStatus(text, withContact) {
      if (!D.status) { return; }
      D.status.textContent = withContact ? '' : (text || '');
      if (!withContact) { return; }
      var tel = node('a', '', CFG.PHONE);
      tel.href = CFG.PHONE_HREF;
      var mail = node('a', '', CFG.EMAIL);
      mail.href = 'mailto:' + CFG.EMAIL;
      var k = T().kontakt;
      [k[0], tel, k[1], mail, k[2]].forEach(function (part) {
        D.status.appendChild(typeof part === 'string' ? document.createTextNode(part) : part);
      });
    }

    function validate() {
      var probleme = [];
      mark(D.name, false);
      mark(D.email, false);
      mark(D.slotDay, false);
      if (str(D.name.value).length < 2) { mark(D.name, true); probleme.push([D.name, T().texte[400]]); }
      if (!EMAIL_RE.test(str(D.email.value))) { mark(D.email, true); probleme.push([D.email, T().texte[400]]); }
      var day = D.slotDay ? str(D.slotDay.value) : '';
      if (day && !isWeekday(day)) { mark(D.slotDay, true); probleme.push([D.slotDay, T().slotFehler]); }
      return probleme.length ? probleme[0] : null;
    }

    function collect() {
      var chosen = byNr(D.unit ? D.unit.value : '');
      var ids = clickIds();
      return buildPayload({
        name: D.name.value, email: D.email.value, phone: D.phone ? D.phone.value : '',
        unit: chosen ? chosen.nr : '',
        rooms: chosen ? String(chosen.rooms) : criteria().rooms,
        budget: D.aBudget ? D.aBudget.value : '',
        moveIn: D.aMoveIn ? D.aMoveIn.value : '',
        wishSlot: composeWishSlot(D.slotDay ? D.slotDay.value : '', D.slotTime ? D.slotTime.value : ''),
        message: D.message ? D.message.value : '',
        parking: !!(D.aParking && D.aParking.value === 'ja'),
        eventId: eventId, campaign: campaign, gclid: ids.gclid, fbclid: ids.fbclid,
        companyWebsite: D.honeypot ? D.honeypot.value : ''
      });
    }

    function succeed(payload) {
      D.form.hidden = true;
      if (D.success) { D.success.hidden = false; }
      setStatus(statusText(200), false);
      var url = str(CFG.TERMIN_URL);
      if (url && D.termin) { D.termin.href = url; D.termin.hidden = false; }
      leadEvents(payload);
    }

    on(D.form, 'submit', function (ev) {
      ev.preventDefault();
      var problem = validate();
      if (problem) {
        setStatus(problem[1], false);
        try { problem[0].focus(); } catch (e) { /* egal */ }
        return;
      }
      var payload = collect();
      if (D.submit) { D.submit.disabled = true; }
      setStatus(T().senden, false);
      fetch(CFG.API_BASE + CFG.CONTACT_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (res.status === 200) { succeed(payload); return; }
        if (D.submit) { D.submit.disabled = false; }
        setStatus(statusText(res.status), needsContact(res.status));
      }).catch(function () {
        if (D.submit) { D.submit.disabled = false; }
        setStatus(statusText(0), true);
      });
    });

    function onFinder() { render(true); }
    on(D.rooms, 'change', onFinder);
    on(D.budget, 'input', onFinder);
    on(D.moveIn, 'change', onFinder);
    on(D.parking, 'change', onFinder);
    on(D.aMoveIn, 'input', function () { moveInTouched = true; });
    on(D.unit, 'change', function () {
      var chosen = byNr(D.unit.value);
      if (D.aRooms) { D.aRooms.value = chosen ? String(chosen.rooms) : criteria().rooms; }
    });
    [D.name, D.email, D.slotDay].forEach(function (el) {
      on(el, 'input', function () { mark(el, false); });
    });

    on(D.results, 'click', function (ev) {
      var cta = (ev.target && ev.target.closest) ? ev.target.closest('.unit-card-cta') : null;
      if (cta) { chooseUnit(cta.getAttribute('data-unit')); }
    });
    on(document, 'click', function (ev) {
      var link = (ev.target && ev.target.closest) ? ev.target.closest('a[href^="tel:"]') : null;
      if (link) { ga4('phone_click', { lead_form: 'grenchen' }); }
    });

    // Navigation von Hand, weil app.js auf dieser Seite nicht geladen wird.
    if (D.hamburger && D.navLinks) {
      on(D.hamburger, 'click', function () {
        var open = D.navLinks.classList.toggle('open');
        D.hamburger.classList.toggle('active');
        D.hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      on(D.navLinks, 'click', function (ev) {
        if (!ev.target || ev.target.tagName !== 'A') { return; }
        D.navLinks.classList.remove('open');
        D.hamburger.classList.remove('active');
        D.hamburger.setAttribute('aria-expanded', 'false');
      });
    }
    on(D.consent, 'click', function () {
      try { if (window.amConsent) { window.amConsent.open(); } } catch (e) { /* nie werfen */ }
    });

    fillUnitSelect();
    render(false);
  }

  var api = {
    VERSION: '1',
    buildPayload: buildPayload,
    readCampaign: readCampaign,
    newEventId: newEventId,
    composeWishSlot: composeWishSlot,
    isWeekday: isWeekday,
    statusText: statusText,
    needsContact: needsContact,
    setLocale: setLocale,
    locale: function () { return sprache; }
  };

  if (typeof module === 'object' && module.exports) { module.exports = api; }
  if (typeof window !== 'undefined' && window) { window.amGrenchenPage = api; }

  if (typeof document !== 'undefined' && document) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPage);
    } else {
      initPage();
    }
  }
})();
