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
