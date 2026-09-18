/**
 * Kontrakttest fuer die Seite nyon-louer (Kontrakte K1, K2, K5).
 *
 * Prueft die Datendatei, die Konstanten und die Pflichtangaben auf der Seite.
 * Die drei Angaben in "Ehrlichkeit" sind bewusst Testgegenstand: Sie stehen
 * nicht aus Stilgruenden dort, sondern weil ihr Fehlen im Mietrecht ein Mangel
 * waere (keine Kueche, kein Lift) oder weil das Inserat sonst mehr verspricht,
 * als die Convention deckt (Sechsmonatsvertrag).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(import.meta.url);

const units = require(join(root, 'js', 'nyon-units.js'));
const config = require(join(root, 'js', 'nyon-config.js'));
const seite = join(root, 'nyon-louer', 'index.html');

test('K1: genau zwei Kategorien mit zusammen sechs Zimmern', () => {
  assert.equal(units.UNITS.length, 2);
  assert.equal(units.UNITS.reduce((s, u) => s + u.count, 0), 6);
});

test('K1: jede Kategorie traegt Schluessel, Flaeche, Preis und Zimmernummern', () => {
  for (const u of units.UNITS) {
    assert.ok(['classic', 'lakeview'].includes(u.key), `unbekannter Schluessel ${u.key}`);
    assert.ok(u.sqm >= 25 && u.sqm <= 35, `Flaeche ausserhalb des Bestands: ${u.sqm}`);
    assert.equal(u.rooms.length, u.count, `Zimmerliste passt nicht zu count bei ${u.key}`);
    assert.equal(u.net + u.extra, u.gross, `Preis inkonsistent bei ${u.key}`);
  }
});

test('K1: kein Preis unter der Vollkostenschwelle von 1170', () => {
  // Herleitung in amanthos-standortabgabe/docs/research/nyon-langzeitmiete-2026-09-17.md:
  // Break-even 1147 ohne, rund 1170 mit dem verbleibenden Personalaufwand.
  for (const u of units.UNITS) {
    assert.ok(u.gross >= 1170, `${u.key} liegt mit ${u.gross} unter der Schwelle`);
  }
});

test('K1: Erstvertrag nie laenger als sechs Monate', () => {
  // Convention Art. 1.4 sichert Aufenthalte von einem Tag bis sechs Monaten zu.
  for (const u of units.UNITS) {
    assert.equal(u.minMonths, 6, `${u.key} weicht von der Vertragsdauer ab`);
  }
});

test('K2: Konstanten vollstaendig und Formularart gesetzt', () => {
  assert.equal(config.FORM_KIND, 'nyon');
  assert.equal(config.CONTACT_PATH, '/api/contact');
  assert.ok(config.API_BASE.startsWith('https://'), 'API_BASE muss https sein');
  assert.ok(config.PAGE_URL.endsWith('/nyon-louer/'));
  assert.ok(config.EMAIL.includes('@'));
});

test('K2: ADS_SEND_TO gehoert zum eigenen Ads-Konto oder ist leer', () => {
  // Bis zum 18.09.2026 musste dieser Wert leer sein, weil es keine
  // Nyon-Conversion-Aktion gab; ein gesetzter, aber falscher Wert misst ins
  // Leere, und genau so verlor Bad Wiessee 54 EUR fuer 46 Klicks ohne eine
  // einzige gezaehlte Conversion. Seit die Aktion 7777087800 existiert, darf
  // der Wert gesetzt sein, aber nur auf das eigene Konto: Leer bleibt erlaubt
  // (Aktion geloescht), eine fremde Konto-ID ist es nicht.
  if (config.ADS_SEND_TO === '') { return; }
  assert.match(config.ADS_SEND_TO, /^AW-702540316\/[A-Za-z0-9_-]+$/,
    'send_to zeigt nicht auf das eigene Konto AW-702540316');
  assert.equal(config.ADS_SEND_TO.split('/')[0], config.ADS_ID,
    'send_to und ADS_ID muessen dasselbe Konto nennen');
});

test('K5: die Seite existiert und nennt beide Preise', () => {
  assert.ok(existsSync(seite), 'nyon-louer/index.html fehlt');
  const html = readFileSync(seite, 'utf8');
  for (const u of units.UNITS) {
    assert.ok(html.includes(String(u.gross)), `Preis ${u.gross} fehlt auf der Seite`);
  }
});

test('K5: Ehrlichkeit, die drei Pflichtangaben stehen sichtbar auf der Seite', () => {
  const html = readFileSync(seite, 'utf8');
  assert.match(html, /ne disposent pas de cuisine|pas de cuisine/i, 'fehlender Hinweis auf die fehlende Kueche');
  assert.match(html, /Pas d'ascenseur|pas d'ascenseur/i, 'fehlender Hinweis auf den fehlenden Lift');
  assert.match(html, /contrat de 6 mois/i, 'fehlende Angabe der Vertragsdauer');
});

test('K5: die Seite bindet genau die drei Nyon-Skripte ein, keinen Finder', () => {
  const html = readFileSync(seite, 'utf8');
  for (const datei of ['nyon-config.js', 'nyon-units.js', 'nyon-page.js']) {
    assert.ok(html.includes(datei), `${datei} nicht eingebunden`);
  }
  assert.ok(!html.includes('finder.js'), 'der Wohnungsfinder gehoert nicht auf diese Seite');
});

test('K3: der Payload traegt form=nyon und locale=fr', () => {
  const page = require(join(root, 'js', 'nyon-page.js'));
  const p = page.buildPayload({ name: 'Test', email: 'a@b.ch', unit: 'classic' });
  assert.equal(p.form, 'nyon');
  assert.equal(p.locale, 'fr');
  assert.equal(p.unit, 'classic');
});

test('K3: eine unbekannte Kategorie wird verworfen statt weitergereicht', () => {
  const page = require(join(root, 'js', 'nyon-page.js'));
  assert.equal(page.buildPayload({ unit: 'penthouse' }).unit, '');
  assert.equal(page.buildPayload({ unit: 'lakeview' }).unit, 'lakeview');
});

test('K3: ein unbrauchbarer UTM-Wert kostet nur sich selbst', () => {
  const page = require(join(root, 'js', 'nyon-page.js'));
  const c = page.readCampaign('?utm_source=google&utm_medium=<script>&utm_campaign=nyon');
  assert.equal(c.utm_source, 'google');
  assert.equal(c.utm_medium, '');
  assert.equal(c.utm_campaign, 'nyon');
});

test('K5: franzoesische Typografie, geschuetztes Leerzeichen vor Doppelpunkt und Fragezeichen', () => {
  // Gleiche Regel wie in tests/nyon-fr.test.mjs fuer die Kurzzeitseite. Ein
  // gewoehnliches Leerzeichen vor : oder ? ist im Franzoesischen ein Satzfehler.
  const html = readFileSync(seite, 'utf8');
  const sichtbar = html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  const treffer = [...sichtbar.matchAll(/\S.{0,25}[ ][:?]/g)].map((m) => m[0].trim());
  assert.deepEqual(treffer, [], 'gewoehnliches Leerzeichen vor : oder ? gefunden');
  assert.ok(html.includes('&nbsp;:'), 'Gegenprobe: das nbsp steht wirklich in der Datei');
});
