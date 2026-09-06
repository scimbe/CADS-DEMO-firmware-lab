# Firmware-Labor ausliefern (`firmware-lab`)

Auslieferung des Firmware-Labors auf dem **Services-Host**. Alles hier ist
wörtlich kopierbar.

Dateien: [`deploy/firmware-lab/`](../deploy/firmware-lab/) — `deploy.sh`,
`smoke.sh`, `.env.example`.
Hintergrund: [`docs/IMAGE-NOTES.md`](IMAGE-NOTES.md), [`README.md`](../README.md).
Das Sprachlabor hat sein eigenes Verfahren: [`docs/TUTOR-LAB-DEPLOY.md`](TUTOR-LAB-DEPLOY.md).

**Kein Compose.** Dieser Host betreibt das Labor per `docker run` (SPEC §1), und
ob `docker compose` dort überhaupt vorhanden ist, lässt sich nur auf dem Host
selbst feststellen. `deploy.sh` bleibt deshalb bei `docker run` und bringt
Neustart-Regel, Gesundheitsprüfung, Etiketten und benannten Datenträger als
Aufrufparameter mit — es geht nichts verloren. Ein `docker run`, das mit dem
Abbildnamen endet, kann den CMD des Abbilds zudem gar nicht überschreiben.

---

## 0. Zuerst: der Plattenplatz

Das ist auf diesem Host die enge Stelle, nicht das Abbild.

| | |
|---|---|
| Zuletzt frei | ≈ 4,4 GB |
| Abbild entpackt | ≈ 3,75 GB |
| Download | ≈ 1,0 GB |
| Sicherheitsabstand | 1 GB |
| **Gebraucht** | **≈ 5,8 GB** |

**Es reicht derzeit nicht.** `deploy.sh` prüft das vor dem Ziehen und bricht ab,
statt die Platte zu füllen und den laufenden Betrieb mitzunehmen. Machen Sie
vorher Platz — der ältere Stand ist der offensichtliche Kandidat:

```bash
docker images | grep cads-firmware-lab
docker image rm ghcr.io/scimbe/cads-firmware-lab:<ältester Stand>
df -h /var/lib/docker
```

Der laufende Stand lässt sich nicht entfernen, solange er läuft — das ist so
gewollt. Die Schätzung ist absichtlich der volle entpackte Umfang: ein neuer
Stand teilt sich die meisten Schichten mit einem bereits vorhandenen, aber wie
viel genau, weiß man erst nach dem Ziehen, und ein Irrtum in diese Richtung
kostet den laufenden Betrieb.

## 1. Einmalig: Dateien und `.env`

```bash
mkdir -p ~/cads-firmware-lab && cd ~/cads-firmware-lab
```

Die drei Dateien aus `deploy/firmware-lab/` hierher kopieren, dann:

```bash
cp .env.example .env
chmod 600 .env
$EDITOR .env
```

| Wert | Pflicht | Bemerkung |
|---|---|---|
| `FIRMWARE_LAB_PASSWORD` | ja | gemeinsames Studierenden-Kennwort; das bisherige steht in der `.env` des laufenden Betriebs |
| `FIRMWARE_LAB_TAG` | ja | unveränderlicher Stand, z. B. `next-76e083c`; nie `next` oder `latest` |
| `TUTOR_LLM_BASE_URL` | ja | llm2, **muss `https://`** sein |
| `TUTOR_LLM_API_KEY` | ja | Schlüssel |
| `TUTOR_LLM_MODEL` | ja | z. B. `local-devstral-small2` |
| `FIRMWARE_LAB_PUBLIC_URL` | empfohlen | die öffentliche Adresse hinter dem Tunnel; nur dann prüft die Rauchprobe auch den Tunnel und nicht bloß den lokalen Port |

Die drei `TUTOR_LLM_*` sind auf diesem Host **Pflicht**: `deploy.sh` verweigert
den Deploy ohne sie (`--allow-no-llm` hebt das auf). Ohne Modell unterrichtet der
Tutor zwar weiter, aber jede Verständnisfrage fällt auf Selbsteinschätzung
zurück und die Hilfestufen bleiben leer — und zwar lautlos.

Kennwort und Schlüssel gehören ausschließlich in `.env`; die Datei ist von der
Versionsverwaltung ausgenommen.

## 2. Ausliefern

```bash
cd ~/cads-firmware-lab
./deploy.sh --dry-run     # sagt, was passieren würde, ändert nichts
./deploy.sh
```

Reihenfolge im Skript: Kennwort und Modell prüfen, laufenden Stand als
Rücksprungziel merken, Datenträgernamen vergleichen, **Plattenplatz prüfen**,
ziehen, neu starten, Gesundheit abwarten, Rauchprobe. Fällt etwas davon durch,
springt es selbsttätig auf den vorher laufenden Stand zurück.

