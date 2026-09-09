/**
 * Amanthos Living: Seitenskript des Abschnitts Wohnen auf Zeit auf /zurich/
 * (Kontrakte K2 bis K5 des Bauplans living-wohnen-nyon-fr).
 *
 * Drei Aufgaben: den Monatspreis zur Laufzeit aus /api/offers holen und
 * anzeigen (K2), die Anfrage pruefen und als JSON an POST /api/contact
 * schicken (K3), die Ereignisse melden (K4). Keine Preiszahl steht in dieser
 * Datei: geht die Abfrage schief, steht dort der Rueckfalltext ohne Zahl und
 * nie eine Zahl aus einem anderen Fenster. Gespeichert wird nichts.
 *
 * generate_lead, die Ads-Conversion, das Meta-Lead und das Plausible-Ziel
 * feuern erst nach einer bestaetigten 200, nie beim Klick. GA4 laeuft immer
 * (der Consent Mode regelt die Uebertragung), Ads und Meta nur bei erteilter
 * Einwilligung, gepruefte Quelle ist window.amConsent wie in js/meta.js. Die
 * Klick-IDs kommen allein aus window.amMeta.tracking(), die UTM-Werte liest
 * die Seite selbst. Browser-Lead und Server-Lead tragen dieselbe event_id.
 *
 * Reine Helfer als module.exports und window.amLongstayPage (Muster
 * js/grenchen-page.js), DOM-Start nur mit document und vorhandenem ls-form.
 */
