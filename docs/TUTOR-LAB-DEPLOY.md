# Sprachlabor ausliefern (`tutor-lab`)

Auslieferung des Sprachlabors (Rust + JavaScript) auf dem Laborrechner
**cads-lambda**. Alles, was hier steht, ist wörtlich kopierbar.

Auszuliefernder Stand: **`ghcr.io/scimbe/cads-tutor-lab:next-b5f435f`**
(amd64 + arm64, CI grün, Rauchprobe bestanden).

Dateien: [`deploy/tutor-lab/`](../deploy/tutor-lab/) — `compose.yml`, `deploy.sh`,
`smoke.sh`, `llm-check.sh`, `.env.example`.
Hintergrund und Prüfprotokolle: [`docs/TUTOR-LAB-NOTES.md`](TUTOR-LAB-NOTES.md),
[`images/tutor-lab/README.md`](../images/tutor-lab/README.md).

---

## 0. Voraussetzungen

- Docker mit `docker compose` (v2), `curl` und `python3` auf dem Laborrechner.
- Ausgehend erreichbar: `ghcr.io` (öffentlich lesbar, **kein** `docker login` nötig).
- Etwa 4 GB freier Plattenplatz (0,8 GB Download, 3,4 GB entpackt).
- Der Zugang läuft weiter über den bestehenden Tunnel auf `127.0.0.1:8084`.
  Am Tunnel ändert sich nichts.

## 1. Einmalig: Dateien und `.env`

```bash
mkdir -p ~/cads-tutor-lab && cd ~/cads-tutor-lab
```

Die fünf Dateien aus `deploy/tutor-lab/` des Monorepos hierher kopieren
(`git clone` des Repos und `cp -r deploy/tutor-lab/* ~/cads-tutor-lab/`, oder
per `scp`). Dann:

```bash
cp .env.example .env
chmod 600 .env
$EDITOR .env
```

Auszufüllen sind:

| Wert | Pflicht | Bemerkung |
|---|---|---|
| `TUTOR_LAB_PASSWORD` | ja | gemeinsames Studierenden-Kennwort. Neu erzeugen: `openssl rand -hex 12`. Das bisherige Kennwort steht in der alten `.env` unter `/home/becke/CADS-DEMO-tutor-lab/` |
| `TUTOR_LAB_TAG` | ja | `next-b5f435f` — steht bereits so in `.env.example` |
| `TUTOR_LLM_BASE_URL` | für den Unterricht | Adresse von llm2, **muss mit `https://` beginnen** und endet üblicherweise auf `/v1` |
| `TUTOR_LLM_API_KEY` | für den Unterricht | Schlüssel des Proxys |
| `TUTOR_LLM_MODEL` | für den Unterricht | z. B. `local-devstral-small2` |

Ohne die drei `TUTOR_LLM_*` läuft das Labor, aber der Tutor meldet sich als
nicht eingerichtet: jede Verständnisfrage fällt auf Selbsteinschätzung zurück
und die Hilfestufen bleiben leer. Alle drei oder keine.

**Das Kennwort und der Schlüssel gehören ausschließlich in `.env`.** Die Datei
ist von der Versionsverwaltung ausgenommen; nichts davon darf in `compose.yml`.

## 2. Einmalig: Namen des Datenträgers prüfen

Der Datenträger mit den Studierendenarbeiten heißt beim bisherigen Betrieb
möglicherweise anders als in dieser `compose.yml`. Das ist der einzige Fehler,
der **still** passiert: das Labor liefe, aber alle Arbeiten wären scheinbar weg.
Deshalb einmal nachsehen:

```bash
docker inspect tutor-lab --format '{{range .Mounts}}{{.Name}}{{end}}'
```

Steht dort etwas anderes als `tutor-lab-workspace`, dann diesen Namen in die
`.env` eintragen:

```bash
echo 'TUTOR_LAB_VOLUME=<der ausgegebene Name>' >> .env
```

`deploy.sh` prüft das ohnehin und bricht mit genau dieser Zeile ab, wenn es
nicht passt — Sie können den Schritt also auch dem Skript überlassen.

## 3. Ausliefern

```bash
cd ~/cads-tutor-lab
./deploy.sh --dry-run     # sagt, was passieren würde, ändert nichts
./deploy.sh
```

