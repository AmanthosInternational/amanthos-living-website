/**
 * Erweiterte Conversions fuer Google Ads (20.10.2026, Regel KS-23).
 *
 * js/consent.js setzt user_data (Mail und Telefon) nur, wenn die gespeicherte
 * Wahl 'granted' ist, normalisiert Mail (getrimmt, klein) und Telefon (E.164),
 * und die drei Formularskripte rufen das direkt vor dem conversion-Event auf.
 * Der Ads-Tag ist auf jeder Seite mit allow_enhanced_conversions konfiguriert.
 *
 * Alle Werte sind erfunden (example.invalid, Fantasienummern).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const CONSENT_SRC = readFileSync(join(root, 'js', 'consent.js'), 'utf8');

function lade(stored) {
  const store = new Map(stored == null ? [] : [['am_consent_analytics', stored]]);
  const sb = {
    dataLayer: [],
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v) },
    document: {
      readyState: 'complete', cookie: '', body: null,
      documentElement: { getAttribute: () => 'de' },
      getElementById: () => null, addEventListener() {}, dispatchEvent() {}
    },
    location: { hostname: 'localhost' },
    navigator: { language: 'de' },
    CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } }
  };
  sb.window = sb;
  vm.runInNewContext(CONSENT_SRC, sb);
  const userData = () => sb.dataLayer.filter((a) => a[0] === 'set' && a[1] === 'user_data').map((a) => JSON.parse(JSON.stringify(a[2])));
  return { api: sb.amConsent, userData };
}

test('ohne Einwilligung wird nichts gesetzt', () => {
  for (const wahl of [null, 'denied']) {
    const { api, userData } = lade(wahl);
    assert.equal(api.adUserDataGranted(), false);
    assert.equal(api.setAdsUserData('a@example.invalid', '+41 00 000 00 00'), false);
    assert.deepEqual(userData(), []);
  }
});

test('mit Einwilligung: Mail getrimmt und klein, Telefon in E.164', () => {
  const { api, userData } = lade('granted');
  assert.equal(api.adUserDataGranted(), true);
  assert.equal(api.setAdsUserData('  Redacted.Name@Example.INVALID ', '079 000 00 00'), true);
  assert.deepEqual(userData(), [{ email: 'redacted.name@example.invalid', phone_number: '+41790000000' }]);
});

test('Telefonformate: 00-Praefix, (0), Trennzeichen, ungueltig', () => {
  const faelle = [
    ['0041 79 000 00 00', '+41790000000'],
    ['+41 (0)79 000-00-00', '+41790000000'],
    ['+33 6.00.00.00.00', '+33600000000'],
    ['(079) 000/00/00', '+41790000000'],
    ['12345', undefined],
    ['keine', undefined],
    ['', undefined]
  ];
  for (const [ein, aus] of faelle) {
    const { api, userData } = lade('granted');
    api.setAdsUserData('a@example.invalid', ein);
    assert.equal(userData()[0].phone_number, aus, ein);
  }
});

test('ungueltige Mail und fehlendes Telefon setzen nichts', () => {
  const { api, userData } = lade('granted');
  assert.equal(api.setAdsUserData('keine-mail', ''), false);
  assert.equal(api.setAdsUserData(undefined, null), false);
  assert.deepEqual(userData(), []);
});

test('Formularskripte setzen user_data direkt vor dem conversion-Event', () => {
  for (const name of ['grenchen-page', 'nyon-page', 'longstay-page']) {
    const src = readFileSync(join(root, 'js', name + '.js'), 'utf8');
    const set = src.indexOf('window.amConsent.setAdsUserData(payload.email, payload.phone)');
    const conv = src.indexOf("window.gtag('event', 'conversion'");
    assert.ok(set > 0 && conv > set, name);
    assert.ok(src.slice(set, conv).split('\n').length <= 2, `${name}: Aufruf steht unmittelbar davor`);
  }
});

test('jede Seite konfiguriert den Ads-Tag mit allow_enhanced_conversions', () => {
  const seiten = [];
  const lauf = (dir) => {
    for (const e of readdirSync(dir)) {
      if (['.git', '.claude', 'node_modules', 'docs'].includes(e)) continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) lauf(p);
      else if (e.endsWith('.html')) seiten.push(p);
    }
  };
  lauf(root);
  let treffer = 0;
  for (const p of seiten) {
    const html = readFileSync(p, 'utf8');
    if (!html.includes("gtag('config', 'AW-702540316'")) continue;
    treffer += 1;
    assert.ok(html.includes("gtag('config', 'AW-702540316', { allow_enhanced_conversions: true });"), p);
  }
  assert.ok(treffer >= 13, `nur ${treffer} Seiten mit Ads-Tag gefunden`);
});
