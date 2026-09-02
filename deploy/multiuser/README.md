# CaDS Firmware Lab – Multi-User-Stack (`deploy/multiuser`)

Ein Einstiegspunkt, viele Studierende, je Student ein eigener code-server-Container mit eigenem
Workspace-Volume. Entwurf und Begründung: `docs/MULTIUSER.md`. Dieses Verzeichnis ist die
Implementierung.

```
Browser ─TLS─► Edge (require_login) ─► ct-agent ─► fl-gate (Caddy :3000)
                                                     │  strip X-Gate-Email → forward_auth /gate/check → copy X-Gate-Email
                                                     ├─ /            → fl-broker /_broker/enter   → 302 /s/<slug>/?folder=…
                                                     ├─ /s/<slug>/…  → forward_auth fl-broker /_broker/resolve?slug=<slug>
                                                     │                 (403 wenn Identität ≠ slug) → strip_prefix → reverse_proxy
                                                     │                 auf X-FL-Upstream (127.0.0.1:<port> des Containers)
                                                     ├─ /admin…      → fl-broker /_broker/admin… (Allowlist FL_ADMIN_EMAILS)
                                                     └─ /logout      → Edge /gate/logout
fl-broker (Host-Prozess, Python-Stdlib, 127.0.0.1:3100) ─docker CLI─► fl-<slug>  (Volume fl-ws-<slug>, -p 127.0.0.1:0:8080)
```

| Datei | Zweck |
|---|---|
| `broker/fl_broker.py` | Session-Broker (nur Stdlib, Python ≥ 3.10). Bindet 127.0.0.1:3100. |
| `broker/test_fl_broker.py` | Unit-Tests mit simuliertem Docker (`python3 -m unittest deploy/multiuser/broker/test_fl_broker.py`). |
| `broker/it_local.sh` | Integrationstest gegen echtes lokales Docker (Image per `FL_IMAGE`, Default `codercom/code-server:latest`). |
| `Caddyfile.gate` | Gate + Pfad-Router (Container `caddy:2-alpine`). |
| `compose.yml` | Gate-Container (Linux: `network_mode: host`), optional ct-agent (`--profile agent`). |
| `compose.desktop.yml` | Override für Docker Desktop / Colima (bridged, `host.docker.internal`). |
| `.env.example` | Alle Variablen (Gate, Agent, Broker, `TUTOR_LLM_*`). |
| `install/fl-broker.service` | systemd-Unit (User `becke`, `EnvironmentFile`, `Restart=always`). |
| `install/watchdog.sh` | Pidfile-Loop für Hosts ohne systemd-Nutzung. |
| `test/stub_gate.py` | Stub des Keycloak-Gates für lokale Tests (niemals deployen). |
| `agent/Dockerfile` | ct-agent-Image (identisch zu CADS-kali-desktop/agent). |

## Broker-Endpunkte (nur über das Gate erreichbar; Identität kommt ausschließlich aus `X-Gate-Email`)

| Endpunkt | Verhalten |
|---|---|
| `GET /_broker/enter` | ohne Identität 403. slug = `sha256(lower(email))[:12]`. Container `fl-<slug>` sicherstellen (create / start / bei altem Image ersetzen), auf `/healthz` warten (max `FL_HEALTH_TIMEOUT_S`), dann `302 /s/<slug>/?folder=<FL_WORKSPACE_DIR>`. |
| `GET /_broker/resolve?slug=` | 403 wenn Identität fehlt oder nicht zum slug passt; 503 wenn nicht startbar; sonst 200 mit `X-FL-Upstream: <FL_UPSTREAM_HOST>:<port>` und `X-FL-Port: <port>`, last-seen wird aktualisiert, gestoppter Container wird gestartet. Antworten aus dem Speicher für `FL_RESOLVE_CACHE_S` (Default 10 s), sonst `docker inspect`. |
| `GET /_broker/healthz` | `{"ok":true,"running":n}` |
| `GET /_broker/admin` | nur `FL_ADMIN_EMAILS`: JSON (image, imageId, Sessions: slug, status, port, lastSeen, heartbeat, image, imageCurrent). |
| `POST /_broker/admin/stop?slug=` / `wipe?slug=` | stop bzw. stop + rm + `docker volume rm fl-ws-<slug>`. |

