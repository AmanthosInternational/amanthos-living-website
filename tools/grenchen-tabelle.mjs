/**
 * Erzeugt die statische Wohnungstabelle der Grenchner Mietseiten aus js/grenchen-units.js.
 *
 * Warum es sie braucht: Der Wohnungsfinder rendert erst im Browser. Im ausgelieferten HTML
 * stand deshalb keine einzige Preisangabe, und auf die Frage „was kostet eine möblierte
 * Wohnung in Grenchen" konnte kein Suchsystem uns zitieren (GEO-Prüfung vom 10.09.2026,
 * Abschnitt 3.1). Die Tabelle ist der maschinenlesbare Anker, der Finder bleibt der Filter
 * darüber.
 *
 * Die Daten stehen weiterhin nur an einer Stelle. Ändert sich eine Wohnung, wird dieses
 * Skript erneut ausgeführt, nicht die Tabelle von Hand angefasst. Ein Test hält beides
 * aneinander fest.
 *
 * Aufruf:
 *   node tools/grenchen-tabelle.mjs           zeigt, was sich ändern würde
 *   node tools/grenchen-tabelle.mjs --live    schreibt die beiden Seiten
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const wurzel = join(hier, '..');
const require = createRequire(import.meta.url);
const { UNITS } = require(join(wurzel, 'js', 'grenchen-units.js'));

const START = '<!-- grenchen-tabelle:anfang, erzeugt von tools/grenchen-tabelle.mjs -->';
const ENDE = '<!-- grenchen-tabelle:ende -->';

const TEXTE = {
  'grenchen-mieten/index.html': {
    lang: 'de',
    titel: 'Wohnungen, Grössen und Mieten',
    hinweis: 'Alle Angaben in Schweizer Franken pro Monat, Stand 10. September 2026. Die '
      + 'Nebenkosten sind in der Bruttomiete enthalten.',
    kopf: ['Wohnung', 'Zimmer', 'Fläche', 'Nettomiete', 'Nebenkosten', 'Bruttomiete', 'Bezug'],
    sofort: 'sofort',
    ab: (d) => `ab ${d}`,
  },
  'grenchen-louer/index.html': {
    lang: 'fr',
    titel: 'Appartements, surfaces et loyers',
    hinweis: 'Tous les montants en francs suisses par mois, état au 10 septembre 2026. Les '
      + 'charges sont comprises dans le loyer brut.',
    kopf: ['Appartement', 'Pièces', 'Surface', 'Loyer net', 'Charges', 'Loyer brut', 'Disponible'],
    sofort: 'de suite',
    ab: (d) => `dès ${d}`,
  },
};

const MONATE = {
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September',
    'Oktober', 'November', 'Dezember'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre',
    'octobre', 'novembre', 'décembre'],
};

function bezug(unit, t) {
  if (!unit.availableFrom) return t.sofort;
  const [jahr, monat] = unit.availableFrom.split('-');
  return t.ab(`${MONATE[t.lang][Number(monat) - 1]} ${jahr}`);
}

function zahl(wert, lang) {
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-CH' : 'de-CH').format(wert);
}

export function tabelle(rel) {
  const t = TEXTE[rel];
  const zeilen = UNITS.filter((u) => u.listed)
    .sort((a, b) => Number(a.nr) - Number(b.nr))
    .map((u) => '        <tr>'
      + `<td>${u.nr}</td>`
      + `<td>${String(u.rooms).replace('.', t.lang === 'fr' ? ',' : '.')}</td>`
      + `<td>${String(u.sqm).replace('.', t.lang === 'fr' ? ',' : '.')} m²</td>`
      + `<td>CHF ${zahl(u.net, t.lang)}</td>`
      + `<td>CHF ${zahl(u.extra, t.lang)}</td>`
      + `<td>CHF ${zahl(u.gross, t.lang)}</td>`
      + `<td>${bezug(u, t)}</td>`
      + '</tr>')
    .join('\n');
  return [
    START,
    '  <section class="section" id="wohnungen-tabelle">',
    '    <div class="container">',
    `      <h2 class="section-title">${t.titel}</h2>`,
    `      <p>${t.hinweis}</p>`,
    '      <div class="tabelle-rahmen" style="overflow-x:auto;">',
    '        <table class="wohnungen-tabelle">',
    '          <thead><tr>' + t.kopf.map((k) => `<th>${k}</th>`).join('') + '</tr></thead>',
    '          <tbody>',
    zeilen,
    '          </tbody>',
    '        </table>',
    '      </div>',
    '    </div>',
    '  </section>',
    angebot(t),
    ENDE,
  ].join('\n');
}

/**
 * Der Angebotsbereich als JSON-LD, aus denselben Daten wie die Tabelle. Ein eigener Block,
 * damit der handgepflegte ApartmentComplex unberuehrt bleibt und der Erzeuger seinen
 * eigenen Teil jederzeit ersetzen kann.
 */
