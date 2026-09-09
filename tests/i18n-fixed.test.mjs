/**
 * Fester Sprachmodus in js/i18n.js (Segment 0, Kontrakt K6).
 *
 * Laedt js/i18n.js in einem node:vm-Kontext mit einem minimalen document,
 * einem XMLHttpRequest-Ersatz, der locales/<lang>.json von der Platte liest,
 * einem localStorage, der nur mitschreibt, und navigator.language de-CH.
 *
 * Beide Zustaende werden geprueft: mit data-i18n-fixed gilt das lang-Attribut
 * der Seite, nichts wird aus ?lang=, Speicher oder Browser gelesen, nichts
 * geschrieben, lang und Titel bleiben stehen. Ohne das Attribut bleibt das
 * bisherige Verhalten (?lang= vor Speicher vor Browsersprache, Titel aus
 * meta.title der Sprachdatei, lang wird gesetzt).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = readFileSync(join(root, 'js', 'i18n.js'), 'utf8');
const locale = (lang) => JSON.parse(readFileSync(join(root, 'locales', lang + '.json'), 'utf8'));

// Fenster und Dokument, so viel wie i18n.js beim Laden anfasst: kein
// Script-Tag (basePath bleibt leer), keine [data-i18n]-Elemente, kein
// #langSelector, readyState complete, also laeuft init sofort.
function boot({ lang = 'en', fixed = false, stored = null, search = '', title = 'Seitentitel' } = {}) {
  const calls = { setItem: [], getItem: [], setAttribute: [], getElementById: [] };
  const attrs = { lang };
  if (fixed) attrs['data-i18n-fixed'] = '';
  const documentElement = {
    getAttribute: (name) => (Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null),
    setAttribute: (name, value) => { calls.setAttribute.push([name, value]); attrs[name] = value; }
  };
  const document = {
    documentElement,
    title,
    readyState: 'complete',
    addEventListener() {},
    dispatchEvent() {},
    querySelectorAll: () => [],
    querySelector: () => null,
    getElementById: (id) => { calls.getElementById.push(id); return null; },
    body: { classList: { add() {} } },
    head: { appendChild() {} },
    createElement: () => ({})
  };
  const localStorage = {
    getItem(key) { calls.getItem.push(key); return key === 'amanthos_lang' ? stored : null; },
    setItem(key, value) { calls.setItem.push([key, value]); },
    removeItem() {}
  };
  function XMLHttpRequest() { this.readyState = 0; this.status = 0; this.responseText = ''; }
  XMLHttpRequest.prototype.open = function (method, url) { this.url = url; };
  XMLHttpRequest.prototype.send = function () {
    const file = join(root, this.url);
    this.readyState = 4;
    if (existsSync(file)) {
      this.status = 200;
      this.responseText = readFileSync(file, 'utf8');
    } else {
      this.status = 404;
    }
    if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
  };
  const window = {
    location: { search },
    navigator: { language: 'de-CH' },
    document, localStorage, XMLHttpRequest, URLSearchParams
  };
  window.window = window;
  vm.runInContext(src, vm.createContext(window), { filename: 'js/i18n.js' });
  return { window, document, attrs, calls };
}

// ---- Mit data-i18n-fixed --------------------------------------------------

test('K6 fest: lang="fr" gilt, obwohl ?lang=de, Speicher de und Browser de-CH etwas anderes sagen', () => {
  const { window, document, attrs, calls } = boot({
    lang: 'fr', fixed: true, stored: 'de', search: '?lang=de', title: 'Appartements meublés à Nyon'
  });
  assert.equal(window.getLang(), 'fr');
  assert.equal(window.t('booking.select'), locale('fr').booking.select);
  assert.equal(attrs.lang, 'fr');
  assert.equal(document.title, 'Appartements meublés à Nyon');
  assert.deepEqual(calls.setAttribute, [], 'lang darf nicht gesetzt werden');
  assert.deepEqual(calls.setItem, [], 'localStorage darf nicht beschrieben werden');
  assert.deepEqual(calls.getItem, [], 'localStorage darf nicht gelesen werden');
});

test('K6 fest: die Sprache wird ohne Speicherzugriff bestimmt, auch bei leerem Speicher und ohne ?lang=', () => {
  const { window, calls } = boot({ lang: 'fr', fixed: true });
  assert.equal(window.getLang(), 'fr');
  assert.deepEqual(calls.getItem, []);
  assert.deepEqual(calls.setItem, []);
});

test('K6 fest: eine unbekannte Seitensprache faellt auf en zurueck', () => {
  const { window, attrs, calls } = boot({ lang: 'xx', fixed: true, stored: 'de' });
  assert.equal(window.getLang(), 'en');
  assert.equal(window.t('booking.select'), locale('en').booking.select);
  assert.equal(attrs.lang, 'xx', 'auch dann bleibt das Attribut stehen');
  assert.deepEqual(calls.setAttribute, []);
});

test('K6 fest: eine regionale Seitensprache wie de-CH wird auf zwei Zeichen gekuerzt', () => {
  const { window } = boot({ lang: 'de-CH', fixed: true });
  assert.equal(window.getLang(), 'de');
  assert.equal(window.t('booking.select'), locale('de').booking.select);
});

test('K6 fest: kein Sprachumschalter wird gesucht oder gebaut', () => {
  const { calls } = boot({ lang: 'fr', fixed: true });
  assert.ok(!calls.getElementById.includes('langSelector'));
});

test('K6 fest: t faellt auf Englisch und dann auf den Schluessel zurueck', () => {
  const { window } = boot({ lang: 'fr', fixed: true });
  assert.equal(window.t('nicht.vorhanden'), 'nicht.vorhanden');
  assert.equal(window.t('booking.select', {}), locale('fr').booking.select);
});

// ---- Ohne Attribut: das bisherige Verhalten --------------------------------

test('K6 ohne Attribut: gespeichertes de gilt, lang wird auf de gesetzt, Titel aus de.json', () => {
  const { window, document, attrs, calls } = boot({ lang: 'en', stored: 'de' });
  assert.equal(window.getLang(), 'de');
  assert.equal(attrs.lang, 'de');
  assert.ok(calls.setAttribute.some(([n, v]) => n === 'lang' && v === 'de'));
  assert.equal(document.title, locale('de').meta.title);
  assert.ok(calls.getItem.includes('amanthos_lang'));
  assert.ok(calls.getElementById.includes('langSelector'));
});

test('K6 ohne Attribut: ?lang=de schlaegt den Speicher und wird gespeichert', () => {
  const { window, document, calls } = boot({ lang: 'en', stored: 'fr', search: '?lang=de' });
  assert.equal(window.getLang(), 'de');
  assert.deepEqual(calls.setItem, [['amanthos_lang', 'de']]);
  assert.equal(document.title, locale('de').meta.title);
});

test('K6 ohne Attribut: ohne Speicher und ohne ?lang= zaehlt die Browsersprache de-CH', () => {
  const { window, attrs } = boot({ lang: 'en' });
  assert.equal(window.getLang(), 'de');
  assert.equal(attrs.lang, 'de');
});

test('K6 ohne Attribut: ein unbekanntes ?lang= faellt auf en, Titel aus en.json', () => {
  const { window, document } = boot({ lang: 'en', stored: 'de', search: '?lang=zz' });
  assert.equal(window.getLang(), 'en');
  assert.equal(document.title, locale('en').meta.title);
});

// ---- In beiden Modi ---------------------------------------------------------

test('K6: t, getLang und amLangs stehen in beiden Modi bereit, amLangs kennt sieben Sprachen', () => {
  for (const fixed of [true, false]) {
    const { window } = boot({ lang: 'de', fixed });
    assert.equal(typeof window.t, 'function');
    assert.equal(typeof window.getLang, 'function');
    // Array.from: das Array stammt aus dem vm-Kontext und hat einen fremden Prototyp.
    assert.deepEqual(Array.from(window.amLangs), ['en', 'de', 'fr', 'it', 'zh', 'ja', 'ko']);
  }
});
