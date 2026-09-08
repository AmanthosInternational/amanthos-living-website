/**
 * Tests der reinen Helfer aus js/grenchen-page.js (Segment 3, Kontrakt K3).
 *
 * Ohne DOM: die Datei exportiert genau die Funktionen, die den Payload, die
 * Kampagne, die Referenz, den Wunschtermin und die Statustexte erzeugen. Die
 * DOM-Strecke (Karten, Formular, Ereignisse) wird im Harness im Browser
 * geprueft, nicht hier.
 *
 * Alle Werte sind synthetisch (Testperson, test-lead@example.com).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const scriptFile = join(here, '..', 'js', 'grenchen-page.js');
const page = require(scriptFile);
const config = require(join(here, '..', 'js', 'grenchen-config.js'));
const src = readFileSync(scriptFile, 'utf8');

const K3_KEYS = [
  'form', 'name', 'email', 'phone', 'unit', 'rooms', 'budget', 'move_in', 'wish_slot',
  'message', 'event_id', 'utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid',
  'company_website'
];

const VOLL = {
  name: '  Testperson  ',
  email: 'test-lead@example.com',
  phone: '+41 79 123 45 67',
  unit: '43',
  rooms: '2',
  budget: '1120',
  moveIn: '2026-11',
  wishSlot: 'Dienstag 15.09.2026, 15 bis 18 Uhr',
  message: 'Ich moechte die Wohnung besichtigen.',
  eventId: 'abcd-1234-efgh-5678',
  campaign: { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'grenchen-mieten' },
  gclid: 'Cj0KTEST', fbclid: 'IwARTEST', companyWebsite: ''
};

// ---- Modulform ------------------------------------------------------------

test('das Modul exportiert die reinen Helfer und laeuft ohne DOM', () => {
  assert.equal(page.VERSION, '1');
  for (const fn of ['buildPayload', 'readCampaign', 'newEventId', 'composeWishSlot',
    'isWeekday', 'statusText', 'needsContact']) {
    assert.equal(typeof page[fn], 'function', `${fn} fehlt im Export`);
  }
  assert.equal(typeof globalThis.document, 'undefined');
});

// ---- K3: buildPayload -----------------------------------------------------

test('K3: buildPayload liefert genau die 17 Schluessel des Kontrakts', () => {
  const payload = page.buildPayload(VOLL);
  assert.deepEqual(Object.keys(payload).sort(), [...K3_KEYS].sort());
  assert.equal(Object.keys(payload).length, 17);
});

test('K3: buildPayload uebernimmt die Werte getrimmt und setzt form auf grenchen', () => {
  const payload = page.buildPayload(VOLL);
  assert.equal(payload.form, 'grenchen');
  assert.equal(payload.name, 'Testperson');
  assert.equal(payload.email, 'test-lead@example.com');
  assert.equal(payload.unit, '43');
  assert.equal(payload.rooms, '2');
  assert.equal(payload.budget, '1120');
  assert.equal(payload.move_in, '2026-11');
  assert.equal(payload.wish_slot, 'Dienstag 15.09.2026, 15 bis 18 Uhr');
  assert.equal(payload.event_id, 'abcd-1234-efgh-5678');
  assert.equal(payload.utm_campaign, 'grenchen-mieten');
  assert.equal(payload.gclid, 'Cj0KTEST');
  assert.equal(payload.fbclid, 'IwARTEST');
  assert.equal(payload.company_website, '');
});

test('K3: ohne Eingaben sind alle 17 Schluessel da und leer, ausser form', () => {
  const payload = page.buildPayload();
  assert.deepEqual(Object.keys(payload).sort(), [...K3_KEYS].sort());
  for (const key of K3_KEYS) {
    assert.equal(typeof payload[key], 'string', `${key} ist kein String`);
    if (key !== 'form') { assert.equal(payload[key], '', `${key} ist nicht leer`); }
  }
  assert.equal(payload.form, 'grenchen');
});

test('K3: was das Muster nicht trifft, wird leer statt falsch gesendet', () => {
  const payload = page.buildPayload({
    unit: '7', rooms: '4', budget: '99', moveIn: '2026-13', event_id: 'x'
  });
  assert.equal(payload.unit, '');
  assert.equal(payload.rooms, '');
  assert.equal(payload.budget, '');
  assert.equal(payload.move_in, '');
});

test('K3: die zulaessigen Zimmerwerte kommen durch, auch die Finder-Wahl 3+', () => {
  for (const rooms of ['1.5', '2', '3', '3.5', '3+']) {
    assert.equal(page.buildPayload({ rooms }).rooms, rooms);
  }
});

test('K3: der Parkplatzwunsch stellt sich der Nachricht voran', () => {
  assert.equal(page.buildPayload({ message: 'Bitte abends.', parking: true }).message,
    'Parkplatz: ja. Bitte abends.');
  assert.equal(page.buildPayload({ message: '', parking: true }).message, 'Parkplatz: ja.');
  assert.equal(page.buildPayload({ message: 'Bitte abends.' }).message, 'Bitte abends.');
});

test('K3: zu lange Werte werden gekuerzt, nicht abgelehnt', () => {
  const payload = page.buildPayload({
    name: 'a'.repeat(300), email: 'b'.repeat(300), phone: '1'.repeat(80),
    wishSlot: 'w'.repeat(200), message: 'm'.repeat(6000), gclid: 'g'.repeat(600)
  });
  assert.equal(payload.name.length, 200);
  assert.equal(payload.email.length, 200);
  assert.equal(payload.phone.length, 40);
  assert.equal(payload.wish_slot.length, 120);
  assert.equal(payload.message.length, 5000);
  assert.equal(payload.gclid.length, 512);
});

test('K3: buildPayload wirft bei keiner Eingabeform', () => {
  for (const input of [null, undefined, {}, { campaign: null }, { name: 42, unit: 43 }]) {
    assert.doesNotThrow(() => page.buildPayload(input));
  }
});

// ---- K3: readCampaign -----------------------------------------------------

test('K3: readCampaign liest die drei UTM-Werte aus der Adresse', () => {
  assert.deepEqual(
    page.readCampaign('?utm_source=google&utm_medium=cpc&utm_campaign=grenchen-mieten'),
    { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'grenchen-mieten' }
  );
});

test('K3: readCampaign verwirft ungueltige Werte einzeln, nicht als Block', () => {
  const campaign = page.readCampaign('?utm_source=meta&utm_medium=paid social&utm_campaign='
    + 'x'.repeat(65));
  assert.equal(campaign.utm_source, 'meta');
  assert.equal(campaign.utm_medium, '', 'Leerzeichen sind nicht erlaubt');
  assert.equal(campaign.utm_campaign, '', 'mehr als 64 Zeichen sind nicht erlaubt');
});

test('K3: readCampaign liefert ohne Parameter drei leere Werte', () => {
  for (const search of ['', '?', undefined, null, '?a=b']) {
    assert.deepEqual(page.readCampaign(search),
      { utm_source: '', utm_medium: '', utm_campaign: '' });
  }
});

test('K3: eine ungueltige Kampagne kommt auch ueber buildPayload nicht durch', () => {
  const payload = page.buildPayload({ campaign: page.readCampaign('?utm_source=<script>') });
  assert.equal(payload.utm_source, '');
});

// ---- K3: newEventId -------------------------------------------------------

test('K3: newEventId passt auf das Muster des Backends und wiederholt sich nicht', () => {
  const ids = new Set();
  for (let i = 0; i < 50; i++) {
    const id = page.newEventId();
    assert.match(id, /^[A-Za-z0-9-]{8,64}$/);
    ids.add(id);
  }
  assert.equal(ids.size, 50);
});

// ---- K3: composeWishSlot und isWeekday ------------------------------------

test('K3: composeWishSlot setzt Wochentag, Datum und Zeitfenster zusammen', () => {
  assert.equal(page.composeWishSlot('2026-09-15', '15 bis 18 Uhr'),
    'Dienstag 15.09.2026, 15 bis 18 Uhr');
  assert.equal(page.composeWishSlot('2026-11-02', '09 bis 12 Uhr'),
    'Montag 02.11.2026, 09 bis 12 Uhr');
});

test('K3: ohne Tag oder ohne Zeit bleibt der Wunschtermin leer', () => {
  assert.equal(page.composeWishSlot('', '15 bis 18 Uhr'), '');
  assert.equal(page.composeWishSlot('2026-09-15', ''), '');
  assert.equal(page.composeWishSlot('15.09.2026', '15 bis 18 Uhr'), '');
  assert.equal(page.composeWishSlot(null, null), '');
});

test('K3: isWeekday lehnt Samstag und Sonntag ab', () => {
  assert.equal(page.isWeekday('2026-09-19'), false, 'Samstag');
  assert.equal(page.isWeekday('2026-09-20'), false, 'Sonntag');
  for (const day of ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18']) {
    assert.equal(page.isWeekday(day), true, day);
  }
});

test('K3: isWeekday wirft bei unbrauchbarer Eingabe nicht, sondern sagt nein', () => {
  for (const value of ['', 'morgen', '2026-13-01', null, undefined, 20260915]) {
    assert.equal(page.isWeekday(value), false);
  }
});

// ---- K3: Statustexte ------------------------------------------------------

test('FR: setLocale(fr) liefert franzoesische Statustexte, danach wieder deutsch', () => {
  try {
    assert.equal(page.setLocale('fr'), 'fr');
    assert.equal(page.locale(), 'fr');
    assert.match(page.statusText(200), /^Merci\./);
    assert.equal(page.statusText(400), "Veuillez vérifier le nom et l'adresse e-mail.");
    assert.match(page.statusText(429), /^Trop de demandes/);
    assert.equal(page.needsContact(429), false);
    const text = page.statusText(500);
    assert.match(text, /^La demande n'a pas pu être envoyée\. Appelez-nous au /);
    assert.ok(text.includes(config.PHONE) && text.includes(config.EMAIL));
    assert.equal(page.needsContact(500), true);
    assert.equal(page.setLocale('it'), 'de', 'unbekannte Sprache faellt auf Deutsch zurueck');
  } finally {
    page.setLocale('de');
  }
  assert.match(page.statusText(200), /^Vielen Dank\./);
});

test('K3: statusText kennt 200, 400 und 429 mit eigenen deutschen Texten', () => {
  assert.match(page.statusText(200), /^Vielen Dank\./);
  assert.equal(page.statusText(400), 'Bitte prüfen Sie Name und E-Mail-Adresse.');
  assert.match(page.statusText(429), /^Zu viele Anfragen in kurzer Zeit\./);
  for (const status of [200, 400, 429]) {
    assert.equal(page.needsContact(status), false);
  }
});

test('K3: 502, 503 und der Netzfehler nennen Telefon und E-Mail', () => {
  const erwartet = 'Die Anfrage konnte nicht gesendet werden. Rufen Sie uns an: '
    + config.PHONE + ', oder schreiben Sie an ' + config.EMAIL + '.';
  for (const status of [502, 503, 0, undefined]) {
    assert.equal(page.statusText(status), erwartet);
    assert.equal(page.needsContact(status), true);
  }
});

// ---- Quelltext-Wache ------------------------------------------------------
//
// Die beiden folgenden Tests haengen an der Verdrahtung, nicht an einer reinen
// Funktion: Wer die Einwilligungspruefung vor fbq oder vor der Ads-Conversion
// entfernt, macht sie rot. Ohne sie waere unbewiesen, dass die Pruefung im
// Auslieferungszustand ueberhaupt an der richtigen Stelle steht.

test('das Seitenskript speichert nichts und protokolliert nichts', () => {
  // Gesucht ist der Zugriff, nicht das Wort: im Kopfkommentar steht, dass es
  // keinen gibt, und genau das soll der Test nicht als Verstoss lesen.
  for (const zugriff of [/\blocalStorage\s*[.[]/, /\bsessionStorage\s*[.[]/,
    /document\s*\.\s*cookie/, /\bconsole\s*\./]) {
    assert.doesNotMatch(src, zugriff);
  }
});

test('K4: Ads-Conversion und Meta-Lead haengen an der Einwilligungspruefung', () => {
  assert.ok(!/AW-\d/.test(src), 'die Ads-Kennung gehoert nach js/grenchen-config.js');
  const block = src.slice(src.indexOf('function leadEvents'), src.indexOf('function clickIds'));
  assert.ok(block.includes("granted() && typeof window.gtag === 'function'"));
  assert.ok(block.includes("granted() && typeof window.fbq === 'function'"));
  // Ausserhalb dieses Blocks kommen weder fbq noch die Conversion vor.
  assert.equal((src.match(/window\.fbq/g) || []).length, (block.match(/window\.fbq/g) || []).length);
  assert.equal((src.match(/'conversion'/g) || []).length, 1);
  assert.equal((src.match(/ADS_SEND_TO/g) || []).length, 1);
});

test('K3: kein Statustext gibt eine Servermeldung oder einen Code weiter', () => {
  for (const status of [200, 400, 429, 502, 503, 0]) {
    const text = page.statusText(status);
    for (const verboten of ['400', '429', '502', '503', 'error', 'Error', 'Unknown', 'SMTP']) {
      assert.ok(!text.includes(verboten), `"${verboten}" steht im Text zu ${status}`);
    }
  }
});