Container-Erzeugung (Argumentliste, keine Shell):
`docker run -d --name fl-<slug> --label cads.firmware-lab=1 --label cads.slug=<slug> --label cads.email-hash=<sha256>
-v fl-ws-<slug>:/home/coder/workspace -p 127.0.0.1:0:8080 --memory $FL_MEM --cpus $FL_CPUS --pids-limit $FL_PIDS_LIMIT
-e TUTOR_LLM_BASE_URL -e TUTOR_LLM_API_KEY -e TUTOR_LLM_MODEL $FL_IMAGE --auth none --bind-addr 0.0.0.0:8080
--disable-workspace-trust /home/coder/workspace/cads-zero`. Die `-e`-Werte kommen aus der Broker-Umgebung
(nicht in argv, nicht in Labels). Log nach stderr: Zeitstempel, slug, Aktion – nie E-Mails.

Lebenszyklus: Reaper alle `FL_REAPER_INTERVAL_S` (60 s): `docker ps -a --filter label` abgleichen, dann Container stoppen,
deren last-seen **und** Heartbeat-Datei (`docker exec fl-<slug> stat -c %Y ~/.local/share/code-server/heartbeat`,
Fehler = alt) älter als `FL_IDLE_STOP_MIN` (240) sind. Volume bleibt; der nächste Aufruf startet den Container.
code-server erneuert den Heartbeat bei aktiver Verbindung nur etwa minütlich – Werte unter 3 min reapen aktive Sessions
(der Broker warnt). `FL_MAX_SESSIONS` (40) zählt **laufende** Container; darüber 503 "Labor voll".
Rollout: `FL_IMAGE` neu bauen/pullen – **gestoppte** Container mit anderer Image-ID werden beim nächsten Start ersetzt
(Volume bleibt), laufende bleiben unangetastet (`imageCurrent:false` im Admin-JSON; bei Bedarf `admin/stop`).

## Netzwerk-Platzierung (gemessen 2026-09-02)

Broker und Student-Container binden nur Loopback. Damit Caddy (im Container) sie erreicht:

* **Linux (cads-lambda, Produktion): `network_mode: host`** für `fl-gate` (so in `compose.yml`). Caddy bindet
  `127.0.0.1:3000`, spricht `127.0.0.1:3100` und `127.0.0.1:<port>`. Ein bridged Container mit
  `extra_hosts: host-gateway` funktioniert dort **nicht**: host-gateway ist auf einer nativen Engine die docker0-Adresse
  (172.17.0.1), und ein auf 127.0.0.1 gebundener Socket nimmt darauf keine Verbindungen an. Der ct-agent muss dann
  ebenfalls im Host-Netz laufen (Host-Prozess wie heute oder `--profile agent`, `CT_AGENT_ORIGIN=127.0.0.1:3000`).
* **Docker Desktop / Colima (macOS-Entwicklung): `compose.desktop.yml`** – bridged, `127.0.0.1:3000` publiziert,
  `host.docker.internal` (host-gateway) erreicht dort loopback-gebundene Host-Dienste (gemessen auf Colima 29.2.1).
  Broker mit `FL_UPSTREAM_HOST=host.docker.internal` starten.

Caddy-Variante: `reverse_proxy {http.request.header.X-FL-Upstream}` (dynamischer Upstream als Platzhalter) – mit
caddy:2-alpine v2.11.4 gemessen funktionsfähig, inkl. WebSocket-Upgrade (101 durch den Pfad-Proxy). Die Alternative
`reverse_proxy host.docker.internal:{http.request.header.X-FL-Port}` wurde ebenfalls gemessen und funktioniert; der Broker
liefert beide Header. `handle /admin*` nutzt bewusst `handle` + `rewrite` statt `handle_path`, weil `handle_path` den
Präfix entfernen und den Broker-Pfad `/_broker/admin…` zerstören würde.

## Betrieb (Labor)

```bash
# Broker
sudo install -d -o becke -g becke /opt/firmware-lab
cp deploy/multiuser/broker/fl_broker.py /opt/firmware-lab/
cp deploy/multiuser/.env.example /opt/firmware-lab/fl-broker.env && chmod 600 /opt/firmware-lab/fl-broker.env  # ausfüllen
sudo cp deploy/multiuser/install/fl-broker.service /etc/systemd/system/ && sudo systemctl enable --now fl-broker
journalctl -u fl-broker -f
# ohne systemd: nohup deploy/multiuser/install/watchdog.sh >/var/log/fl-broker-watchdog.log 2>&1 &
# Gate
cd deploy/multiuser && cp .env.example .env && docker compose up -d        # Linux
# ct-agent-Origin von 127.0.0.1:8083 (Einzelplatz) auf 127.0.0.1:3000 umstellen
```

