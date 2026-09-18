---
plankey: nyon-louer
status: draft
datum: 2026-09-18
klasse: FL-2 (zwei Module, rund 700 Zeilen Produktivcode, eigener Kontrakt K1/K2)
vorbild: grenchen-mieten (Bauplan vom 07.09.2026), französische Fassung grenchen-louer
---

# Kurzplan: Landingpage nyon-louer

## Produktivitätsfrage, beantwortet

Der billigste Weg ist die Kopie von `grenchen-louer`, nicht ein Neubau: Seitenstruktur,
Formular-Backend (`_handle_contact`), Lead-Weiterleitung und Testgerüst existieren dort bereits.
Neu sind nur Inhalt, zwei Preise und eine Formularart. Der Bau ist auch nicht der Engpass: Die
beiden Portal-Inserate laufen ab dem 18.09. und messen zum Nulltarif, ob überhaupt Nachfrage
besteht. Die Seite wird gebraucht, sobald Google-Anzeigen laufen sollen, denn die heutige Seite
`/appartements-nyon/` bewirbt Nächte ab CHF 99 und hat in neun Tagen 95 Klicks ohne eine einzige
Conversion aufgenommen.

## Warum eine eigene Seite und kein Umbau

`/appartements-nyon/` ist vollständig auf Kurzaufenthalt gebaut: "Réservez votre séjour",
"Dès CHF 99 la nuit", Buchungsleiste mit Datumssuche. Beide Angebote auf einer Seite vermischen
die Zielgruppen und machen den Anzeigen-Traffic unmessbar. Die Kurzzeitseite bleibt deshalb
unangetastet.

## Segmentschnitt

Seriell gebaut, ein Branch, keine parallelen Agenten (unter 800 Zeilen, M17).

### Fertig (Commit in diesem Branch)

| Datei | Zeilen | Inhalt |
|---|--:|---|
| `js/nyon-units.js` | 57 | Kontrakt K1: zwei Kategorien (Classic 25 m² zu 1'190, Lakeview 30 m² zu 1'290), Zimmernummern, `minMonths: 6` |
| `js/nyon-config.js` | 44 | Kontrakt K2: API, `FORM_KIND: 'nyon'`, GA4, Ads, Kontakt vertrieb@amanthos.com |

### Offen

**1. Seite `nyon-louer/index.html`** (Vorbild `grenchen-louer/index.html`, 308 Zeilen)

Inhaltliche Pflichtangaben, alle aus dem Research belegt:
- **keine Küche**, dafür Kühlschrank, Wasserkocher, Kaffeemaschine, Restaurant im Haus
- Bus 820, 12 Minuten zum Bahnhof Nyon, Haltestelle Duillier centre communal
- **kein Lift behaupten**, der Widerspruch im Dossier ist ungeklärt
- inbegriffen: Strom, Heizung, Wasser, WLAN, Parkplatz, Wäscherei, Bett- und Frottierwäsche
- **Contrat de 6 mois, prolongation possible**, Wohnsitzanmeldung möglich
- Sprache Französisch (die Suchbegriffe der Region sind französisch)

**2. Seitenskript** (Vorbild `js/grenchen-page.js`, 526 Zeilen)

Entscheidung vor dem Bau: kopieren und anpassen, oder `grenchen-page.js` parametrisieren und
für beide Seiten nutzen. Kopieren ist schneller und lässt Grenchen unberührt, erzeugt aber rund
500 Zeilen Duplikat. Parametrisieren ist sauberer, fasst aber funktionierenden Prod-Code an.
**Empfehlung: kopieren**, solange unklar ist, ob die Seite überhaupt gebraucht wird; zusammenführen,
sobald die Nachfrage belegt ist.

Der Wohnungsfinder (`js/grenchen-finder.js`, 239 Zeilen) wird **nicht** übernommen: Er filtert
23 Wohnungen nach Zimmerzahl, Fläche und Datum. Bei zwei Kategorien genügen zwei Karten.

**3. Backend `form=nyon`** in `amanthos-group-booking`, `website-backend/_handle_contact`
(Vorbild: `form=grenchen`). Empfänger festlegen, heute geht die Portal-Anfrage an
vertrieb@amanthos.com.

**4. Tests** (Vorbild `tests/grenchen-page.test.mjs`, `grenchen-contract.test.mjs`)
- Kontrakttest: `nyon-units.js` liefert zwei Einträge, Summe `count` ist 6, jeder Preis ≥ 1'190
- Seitentest: Pflichtangaben stehen im DOM (keine Küche, Buslinie, Sechsmonatsvertrag)
- Formulartest: Absenden ruft `/api/contact` mit `form=nyon`

**5. Google-Conversion-Aktion** anlegen und `ADS_SEND_TO` in `nyon-config.js` eintragen.
Ohne sie misst jede Anzeige ins Leere, wie bei Bad Wiessee (54 EUR, 46 Klicks, null Conversions,
weil keine Aktion existierte).

## Akzeptanzkriterien

1. `/nyon-louer/` lädt ohne Konsolenfehler und zeigt beide Kategorien mit Preis und Fläche.
2. Die drei Pflichtangaben (keine Küche, Buslinie, Sechsmonatsvertrag) stehen sichtbar auf der Seite.
3. Das Formular sendet `form=nyon` an das Backend und der Empfänger erhält eine Testanfrage.
4. Die Kurzzeitseite `/appartements-nyon/` ist unverändert.
5. Testsuite grün mit zitierter Zahl; Kontrakttest deckt K1 und K2 ab.
6. `ADS_SEND_TO` ist gesetzt, bevor die erste Anzeige läuft.

## Reihenfolge

Seite, dann Seitenskript, dann Backend, dann Tests, dann Conversion-Aktion. Anzeigen erst
danach, so hat Bogdan es am 18.09.2026 festgelegt: erst Landingpage, dann Meta und Google.

## Nicht in diesem Plan

Das Meta-Sofortformular. Es lässt sich nicht per API anlegen (die MCP-Werkzeuge können Formulare
nur auflisten und Leads abrufen) und muss von Hand im Business Manager gebaut werden, mit
`special_ad_categories: ["HOUSING"]`, sonst lehnt Meta wegen Diskriminierung ab.
