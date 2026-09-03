# cads-tutor – Integrationstest (code-server im Container)

Container: `codercom/code-server:latest` (4.135.0, Extension-Host Node 24.18) auf 127.0.0.1:8086, gestartet mit
`scripts/tutor-e2e-container.sh <cads-zero-checkout>` (VSIX installiert, Beispielkurs unter
`/opt/cads-tutor/courses/_example`, Workspace = Kopie von cads-zero ohne `build/` und `.git`, plus das
ELF-Fixture unter `build/itsboard/`). Kein LLM konfiguriert, keine Board-Bridge installiert.

Ablauf (Playwright MCP, 2026-09-02) und Belege in `screenshots/`:

| # | Schritt | Erwartung | Beleg |
|---|---|---|---|
| 1 | Erste Aktivierung ohne Session | Panel öffnet Step 1, Tree zeigt Kurs → Modul → Step mit Icons (aktiv/gesperrt), Statusleiste „🎓 Tutor: Welcome …“, Live-Checks: README ✔, Hello ITS ✘ mit Hinweis 1/3 | `01-activation.png` |
| 2 | Sprachumschalter „Deutsch“ | Panel, Tree und Statusleiste auf Deutsch, Session speichert `language: de` | `02-german.png` |
| 3 | Datei-Link `file:` im Panel → Editor öffnet `cads_desktop.c`; Kommentar `Hello ITS` eingefügt, Cmd+S | Save → Debounce 2 s → Checks laufen erneut, Task ✔, Step erledigt, Tree: Welcome ✔ (1/4), „Firmware bauen“ entsperrt (○), Statusleiste „… ✔“, Notification „Step erledigt! … Freigeschaltet: Firmware bauen“ | `05-after-save.png`, `06-step-done.png`, `07-panel-done.png` |
| 4 | „Frag den Tutor“ ohne LLM | Antwortbox: „… nicht konfiguriert (TUTOR_LLM_…)“ **plus** per BM25 gefundene Quellen (Kurs-`sources/`) | `08-ask-unconfigured.png` |
| 5 | „Weiter“ → Step 2 | Statusleiste „Tutor: Firmware bauen“; `symbolInElf` besteht per eingebautem ELF32-Parser (kein nm im Container) | `09-step2.png` |
| 6 | „Prüfen“ auf Task-Check ohne passenden Task | Fehlschlag mit klarer Meldung, authored sokratischer Hinweis Tier 1 | `10-task-failed-hint.png` |
| 7 | Neuinstallation der korrigierten VSIX, Container-Neustart, Reload | Session wird fortgesetzt (Log: `resumed session … m0-02-build`, `learning events: sqlite`), Panel wird **nicht** aufgedrängt, Statusleiste zeigt den Step; Klick auf die Statusleiste öffnet das Panel | `11-resumed-session.png`, `12-statusbar-open.png` |
| 8 | Fortschritts-View | Mastery je Objective aus dem Event-Log (firmware-how-to-build ★ nach bestandenem Check) | `13-progress-view.png` |
| 9 | Walkthrough | „CaDS Firmware Lab: Erste Schritte“ erscheint in *Welcome: Open Walkthrough…* | `14-walkthrough-picker.png` |

Output-Channel „CaDS Tutor“ im Container (Auszug):

```
resumed session 9802fb62-…: example-course/m0-02-build
learning events: sqlite (/home/coder/.cads-tutor/events.sqlite)
INFO /opt/cads-tutor/courses/_example: loaded course "example-course" v1.0.0 (4 steps, image)
Board-Bridge not installed – board/flash/serial checks report 'unavailable'
check m0-01-welcome/hello [fileMatches] → passed: found /Hello ITS/ in apps/desktop/cads_desktop.c:24
```

## Zweiter Lauf: echte Kurs-Packs (2026-09-02, nach Merge von `next`)

`COURSES` unbesetzt → das Script kopiert `courses/cads-zero-foundations` und `courses/cads-zero-projects` nach
`/opt/cads-tutor/courses`. Log: `loaded course "cads-zero-foundations" v1.0.0 (41 steps)`, `"cads-zero-projects" (6 steps)`,
`0 error(s)`, `indexed 70 project file(s)`, `grounding: 2884 chunks`, `learning events: sqlite`.