Der Aufruf ist wiederholbar: ergäbe er denselben Behälter, rührt er ihn nicht an
(„already matches this configuration exactly"). Ein geänderter Stand, ein
geändertes Kennwort oder ein anderer Port erzeugen ihn neu.

## 3. Was Sie sehen müssen

```
PASS: firmware-lab smoke test

>> deployed ghcr.io/scimbe/cads-firmware-lab:next-76e083c on http://127.0.0.1:8083
>> entry point: <host>/?folder=/home/coder/workspace/cads-zero
```

Rückgabewert `0` (`echo $?`). Darüber unter anderem:

```
ok    - container runs the image's own CMD (nothing appended after the image name)
ok    - GET / -> 302 to the login page (the password is enforced)
ok    - CaDS extension installed: cads.cads-tutor@…
ok    - CaDS extension installed: cads.cads-probe@…
ok    - CaDS extension installed: cads.cads-board-bridge@…
ok    - /home/coder/workspace/cads-zero: 2 firmware course(s) in the tutor tree (cads-zero-foundations,cads-zero-projects)
ok    - the tutor's model answers: "OK" in 1.8s
```

Einzeln wiederholbar:

```bash
./smoke.sh                 # alles, inklusive einer echten Anfrage an llm2
./smoke.sh --no-llm-call   # ohne das Modell zu belasten
```

## 4. Einstiegspunkt

```
https://<services-host>/?folder=/home/coder/workspace/cads-zero
```

Ein Ordner, ein Kursbaum mit beiden Firmware-Kursen (*CaDS Zero – Foundations*
und *CaDS Zero – Projects*) — anders als im Sprachlabor gibt es hier nichts zu
filtern, beide Kurse gehören zu diesem Ordner.

Das Board hängt am Rechner der Studierenden und wird aus dem Browser bedient
(WebUSB über `cads-probe`); auf dem Host ist dafür nichts einzurichten.

## 5. Wenn Sie das nicht sehen

| Beobachtung | Ursache | Handgriff |
|---|---|---|
| `error: not enough free disk to pull …` | Abschnitt 0 | Aufgelistete Abbilder entfernen, erneut. **Nicht** mit `--skip-disk-check` erzwingen, solange die Platte wirklich knapp ist |
| `error: the running container uses the workspace volume …` | Datenträger heißt anders | Die ausgegebene Zeile `FIRMWARE_LAB_VOLUME=…` in `.env`, erneut |
| `error: only N of the three TUTOR_LLM_* values are set` | Modell unvollständig | `.env` ergänzen |
| `error: TUTOR_LLM_BASE_URL is not https://` | Adresse falsch | Auf `https://…/v1` ändern |
| `FAIL - the container's command differs from the image's CMD` | Nach dem Abbildnamen wurden Argumente angehängt. Genau das hat den eingeschränkten Modus verursacht: alle Erweiterungen aus | Behälter über `./deploy.sh` neu erzeugen, nichts von Hand anhängen |
| `FAIL - GET / -> 200 without a login` | `FIRMWARE_LAB_PASSWORD` leer | Kennwort setzen, `./deploy.sh` |
| `FAIL - CaDS extension MISSING: cads.cads-probe` | Stand ohne Board-Erweiterungen | Neueren Stand ausliefern |
| `FAIL - the container's language model endpoint is not reachable` | llm2 aus oder Netzweg zu | llm2 prüfen; das Labor läuft weiter, nur die Fragen des Tutors nicht |
| `FAIL - the endpoint rejects the key` | Schlüssel abgelaufen | Neuen Schlüssel in `.env`, `./deploy.sh` |
| `FAIL - the tunnel does not answer` | Behälter in Ordnung, ct-agent nicht | Tunnel des Hosts nach dessen eigener Anleitung |
| `warning: the container did not become healthy` | Behälter startet nicht durch | Das Skript springt bereits zurück; Ursache: `docker logs --tail=50 firmware-lab` |

## 6. Rücksprung von Hand

```bash
docker inspect firmware-lab --format '{{.Config.Image}}'   # was läuft
./deploy.sh --tag <vorheriger Stand>
```

Datenträger, Port und Tunnel bleiben unberührt. Einen fehlgeschlagenen Stand zur
Untersuchung stehen lassen: `./deploy.sh --tag <neu> --no-rollback`.

## 7. Was diese Auslieferung nicht ändert

- **Studierendenarbeiten bleiben.** Der Datenträger wird nur beim ersten Start
  bestückt und von einem neuen Stand nie überschrieben.
- **Ein gemeinsames Kennwort**, keine Trennung je Studierendem; Mehrbenutzerbetrieb
  ist [`docs/MULTIUSER.md`](MULTIUSER.md).
- **Kurse liegen im Abbild.** Neue Kursinhalte heißen neuer Stand.
- **Kein USB am Host.** Das Board hängt beim Studierenden (ADR-001).
