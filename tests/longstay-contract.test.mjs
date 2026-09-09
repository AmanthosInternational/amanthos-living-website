/**
 * Kontrakttest Wohnen auf Zeit (Segment 0, Kontrakte K1 und K5).
 *
 * Prueft die Konstanten (K1), das DOM-Fixture samt Skelett (K5) und das
 * Angebots-Fixture fuer den Harness (offers-gbal-30.json). Die Gegenprobe an
 * zurich/index.html, den Sprachdateien und js/longstay-page.js laeuft erst,
 * wenn Segment 1 und 2 gemergt sind; fehlt die Datei oder der Abschnitt, wird
 * der jeweilige Teil uebersprungen statt rot.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(import.meta.url);
const configFile = join(root, 'js', 'longstay-config.js');
const config = require(configFile);
const configSrc = readFileSync(configFile, 'utf8');
const dom = JSON.parse(readFileSync(join(here, 'fixtures', 'longstay-dom-contract.json'), 'utf8'));
const offers = JSON.parse(readFileSync(join(here, 'fixtures', 'offers-gbal-30.json'), 'utf8'));
const skeleton = readFileSync(join(here, 'fixtures', 'longstay-skeleton.html'), 'utf8');

const pageFile = join(root, 'zurich', 'index.html');
const scriptFile = join(root, 'js', 'longstay-page.js');
const pageHasSection = existsSync(pageFile)
  && readFileSync(pageFile, 'utf8').includes('id="' + dom.section + '"');
const skipPage = pageHasSection ? false : 'zurich/index.html traegt den Abschnitt noch nicht (Segment 1)';
const skipScript = existsSync(scriptFile) ? false : 'js/longstay-page.js fehlt noch (Segment 2)';

const K1_KEYS = [
  'API_BASE', 'CONTACT_PATH', 'OFFERS_PATH', 'PROPERTY', 'NIGHTS', 'MAX_PERSONS', 'FORM',
  'SECTION_ID', 'PAGE_URL', 'GA4_ID', 'ADS_ID', 'ADS_SEND_TO', 'PHONE', 'PHONE_HREF', 'EMAIL',
  'VERSION'
];
const OFFER_KEYS = [
  'ratePlanId', 'ratePlanCode', 'ratePlanName', 'category', 'unitGroupId', 'unitGroupName',
  'unitGroupDescription', 'availableUnits', 'totalGrossAmount', 'averagePerNight',
  'cancellationFee', 'cityTax'
];
const PII_KEY = /email|phone|guest|first|last|address|booker|reservation|booking/i;

const countId = (html, id) => (html.match(new RegExp('id="' + id + '"', 'g')) || []).length;
const countKey = (html, key) => (html.match(new RegExp('data-i18n="' + key.replace('.', '\\.') + '"', 'g')) || []).length;
const nested = (obj, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

function allKeys(value, acc = []) {
  if (Array.isArray(value)) value.forEach((v) => allKeys(v, acc));
  else if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) { acc.push(k); allKeys(value[k], acc); }
  }
  return acc;
}

// Liest die Konfiguration wie der Browser: ohne module, mit window.
function inBrowser(apiBase) {
  const w = {};
  w.window = w;
  if (apiBase !== undefined) w.AMANTHOS_API_BASE = apiBase;
  vm.runInContext(configSrc, vm.createContext(w), { filename: 'js/longstay-config.js' });
  return w.LONGSTAY_CONFIG;
}

// ---- K1: Konstanten -------------------------------------------------------

test('K1: longstay-config.js laedt in Node und exportiert genau die vereinbarten Schluessel', () => {
  assert.deepEqual(Object.keys(config).sort(), [...K1_KEYS].sort());
  assert.equal(config.VERSION, '1');
});

test('K1: ADS_SEND_TO ist leer (kein Conversion-Aufruf) oder ein Google-Ads-Label', () => {
  assert.equal(typeof config.ADS_SEND_TO, 'string');
  if (config.ADS_SEND_TO !== '') {
    assert.match(config.ADS_SEND_TO, /^AW-\d+\/[A-Za-z0-9_-]+$/);
    assert.ok(config.ADS_SEND_TO.startsWith(config.ADS_ID + '/'));
  }
});

test('K1: Property, Naechte, Personen, Formularart und Abschnitt stehen fest', () => {
  assert.equal(config.PROPERTY, 'GBAL');
  assert.equal(config.NIGHTS, 30);
  assert.equal(config.MAX_PERSONS, 3);
  assert.equal(config.FORM, 'living-longstay');
  assert.equal(config.SECTION_ID, 'wohnen-auf-zeit');
  assert.equal(config.SECTION_ID, dom.section);
});

test('K1: MAX_PERSONS entspricht MAX_GUESTS.GBAL in js/booking.js', () => {
  const booking = readFileSync(join(root, 'js', 'booking.js'), 'utf8');
  const m = /var MAX_GUESTS = \{[^}]*\bGBAL:\s*(\d+)/.exec(booking);
  assert.ok(m, 'MAX_GUESTS.GBAL nicht in booking.js gefunden');
  assert.equal(config.MAX_PERSONS, Number(m[1]));
});

test('K1: API_BASE, Pfade, Seite, Mess-IDs und Kontakt', () => {
  assert.equal(config.API_BASE, 'https://amanthos-website-api.onrender.com');
  assert.equal(config.CONTACT_PATH, '/api/contact');
  assert.equal(config.OFFERS_PATH, '/api/offers');
  assert.equal(config.PAGE_URL, 'https://www.amanthosliving.com/zurich/');
  assert.equal(config.GA4_ID, 'G-8LPLG0BPJ6');
  assert.equal(config.ADS_ID, 'AW-702540316');
  assert.equal(config.PHONE, '+41 41 562 97 00');
  assert.equal(config.PHONE_HREF, 'tel:' + config.PHONE.replace(/\s/g, ''));
  assert.equal(config.EMAIL, 'info@amanthosliving.com');
});

test('K1: die Telefonnummer ist die aus dem JSON-LD von zurich/index.html', () => {
  const page = readFileSync(pageFile, 'utf8');
  assert.ok(page.includes('"telephone": "' + config.PHONE + '"'));
});

test('K1: im Browser haengt die Konfiguration an window.LONGSTAY_CONFIG und folgt AMANTHOS_API_BASE', () => {
  assert.equal(inBrowser().API_BASE, 'https://amanthos-website-api.onrender.com');
  assert.equal(inBrowser('').API_BASE, '', 'leerer String (Harness, gleiche Origin) muss gelten');
  assert.equal(inBrowser().PROPERTY, 'GBAL');
  assert.deepEqual(Object.keys(inBrowser()).sort(), [...K1_KEYS].sort());
});

test('K1: keine Preiszahl, keine Logik, kein Gedankenstrich in der Datei', () => {
  assert.doesNotMatch(configSrc, /CHF\s?\d/);
  assert.doesNotMatch(configSrc, /document\.|fetch\(|addEventListener/);
  assert.equal((configSrc.match(/—/g) || []).length, 0);
});

// ---- K5: DOM-Fixture ------------------------------------------------------

test('K5: das Fixture traegt 17 eindeutige IDs, Abschnitt und Nav-Eintrag darunter', () => {
  assert.equal(dom.version, '1');
  assert.equal(dom.ids.length, 17);
  assert.equal(new Set(dom.ids).size, dom.ids.length);
  assert.equal(dom.section, 'wohnen-auf-zeit');
  assert.equal(dom.nav, 'ls-nav');
  for (const id of ['wohnen-auf-zeit', 'ls-nav', 'ls-price', 'ls-price-note', 'ls-book', 'ls-form',
    'ls-name', 'ls-email', 'ls-phone', 'ls-movein', 'ls-duration', 'ls-persons', 'ls-message',
    'ls-company-website', 'ls-submit', 'ls-status', 'ls-success']) {
    assert.ok(dom.ids.includes(id), `ID ${id} fehlt im Fixture`);
  }
  assert.deepEqual(dom.hidden_until_wiring, ['wohnen-auf-zeit', 'ls-nav']);
  assert.deepEqual(dom.hidden_initially, ['ls-book', 'ls-success']);
  for (const id of Object.keys(dom.fields)) assert.ok(dom.ids.includes(id), `Feld ${id} fehlt in ids`);
});

test('K5: die 22 data-i18n-Schluessel liegen alle unter longstay.', () => {
  assert.equal(dom.i18n_keys.length, 22);
  assert.equal(new Set(dom.i18n_keys).size, 22);
  for (const key of dom.i18n_keys) assert.match(key, /^longstay\.[a-z_]+$/);
  for (const short of ['nav', 'label', 'title', 'intro', 'price_loading', 'benefit_kitchen',
    'benefit_wifi', 'benefit_desk', 'benefit_parking', 'benefit_checkin', 'benefit_airport',
    'form_title', 'name', 'email', 'phone', 'move_in', 'duration', 'persons', 'message',
    'submit', 'note', 'book']) {
    assert.ok(dom.i18n_keys.includes('longstay.' + short), `longstay.${short} fehlt`);
  }
});

test('K5: die bestehenden Klassen stehen in css/style.css, die neuen gehoeren css/longstay.css', () => {
  const css = readFileSync(join(root, 'css', 'style.css'), 'utf8');
  assert.deepEqual(dom.classes_existing, ['section', 'section-alt', 'container', 'container-narrow',
    'section-label', 'section-title', 'section-subtitle', 'btn', 'btn-accent', 'btn-lg',
    'btn-outline', 'form-grid', 'form-field']);
  for (const cls of dom.classes_existing) {
    assert.match(css, new RegExp('\\.' + cls + '[\\s,.{:>\\[]'), `.${cls} fehlt in css/style.css`);
  }
  assert.deepEqual(dom.classes_new, ['ls-section', 'ls-price', 'ls-price-note', 'ls-benefits',
    'ls-hp', 'ls-status', 'ls-success', 'ls-actions']);
  for (const cls of dom.classes_new) {
    assert.doesNotMatch(css, new RegExp('\\.' + cls + '\\b'), `.${cls} darf nicht in css/style.css stehen`);
  }
});

// ---- K5: Skelett ----------------------------------------------------------

test('K5: das Skelett traegt jede ID genau einmal, ist fest deutsch und noindex', () => {
  for (const id of dom.ids) {
    assert.equal(countId(skeleton, id), 1, `ID ${id} kommt im Skelett ${countId(skeleton, id)} mal vor`);
  }
  assert.match(skeleton, /^<!DOCTYPE html>\s*<html lang="de" data-i18n-fixed>/);
  assert.match(skeleton, /<meta name="robots" content="noindex">/);
});

test('K5: das Skelett traegt jeden data-i18n-Schluessel genau einmal und keinen fremden', () => {
  for (const key of dom.i18n_keys) {
    assert.equal(countKey(skeleton, key), 1, `${key} kommt im Skelett ${countKey(skeleton, key)} mal vor`);
  }
  const used = [...skeleton.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
  for (const key of used) assert.ok(dom.i18n_keys.includes(key), `unbekannter Schluessel ${key}`);
});

test('K5: das Skelett laedt dieselben Skripte wie /zurich/ nach Segment 1, in dieser Reihenfolge', () => {
  const order = ['js/consent.js', 'js/meta.js', 'gtag(', 'js/i18n.js', 'js/longstay-config.js', 'js/longstay-page.js'];
  const positions = order.map((s) => skeleton.indexOf(s));
  for (let i = 0; i < order.length; i++) assert.ok(positions[i] >= 0, `${order[i]} fehlt im Skelett`);
  for (let i = 1; i < order.length; i++) {
    assert.ok(positions[i] > positions[i - 1], `${order[i]} muss nach ${order[i - 1]} kommen`);
  }
  assert.match(skeleton, /<script src="\.\.\/\.\.\/js\/consent\.js"><\/script>/);
  assert.match(skeleton, /<script defer src="\.\.\/\.\.\/js\/meta\.js"><\/script>/);
  for (const js of ['i18n', 'longstay-config', 'longstay-page']) {
    assert.match(skeleton, new RegExp('<script src="\\.\\./\\.\\./js/' + js + '\\.js" defer></script>'), js);
  }
});

test('K5: die Felder im Skelett tragen Tag und Attribute des Kontrakts', () => {
  for (const [id, spec] of Object.entries(dom.fields)) {
    const m = new RegExp('<' + spec.tag + '\\b[^>]*\\bid="' + id + '"[^>]*>').exec(skeleton);
    assert.ok(m, `${id} ist kein <${spec.tag}> im Skelett`);
    const tag = m[0];
    for (const [attr, value] of Object.entries(spec.attrs)) {
      if (value === '') assert.match(tag, new RegExp('\\s' + attr + '(\\s|>)'), `${id} ohne ${attr}`);
      else assert.ok(tag.includes(attr + '="' + value + '"'), `${id}: ${attr}="${value}" fehlt`);
    }
    for (const opt of spec.options || []) {
      assert.ok(skeleton.includes('<option value="' + opt + '">'), `${id}: Option ${opt} fehlt`);
    }
  }
});

test('K5: Honigtopf, Status, Erfolg, Knopf, Telefon und E-Mail wie im Kontrakt', () => {
  assert.match(skeleton, /<div class="ls-hp" aria-hidden="true">\s*<label for="ls-company-website">/);
  assert.match(skeleton, /<p id="ls-status" class="ls-status" role="status">/);
  assert.match(skeleton, /<div id="ls-success" class="ls-success" hidden>/);
  assert.match(skeleton, /<button type="button" class="btn btn-outline" id="ls-book" hidden/);
  assert.match(skeleton, /<section id="wohnen-auf-zeit" class="section section-alt ls-section">/);
  assert.ok(skeleton.includes('href="' + config.PHONE_HREF + '"'));
  assert.ok(skeleton.includes('href="mailto:' + config.EMAIL + '"'));
  assert.ok(skeleton.includes('href="#' + dom.section + '"'));
});

test('K5: kein Gedankenstrich, kein Monatspreis, kein data-animate im Skelett', () => {
  assert.equal((skeleton.match(/—/g) || []).length, 0);
  assert.doesNotMatch(skeleton, /CHF\s?\d['\d]{3,}/, 'ein Monatspreis darf nicht im HTML stehen (K2)');
  assert.doesNotMatch(skeleton, /data-animate/);
});

// ---- Harness: Angebots-Fixture -------------------------------------------

test('Harness: offers-gbal-30.json hat 30 Naechte, GBAL, eine Person und fuenf Angebote', () => {
  assert.equal(offers.property, 'GBAL');
  assert.equal(offers.nights, 30);
  assert.equal(offers.adults, 1);
  const tage = (new Date(offers.departure) - new Date(offers.arrival)) / 86400000;
  assert.equal(tage, 30);
  assert.equal(offers.offers.length, 5);
});

test('Harness: jedes Angebot traegt Ratenplan, Einheit, Betraege und Verfuegbarkeit, nichts Persoenliches', () => {
  const namen = new Set();
  for (const o of offers.offers) {
    assert.deepEqual(Object.keys(o).sort(), [...OFFER_KEYS].sort());
    assert.match(o.ratePlanCode, /^[A-Z0-9_-]{1,32}$/);
    assert.equal(typeof o.unitGroupName, 'string');
    assert.ok(o.unitGroupName.length > 0);
    assert.ok(Number.isInteger(o.availableUnits) && o.availableUnits >= 1);
    for (const feld of ['totalGrossAmount', 'averagePerNight']) {
      assert.equal(o[feld].currency, 'CHF');
      assert.ok(typeof o[feld].amount === 'number' && o[feld].amount > 0, `${feld} ist kein Betrag`);
    }
    assert.ok(['Non-Refundable', 'Refundable'].includes(o.category), `Bedingung ${o.category}`);
    namen.add(o.unitGroupName);
  }
  assert.equal(namen.size, 5, 'fuenf verschiedene Einheitengruppen');
  for (const key of allKeys(offers)) {
    assert.doesNotMatch(key, PII_KEY, `Schluessel ${key} sieht nach Personendaten aus`);
  }
});

test('Harness: das billigste Angebot ist eindeutig (pickOffer waehlt deterministisch)', () => {
  const betraege = offers.offers.map((o) => o.totalGrossAmount.amount);
  const min = Math.min(...betraege);
  assert.equal(betraege.filter((b) => b === min).length, 1);
});

// ---- K5: Gegenprobe an Seite, Sprachdateien und Skript, sobald sie existieren

test('K5: jede ID kommt in zurich/index.html genau einmal vor', { skip: skipPage }, () => {
  const html = readFileSync(pageFile, 'utf8');
  for (const id of dom.ids) {
    assert.equal(countId(html, id), 1, `ID ${id} kommt ${countId(html, id)} mal vor`);
  }
});

test('K5: jeder data-i18n-Schluessel longstay.* der Seite steht im Fixture und in de.json und en.json',
  { skip: skipPage }, () => {
    const html = readFileSync(pageFile, 'utf8');
    const used = [...new Set([...html.matchAll(/data-i18n="(longstay\.[^"]+)"/g)].map((m) => m[1]))];
    assert.ok(used.length > 0, 'kein longstay.*-Schluessel auf der Seite');
    const de = JSON.parse(readFileSync(join(root, 'locales', 'de.json'), 'utf8'));
    const en = JSON.parse(readFileSync(join(root, 'locales', 'en.json'), 'utf8'));
    for (const key of used) {
      assert.ok(dom.i18n_keys.includes(key), `${key} steht nicht im Fixture`);
      assert.equal(typeof nested(de, key), 'string', `${key} fehlt in de.json`);
      assert.equal(typeof nested(en, key), 'string', `${key} fehlt in en.json`);
    }
    for (const key of dom.i18n_keys) assert.ok(used.includes(key), `${key} wird auf der Seite nicht verwendet`);
  });

test('K5: jedes getElementById-Literal in js/longstay-page.js steht im Fixture', { skip: skipScript }, () => {
  const src = readFileSync(scriptFile, 'utf8');
  const gefunden = [...src.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
  assert.ok(gefunden.length > 0, 'keine getElementById-Aufrufe gefunden');
  for (const id of new Set(gefunden)) {
    assert.ok(dom.ids.includes(id), `js/longstay-page.js greift auf unbekannte ID ${id} zu`);
  }
});
