# Multi-User-Betrieb: Einstiegspunkt (Services) → skalierendes Backend (Labor) – Entwurf v1

## Anforderung
Ein Einstiegspunkt (`firmware-lab-34a13a96.bunsenbrenner.org`), viele Studierende, je Student eine eigene
code-server-Instanz mit eigenem Workspace (cads-zero), Login über die bestehende Identität
(Keycloak `auth.bunsenbrenner.org`, Realm `ct-demo`), Container-Pool auf Labor (cads-lambda), Zugriff nur über
ct-agent-Tunnel (kein öffentlicher Host-Port). Flash/Debug laufen im Browser (WebUSB) – das Backend braucht
keinerlei USB.

## Verifizierte Randbedingungen
- Kein Wildcard-A-Record auf bunsenbrenner.org; jeder Hostname ist ein eigener Tunnel mit Cert (ops-docs
  "publish-a-new-pipeline-hostname"). → **Ein Hostname, Pfad-Routing** (`/s/<slug>/`), nicht ein Hostname pro Student.
- code-server nutzt relative Pfade (Login-Seite `base="."`) und ist offiziell hinter einem Sub-Pfad-Proxy
  betreibbar. → Pfad-Routing ist tragfähig (WebSocket-Upgrade muss durchgereicht werden).
- Browser-Plane ist payload-blind; Auth muss am Origin geschehen. Bewährtes Muster: Caddy `forward_auth` gegen
  `https://bunsenbrenner.org/gate/check`, Identität kommt als `X-Gate-Email` (CADS-kali-desktop/Caddyfile.gate,
  CADS-DEMO-sort). Client-gelieferte `X-Gate-Email` wird vorher gestrippt; fehlende Identität → 403.
- Labor: Docker 29.7, x86_64, 36 CPU/125 GB. Ein cads-zero-Build braucht ~1 GB RAM Spitze; 30 parallele
  Studierende sind mit 2 GB Limit/Container realistisch (60 GB).

## Architektur
```
Browser ──TLS──► Edge (Browser-Plane, require_login=1) ──► ct-agent (Labor, Host-Prozess oder Container)
   └─► fl-gate (Caddy :3000): strip X-Gate-Email → forward_auth /gate/check → copy X-Gate-Email
          └─► fl-broker (Node :3100): Identität → slug → Container sicherstellen → Proxy /s/<slug>/ → fl-<slug>:8080
                 └─► fl-<slug> (Image cads-firmware-lab, `--auth none`, Volume fl-ws-<slug>, Netz fl_net, 2 GB/2 CPU)
```
- **Slug** = erste 12 Hex-Zeichen von SHA-256(lowercase(email)) – stabil, nicht erratbar, keine PII in URLs.
- **`/`** → Broker legt Session an (docker create/start, wartet auf `/healthz`), leitet auf
  `/s/<slug>/?folder=/home/coder/workspace/cads-zero` um. **`/s/<slug>/…`** → nur wenn `X-Gate-Email` zum slug passt
  (sonst 403), HTTP + WebSocket-Proxy an `fl-<slug>:8080` (Pfad-Prefix entfernt).
- **code-server `--auth none`**: die Passwort-Ebene entfällt, weil Keycloak am Gate und die slug-Bindung im Broker
  die Zugriffskontrolle sind; der Container ist nur im internen Netz erreichbar.
- **Lebenszyklus**: Idle-Reaper stoppt Container ohne Proxy-Aktivität > `FL_IDLE_STOP_MIN` (Default 240 min);
  Volume bleibt; nächster Login startet ihn neu (Workspace/Fortschritt bleiben). `FL_MAX_SESSIONS` (Default 40)
  → 503 "Labor voll" mit Hinweis. Labels `cads.firmware-lab=1`, `cads.slug=<slug>`, `cads.email-hash=<sha>` für
  Inventur; Broker rekonstruiert seinen Zustand beim Start aus `docker ps -a --filter label`.
