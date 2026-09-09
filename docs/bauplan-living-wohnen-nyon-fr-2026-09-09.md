---
thema: living-wohnen-nyon-fr
datum: 2026-09-09
status: draft
repo: ~/Projects/amanthos-living-website
plankey: living-wohnen-nyon-fr
ziel-repos:
  - AmanthosInternational/amanthos-living-website (PUBLIC, GitHub Pages, www.amanthosliving.com; Segmente 0 bis 3)
  - AmanthosInternational/amanthos-platform (PRIVATE, Ordner website-backend, Render-Service amanthos-website-api; Segmente 0 und 4)
verdrahtung-zusaetzlich: AmanthosInternational/AmanthosWebseiten (scripts/ads-living-kampagnen.py, Branch feature/living-kampagnen, PR #63), Google Ads (Konto im Master), Render-Env, Plausible
grundlage: AmanthosWebseiten docs/living/analyse-standort-living-2026-09-09.md (Branch docs/living-analyse-2026-09-09, PR #62); Entscheide des Inhabers 09.09.2026, 02:30 und 03:00
basis-website: origin/main 9e1410b (126 Tests gruen mit node --test tests/*.test.mjs, Node 25.9.0; gemessen 09.09.2026)
basis-backend: origin/main c5fb27a (416 Tests gruen, ruff sauber; gemessen 09.09.2026 an einem git-archive-Auszug mit dem Python 3.14.5 der Repo-venv, CI laeuft 3.11)
vorbilder: amanthos-living-website docs/bauplan-grenchen-mieten-2026-09-07.md (verdrahtet), docs/bauplan-fbl-ibe-2026-09-06.md (Plankopien ueber mehrere Repos)
---

# Bauplan: Abschnitt „Wohnen auf Zeit" auf /zurich/ mit Anfrageformular und Messung, plus französische Nyon-Seite

> **Auszug fuer das oeffentliche Repo (Abschnitt 0a).** Der Master liegt in
> `amanthos-ai-agents/docs/bauplan-living-wohnen-nyon-fr-2026-09-09.md`. Nicht in diesem
> Auszug: Abschnitt 1 (Messbefunde mit Preisen), K7, K10, Segment 4, Abschnitt 5, 7, 8, 9.
> Die Scope- und Kriterienbloecke der Segmente 0 bis 3 und der Sammelstellen sind mit dem
> Master zeilengleich (`bauplan-scope.sh files` und `sammelstellen`).

> **Scharfschalten:** Vor Beginn des Parallelbaus stellt der Inhaber `status:` in den Plankopien
> beider Ziel-Repos und in dieser Datei auf `aktiv`. Solange `draft` steht, sind Edit-Gate,
> Commit-Gate und der PR-Check `plan-abgleich` stumm. Segment-Branches heissen in beiden Repos
> `segment/living-wohnen-nyon-fr/<nr>-<slug>`; nur dort greifen die Gates. Jeder Commit trägt im
> Body den Block:
>
> ```
> Plan-Abgleich:
>   erledigt: <Abschnitte>
>   offen: <was aussteht>
>   abweichung: <keine | was anders gebaut wurde und warum>
> ```
>
> Bauagenten committen nach jedem Teilschritt, nicht erst am Ende. Überschreitet ein Segment
> die 400 Zeilen Produktivcode, hält der Agent an und meldet es; er teilt nicht selbst.
> Testzeilen zählen nicht. Kein Segment erstellt einen PR und merged nichts.

## 0. Trennlinie und Randbedingungen (gelten für jeden Schritt)

| Claude darf | Nur der Inhaber |
|---|---|
| Code in den Segment-Scopes beider Repos schreiben, Branches pushen | Merge-Freigabe je PR |
| Die Seiten lokal über den Harness (`tests/dev-server.py`) im Browser prüfen | `status: aktiv` in den drei Plandateien setzen |
| `/api/offers` des Live-Backends lesend aufrufen (dieselbe Strecke wie die Buchungsmaske) | Werte von `LIVING_LONGSTAY_RECIPIENTS` und `LIVING_LONGSTAY_SMS_TO`, die eine E2E-Anfrage in Prod, Kampagnenbudgets |
| In der Verdrahtung Render-Env setzen, Google-Ads-Conversion-Aktion anlegen, Kampagne pausiert anlegen, GA4-Echtzeit, Meta-Testereignisse und Render-Logs lesen | Kampagnen einschalten, Branch-Protection, Apaleo-Ratenpläne und Preise |

- **Keine Produktions-Schreibzugriffe** ausser den in Abschnitt 5 genannten Verdrahtungsschritten
  (Render-Env, Google-Ads-Conversion-Aktion und pausierte Kampagne, temporär
  `META_TEST_EVENT_CODE`). Kein Segment schreibt in Apaleo, Supabase, Meta oder Google. Apaleo
  wird ausschliesslich lesend über `/api/offers` berührt.
- **Gästedaten und Personendaten:** Kein Segment liest, loggt oder committet Personendaten.
  Test-Fixtures sind synthetisch (`Testperson Muster`, `test-lead@example.com`,
  `+41 79 123 45 67`). Neue Log-Zeilen tragen höchstens Formularart, Einzugsmonat, Dauer,
  Empfängerkreis und die ersten acht Zeichen der `event_id`. Wer ein Feld zeigen muss, schreibt
  `"email": "<redacted>"`. Hat ein Agent versehentlich Personendaten committet, meldet er Datei
  und Zeile, statt still zu korrigieren.
- **Öffentliches Repo:** `amanthos-living-website` ist PUBLIC und wird komplett über GitHub
  Pages ausgeliefert, auch `docs/` und `tests/`. Die Plankopie dort ist ein Auszug (Abschnitt
  0a): keine Render-IDs, keine internen Mailadressen ausser `info@amanthosliving.com`, keine
  Belegungs- oder Preistabellen aus diesem Abschnitt, keine Namen von Gästen. Die Namen der
  Empfänger stehen nur in dieser Datei und im Render-Env, nie im Code.
- **Nichts behaupten, was nicht in K11 (Zürich) oder K8 (Nyon) steht.** Insbesondere keine
  Aussagen zu Wohnsitzanmeldung, Mindestaufenthalt, Kaution, Nebenkosten, Kurtaxe,
  Reinigungsrhythmus, Parkplatzgarantie, Vertragspartner. Unbekanntes heisst „auf Anfrage".
- **Preisaussagen** nur aus `/api/offers` zur Laufzeit (Zürich) oder wörtlich von der
  bestehenden Seite (Nyon: „dès CHF 99 la nuit"). Kein Segment schreibt eine Preiszahl in
  Code oder HTML.
- **Prod-System im Backend-Repo** (Gäste-PII über das Formular): Segment 4 ist auf eine
  Sitzung von höchstens 30 Minuten geschnitten. Mails werden in Tests nie gesendet
  (`smtplib.SMTP` gemockt), CAPI nie gerufen (`send_lead` gemockt), SMS nie gesendet.
- **Repo-Konventionen Backend:** stdlib-pur, `print()`-Logging, Tests unter
  `website-backend/tests/`, Module über den Dateipfad laden (Muster
  `tests/test_contact_grenchen.py`), `ruff check` grün, `mypy` beratend. **Website:** Vanilla JS
  im Stil von `js/grenchen-page.js` (IIFE, `var`, `module.exports` für `node --test`, DOM-Start
  nur mit `document`), keine Build-Stufe, keine Dependencies, kein `package.json`.
- **Sprache:** Deutsch mit Schweizer Orthografie (ss) auf `/zurich/`, Französisch auf der
  Nyon-Seite, Englisch in `en.json`. Kein Gedankenstrich in Texten, Commits, PR-Beschreibungen,
  Code-Kommentaren. Code, Commits, PRs auf Englisch.

## 0a. Zwei Repos, drei Plandateien: wo die Gates lesen

Geprüft am 09.09.2026: `~/scripts/bauplan-scope.sh` ist identisch mit
`claude-mcp-setup/scripts/bauplan-scope.sh` (`diff -q` leer); `.github/workflows/plan-abgleich.yml`
liegt in beiden Ziel-Repos (Website seit 06.09., Platform seit dem fbl-ibe-Plan).

- **Master** ist diese Datei in `amanthos-ai-agents` (privat). Sie trägt alle Scope-Blöcke;
  jeder Block beginnt mit einer `# repo: <name>`-Kommentarzeile, die der Parser ignoriert.
  Pfade sind relativ zur Wurzel des jeweils genannten Repos.
- **Plankopie Backend** (`amanthos-platform`, privat): vollständige Kopie unter
  `docs/bauplan-living-wohnen-nyon-fr-2026-09-09.md`, angelegt von Segment 0.
- **Plankopie Website** (`amanthos-living-website`, PUBLIC): Auszug unter demselben Pfad,
  angelegt von Segment 0. Enthält: Frontmatter (identisch bis auf `repo:`), Abschnitt 0, 0a,
  die Kontrakte K1 bis K6, K8, K9, K11, die Segmentabschnitte 0 bis 3 (Auftrag, Scope,
  Kriterien, Out-of-Scope, Testplan), den Sammelstellen-Block. Nicht im Auszug: Abschnitt 1
  (Messbefunde mit Preisen), K7, K10, Segment 4, Abschnitt 5, 7, 8, 9. Drift-Schutz:
  `bauplan-scope.sh files <auszug> <nr>` (nr 0 bis 3) und `sammelstellen <auszug>` liefern
  Zeile für Zeile dasselbe wie der Master (Kriterium in Segment 0).
- **Branches:** `segment/living-wohnen-nyon-fr/<nr>-<slug>` in beiden Repos. Ein Segment
  existiert nur in einem Repo (Segment 0 in beiden, mit je eigenem PR); die Blöcke der übrigen
  Segmente matchen dort nie eine Datei und stören nicht.
- **Dateien, die Segment 0 anlegt und danach nur die Verdrahtung anfasst:** `js/i18n.js`
  (K6), `js/longstay-config.js` (Verdrahtung trägt `ADS_SEND_TO` ein), `tests/dev-server.py`.
  Sie stehen nicht im Sammelstellen-Block, weil „Sammelstellen schlagen Segment-Scope" sonst
  Segment 0 blockierte. Für die Segmente 1 bis 3 sind sie ausserhalb des Scopes, das Edit-Gate
  blockt sie.
- **Required Check:** Ob `plan-abgleich` in der Branch-Protection beider Repos eingetragen ist,
  wurde nicht abgefragt (Abschnitt 9). Der Workflow läuft auf jedem PR und endet grün, wenn er
  nicht zuständig ist.

## 2. Segment 0: Kontrakte (sequenziell, vor allem anderen)

Zwei PRs, je Repo einer, beide gemergt und auf `aktiv` gestellt, bevor ein Segment der Welle 1
abzweigt. Branch `segment/living-wohnen-nyon-fr/0-kontrakte` in beiden Repos.

**Dateien:**

```bauplan-scope segment=0
# repo: amanthos-living-website
docs/bauplan-living-wohnen-nyon-fr-2026-09-09.md
js/i18n.js
js/longstay-config.js
tests/dev-server.py
tests/i18n-fixed.test.mjs
tests/longstay-contract.test.mjs
tests/fixtures/longstay-dom-contract.json
tests/fixtures/longstay-skeleton.html
tests/fixtures/offers-gbal-30.json
# repo: amanthos-platform
docs/bauplan-living-wohnen-nyon-fr-2026-09-09.md
```

**Inhalt (Website):**

1. `js/longstay-config.js` nach K1 (`ADS_SEND_TO` bleibt leer).
2. `js/i18n.js` um den festen Sprachmodus nach K6, mit `tests/i18n-fixed.test.mjs`.
3. `tests/fixtures/longstay-dom-contract.json` nach K5 (IDs, Klassen, `data-i18n`-Schlüssel).
4. `tests/fixtures/longstay-skeleton.html`: die kleinste Seite, die alle Kontrakt-IDs aus K5
   trägt, `lang="de"`, `data-i18n-fixed`, dieselben Skripte lädt wie `/zurich/` nach Segment 1
   (`consent.js`, `meta.js`, gtag-Loader, `i18n.js`, `longstay-config.js`, `longstay-page.js`),
   `<meta name="robots" content="noindex">`. Segment 2 testet dagegen im Browser, solange
   Segment 1 nicht gemergt ist.
5. `tests/fixtures/offers-gbal-30.json`: die fünf am 09.09.2026 gemessenen 30-Nächte-Angebote
   (Ratenplan, Einheitengruppe, `totalGrossAmount`, `averagePerNight`, `availableUnits`; keine
   Personendaten, es sind Listenpreise) für den Harness.
6. `tests/longstay-contract.test.mjs`: prüft K1 (Schlüssel vorhanden, `ADS_SEND_TO` leer oder
   `^AW-\d+/[A-Za-z0-9_-]+$`, `NIGHTS` 30, `PROPERTY` GBAL, `MAX_PERSONS` 3) und, sobald die
   Dateien existieren, K5: jede ID aus dem Fixture kommt in `zurich/index.html` genau einmal
   vor, jedes `getElementById('...')`-Literal in `js/longstay-page.js` steht im Fixture, jeder
   `data-i18n`-Schlüssel `longstay.*` aus dem HTML existiert in `locales/de.json` und
   `locales/en.json`. Fehlt eine Datei, wird der Teil übersprungen, nicht rot.
7. `tests/dev-server.py` nach K9.
8. Plankopie (Auszug) nach Abschnitt 0a.

**Inhalt (Backend):** nur die Plankopie. K3 und K7 sind Text und für Segment 4 bindend.

### K1: Konstanten (`js/longstay-config.js`)

IIFE nach dem Muster von `js/grenchen-config.js`, Export als `module.exports` und
`window.LONGSTAY_CONFIG`, keine Logik, kein DOM:

| Schlüssel | Wert |
|---|---|
| `API_BASE` | wie in `grenchen-config.js` (`typeof window.AMANTHOS_API_BASE === 'string'`, sonst `https://amanthos-website-api.onrender.com`) |
| `CONTACT_PATH` | `/api/contact` |
| `OFFERS_PATH` | `/api/offers` |
| `PROPERTY` | `GBAL` |
| `NIGHTS` | `30` |
| `MAX_PERSONS` | `3` (`MAX_GUESTS.GBAL` in `booking.js`) |
| `FORM` | `living-longstay` |
| `SECTION_ID` | `wohnen-auf-zeit` |
| `PAGE_URL` | `https://www.amanthosliving.com/zurich/` |
| `GA4_ID`, `ADS_ID` | `G-8LPLG0BPJ6`, `AW-702540316` |
| `ADS_SEND_TO` | `''` (leer heisst: kein Conversion-Aufruf; die Verdrahtung trägt `AW-702540316/<label>` ein) |
| `PHONE`, `PHONE_HREF` | `+41 41 562 97 00`, `tel:+41415629700` (Nummer aus dem JSON-LD von `zurich/index.html`) |
| `EMAIL` | `info@amanthosliving.com` |
| `VERSION` | `'1'` |

### K2: Monatspreis zur Laufzeit (Website, Segment 2)

- **Fenster:** `quoteWindow(today, moveIn)` liefert `{ arrival, departure, month }`. Ohne
  gültigen `moveIn` (`YYYY-MM`): `arrival` = erster Tag des Folgemonats. Mit `moveIn` in einem
  künftigen Monat: erster Tag dieses Monats. Mit `moveIn` im laufenden Monat: `today + 2 Tage`.
  `moveIn` in der Vergangenheit gilt als leer. `departure` = `arrival + NIGHTS` Tage.
  `month` = `YYYY-MM` von `arrival`. Alles über lokale Mitternacht, Muster `deeplink.js`.
- **Abfrage:** `GET API_BASE + OFFERS_PATH + '?propertyId=GBAL&arrival=..&departure=..&adults=<persons|1>'`,
  `mode: 'cors'`. Drei Versuche (sofort, nach 4 s, nach 10 s) nur bei Netzfehler
  (Render-Kaltstart, Muster `fetchOffers` in `booking.js`); bei HTTP-Fehler kein Retry.
- **Auswahl:** `pickOffer(offers)` = das Angebot mit dem kleinsten `totalGrossAmount.amount`;
  `null` bei leerer Liste oder wenn `data.nights !== NIGHTS`.
- **Anzeige:** `formatChf(2875)` = `CHF 2'875`. Preiszeile „ab CHF 2'875 pro Monat", darunter
  „30 Nächte ab <Monat als Name und Jahr>, <unitGroupName>, <Bedingung>, Preis der
  Buchungsmaske heute". `<Bedingung>`: `category === 'Non-Refundable'` heisst „Vorauszahlung,
  nicht erstattbar", sonst „stornierbar". Kein anderes Feld des Angebots wird gezeigt.
- **Rückfall:** Netzfehler nach drei Versuchen, HTTP-Fehler, leere Liste oder falsche
  Nächtezahl: „Monatspreis auf Anfrage. Senden Sie uns Einzugsmonat und Dauer, wir melden uns
  mit einem Angebot." Nie eine Zahl aus einem anderen Fenster, nie eine gespeicherte Zahl.
- **Neuberechnung:** bei Änderung von `ls-movein` oder `ls-persons` (entprellt 400 ms), und
  beim Ereignis `languageChanged` nur der Text (keine neue Abfrage).
- **Direkt buchen:** Knopf `ls-book` ruft `window.amanthosBooking.setSearch({ propertyId:
  'GBAL', arrival, departure, adults: <persons|1>, children: 0 })` mit dem aktuellen Fenster;
  `booking.js` rendert die Angebote im bestehenden `#booking`. Ohne `window.amanthosBooking`
  bleibt der Knopf verborgen. Darf entfallen, wenn Segment 2 über 400 Zeilen kommt.
- **Zitierte Angebotsdaten** landen im Formular-Payload (K3: `quoted_month`, `quoted_price`,
  `quoted_unit`, `quoted_rate`), damit der Verkauf sieht, was der Gast gesehen hat.

### K3: Formular-JSON an `POST /api/contact` (Website und Backend)

Body ist JSON, `Content-Type: application/json`, höchstens 65 KB (bestehende Grenze). Alle Werte
Strings. Die Website sendet immer alle 19 Schlüssel, leer als `""`.

| Schlüssel | Website sendet | Backend prüft (`contact_longstay.parse`) |
|---|---|---|
| `form` | `"living-longstay"` | Pflicht, sonst `400 Unknown form.` |
| `name` | Eingabe, getrimmt | Pflicht, nach Trim mindestens 2 Zeichen, sonst `400`; gekürzt auf 200 |
| `email` | Eingabe, getrimmt | Pflicht, Regex `^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$`, sonst `400`; gekürzt auf 200; wird `Reply-To` |
| `phone` | Eingabe | optional, einzeilig, gekürzt auf 40 |
| `move_in` | `YYYY-MM` aus `ls-movein`, sonst `""` | `^\d{4}-(0[1-9]\|1[0-2])$`, sonst `""` |
| `duration_months` | Ganzzahl-String aus `ls-duration` (1 bis 24), sonst `""` | `^\d{1,2}$` und 1 bis 24, sonst `""` |
| `persons` | `"1"`, `"2"`, `"3"` aus `ls-persons` | Menge `{"1","2","3"}`, sonst `""` |
| `quoted_month` | `YYYY-MM` des angezeigten Fensters, sonst `""` | wie `move_in` |
| `quoted_price` | Ganzzahl-String in CHF des angezeigten Angebots, sonst `""` | `^\d{1,6}$`, sonst `""` |
| `quoted_unit` | `unitGroupName` des Angebots, sonst `""` | einzeilig, gekürzt auf 60 |
| `quoted_rate` | `ratePlanCode` des Angebots, sonst `""` | `^[A-Z0-9_-]{1,32}$`, sonst `""` |
| `message` | Freitext | gekürzt auf 5000 |
| `event_id` | beim Laden erzeugt wie in `grenchen-page.js` (`crypto.randomUUID()`, Fallback `'g-' + ...`) | `^[A-Za-z0-9-]{8,64}$`, sonst serverseitig `uuid4()` |
| `utm_source`, `utm_medium`, `utm_campaign` | aus `location.search`, ohne Einwilligung, nie gespeichert | nach Trim `^[A-Za-z0-9._-]{1,64}$`, sonst `""` |
| `gclid`, `fbclid` | nur aus `window.amMeta.tracking()`, also nur mit Einwilligung | gekürzt auf 512, nie in der Mail, nie im Log |
| `company_website` | Honigtopf, immer `""` bei Menschen | wie bisher: gefüllt heisst Bot, `200 {ok:true}` ohne Mail, ohne CAPI |

Antworten wie beim Grenchen-Formular: `200 {"ok": true}` nach zugestellter Mail (synchron),
`400`, `413`, `429` (Rate-Limit `contact`, 3 je Minute je IP), `502`, `503`. Die Website zeigt
eigene Texte je Statuscode in der Seitensprache (`window.getLang()`, `de` und `en`, sonst `de`)
und gibt den Servertext nie aus:

- `200` de: „Vielen Dank. Wir melden uns innert eines Werktags mit einem Angebot." en: "Thank
  you. We will get back to you within one working day with an offer."
- `400` de: „Bitte prüfen Sie Name und E-Mail-Adresse." en: "Please check your name and email
  address."
- `429` de: „Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es in einer Minute erneut."
- `502`, `503`, Netzfehler: „Die Anfrage konnte nicht gesendet werden. Rufen Sie uns an:
  +41 41 562 97 00, oder schreiben Sie an info@amanthosliving.com." (Telefon als `tel:`-Link,
  Adresse als `mailto:`), englisch sinngleich.

### K4: Ereignisse und Messung (Website, Segment 2)

Alle Aufrufe in `try/catch`, keiner darf die Seite brechen. Kein Ereignis trägt Name, E-Mail,
Telefon oder Nachricht.

| Moment | GA4 (`gtag`, immer; Consent Mode regelt die Übertragung) | Google Ads (nur `window.amConsent.get() === 'granted'` und `ADS_SEND_TO` nicht leer) | Meta (nur Einwilligung und `typeof window.fbq === 'function'`) | Plausible (wenn `window.plausible`) |
|---|---|---|---|---|
| Preis geladen | `longstay_quote` `{ month, price, unit }` | | | |
| Klick `ls-book` | `longstay_book_click` `{ month }`; danach feuert `booking.js` sein `view_offers` | | | |
| Klick auf `tel:`-Link im Abschnitt | `phone_click` `{ lead_form: 'living-longstay' }` | | | |
| Antwort `200` auf die Anfrage | `generate_lead` `{ lead_form: 'living-longstay', duration_months, persons }` | `gtag('event', 'conversion', { send_to: ADS_SEND_TO })` | `fbq('track', 'Lead', { content_name: 'living-longstay' }, { eventID: event_id })` | `plausible('Lead', { props: { form: 'living-longstay' } })` |

- `generate_lead`, Conversion, Meta-Lead und Plausible feuern **erst nach `200`**, nie beim Klick.
- Meta: Browser-Lead und Server-Lead tragen dieselbe `event_id` (K3, K7), Meta dedupliziert auf
  dem Living-Pixel `1113120988050573` (`js/meta.js`, `META_PIXEL_ID_LIVING`).
- Plausible: das Ziel `Lead` existiert seit 09.09.2026 (Angabe des Auftraggebers, nicht selbst
  geprüft); die Eigenschaft `form` trennt Zürich von Grenchen (Grenchen sendet heute ohne
  Eigenschaft; das bleibt so).
- Google Ads: Muster `leadEvents` in `grenchen-page.js`, ohne `value`.
- Gespeichert wird nichts: kein `localStorage`, kein Cookie.

### K5: DOM-Kontrakt zwischen Abschnitt (Segment 1) und Skript (Segment 2)

Segment 1 setzt jede ID genau einmal, Segment 2 spricht nur diese IDs an. Das Fixture
`tests/fixtures/longstay-dom-contract.json` ist die eine Quelle; hier die Liste:

- Abschnitt: `wohnen-auf-zeit` (`<section class="section section-alt ls-section" hidden>`),
  Nav-Eintrag `ls-nav` (`<li hidden>`), beides bis zur Verdrahtung verborgen.
- Preis: `ls-price` (Preiszeile), `ls-price-note` (Fenster, Einheit, Bedingung), `ls-book`
  (Knopf, initial `hidden`).
- Formular: `ls-form` (`novalidate`), `ls-name` (`name`, `autocomplete="name"`, `required`),
  `ls-email` (`email`, `required`), `ls-phone` (`tel`), `ls-movein` (`type="month"`,
  `min` = laufender Monat, `max` = laufender Monat plus 18), `ls-duration` (`type="number"`,
  `min="1"`, `max="24"`, `step="1"`), `ls-persons` (`select`, Optionen 1, 2, 3), `ls-message`
  (`textarea`), `ls-company-website` (Honigtopf in `<div class="ls-hp" aria-hidden="true">`,
  `tabindex="-1"`, `autocomplete="off"`), `ls-submit`, `ls-status` (`role="status"`),
  `ls-success` (`hidden`).
- Klassen aus `css/style.css`: `section`, `section-alt`, `container`, `container-narrow`,
  `section-label`, `section-title`, `section-subtitle`, `btn`, `btn-accent`, `btn-lg`,
  `btn-outline`, `form-grid`, `form-field`. Neu in `css/longstay.css`: `ls-section`,
  `ls-section[hidden]` (`display:none !important`, weil `.section` sonst das
  `hidden`-Attribut übersteuert), `ls-price`, `ls-price-note`, `ls-benefits`, `ls-hp`,
  `ls-status`, `ls-success`, `ls-actions`.
- `data-i18n`-Schlüssel (alle unter `longstay.`): `nav`, `label`, `title`, `intro`, `price_loading`,
  `benefit_kitchen`, `benefit_wifi`, `benefit_desk`, `benefit_parking`, `benefit_checkin`,
  `benefit_airport`, `form_title`, `name`, `email`, `phone`, `move_in`, `duration`, `persons`,
  `message`, `submit`, `note`, `book`. Die Werte für `de` und `en` liegen in den Sprachdateien
  (Segment 1); der Text im HTML ist die deutsche Fassung. Dynamische Texte (Preiszeile,
  Statusmeldungen, Erfolgstext) kommen aus `js/longstay-page.js` mit eigener `de`/`en`-Tabelle
  und `window.getLang()`.

### K6: Fester Sprachmodus in `js/i18n.js` (Segment 0)

Trägt `<html>` das Attribut `data-i18n-fixed`, gilt:

1. `detectLanguage()` liefert die ersten zwei Zeichen von `document.documentElement.lang`, wenn
   die Sprache in `SUPPORTED_LANGS` steht, sonst `en`; `?lang=`, `localStorage` und Browsersprache
   werden nicht gelesen und nichts wird in `localStorage` geschrieben.
2. `applyTranslations()` übersetzt `[data-i18n]`, `[data-i18n-placeholder]`, `[data-i18n-aria]`
   wie bisher, setzt aber **nicht** `lang`, `document.title` und die Meta-Description.
3. `buildSelector()` und `updateSelector()` tun nichts (die Seite hat keinen `#langSelector`).
4. `window.t`, `window.getLang`, `window.amLangs`, das Ereignis `languageChanged` und das
   Verhalten aller Seiten **ohne** das Attribut bleiben unverändert (Test).

`tests/i18n-fixed.test.mjs` lädt `js/i18n.js` in einem `node:vm`-Kontext mit einem minimalen
`document` (`documentElement` mit `getAttribute`/`setAttribute`, `querySelectorAll` leer,
`readyState 'complete'`, `addEventListener`, `title`), einem `XMLHttpRequest`-Ersatz, der
`locales/<lang>.json` von der Platte liest, `localStorage` als Rekorder und `navigator.language`
`de-CH`. Prüft: mit `lang="fr"` und Attribut ist `getLang()` `fr`, `t('booking.select')` gleich
dem Wert aus `fr.json`, `lang` und `title` unverändert, `localStorage.setItem` nie gerufen; ohne
Attribut und mit gespeichertem `de` ist `getLang()` `de` und `lang` wird auf `de` gesetzt (das
heutige Verhalten).

### K8: Französische Nyon-Seite (Segment 3)

**URL: `/appartements-nyon/`.** Begründung nach dem Muster von `grenchen-louer`: Die Site
benennt Schwesterseiten mit einem Schlüsselwort in der Zielsprache, nicht mit einem
Sprachsuffix (`grenchen-mieten` zu `grenchen-louer`); `/fr/`, `/de/`, `/it/` sind auf dieser
Site Weiterleitungsstümpfe auf `/?lang=xx`, ein `/nyon-fr/` würde diese Konvention mit einer
echten Seite vermischen. `appartements nyon` ist der Kern der französischen Suchbegriffe aus
der Analyse (`appartement meublé nyon`, `appart hôtel nyon`, `studio meublé nyon mois`) und
steht in Anzeige-Pfad und Adresszeile lesbar. Verworfen: `/nyon-fr/` (Sprachcode statt
Schlüsselwort), `/hotel-nyon/` (die Seite verkauft Apartments, und „hôtel" ist nur eine der
Suchintentionen).

**Kopf**, in dieser Reihenfolge wie `nyon/index.html`: CSP-Meta als erstes Element, **byte-identisch**
mit `nyon/index.html` (md5 der `content`-Zeile zitieren); `consent.js` synchron; `meta.js`
`defer`; gtag-Loader wörtlich von `nyon/`; `<html lang="fr" data-i18n-fixed>`; Titel
„Appartements meublés à Nyon avec vue sur le lac Léman | Amanthos Living"; Meta-Description auf
Französisch aus K8-Fakten; `canonical` auf die FR-Seite; `hreflang` `en` auf `/nyon/`, `fr` auf
die FR-Seite, `x-default` auf `/nyon/`; Open Graph mit `og:locale fr_CH`, `og:url` FR,
`og:image` wie `nyon/`; Icon, Font-Preloads, kritisches Inline-CSS und der `style.css`-Ladetrick
wie `nyon/`; JSON-LD `LodgingBusiness` wie `nyon/` mit `url` der FR-Seite, `inLanguage: fr`,
Adresse, Geo, `priceRange`, `numberOfRooms`, `aggregateRating` (4.3, 50) unverändert
übernommen; Sentry-CDN plus `sentry-init.js`; Plausible-Snippet.

**Skripte am Ende des `body`, alle `defer`:** `i18n.js`, `app.js`, `deeplink.js`, `booking.js`,
`chat.js`. `deeplink.js` neu gegenüber `nyon/`: damit `?property=NYAL&arrival=..` und die
`utm_*`-Kampagne im Buchungs-Payload ankommen (heute ohne Apaleo-Wirkung, Abschnitt 8).

**Nav:** Accueil (`../`), Toutes les adresses (`../#locations`), Zurich (`../zurich/`), Soleure
(`../solothurn/`), FAQ (`../#faq`), `<a href="../nyon/" lang="en" hreflang="en">English</a>`,
CTA „Réserver à Nyon" (`#book`). Kein `langSelector`.

**Abschnitte** wie `nyon/`: Hero (H1 „Nyon / Duillier", Badge „Note 4,3 · Vue sur le lac
Léman", Untertitel, CTAs „Voir les disponibilités" und „Voir les photos"), Vertrauensleiste
(meilleur prix garanti, annulation gratuite disponible, check-in autonome 24h/24, vue sur le
lac et les Alpes), Buchungsmaske mit allen IDs aus `nyon/` (`bookingBar`, `bb-location`
Wert `NYAL`, `bb-children`, `daterangeWrap`, `daterangeLabel` mit `data-i18n="booking_bar.set_dates"`,
`guestsWrap`, `guestsLabel`, `bb-guests`, `bb-checkin`, `bb-checkout`, `nightsBadge`,
`bookingSearchBtn` mit `data-i18n="booking_bar.search_btn"`), Galerie (fünf Bilder von `nyon/`,
französische Alt-Texte), Lage (Adresse, zwei Absätze, Ausstattungsliste), Buchungskarte
(Distanzen Nyon 4 km, aéroport de Genève 30 km, Lausanne 35 km, rives du lac 3 km), „Pourquoi
réserver en direct", Gästestimmen (die drei Zitate **im englischen Original** mit `lang="en"`
am Zitat, Überschriften französisch; keine erfundenen Übersetzungen), Ergebnisbereich
`#booking` mit allen IDs aus `nyon/` (`offersLoading`, `offersGrid`, `upsellSection`,
`upsellUpgrade`, `upsellUpgradeCards`, `extra-parking`, `extra-towels`, `extra-pillows`,
`upsellTotal`, `upsellTotalAmount`, `upsellPerNight`, `upsellContinueBtn`, `guestForm`,
`guest-first`, `guest-last`, `guest-email`, `guest-phone`, `confirmBookingBtn`,
`cancelBookingBtn`, `bookingStatus`) mit französischen Beschriftungen, „Nos autres adresses"
(Zurich Airport: 22 suites, 1 km de l'aéroport, dès CHF 109 la nuit; Soleure/Grenchen: 23
appartements, dès CHF 49 la nuit), Footer (Accueil, Confidentialité `../privacy/` mit
`hreflang="en"`, Mentions légales `../imprint/`, Button „Paramètres des cookies" mit
`window.amConsent.open()`).

**Faktenblatt Nyon (alles, was behauptet werden darf; Quelle `nyon/index.html` und die
Living-Karten auf `zurich/index.html`):** 12 appartements; vue sur le lac Léman et les Alpes;
bâtiment de caractère près du château de Duillier; Rue du Château 11, 1266 Duillier; parking
disponible; dès CHF 99 la nuit; note 4,3 (50 avis); Wi-Fi haut débit gratuit; kitchenette;
Smart TV; check-in digital; café et thé offerts; ménage régulier; lits confortables; accès à
Nyon, Genève et Lausanne en train ou en voiture; Nyon 4 km, aéroport de Genève 30 km, Lausanne
35 km, rives du lac 3 km; meilleur prix garanti, annulation gratuite disponible, confirmation
immédiate, pas de frais de réservation, aucun prépaiement requis; téléphone +41 41 562 97 00,
info@amanthosliving.com. **Nicht behaupten:** séjours mensuels oder hebdomadaires (steht nicht
auf `/nyon/`, nur in Anzeigentexten; Abschnitt 7), Kurtaxe, Frühstück, Mindestaufenthalt,
Vertragspartner.

**`locales/fr.json` (Segment 3, nur Ergänzungen, keine Änderung bestehender Werte):**
`booking_bar.set_dates` „Choisir les dates", `booking_bar.search_btn` „RECHERCHER",
`calendar.select_checkin` „Choisissez la date d'arrivée", `calendar.select_checkout`
„Choisissez la date de départ", `booking.flexible` „Flexible", `booking.checking_payment`,
`booking.did_not_pay_cancel`, `booking.keep_checking`, `booking.or_contact`,
`booking.payment_not_confirmed_yet`, `booking.payment_processing_wait` (Übersetzungen der
englischen Literale aus `booking.js`, Zeilen mit `window.t ? window.t('<key>') : '<Literal>'`).

### K9: Harness (`tests/dev-server.py`, Segment 0)

- Liefert zusätzlich `/zurich/`, `/zurich/index.html`, `/tests/fixtures/longstay-skeleton.html`,
  `/appartements-nyon/` und `/appartements-nyon/index.html` mit dem bestehenden
  `GRENCHEN_STUB` vor `</head>` aus (`AMANTHOS_API_BASE=''`, `__gtagCalls`, `__fbqCalls`,
  `fbq`-Stub, `?contact=fail|429`-Wrapper); die Funktion `_grenchen(relpath)` wird dafür in
  `_stubbed(relpath)` umbenannt und für alle fünf Pfade genutzt. Fehlt eine Seite noch,
  antwortet der Harness `404 <pfad> fehlt noch`.
- `/api/offers`: liest `tests/fixtures/offers-<code>-<nights>.json`, wenn die Datei existiert
  (Nächte aus `arrival`/`departure` der Anfrage), sonst wie bisher `offers-<code>.json`.
  `?fixture=empty` bleibt. Damit zeigt der Zürich-Abschnitt im Harness die fünf 30-Nächte-Angebote.
- `POST /api/contact` unverändert (druckt `CONTACT-BODY`, `fail=502`, `fail=429`).
- Bestehendes Verhalten für `/`, `/grenchen-mieten/`, Skelett, `/js/booking.js`,
  `/api/bookings` unverändert. Legt nie eine Datei an. Aufruf `python3 tests/dev-server.py 8080`.

### K11: Faktenblatt Zürich (alles, was der Abschnitt behaupten darf)

Quelle `zurich/index.html` (Stand 09.09.2026) und `/api/offers` zur Laufzeit:

- 22 Business-Suiten, Oberhauserstrasse 30, 8152 Glattbrugg; 1 km zum Flughafen Zürich;
  Zürich HB 9,4 km; Glatt-Einkaufszentrum 0,8 km; ETH Zürich 11 km.
- Voll ausgestattete Küche; schnelles WLAN kostenlos; Arbeitsplatz mit Schreibtisch; Smart TV;
  digitaler Check-in (rund um die Uhr); privater Parkplatz CHF 10 pro Tag; Lift; Kaffee und
  Tee inklusive; regelmässige Reinigung; Bewertung 4,4 bei 99 Rezensionen.
- Preis: nur die Laufzeitanzeige nach K2 mit ihrem Fenster, ihrer Einheit und ihrer Bedingung.
- Kontakt: +41 41 562 97 00, info@amanthosliving.com.
- Texte (deutsch, Sie-Form; englische Fassung in `en.json`): H2 „Wohnen auf Zeit am Flughafen
  Zürich"; Einleitung: möblierte Business-Suite mit Küche, WLAN und Arbeitsplatz, 1 km vom
  Flughafen, ab einem Monat, digitaler Check-in, Parkplatz CHF 10 pro Tag; Formulartitel
  „Angebot anfragen"; Hinweis unter dem Formular: „Wir verwenden Ihre Angaben, um Ihnen ein
  Angebot zu machen. Mehr in der Datenschutzerklärung" (Link `../privacy/`).
- **Nicht behaupten:** Wohnsitzanmeldung, Mindest- oder Höchstaufenthalt, Kaution,
  Nebenkosten, Kurtaxe, Reinigungsrhythmus, Parkplatzverfügbarkeit, Rabatte je Dauer,
  Firmenkonditionen, Antwortzeit ausser „innert eines Werktags" im Erfolgstext (Entscheid des
  Inhabers, Abschnitt 7).

**Akzeptanzkriterien Segment 0:**

```bauplan-kriterien segment=0
- [ ] Website: node --test tests/*.test.mjs Exit 0, Testzahl zitiert (Basis 126); tests/i18n-fixed.test.mjs prueft K6 in beiden Zustaenden; tests/longstay-contract.test.mjs prueft K1 und ueberspringt die K5-Teile, solange zurich/index.html ohne Abschnitt und js/longstay-page.js fehlen
- [ ] js/i18n.js: alle Seiten ohne data-i18n-fixed verhalten sich wie vorher (Test und Harness: / mit ?lang=de setzt lang auf de und Titel aus de.json wie bisher)
- [ ] js/longstay-config.js laedt in Node (require) und im Browser (window.LONGSTAY_CONFIG); ADS_SEND_TO ist leer; keine Preiszahl in der Datei
- [ ] tests/fixtures/longstay-dom-contract.json enthaelt alle IDs, Klassen und data-i18n-Schluessel aus K5 (python3 -m json.tool Exit 0); tests/fixtures/offers-gbal-30.json hat nights 30 und fuenf Angebote ohne Personendaten
- [ ] Harness: python3 tests/dev-server.py 8080; GET /tests/fixtures/longstay-skeleton.html enthaelt den Stub; GET /api/offers?propertyId=GBAL&arrival=2026-10-15&departure=2026-11-14&adults=1 liefert die fuenf Angebote aus offers-gbal-30.json; GET / und /grenchen-mieten/ verhalten sich wie vor dem Segment (curl-Ausgaben zitiert)
- [ ] Plankopie Website ist der Auszug nach 0a; bauplan-scope.sh files <auszug> 0..3 und sammelstellen <auszug> stimmen zeilenweise mit dem Master ueberein (diff zitiert); keine Preistabelle, keine Namen von Empfaengern im Auszug
- [ ] Backend: Plankopie vollstaendig unter docs/, pytest website-backend/tests -q Exit 0 mit unveraenderter Testzahl (Basis 416), ruff check Exit 0; sonst kein Datei-Diff
- [ ] Kein Datei-Diff ausserhalb des Scopes; keine Personendaten in Fixtures; status bleibt draft, Umstellen auf aktiv macht der Inhaber
```

**Hängt ab von:** nichts. Danach: Inhaber stellt `aktiv` in drei Dateien.
**Diff:** etwa 15 Zeilen in `i18n.js`, 35 Zeilen Konfiguration, 40 Zeilen Harness (Produktivcode
rund 90), dazu Tests, Fixtures, Skelett und zwei Plankopien (zählen nicht). Geschätzt 60 Minuten.

## 3. Segmente (parallel, nach Merge von Segment 0 in beiden Repos und `status: aktiv`)

Alle vier zweigen von `origin/main` des jeweiligen Repos ab (`git fetch origin main && git
checkout -b <branch> origin/main`), arbeiten im eigenen Worktree, pushen, erstellen keinen PR
und mergen nichts. Die Website-Segmente sind nach dem Merge inert: der Abschnitt und sein
Nav-Eintrag tragen `hidden` bis zur Verdrahtung, das Skript tut ohne Abschnitt nichts, die
französische Seite ist erreichbar, aber unverlinkt und nicht in der Sitemap. Segment 4 ist
inert, bis die Verdrahtung den Zweig in `server.py` setzt.

### Segment 1: Abschnitt „Wohnen auf Zeit" auf `/zurich/` (Website, HTML, CSS, Sprachdateien de/en)

- **Datei-Scope (exklusiv):**
  ```bauplan-scope segment=1
  # repo: amanthos-living-website
  zurich/index.html
  css/longstay.css
  locales/de.json
  locales/en.json
  ```
- **Auftrag:** In `zurich/index.html` direkt nach der Buchungsmaske (`section#book`) den
  Abschnitt nach K5 einfügen: `<section id="wohnen-auf-zeit" class="section section-alt ls-section" hidden>`
  mit `section-label`, H2, Einleitung, Preisblock (`ls-price`, `ls-price-note`, `ls-book`
  als `btn btn-outline`, initial `hidden`), sechs Leistungen als Liste `ls-benefits` (Küche,
  WLAN, Arbeitsplatz, Parkplatz CHF 10/Tag, digitaler Check-in, 1 km zum Flughafen; nur K11),
  Formular nach K5 mit `form-grid`/`form-field`, Honigtopf, Absenden-Knopf, Hinweis mit
  Datenschutz-Link, `ls-status`, `ls-success`, Telefon als `tel:`-Link. Nav-Eintrag
  `<li id="ls-nav" hidden><a href="#wohnen-auf-zeit" data-i18n="longstay.nav">Wohnen auf Zeit</a></li>`
  vor dem CTA. Script-Tags am Ende des `body` nach `chat.js`:
  `<script src="../js/longstay-config.js" defer>` und `<script src="../js/longstay-page.js" defer>`
  (letzteres existiert nach dem Merge von Segment 2; Reihenfolge der Merges in Abschnitt 5).
  Alle statischen Texte deutsch im HTML mit `data-i18n="longstay.<key>"`; die Werte für `de`
  und `en` in `locales/de.json` und `locales/en.json` unter einem neuen Objekt `longstay`
  (nur Ergänzung, keine bestehenden Werte ändern; übersetzte Elemente ohne Inline-Markup, weil
  `i18n.js` `textContent` setzt). `css/longstay.css` nur für die neuen Klassen aus K5,
  eingebunden nach `style.css`; kein `data-animate`.
- **Akzeptanzkriterien:**
  ```bauplan-kriterien segment=1
  - [ ] node --test tests/*.test.mjs Exit 0, Testzahl zitiert: der K5-Teil von tests/longstay-contract.test.mjs findet jede ID aus dem Fixture genau einmal in zurich/index.html und jeden data-i18n-Schluessel longstay.* in de.json und en.json
  - [ ] CSP-Meta byte-identisch mit dem Stand vor dem Segment (md5 zitiert); kein data-animate; keine neuen Skripte ausser den zwei aus dem Auftrag; sitemap.xml, nyon/index.html, css/style.css unberuehrt (git diff --stat zitiert)
  - [ ] Abschnitt und Nav-Eintrag tragen hidden; im Harness (http://localhost:8080/zurich/) ist der Abschnitt unsichtbar; nach Entfernen der beiden hidden-Attribute per DevTools rendert er ohne Konsolenfehler ausser fehlendem longstay-page.js, solange Segment 2 nicht gemergt ist
  - [ ] Mit ?lang=de zeigt der Abschnitt deutsche Texte, mit ?lang=en englische (DevTools-Beleg je zwei Schluessel); mit ?lang=fr bleibt der deutsche HTML-Text stehen
  - [ ] axe (node .github/scripts/axe.cjs gegen den Harness, Abschnitt sichtbar) meldet 0 serious und 0 critical; jedes Formularfeld hat ein sichtbares label; Tastaturreihenfolge Preisblock, Knopf, Formular, Absenden
  - [ ] Jede Aussage im Abschnitt steht in K11; keine Preiszahl im HTML (grep 'CHF [0-9]' im Abschnitt leer); Telefon und E-Mail wie K1
  - [ ] Seite bei 360 px Breite ohne horizontales Scrollen (Screenshot); Lighthouse lokal (npx --yes lighthouse gegen den Harness, headless): accessibility mindestens 90, performance mindestens 60 (Werte zitiert)
  - [ ] Produktivcode-Diff hoechstens 400 Zeilen (HTML plus CSS plus Sprachdateien); kein Datei-Diff ausserhalb des Scopes; Plan-Abgleich in jedem Commit
  ```
- **Out-of-Scope:** jedes JavaScript (auch kein Inline-Skript), `js/longstay-config.js`,
  `nyon/index.html`, `sitemap.xml`, `css/style.css`, die übrigen fünf Sprachdateien, das
  Entfernen von `hidden`.
- **Testplan:** Harness starten, `node --test tests/*.test.mjs`, axe wie in `quality.yml`
  (Installation nach `$TMPDIR`, nicht ins Repo), Lighthouse per `npx`, Screenshot 360 px.
- **Hängt ab von:** Segment 0.
- **Diff geschätzt:** ~150 Zeilen HTML, ~50 Zeilen CSS, ~2 mal 25 Zeilen JSON. 60 Minuten.

### Segment 2: Seitenskript Wohnen auf Zeit (Website, Preis, Formular, Ereignisse)

- **Datei-Scope (exklusiv):**
  ```bauplan-scope segment=2
  # repo: amanthos-living-website
  js/longstay-page.js
  tests/longstay-page.test.mjs
  ```
- **Auftrag:** `js/longstay-page.js` als IIFE nach dem Muster von `js/grenchen-page.js`:
  Preisfenster, Angebotsabfrage mit Retry, Auswahl, Anzeige, Rückfall und Neuberechnung nach
  K2; Direktbuchen-Knopf; Validierung (Name, E-Mail), `event_id` beim Laden, Kampagne aus
  `location.search`, Klick-IDs nur über `window.amMeta.tracking()`, Payload nach K3 mit den
  zitierten Angebotsdaten, `fetch` mit `mode: 'cors'`, Statuscodes zu Texten in `de`/`en`
  über `window.getLang()`, Ereignisse nach K4, Reaktion auf `languageChanged`. Reine Helfer
  (`quoteWindow`, `pickOffer`, `formatChf`, `quoteText`, `buildPayload`, `readCampaign`,
  `newEventId`, `statusText`, `needsContact`, `setLocale`) exportiert als `module.exports` und
  `window.amLongstayPage`; die DOM-Initialisierung läuft nur, wenn `document` existiert und
  `ls-form` vorhanden ist. Kein `localStorage`, kein Cookie.
- **Akzeptanzkriterien:**
  ```bauplan-kriterien segment=2
  - [ ] node --test tests/*.test.mjs Exit 0, Testzahl zitiert: quoteWindow liefert fuer today 2026-09-09 ohne moveIn arrival 2026-10-01 und departure 2026-10-31, fuer moveIn 2027-01 arrival 2027-01-01, fuer moveIn im laufenden Monat today plus 2 Tage, fuer moveIn 2026-08 wie ohne moveIn; pickOffer nimmt das billigste Angebot und liefert null bei leerer Liste oder nights ungleich 30; formatChf(2875) gleich "CHF 2'875"; buildPayload liefert genau die 19 Schluessel aus K3, leere Werte als ""; readCampaign verwirft ungueltige utm-Werte einzeln; newEventId passt auf ^[A-Za-z0-9-]{8,64}$; statusText kennt 200, 400, 429, 502, 503 und Netzfehler in de und en
  - [ ] Der K5-Teil von tests/longstay-contract.test.mjs laeuft: jedes getElementById-Literal steht im Fixture
  - [ ] Harness mit Skelett (http://localhost:8080/tests/fixtures/longstay-skeleton.html): Preiszeile zeigt "ab CHF 2'875 pro Monat" mit Classic Suite und "Vorauszahlung, nicht erstattbar" aus offers-gbal-30.json; ?fixture=empty zeigt den Rueckfalltext ohne Zahl; Wechsel von ls-movein loest genau eine neue Abfrage aus (Netzwerk-Tab, entprellt); Klick ls-book ruft amanthosBooking.setSearch mit dem Fenster (Stub-Beleg)
  - [ ] Absenden ohne E-Mail: kein fetch, Fehlertext, aria-invalid auf ls-email; gueltig: CONTACT-BODY im Harness enthaelt form living-longstay, move_in, duration_months, persons, quoted_month, quoted_price 2875, quoted_unit Classic Suite, quoted_rate NONREFRO_IBE, event_id, utm_campaign aus der URL, company_website leer; ls-success sichtbar, ls-form verborgen
  - [ ] Ereignisse: nach 200 enthaelt __gtagCalls generate_lead mit lead_form living-longstay; mit Einwilligung und gesetztem ADS_SEND_TO (per DevTools) zusaetzlich conversion mit send_to und __fbqCalls track Lead mit eventID gleich event_id; mit leerem ADS_SEND_TO keine conversion; ohne Einwilligung fehlen conversion und Lead, generate_lead bleibt; plausible('Lead', {props:{form:'living-longstay'}}) im Stub-Beleg; ?contact=fail zeigt den 502-Text mit tel- und mailto-Link ohne generate_lead; ?contact=429 zeigt den 429-Text
  - [ ] gclid und fbclid im Body nur mit Einwilligung; utm-Werte auch ohne; nichts in localStorage (Storage-Inspektor-Beleg); keine Preiszahl im Quelltext
  - [ ] Tastaturbedienung: Formular, Knopf und Absenden ohne Maus; Statusmeldung in role=status
  - [ ] Produktivcode-Diff hoechstens 400 Zeilen; kein Datei-Diff ausserhalb des Scopes; Plan-Abgleich in jedem Commit
  ```
- **Out-of-Scope:** HTML und CSS (Segment 1), `js/meta.js`, `js/consent.js`, `js/booking.js`,
  `js/i18n.js`, `js/longstay-config.js`, Sprachdateien, Speichern in `localStorage`.
- **Testplan:** `node --test tests/*.test.mjs`, Harness mit Skelett und DevTools
  (`__gtagCalls`, `__fbqCalls`, `CONTACT-BODY` auf stdout des Harness), Einwilligung über das
  Banner beziehungsweise `localStorage.am_consent_analytics` in beiden Zuständen.
- **Hängt ab von:** Segment 0 (Skelett, Konfiguration, Harness, Fixture). Nicht von Segment 1.
- **Diff geschätzt:** ~300 Zeilen Produktivcode, ~150 Zeilen Tests. 75 Minuten. Bei
  Überschreitung entfällt zuerst der Direktbuchen-Knopf (K2), gemeldet als Abweichung.

### Segment 3: Französische Nyon-Seite (Website)

- **Datei-Scope (exklusiv):**
  ```bauplan-scope segment=3
  # repo: amanthos-living-website
  appartements-nyon/index.html
  locales/fr.json
  tests/nyon-fr.test.mjs
  ```
- **Auftrag:** `appartements-nyon/index.html` nach K8, aus `nyon/index.html` abgeleitet
  (Struktur, IDs und CSP wörtlich, Texte französisch, `lang="fr" data-i18n-fixed`, `hreflang`
  wechselseitig, kein `langSelector`, `deeplink.js` vor `booking.js`). `locales/fr.json` um die
  elf Schlüssel aus K8 ergänzen. `tests/nyon-fr.test.mjs`: statische Prüfungen der Datei
  (`lang="fr"`, `data-i18n-fixed`, CSP-Zeile gleich `nyon/index.html`, `hreflang` en und fr
  und x-default mit den richtigen URLs, `canonical`, `bb-location` Wert `NYAL`, alle Booking-IDs
  aus `nyon/index.html` genau einmal vorhanden, Skriptreihenfolge, kein `data-animate`, kein
  `langSelector`, keine Zeichenkette „mensuel"/„hebdomadaire", und die elf Schlüssel in
  `fr.json` vorhanden, `booking.*` in `fr.json` weiterhin 75 plus 7 Schlüssel).
- **Akzeptanzkriterien:**
  ```bauplan-kriterien segment=3
  - [ ] node --test tests/*.test.mjs Exit 0, Testzahl zitiert; tests/nyon-fr.test.mjs deckt jeden Punkt des Auftrags mit einem eigenen Test ab
  - [ ] CSP-Meta ist das erste Element im head und byte-identisch mit nyon/index.html (md5 beider Zeilen zitiert); hreflang en zeigt auf /nyon/, fr auf /appartements-nyon/, x-default auf /nyon/; canonical /appartements-nyon/
  - [ ] Harness (http://localhost:8080/appartements-nyon/): html lang bleibt fr, document.title bleibt der franzoesische Titel, kein Eintrag amanthos_lang in localStorage nach dem Laden (DevTools-Beleg); Buchungsmaske: Datumswahl, Suche gegen offers-nyal.json, Angebotskarten und Gastformular auf Franzoesisch (Beleg: "Choisir les dates", "RECHERCHER", Kartentexte aus fr.json); BOOKING-BODY im Harness enthaelt propertyId NYAL
  - [ ] Consent-Banner erscheint auf Franzoesisch bei leerem localStorage (consent.js liest die Seitensprache); Footer-Button oeffnet die Einstellungen
  - [ ] axe gegen den Harness 0 serious und 0 critical; Lighthouse lokal accessibility mindestens 90, seo mindestens 50, performance mindestens 60 (Werte zitiert); 360 px ohne horizontales Scrollen (Screenshot)
  - [ ] Jede Aussage auf der Seite steht im Faktenblatt K8; Gaestestimmen im englischen Original mit lang="en"; Preisaussage nur "dès CHF 99 la nuit" und die zwei Kartenpreise der anderen Haeuser
  - [ ] Kein Gedankenstrich im Text; franzoesische Typografie mit geschuetztem Leerzeichen vor Doppelpunkt und Fragezeichen wie in grenchen-louer/index.html
  - [ ] Produktivcode-Diff hoechstens 400 Zeilen (HTML plus JSON); bei Ueberschreitung anhalten und melden (vorgesehener Schnitt: Gaestestimmen und "Nos autres adresses" als Folgesegment auf derselben Datei, seriell); kein Datei-Diff ausserhalb des Scopes; Plan-Abgleich in jedem Commit
  ```
- **Out-of-Scope:** `nyon/index.html` (hreflang und Nav-Link dort setzt die Verdrahtung),
  `sitemap.xml`, `.github/workflows/quality.yml`, `js/*`, `css/*`, die übrigen Sprachdateien,
  neue Bilder.
- **Testplan:** `node --test tests/*.test.mjs`, Harness mit DevTools, axe, Lighthouse,
  Screenshot 360 px.
- **Hängt ab von:** Segment 0 (K6 in `i18n.js`, Harness-Pfad).
- **Diff geschätzt:** ~330 Zeilen HTML (`nyon/index.html` hat 552 Zeilen, davon viele
  Inline-Styles; die französische Fassung übernimmt sie), ~15 Zeilen JSON, ~90 Zeilen Tests.
  75 Minuten. Das ist das engste Segment.

## 4. Sammelstellen (nur die Verdrahtung fasst sie an)

```bauplan-scope sammelstellen
# repo: amanthos-living-website
nyon/index.html
sitemap.xml
index.html
404.html
robots.txt
.lycheeignore
unlighthouse.config.mjs
.github/workflows/*
.github/scripts/*
js/booking.js
js/deeplink.js
js/meta.js
js/consent.js
js/sentry-init.js
js/app.js
js/chat.js
js/game.js
js/grenchen-config.js
js/grenchen-units.js
js/grenchen-finder.js
js/grenchen-page.js
css/style.css
css/grenchen.css
locales/it.json
locales/ja.json
locales/ko.json
locales/zh.json
grenchen-mieten/*
grenchen-louer/*
solothurn/*
solothurn-grenchen/*
nyon-duillier/*
zurich-airport/*
privacy/*
imprint/*
screen/*
de/*
en/*
fr/*
it/*
ja/*
ko/*
zh/*
tests/deeplink.test.mjs
tests/grenchen-contract.test.mjs
tests/grenchen-finder.test.mjs
tests/grenchen-page.test.mjs
tests/fixtures/deeplink-cases.json
tests/fixtures/grenchen-dom-contract.json
tests/fixtures/grenchen-skeleton.html
tests/fixtures/offers-gbal.json
tests/fixtures/offers-nyal.json
docs/bauplan-grenchen-mieten-2026-09-07.md
docs/bauplan-fbl-ibe-2026-09-06.md
# repo: amanthos-platform
website-backend/server.py
website-backend/grenchen_leads.py
website-backend/contact_grenchen.py
website-backend/meta_capi.py
website-backend/booking_source.py
website-backend/tests/test_contact_grenchen.py
website-backend/tests/test_grenchen_leads.py
website-backend/requirements.txt
render.yaml
.env.example
DOKUMENTATION.md
CLAUDE.md
pyproject.toml
requirements.txt
requirements-dev.txt
package.json
package-lock.json
website/*
docs/bauplan-fbl-ibe-2026-09-06.md
```

Fällige Einträge in der Verdrahtung:

- `nyon/index.html`: `<link rel="alternate" hreflang="fr" href="https://www.amanthosliving.com/appartements-nyon/">`
  neben den bestehenden `hreflang`-Zeilen; Nav-Eintrag
  `<li><a href="../appartements-nyon/" lang="fr" hreflang="fr">Français</a></li>` vor dem CTA
  (Muster `grenchen-mieten/index.html`, Zeile 117); optional `deeplink.js` vor `booking.js`.
- `sitemap.xml`: `https://www.amanthosliving.com/appartements-nyon/`, `lastmod` des Merge-Tags,
  `changefreq weekly`, `priority 0.8` (wie `grenchen-louer`); `lastmod` von `/zurich/` auf das
  Merge-Datum.
- `.github/workflows/quality.yml`: die neue URL in der axe-Liste.
- `zurich/index.html` (gehört Segment 1, wird nach dessen Merge von der Verdrahtung angefasst):
  die zwei `hidden`-Attribute (`#wohnen-auf-zeit`, `#ls-nav`) entfernen, erst nachdem der
  Backend-Zweig live ist.
- `js/longstay-config.js` (Segment 0): `ADS_SEND_TO` mit dem Label der neuen Conversion-Aktion.
- `website-backend/server.py`: Zweig nach K7. `website-backend/grenchen_leads.py`: Parameter
  `empfaenger_env` an `sms_alert`. `render.yaml`: `LIVING_LONGSTAY_RECIPIENTS` und
  `LIVING_LONGSTAY_SMS_TO` als `sync: false` beim Service `amanthos-website-api`, mit Kommentar
  wie bei `GRENCHEN_RECIPIENTS`; `.env.example` und `DOKUMENTATION.md`: die zwei Namen.
- `index.html`, `404.html`, `robots.txt`, `.lycheeignore`, `unlighthouse.config.mjs`,
  `css/style.css`, die übrigen Sprachdateien, die Grenchen-Dateien, `meta_capi.py`,
  `booking_source.py`, `requirements*`, `pyproject.toml`, `package*.json`, `website/*`: kein
  Eintrag geplant; sie stehen hier, damit kein Segment „nur schnell" dort etwas ändert.

## 6. Parallelisierungsplan

| Welle | Segmente | läuft gleichzeitig | wartet auf |
|---|---|---|---|
| 0 | Segment 0 Website, Segment 0 Backend | die zwei Repos parallel (das Backend-Segment 0 ist nur die Plankopie) | nichts; danach Inhaber: `aktiv` in drei Dateien |
| 1 | Segment 1, 2, 3 (Website, drei Worktrees), Segment 4 (Backend) | alle vier | Merge von Segment 0 in beiden Repos |
| 2 | Verdrahtung Backend (Schritt 1), dann Website (Schritte 2 bis 5), dann E2E, Ads, Kampagnen (6 bis 10) | nichts, ein Kopf | Merge aller vier Segmente |

Aufwand geschätzt: Welle 0 rund 60 Minuten, Welle 1 rund 75 Minuten Wanduhrzeit (längstes
Segment), Verdrahtung rund drei Stunden inklusive E2E und Kampagnen. Keine künstliche Teilung:
Segment 1 und 2 sind über K5 entkoppelt (Muster grenchen-mieten), Segment 3 hängt nur an K6,
Segment 4 nur an Text.

## 10. Entscheide des Inhabers (09.09.2026, Auswahldialog, Orchestrator-Nachtrag)

Bindend für Segmente und Verdrahtung, ersetzen die offenen Punkte 1 bis 9 aus Abschnitt 7:

1. Preisplan: so lassen, der Abschnitt zeigt das billigste buchbare 30-Nächte-Angebot mit seiner
   Bedingung (heute NONREFRO_IBE, „Vorauszahlung, nicht erstattbar"). Kein Ratenentscheid.
2. Anzeigentext der Kampagne „Wohnen auf Zeit": keine Monatszahl, Formulierung „Monatspreis auf
   der Seite".
3. Englische Fassung des Abschnitts: ja, de und en (Sprachdateien beide).
4. SMS für Zürich-Anfragen: keine; `LIVING_LONGSTAY_SMS_TO` bleibt ungesetzt.
5. Nyon: „séjours à la semaine et au mois" darf auf der französischen Seite stehen; die
   Verdrahtung ergänzt denselben Satz auf `/nyon/` (englisch), damit Anzeige und Seite
   übereinstimmen. K8 ist entsprechend zu lesen; Segment 3 darf den Satz setzen, der Test in
   `tests/nyon-fr.test.mjs` prüft dann NICHT mehr auf das Fehlen von „mensuel"/„hebdomadaire".
6. Gästestimmen auf der französischen Seite: englische Originale mit `lang="en"`.
7. Supabase-Trichter für Zürich: nicht jetzt (unverändert).
8. `LIVING_LONGSTAY_RECIPIENTS`: drei Empfaenger bestaetigt; Namen und Werte stehen nur im
   Master und auf Render, nicht in diesem Auszug.
9. Erfolgstext: ohne Frist („wir melden uns").

Google-Conversion: eigene Aktion „Lead Living Wohnen auf Zeit" (Verdrahtung, K10).
