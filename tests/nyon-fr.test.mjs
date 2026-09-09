/**
 * Segment 3: franzoesische Nyon-Seite appartements-nyon/index.html (Kontrakt K8).
 *
 * Statische Pruefungen der Datei gegen ihre Schwester nyon/index.html und gegen
 * locales/fr.json. Jeder Punkt des Auftrags hat einen eigenen Test, damit ein
 * roter Lauf sagt, welche Zusage gebrochen ist, und nicht nur "die Seite stimmt
 * nicht". Browserbelege (Harness, axe, Lighthouse) stehen im PR, nicht hier.
 *
 * Entscheid 5 des Inhabers vom 09.09.2026 hebt das Verbot aus K8 auf: die Seite
 * DARF "sejours a la semaine et au mois" behaupten. Der Test verlangt den Satz
 * deshalb, statt ihn zu verbieten.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const page = readFileSync(join(root, 'appartements-nyon', 'index.html'), 'utf8');
const sister = readFileSync(join(root, 'nyon', 'index.html'), 'utf8');
const fr = JSON.parse(readFileSync(join(root, 'locales', 'fr.json'), 'utf8'));
const en = JSON.parse(readFileSync(join(root, 'locales', 'en.json'), 'utf8'));
const consentSrc = readFileSync(join(root, 'js', 'consent.js'), 'utf8');

const FR_URL = 'https://www.amanthosliving.com/appartements-nyon/';
const EN_URL = 'https://www.amanthosliving.com/nyon/';

const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');
const cspLine = (html) => {
  const line = html.split('\n').find((l) => l.includes('http-equiv="Content-Security-Policy"'));
  assert.ok(line, 'CSP-Zeile fehlt');
  return line;
};
const countId = (html, id) => (html.match(new RegExp('id="' + id + '"', 'g')) || []).length;
const idsOf = (html) => (html.match(/id="[^"]+"/g) || []).map((s) => s.slice(4, -1));
// Sichtbarer Text: Kommentare, script- und style-Bloecke und alle Tags raus.
const visibleText = (html) => html
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ');

// ---- Sprachmodus (K6) -----------------------------------------------------

test('K6: html traegt lang="fr" und data-i18n-fixed', () => {
  const tag = page.slice(page.indexOf('<html'), page.indexOf('>', page.indexOf('<html')) + 1);
  assert.match(tag, /\blang="fr"/);
  assert.match(tag, /\bdata-i18n-fixed\b/);
});

test('K6: kein Sprachumschalter auf der Seite', () => {
  assert.equal(countId(page, 'langSelector'), 0);
  assert.ok(!page.includes('lang-selector'), 'keine Umschalter-Klasse');
});

test('K6: js/i18n.js liest data-i18n-fixed und schreibt dann nichts in localStorage', () => {
  // Gegenprobe zum Verhalten, das der Harness-Beleg im Browser zeigt.
  const i18n = readFileSync(join(root, 'js', 'i18n.js'), 'utf8');
  assert.match(i18n, /getAttribute\('data-i18n-fixed'\)/);
  const fixedBranch = i18n.slice(i18n.indexOf('function detectLanguage'), i18n.indexOf('// 0. URL parameter'));
  assert.ok(!fixedBranch.includes('setItem'), 'fester Zweig schreibt nicht in localStorage');
});

// ---- Kopf: CSP, canonical, hreflang ---------------------------------------

test('K8: die CSP-Meta-Zeile ist byte-identisch mit nyon/index.html', () => {
  assert.equal(cspLine(page), cspLine(sister));
  assert.equal(md5(cspLine(page)), md5(cspLine(sister)));
});

test('K8: die CSP-Meta ist das erste Element im head (Kommentare zaehlen nicht)', () => {
  const head = page.slice(page.indexOf('<head>') + 6);
  const ohneKommentar = head.replace(/<!--[\s\S]*?-->/g, '').trimStart();
  assert.ok(
    ohneKommentar.startsWith('<meta http-equiv="Content-Security-Policy"'),
    'erstes Element im head ist: ' + ohneKommentar.slice(0, 60)
  );
});

test('K8: canonical zeigt auf die franzoesische Seite', () => {
  assert.ok(page.includes('<link rel="canonical" href="' + FR_URL + '">'));
  assert.equal((page.match(/rel="canonical"/g) || []).length, 1);
});

test('K8: hreflang en auf /nyon/, fr auf /appartements-nyon/, x-default auf /nyon/', () => {
  assert.ok(page.includes('<link rel="alternate" hreflang="en" href="' + EN_URL + '">'));
  assert.ok(page.includes('<link rel="alternate" hreflang="fr" href="' + FR_URL + '">'));
  assert.ok(page.includes('<link rel="alternate" hreflang="x-default" href="' + EN_URL + '">'));
  assert.equal((page.match(/rel="alternate"/g) || []).length, 3);
});

test('K8: Titel, Beschreibung und og:locale sind franzoesisch', () => {
  assert.ok(page.includes('<title>Appartements meublés à Nyon avec vue sur le lac Léman | Amanthos Living</title>'));
  assert.ok(page.includes('<meta property="og:locale" content="fr_CH">'));
  const desc = /<meta name="description" content="([^"]+)">/.exec(page);
  assert.ok(desc, 'Meta-Description fehlt');
  assert.match(desc[1], /appartements meublés/i);
});

test('K8: JSON-LD ist gueltig, zeigt auf die FR-Seite und traegt inLanguage fr', () => {
  const raw = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(page);
  assert.ok(raw, 'JSON-LD fehlt');
  const ld = JSON.parse(raw[1]);
  assert.equal(ld['@type'], 'LodgingBusiness');
  assert.equal(ld.url, FR_URL);
  assert.equal(ld.inLanguage, 'fr');
  assert.equal(ld.numberOfRooms, '12');
  assert.equal(ld.aggregateRating.ratingValue, '4.3');
  assert.equal(ld.aggregateRating.reviewCount, '50');
});

// ---- Buchungsmaske: IDs und Skriptreihenfolge ------------------------------

test('K8: bb-location traegt NYAL', () => {
  assert.ok(page.includes('<input type="hidden" id="bb-location" value="NYAL">'));
});

test('K8: jede ID aus nyon/index.html ausser langSelector kommt genau einmal vor', () => {
  const erwartet = idsOf(sister).filter((id) => id !== 'langSelector');
  assert.ok(erwartet.length >= 38, 'Gegenprobe: ' + erwartet.length + ' IDs in nyon/index.html');
  for (const id of erwartet) {
    assert.equal(countId(page, id), 1, 'ID ' + id + ' kommt ' + countId(page, id) + ' mal vor');
  }
});

test('K8: die Seite fuehrt keine unbekannten IDs ausser der Consent-Schaltflaeche', () => {
  const zusatz = idsOf(page).filter((id) => !idsOf(sister).includes(id));
  assert.deepEqual(zusatz, ['consentSettingsBtn']);
});

test('K8: Skripte am Ende des body, alle defer, deeplink.js vor booking.js', () => {
  const reihenfolge = (page.match(/<script src="\.\.\/js\/([a-z0-9-]+)\.js" defer><\/script>/g) || [])
    .map((s) => /js\/([a-z0-9-]+)\.js/.exec(s)[1]);
  assert.deepEqual(reihenfolge.slice(-5), ['i18n', 'app', 'deeplink', 'booking', 'chat']);
  assert.ok(page.indexOf('js/deeplink.js') < page.indexOf('js/booking.js" defer'));
});

test('K8: kein data-animate auf der Seite', () => {
  assert.equal((page.match(/data-animate/g) || []).length, 0);
});

// ---- Sprachdatei fr.json ---------------------------------------------------

const NEUE_BOOKING_KEYS = [
  'flexible', 'checking_payment', 'did_not_pay_cancel', 'keep_checking', 'or_contact',
  'payment_not_confirmed_yet', 'payment_processing_wait'
];

test('K8: die elf neuen Schluessel stehen in fr.json und sind nicht leer', () => {
  const alle = [
    ...NEUE_BOOKING_KEYS.map((k) => ['booking', k]),
    ['booking_bar', 'set_dates'], ['booking_bar', 'search_btn'],
    ['calendar', 'select_checkin'], ['calendar', 'select_checkout']
  ];
  assert.equal(alle.length, 11);
  for (const [ns, k] of alle) {
    assert.equal(typeof fr[ns][k], 'string', ns + '.' + k + ' fehlt');
    assert.ok(fr[ns][k].length > 0, ns + '.' + k + ' ist leer');
  }
  assert.equal(fr.booking_bar.set_dates, 'Choisir les dates');
  assert.equal(fr.booking_bar.search_btn, 'RECHERCHER');
});

test('K8: booking.* in fr.json hat die 75 alten plus die 7 neuen Schluessel', () => {
  assert.equal(Object.keys(fr.booking).length, 82);
  const alt = Object.keys(en.booking);
  assert.equal(alt.length, 75, 'en.json ist die Referenz fuer den alten Bestand');
  for (const k of alt) assert.ok(k in fr.booking, 'bestehender Schluessel booking.' + k + ' fehlt');
  const neu = Object.keys(fr.booking).filter((k) => !alt.includes(k)).sort();
  assert.deepEqual(neu, [...NEUE_BOOKING_KEYS].sort());
});

test('K8: die uebrigen Namensraeume von fr.json bleiben unveraendert', () => {
  const erwartet = [...Object.keys(en), 'booking_bar', 'calendar'].sort();
  assert.deepEqual(Object.keys(fr).sort(), erwartet);
});

test('K8: die Beschriftungen der Maske im HTML stimmen mit fr.json ueberein', () => {
  assert.ok(page.includes('data-i18n="booking_bar.set_dates">' + fr.booking_bar.set_dates + '<'));
  assert.ok(page.includes('data-i18n="booking_bar.search_btn">' + fr.booking_bar.search_btn + '<'));
});

// ---- Aussagen: Faktenblatt K8 und Entscheid 5 ------------------------------

test('K8 plus Entscheid 5: der Satz zu Wochen- und Monatsaufenthalten steht auf der Seite', () => {
  assert.ok(page.includes('Séjours à la semaine et au mois'), 'Entscheid 5 erlaubt und will diesen Satz');
});

test('K8: keine Aussage ausserhalb des Faktenblatts (die ausdruecklich verbotenen Themen)', () => {
  const text = visibleText(page).toLowerCase();
  for (const verboten of ['taxe de séjour', 'petit-déjeuner', 'séjour minimum', 'durée minimale',
    'caution', 'charges comprises', 'domicile', 'contrat de bail']) {
    assert.ok(!text.includes(verboten), 'verbotene Aussage auf der Seite: ' + verboten);
  }
});

test('K8: Preisaussagen nur dès CHF 99 sowie die zwei Kartenpreise und die Maskenbetraege', () => {
  const betraege = [...new Set((page.match(/CHF [0-9][0-9.-]*/g) || []))].sort();
  // 99 = Nyon (Faktenblatt), 109 und 49 = die zwei Kartenpreise der anderen Haeuser,
  // 49-220 = priceRange aus dem JSON-LD von nyon/, 7.50 / 5 / 10 = die Betraege, die
  // js/booking.js fuer die Extras verrechnet, 0 = Startwert des Extras-Zaehlers.
  assert.deepEqual(betraege, ['CHF 0', 'CHF 10', 'CHF 109', 'CHF 49', 'CHF 49-220', 'CHF 5', 'CHF 7.50', 'CHF 99']);
  assert.ok(page.includes('dès CHF 99 la nuit'));
  assert.ok(page.includes('dès CHF 109 la nuit'));
  assert.ok(page.includes('dès CHF 49 la nuit'));
});

