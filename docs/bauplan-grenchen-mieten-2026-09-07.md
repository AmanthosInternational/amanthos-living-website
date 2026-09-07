---
thema: grenchen-mieten
datum: 2026-09-07
status: verdrahtet
repo: ~/Projects/amanthos-living-website
plankey: grenchen-mieten
weitere_repos:
  - ~/Projects/amanthos-group-booking (Ordner website-backend, Segmente 4 und 5, Feature-Branches ohne Gate)
grundlage: Exposé Bettlachstrasse 20 vom 03.09.2026 und Apaleo-Belegung Stand 07.09.2026, beides vom Auftraggeber übergeben, in diesem Plan nicht neu gelesen
---

# Bauplan: Landingpage „Wohnung mieten in Grenchen" mit Wohnungsfinder, Formular-Backend und Messung

> **Scharfschalten:** Vor Beginn des Parallelbaus stellt der Inhaber `status:` in dieser Datei auf
> `aktiv`. Solange `draft` steht, sind Edit-Gate, Commit-Gate und PR-Check stumm. Segment-Branches
> im Website-Repo heissen `segment/grenchen-mieten/<nr>-<slug>`; nur dort greifen die Gates. Im
> Backend-Repo laufen die Segmente 4 und 5 auf normalen Feature-Branches (`feature/grenchen-...`),
> dort greift kein Gate (Abschnitt 0a). Jeder Commit in beiden Repos trägt im Body den Block:
>
> ```
> Plan-Abgleich:
>   erledigt: <Abschnitte>
>   offen: <was aussteht>
>   abweichung: <keine | was anders gebaut wurde und warum>
> ```
>
> Bauagenten committen nach jedem Teilschritt, nicht erst am Ende (stirbt ein Agent, ist nur der
> ungeschriebene Rest verloren). Überschreitet ein Segment die 400 Zeilen Produktivcode, hält der
> Agent an und meldet es; er teilt nicht selbst. Testzeilen zählen nicht.

## 1. Ziel und Produktivitätsprüfung

Es entsteht eine deutschsprachige, eigenständige Seite `www.amanthosliving.com/grenchen-mieten/`,
die die 23 möblierten Wohnungen an der Bettlachstrasse 20 als Langzeitwohnungen (ab 12 Monaten,
Wohnsitz anmeldbar) vermietet. Kern der Seite ist ein Wohnungsfinder (Zimmer, Budget brutto,
Einzugsmonat, Parkplatz), der sofort passende Wohnungen als Karten zeigt; ein Klick öffnet die
Besichtigungsanfrage mit vorausgefüllter Wohnung. Die Anfrage geht als JSON an das bestehende
Backend `amanthos-website-api` (Route `/api/contact`, neue Formularart `grenchen`), wird per Mail
zugestellt, und wird als Lead an GA4, Google Ads (nur mit Einwilligung) und Meta (Pixel im Browser
nur mit Einwilligung, Conversions API auf dem Server, beide mit derselben `event_id`) gemeldet.

**Billigster Weg zum Ergebnis.** Eine statische Seite mit dem bestehenden Kontaktformular
(`form: contact`, Empfänger über env) wäre ein einziges Segment und würde Anfragen liefern. Der
Finder und die serverseitige Meta-Meldung sind die bewussten Zusatzkosten der Greif-Mechanik
(„Rechner statt Formular", Entscheid des Inhabers in dieser Session). Der Schnitt unten hält beide
abtrennbar: Segment 1 (Finder-Logik) und Segment 4 (CAPI-Lead) lassen sich weglassen, ohne dass
ein anderes Segment umgebaut werden muss.

**Plattform- oder Lib-Funktion, die den Bau erübrigt.** Geprüft am Repo: `_handle_contact` in
`website-backend/server.py` kennt genau zwei Formulare (`contact`, `newsletter`), nimmt keine
Wohnungsfelder und keinen eigenen Empfängerkreis; `meta_capi.py` kennt nur `send_purchase`. Beides
wird erweitert, nicht neu gebaut; es kommt keine Dependency dazu (Backend stdlib-pur, Website
Vanilla JS ohne Build). Meta-Sofortformulare per API sind nicht möglich (Leadgen-Bedingungen der
Seiten nicht akzeptiert, Auftraggeber 07.09.2026), Google-Lead-Formularerweiterungen liefern keinen
Finder. Flatfox und Homegate laufen parallel weiter und ersetzen die Seite nicht, weil dort weder
Pixel noch Conversion-Messung möglich sind.

**Ist der Bau der Engpass.** Nein. Der Engpass nach dem Bau ist die Antwortzeit auf die Anfrage
und die Terminvergabe. Der grösste Sprung liegt deshalb nicht im Code: `TERMIN_URL` soll auf eine
Selbstbuchungsseite zeigen (Microsoft Bookings ist im M365-Tenant verfügbar, kein Eigenbau), und
für den Empfängerkreis `GRENCHEN_RECIPIENTS` braucht es eine Person, die werktags innert Stunden
antwortet. Beides sind Entscheide des Inhabers (Abschnitt 7), keine Segmente.

## 0. Trennlinie und Randbedingungen (gelten für jeden Schritt)

| Claude darf                                                                                                   | Nur der Inhaber                                                                          |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Code in den Segment-Scopes beider Repos schreiben, Branches pushen                                            | Merge-Freigabe je PR                                                                     |
| Die Seite lokal über den Harness (`tests/dev-server.py`, Mock für `/api/contact`) im Browser prüfen           | `status: aktiv` in dieser Datei setzen                                                   |
| In der Verdrahtung den Render-Deploy prüfen und `GRENCHEN_RECIPIENTS` mit dem vom Inhaber genannten Wert setzen | Den Wert von `GRENCHEN_RECIPIENTS`, `TERMIN_URL` und die eine E2E-Anfrage in Prod freigeben |
| GA4-Echtzeit, Meta-Testereignisse und Render-Logs lesen                                                      | Werbekonten, Kampagnen, Budgets, Branch-Protection                                       |

- **Keine Produktions-Schreibzugriffe** ausser den in Abschnitt 5 genannten Verdrahtungsschritten
  (Render-Env `GRENCHEN_RECIPIENTS`, temporär `META_TEST_EVENT_CODE`). Kein Segment schreibt in
  Apaleo, Supabase, Meta oder Google. Die Belegungsdaten aus Apaleo sind in K1 bereits auf ein
  Feld „verfügbar ab" reduziert; niemand liest Apaleo für diesen Plan neu.
- **Gästedaten und Personendaten:** Kein Segment liest, loggt oder committet Personendaten.
  Test-Fixtures sind synthetisch (`Testperson`, `test-lead@example.com`, `+41 79 123 45 67`).
  Neue Log-Zeilen tragen höchstens Formularart, Wohnungsnummer, Empfängerkreis und die ersten acht
  Zeichen der `event_id`. Wer ein Feld zeigen muss, schreibt `"email": "<redacted>"`. Hat ein
  Agent versehentlich Personendaten committet, meldet er Datei und Zeile, statt still zu
  korrigieren.
- **Öffentliches Repo:** `amanthos-living-website` ist PUBLIC und wird komplett über GitHub Pages
  ausgeliefert, auch `docs/` und `tests/`. Dieser Plan und alles darunter sind öffentlich.
  Deshalb: keine Render-IDs, keine internen Mailadressen ausser den auf der Seite ohnehin
  gezeigten (`info@amanthosliving.com`), keine Belegungsdetails, keine Namen von Gästen. Die
  Nennung des Ansprechpartners auf der Seite ist Inhalt der Seite, nicht Personendaten im Sinne
  dieser Klausel.
- **Nichts behaupten, was nicht in K10 steht.** Insbesondere: keine Aussage, wer den Mietvertrag
  unterschreibt (Amanthos oder die Verwaltung, offen), keine Kaution, keine Kündigungsfrist,
  keine Haustierregel, kein Parkplatzpreis. Unbekanntes heisst auf der Seite „auf Anfrage" oder
  fehlt. Der Anbieter im Impressum bleibt wie auf der Site.
- **Prod-System im Backend-Repo** (Gäste-PII über das Formular): Segmente 4 und 5 sind auf je
  eine Sitzung von höchstens 30 Minuten geschnitten. Mails werden in Tests nie gesendet
  (`smtplib.SMTP` gemockt), CAPI nie gerufen (`_post` gemockt).
- Repo-Konventionen Backend: stdlib-pur, `print()`-Logging, Tests unter `website-backend/tests/`,
  Module über den Dateipfad laden (nicht `import server`, das trifft `backend/server.py`; Muster
  in `tests/test_guest_payment_link.py`), `ruff check` grün. Konventionen Website: Vanilla JS im
  Stil von `js/deeplink.js` (IIFE, `var`, `module.exports` für `node --test`), keine Build-Stufe,
  keine Dependencies, kein `package.json`.
- Kein Gedankenstrich in Texten, Commits, PR-Beschreibungen, Code-Kommentaren. Schweizer
  Orthografie mit ss.

## 0a. Wo die Gates lesen

Geprüft am 07.09.2026 an `~/scripts/bauplan-scope.sh` (identisch mit
`claude-mcp-setup/scripts/bauplan-scope.sh`, `diff -q` leer), `~/scripts/claude-hooks/` (Edit-Gate,
Commit-Gate installiert) und `.github/workflows/plan-abgleich.yml` (liegt in beiden Repos):

- Die Gates suchen von der Repo-Wurzel aus `docs/bauplan-grenchen-mieten-2026-09-07.md` mit
  `status: aktiv`. **Diese Datei liegt nur im Website-Repo.** Im Backend-Repo existiert keine
  Kopie; ein Branch `segment/...` dort fände keinen Plan und liefe fail-open. Deshalb laufen die
  Segmente 4 und 5 bewusst auf `feature/`-Branches: kein Gate, kein falsches Sicherheitsgefühl.
  Was dort schützt, sind die Tests, `ruff`, der Review des Inhabers und der Plan-Abgleich-Block,
  den die Hausregel auch ohne Gate verlangt.
- Pfade in den Scope-Blöcken sind relativ zur Wurzel des jeweiligen Repos. Blöcke der Segmente 4
  und 5 beginnen mit `# repo: amanthos-group-booking`; der Parser ignoriert `#`-Zeilen, und die
  Pfade matchen im Website-Repo nie eine Datei.
- Ob `plan-abgleich` in der Branch-Protection des Website-Repos als Required Check eingetragen
  ist, wurde nicht abgefragt (Abschnitt 9). Der Workflow läuft auf jedem PR und endet grün, wenn
  er nicht zuständig ist.
- Zwei Dateien gehören Segment 0 und werden danach nur noch von der Verdrahtung angefasst:
  `js/grenchen-config.js` (Verdrahtung trägt `TERMIN_URL` ein) und `tests/dev-server.py`. Sie
  stehen nicht im Sammelstellen-Block, weil der Kontrakt „Sammelstellen schlagen Segment-Scope"
  sonst Segment 0 blockierte. Für die Segmente 1 bis 3 sind sie ohnehin ausserhalb des Scopes,
  das Edit-Gate blockt sie.

## 2. Segment 0: Kontrakte (sequenziell, vor allem anderen)

Branch `segment/grenchen-mieten/0-kontrakte` im Website-Repo, ein PR, gemergt und auf `aktiv`
gestellt, bevor ein Segment der Welle 1 abzweigt. Im Backend-Repo gibt es kein Segment 0; die
Kontrakte K3 und K7 sind Text in diesem Plan und für die Segmente 4 und 5 bindend.

**Dateien:**

```bauplan-scope segment=0
# repo: amanthos-living-website
docs/bauplan-grenchen-mieten-2026-09-07.md
js/grenchen-units.js
js/grenchen-config.js
tests/dev-server.py
tests/fixtures/grenchen-dom-contract.json
tests/fixtures/grenchen-skeleton.html
tests/grenchen-contract.test.mjs
images/solothurn/grenchen-*.webp
```

**Inhalt:**

1. `js/grenchen-units.js` nach K1 (die eine Datenquelle für Seite und Tests).
2. `js/grenchen-config.js` nach K2 (Konstanten; `TERMIN_URL` bleibt leer).
3. `tests/fixtures/grenchen-dom-contract.json` nach K5 (IDs, Klassen, Bildliste mit gemessenen
   Massen und Alt-Texten).
4. `tests/fixtures/grenchen-skeleton.html` nach K5: die kleinste Seite, die alle Kontrakt-IDs
   trägt und dieselben Skripte lädt wie die echte Seite. Segment 3 testet dagegen im Browser,
   solange Segment 2 nicht gemergt ist. Trägt `<meta name="robots" content="noindex">`.
5. `tests/grenchen-contract.test.mjs`: prüft K1 (23 Einträge, eindeutige Nummern, netto plus
   Nebenkosten gleich brutto, 22 mit `listed: true`), K2 (Schlüssel vorhanden, `ADS_SEND_TO`
   passt auf `^AW-\d+/[A-Za-z0-9_-]+$`), und, sobald die Dateien existieren, K5: jede ID aus dem
   Fixture kommt in `grenchen-mieten/index.html` genau einmal vor, und jedes
   `getElementById('...')`-Literal in `js/grenchen-page.js` steht im Fixture. Fehlt eine der
   beiden Dateien, wird der jeweilige Teil übersprungen, nicht rot.
6. `tests/dev-server.py` um K8 erweitern (Mock für `/api/contact`, Stubs, Auslieferung der neuen
   Seite und des Skeletts). Bestehende Funktion für `index.html` und `booking.js` unverändert.
7. Sechs Fotos nach K9 konvertieren und ablegen; Masse messen und ins Fixture eintragen.
8. `docs/` existiert bereits (Plan `fbl-ibe`); diese Datei bleibt `draft`, der Inhaber stellt um.

### K1: Wohnungsdaten (`js/grenchen-units.js`)

Quelle: Exposé vom 03.09.2026 (Nummer, Etage, Zimmer, Fläche, Netto, Nebenkosten, Brutto) und
Apaleo-Belegung vom 07.09.2026, reduziert auf „verfügbar ab". Alle Beträge CHF pro Monat.

| nr | OG | Zimmer | m²    | netto | NK  | brutto | availableFrom | availableUntil | flexible | listed |
| -- | -- | ------ | ----- | ----- | --- | ------ | ------------- | -------------- | -------- | ------ |
| 31 | 3  | 1.5    | 43.1  | 720   | 150 | 870    | 2026-11-01    | null           | true     | true   |
| 32 | 3  | 1.5    | 46.6  | 750   | 150 | 900    | 2026-11-01    | null           | true     | true   |
| 33 | 3  | 1.5    | 38.6  | 670   | 150 | 820    | 2026-11-01    | null           | true     | true   |
| 34 | 3  | 2      | 53.6  | 920   | 170 | 1090   | 2027-01-01    | null           | false    | true   |
| 35 | 3  | 2      | 35.6  | 740   | 170 | 910    | 2026-11-01    | null           | true     | true   |
| 36 | 3  | 2      | 28.7  | 670   | 170 | 840    | 2026-11-01    | null           | true     | true   |
| 37 | 3  | 2      | 38.7  | 770   | 170 | 940    | 2026-11-01    | null           | true     | true   |
| 41 | 4  | 2      | 42.0  | 810   | 170 | 980    | 2026-11-01    | null           | true     | true   |
| 42 | 4  | 2      | 40.0  | 790   | 170 | 960    | 2026-11-01    | null           | true     | true   |
| 43 | 4  | 2      | 58.2  | 950   | 170 | 1120   | 2026-11-01    | null           | true     | true   |
| 44 | 4  | 2      | 49.0  | 880   | 170 | 1050   | 2026-11-01    | null           | true     | true   |
| 45 | 4  | 2      | 55.1  | 930   | 170 | 1100   | 2026-11-01    | null           | true     | true   |
| 46 | 4  | 2      | 44.6  | 810   | 170 | 980    | 2026-11-01    | null           | true     | true   |
| 51 | 5  | 2      | 42.0  | 820   | 170 | 990    | 2026-11-01    | null           | true     | true   |
| 52 | 5  | 2      | 41.5  | 800   | 170 | 970    | 2026-11-01    | null           | true     | true   |
| 53 | 5  | 2      | 58.2  | 980   | 170 | 1150   | 2026-11-01    | null           | true     | true   |
| 54 | 5  | 2      | 58.2  | 980   | 170 | 1150   | 2026-11-01    | null           | true     | true   |
| 55 | 5  | 2      | 55.1  | 960   | 170 | 1130   | 2026-11-01    | null           | true     | true   |
| 56 | 5  | 2      | 44.6  | 840   | 170 | 1010   | 2026-10-01    | null           | false    | true   |
| 61 | 6  | 3      | 101.6 | 1400  | 210 | 1610   | 2026-11-01    | 2027-04-30     | false    | false  |
| 62 | 6  | 3.5    | 54.6  | 960   | 170 | 1130   | 2026-11-01    | null           | true     | true   |
| 63 | 6  | 2      | 55.8  | 960   | 170 | 1130   | 2026-11-01    | null           | true     | true   |
| 64 | 6  | 2      | 88.0  | 1200  | 190 | 1390   | 2026-11-01    | null           | false    | true   |

Regeln:

- `flexible: true` heisst „ab 1. November 2026, früher nach Vereinbarung" (Kurzaufenthalte laufen
  bis Mitte Oktober aus). `flexible: false` heisst: das Datum ist hart (34, 56, 64).