- **Admin** `/admin` (Allowlist `FL_ADMIN_EMAILS`): Sessions, Stop, Wipe (Volume löschen), Image-Version, Rollout
  (Container mit altem Image werden beim nächsten Start ersetzt; laufende nicht abgeschossen).
- **Broker = Host-Prozess** (Entscheidung mit Labor, 2026-09-02): kein docker.sock-Mount in einen Container. Der Broker
  läuft wie ct-agent als watchdog-überwachter Host-Prozess (Python 3, nur Stdlib, spricht lokal mit `docker`), bindet
  ausschließlich 127.0.0.1:3100 und bietet nur enge Operationen (Session sicherstellen, auflösen, stoppen, wipen) –
  keinen generischen Docker-Pass-through. Container publizieren ihren Port nur auf Loopback (`127.0.0.1:0:8080`,
  zugewiesenen Port liest der Broker per `docker port`), damit Host-Prozess und Gate sie erreichen (funktioniert auf
  Linux und Docker Desktop gleichermaßen).
- **Proxying macht Caddy, nicht der Broker**: `forward_auth 127.0.0.1:3100 { uri /_broker/resolve?slug=… ; copy_headers
  X-FL-Upstream }`, danach `uri strip_prefix /s/<slug>` und `reverse_proxy {http.request.header.X-FL-Upstream}`
  (dynamischer Upstream per Platzhalter, inkl. WebSocket-Upgrade). Der Broker prüft dabei `X-Gate-Email` ↔ slug,
  startet einen gestoppten Container bei Bedarf und aktualisiert last-seen.
- **Idle-Erkennung** über code-servers eigene Heartbeat-Datei (`~/.local/share/code-server/heartbeat`, mtime wird nur
  bei aktiven Verbindungen erneuert) plus last-seen im Broker – nicht über Raten.
- **LLM-Zugang** (`TUTOR_LLM_*`) wird vom Broker beim `docker create` in jeden Container injiziert (aus seiner
  eigenen Env), nie in Images.
- **Telemetrie/Lehrenden-Portal** (SPEC A5, `deploy/portal/`): zweiter Host-Prozess auf `127.0.0.1:3200`,
  ohne Docker-Zugriff. Caddy leitet `/portal*` hinter demselben Gate dorthin weiter; die Rollen kommen aus
  `portal.json` (E-Mail → Kurse). Der Broker injiziert `CADS_TUTOR_TELEMETRY_URL`/`_TOKEN` genauso wie die
  LLM-Variablen (per Namen). `/ingest` läuft bewusst **nicht** über das Gate: Container liefern direkt gegen
  den Host ein, per Token authentifiziert – die URL muss deshalb aus dem Container erreichbar sein
  (`host.docker.internal:3200` bzw. Bridge-Gateway), nicht `127.0.0.1`. Betrieb, Datenschutz und
  Aufbewahrung: `deploy/portal/README.md`, Auswertungsregeln und ihre Grenzen: `deploy/portal/RULES.md`.
- **Migration**: Der heutige Ein-Container-Betrieb (Services-Host, `docker run`, Passwort) bleibt als
  "Einzelplatz-Modus" mit demselben Image lauffähig; der Multi-User-Stack ist `deploy/multiuser/compose.yml` und
  läuft auf Labor. Umschaltung = ct-agent-Origin von `127.0.0.1:8083` auf `fl-gate:3000` (bzw. `127.0.0.1:3000`).

## Offene Punkte (Abstimmung Labor/Tunnel)
1. Wird der ct-agent für firmware-lab künftig auf Labor betrieben (heute Services)? Tunnel-Token muss dann wandern.
2. Ist `require_login=1` + Access-List für diesen Tunnel im Portal gesetzt (Voraussetzung für `/gate/check`)?
   Studierende müssen auf die Access-List (Kursliste) – Prozess klären (Portal-API?).
3. Kapazität: Labor schätzt 15–20 gleichzeitig aktive Sessions (CPU-Bursts beim Compile) – vor Festlegung Lasttest mit parallelen Builds.