test('K8: die drei Extra-Betraege stehen so auch in nyon/index.html und in js/booking.js', () => {
  const booking = readFileSync(join(root, 'js', 'booking.js'), 'utf8');
  for (const [preis, attr] of [['7.50', '7.5'], ['5', '5'], ['10', '10']]) {
    assert.ok(sister.includes('CHF ' + preis + ' / '), 'nyon/ nennt CHF ' + preis);
    assert.ok(page.includes('data-price="' + attr + '"'), 'data-price ' + attr + ' fehlt');
  }
  assert.ok(booking.includes('7.5 * nights'), 'js/booking.js verrechnet CHF 7.50');
});

test('K8: Adresse, Distanzen und Bewertung stehen wie im Faktenblatt', () => {
  const text = visibleText(page);
  for (const fakt of ['Rue du Château 11, 1266 Duillier', 'Note 4,3', '12 appartements',
    '4 km', '30 km', '35 km', '3 km']) {
    assert.ok(text.includes(fakt), 'Fakt fehlt: ' + fakt);
  }
});

// ---- Gaestestimmen (Entscheid 6) -------------------------------------------

test('Entscheid 6: die drei Zitate stehen im englischen Original mit lang="en"', () => {
  const zitate = [...page.matchAll(/<p lang="en"[^>]*>([^<]+)<\/p>/g)].map((m) => m[1]);
  assert.equal(zitate.length, 3);
  for (const z of zitate) {
    assert.ok(sister.includes(z), 'Zitat weicht von nyon/index.html ab: ' + z.slice(0, 40));
  }
});