- `61` ist nur bis 30.04.2027 frei und passt nicht zu 12 Monaten Mindestmietdauer; deshalb
  `listed: false`. Die Verdrahtung darf das Flag umstellen (Entscheid des Inhabers, Abschnitt 7);
  der Finder zeigt nur `listed: true`. Das Feld `availableUntil` bleibt als Datenfeld erhalten.
- Datei-Form: IIFE, `var UNITS = [...]`, Export `{ UNITS, VERSION: '1' }` als `module.exports`
  und als `window.GRENCHEN_UNITS`, genau wie `js/deeplink.js` exportiert. Feldnamen englisch:
  `nr` (String), `floor`, `rooms`, `sqm`, `net`, `extra`, `gross` (Zahlen), `availableFrom`
  (`YYYY-MM-DD` oder `null`), `availableUntil` (dito), `flexible`, `listed` (Boolean).

### K2: Konstanten (`js/grenchen-config.js`)

```js
var api = {
  API_BASE: (typeof window !== 'undefined' && typeof window.AMANTHOS_API_BASE === 'string')
    ? window.AMANTHOS_API_BASE : 'https://amanthos-website-api.onrender.com',
  CONTACT_PATH: '/api/contact',
  GA4_ID: 'G-8LPLG0BPJ6',
  ADS_ID: 'AW-702540316',
  ADS_SEND_TO: 'AW-702540316/x7S2CMfItfAcEJzU_84C',
  TERMIN_URL: '',
  PAGE_URL: 'https://www.amanthosliving.com/grenchen-mieten/',
  PHONE: '+41 41 562 97 00',
  PHONE_HREF: 'tel:+41415629700',
  EMAIL: 'info@amanthosliving.com',
  VERSION: '1'
};
```

- `ADS_SEND_TO` ist die bereits angelegte Google-Ads-Conversion 7751951431 (Wert vom
  Auftraggeber, 07.09.2026). Aufruf nur bei erteilter Einwilligung (K4).
- `TERMIN_URL` ist leer, bis die Verdrahtung den Wert einträgt; leer heisst, der Link bleibt
  verborgen (`hidden`). Der Wert ist ein Entscheid des Inhabers (Abschnitt 7).
- `API_BASE` prüft bewusst auf `typeof ... === 'string'` statt auf Wahrheitswert: der Harness
  setzt `window.AMANTHOS_API_BASE = ''` (gleiche Origin), und ein leerer String ist falsy. Das
  Muster in `booking.js` (`||`) funktioniert dort nur, weil der Harness die JS-Datei umschreibt.
- Export wie K1: `module.exports` und `window.GRENCHEN_CONFIG`.

### K3: Formular-JSON an `POST /api/contact` (Website und Backend)

Body ist JSON, `Content-Type: application/json`, höchstens 65 KB (bestehende Grenze). Alle Werte
Strings. Die Website sendet immer alle Schlüssel, leer als `""`.