Das Skript zieht das Abbild, hält den laufenden Behälter an, startet neu, prüft
die Gesundheit und läuft anschließend die Rauchprobe. Schlägt etwas davon fehl,
springt es **selbsttätig** auf den Stand zurück, der vorher lief; das Ziel dafür
liest es vorher aus dem laufenden Behälter aus. Der Aufruf ist wiederholbar:
zweimal derselbe Stand ändert nichts und prüft nur erneut.

## 4. Was Sie sehen müssen

Am Ende von `./deploy.sh`:

```
PASS: tutor-lab smoke test

>> deployed ghcr.io/scimbe/cads-tutor-lab:next-b5f435f on http://127.0.0.1:8084
>> entry links (publish these two, not the bare host):
    javascript: <host>/?folder=/home/coder/workspace/javascript-foundations
    rust: <host>/?folder=/home/coder/workspace/rust-foundations
```

und Rückgabewert `0` (`echo $?`). Darüber müssen unter anderem diese Zeilen
stehen:

```
ok    - container runs the image's own CMD (no overriding command:)
ok    - GET / -> 302 to the login page (the password is enforced)
ok    - entry link rust -> 200 (/?folder=/home/coder/workspace/rust-foundations)
ok    - extension installed: cads.cads-tutor@0.1.0
ok    - the installed cads-tutor filters courses by the opened folder
ok    - /home/coder/workspace/rust-foundations: exactly one course in the tutor tree (rust-foundations)
```

Die Rauchprobe lässt sich jederzeit einzeln wiederholen:

```bash
./smoke.sh
```

## 5. Sprachmodell abnehmen (llm2)

Sobald llm2 läuft — die Werte stehen in `.env`:

```bash
./llm-check.sh
```

Erwartete Ausgabe:

```
ok    - all three TUTOR_LLM_* values are set
ok    - base URL is https://
ok    - GET /models -> 200 in 0.4s (dns …, tcp …, tls …)
ok    - the configured model "local-devstral-small2" is one of the 7 offered
ok    - POST /chat/completions -> 200 in 1.8s, answer: "OK"

PASS: the tutor's ask path will work with these values
```

Der Schlüssel wird dabei nie ausgegeben. Nach einer Änderung an den
`TUTOR_LLM_*`-Werten den Behälter neu starten, sonst arbeitet der Tutor mit den
alten:

```bash
./deploy.sh
```

## 6. Einstiegslinks veröffentlichen

Genau diese zwei, je Sprache einer:

```
https://<labor-host>/?folder=/home/coder/workspace/rust-foundations
https://<labor-host>/?folder=/home/coder/workspace/javascript-foundations
```

Jeder Link öffnet nur seinen Ordner, und der Tutor zeigt darin nur den Kurs, der
zu diesem Ordner gehört.

**Die nackte Adresse `https://<labor-host>/` ist kein Einstieg.** Sie öffnet
wieder, was dieser Browser zuletzt offen hatte, und bei einem frischen Browser
den mehrteiligen Arbeitsbereich mit beiden Sprachen. Bewerben Sie die zwei
Links, nicht den Host.

## 7. Wenn Sie das nicht sehen

| Beobachtung | Ursache | Handgriff |
|---|---|---|
| `error: the running container uses the workspace volume …` | Der Datenträger heißt anders als erwartet | Die vom Skript ausgegebene Zeile `TUTOR_LAB_VOLUME=…` in `.env` eintragen, `./deploy.sh` erneut |
| `warning: the running container belongs to compose project …` | Der alte Betrieb lief unter anderem Projektnamen | Die ausgegebene Zeile `TUTOR_LAB_PROJECT=…` in `.env` eintragen, `./deploy.sh` erneut |
| `FAIL - the container's command differs from the image's CMD` | Eine `command:`-Zeile überschreibt die Betriebsflags des Abbilds. Genau daran ist der erste Anlauf gescheitert: der eingeschränkte Modus war wieder an und damit alle Erweiterungen aus | Die `command:`-Zeile aus der Compose-Datei entfernen. In `deploy/tutor-lab/compose.yml` steht keine — dann liegt eine alte Datei im Verzeichnis |
| `FAIL - GET / -> 200 without a login` | `TUTOR_LAB_PASSWORD` ist leer | Kennwort in `.env` setzen, `./deploy.sh` |
| `FAIL - login failed` | Das Kennwort in `.env` ist nicht das des laufenden Behälters | `./deploy.sh` (setzt das Kennwort aus `.env` neu) |
| `FAIL - the installed cads-tutor has no per-folder course filter` | Der Stand ist älter als die Kursfilterung; beide Links zeigten beide Kurse | Neueren Stand ausliefern (mindestens `next-0d432d3`) |
| `FAIL - /opt/cads-tutor/courses is empty` | Das Abbild enthält keine Kurspakete; der Tutor meldet „No course packs found" | Neueren Stand ausliefern |
| `warning: the container did not become healthy within …` | Der Behälter startet nicht durch | Das Skript springt bereits selbst zurück. Ursache: `docker logs --tail=50 tutor-lab` |
| Im Browser kein CaDS-Tutor-Symbol, Banner „Restricted Mode" | Wie oben: überschriebene Kommandozeile | `./smoke.sh` bestätigt es, dann Compose-Datei prüfen |
| Tutor antwortet nicht auf Fragen, alles andere geht | Sprachmodell nicht eingerichtet oder Adresse nicht `https://` | `./llm-check.sh` |
| Studierende sehen leere Arbeitsbereiche | Falscher Datenträger — siehe erste Zeile dieser Tabelle | **Nicht** neu einspielen, erst den Datenträgernamen richtigstellen |

