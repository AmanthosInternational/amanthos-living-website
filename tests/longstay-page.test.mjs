/**
 * Tests der reinen Helfer aus js/longstay-page.js (Segment 2, Kontrakte K2 bis K4).
 *
 * Ohne DOM: die Datei exportiert genau die Funktionen, die Fenster, Angebot,
 * Preistext, Payload, Kampagne, Kennung und Statustexte erzeugen. Die
 * DOM-Strecke (Anzeige, Formular, Ereignisse) wird im Harness im Browser
 * geprueft, nicht hier.
 *
 * Alle Werte sind synthetisch (Testperson Muster, test-lead@example.com,
 * +41 79 123 45 67). Das Angebots-Fixture traegt Listenpreise, keine
 * Personendaten. Kein Test ruft einen Produktionsendpunkt.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const scriptFile = join(here, '..', 'js', 'longstay-page.js');
const page = require(scriptFile);
const config = require(join(here, '..', 'js', 'longstay-config.js'));
const src = readFileSync(scriptFile, 'utf8');
const angebote = JSON.parse(readFileSync(join(here, 'fixtures', 'offers-gbal-30.json'), 'utf8'));

// Genau die 19 Schluessel aus K3.
const K3_KEYS = [
  'form', 'name', 'email', 'phone', 'move_in', 'duration_months', 'persons',
  'quoted_month', 'quoted_price', 'quoted_unit', 'quoted_rate', 'message', 'event_id',
  'utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid', 'company_website'
];

const VOLL = {
  name: '  Testperson Muster  ',
  email: 'test-lead@example.com',
  phone: '+41 79 123 45 67',
  moveIn: '2026-11',
  durationMonths: '6',
  persons: '2',
  quotedMonth: '2026-11',
  quotedPrice: '2875',
  quotedUnit: 'Classic Suite',
  quotedRate: 'NONREFRO_IBE',
  message: 'Ich suche eine moeblierte Suite ab November.',
  eventId: 'abcd-1234-efgh-5678',
  campaign: { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'living-wohnen-auf-zeit' },
  gclid: 'Cj0KTEST', fbclid: 'IwARTEST', companyWebsite: ''
};

// Die Sprache ist Zustand im Modul; jeder Test, der sie dreht, dreht sie zurueck.
function inLocale(lang, fn) {
  page.setLocale(lang);
  try { fn(); } finally { page.setLocale('de'); }
}

const HEUTE = new Date(2026, 8, 9); // 09.09.2026, lokale Mitternacht

// ---- Modulform ------------------------------------------------------------

test('das Modul exportiert die reinen Helfer und laeuft ohne DOM', () => {
  assert.equal(page.VERSION, '1');
  for (const fn of ['quoteWindow', 'pickOffer', 'formatChf', 'monthLabel', 'quoteText',
    'buildPayload', 'readCampaign', 'newEventId', 'statusText', 'needsContact', 'setLocale']) {
    assert.equal(typeof page[fn], 'function', `${fn} fehlt im Export`);
  }
  assert.equal(typeof globalThis.document, 'undefined');
  assert.equal(page.locale(), 'de');
});

// ---- K2: quoteWindow ------------------------------------------------------

test('K2: ohne Einzugsmonat beginnt das Fenster am ersten Tag des Folgemonats', () => {
  assert.deepEqual(page.quoteWindow(HEUTE, ''),
    { arrival: '2026-10-01', departure: '2026-10-31', month: '2026-10' });
});

test('K2: ein kuenftiger Einzugsmonat beginnt an dessen erstem Tag', () => {
  const w = page.quoteWindow(HEUTE, '2027-01');
  assert.equal(w.arrival, '2027-01-01');
  assert.equal(w.departure, '2027-01-31');
  assert.equal(w.month, '2027-01');
});

test('K2: der laufende Monat beginnt zwei Tage nach heute', () => {
  const w = page.quoteWindow(HEUTE, '2026-09');
  assert.equal(w.arrival, '2026-09-11');
  assert.equal(w.departure, '2026-10-11');
  assert.equal(w.month, '2026-09');
});

test('K2: ein vergangener oder unlesbarer Einzugsmonat zaehlt wie keiner', () => {
  const ohne = page.quoteWindow(HEUTE, '');
  for (const wert of ['2026-08', '2025-12', 'quatsch', '2026-13', '2026-1', '', null, undefined]) {
    assert.deepEqual(page.quoteWindow(HEUTE, wert), ohne, `moveIn ${String(wert)}`);
  }
});

test('K2: departure liegt immer NIGHTS Tage nach arrival, auch ueber die Zeitumstellung', () => {
  const tage = (a, b) => Math.round(
    (new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  // Oktober (Umstellung auf Winterzeit) und Maerz (auf Sommerzeit).
  for (const [heute, moveIn] of [[new Date(2026, 8, 9), ''], [new Date(2027, 1, 15), '2027-03'],
    [new Date(2026, 5, 1), '2026-07']]) {
    const w = page.quoteWindow(heute, moveIn);
    assert.equal(tage(w.arrival, w.departure), config.NIGHTS, `${w.arrival} bis ${w.departure}`);
  }
});

// ---- K2: pickOffer --------------------------------------------------------

test('K2: pickOffer nimmt das billigste der fuenf Angebote aus dem Fixture', () => {
  const offer = page.pickOffer(angebote);
  assert.equal(offer.unitGroupName, 'Classic Suite');
  assert.equal(offer.totalGrossAmount.amount, 2875);
  assert.equal(offer.ratePlanCode, 'NONREFRO_IBE');
  assert.equal(offer.category, 'Non-Refundable');
});

test('K2: pickOffer liefert null bei leerer Liste und bei falscher Naechtezahl', () => {
  assert.equal(page.pickOffer({ nights: 30, offers: [] }), null);
  assert.equal(page.pickOffer({ nights: 29, offers: angebote.offers }), null);
  assert.equal(page.pickOffer({ nights: 1, offers: angebote.offers }), null);
  assert.equal(page.pickOffer([]), null);
  assert.equal(page.pickOffer(null), null);
  assert.equal(page.pickOffer({}), null);
});

test('K2: pickOffer ueberspringt Angebote ohne lesbaren Betrag und waehlt deterministisch', () => {
  const liste = [
    { unitGroupName: 'Ohne Preis' },
    { unitGroupName: 'Kaputt', totalGrossAmount: { amount: 'zwei' } },
    { unitGroupName: 'Erste', totalGrossAmount: { amount: 1200 } },
    { unitGroupName: 'Zweite', totalGrossAmount: { amount: 1200 } }
  ];
  assert.equal(page.pickOffer({ nights: 30, offers: liste }).unitGroupName, 'Erste');
  assert.equal(page.pickOffer(liste).unitGroupName, 'Erste');
});

// ---- K2: formatChf, monthLabel, quoteText ---------------------------------

test('K2: formatChf setzt den Schweizer Apostroph und rundet auf ganze Franken', () => {
  assert.equal(page.formatChf(2875), 'CHF 2\'875');
  assert.equal(page.formatChf(2875.0), 'CHF 2\'875');
  assert.equal(page.formatChf(999), 'CHF 999');
  assert.equal(page.formatChf(1234567), 'CHF 1\'234\'567');
  assert.equal(page.formatChf(95.85), 'CHF 96');
  assert.equal(page.formatChf('abc'), '');
  assert.equal(page.formatChf(null), '');
});

test('K2: monthLabel schreibt den Monat aus, in beiden Sprachen', () => {
  assert.equal(page.monthLabel('2026-10'), 'Oktober 2026');
  assert.equal(page.monthLabel('2026-01'), 'Januar 2026');
  assert.equal(page.monthLabel('kaputt'), '');
  inLocale('en', () => assert.equal(page.monthLabel('2026-10'), 'October 2026'));
});

test('K2: quoteText nennt Preis, Fenster, Einheit und Bedingung des Angebots', () => {
  const t = page.quoteText(page.pickOffer(angebote), '2026-10');
  assert.equal(t.price, 'ab CHF 2\'875 pro Monat');
  assert.equal(t.note, '30 Nächte ab Oktober 2026, Classic Suite, '
    + 'Vorauszahlung, nicht erstattbar, Preis der Buchungsmaske heute');
});

test('K2: ein stornierbares Angebot bekommt die andere Bedingung', () => {
  const t = page.quoteText({
    unitGroupName: 'Classic Suite', category: 'Flexible', totalGrossAmount: { amount: 3100 }
  }, '2026-10');
  assert.match(t.note, /, stornierbar, /);
  assert.equal(t.price, 'ab CHF 3\'100 pro Monat');
});

test('K2: ohne Angebot steht der Rueckfalltext ohne Zahl und ohne Notiz', () => {
  for (const leer of [null, undefined, {}, { totalGrossAmount: { amount: 'x' } }]) {
    const t = page.quoteText(leer, '2026-10');
    assert.equal(t.note, '');
    assert.equal(t.price, 'Monatspreis auf Anfrage. Senden Sie uns Einzugsmonat und Dauer, '
      + 'wir melden uns mit einem Angebot.');
    assert.ok(!/\d/.test(t.price), 'der Rueckfalltext darf keine Zahl tragen');
  }
});

test('K2: die englische Fassung nennt dieselben Angaben', () => {
  inLocale('en', () => {
    const t = page.quoteText(page.pickOffer(angebote), '2026-10');
    assert.equal(t.price, 'from CHF 2\'875 per month');
    assert.equal(t.note, '30 nights from October 2026, Classic Suite, '
      + 'prepayment, non-refundable, today\'s price from the booking engine');
    assert.ok(!/\d/.test(page.quoteText(null, '2026-10').price));
  });
});

// ---- K3: buildPayload -----------------------------------------------------

test('K3: buildPayload liefert genau die 19 Schluessel des Kontrakts', () => {
  const payload = page.buildPayload(VOLL);
  assert.deepEqual(Object.keys(payload).sort(), [...K3_KEYS].sort());
  assert.equal(Object.keys(payload).length, 19);
});

test('K3: buildPayload uebernimmt die Werte getrimmt und setzt form auf living-longstay', () => {
  const payload = page.buildPayload(VOLL);
  assert.equal(payload.form, 'living-longstay');
  assert.equal(payload.form, config.FORM);
  assert.equal(payload.name, 'Testperson Muster');
  assert.equal(payload.email, 'test-lead@example.com');
  assert.equal(payload.phone, '+41 79 123 45 67');
  assert.equal(payload.move_in, '2026-11');
  assert.equal(payload.duration_months, '6');
  assert.equal(payload.persons, '2');
  assert.equal(payload.quoted_month, '2026-11');
  assert.equal(payload.quoted_price, '2875');
  assert.equal(payload.quoted_unit, 'Classic Suite');
  assert.equal(payload.quoted_rate, 'NONREFRO_IBE');
  assert.equal(payload.event_id, 'abcd-1234-efgh-5678');
  assert.equal(payload.utm_campaign, 'living-wohnen-auf-zeit');
  assert.equal(payload.gclid, 'Cj0KTEST');
  assert.equal(payload.fbclid, 'IwARTEST');
  assert.equal(payload.company_website, '');
});

test('K3: ohne Eingabe sind alle 19 Werte leere Strings, ausser form', () => {
  for (const leer of [undefined, {}]) {
    const payload = page.buildPayload(leer);
    assert.equal(Object.keys(payload).length, 19);
    for (const key of K3_KEYS) {
      assert.equal(typeof payload[key], 'string', `${key} ist kein String`);
      if (key !== 'form') { assert.equal(payload[key], '', `${key} ist nicht leer`); }
    }
    assert.equal(payload.form, 'living-longstay');
  }
});

test('K3: unbrauchbare Werte fallen einzeln auf den leeren String zurueck', () => {
  const payload = page.buildPayload({
    ...VOLL,
    moveIn: '2026-13', durationMonths: '25', persons: '4',
    quotedMonth: 'Oktober', quotedPrice: '2875.50', quotedRate: 'nonrefro ibe'
  });
  assert.equal(payload.move_in, '');
  assert.equal(payload.duration_months, '');
  assert.equal(payload.persons, '');
  assert.equal(payload.quoted_month, '');
  assert.equal(payload.quoted_price, '');
  assert.equal(payload.quoted_rate, '');
  // Was gueltig war, bleibt stehen: ein Formatfehler kostet keinen Lead.
  assert.equal(payload.name, 'Testperson Muster');
  assert.equal(payload.quoted_unit, 'Classic Suite');
});

test('K3: duration_months nimmt 1 bis 24 und nichts daneben', () => {
  for (const wert of ['1', '01', '24', 12]) {
    assert.equal(page.buildPayload({ durationMonths: wert }).duration_months, String(Number(wert)));
  }
  for (const wert of ['0', '25', '100', '-3', '1.5', 'zwei', '']) {
    assert.equal(page.buildPayload({ durationMonths: wert }).duration_months, '', `Wert ${wert}`);
  }
});

test('K3: persons kennt nur 1, 2 und 3', () => {
  for (const wert of ['1', '2', '3']) {
    assert.equal(page.buildPayload({ persons: wert }).persons, wert);
  }
  for (const wert of ['0', '4', 'zwei', '']) {
    assert.equal(page.buildPayload({ persons: wert }).persons, '');
  }
});

test('K3: die langen Felder werden auf die Grenzen des Backends gekuerzt', () => {
  const payload = page.buildPayload({
    name: 'N'.repeat(300), email: 'e'.repeat(300), phone: 'p'.repeat(80),
    quotedUnit: 'U'.repeat(90), message: 'M'.repeat(6000),
    gclid: 'g'.repeat(600), fbclid: 'f'.repeat(600)
  });
  assert.equal(payload.name.length, 200);
  assert.equal(payload.email.length, 200);
  assert.equal(payload.phone.length, 40);
  assert.equal(payload.quoted_unit.length, 60);
  assert.equal(payload.message.length, 5000);
  assert.equal(payload.gclid.length, 512);
  assert.equal(payload.fbclid.length, 512);
});

test('K3: quoted_unit bleibt einzeilig', () => {
  assert.equal(page.buildPayload({ quotedUnit: ' Classic\n  Suite ' }).quoted_unit, 'Classic Suite');
});

// ---- K3: readCampaign und newEventId --------------------------------------

test('K3: readCampaign liest die drei UTM-Werte aus der Adresse', () => {
  const c = page.readCampaign('?utm_source=google&utm_medium=cpc&utm_campaign=living-zurich');
  assert.deepEqual(c, { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'living-zurich' });
});

test('K3: readCampaign verwirft ungueltige Werte einzeln', () => {
  const c = page.readCampaign('?utm_source=google&utm_medium=c%20pc&utm_campaign=' + 'x'.repeat(65));
  assert.equal(c.utm_source, 'google');
  assert.equal(c.utm_medium, '');
  assert.equal(c.utm_campaign, '');
});

test('K3: readCampaign liefert ohne Adresse drei leere Werte', () => {
  for (const wert of ['', '?', undefined, null, '?foo=bar']) {
    assert.deepEqual(page.readCampaign(wert),
      { utm_source: '', utm_medium: '', utm_campaign: '' });
  }
});

test('K3: buildPayload nimmt nur geprueffte Kampagnenwerte an', () => {
  const payload = page.buildPayload({ campaign: { utm_source: 'a b', utm_medium: 'cpc' } });
  assert.equal(payload.utm_source, '');
  assert.equal(payload.utm_medium, 'cpc');
  assert.equal(payload.utm_campaign, '');
});

test('K3: newEventId passt auf das Muster des Backends und wiederholt sich nicht', () => {
  const ids = new Set();
  for (let i = 0; i < 50; i++) {
    const id = page.newEventId();
    assert.match(id, /^[A-Za-z0-9-]{8,64}$/);
    ids.add(id);
  }
  assert.equal(ids.size, 50);
});

// ---- K3: statusText und needsContact --------------------------------------

test('K3: statusText kennt 200, 400 und 429 auf Deutsch', () => {
  assert.equal(page.statusText(200), 'Vielen Dank. Wir melden uns mit einem Angebot.');
  assert.equal(page.statusText(400), 'Bitte prüfen Sie Name und E-Mail-Adresse.');
  assert.equal(page.statusText(429),
    'Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es in einer Minute erneut.');
});

test('K3: 502, 503 und der Netzfehler nennen Telefon und E-Mail', () => {
  for (const status of [502, 503, 0, 413, 500]) {
    const text = page.statusText(status);
    assert.ok(text.includes(config.PHONE), `Telefon fehlt bei ${status}`);
    assert.ok(text.includes(config.EMAIL), `E-Mail fehlt bei ${status}`);
    assert.equal(page.needsContact(status), true, `needsContact(${status})`);
  }
});

test('K3: needsContact ist bei 200, 400 und 429 falsch', () => {
  for (const status of [200, 400, 429]) {
    assert.equal(page.needsContact(status), false, `needsContact(${status})`);
  }
});

test('K3: dieselben Statustexte auf Englisch', () => {
  inLocale('en', () => {
    assert.equal(page.statusText(200), 'Thank you. We will get back to you with an offer.');
    assert.equal(page.statusText(400), 'Please check your name and email address.');
    assert.equal(page.statusText(429),
      'Too many requests in a short time. Please try again in a minute.');
    for (const status of [502, 503, 0]) {
      assert.ok(page.statusText(status).includes(config.PHONE));
      assert.ok(page.statusText(status).includes(config.EMAIL));
      assert.equal(page.needsContact(status), true);
    }
  });
});

test('K3: setLocale nimmt nur de und en, alles andere ist de', () => {
  for (const lang of ['fr', 'it', 'zh', '', undefined, 'de-CH']) {
    assert.equal(page.setLocale(lang), 'de', `setLocale(${String(lang)})`);
  }
  assert.equal(page.setLocale('en'), 'en');
  assert.equal(page.setLocale('de'), 'de');
});

// ---- Abschnitt 0: was nicht in der Datei stehen darf -----------------------

test('Abschnitt 0: keine Preiszahl im Quelltext', () => {
  assert.equal(/CHF\s*\d/.test(src), false, 'ein CHF-Betrag steht im Quelltext');
  for (const offer of angebote.offers) {
    const betrag = String(offer.totalGrossAmount.amount).replace(/\.0$/, '');
    assert.equal(src.includes(betrag), false, `der Betrag ${betrag} steht im Quelltext`);
  }
});

test('Abschnitt 0: nichts wird gespeichert, kein Cookie, kein Storage', () => {
  for (const verboten of ['localStorage', 'sessionStorage', 'document.cookie', 'indexedDB']) {
    assert.equal(src.includes(verboten), false, `${verboten} steht im Quelltext`);
  }
});

test('Abschnitt 0: kein Gedankenstrich und keine Personendaten im Quelltext', () => {
  assert.equal(src.includes('—'), false, 'ein Gedankenstrich steht im Quelltext');
  assert.equal(/[\w.-]+@(?!amanthosliving)/.test(src.replace(/@param|@\{/g, '')), false,
    'eine fremde Mailadresse steht im Quelltext');
});

test('K1: das Skript liest seine Konstanten aus longstay-config.js', () => {
  assert.equal(config.NIGHTS, 30);
  assert.equal(config.PROPERTY, 'GBAL');
  assert.equal(config.ADS_SEND_TO, '');
  assert.ok(src.includes("require('./longstay-config.js')"));
  assert.ok(src.includes('window.LONGSTAY_CONFIG'));
});

test('K4: die Ereignisse feuern erst nach der 200 und nur mit Einwilligung', () => {
  // Statische Gegenprobe zur Browserpruefung: die Namen stehen genau einmal,
  // Ads und Meta haengen an granted(), Ads zusaetzlich an ADS_SEND_TO.
  for (const name of ['generate_lead', 'longstay_quote', 'longstay_book_click', 'phone_click']) {
    assert.equal(src.split(`'${name}'`).length - 1, 1, `${name} steht nicht genau einmal`);
  }
  assert.ok(/granted\(\) && str\(CFG\.ADS_SEND_TO\)/.test(src), 'Ads haengt nicht an ADS_SEND_TO');
  assert.ok(/granted\(\) && typeof window\.fbq/.test(src), 'Meta haengt nicht an der Einwilligung');
  assert.ok(src.includes('eventID: String(payload.event_id)'), 'Meta ohne Dedup-Kennung');
  assert.ok(src.includes("window.plausible('Lead', { props: { form: payload.form } })"),
    'Plausible ohne Eigenschaft form');
  // Die Klick-IDs kommen allein aus amMeta.tracking(), nie aus der Adresse.
  assert.equal(src.includes('gclid'), true);
  assert.equal(/params\.get\(['"]gclid/.test(src), false, 'gclid wird aus der Adresse gelesen');
  assert.equal(/params\.get\(['"]fbclid/.test(src), false, 'fbclid wird aus der Adresse gelesen');
});