## Bedrohungsmodell-Hinweis (Review Labor, 2026-09-03)
`network_mode: host` für `fl-gate` erweitert die Netzwerksicht des Caddy-Containers auf den ganzen Host (Bindung bleibt
127.0.0.1:3000, nichts wird zusätzlich exponiert). Begründung: Auf nativem Linux ist `host-gateway` die docker0-Adresse
und erreicht keinen auf 127.0.0.1 gebundenen Broker. Konsequenz: Eine Caddy-Schwachstelle sähe das Host-Netz statt eines
Bridge-Segments – deshalb Caddy-Image aktuell halten (`caddy:2-alpine`, Watchtower/Renovate) und keine weiteren
Dienste ohne Auth auf Loopback des Labor-Hosts anbieten.

## Nutzerdaten und Image-Rollout: was heute verlorengeht (gemessen 2026-09-06)

Befund aus dem Copilot-Strang, aber **unabhängig von Copilot**: Beim Rollout eines neuen Images verliert
jede studierende Person alle persönlichen Einstellungen. Das betrifft nicht ein Randfeature, sondern
Anzeigesprache, Editor-Einstellungen, Tastenbelegung und alles, was jemand einmal eingestellt hat.

### Messung

Container aus `cads-firmware-lab:dev`, gestartet wie im Einzelplatz-Modus mit einem Workspace-Volume.
`docker inspect` zeigt **genau einen** Mount:

```
volume /var/lib/docker/volumes/firmware-lab-copilot-ws/_data -> /home/coder/workspace
```

Alles unter `/home/coder/.local/share/code-server/` liegt damit im **beschreibbaren Container-Layer**,
nicht im Volume — darunter:

| Pfad | Inhalt |
|---|---|
| `User/settings.json` | die Nutzereinstellungen (das `Dockerfile` legt unsere Voreinstellungen genau hierhin) |
| `User/globalStorage/`, `User/workspaceStorage/` | Zustand der Erweiterungen (auch der des Tutors) |
| `extensions/` | installierte Erweiterungen |
| `heartbeat` | die Datei, aus der der Idle-Reaper die Aktivität liest |

**Folge nach dem heutigen Lebenszyklus:**

| Vorgang | Workspace (`fl-ws-<slug>`) | Einstellungen / Erweiterungszustand |
|---|---|---|
| Idle-Reaper stoppt, nächster Login startet neu | bleibt | **bleibt** (derselbe Container) |
| **Rollout: Container mit altem Image wird ersetzt** | bleibt | **weg** |
| Admin-Wipe | weg | weg |

Der Rollout ist kein Ausnahmefall: er ist der vorgesehene Weg, ein neues Image auszuliefern, und wird
im Semester mehrfach vorkommen.

### Zusatzbefund: SecretStorage hilft hier nicht

Naheliegend wäre, Persönliches über `context.secrets` (SecretStorage) abzulegen. Das löst das Problem
**nicht** — die Ablage folgt in code-server dem **Browser**, nicht dem Container. Gemessen mit einer
Wegwerf-Erweiterung, die einen Wert schreibt und beim nächsten Start zu lesen versucht:

| | gleiches Browserprofil | anderes Browserprofil |
|---|---|---|
| Container neu gestartet | **überlebt** | – |
| Container läuft weiter | **überlebt** | **weg** |

Im `localStorage` der Seite liegt der Schlüssel `secrets.provider`. Ein dort abgelegter Wert überlebt
also den Containerneustart, aber nicht den Wechsel von Browser, Rechner oder ein privates Fenster.
**SecretStorage ist für Geheimhaltung geeignet, nicht für Beständigkeit.**

### Was zu ändern wäre

**Vorschlag: ein zweites, kleines Volume je Person auf `/home/coder/.local/share/code-server/User`.**
Nicht das ganze `code-server`-Verzeichnis — dort liegen auch `extensions/` (hunderte MB je Person) und
`heartbeat`, das der Idle-Reaper bewusst im Container sehen soll.