| Schlüssel         | Website sendet                                                                                                   | Backend prüft                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `form`            | `"grenchen"`                                                                                                     | Pflicht, sonst wie bisher `400 Unknown form.`                                                                                     |
| `name`            | Eingabe, getrimmt                                                                                                | Pflicht, nach Trim mindestens 2 Zeichen, sonst `400`; gekürzt auf 200                                                             |
| `email`           | Eingabe, getrimmt                                                                                                | Pflicht, bestehende Regex `^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$`, sonst `400`; gekürzt auf 200; wird `Reply-To`                         |
| `phone`           | Eingabe                                                                                                          | optional, einzeilig, gekürzt auf 40                                                                                               |
| `unit`            | Wohnungsnummer der gewählten Wohnung, z. B. `"43"`, sonst `""`                                                   | `^\d{2}$`, sonst `""`                                                                                                             |
| `rooms`           | Zimmerzahl der gewählten Wohnung (`"1.5"`, `"2"`, `"3"`, `"3.5"`) wenn `unit` gesetzt, sonst Finder-Wahl (`""`, `"1.5"`, `"2"`, `"3+"`) | Menge `{"", "1.5", "2", "3", "3.5", "3+"}`, sonst `""`                                                                            |
| `budget`          | Wert des Schiebereglers als Ganzzahl-String, `""` wenn er auf dem Maximum steht                                  | `^\d{3,5}$`, sonst `""`                                                                                                           |
| `move_in`         | `YYYY-MM` aus dem Formularfeld, sonst `""`                                                                       | `^\d{4}-(0[1-9]\|1[0-2])$`, sonst `""` (kein `400`: ein Formatfehler kostet keinen Lead)                                            |
| `wish_slot`       | Vom Browser zusammengesetzt: `"<Wochentag> <DD.MM.YYYY>, <09 bis 12 Uhr>"`, sonst `""`                            | einzeilig, gekürzt auf 120                                                                                                        |
| `message`         | Freitext; bei Parkplatzwunsch beginnt er mit `"Parkplatz: ja. "`                                                  | gekürzt auf 5000                                                                                                                  |
| `event_id`        | Beim Laden der Seite erzeugt: `crypto.randomUUID()`, Fallback `'g-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)` | `^[A-Za-z0-9-]{8,64}$`, sonst serverseitig `uuid4()` (dann keine Dedup, aber ein Lead)                                            |
| `utm_source`, `utm_medium`, `utm_campaign` | Aus `location.search` der aktuellen Seite gelesen, ohne Einwilligung, nie gespeichert                  | nach Trim `^[A-Za-z0-9._-]{1,64}$`, sonst `""`                                                                                    |
| `gclid`, `fbclid` | Nur aus `window.amMeta.tracking()`, also nur mit Einwilligung; sonst `""`                                        | gekürzt auf 512, nie in der Mail, nie im Log                                                                                      |
| `company_website` | Honigtopf, immer `""` bei Menschen                                                                               | Wie bisher: gefüllt heisst Bot, Antwort `200 {ok:true}` ohne Mail, ohne CAPI                                                      |

Antworten: `200 {"ok": true}` nach zugestellter Mail (synchron, wie bisher); `400` bei Validierung;
`413` Body zu gross; `429` Rate-Limit (`contact`, 3 pro Minute je IP, geteilt mit dem
Corporate-Formular); `502` Mailversand fehlgeschlagen; `503` SMTP nicht konfiguriert. Die Website
zeigt **eigene deutsche Texte je Statuscode** und gibt den Servertext nie aus:

- `200`: „Vielen Dank. Wir melden uns bei Ihnen, um den Besichtigungstermin zu bestätigen."
  Danach, wenn `TERMIN_URL` gesetzt: Link „Termin jetzt online wählen".
- `400`: „Bitte prüfen Sie Name und E-Mail-Adresse."
- `429`: „Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es in einer Minute erneut."
- `502`, `503`, Netzfehler: „Die Anfrage konnte nicht gesendet werden. Rufen Sie uns an:
  +41 41 562 97 00, oder schreiben Sie an info@amanthosliving.com." (Telefon als `tel:`-Link,
  Adresse als `mailto:`).

### K4: Ereignisse und Messung (Website)

Kopf der Seite wie `solothurn/index.html`: CSP-Meta als erstes Element im `head`, **wörtlich von
der Solothurn-Seite übernommen** (sie enthält bereits `connect-src` für
`amanthos-website-api.onrender.com`, GA4, Sentry, Meta und die Google-Ads-Domänen);
`js/consent.js` synchron, `js/meta.js` mit `defer`, gtag-Loader mit `gtag('config', GA4_ID)` und
`gtag('config', ADS_ID)`, Sentry-CDN plus `js/sentry-init.js`, Plausible-Snippet. Nicht geladen:
`i18n.js`, `app.js`, `booking.js`, `chat.js`, `game.js`. Achtung: `css/style.css` setzt
`[data-animate]` auf `opacity: 0`, sichtbar wird es erst durch `app.js`. **Die neue Seite verwendet
`data-animate` nirgends.**

Ereignisse, alle in `js/grenchen-page.js`, alle in `try/catch`, keines darf die Seite brechen:

| Moment                                       | GA4 (`gtag`, immer; Consent Mode regelt die Übertragung)         | Google Ads (nur wenn `window.amConsent.get() === 'granted'`)       | Meta (nur wenn Einwilligung und `typeof window.fbq === 'function'`)                | Plausible (wenn `window.plausible`) |
| -------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------- |
| Finder liefert Ergebnis (entprellt, 1 s)     | `finder_result` `{ rooms, budget, result_count }`                |                                                                    |                                                                                    |                                     |
| Klick auf Karte „Besichtigung anfragen"      | `select_unit` `{ unit }`                                         |                                                                    |                                                                                    |                                     |
| Klick auf `tel:`-Link                        | `phone_click` `{ lead_form: 'grenchen' }`                        |                                                                    |                                                                                    |                                     |
| Antwort `200` auf die Anfrage                | `generate_lead` `{ lead_form: 'grenchen', unit }`                | `gtag('event', 'conversion', { send_to: ADS_SEND_TO })`            | `fbq('track', 'Lead', { content_name: 'grenchen-mieten' }, { eventID: event_id })` | `plausible('Lead')`                 |

- Kein Ereignis trägt Name, E-Mail, Telefon, Nachricht oder Wunschtermin.
- `generate_lead` und die Conversion feuern **erst nach `200`**, nie beim Klick (das Backend
  antwortet genau deshalb synchron, siehe Docstring von `_handle_contact`).
- Meta: Browser-Lead und Server-Lead tragen dieselbe `event_id` (K3), Meta dedupliziert. Der
  Browser-Aufruf geht direkt an `fbq` mit derselben Einwilligungsprüfung wie in `js/meta.js`;
  `js/meta.js` selbst wird nicht angefasst (seine Ereignistabelle kennt nur die Buchungsstrecke).
- Google Ads: `ADS_SEND_TO` aus K2, Muster aus `adsEvent` in `booking.js`, ohne `value`.
- Cookie-Einstellungen: Der Footer hat einen Button, der `window.amConsent.open()` ruft
  (bestehende API in `consent.js`).

### K5: DOM-Kontrakt zwischen Seite (Segment 2) und Skript (Segment 3)

Alle IDs stehen maschinenlesbar in `tests/fixtures/grenchen-dom-contract.json`; das ist die
Quelle, die Tabelle hier ist die Erklärung. Segment 2 muss jede ID genau einmal setzen, Segment 3
darf nur diese IDs ansprechen.

