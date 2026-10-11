# Startskripte des Firmware-Labors (`/entrypoint.d`)

Vor code-server laufen die Skripte in `/entrypoint.d`: die des Images (`10-seed-workspace.sh`,
`20-logout-config.sh`, `30-git-identity.sh`) und solche, die ein Betreiber einhängt – das Portal
hängt `15-user-repo.sh` per Bind-Mount ein.

## Ablauf

`/usr/bin/entrypoint.sh` stammt aus dem Basis-Image `codercom/code-server` und bleibt unverändert
(fixuid, `DOCKER_USER`, `exec code-server`). Es führt aus, was in `$ENTRYPOINTD` liegt. Das Image
setzt `ENTRYPOINTD=/usr/local/lib/cads-entrypoint`; dort liegt nur der eigene Läufer
(`image/entrypoint/run-entrypoint-d.sh`), und der führt die Skripte in `/entrypoint.d` aus:

- **alle regulären Dateien, sortiert nach Namen** (10-, 15-, 20-, 30-);
- **ausführbare direkt**; eine `*.sh`, die nicht ausführbar ist, über den Interpreter ihrer ersten
  Zeile (`bash`, wenn dort bash steht, sonst `sh`); andere nicht ausführbare Dateien werden
  übersprungen und genannt;
- **eine Logzeile je Skript:** `entrypoint: <name> ok` oder `entrypoint: <name> FEHLER rc=<n>` –
  nur Name und Rückgabewert, nie Inhalte;
- **ein Fehler hält den Start nicht auf:** code-server kommt hoch, das Log sagt, was fehlt;
- liegt statt einer Datei ein Verzeichnis vor (das legt Docker an, wenn die Quelle eines
  Datei-Bind-Mounts fehlt), steht das als `FEHLER` im Log.

Die Skripte laufen wie bisher als Benutzer des Containers (`coder`), nicht als root.

## Warum nicht der Mechanismus des Basis-Images

Das Basis-Image ruft `find "$ENTRYPOINTD" -type f -executable -print -exec {} \;` auf. Befund im
Portal (2026-10-11):

- `-executable` fragt `access(X_OK)`. Das Portal hängt `15-user-repo.sh` von einem tmpfs unter `/run`
  ein, das mit `noexec` eingehängt ist. Die Datei hat Modus 0755, gilt aber als nicht ausführbar und
  wurde **still übersprungen** – weder git-Identität noch `credential.helper` wurden je gesetzt.
- `find` sortiert nicht: `20-logout-config.sh` lief vor `10-seed-workspace.sh`.
- Ein scheiterndes Skript fiel nicht auf.

## Sicherheit

- Ausgeführt wird nur, was in `/entrypoint.d` liegt. Das Verzeichnis gehört `root:root`, Modus 755;
  der Benutzer des Containers kann dort nichts ablegen (der Smoke-Test prüft das). Dasselbe gilt für
  den Läufer und sein Verzeichnis.
- Neu ist, dass auch eine **nicht ausführbare** `*.sh` läuft. Das erweitert den Kreis nicht über
  dieses Verzeichnis hinaus: Wer dort eine Datei ablegen oder einhängen kann, ist root im Image-Bau
  oder der Betreiber des Docker-Hosts. `noexec` auf der Quelle eines Bind-Mounts ist damit für
  Startskripte kein Schutz mehr – das war es nie verlässlich (ein Aufruf über `sh datei` umgeht es).
- Die Skripte laufen ohne root. Im Basis-Image hat `coder` allerdings `sudo` ohne Passwort; das ist
  unverändert und nicht Gegenstand dieser Änderung. Was jemand per `sudo` in `/entrypoint.d` ablegt,
  liefe beim nächsten Start desselben Containers – wieder nur als `coder`.

## Zusammenspiel mit dem Launcher

Der Launcher hängt `15-user-repo.sh` weiter unter `/entrypoint.d/15-user-repo.sh` ein. Angekündigt
ist, dass er das Skript künftig zusätzlich selbst über `sh` aufruft und danach
`CADS_USER_REPO_ERLEDIGT=1` setzt; das Skript beendet sich dann sofort mit 0. Der Läufer ruft es in
jedem Fall auf: Ist die Variable gesetzt, passiert beim zweiten Aufruf nichts (`… ok` im Log); ist
sie nicht gesetzt, läuft das Skript hier. Beide Fälle prüfen die Tests.

## Eigene Skripte

- Name `NN-zweck.sh`, die Zahl bestimmt die Reihenfolge.
- Trotz Sortierung gilt weiter: ein Skript, das den Workspace braucht, darf den Seed selbst aufrufen
  (`10-seed-workspace.sh` ist idempotent) – `15-user-repo.sh` und `30-git-identity.sh` tun das.
- Immer mit 0 enden, wenn das Fehlen des Ergebnisses kein Fehler ist; ein Rückgabewert ≠ 0 erscheint
  als `FEHLER` im Log.

## Tests

| Was | Aufruf | Braucht |
|---|---|---|
| Läufer: Reihenfolge, nicht ausführbare `*.sh`, Fehlerzeile, Verzeichnis statt Datei | `node --test tests/entrypoint/*.test.mjs` | node, sh, bash, git |
| Gebautes Image: Skript von einem `noexec`-tmpfs eingehängt, Portal-Variablen | `e2e/entrypoint-smoke.sh <image>` | docker, sudo |

Der Smoke-Test nimmt für `15-user-repo.sh` eine Attrappe (`tests/entrypoint/fixtures/`). Das echte
Skript liegt im privaten Repository praktikum-creator und wird nicht hierher kopiert;
`CADS_USER_REPO_SCRIPT=<pfad>` lässt den Test mit dem echten Skript laufen.