test('Entscheid 6: keine Namen von Gaesten auf der Seite', () => {
  const text = visibleText(page);
  for (const name of ['Julia S.', 'Marco P.', 'David C.']) {
    assert.ok(!text.includes(name), 'Gastname auf der Seite: ' + name);
  }
});

// ---- Typografie und Einwilligung ------------------------------------------

test('kein Gedankenstrich in der Datei', () => {
  assert.equal((page.match(/—/g) || []).length, 0);
});

test('franzoesische Typografie: geschuetztes Leerzeichen vor Doppelpunkt und Fragezeichen', () => {
  const text = visibleText(page);
  const treffer = [...text.matchAll(/.{0,30}[ ][:?]/g)].map((m) => m[0].trim());
  assert.deepEqual(treffer, [], 'gewoehnliches Leerzeichen vor : oder ? gefunden');
  assert.ok(page.includes('en direct&nbsp;?'), 'Gegenprobe: das nbsp steht wirklich in der Datei');
  assert.ok(page.includes('prestations&nbsp;:'));
});

test('Einwilligungsbanner: consent.js nimmt die Seitensprache und kennt Franzoesisch', () => {
  assert.match(consentSrc, /document\.documentElement\.getAttribute\('lang'\)/);
  assert.match(consentSrc, /fr: \{/);
  assert.ok(page.includes('window.amConsent.open()'), 'Fussleiste oeffnet die Einstellungen');
});

test('die Fussleiste verlinkt Startseite, Datenschutz und Impressum', () => {
  assert.ok(page.includes('<a href="../privacy/" hreflang="en">Confidentialité</a>'));
  assert.ok(page.includes('<a href="../imprint/" hreflang="en">Mentions légales</a>'));
  assert.ok(page.includes('<a href="../nyon/" lang="en" hreflang="en">English</a>'));
});

// ---- Umfang des Segments ---------------------------------------------------

test('Produktivcode: die Seite bleibt unter der Zeilengrenze des Segments', () => {
  const html = page.split('\n').length;
  const json = 16; // neue Zeilen in locales/fr.json laut git diff --numstat
  assert.ok(html + json <= 400, 'Diff waere ' + (html + json) + ' Zeilen');
});
