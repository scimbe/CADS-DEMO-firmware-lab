# git-Identität im Firmware-Labor

`git commit` und `git merge` brauchen `user.name` und `user.email`. Das Image setzt beide beim
Containerstart aus der Umgebung (`image/entrypoint.d/30-git-identity.sh`).

| Variable | Bedeutung | Quelle im Portal |
|---|---|---|
| `CADS_GIT_NAME` | Anzeigename der Person | Launcher des praktikum-creator |
| `CADS_GIT_EMAIL` | Login-E-Mail der Person | Launcher des praktikum-creator |

## Regeln

- **Repository zuerst.** Die Werte stehen in der Konfiguration des Repositorys
  `~/workspace/cads-zero` (`.git/config`), nicht in `~/.gitconfig`: Nur `~/workspace` liegt auf dem
  Volume der Person und überlebt einen Neustart.
- **Zusätzlich als Voreinstellung der Sitzung** in `~/.gitconfig`, damit ein zweites Repository
  ebenfalls committen kann. Die Datei entsteht bei jedem Start neu aus der Umgebung.
- **Nie überschreiben.** Jeder der beiden Schlüssel wird nur gesetzt, wo noch nichts steht – im
  Repository wie global. Eine selbst gewählte Identität bleibt, auch wenn der Launcher später andere
  Werte liefert.
- **Fehlende oder leere Variablen:** nichts passiert, kein Fehler. Ein Wert mit Zeilenumbruch oder
  Steuerzeichen gilt als nicht gegeben.
- **Das Log nennt weder Namen noch Adresse**, nur `[cads-git-identity] git-Identitaet gesetzt` bzw.
  `… unveraendert`.
- Die Reihenfolge der Skripte in `/entrypoint.d` ist nicht garantiert (`find` sortiert nicht). Fehlt
  der Workspace noch, ruft das Skript den Seed selbst auf.

## Verhältnis zum Launcher

Der Launcher hängt ein eigenes Skript als `/entrypoint.d/15-user-repo.sh` ein (praktikum-creator,
`launcher/entrypoint.d/15-user-repo.sh`). Es verbindet den Workspace mit dem Repository der Person,
trägt für den Zugang riisc `git-credential-oauth -device` als `credential.helper` ein und setzt die
Identität nach derselben Regel. Greift dieses Skript in einem Container nicht, fehlte bisher beides;
die Identität setzt das Image jetzt unabhängig davon. Den `credential.helper` setzt weiterhin nur der
Launcher (siehe Kommentar zu `git-credential-oauth` im `Dockerfile`).

## Tests

| Was | Aufruf | Braucht |
|---|---|---|
| Quoting, gesetzt/leer/schon vorhanden, Log ohne Personendaten | `node --test tests/git-identity/*.test.mjs` | node, sh, git |
| Gebautes Image: Commit ohne Handgriff, Neustart, eigene Identität | `e2e/git-identity-smoke.sh <image>` | docker |

CI (`image.yml`): Job `logout-unit` führt die Unit-Tests aus, Job `git-identity-smoke` den Test gegen
das frisch gebaute Image.