(function () {
  'use strict';

  var CFG = (typeof window !== 'undefined' && window.LONGSTAY_CONFIG) ? window.LONGSTAY_CONFIG
    : (typeof require === 'function' ? require('./longstay-config.js') : {});

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'];
  var UTM_RE = /^[A-Za-z0-9._-]{1,64}$/;
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;
  var MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
  var DURATION_RE = /^\d{1,2}$/;
  var PRICE_RE = /^\d{1,6}$/;
  var RATE_RE = /^[A-Z0-9_-]{1,32}$/;
  var PERSONS_OK = ['1', '2', '3'];
  // Drei Versuche: sofort, nach 4 s, nach 10 s. Nur bei Netzfehler, weil der
  // Render-Dienst kalt startet (Muster fetchOffers in js/booking.js); ein
  // HTTP-Fehler ist eine Antwort und wird nicht wiederholt.
  var RETRY_DELAYS = [4000, 10000];
  var DEBOUNCE_MS = 400;

  // Sichtbare Texte je Sprache (K2, K3); der Servertext wird nie gezeigt. Die
  // Sprache kommt aus window.getLang(), alles ausser en gilt als de.
  var SPRACHEN = {
    de: {
      texte: {
        200: 'Vielen Dank. Wir melden uns mit einem Angebot.',
        400: 'Bitte prüfen Sie Name und E-Mail-Adresse.',
        429: 'Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es in einer Minute erneut.'
      },
      // Drei Teile, damit die Anzeige Telefon und E-Mail als echte Links setzen
      // kann, ohne dass der Satz zweimal in der Datei steht.
      kontakt: ['Die Anfrage konnte nicht gesendet werden. Rufen Sie uns an: ', ', oder schreiben Sie an ', '.'],
      monate: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August',
        'September', 'Oktober', 'November', 'Dezember'],
      preis: function (chf) { return 'ab ' + chf + ' pro Monat'; },
      notiz: function (monat, einheit, bedingung) {
        return CFG.NIGHTS + ' Nächte ab ' + monat + ', ' + einheit + ', ' + bedingung
          + ', Preis der Buchungsmaske heute';
      },
      nichtErstattbar: 'Vorauszahlung, nicht erstattbar',
      stornierbar: 'stornierbar',
      rueckfall: 'Monatspreis auf Anfrage. Senden Sie uns Einzugsmonat und Dauer, wir melden uns mit einem Angebot.',
      senden: 'Anfrage wird gesendet ...'
    },
    en: {
      texte: {
        200: 'Thank you. We will get back to you with an offer.',
        400: 'Please check your name and email address.',
        429: 'Too many requests in a short time. Please try again in a minute.'
      },
      kontakt: ['The request could not be sent. Call us at ', ', or write to ', '.'],
      monate: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'],
      preis: function (chf) { return 'from ' + chf + ' per month'; },
      notiz: function (monat, einheit, bedingung) {
        return CFG.NIGHTS + ' nights from ' + monat + ', ' + einheit + ', ' + bedingung
          + ', today\'s price from the booking engine';
      },
      nichtErstattbar: 'prepayment, non-refundable',
      stornierbar: 'cancellable',
      rueckfall: 'Monthly price on request. Send us your move-in month and duration and we will get back to you with an offer.',
      senden: 'Sending the request ...'
    }
  };

  function pageLang() {
    try {
      if (typeof window !== 'undefined' && typeof window.getLang === 'function') {
        return String(window.getLang() || '');
      }
    } catch (e) { /* ohne i18n.js bleibt es deutsch */ }
    return '';
  }
  var sprache = SPRACHEN[pageLang()] ? pageLang() : 'de';
  function T() { return SPRACHEN[sprache]; }
  function setLocale(lang) { sprache = SPRACHEN[lang] ? lang : 'de'; return sprache; }

  function str(v) { return (v === undefined || v === null) ? '' : String(v).trim(); }
  function line(v) { return str(v).replace(/\s+/g, ' '); }

  // ---- Reine Helfer: Fenster und Preis (K2) --------------------------------

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function toISO(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function midnight(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  // Tage ueber den Konstruktor addieren, nicht ueber Millisekunden: die
  // Zeitumstellung Ende Oktober macht einen Tag 23 Stunden lang, und 30 mal 24
  // Stunden ab dem 1. Oktober landen dann auf dem 30., nicht auf dem 31.
  function plusDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }

  // Das Fenster, fuer das der Abschnitt einen Preis zeigt und in dem er bucht.
  // Ein Einzugsmonat in der Vergangenheit zaehlt wie keiner: der Gast bekommt
  // dann das naechstmoegliche Fenster statt einer leeren Anzeige.
  function quoteWindow(today, moveIn) {
    var basis = (today instanceof Date && !isNaN(today.getTime())) ? today : new Date();
    var heute = midnight(basis);
    var wunsch = MONTH_RE.test(str(moveIn)) ? str(moveIn) : '';
    var arrival = null;
    if (wunsch) {
      var erster = new Date(Number(wunsch.slice(0, 4)), Number(wunsch.slice(5, 7)) - 1, 1);
      var laufend = new Date(heute.getFullYear(), heute.getMonth(), 1);
      if (erster.getTime() > laufend.getTime()) { arrival = erster; }
      else if (erster.getTime() === laufend.getTime()) { arrival = plusDays(heute, 2); }
    }
    if (!arrival) { arrival = new Date(heute.getFullYear(), heute.getMonth() + 1, 1); }
    var iso = toISO(arrival);
    return {
      arrival: iso,
      departure: toISO(plusDays(arrival, Number(CFG.NIGHTS))),
      month: iso.slice(0, 7)
    };
  }

  function amountOf(offer) {
    var n = (offer && offer.totalGrossAmount) ? Number(offer.totalGrossAmount.amount) : NaN;
    return isFinite(n) ? n : null;
  }

  // Das billigste Angebot des Fensters. Nimmt die ganze Antwort oder nur die
  // Liste; kommt die Antwort aus einem anderen Fenster (nights ungleich
  // NIGHTS), gilt sie als unbrauchbar und der Abschnitt faellt zurueck.
  function pickOffer(data) {
    var list = [];
    if (Object.prototype.toString.call(data) === '[object Array]') { list = data; }
    else if (data && Object.prototype.toString.call(data.offers) === '[object Array]') {
      if (data.nights !== undefined && Number(data.nights) !== Number(CFG.NIGHTS)) { return null; }
      list = data.offers;
    }
    var beste = null, bester = null;
    for (var i = 0; i < list.length; i++) {
      var betrag = amountOf(list[i]);
      if (betrag === null) { continue; }
      if (bester === null || betrag < bester) { bester = betrag; beste = list[i]; }
    }
    return beste;
  }

  // Schweizer Tausendertrennung mit dem geraden Apostroph (Muster
  // js/grenchen-finder.js): 2875 wird CHF 2'875.
  function formatChf(value) {
    var n = Number(value);
    if (!isFinite(n)) { return ''; }
    var gerundet = Math.round(n);
    return 'CHF ' + (gerundet < 0 ? '-' : '')
      + String(Math.abs(gerundet)).replace(/\B(?=(\d{3})+(?!\d))/g, '\'');
  }

  function monthLabel(month) {
    if (!MONTH_RE.test(str(month))) { return ''; }
    return T().monate[Number(str(month).slice(5, 7)) - 1] + ' ' + str(month).slice(0, 4);
  }

  // Preiszeile und Notiz. Ohne Angebot bleibt es beim Rueckfalltext und die
  // Notiz ist leer: eine Bedingung ohne Preis waere eine Behauptung ins Leere.
  function quoteText(offer, month) {
    if (!offer || amountOf(offer) === null) { return { price: T().rueckfall, note: '' }; }
    var t = T();
    return {
      price: t.preis(formatChf(amountOf(offer))),
      note: t.notiz(monthLabel(month), line(offer.unitGroupName),
        str(offer.category) === 'Non-Refundable' ? t.nichtErstattbar : t.stornierbar)
    };
  }

  // ---- Reine Helfer: Formular (K3) -----------------------------------------

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

  function duration(value) {
    var d = str(value);
    if (!DURATION_RE.test(d)) { return ''; }
    var n = Number(d);
    return (n >= 1 && n <= 24) ? String(n) : '';
  }

  // Genau die 19 Schluessel aus K3, leere Werte als leerer String. Was das
  // Muster nicht trifft, faellt auf "" zurueck: ein Formatfehler kostet keinen
  // Lead, das Backend sanitisiert dieselben Felder ein zweites Mal.
  function buildPayload(input) {
    var i = input || {};
    var campaign = i.campaign || {};
    var moveIn = str(i.moveIn), persons = str(i.persons);
    var quotedMonth = str(i.quotedMonth), quotedPrice = str(i.quotedPrice);
    var quotedRate = str(i.quotedRate);
    var out = {
      form: str(CFG.FORM) || 'living-longstay',
      name: str(i.name).slice(0, 200),
      email: str(i.email).slice(0, 200),
      phone: str(i.phone).slice(0, 40),
      move_in: MONTH_RE.test(moveIn) ? moveIn : '',
      duration_months: duration(i.durationMonths),
      persons: PERSONS_OK.indexOf(persons) === -1 ? '' : persons,
      quoted_month: MONTH_RE.test(quotedMonth) ? quotedMonth : '',
      quoted_price: PRICE_RE.test(quotedPrice) ? quotedPrice : '',
      quoted_unit: line(i.quotedUnit).slice(0, 60),
      quoted_rate: RATE_RE.test(quotedRate) ? quotedRate : '',
      message: str(i.message).slice(0, 5000),
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

  function statusText(status) {
    var t = T();
    return t.texte[Number(status)]
      || (t.kontakt[0] + CFG.PHONE + t.kontakt[1] + CFG.EMAIL + t.kontakt[2]);
  }

  function needsContact(status) { return !T().texte[Number(status)]; }

  // ---- Messung (K4) --------------------------------------------------------

  function granted() {
    try { return !!(window.amConsent && window.amConsent.get() === 'granted'); } catch (e) { return false; }
  }

  function ga4(name, params) {
    // GA4 laeuft immer, der Consent Mode regelt die Uebertragung.
    try { if (typeof window.gtag === 'function') { window.gtag('event', name, params || {}); } } catch (e) { /* nie werfen */ }
  }

  // Der Lead, gemeldet an alle vier Kanaele. Ads und Meta nur mit Einwilligung,
  // Ads ausserdem nur mit eingetragenem Label; die event_id ist dieselbe wie im
  // Body, damit Meta Server-Lead und Browser-Lead als ein Ereignis zaehlt.
  function leadEvents(payload) {
    ga4('generate_lead', {
      lead_form: payload.form,
      duration_months: payload.duration_months,
      persons: payload.persons
    });
    if (granted() && str(CFG.ADS_SEND_TO) && typeof window.gtag === 'function') {
      try { window.gtag('event', 'conversion', { send_to: CFG.ADS_SEND_TO }); } catch (e) { /* nie werfen */ }
    }
    if (granted() && typeof window.fbq === 'function') {
      try {
        window.fbq('track', 'Lead', { content_name: payload.form },
          { eventID: String(payload.event_id) });
      } catch (e) { /* nie werfen */ }
    }
    try {
      if (typeof window.plausible === 'function') {
        window.plausible('Lead', { props: { form: payload.form } });
      }
    } catch (e) { /* nie werfen */ }
  }

  function clickIds() {
    var out = { gclid: '', fbclid: '' };
    try {
      var t = window.amMeta && window.amMeta.tracking();
      if (t) { out.gclid = str(t.gclid); out.fbclid = str(t.fbclid); }
    } catch (e) { /* ohne Einwilligung bleibt es leer */ }
    return out;
  }

  // ---- DOM (K5) ------------------------------------------------------------

  function initPage() {
    var D = {
      section: document.getElementById('wohnen-auf-zeit'),
      price: document.getElementById('ls-price'), note: document.getElementById('ls-price-note'),
      book: document.getElementById('ls-book'), form: document.getElementById('ls-form'),
      name: document.getElementById('ls-name'), email: document.getElementById('ls-email'),
      phone: document.getElementById('ls-phone'), moveIn: document.getElementById('ls-movein'),
      duration: document.getElementById('ls-duration'), persons: document.getElementById('ls-persons'),
      message: document.getElementById('ls-message'), honeypot: document.getElementById('ls-company-website'),
      submit: document.getElementById('ls-submit'), status: document.getElementById('ls-status'),
      success: document.getElementById('ls-success')
    };
    if (!D.form) { return; }

    var eventId = newEventId();
    var campaign = readCampaign(location.search);
    var fenster = quoteWindow(new Date(), '');
    var angebot = null, geladen = false, lauf = 0, timer = null;

    function on(el, type, fn) { if (el) { el.addEventListener(type, fn); } }

    function personsValue() {
      var p = D.persons ? str(D.persons.value) : '';
      return PERSONS_OK.indexOf(p) === -1 ? '' : p;
    }

    function renderQuote() {
      // Der Knopf haengt allein an booking.js, nicht am Preis (K2).
      if (D.book) { D.book.hidden = !(typeof window !== 'undefined' && window.amanthosBooking); }
      // Solange keine Antwort da ist, bleibt der Ladetext aus dem HTML stehen:
      // der Rueckfalltext gehoert dem Fehlschlag, nicht dem Warten.
      if (!geladen) { return; }
      var text = quoteText(angebot, fenster.month);
      if (D.price) {
        // Ab hier gehoert die Zeile dem Skript: ohne das data-i18n-Attribut
        // ueberschreibt applyTranslations aus js/i18n.js den Preis nicht mehr
        // mit dem Ladetext, wenn die Sprachdatei nach der Antwort eintrifft.
        D.price.removeAttribute('data-i18n');
        D.price.textContent = text.price;
      }
      if (D.note) { D.note.textContent = text.note; }
    }

    function showQuote(offer, fuer, token) {
      if (token !== lauf) { return; }
      angebot = offer;
      fenster = fuer;
      geladen = true;
      renderQuote();
      if (!offer) { return; }
      ga4('longstay_quote', {
        month: fuer.month, price: Math.round(amountOf(offer)), unit: line(offer.unitGroupName)
      });
    }

    function loadQuote() {
      lauf += 1;
      var token = lauf;
      var fuer = quoteWindow(new Date(), D.moveIn ? D.moveIn.value : '');
      fenster = fuer;
      var url = CFG.API_BASE + CFG.OFFERS_PATH + '?propertyId=' + encodeURIComponent(CFG.PROPERTY)
        + '&arrival=' + fuer.arrival + '&departure=' + fuer.departure
        + '&adults=' + (personsValue() || '1');
      function versuch(n) {
        fetch(url, { mode: 'cors' }).then(function (res) {
          // Ein HTTP-Fehler ist eine Antwort: kein weiterer Versuch, Rueckfall.
          return res.ok ? res.json() : null;
        }).then(function (data) {
          try { showQuote(data ? pickOffer(data) : null, fuer, token); } catch (e) { /* nie werfen */ }
        }).catch(function () {
          if (token !== lauf) { return; }
          if (n < RETRY_DELAYS.length) {
            setTimeout(function () { versuch(n + 1); }, RETRY_DELAYS[n]);
            return;
          }
          showQuote(null, fuer, token);
        });
      }
      versuch(0);
    }

    // Entprellt, damit eine Aenderung im Monatsfeld eine Abfrage erzeugt und
    // nicht zwanzig: change und input teilen sich denselben Zeitgeber.
    function reload() {
      if (timer) { clearTimeout(timer); }
      timer = setTimeout(loadQuote, DEBOUNCE_MS);
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
      var tel = document.createElement('a');
      tel.href = CFG.PHONE_HREF;
      tel.textContent = CFG.PHONE;
      var mail = document.createElement('a');
      mail.href = 'mailto:' + CFG.EMAIL;
      mail.textContent = CFG.EMAIL;
      var k = T().kontakt;
      [k[0], tel, k[1], mail, k[2]].forEach(function (part) {
        D.status.appendChild(typeof part === 'string' ? document.createTextNode(part) : part);
      });
    }

    function validate() {
      mark(D.name, false);
      mark(D.email, false);
      if (str(D.name.value).length < 2) { mark(D.name, true); return D.name; }
      if (!EMAIL_RE.test(str(D.email.value))) { mark(D.email, true); return D.email; }
      return null;
    }

    function collect() {
      var ids = clickIds();
      var betrag = amountOf(angebot);
      return buildPayload({
        name: D.name.value, email: D.email.value, phone: D.phone ? D.phone.value : '',
        moveIn: D.moveIn ? D.moveIn.value : '',
        durationMonths: D.duration ? D.duration.value : '',
        persons: personsValue(),
        quotedMonth: angebot ? fenster.month : '',
        quotedPrice: betrag === null ? '' : String(Math.round(betrag)),
        quotedUnit: angebot ? angebot.unitGroupName : '',
        quotedRate: angebot ? angebot.ratePlanCode : '',
        message: D.message ? D.message.value : '',
        eventId: eventId, campaign: campaign, gclid: ids.gclid, fbclid: ids.fbclid,
        companyWebsite: D.honeypot ? D.honeypot.value : ''
      });
    }

    on(D.form, 'submit', function (ev) {
      ev.preventDefault();
      var problem = validate();
      if (problem) {
        setStatus(T().texte[400], false);
        try { problem.focus(); } catch (e) { /* egal */ }
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
        if (res.status === 200) {
          D.form.hidden = true;
          if (D.success) { D.success.hidden = false; }
          setStatus(statusText(200), false);
          leadEvents(payload);
          return;
        }
        if (D.submit) { D.submit.disabled = false; }
        setStatus(statusText(res.status), needsContact(res.status));
      }).catch(function () {
        if (D.submit) { D.submit.disabled = false; }
        setStatus(statusText(0), true);
      });
    });

    on(D.book, 'click', function () {
      ga4('longstay_book_click', { month: fenster.month });
      try {
        window.amanthosBooking.setSearch({
          propertyId: CFG.PROPERTY, arrival: fenster.arrival, departure: fenster.departure,
          adults: Number(personsValue() || '1'), children: 0
        });
      } catch (e) { /* ohne booking.js bleibt der Knopf wirkungslos */ }
    });

    on(D.moveIn, 'change', reload);
    on(D.moveIn, 'input', reload);
    on(D.persons, 'change', reload);
    [D.name, D.email].forEach(function (el) {
      on(el, 'input', function () { mark(el, false); });
    });

    // Nur der Anruf aus diesem Abschnitt zaehlt auf dieses Formular; die
    // uebrigen tel:-Links der Seite gehoeren nicht dazu.
    on(D.section || document, 'click', function (ev) {
      var link = (ev.target && ev.target.closest) ? ev.target.closest('a[href^="tel:"]') : null;
      if (link) { ga4('phone_click', { lead_form: str(CFG.FORM) }); }
    });

    // Sprachwechsel aendert nur den Text, nie das Fenster: eine zweite Abfrage
    // waere derselbe Preis in anderen Worten.
    on(document, 'languageChanged', function (ev) {
      setLocale((ev && ev.detail && ev.detail.lang) ? ev.detail.lang : pageLang());
      renderQuote();
    });

    renderQuote();
    loadQuote();
  }

  var api = {
    VERSION: '1',
    quoteWindow: quoteWindow, pickOffer: pickOffer, formatChf: formatChf,
    monthLabel: monthLabel, quoteText: quoteText, buildPayload: buildPayload,
    readCampaign: readCampaign, newEventId: newEventId, statusText: statusText,
    needsContact: needsContact, setLocale: setLocale,
    locale: function () { return sprache; }
  };

  if (typeof module === 'object' && module.exports) { module.exports = api; }
  if (typeof window !== 'undefined' && window) { window.amLongstayPage = api; }

  if (typeof document !== 'undefined' && document) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPage);
    } else {
      initPage();
    }
  }
})();
