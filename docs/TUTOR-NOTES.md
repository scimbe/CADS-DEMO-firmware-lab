# cads-tutor – Umsetzungsnotizen und Abweichungen von SPEC §3.3

Stand 2026-09-02, Branch `stream-tutor`, Extension `extensions/cads-tutor` (Publisher `cads`, ID `cads.cads-tutor`).

## Abweichungen / Interpretationen

| Spec | Umsetzung | Grund |
|---|---|---|
| View `cadsTutor.step` als Webview-View im Container | **WebviewPanel** (`viewType` `cadsTutor.step`) in `ViewColumn.Beside`, `retainContextWhenHidden`, mit `WebviewPanelSerializer` für Reload | Vorgabe des Leads; Step-Inhalte (Markdown, Code, Bilder) brauchen die Editorbreite; Sidebar bleibt für Tree/Progress |
| LearningEvents in `~/.cads-tutor/events.sqlite` (node:sqlite) | sqlite über tutor-platform `LearningEventStore`; **Feature-Detection**: fehlt `node:sqlite`, JSON-Log `events.json` mit gleicher Schnittstelle | Extension-Host-Node ist nicht garantiert ≥22.13; erster Container-Lauf zeigte, dass ein Bundling-Fehler sonst still alle Events verliert (behoben: esbuild-Shim, Commit siehe Log) |
| `symbolInElf` via `nm` | `arm-none-eabi-nm` (CADS_ARM_TOOLCHAIN_BIN, dann PATH) → Fallback **eigener ELF32-Symtab-Parser** (Thumb-Bit maskiert wie nm) | im code-server-Image ohne Toolchain läuft der Check trotzdem (im Container-Test aktiv genutzt) |
| `debugStop` über Bridge-Event | Bridge-Event **und** `DebugAdapterTracker` (stopped → stackTrace-Response, Top-Frame) | funktioniert auch ohne Bridge mit cortex-debug/jedem DAP |
| `question` = LLM-Rubrik | Rubrik-Prompt mit Grounding-Auszügen + Zeile `VERDICT: pass/fail`; ohne LLM → manuelle Bestätigung (Antwort wird trotzdem gespeichert) | Spec: „ohne LLM → manual“ |
| Proaktiv: nur Dateien des aktuellen Steps | Save im Projekt-Root → nach 2 s Debounce **lokale Checks** des Steps erneut; ist die Datei vom Step referenziert (Task/Link) **und** LLM konfiguriert → `TutorSession.checkIn()` mit erstem kuratiertem Objective; Benachrichtigung max. 1/60 s, nie modal | ohne LLM gibt es kein Check-in; die Live-Checks liefern trotzdem sofortiges Feedback |
| Serial-Muster → kontextbezogene Frage | Bridge `onSerialLine` (HardFault, configASSERT, RESULT: FAIL) und Events `flash-failed`/`debug-stop` → Tutor-Notiz im Panel (authored `socratic` mit `trigger: event:<name>` hat Vorrang); 15 s Entprellung je Muster | Bridge-Exports nach SPEC §3.2; ohne Bridge deaktiviert |
| Onboarding `workbench.startupEditor=none` | wird als User-Setting im Image erwartet (Image-Strang); Extension setzt es nicht selbst | Extension soll keine globalen Settings überschreiben |
| Course-`prerequisites` | sperren alle Steps des Kurses bis alle Steps der Voraussetzungs-Kurse erledigt sind | Spec nennt nur „andere Kurs-IDs“ |
| Step ohne Tasks | gilt als erledigt, sobald er geöffnet wurde | sonst würde er den Kurs blockieren |
| Dialog-Memory (`TutorMemory`/student-memory) | JSONL-Recorder `~/.cads-tutor/dialog.jsonl` | student-memory zieht ~1 GB ONNX/LanceDB; Recall wird von der Extension nicht genutzt |

## Bekannte Grenzen

- **Hardware-Checks** (`board`, `flash`, `serialExpect`, Bridge-Events) sind gegen die Exports-API aus SPEC §3.2 mit einem Fake implementiert und unit-getestet, aber nicht gegen die echte Bridge/Hardware verifiziert (Bridge-Strang, ein ST-Link).
- **LLM-Pfade** (`ask`, `checkIn`, `question`-Rubrik, generischer Hinweis) sind mit einem Fake-LLM getestet; der Live-Endpunkt wurde nicht aufgerufen (kein Key in der Umgebung dieses Strangs). Ohne LLM zeigt „Frag den Tutor“ die Meldung „nicht konfiguriert“ **plus** die per BM25 gefundenen Quellen.
- Der generische (LLM-)Hinweis bei Task-Fehlschlag ohne authored `socratic` wird nur bei manuellem „Prüfen“ angefordert, nicht bei den stillen Live-Checks beim Speichern.
- BM25-Schwelle 8.0 des Firmware-Packs ist streng: kurze Fragen („Wie flashe ich?“) werden abgelehnt; Kurse können `grounding.threshold` senken oder eigene `sources/` mitliefern.
- Beispielkurs `courses/_example` ist Fixture/Doku, nicht als `contributes.cadsTutorCourses` registriert (er würde sonst in jeder Installation neben dem echten Kurs erscheinen).

## Integrationstest (code-server 4.135, Node 24.18 im Extension-Host)

`scripts/tutor-e2e-container.sh <cads-zero>` startet den Container auf 127.0.0.1:8086; Ablauf und Screenshots
in `e2e/tutor/`. Gefunden und behoben durch den Test: (1) esbuild-Shim für `node:sqlite` löste sich selbst auf
→ Events fielen still auf JSON zurück; (2) CSP `style-src` ohne `unsafe-inline` blockierte Inline-Styles des
VS-Code-Webview-Wrappers; (3) Hinweis blieb nach bestandenem Check sichtbar.