| # | Schritt | Erwartung | Beleg |
|---|---|---|---|
| 1 | Aktivierung ohne Session | Panel öffnet `m0-01-welcome` („Welcome to the CaDS firmware lab“, Step 1 of 41), Statusleiste zeigt den Step, Progress-View listet Plattform- und Pack-Objectives (`cz.*`) | `20-foundations-activation.png` |
| 2 | Tree | Kurs → Module M0–M8 (Titel, Fortschritt 0/n) → Steps mit Sperr-Icons entlang `requires` | `21-foundations-modules.png` |
| 3 | Sprachumschalter | „Willkommen im CaDS-Firmware-Labor“, Module auf Deutsch (M3 – Debugging als Handwerk …) | `22-foundations-german.png` |
| 4 | `doc:docs/HARDWARE.md` | Markdown-Vorschau der cads-zero-Kopie öffnet sich | `23-doc-link.png` |
| 5 | `step:` und `file:scripts/cads_env.sh#L28` | Step-Link springt zu m0-02 (gesperrt, Banner nennt den fehlenden Step); Datei-Link öffnet den Editor an Zeile 28 | `24-file-link.png` |

## Dritter Lauf: Addendum v1.1 (2026-09-03, Strang `tutor2`)

Eigenes Kurs-Pack `e2e/tutor/courses/v11-e2e` (drei Steps, ein Modul mit Reflexion), gestartet mit
`COURSES=$PWD/e2e/tutor/courses/v11-e2e scripts/tutor-e2e-container.sh <cads-zero>`. Getrieben mit eigenem
Headless-Chromium über Playwright; die Skripte liegen unter `e2e/tutor/v11/` und sind wiederholbar:

```bash
COURSES=$PWD/e2e/tutor/courses/v11-e2e PORT=8086 scripts/tutor-e2e-container.sh ~/git/cads-zero
docker exec cads-tutor-e2e bash -lc 'printf "ANSWER=7\n" > /home/coder/workspace/cads-zero/e2e-answer.txt'
SHOTS=e2e/tutor/screenshots node e2e/tutor/v11/01-testsuite.mjs
SHOTS=e2e/tutor/screenshots node e2e/tutor/v11/02-predict-misconception-reflection.mjs
SHOTS=e2e/tutor/screenshots node e2e/tutor/v11/03-editor-edit-and-recall.mjs
```

Kein LLM konfiguriert, keine Board-Bridge – alles unten läuft ohne beides.

| # | Schritt | Erwartung | Beleg |
|---|---|---|---|
| 1 | Step öffnet | `scaffold: faded` als Badge „Guided" plus Einzeiler; Tree zeigt 0/3 | `30-v11-step-open.png` |
| 2 | `testSuite` (runner `custom`, TAP) auf falschem Dateiinhalt | Fehlschlag benennt **den** Test: „expected test \"answer is 42\" to pass, but it failed; only 1 of the required 2 tests passed"; Hinweis kommt aus `test:answer is 42:failed`, nicht generisch | `31-v11-testsuite-failed.png` |
| 3 | Datei **im Editor** korrigiert (Quick Open, Meta+A, tippen, Meta+S), Check erneut | „2 test(s) passed"; der Hinweis verschwindet mit dem Bestehen | `40-v11-editor-edit.png`, `41-v11-suite-green-after-editor-fix.png`, `32-v11-testsuite-passed.png` |
| 4 | Wiederholungskarte auf Step 2 | „From an earlier step: Make the test suite green" mit der `question`-Aufgabe des erledigten Steps, „Skip" vorhanden; beantwortet → „Noted." | `34-v11-recall-card.png`, `42-v11-recall-answered.png` |
| 5 | `predict` vor der Vorhersage | „Predict first", **kein** „Check"-Knopf, und `ANSWER=42` steht **nirgends** in der Seite | `35-v11-predict-before.png` |
| 6 | Vorhersage „no" (2 Zeichen) | abgelehnt: „Write a prediction first (at least 10 characters)", `then` läuft nicht | – |
| 7 | Echte Vorhersage | Vorhersage und tatsächliche Ausgabe nebeneinander, Ausgabe erst jetzt sichtbar, ohne LLM zwei Selbsteinschätzungs-Knöpfe | `36-v11-predict-after.png` |
| 8 | Selbsteinschätzung „wich ab" | wird festgehalten, der Check bleibt bestanden | `37-v11-predict-selfassessed.png` |
| 9 | `command`-Check ohne die Datei | Fehlkonzept greift auf „No such file or directory": authored Frage „Which directory does a command check run in?" statt generischem Hinweis | `38-v11-misconception.png` |
| 10 | Letzter Step des Moduls erledigt | Reflexionskarte mit beiden Modul-Prompts; nach dem Speichern „Reflection saved." | `39-v11-reflection.png` |