Verifikation (ohne Annahmen):

```bash
curl -sI https://firmware-lab-34a13a96.bunsenbrenner.org/            # -> 302 …/gate/start (nicht 401, nicht 200)
# eingeloggt (Browser-Cookie) -> 302 Location: /s/<slug>/?folder=/home/coder/workspace/cads-zero, dann Workbench
# zweite Identität auf /s/<slug-des-ersten>/ -> 403 "Not your session"
curl -s -H 'X-Gate-Email: x@y' https://…/s/<slug>/                    # Header wird gestrippt -> 302 zum Gate
curl -s https://…/admin  (als FL_ADMIN_EMAILS)                        # JSON; sonst 403
curl -s -X POST 'https://…/admin/stop?slug=<slug>'                    # stoppt; nächster Aufruf startet neu
docker ps -a --filter label=cads.firmware-lab=1                       # Inventur; Volumes: docker volume ls -f name=fl-ws-
sudo journalctl -u fl-broker | grep reap-idle                          # Reaper-Aktivität
```

Neues Image ausrollen: `docker pull`/`build` unter dem Namen aus `FL_IMAGE`; gestoppte Sessions werden beim nächsten
Login ersetzt, laufende zeigen `imageCurrent:false` im Admin-JSON und können per `admin/stop` in den Rollout geschickt werden.

## Lokal testen (macOS, Colima/Docker Desktop)

```bash
python3 -m unittest deploy/multiuser/broker/test_fl_broker.py          # 22 Tests, kein Docker
deploy/multiuser/broker/it_local.sh                                    # echtes Docker, räumt per Label auf
# Ende-zu-Ende mit Stub-Gate:
STUB_PORT=3900 python3 deploy/multiuser/test/stub_gate.py &
FL_IMAGE=codercom/code-server:latest FL_UPSTREAM_HOST=host.docker.internal FL_ADMIN_EMAILS=admin@example.test \
  python3 deploy/multiuser/broker/fl_broker.py &
(cd deploy/multiuser && docker compose -f compose.yml -f compose.desktop.yml up -d fl-gate)
open http://127.0.0.1:3000/            # Stub-Login -> /s/<slug>/ -> Workbench, Terminal, WebSocket über den Pfad-Proxy
# aufräumen
(cd deploy/multiuser && docker compose -f compose.yml -f compose.desktop.yml down -v)
docker rm -f $(docker ps -aq --filter label=cads.firmware-lab=1); docker volume rm $(docker volume ls -q -f name=fl-ws-)
```

Hinweis für Tests mit dem nackten `codercom/code-server`-Image: `/home/coder/workspace/cads-zero` existiert dort nicht
(das CaDS-Image legt es per `entrypoint.d/10-seed-workspace.sh` an); VS Code zeigt dann einen "Workspace auswählen"-Dialog.
Für den Test genügt `docker exec -u root fl-<slug> sh -c 'mkdir -p /home/coder/workspace/cads-zero && chown -R coder:coder /home/coder/workspace'`.

## Offene Punkte

* Gate-Host für Produktion: ct-agent für firmware-lab auf Labor betreiben (Token wandert) oder Services→Labor tunneln; `require_login=1` + Access-List (docs/MULTIUSER.md).
* Erst-Anlage des Volumes: ein frisches Named Volume übernimmt Inhalt/Owner aus dem Image-Verzeichnis; das CaDS-Image muss `/home/coder/workspace` als `coder` besitzen (Dockerfile `COPY --chown`), sonst ist der Workspace root-owned.
* Kapazität: FL_MEM/FL_CPUS mit parallelen Builds lasttesten (Labor schätzt 15–20 aktive Sessions).
* Der Broker hat keinen Health-Recheck für laufende Container innerhalb des Resolve-Caches; ein abgestürzter code-server-Prozess (Container läuft) liefert bis zum nächsten `docker inspect` 502 aus Caddy.