**Finder (`section#finder`):** `f-form` (Container, kein Submit), `f-rooms` (`fieldset` mit vier
Radios `name="rooms"`, IDs `f-rooms-all` Wert `""`, `f-rooms-15` Wert `1.5`, `f-rooms-2` Wert `2`,
`f-rooms-3` Wert `3+`; Beschriftung „Alle", „1.5 Zimmer", „2 Zimmer", „3 Zimmer und mehr"),
`f-budget` (`input type="range"` min 800 max 1700 step 50 value 1700, `aria-describedby`
`f-budget-out`), `f-budget-out` (`output`, Text „bis CHF 1'300" beziehungsweise „alle Preise" am
Maximum), `f-movein` (`input type="month"` min `2026-10` max `2027-12`, dazu `pattern` und
Platzhalter `2026-11` für Browser ohne Monatsfeld), `f-parking` (Checkbox „Aussenparkplatz
gewünscht"), `f-results` (Container für Karten, `aria-live="polite"`), `f-count` (Satz „12 von 22
Wohnungen passen", `role="status"`), `f-empty` (Hinweis „Keine Wohnung im Budget. Die günstigsten
Wohnungen in Ihrer Zimmerwahl:", `hidden` bis gebraucht).

**Karte (rendert Segment 3, gestaltet Segment 2):**

```html
<article class="unit-card" data-unit="43">
  <h3 class="unit-card-title">Wohnung 43</h3>
  <p class="unit-card-meta">4. OG, 2 Zimmer, 58.2 m²</p>
  <dl class="unit-card-price">
    <dt>Nettomiete</dt><dd>CHF 950</dd>
    <dt>Nebenkosten</dt><dd>CHF 170</dd>
    <dt>Bruttomiete</dt><dd class="unit-card-gross">CHF 1'120</dd>
  </dl>
  <p class="unit-card-avail">ab 1. November 2026, früher nach Vereinbarung</p>
  <button type="button" class="btn btn-accent unit-card-cta" data-unit="43">Besichtigung anfragen</button>
</article>
```

Zusatzklasse `unit-card over-budget` für Karten aus dem Fallback (K6). Segment 2 liefert die
Klassen `.unit-card`, `.unit-card-title`, `.unit-card-meta`, `.unit-card-price`,
`.unit-card-gross`, `.unit-card-avail`, `.unit-card-cta`, `.over-budget`, `.hp` (Honigtopf) in
`css/grenchen.css`.

**Anfrage (`section#anfrage`, `form#a-form` mit `novalidate`):** `a-name` (`autocomplete=name`,
`required`), `a-email` (`type=email`, `required`), `a-phone` (`type=tel`), `a-unit` (`select`, im
HTML nur die Option „Noch offen" mit Wert `""`; Segment 3 füllt die 22 gelisteten Wohnungen als
„Wohnung 43, 2 Zimmer, CHF 1'120"), `a-rooms` und `a-budget` und `a-parking` (`input type="hidden"`,
vom Finder gespiegelt), `a-movein` (`type=month`, vom Finder gespiegelt, editierbar), `a-slot-day`
(`type=date`, min morgen; Segment 3 weist Samstag und Sonntag mit Feldfehler ab), `a-slot-time`
(`select`: „09 bis 12 Uhr", „12 bis 15 Uhr", „15 bis 18 Uhr"), `a-message` (`textarea`),
`a-company-website` (Honigtopf: `name="company_website"`, `tabindex="-1"`, `autocomplete="off"`,
`aria-hidden="true"`, Klasse `hp`, Label „Firmenwebsite, bitte leer lassen"), `a-submit`
(`button type="submit"`), `a-status` (`role="status"`, Fehler- und Erfolgstexte aus K3),
`a-success` (`hidden`, Erfolgsblock), `a-termin` (`a`, `hidden`, `href` setzt Segment 3 aus
`TERMIN_URL`). Unter dem Absenden ein Satz mit Link auf `../privacy/`.

**Navigation und Abschnitte:** `hamburger`, `navLinks` (Segment 3 übernimmt das Umschalten
selbst, acht Zeilen, weil `app.js` nicht geladen wird), `a-consent` (Footer-Button
„Cookie-Einstellungen"). Abschnitts-IDs `finder`, `anfrage`, `lage`, `fotos`, `faq`, `kontakt`.

### K6: Finder-Schnittstelle (`js/grenchen-finder.js`, reine Funktionen)

```
window.amGrenchenFinder = module.exports = {
  VERSION: '1',
  filter(units, criteria)      -> Array, sortiert nach gross aufsteigend, bei Gleichstand nr aufsteigend
  fallback(units, criteria, n) -> Array der n guenstigsten gelisteten Wohnungen, die nur die Zimmerwahl erfuellen
  formatChf(1090)              -> "CHF 1'090"
  formatSqm(43.1)              -> "43.1 m²"
  roomsLabel(1.5)              -> "1.5 Zimmer"      (3 -> "3 Zimmer", 3.5 -> "3.5 Zimmer")
  floorLabel(4)                -> "4. OG"
  availabilityLabel(unit)      -> siehe unten
}
criteria = { rooms: '' | '1.5' | '2' | '3+', budget: number | null, moveIn: 'YYYY-MM' | '' }
```

Regeln für `filter`:

1. Nur `listed === true`.
2. `rooms`: `''` alle; `'1.5'` genau 1.5; `'2'` genau 2; `'3+'` `rooms >= 3`.
3. `budget`: `null` oder ungültig heisst kein Limit; sonst `gross <= budget`.
4. `moveIn`: `''` oder ungültig heisst kein Limit; sonst fällt eine Wohnung nur heraus, wenn
   `flexible === false` und `availableFrom.slice(0, 7) > moveIn` (String-Vergleich von `YYYY-MM`).
5. `parking` filtert nicht (jede Wohnung kann einen Aussenparkplatz separat anmieten); der Wunsch
   wandert nur in die Anfrage.

`availabilityLabel`: `flexible` heisst „ab 1. November 2026, früher nach Vereinbarung"; sonst
„ab 1. Oktober 2026" beziehungsweise „ab 1. Januar 2027" aus `availableFrom` (deutsche
Monatsnamen, Tag ohne führende Null); `availableFrom === null` heisst „nach Vereinbarung".

Prüfvektoren (gegen K1, Segment 1 schreibt sie als Tests):

| criteria                                      | erwartet                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| rooms 1.5, budget 900                         | genau 33, 31, 32 (in dieser Reihenfolge)                                                   |
| rooms 2, budget 900                           | genau 36                                                                                   |
| rooms 3+, budget 1700                         | genau 62 (61 ist nicht gelistet)                                                           |
| rooms '', budget 1000, moveIn 2026-10         | genau 11 Treffer: 33, 36, 31, 32, 35, 37, 42, 52, 41, 46, 51                               |
| rooms 2, budget null, moveIn 2026-12          | 17 Treffer, ohne 34                                                                        |
| rooms 2, budget null, moveIn 2027-01          | 18 Treffer, mit 34                                                                         |
| rooms '', budget 800                          | leer; `fallback(units, criteria, 3)` liefert 33, 36, 31                                    |
| rooms '', budget null, moveIn ''              | 22 Treffer, erste 33, letzte 64                                                            |
| Gleichstand 53 und 54 (1150)                  | 53 vor 54                                                                                  |

### K7: Backend-Kontrakt (`website-backend`, Segmente 4 und 5)

**`meta_capi.send_lead` (Segment 4):**

```python
def send_lead(event_id, email, phone, tracking, source_url, custom_data=None):
    """Ein Lead-Ereignis. True bei 2xx, sonst None. Wirft nie.

    event_id kommt aus dem Browser (K3) und ist auf beiden Seiten gleich, Meta dedupliziert.
    tracking = {'fbclid': ..., 'fbc': ..., 'fbp': ...}; fehlt fbc, wird es aus fbclid als
    'fb.1.<jetzt in ms>.<fbclid>' abgeleitet. Kein gclid, keine IP, kein User-Agent (Hausregel).
    Nicht konfiguriert oder event_id leer: None ohne Netzaufruf.
    """
```

Payload: `event_name: 'Lead'`, `event_time`, `event_id`, `action_source: 'website'`,
`event_source_url`, `user_data` mit `em`/`ph` gehasht (bestehende Helfer, Goldvektoren aus
`tests/test_meta_capi.py` bleiben), `fbc`/`fbp` wenn vorhanden, `custom_data` wenn übergeben.
Versandlogik wie `send_purchase` (ein Retry nur bei 5xx und Netzfehler, `test_event_code` wird
durchgereicht). Empfohlen: den Versand in `_dispatch(payload, label)` ausziehen und aus beiden
Funktionen rufen; `send_purchase` verhält sich danach messbar gleich (bestehende Tests
unverändert grün).

**`_handle_contact` mit `form == 'grenchen'` (Segment 5):**

- Neues Modul `website-backend/contact_grenchen.py` (reine Funktionen, keine Netzaufrufe):
  `parse(body) -> dict` nach K3 (wirft `ValueError(meldung)` bei Name oder E-Mail),
  `subject(fields) -> str`, `rows(fields) -> list[tuple[str, str]]`.
- Betreff: `Mietanfrage Grenchen: Wohnung <unit> (<rooms> Zimmer)`; `unit` leer heisst
  `Wohnung offen`; `rooms` leer heisst `(Zimmer offen)`. Beispiele:
  `Mietanfrage Grenchen: Wohnung 43 (2 Zimmer)`, `Mietanfrage Grenchen: Wohnung offen (1.5 Zimmer)`,
  `Mietanfrage Grenchen: Wohnung offen (Zimmer offen)`.
- Zeilen der Tabelle, in dieser Reihenfolge, leere weggelassen: Name, E-Mail, Telefon, Wohnung,
  Zimmer, Budget brutto (als `CHF <n>`), Einzug ab, Wunschtermin, Nachricht, Kampagne
  (`utm_source / utm_medium / utm_campaign`, nur die vorhandenen). Fusszeile: „Gesendet ueber das
  Formular auf www.amanthosliving.com/grenchen-mieten/, Referenz <event_id>". `gclid` und
  `fbclid` stehen nie in der Mail.
- Absender `Amanthos Living <NOTIFICATION_FROM_EMAIL>` (nicht „Amanthos International"), `To` =
  `GRENCHEN_RECIPIENTS` (neue Modulkonstante in `server.py`, env kommagetrennt, Default
  `info@amanthosliving.com`, mehrere Adressen mit `, ` verbunden), `Reply-To` = `email`.
- Der bestehende Code für `contact` und `newsletter` bleibt im Verhalten identisch; die Variablen
  Absendername, Empfänger und Fusszeile werden je Formularart gesetzt, der Tabellen- und
  Versandcode bleibt einer.
- Nach erfolgreichem `send_message`: `meta_capi.send_lead(...)` in einem `daemon`-Thread (Muster
  `_report` in `_handle_booking`), `tracking = {'fbclid': fbclid}`, `source_url` =
  `https://www.amanthosliving.com/grenchen-mieten/`, `custom_data = {'content_name': 'grenchen-mieten'}`.
  Der Thread-Start steht in `try/except`; ein Fehler dort ändert die Antwort nicht. Bei
  SMTP-Fehler (`502`) wird kein Lead gemeldet.
- Log-Zeilen: `Contact form: grenchen delivered to <empfaenger> (unit <nr>, ref <event_id[:8]>)`
  und bei Fehlern wie bisher ohne Adresse. Nie Name, E-Mail, Telefon, Nachricht.
- Keine neue Route, keine Änderung an `do_POST`, an `check_rate_limit` oder an `ALLOWED_ORIGINS`
  (`https://www.amanthosliving.com` steht dort bereits).

### K8: Harness (`tests/dev-server.py`, Segment 0)

- Liefert `/grenchen-mieten/`, `/grenchen-mieten/index.html` und
  `/tests/fixtures/grenchen-skeleton.html` aus und fügt vor `</head>` einen Stub ein:
  `window.AMANTHOS_API_BASE = ''`, `window.__gtagCalls = []` mit umhülltem `window.gtag`,
  `window.__fbqCalls = []` mit Stub `window.fbq` (verhindert zugleich, dass `meta.js` das echte
  Pixel lädt: dessen Loader bricht ab, wenn `fbq` existiert), und bei `?contact=fail` oder
  `?contact=429` einen `fetch`-Wrapper, der an die `/api/contact`-URL `?fail=502` beziehungsweise
  `?fail=429` anhängt.
- `POST /api/contact`: `fail=502` antwortet `502 {"error": "..."}`, `fail=429` antwortet `429`;
  sonst `print('CONTACT-BODY ' + raw)` und `200 {"ok": true}`. Legt nie eine Datei an.
- Bestehendes Verhalten für `/`, `/js/booking.js`, `/api/offers`, `/api/bookings` unverändert.
- Aufruf: `python3 tests/dev-server.py 8080`.

### K9: Fotos (Segment 0)

Quelle: sechs Innenaufnahmen aus dem Exposé (5000 px, temporärer Pfad, vom Auftraggeber genannt;
nur diese sechs, die Aussenaufnahmen sind ausdrücklich nicht zu verwenden). Konvertierung
`cwebp -q 78 -resize 1600 0 -metadata none <quelle> -o images/solothurn/<ziel>`; Ziel je Datei
unter 200 KB, sonst Qualität bis 70 senken. Zusätzlich die Hero-Datei in 960 px für `srcset`.

| Quelle    | Ziel                                   | Verwendung           | Alt-Text (Entwurf, nach Sichtung des Bildes anpassen)                       |
| --------- | -------------------------------------- | -------------------- | ---------------------------------------------------------------------------- |
| s11-00    | `grenchen-wohnen.webp`, `grenchen-wohnen-960.webp` | Hero, `fetchpriority="high"`, Preload | Möblierter Wohn- und Essbereich einer Wohnung an der Bettlachstrasse 20 |
| s01-00    | `grenchen-kueche-flur.webp`            | Galerie              | Küche und Flur, möbliert                                                     |
| s12-00    | `grenchen-schlafzimmer.webp`           | Galerie              | Schlafzimmer mit Doppelbett                                                  |
| s13-00    | `grenchen-kueche.webp`                 | Galerie              | Voll ausgestattete Küche                                                     |
| s14-00    | `grenchen-kochfeld.webp`               | Galerie              | Kochfeld und Backofen                                                        |
| s15-00    | `grenchen-mikrowelle.webp`             | Galerie              | Mikrowelle und Küchenausstattung                                             |

Segment 0 misst Breite und Höhe jeder Datei (`sips -g pixelWidth -g pixelHeight`) und trägt sie
mit Dateiname und Alt-Text in `tests/fixtures/grenchen-dom-contract.json` ein; Segment 2 setzt
`width`/`height` daraus (kein Layoutsprung). Nur `webp`, keine `jpg`-Fallbacks (alle relevanten
Browser können webp; die bestehenden Doppel auf der Solothurn-Seite bleiben, wie sie sind).

### K10: Faktenblatt für die Seite (alles, was behauptet werden darf)

- Adresse Bettlachstrasse 20, 2540 Grenchen. 23 möblierte Wohnungen, 3. bis 6. OG, Lift, voll
  ausgestattete Küche, Nebenkosten inklusive (Bruttomiete), Aussenparkplätze separat anmietbar
  (Preis auf Anfrage), Mindestmietdauer 12 Monate, Wohnsitz anmeldbar, Bezug nach Vereinbarung.
- Lage: Stadtzentrum 150 m, Coop 160 m, Apotheke 90 m, Bushaltestelle Storchengasse 220 m,
  Bahnhof Grenchen Süd 550 m, Hallenbad 450 m, Autobahn A5, zwischen Biel/Bienne und Solothurn,
  rund 11'000 Arbeitsplätze in Grenchen (Uhren- und Präzisionsindustrie).
- Kontakt: info@amanthosliving.com, +41 41 562 97 00 (dieselbe Nummer wie auf der Solothurn-Seite), Ansprechpartner Julian Neyer,
  Immobilienberater.
- Aufhänger im Hero: neue Stelle in der Region, noch keine Wohnung, möbliert einziehen, alles
  inklusive. H1 „Möblierte Wohnung mieten in Grenchen". Sprache Du oder Sie: Sie.
- Strukturierte Daten: JSON-LD `ApartmentComplex` mit `name`, `address`, `telephone`, `email`,
  `url`, `numberOfAccommodationUnits: 23`; `tourBookingPage` erst, wenn `TERMIN_URL` gesetzt ist
  (Verdrahtung). Kein `aggregateRating`, keine Preise im JSON-LD.
- Nicht behaupten: Vertragspartner, Kaution, Kündigungsfrist, Haustiere, Parkplatzpreis,
  Antwortzeit-Zusagen, „provisionsfrei".

### K11: Landing-URLs für die Kampagnen (Übergabe in der Verdrahtung)

- Google Ads: `https://www.amanthosliving.com/grenchen-mieten/?utm_source=google&utm_medium=cpc&utm_campaign=grenchen-mieten`
  (`gclid` kommt über das automatische Tagging).
- Meta: `https://www.amanthosliving.com/grenchen-mieten/?utm_source=meta&utm_medium=paid_social&utm_campaign=grenchen-mieten`
  (`fbclid` hängt Meta an).
- Portale und organisch: ohne Parameter.

**Akzeptanzkriterien:**

```bauplan-kriterien segment=0
- [ ] node --test tests/ Exit 0, Testzahl zitiert; tests/grenchen-contract.test.mjs prueft K1 (23 Eintraege, 22 gelistet, netto plus NK gleich brutto, Nummern eindeutig) und K2 (Schluessel, ADS_SEND_TO-Format) und ueberspringt die DOM-Teile, solange index.html und grenchen-page.js fehlen
- [ ] js/grenchen-units.js und js/grenchen-config.js laden in Node (require) und im Browser (window.GRENCHEN_UNITS, window.GRENCHEN_CONFIG); TERMIN_URL ist leer
- [ ] tests/fixtures/grenchen-dom-contract.json enthaelt alle IDs und Klassen aus K5 und die sechs Bilder mit gemessenen Massen und Alt-Texten (python3 -m json.tool Exit 0)
- [ ] Sieben webp-Dateien images/solothurn/grenchen-*.webp, Breite 1600 (Hero zusaetzlich 960), je unter 200 KB (ls -l zitiert), keine jpg, keine Aussenaufnahme
- [ ] Harness: python3 tests/dev-server.py 8080; GET /tests/fixtures/grenchen-skeleton.html enthaelt den Stub; POST /api/contact liefert 200 und druckt CONTACT-BODY; mit fail=502 kommt 502, mit fail=429 kommt 429 (curl-Ausgaben zitiert); GET / und /js/booking.js verhalten sich wie vor dem Segment
- [ ] Kein Datei-Diff ausserhalb des Scopes; keine Personendaten in Fixtures; status bleibt draft, Umstellen auf aktiv macht der Inhaber
```

**Hängt ab von:** nichts. Danach: Inhaber stellt `aktiv`.
**Diff:** etwa 60 Zeilen Produktivcode (Daten und Konstanten), dazu Harness, Fixtures, Test
(zählen nicht) und sieben Binärdateien. Geschätzt 45 Minuten.

## 3. Segmente (parallel, nach Merge von Segment 0 und `status: aktiv`)

Alle fünf zweigen von `origin/main` des jeweiligen Repos ab (`git fetch origin main && git
checkout -b <branch> origin/main`), arbeiten im eigenen Worktree, pushen, erstellen keinen PR und
mergen nichts. Die Website-Segmente sind inert, bis die Verdrahtung Nav-Link und Sitemap setzt
(die Seite ist nach dem Merge von Segment 2 zwar erreichbar, aber unverlinkt). Die
Backend-Segmente sind inert, bis ein Frontend `form: grenchen` sendet.

### Segment 1: Finder-Logik (Website, rein, ohne DOM)

- **Datei-Scope (exklusiv):**
  ```bauplan-scope segment=1
  # repo: amanthos-living-website
  js/grenchen-finder.js
  tests/grenchen-finder.test.mjs
  ```
- **Auftrag:** `js/grenchen-finder.js` nach K6 als IIFE ohne DOM-Zugriff, Export als
  `module.exports` und `window.amGrenchenFinder`. Dazu `tests/grenchen-finder.test.mjs` mit
  allen Prüfvektoren aus K6 gegen die echten Daten aus `js/grenchen-units.js` (kein eigenes
  Fixture, die Datendatei ist die Quelle).
- **Akzeptanzkriterien:**
  ```bauplan-kriterien segment=1
  - [ ] node --test tests/ Exit 0, Testzahl zitiert; alle neun Pruefvektoren aus K6 als eigene Tests, dazu formatChf(1090) gleich "CHF 1'090", formatSqm(43.1) gleich "43.1 m²", roomsLabel fuer 1.5, 2, 3, 3.5, availabilityLabel fuer flexible, hartes Datum und null
  - [ ] filter ist ohne Nebenwirkung: das uebergebene Array bleibt unveraendert (Test)
  - [ ] Ungueltige criteria (undefined, leere Strings, budget "abc", moveIn "2026-13") werfen nicht und wirken wie "kein Limit" (Test)
  - [ ] Datei laeuft in Node ohne window und im Browser ohne module (Muster js/deeplink.js)
  - [ ] Produktivcode-Diff hoechstens 400 Zeilen; kein Datei-Diff ausserhalb des Scopes; Plan-Abgleich in jedem Commit
  ```
- **Out-of-Scope:** DOM, Rendern, Ereignisse, Formular, Änderungen an `js/grenchen-units.js`
  (Datenfehler werden gemeldet, nicht behoben).
- **Testplan:** `node --test tests/` (Exit-Code und Testzahl zitieren).
- **Hängt ab von:** Segment 0.
- **Diff geschätzt:** ~130 Zeilen Produktivcode, ~130 Zeilen Tests. 30 Minuten.

### Segment 2: Seite und Stylesheet (Website, HTML und CSS)

- **Datei-Scope (exklusiv):**
  ```bauplan-scope segment=2
  # repo: amanthos-living-website
  grenchen-mieten/index.html
  css/grenchen.css
  ```
- **Auftrag:** `grenchen-mieten/index.html` mit `lang="de"`, Kopf nach K4 (CSP wörtlich von
  `solothurn/index.html`, Consent, Meta, gtag-Loader mit beiden `config`-Aufrufen, Sentry,
  Plausible, kritisches Inline-CSS und der `style.css`-Ladetrick wie auf der Solothurn-Seite,
  danach `<link rel="stylesheet" href="../css/grenchen.css">`), Meta-Tags (Titel „Wohnung mieten
  in Grenchen: möbliert, ab 12 Monaten | Amanthos Living", Beschreibung, `canonical`, `hreflang`
  `de` und `x-default`, Open Graph mit dem Hero-Bild), JSON-LD nach K10, Skript-Tags am Ende des
  `body` in dieser Reihenfolge: `grenchen-config.js`, `grenchen-units.js`, `grenchen-finder.js`,
  `grenchen-page.js`, alle `defer`. Abschnitte: Nav (Home, Kurzaufenthalt Solothurn, Wohnungen,
  Lage, FAQ, CTA „Besichtigung anfragen"), Hero mit Aufhänger und zwei CTAs (Finder, Anruf),
  Vertrauensleiste (12 Monate, Wohnsitz, Nebenkosten inklusive, Lift), Finder nach K5, Anfrage
  nach K5, Lage (Distanzliste aus K10), Fotos (Galerie mit fünf Bildern, `loading="lazy"`,
  `width`/`height` aus dem Fixture), FAQ (`details.faq-item`, fünf Fragen aus K10: Mindestmietdauer,
  Wohnsitz, Was ist inklusive, Parkplatz, Ablauf der Besichtigung), Kontakt (Ansprechpartner,
  Telefon, E-Mail), Footer (Datenschutz, Impressum, Cookie-Einstellungen-Button `a-consent`).
  `css/grenchen.css` nur für Finder-Steuerelemente, Karten, Honigtopf und Hero-Anpassungen;
  alles andere über die bestehenden Klassen von `css/style.css` (`section`, `container`,
  `section-label`, `section-title`, `btn btn-accent`, `form-grid`, `form-field`, `faq-list`,
  `faq-item`, `footer`, `nav scrolled`).
- **Akzeptanzkriterien:**
  ```bauplan-kriterien segment=2
  - [ ] node --test tests/ Exit 0: der DOM-Teil von tests/grenchen-contract.test.mjs laeuft jetzt und findet jede ID aus dem Fixture genau einmal
  - [ ] CSP-Meta ist das erste Element im head und byte-identisch mit der Zeile in solothurn/index.html (diff zitiert); kein data-animate im Dokument (grep leer); keine Skripte ausser den in K4 genannten
  - [ ] Harness: http://localhost:8080/grenchen-mieten/ rendert ohne Konsolenfehler ausser fehlendem grenchen-page.js (solange Segment 3 nicht gemergt ist); Hero-Bild ist grenchen-wohnen.webp mit Preload und fetchpriority high; alle Bilder tragen width und height aus dem Fixture
  - [ ] axe (node .github/scripts/axe.cjs gegen den Harness) meldet 0 serious und 0 critical; Kontrast, Labels und Fokusreihenfolge geprueft; jedes Formularfeld hat ein sichtbares label
  - [ ] Lighthouse lokal (npx --yes lighthouse gegen den Harness, headless): accessibility mindestens 90, seo mindestens 50, performance mindestens 60 (Werte zitiert, Budgets aus unlighthouse.config.mjs)
  - [ ] Jede Aussage auf der Seite steht in K10; nichts zu Vertragspartner, Kaution, Kuendigungsfrist, Haustieren, Parkplatzpreis; Telefonnummer und E-Mail wie K2
  - [ ] Seite ist bei 360 px Breite ohne horizontales Scrollen nutzbar (Screenshot-Beleg)
  - [ ] Produktivcode-Diff hoechstens 400 Zeilen (HTML plus CSS); bei Ueberschreitung anhalten und melden; kein Datei-Diff ausserhalb des Scopes; Plan-Abgleich in jedem Commit
  ```
- **Out-of-Scope:** jedes JavaScript (auch kein Inline-Skript ausser dem gtag-Loader aus K4),
  Änderungen an `css/style.css`, `solothurn/index.html`, `sitemap.xml`, `locales/`, Bilder.
- **Testplan:** Harness starten, `node --test tests/`, axe wie in `.github/workflows/quality.yml`
  (Installation nach `/tmp/a11y`, nicht ins Repo), Lighthouse per `npx`, Screenshot 360 px.
- **Hängt ab von:** Segment 0.
- **Diff geschätzt:** ~320 Zeilen HTML plus ~70 Zeilen CSS. Das ist das engste Segment.
  Vorgesehener Schnitt bei Überschreitung: FAQ und Lage-Liste als Folgesegment 6 im selben Repo,
  seriell nach Segment 2 auf derselben Datei. 75 Minuten.

### Segment 3: Seitenskript (Website, DOM, Formular, Ereignisse)

- **Datei-Scope (exklusiv):**
  ```bauplan-scope segment=3
  # repo: amanthos-living-website
  js/grenchen-page.js
  tests/grenchen-page.test.mjs
  ```
- **Auftrag:** `js/grenchen-page.js` als IIFE: Finder-Steuerung (liest K5-Felder, ruft
  `amGrenchenFinder.filter`, rendert Karten nach K5, Fallback nach K6, Zählsatz, Entprellung),
  Kartenklick (Formular vorbefüllen, `a-unit` setzen, zu `#anfrage` scrollen, Fokus auf
  `a-name`), Spiegelung Finder zu Formular (`a-rooms`, `a-budget`, `a-parking`, `a-movein`),
  Füllen von `a-unit` aus den Daten, Validierung (Name, E-Mail, Wochentag), `event_id` beim Laden,
  Kampagne aus `location.search`, Klick-IDs nur über `window.amMeta.tracking()`, Payload nach K3,
  `fetch` mit `mode: 'cors'` und JSON, Statuscodes zu deutschen Texten (K3), Ereignisse nach K4,
  `TERMIN_URL`-Link, Hamburger, Cookie-Button. Reine Helfer (`buildPayload`, `readCampaign`,
  `newEventId`, `composeWishSlot`, `isWeekday`, `statusText`) exportiert als `module.exports` und
  `window.amGrenchenPage`; die DOM-Initialisierung läuft nur, wenn `document` existiert.
- **Akzeptanzkriterien:**
  ```bauplan-kriterien segment=3
  - [ ] node --test tests/ Exit 0, Testzahl zitiert: buildPayload liefert genau die 17 Schluessel aus K3 (Reihenfolge egal), leere Werte als ""; readCampaign verwirft ungueltige utm-Werte einzeln; newEventId passt auf ^[A-Za-z0-9-]{8,64}$; composeWishSlot liefert "Dienstag 15.09.2026, 15 bis 18 Uhr"; isWeekday lehnt Samstag und Sonntag ab; statusText kennt 200, 400, 429, 502, 503 und Netzfehler
  - [ ] Der DOM-Teil von tests/grenchen-contract.test.mjs laeuft: jedes getElementById-Literal steht im Fixture
  - [ ] Harness mit Skelett (http://localhost:8080/tests/fixtures/grenchen-skeleton.html): Budget 900 plus 1.5 Zimmer zeigt genau die Karten 33, 31, 32 und den Satz "3 von 22 Wohnungen passen"; Budget 800 zeigt f-empty und drei over-budget-Karten; Klick auf die Karte 43 setzt a-unit auf 43, a-rooms auf 2 und fokussiert a-name (DevTools-Beleg)
  - [ ] Absenden ohne E-Mail: kein fetch, Fehlertext, aria-invalid auf a-email; Samstag als Wunschtag: Feldfehler; gueltig: CONTACT-BODY im Harness enthaelt form grenchen, unit 43, rooms 2, move_in, wish_slot, event_id, utm_campaign aus der URL, company_website leer; a-success sichtbar, a-form verborgen
  - [ ] Ereignisse: nach 200 enthaelt __gtagCalls ein event generate_lead mit lead_form grenchen und unit 43, mit Einwilligung zusaetzlich event conversion mit send_to AW-702540316/x7S2CMfItfAcEJzU_84C und __fbqCalls track Lead mit eventID gleich event_id aus dem Body; ohne Einwilligung fehlen conversion und Lead, generate_lead bleibt; ?contact=fail zeigt den 502-Text mit tel- und mailto-Link und feuert kein generate_lead; ?contact=429 zeigt den 429-Text
  - [ ] gclid und fbclid sind im Body nur gefuellt, wenn amMeta.tracking() sie liefert (Einwilligung); utm-Werte kommen auch ohne Einwilligung; nichts wird in localStorage geschrieben (Storage-Inspektor-Beleg)
  - [ ] TERMIN_URL leer: a-termin bleibt hidden; im Harness per DevTools auf eine URL gesetzt: Link sichtbar nach Erfolg
  - [ ] Tastaturbedienung: Finder, Karten-CTA, Formular und Hamburger ohne Maus bedienbar
  - [ ] Produktivcode-Diff hoechstens 400 Zeilen; kein Datei-Diff ausserhalb des Scopes; Plan-Abgleich in jedem Commit
  ```
- **Out-of-Scope:** HTML und CSS (Segment 2), `js/meta.js`, `js/consent.js`, `js/booking.js`,
  Änderungen an Daten oder Konfiguration, Speichern in `localStorage` oder Cookies.
- **Testplan:** `node --test tests/`, Harness mit Skelett und DevTools (`__gtagCalls`,
  `__fbqCalls`, `CONTACT-BODY` auf stdout des Harness), Einwilligung über das Banner beziehungsweise
  `localStorage.am_consent_analytics` in beiden Zuständen.
- **Hängt ab von:** Segment 0 (Skelett, Daten, Konfiguration, Harness). Nicht von Segment 1:
  bis dessen Merge liegt `amGrenchenFinder` nicht vor; Segment 3 testet gegen den Branch von
  Segment 1 in einem zweiten Worktree oder mit einem lokalen, nicht committeten Stub, und meldet
  im Bericht, welche Variante es war.
- **Diff geschätzt:** ~280 Zeilen Produktivcode, ~90 Zeilen Tests. 60 Minuten.

### Segment 4: Meta-CAPI-Lead (Backend)

- **Datei-Scope (exklusiv):**
  ```bauplan-scope segment=4
  # repo: amanthos-group-booking
  website-backend/meta_capi.py
  website-backend/tests/test_meta_capi_lead.py
  ```
- **Branch:** `feature/grenchen-lead-capi` (kein Gate, Abschnitt 0a).
- **Auftrag:** `send_lead` nach K7 in `meta_capi.py`; Versandlogik gemeinsam mit `send_purchase`
  (`_dispatch`), Verhalten von `send_purchase` unverändert. Tests in
  `tests/test_meta_capi_lead.py` nach dem Muster von `tests/test_meta_capi.py` (Modul mit
  Umgebungsvariablen neu laden, `_post` mocken, `_restore` in `finally`).
- **Akzeptanzkriterien:**
  ```bauplan-kriterien segment=4
  - [ ] pytest website-backend/tests Exit 0, Testzahl vorher und nachher zitiert; tests/test_meta_capi.py unveraendert und gruen; ruff check website-backend Exit 0
  - [ ] Payload: event_name Lead, event_id wie uebergeben, action_source website, event_source_url gesetzt, em und ph gehasht (Goldvektoren aus test_meta_capi.py), fbc aus fbclid abgeleitet im Format fb.1.<ms>.<fbclid>, ein uebergebenes fbc gewinnt, custom_data nur wenn uebergeben
  - [ ] Kein Klartext im Payload (E-Mail, Telefonziffern), kein gclid, keine client_ip_address, kein client_user_agent (Test)
  - [ ] Nicht konfiguriert: None ohne _post; event_id leer: None ohne _post; 5xx: genau ein Retry; 4xx: kein Retry; Netzfehler: ein Retry, dann None; test_event_code wird durchgereicht (Tests)
  - [ ] Keine Netzaufrufe in Tests, keine Personendaten in Tests; Produktivcode-Diff hoechstens 400 Zeilen; nur die zwei Dateien des Scopes; Plan-Abgleich in jedem Commit
  ```
- **Out-of-Scope:** `server.py`, `tracking_store.py`, Supabase, jede Änderung am Purchase-Pfad
  ausser dem gemeinsamen Versand.
- **Testplan:** `cd ~/Projects/amanthos-group-booking && pytest website-backend/tests -q` und
  `ruff check website-backend`.
- **Hängt ab von:** nichts (K7 ist Text). Eine Sitzung, höchstens 30 Minuten.
- **Diff geschätzt:** ~55 Zeilen Produktivcode, ~90 Zeilen Tests. 25 Minuten.

### Segment 5: Formularart `grenchen` im Kontakt-Handler (Backend)

- **Datei-Scope (exklusiv):**
  ```bauplan-scope segment=5
  # repo: amanthos-group-booking
  website-backend/server.py
  website-backend/contact_grenchen.py
  website-backend/tests/test_contact_grenchen.py
  ```
- **Branch:** `feature/grenchen-contact-form` (kein Gate, Abschnitt 0a).
- **Auftrag:** `contact_grenchen.py` (parse, subject, rows nach K7) und die Erweiterung von
  `_handle_contact` in `server.py` nach K7: dritte Formularart, `GRENCHEN_RECIPIENTS` neben
  `CONTACT_RECIPIENT`, Absendername je Formularart, CAPI-Thread nach dem Versand. Tests nach dem
  Muster von `tests/test_guest_payment_link.py` (Modul über den Pfad laden, `FakeSMTP`,
  `threading.Thread` durch einen Sofortläufer ersetzen, `_json_response` am Handler-Objekt durch
  einen Rekorder ersetzen, `check_rate_limit` je Test zurücksetzen oder patchen).
- **Akzeptanzkriterien:**
  ```bauplan-kriterien segment=5
  - [ ] pytest website-backend/tests Exit 0, Testzahl vorher und nachher zitiert; ruff check website-backend Exit 0; bestehende Tests unveraendert
  - [ ] POST ohne gueltige E-Mail gibt 400; ohne Name (leer oder ein Zeichen) gibt 400; Honigtopf gefuellt gibt 200 ohne SMTP-Aufruf und ohne send_lead; unbekannte form gibt 400 (Tests)
  - [ ] Gueltige Anfrage: genau eine Mail; To gleich GRENCHEN_RECIPIENTS, bei "a@example.com,b@example.com" beide im To; From "Amanthos Living <...>"; Reply-To gleich Absender; Subject exakt "Mietanfrage Grenchen: Wohnung 43 (2 Zimmer)", ohne unit "Wohnung offen", ohne rooms "(Zimmer offen)"; HTML enthaelt Name, E-Mail, Wohnung, Zimmer, Budget, Einzug, Wunschtermin, Nachricht, Kampagne und die Referenz; HTML enthaelt weder gclid noch fbclid (Tests)
  - [ ] send_lead wird nach dem Versand mit event_id, email, phone, tracking fbclid, source_url der Seite und custom_data content_name grenchen-mieten gerufen; wirft send_lead, bleibt die Antwort 200; bei SMTP-Fehler kommt 502 und send_lead wird nicht gerufen; ungueltige event_id wird durch uuid4 ersetzt (Tests, send_lead per mock.patch.object mit create=True, damit der Test auch vor dem Merge von Segment 4 laeuft)
  - [ ] form contact und form newsletter verhalten sich wie vor dem Segment (Test je Formularart: Betreff, To gleich CONTACT_RECIPIENT, From "Amanthos International")
  - [ ] capsys: stdout enthaelt weder die synthetische E-Mail noch den Namen noch die Telefonnummer; Quelltext-Wache wie tests/test_reminder_keine_gastdaten_im_log.py ueber contact_grenchen.py und den grenchen-Zweig (Tests)
  - [ ] server.py: git diff zeigt Aenderungen nur innerhalb von _handle_contact und am Konstantenblock bei CONTACT_RECIPIENT (Hunk-Liste im PR-Text); keine neue Route; do_POST, check_rate_limit, ALLOWED_ORIGINS unveraendert
  - [ ] Keine Personendaten in Tests; Produktivcode-Diff hoechstens 400 Zeilen; nur die drei Dateien des Scopes; Plan-Abgleich in jedem Commit
  ```
- **Out-of-Scope:** `meta_capi.py` (Segment 4), `render.yaml`, `.env.example`,
  `DOKUMENTATION.md`, Änderungen am Verhalten der bestehenden Formulare, Speichern von Leads
  (Supabase), Rate-Limit-Werte.
- **Testplan:** `pytest website-backend/tests -q`, `ruff check website-backend`, dazu ein
  lokaler Start `PORT=3003 python3 website-backend/server.py` mit `curl -X POST
  localhost:3003/api/contact -d '{"form":"grenchen","email":"x"}'` (erwartet `400`, beweist den
  Zweig ohne Mailversand; SMTP lokal nicht konfiguriert).
- **Hängt ab von:** nichts zum Bauen (K7 ist Text, `send_lead` wird im Test mit `create=True`
  gemockt). Zum Merge: Segment 4 zuerst (Abschnitt 5), sonst schluckt der `try/except` den
  `AttributeError` still, und der Server-Lead käme nie an. Eine Sitzung, höchstens 30 Minuten.
- **Diff geschätzt:** ~90 Zeilen `contact_grenchen.py` plus ~40 Zeilen in `server.py`, ~150
  Zeilen Tests. 35 Minuten.

## 4. Sammelstellen (nur die Verdrahtung fasst sie an)

```bauplan-scope sammelstellen
# repo: amanthos-living-website
sitemap.xml
solothurn/index.html
index.html
robots.txt
.lycheeignore
unlighthouse.config.mjs
.github/workflows/*
.github/scripts/*
js/consent.js
js/meta.js
js/sentry-init.js
js/booking.js
js/deeplink.js
js/app.js
js/i18n.js
js/chat.js
js/game.js
css/style.css
locales/*
privacy/*
imprint/*
# repo: amanthos-group-booking
render.yaml
.env.example
DOKUMENTATION.md
website-backend/requirements.txt
website-backend/tracking_store.py
pyproject.toml
package.json
package-lock.json
website/*
```

- `sitemap.xml`: Eintrag `https://www.amanthosliving.com/grenchen-mieten/` mit `lastmod` des
  Merge-Tags, `changefreq weekly`, `priority 0.9`.
- `solothurn/index.html`: ein Link „Langzeit mieten" in `navLinks` (vor dem CTA) auf
  `../grenchen-mieten/`; sonst keine Änderung an der Seite.
- `.github/workflows/quality.yml`: die neue URL in die feste axe-Liste aufnehmen.
- `index.html`, `robots.txt`, `.lycheeignore`, `unlighthouse.config.mjs`, `privacy/*`,
  `imprint/*`, alle bestehenden `js/*`, `css/style.css`, `locales/*`: kein Eintrag geplant; sie
  stehen hier, damit kein Segment „nur schnell" etwas ändert. Braucht ein Segment etwas davon,
  meldet es das mit einem Fallback im eigenen Code.
- `render.yaml` und `DOKUMENTATION.md`: `GRENCHEN_RECIPIENTS` (`sync: false`) beim Dienst
  `amanthos-website-api` eintragen und dokumentieren; `.env.example` bekommt die Zeile mit
  Platzhalter.
- `website-backend/requirements.txt`, `pyproject.toml`, `package*.json`: kein Eintrag; keine
  Dependency, kein neuer `testpaths`-Eintrag.
- `website/*` im Backend-Repo ist der veraltete Spiegel der Site (Befund im Plan `fbl-ibe`); er
  steht hier, damit das Gate jeden Zugriff blockt.
- Zwei Dateien der Sache nach Sammelstellen, die NICHT im Block stehen können (Abschnitt 0a):
  `js/grenchen-config.js` (Verdrahtung trägt `TERMIN_URL` ein) und `tests/dev-server.py`.

## 5. Verdrahtung (ein Kopf, sequenziell)

Branches: `chore/grenchen-mieten-verdrahtung` im Website-Repo, `chore/grenchen-recipients` im
Backend-Repo. Merge-Freigabe je PR beim Inhaber; vor jedem Merge `git fetch origin main`,
Rebase, Kombination lokal fahren, `gh pr list --state open` auf Berührung derselben Dateien
prüfen (Merge-Regel vom 29.07.2026).

1. **Backend zuerst.** Segment 4 mergen (Rebase-Merge), dann Segment 5 rebasen, Kombination
   lokal fahren (`pytest website-backend/tests -q`, `ruff check website-backend`, Exit-Codes und
   Testzahl zitieren), mergen. Verdrahtungs-PR: `render.yaml`, `.env.example`, `DOKUMENTATION.md`
   um `GRENCHEN_RECIPIENTS`. Render-Env `GRENCHEN_RECIPIENTS` mit dem Wert setzen, den der Inhaber
   nennt (Abschnitt 7); Deploy abwarten; Smoke: `GET /health` und
   `POST /api/contact {"form":"grenchen","email":"x"}` antwortet `400` (Zweig live, keine Mail).
2. **Website: Segmente mergen** in der Reihenfolge 1, 3, 2 (Skript vor Seite, damit die Seite
   nie ohne Skript live ist; Pages deployt jeden Merge sofort). Nach jedem Merge
   `node --test tests/` auf `main` (Testzahl zitieren).
3. **Verdrahtungs-PR Website:** `TERMIN_URL` in `js/grenchen-config.js` (Wert vom Inhaber; leer
   ist zulässig, dann bleibt der Link verborgen), `tourBookingPage` im JSON-LD nur dann, Nav-Link
   in `solothurn/index.html`, Eintrag in `sitemap.xml`, URL in `quality.yml`, `status:` dieser
   Datei auf `verdrahtet`. Vorher lokal die volle Strecke im Harness gegen die echte Seite
   (nicht das Skelett): Finder, Karte, Formular, alle drei Antwortpfade, beide
   Einwilligungszustände, `__gtagCalls` mit `generate_lead` und `conversion`, `__fbqCalls`,
   `CONTACT-BODY`, axe 0/0, Lighthouse, Tastatur, 360 px. Ergebnisse mit Werten im PR-Text.
4. **Live-Prüfung nach dem Pages-Deploy** (rund zwei Minuten warten): Seite antwortet `200`,
   Konsole ohne CSP-Verstoss, Nav-Link auf der Solothurn-Seite, Sitemap gültig.
5. **E2E in Prod, genau eine Anfrage, Freigabe des Inhabers.** Vorbereitung: auf Render
   `META_TEST_EVENT_CODE` mit dem Code aus dem Meta-Events-Manager setzen (Deploy abwarten), damit
   der Server-Lead als Testereignis landet und nichts zählt. Im Browser keine Wahl im
   Consent-Banner treffen (Schweiz: GA4 misst, Ads und Pixel bleiben still). Absender klar
   erkennbar: Name `E2E-TEST Grenchen bitte loeschen`, eine Amanthos-Adresse des Inhabers,
   Nachricht `E2E-Test Verdrahtung <Datum>`, Wohnung 43. Prüfen und zitieren: Mail bei den
   Empfängern mit exaktem Betreff und ohne Klick-IDs; GA4-Echtzeit zeigt `generate_lead`;
   Meta-Testereignisse zeigen `Lead` mit der `event_id` aus dem Formular; Render-Log zeigt die
   `delivered`-Zeile ohne E-Mail. Danach `META_TEST_EVENT_CODE` wieder entfernen (Deploy
   abwarten) und die Testmail bei allen Empfängern löschen; Empfänger, die Claude nicht erreicht,
   werden vom Inhaber informiert.
6. **Ads-Conversion in Prod:** nicht mit einer echten Einwilligung auslösen (das zählte eine
   Conversion in 7751951431). Der Beleg ist der Harness-Aufruf aus Schritt 3 mit dem exakten
   `send_to`. Will der Inhaber die Live-Verdrahtung des Tags sehen, ist das ein Entscheid mit
   einer zu bereinigenden Test-Conversion (Abschnitt 7).
7. `quality.yml` per `workflow_dispatch` starten; Links, Web Vitals, axe und GSC grün, Werte für
   die neue URL aus der Zusammenfassung zitieren.
8. **Übergabe:** K11-URLs an die Kampagnen; GA4: `lead_form`, `unit`, `result_count` als
   ereignisbezogene benutzerdefinierte Dimensionen anlegen (UI, ohne sie erscheinen die
   Parameter nicht in Berichten); Google-Ads-Conversion 7751951431 auf „Zählung: eine"
   geprüft; Memory und diese Datei (`abgeschlossen`) nachziehen.

Gates der Verdrahtung, zitierbar: `node --test tests/` (Website), `pytest website-backend/tests`
und `ruff check website-backend` (Backend), axe 0 serious/critical, Lighthouse-Werte, `curl`
gegen `/health` und `/api/contact`, Screenshot Mail-Betreff, GA4-Echtzeit, Meta-Testereignis.

## 6. Parallelisierungsplan und Aufwand

| Welle  | Segmente                                                        | läuft gleichzeitig             | wartet auf                                                       |
| ------ | --------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------- |
| 0      | Segment 0 (Website, ein PR)                                     | allein                         | Freigabe des Plans; danach `status: aktiv` durch den Inhaber     |
| 1      | Segmente 1, 2, 3 (Website) und 4, 5 (Backend)                   | ja, fünf Worktrees             | Segment 0 gemergt und aktiv (Website); Backend sofort nach Freigabe des Plans |
| 2a     | Verdrahtung Schritt 1 (Backend, Render-Env, Deploy, Smoke)      | ein Kopf                       | Segmente 4 und 5 gemergt                                         |
| 2b     | Verdrahtung Schritte 2 bis 4 (Website, Sammelstellen, Live)     | ein Kopf                       | 2a live, Segmente 1 bis 3 gemergt                                |
| 3      | Verdrahtung Schritte 5 bis 8 (E2E, Quality-Lauf, Übergabe)      | ein Kopf                       | 2b live, Freigabe der E2E-Anfrage durch den Inhaber              |
| extern | Wert von `TERMIN_URL` (Bookings-Seite), Empfängerkreis, Kampagnen | parallel zu allem ab Welle 0 | Inhaber                                                          |

Bewusst NICHT parallelisiert: die Verdrahtung als Ganzes (Sammelstellen, Deploy-Reihenfolge, die
eine E2E-Anfrage gehören einem Kopf); Backend vor Website, damit `form: grenchen` beim ersten
Aufruf kein `400 Unknown form` bekommt. Nicht künstlich geteilt: Finder-Steuerung, Formular und
Ereignisse liegen in derselben Datei `grenchen-page.js` (ein Segment); der Schnitt in Datei-Teile
hätte Hook-Punkte in Segment 0 verlangt, die mehr kosten als sie sparen. Die Backend-Segmente
können mit Welle 0 starten, weil ihre Kontrakte Text sind und kein Gate auf sie wartet.

**Aufwand, geschätzt:** Segment 0 45 min, Segment 1 30 min, Segment 2 75 min, Segment 3 60 min,
Segment 4 25 min, Segment 5 35 min, Verdrahtung 90 min plus Wartezeiten auf Render und Pages
(je rund 2 bis 5 min, mehrfach). Agentenzeit rund 6 Stunden; Wanduhr bei fünf parallelen
Worktrees rund 4 Stunden, davon rund 1.5 Stunden Welle 1.

## 7. Risiken und offene Fragen

| Risiko oder Frage                                                                                                  | Auswirkung                                                                                   | Umgang                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Offen:** Wert von `GRENCHEN_RECIPIENTS` (nur `info@amanthosliving.com`, oder zusätzlich die Adresse des Beraters) | Anfragen landen im Sammelpostfach und warten                                                 | Inhaber nennt den Wert vor Welle 2a; Default bleibt `info@amanthosliving.com`                                                            |
| **Offen:** Wert von `TERMIN_URL` (Microsoft-Bookings-Seite oder nichts)                                            | Ohne Wert bleibt der Terminlink verborgen, die Terminvergabe läuft per Antwortmail            | Inhaber entscheidet; leer ist zulässig, kein Blocker                                                                                    |
| **Offen:** Wohnung 61 (`listed: false`, frei nur bis 30.04.2027)                                                   | Fehlt im Finder                                                                              | Verdrahtung stellt das Flag um, wenn der Inhaber sie trotz kürzerer Frist zeigen will                                                    |
| **Offen:** Vertragspartner (Amanthos oder Verwaltung), Kaution, Kündigungsfrist, Parkplatzpreis, Haustiere         | Die Seite schweigt dazu; Interessenten fragen nach                                            | Bewusst nicht behauptet (K10); nachziehen ist ein Textänderungs-PR, kein Segment                                                          |
| Datenschutzerklärung (`privacy/`) beschreibt Pixel und CAPI für Buchungen, nicht ausdrücklich Formular-Leads        | Formale Lücke                                                                                | Inhaber prüft; Anpassung ist ein eigener Text-PR in einer Sammelstelle, nicht Teil dieses Plans                                          |
| Quellfotos liegen in einem temporären Job-Verzeichnis                                                              | Sind sie weg, fehlt Segment 0 die Quelle                                                     | Segment 0 heute starten; sonst Fotos beim Berater erneut anfordern                                                                        |
| Segment 2 überschreitet 400 Zeilen                                                                                  | PR zu gross für einen Review                                                                 | Vorgesehener Schnitt (FAQ und Lage als Folgesegment 6, seriell)                                                                          |
| Rate-Limit `contact` (3 pro Minute je IP) ist mit dem Corporate-Formular geteilt; ein Büro hinter einer IP kann anstehen | Vereinzelt `429`                                                                          | Deutscher Hinweis mit Telefon; Anpassung des Limits ist ein eigener Entscheid                                                            |
| `type="month"` und `type="date"` fehlen in einzelnen Desktop-Browsern (Safari)                                      | Freitext statt Auswahl                                                                       | `pattern` und Platzhalter im HTML, Prüfung im Skript, Server sanitisiert statt abzulehnen                                                |
| CAPI-Lead in Prod zählt real, sobald `META_TEST_EVENT_CODE` fehlt                                                   | Testanfragen werden Leads in Meta                                                            | Verdrahtung Schritt 5 setzt den Code vorher und entfernt ihn nachher                                                                     |
| Branch-Protection des Website-Repos: ob `plan-abgleich` Required Check ist                                          | Ohne Eintrag wirkt der Check nur beratend                                                    | Inhaber trägt ihn ein, wenn gewünscht (Klickarbeit)                                                                                     |
| Gemeinsame `event_id`, aber ohne `fbp` im Body                                                                       | Etwas geringere Match-Qualität bei Meta                                                       | Bewusst so (Feldliste des Auftrags); `fbp` nachreichen wäre ein Feld in K3 und ein Folge-PR                                              |

## 8. Bewusst nicht geplant

- Speichern der Leads (Supabase, `tracking_store`) und Offline-Conversion-Upload der `gclid`
  (das Relay `conversion-relay` existiert; Anschluss ist ein eigener Plan).
- Google-Anrufconversion für den `tel:`-Link (nur ein GA4-Ereignis `phone_click`).
- Mehrsprachigkeit der Seite (`i18n.js`, `locales/`); die Seite ist deutsch und eigenständig.
- Änderungen an `js/meta.js` (Ereignistabelle) und `js/consent.js`; der Lead-Aufruf geht direkt
  an `fbq` mit derselben Einwilligungsprüfung.
- Eine Bewerbungs- oder Dossierstrecke (Betreibungsauszug, Referenzen); das ist der Schritt nach
  der Besichtigung und läuft ausserhalb der Site.
- Automatische Antwortmail an die anfragende Person (Autoresponder); Reply-To reicht für die
  Antwort durch den Berater.
- Ein Livestand aus Apaleo für „verfügbar ab"; die Daten sind statisch in K1 und werden per PR
  gepflegt.
- Aussenaufnahmen des Gebäudes (ausdrücklich ausgeschlossen) und `jpg`-Fallbacks.
- Ein Umbau des Corporate-Kontaktformulars oder des Rate-Limits.

## 9. Was beim Schreiben dieses Plans nicht geprüft werden konnte

- Die Apaleo-Belegung wurde nicht neu gelesen; K1 übernimmt die vom Auftraggeber genannten
  Daten (Stand 07.09.2026). Ändert sich die Belegung bis zum Merge, ist K1 anzupassen.
- Die sechs Quellfotos wurden nicht angesehen, nur ihre Masse gemessen (fünf mal 5000 x 3262,
  einmal 4762 x 2817); Alt-Texte in K9 sind Entwürfe nach der Beschreibung des Auftraggebers.
- Ob die Google-Ads-Conversion 7751951431 auf „eine Zählung je Klick" und als Primärconversion
  steht (nur Wert von `send_to` bekannt).
- Ob `META_PIXEL_ID` und `META_CAPI_ACCESS_TOKEN` auf dem Dienst `amanthos-website-api` gesetzt
  sind (Render-Env nicht gelesen; ohne sie ist `send_lead` ein No-op und meldet das einmal im
  Log).
- Die Branch-Protection des Website-Repos und ob die Hooks auf der zweiten Maschine identisch
  installiert sind (nur Studio geprüft).
- Ob Microsoft Bookings für den Berater eingerichtet ist (Entscheid und Einrichtung beim
  Inhaber).
- Die tatsächlichen Dateigrössen der webp-Dateien bei Qualität 78 (Ziel unter 200 KB ist eine
  Annahme aus den bestehenden 1200-px-Dateien mit 35 bis 130 KB).
