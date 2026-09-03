# Lehrenden-Portal (`fl-portal`)

Telemetrie-Senke und Auswertungsoberfläche für die CaDS Firmware Lab / Tutor Lab Kurse (SPEC A5).
Host-Prozess wie der Broker: Python 3.10+, nur Standardbibliothek, SQLite, Bindung an `127.0.0.1:3200`,
Identität ausschließlich aus dem Keycloak-Gate.

| Datei | Inhalt |
|---|---|
| `portal.py` | HTTP-Server: `/ingest`, `/healthz`, Web-UI unter `/portal/*`, Löschendpunkt |
| `analytics.py` | Alle Berechnungen, rein und deterministisch (keine I/O) |
| `events.py` | Ereignisschema `v: 1`, Validierung, Textbereinigung, Idempotenzschlüssel |
| `coursemeta.py` | Modul-/Step-Reihenfolge, Bloom-Stufe, Lernziele aus `courses/<id>/` |
| `simulate.py` | Synthetische Kohorten + Precision/Recall der Flags |
| `RULES.md` | Jede Regel, jeder Schwellwert, jede Grenze – **lesen, bevor man ein Flag benutzt** |

## Betrieb

### Konfiguration (Umgebungsvariablen)

| Variable | Vorgabe | Bedeutung |
|---|---|---|
| `FL_PORTAL_BIND` | `127.0.0.1` | Bindeadresse. Nicht öffentlich binden: der Zugriffsschutz ist das Gate. |
| `FL_PORTAL_PORT` | `3200` | Port |
| `FL_PORTAL_DB` | `/var/lib/cads/portal.sqlite3` | SQLite-Datei (WAL) |
| `FL_PORTAL_CONFIG` | `/etc/cads/portal.json` | Rollen und Schwellwerte |
| `FL_PORTAL_ROSTER` | – | Optionale Klarnamen-Zuordnung |
| `FL_PORTAL_COURSES` | `courses` | Verzeichnis mit den Kurspaketen |
| `FL_PORTAL_TOKEN` | – | **Pflicht für `/ingest`.** Ohne diesen Wert wird jede Einlieferung abgewiesen. |
| `FL_PORTAL_RETENTION_DAYS` | `180` | Ereignisse älter als das werden stündlich gelöscht (`0` = nie) |
| `FL_PORTAL_DEV_EMAIL` | – | **Nur lokal.** Ersatzidentität, wenn kein Gate davor steht. |
| `FL_PORTAL_NOW` | – | Feste Uhrzeit (Epoch) für Tests und Screenshots |

`portal.json` (siehe `portal.example.json`):

```json
{
  "teachers": {
    "anna.lehrende@hs.example": { "courses": ["cads-zero-foundations"], "role": "teacher" },
    "admin@hs.example":         { "courses": [], "role": "admin" }
  },
  "thresholds": { "activeDays": 7 },
  "credit": { "minStepShare": 0.8, "minCheckShare": 0.8, "minReflections": 2, "requireProject": true },
  "creditPerCourse": { "rust-foundations": { "requireProject": false } }
}
```

Wer nicht in `teachers` steht, bekommt 403 – auch mit gültiger Gate-Anmeldung. `role: "teacher"` sieht
genau die aufgeführten Kurse, `role: "admin"` alle. Die Datei wird bei jeder Anfrage neu eingelesen,
wenn sich ihre Änderungszeit geändert hat; ein Rollenwechsel braucht keinen Neustart.

### Start

Mit systemd: `deploy/multiuser/install/fl-portal.service` (Installationsschritte stehen im Kopf der Datei).
Ohne systemd: `deploy/multiuser/install/watchdog.sh` überwacht Broker und Portal gemeinsam.

Lokal zum Ausprobieren, ohne Gate:

```bash
python3 deploy/portal/simulate.py --offline \
  --write-config /tmp/portal.json --write-roster /tmp/roster.json

FL_PORTAL_DB=/tmp/portal.sqlite3 FL_PORTAL_CONFIG=/tmp/portal.json \
FL_PORTAL_ROSTER=/tmp/roster.json FL_PORTAL_TOKEN=dev-token \
FL_PORTAL_COURSES=courses python3 deploy/portal/portal.py &

python3 deploy/portal/simulate.py --token dev-token --verify-ui
curl -H 'X-Gate-Email: anna.lehrende@hs.example' http://127.0.0.1:3200/portal/
```

`FL_PORTAL_DEV_EMAIL` setzt eine Ersatzidentität, wenn man ohne `X-Gate-Email`-Header arbeiten will.
In Produktion darf diese Variable nicht gesetzt sein; das Portal warnt beim Start, wenn sie es ist.

### Einbindung in den Multi-User-Stack

* `Caddyfile.gate` leitet `/portal*` hinter dem Gate an `127.0.0.1:3200` weiter. Der Präfix bleibt erhalten.
* Der Broker reicht `CADS_TUTOR_TELEMETRY_URL` und `CADS_TUTOR_TELEMETRY_TOKEN` per Namen in jeden
  Container (Werte aus `fl-broker.env`, nie in der Kommandozeile). Der Token muss mit `FL_PORTAL_TOKEN`
  übereinstimmen.
