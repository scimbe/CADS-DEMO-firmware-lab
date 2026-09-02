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
- **Secrets**: Broker erreicht Docker über `/var/run/docker.sock` (read-write, nur dieser eine Container; Alternative
  `docker-socket-proxy` mit Allowlist POST containers/… – in v1 vorgesehen als optionaler Zwischenschritt).
- **LLM-Zugang** (`TUTOR_LLM_*`) wird vom Broker beim `docker create` in jeden Container injiziert (aus seiner
  eigenen Env), nie in Images.
- **Migration**: Der heutige Ein-Container-Betrieb (Services-Host, `docker run`, Passwort) bleibt als
  "Einzelplatz-Modus" mit demselben Image lauffähig; der Multi-User-Stack ist `deploy/multiuser/compose.yml` und
  läuft auf Labor. Umschaltung = ct-agent-Origin von `127.0.0.1:8083` auf `fl-gate:3000` (bzw. `127.0.0.1:3000`).

## Offene Punkte (Abstimmung Labor/Tunnel)
1. Wird der ct-agent für firmware-lab künftig auf Labor betrieben (heute Services)? Tunnel-Token muss dann wandern.
2. Ist `require_login=1` + Access-List für diesen Tunnel im Portal gesetzt (Voraussetzung für `/gate/check`)?
   Studierende müssen auf die Access-List (Kursliste) – Prozess klären (Portal-API?).
3. Docker-Socket-Zugriff für den Broker-Container auf cads-lambda: akzeptabel, oder socket-proxy verpflichtend?