- **Aufwand:** eine Zeile mehr im `docker create` des Brokers und ein zweites benanntes Volume
  `fl-user-<slug>` (Größenordnung Kilobytes). Beim Wipe müssen dann **beide** Volumes weg.
- **Der Haken, der eine Entscheidung braucht:** Unser `Dockerfile` kopiert die Voreinstellungen nach
  `User/settings.json`. Docker füllt ein *frisches* benanntes Volume beim ersten Start aus dem Image —
  danach nicht mehr. Änderungen an unseren Voreinstellungen erreichen bestehende Studierende also
  **nie**. Das ist der eigentliche Preis, nicht der Speicherplatz.
- **Sauberere Variante, aber ungeprüft:** Voreinstellungen des Images nach `Machine/settings.json`
  (nicht gemountet), persönliche Überschreibungen nach `User/settings.json` (gemountet). Damit wandern
  Image-Voreinstellungen weiter mit, und Persönliches bleibt. **Die Vorrangregeln zwischen `Machine`
  und `User` habe ich nicht gemessen.** Der Ordner `Machine/` existiert im Container
  (`~/.local/share/code-server/Machine/`); ob code-server ihn in unserem Aufbau ausliest und wer bei
  einem Konflikt gewinnt, ist offen. Die Messung dafür steht unten — sie kostet zwanzig Minuten und
  muss nicht neu erfunden werden.

### Die Messung, die die `Machine`/`User`-Variante entscheidet

Drei Fragen, ein Aufbau. Wegwerf-Container aus unserem Bild, eine Wegwerf-Erweiterung, die
`vscode.workspace.getConfiguration().inspect(key)` und den effektiven Wert nach `/tmp` schreibt.

**Aufbau.** In den Container legen:

```jsonc
// ~/.local/share/code-server/Machine/settings.json   (im Image, NICHT gemountet)
{ "editor.fontSize": 11, "editor.wordWrap": "on" }

// ~/.local/share/code-server/User/settings.json      (gemountet, "die Studierende")
{ "editor.fontSize": 13 }
```

**Frage 1 — Wird `Machine/` überhaupt gelesen?** `editor.wordWrap` steht nur dort. Ist der effektive
Wert `"on"`, liest code-server den Ordner aus; ist er `"off"` (die Voreinstellung von VS Code), ist die
ganze Variante hinfällig und es bleibt beim zweiten Volume mit seinem Preis.

**Frage 2 — Wer gewinnt bei einem Konflikt?** `editor.fontSize` steht in beiden. Erwartet wird **13**
(User schlägt Machine); nur dann kann eine studierende Person unsere Voreinstellung überschreiben.
Kommt **11** heraus, ist die Variante unbrauchbar, weil sie das Gegenteil von dem täte, was sie soll.

**Frage 3 — Wohin schreibt die Oberfläche?** In der Einstellungsansicht die Schriftgröße ändern, dann
`User/settings.json` und `Machine/settings.json` vergleichen. Nur wenn die Änderung in `User/` landet,
liegt Persönliches im gemounteten Volume. Gegenprobe mit einer Einstellung, die VS Code als
`scope: machine` führt (z. B. `terminal.integrated.defaultProfile.linux`) — solche Schlüssel behandelt
VS Code anders, und wir sollten wissen, ob sie durchs Raster fallen.

**Zusatzprobe, unabhängig von der Variante:** Bevor irgendetwas gebaut wird, den heutigen Zustand
belegen — Container aus dem Image erzeugen, eine Einstellung ändern, Container **löschen und mit
demselben Volume neu erzeugen** (nicht `restart` — das ist der Rollout-Fall), und nachsehen, dass die
Änderung fort ist. Das ist die Messung, die die Dringlichkeit dieses Abschnitts belegt; ich habe sie
aus der Mount-Liste geschlossen, nicht durchgespielt.

**Nicht empfohlen:** Persönliches in den Workspace legen. Es wäre für die studierende Person sichtbar,
landete in `git status` und vermischte Kursinhalt mit Werkzeugzustand.

Belege und Messaufbau: `docs/research/copilot-machbarkeit.md` §6.