* Die URL muss **aus dem Container heraus** erreichbar sein – das ist eine andere Adresse als die
  Bindung des Portals: `http://host.docker.internal:3200` unter Docker Desktop/Colima,
  `http://172.17.0.1:3200` (Bridge-Gateway) unter Linux.
* `/ingest` läuft bewusst **nicht** über das Gate: Container liefern direkt gegen den Host ein,
  authentifiziert per Token. Der Browser einer studierenden Person erreicht nur `/portal*` und wird
  dort abgewiesen.

### Prüfen, ob es läuft

```bash
curl -s http://127.0.0.1:3200/healthz
# {"courses": 3, "events": 24683, "lastEvent": "...", "ok": true, "students": 120}
```

`events` wächst, solange Container Telemetrie senden. Bleibt der Wert stehen, prüfen: Token gleich?
URL aus dem Container erreichbar? Das Portal protokolliert abgewiesene Einlieferungen nach stderr
(`ingest-denied`, `ingest-rejected`) – ohne Klartextinhalte.

## Datenschutz

**Was gespeichert wird.** Ereignisse mit Pseudonym (`sha256(lower(E-Mail))[:12]`), Kurs, Modul, Step,
Typ, Zeitstempel und einem `data`-Objekt: Versuchszahl, Hinweis-Tier, Dauer, Bloom-Stufe, Urteil,
Zeichenzahlen sowie bereinigte Freitexte (Fragen, Reflexionen, Vorhersagen, Ausgabe-Ausschnitte).

**Was nicht gespeichert wird.** Keine E-Mail-Adressen, keine Namen, keine IP-Adressen, kein
Quelltext der Studierenden, keine Zugangsdaten. Freitexte werden **vor** dem Schreiben bereinigt:
E-Mail-Adressen → `[email]`, URLs mit Zugangsdaten → `[url]`, Token-Parameter → `[redacted]`,
Länge auf 2000 Zeichen begrenzt. Das ist eine Bereinigung, keine Garantie: Wer seinen Namen in eine
Reflexion schreibt, steht in der Datenbank.

**Klarnamen.** Ausschließlich in der optionalen Datei `roster.json`, die eine Lehrperson selbst pflegt
und die nie Teil eines Ereignisses ist. Namen werden nur denen angezeigt, die für den betreffenden Kurs
berechtigt sind. Ohne diese Datei arbeitet das Portal vollständig pseudonym.

```json
{ "courses": { "cads-zero-foundations": { "0fbf2e502d16": "Erika Mustermann" } } }
```

**Wer was sieht.** Lehrende sehen nur ihre eigenen Kurse – auch beim direkten Aufruf einer fremden
Kurs-URL (403). Studierende haben keinen Zugang zum Portal. Es gibt keinen anonymen Zugriff:
ohne `X-Gate-Email` antwortet jede Seite mit 403.

**Aufbewahrung.** `FL_PORTAL_RETENTION_DAYS` (Vorgabe 180 Tage) löscht ältere Ereignisse stündlich.
Der Wert sollte zur Prüfungsordnung passen: Nachweise im Organisations-Board leben von den zugrunde
liegenden Ereignissen, und mit deren Löschung verliert ein „erreicht" seine Belege. Der Sign-off selbst
(Status, Notiz, Lehrperson, Zeitstempel) bleibt erhalten, ebenso ein zuvor gezogener CSV/JSON-Export.

**Löschung auf Verlangen.** Ein Admin löscht sämtliche Daten eines Pseudonyms:

```bash
curl -X POST -H 'X-Gate-Email: admin@hs.example' \
     'http://127.0.0.1:3200/portal/admin/forget?slug=0fbf2e502d16'
# {"events": 312, "ok": true, "signoffs": 1, "slug": "0fbf2e502d16"}
```

Das entfernt Ereignisse **und** Sign-off endgültig aus der Datenbank. Hinter dem Gate ist der Pfad
`/portal/admin/forget` zu benutzen (`/admin*` gehört dort dem Broker). Um das Pseudonym zu einer Person
zu finden, dient `roster.json` oder `sha256(lower(E-Mail))[:12]`.

**Zweckbindung.** Das Portal ist ein Werkzeug zur Verbesserung der Lehre und zur Betreuung. Die Flags
sind Hinweise, keine Nachweise – was sie nicht beweisen, steht in `RULES.md`, Abschnitt 0. Für eine
Prüfungsentscheidung genügt keine Zahl aus diesem Portal.

## Tests

```bash
python3 -m unittest deploy/portal/test_analytics.py deploy/portal/test_portal.py
python3 deploy/portal/simulate.py --offline            # Precision/Recall der Flags
```

`simulate.py` endet mit Exitcode 1, sobald ein Zielwert verfehlt wird, und eignet sich damit als
Regressionstest für die Regeln selbst.
