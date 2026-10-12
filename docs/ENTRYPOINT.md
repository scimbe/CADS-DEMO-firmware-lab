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
  Datei-Bind-Mounts fehlt), steht das als `FEHLER` im Log; ebenso ein Symlink, dessen Ziel fehlt
  (`FEHLER: Verweis ins Leere`);
- **nichts wird still übergangen:** andere Einträge, die keine reguläre Datei sind (etwa eine FIFO),
  erscheinen als `uebersprungen (keine regulaere Datei)`;
- Namen werden zeilenweise und **ohne Glob-Expansion** gelesen (`set -f`): ein Name wie `20-*.sh`
  bleibt dieser Name;
- sortiert wird **byteweise** (`LC_ALL=C sort`), unabhängig von der Locale, nach der `ls` sortiert.

Die Skripte laufen wie bisher als Benutzer des Containers (`coder`), nicht als root.

## Warum nicht der Mechanismus des Basis-Images

Das Basis-Image ruft `find "$ENTRYPOINTD" -type f -executable -print -exec {} \;` auf. Befund im
Portal:

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

Der Launcher hängt `15-user-repo.sh` weiter unter `/entrypoint.d/15-user-repo.sh` ein und ruft das
Skript außerdem **selbst über `sh` auf, bevor der Start des Images beginnt**. Danach schreibt er die
Markerdatei `/tmp/.cads-user-repo-erledigt` mit der Startzeit von Prozess 1 (Feld 22 aus
`/proc/1/stat`) – auch dann, wenn das Skript mit einem Rückgabewert ≠ 0 endete.

Der Läufer ruft das Skript in jedem Fall noch einmal auf. Das Skript wertet den Marker so aus:

- **Marker mit der Startzeit dieses Starts:** Der Aufruf tut nichts, endet mit 0 (`… ok` im Log
  des Läufers) und nennt den Grund in einer eigenen Zeile `[cads-start] …`. Der Marker ist damit
  verbraucht.
- **Jeder weitere Aufruf** – etwa von Hand im Terminal – läuft wieder vollständig.
- **Marker eines früheren Starts** desselben Containers (andere Startzeit) oder ein leerer Marker
  zählt nicht und wird entfernt; das Skript läuft.
- **Ohne Marker** läuft das Skript beim Aufruf durch den Läufer wie bisher.

Die Attrappe in `tests/entrypoint/fixtures/` bildet nur dieses Verhalten nach; die Tests prüfen alle
vier Fälle, der Smoke-Test zusätzlich den Vorspann des Launchers gegen das gebaute Image. Auf Systemen
ohne `/proc/1/stat` (macOS) passt kein Marker; die beiden Tests, die einen passenden Marker brauchen,
werden dort übersprungen, die übrigen laufen.

## Eigene Skripte

- Name `NN-zweck.sh`, die Zahl bestimmt die Reihenfolge.
- Trotz Sortierung gilt weiter: ein Skript, das den Workspace braucht, darf den Seed selbst aufrufen
  (`10-seed-workspace.sh` ist idempotent) – `15-user-repo.sh` und `30-git-identity.sh` tun das.
- Immer mit 0 enden, wenn das Fehlen des Ergebnisses kein Fehler ist; ein Rückgabewert ≠ 0 erscheint
  als `FEHLER` im Log.

## Tests

| Was | Aufruf | Braucht |
|---|---|---|
| Läufer: Reihenfolge (byteweise), nicht ausführbare `*.sh`, Fehlerzeilen, Verzeichnis/Symlink/FIFO, Glob-Namen, kein stdin, Marker-Vertrag | `node --test tests/entrypoint/*.test.mjs` | node, sh, bash, git |
| Gebautes Image: Skript von einem `noexec`-tmpfs eingehängt, Portal-Variablen, Vorspann des Launchers mit Marker | `e2e/entrypoint-smoke.sh <image>` | docker, sudo (Linux) |

Einige Tests der Läufer-Datei laufen zusätzlich gegen eine **Mutante**, eine Kopie des Läufers ohne
die jeweilige Absicherung (`sort`, `set -f`, `</dev/null`): Sie muss sich anders verhalten, sonst
prüft der Test nichts.

Der Smoke-Test nimmt für `15-user-repo.sh` eine Attrappe (`tests/entrypoint/fixtures/`). Das echte
Skript liegt im privaten Repository praktikum-creator und wird nicht hierher kopiert;
`CADS_USER_REPO_SCRIPT=<pfad>` lässt den Test mit dem echten Skript laufen.