## 8. Rücksprung von Hand

`deploy.sh` springt bei einem Fehlschlag selbst zurück. Von Hand — der Stand,
der vorher lief, steht in der Ausgabe des vorigen Laufs; welcher gerade läuft:

```bash
docker inspect tutor-lab --format '{{.Config.Image}}'
./deploy.sh --tag <vorheriger Stand>
```

Der Datenträger bleibt dabei unberührt, Port und Tunnel ändern sich nicht.
Soll ein fehlgeschlagener Stand zur Untersuchung stehen bleiben:

```bash
./deploy.sh --tag <neuer Stand> --no-rollback
```

### Umbenennen bewahrt einen Behälter **nicht** (belegt 2026-09-07)

Beim Umstieg vom alten, lokal gebauten Aufbau auf das veröffentlichte Abbild wurde der laufende Behälter
umbenannt, um seinen Namen freizugeben und ihn zugleich als Rücksprung zu behalten. **Das hat nicht
funktioniert:** `docker compose up -d` findet einen Behälter über seine Compose-Etiketten (Projektname und
Servicename), nicht über den Namen — beide Compose-Dateien benutzten dasselbe Projekt `cads-demo-tutor-lab` und
`container_name: tutor-lab`. Compose hat den umbenannten Behälter als denselben Dienst erkannt und ersetzt; er
existiert danach nicht mehr.

**Verloren gegangen ist dabei nichts** — geprüft: der alte Datenträger war unverändert (gleiche Dateien,
gleiche Zeitstempel, readonly gegengelesen) und das alte Abbild lag lokal vor. Verloren war nur der Behälter,
also die *Startbequemlichkeit* des Rücksprungs.

**Folge für den Rücksprung auf einen Stand aus einem anderen Aufbau:** Nicht auf einen umbenannten Behälter
verlassen. Notiere vorher Abbild-Digest, Datenträgernamen und `Config.Cmd`; zurück geht es dann über ein
eigenes `docker run` des alten Abbilds gegen den alten Datenträger, nicht über `docker start`. Innerhalb
*desselben* Aufbaus bleibt `./deploy.sh --tag <vorheriger Stand>` der richtige Weg.

## 9. Aufräumen

Erst wenn der neue Stand einige Tage getragen hat — jede Fassung belegt etwa
3,4 GB:

```bash
docker image rm ghcr.io/scimbe/cads-tutor-lab:<alter Stand>
```

## Was diese Auslieferung nicht ändert

- **Studierendenarbeiten bleiben.** Ein neuer Stand erneuert nur die Dateien,
  die das Abbild selbst verwaltet (die `.vscode/settings.json` mit Markierungszeile);
  eigene Dateien und eigene Bearbeitungen bleiben unberührt.
- **Ein gemeinsames Kennwort, keine Trennung je Studierendem.** Mehrbenutzerbetrieb
  ist der Broker-Aufbau des Firmware-Labors und deckt das Sprachlabor noch nicht ab.
- **Kurse liegen im Abbild.** Neue Kursinhalte heißen neuer Stand, nicht Änderung
  am Datenträger.
- **Die Oberfläche ist auf Englisch, der Tutor auf Deutsch.** Ursache und Stand:
  [`docs/TUTOR-LAB-NOTES.md`](TUTOR-LAB-NOTES.md), Abschnitt zur Anzeigesprache.