function angebot(t) {
  const gelistet = UNITS.filter((u) => u.listed);
  const preise = gelistet.map((u) => u.gross);
  const flaechen = gelistet.map((u) => u.sqm);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    name: t.titel,
    url: `https://www.amanthosliving.com/${t.lang === 'fr' ? 'grenchen-louer' : 'grenchen-mieten'}/`,
    availability: 'https://schema.org/InStock',
    inventoryLevel: { '@type': 'QuantitativeValue', value: gelistet.length },
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      priceCurrency: 'CHF',
      minPrice: Math.min(...preise),
      maxPrice: Math.max(...preise),
      unitCode: 'MON',
      description: t.lang === 'fr'
        ? 'Loyer brut par mois, charges comprises'
        : 'Bruttomiete pro Monat, Nebenkosten inbegriffen',
    },
    itemOffered: {
      '@type': 'ApartmentComplex',
      name: 'Amanthos Living Grenchen',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Bettlachstrasse 20',
        postalCode: '2540',
        addressLocality: 'Grenchen',
        addressCountry: 'CH',
      },
      numberOfAccommodationUnits: UNITS.length,
      numberOfAvailableAccommodationUnits: gelistet.length,
      floorSize: {
        '@type': 'QuantitativeValue',
        minValue: Math.min(...flaechen),
        maxValue: Math.max(...flaechen),
        unitCode: 'MTK',
      },
    },
  };
  return '  <script type="application/ld+json">\n  '
    + JSON.stringify(schema, null, 2).replace(/\n/g, '\n  ')
    + '\n  </script>';
}

function ersetzen(rel, neu) {
  const pfad = join(wurzel, rel);
  const html = readFileSync(pfad, 'utf8');
  const i = html.indexOf(START);
  const j = html.indexOf(ENDE);
  if (i >= 0 && j > i) {
    const alt = html.slice(i, j + ENDE.length);
    return { pfad, html: html.slice(0, i) + neu + html.slice(j + ENDE.length), geaendert: alt !== neu };
  }
  // Erster Einbau: vor den Abschnitt mit den Fragen, damit die Tabelle im Lesefluss
  // vor den Antworten steht.
  const anker = '  <section class="section" id="faq">';
  if (!html.includes(anker)) throw new Error(`${rel}: Anker fuer den ersten Einbau fehlt`);
  return { pfad, html: html.replace(anker, `${neu}\n\n${anker}`), geaendert: true };
}

const live = process.argv.includes('--live');
for (const rel of Object.keys(TEXTE)) {
  const { pfad, html, geaendert } = ersetzen(rel, tabelle(rel));
  const anzahl = UNITS.filter((u) => u.listed).length;
  if (!geaendert) {
    console.log(`${rel}: Tabelle ist aktuell (${anzahl} Wohnungen)`);
    continue;
  }
  if (live) {
    writeFileSync(pfad, html, 'utf8');
    console.log(`${rel}: Tabelle mit ${anzahl} Wohnungen geschrieben`);
  } else {
    console.log(`${rel}: Tabelle mit ${anzahl} Wohnungen wuerde geschrieben`);
  }
}