### Telemetrie (SPEC A5) gegen ein Schein-Portal

Container mit `CADS_TUTOR_TELEMETRY_URL=http://host.docker.internal:8099`,
`CADS_TUTOR_TELEMETRY_TOKEN=e2e-secret-token`, `CADS_TUTOR_STUDENT=a1b2c3d4e5f6`
(`scripts/tutor-e2e-container.sh` reicht diese drei Variablen jetzt durch); Gegenstelle
`node e2e/tutor/v11/fake-portal.mjs`.

| Beobachtung | Ergebnis |
|---|---|
| Ziel und Header | `POST /ingest`, `X-CaDS-Student: a1b2c3d4e5f6`, `X-CaDS-Token: e2e-secret-token`, `content-type: application/json` |
| Bündelung | zwei Requests im 10-s-Takt (2 und 5 Events), nicht ein Request je Ereignis |
| Bereinigung | „contact me at student@example.org" kam als „contact me at **[redacted-email]**" an – die Adresse verlässt den Container nicht |
| Feldbefund | `question.asked` nur aus dem Ask-Feld, mit `kind: "question"`; Rubriken und Objectives erzeugen kein solches Event |
| Hinweis-Herkunft | `hint.shown` trägt `source: "test"` und `matched: "answer is 42"` |
| Portal aus | drei weitere Checks liefen normal weiter, 11 Events lagen in `~/.cads-tutor/telemetry-queue.jsonl` | `44-v11-portal-down.png` |
| Portal zurück | die 11 gestauten plus das neue Event kamen als ein Batch von 12 an, danach war die Warteschlange leer |

`edit.metrics` wurde durch die Editor-Korrektur ausgelöst und kam als
`{"typedChars": 9, "pastedChars": 0, "pasteEvents": 0}` an – neun getippte Zeichen für `ANSWER=42`.

### Durch den Lauf gefunden und behoben

1. **`session.end` doppelt.** Der Controller wird sowohl über `context.subscriptions` als auch von
   `deactivate()` entsorgt; im Ereignis-Log standen fünf Paare identischer `session.end` im Abstand von
   13–51 ms. `dispose()` ist jetzt idempotent. (Im Container ließ sich danach kein weiteres graceful
   `deactivate` auslösen, um den Einzelfall zu beobachten; die Korrektur ist per Code belegt, nicht per Lauf.)
2. **`predict.made` für eine Nicht-Vorhersage.** Die abgelehnten zwei Zeichen erzeugten trotzdem ein
   `predict.made`; die Auswertung hätte eine Vorhersage gezählt, die nie stattfand. Das Ereignis entsteht jetzt
   erst ab `minChars`.
3. **Tastatur im Webview.** Workbench-Kürzel (Quick Open, Speichern) wirken erst, wenn der Fokus das
   Panel-iframe verlassen hat, und code-server meldet dem Browser eine Mac-Plattform – also `Meta+A`/`Meta+S`,
   nicht `Control`. Ohne das landeten die Tastenanschläge im Panel und lösten dort den Check erneut aus.
4. **Empfehlungs-Toast blockiert Klicks.** `extensions.ignoreRecommendations: true` steht jetzt in den
   E2E-Settings, und die Skripte räumen Benachrichtigungen vorher weg.
