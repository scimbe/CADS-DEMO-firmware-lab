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

## Addendum v1.1 – Umsetzung (Stand 2026-09-03, Strang `tutor2`)

| Spec | Umsetzung | Grund |
|---|---|---|
| A1 `command` | `/bin/sh -c` im Projekt-Root, `cwd` relativ; Ausgabe gespeichert als **letzte** 64 KB | das Ende trägt die Diagnose; ein Endlos-Loop würde den Puffer sonst mit Rauschen füllen, bevor der Fehler erscheint |
| A1 `command`-Timeout | SIGTERM, nach 2 s SIGKILL; Timeout wird **vor** Signal-/Spawn-Fehlern gemeldet | eine Shell, die TERM abfängt, darf keinen Check blockieren; der Timeout ist die nützlichere Diagnose als „konnte nicht starten" |
| A1 `testSuite` | Exit-Code des Runners wird **ignoriert**, maßgeblich sind die geparsten Testergebnisse | eine Suite mit `expectFail` endet per Definition ungleich 0 |
| A1 `testSuite`, `minPass` | zählt nur **Blatt**-Tests | sonst zählt eine Suite, die alles in einen äußeren Test wickelt, doppelt |
| A1 `predict` | `then` läuft erst ab 10 Zeichen Vorhersage; die Ausgabe steht vorher **nicht im DOM** | verstecken statt weglassen würde reichen, sie aus der Seite abzulesen |
| A1 `predict`, Bestehen | bestanden, sobald `then` besteht und eine Vorhersage vorliegt; `correct`/`deviated` wird nur festgehalten | Spec A1; falsch zu liegen ist der Sinn der Aufgabe |
| A2 Hinweis-Reihenfolge | `test:<name>:failed` → `misconceptions` → `output:<regex>` → `task:<id>:failed` → generisch | der spezifischere Hinweis benennt die Ursache; A2 nennt die Kurzform `misconceptions` bevorzugt |
| A2 `recallFrom` | nur **erledigte** Steps sind Quellen; Auswahl pro Step und Tag deterministisch | unerledigtes Material abzufragen wäre ein Test; ein Reload soll dieselbe Karte zeigen |
| A3 „im Erstversuch bestanden" | verlangt genau einen Versuch **und** Hinweis-Tier 0 | ein Check, der nach einem Tier-3-Hinweis im ersten Anlauf besteht, ist keine eigenständige Leistung – und genau diese Zahl nutzen Lehrende, um Schwierigkeiten zu erkennen |
| A3 Sessions vor v1.1 | fehlendes `attempts` wird als ein Versuch gelesen | sonst würde alter Fortschritt rückwirkend als „mit Hinweisen" gemeldet |

## A5 Telemetrie – Umsetzung

- Events immer nach `~/.cads-tutor/events.jsonl` (eine JSON-Zeile je Ereignis), zusätzlich zur SQLite; damit
  ist ein Kurs auch dann auswertbar, wenn während des Laufs kein Portal konfiguriert war.
- Mit `CADS_TUTOR_TELEMETRY_URL`: `POST <url>/ingest`, gebündelt (100 Events / 10 s), Header
  `X-CaDS-Student` und `X-CaDS-Token` (`CADS_TUTOR_TELEMETRY_TOKEN`), Warteschlange in
  `~/.cads-tutor/telemetry-queue.jsonl`, exponentieller Backoff (5 s … 5 min).
- **Nichts auf einem Nutzerpfad wartet auf die Zustellung.** `record()` schreibt und kehrt zurück.
- `flush()` **serialisiert** über eine Promise-Kette, statt bei laufendem Versand früh zurückzukehren. Ein
  früher `return` würde `await flush()` zur Lüge machen: `dispose()` käme ohne Zustellung zurück, sobald der
  Intervall-Timer gerade sendet.
- Ein fehlgeschlagener Versand **behält** seine Events; erst jenseits von 5000 Events fallen die ältesten
  heraus. Den Verlauf eines Studierenden wegen eines kurz falschen Tokens zu verwerfen wäre schlimmer als eine
  wachsende Warteschlange.
- Eine halb geschriebene letzte Zeile (harter Kill) wird übersprungen, nicht die ganze Warteschlange verworfen.

**Studierenden-ID:** `CADS_TUTOR_STUDENT` (vom Broker gesetzt), sonst
`sha256(lower(CADS_TUTOR_EMAIL))[:12]` – genau die Rechnung des Brokers –, sonst die lokale Session-UUID.
**Offener Punkt für den Multiuser-/Portal-Strang:** `deploy/multiuser/broker/fl_broker.py` injiziert diese
Variablen heute **nicht** in den Container (`PASSTHROUGH_ENV` kennt nur `TUTOR_LLM_*`). Bis das ergänzt ist,
sind die IDs pro Container und nicht über Container hinweg korrelierbar.

**Feldbefund abgestellt:** `question.asked` wird ausschließlich an einer Stelle erzeugt, dem Ask-Feld.
Rubrik-Strings, Objective-IDs und die Check-ins beim Speichern erzeugen kein solches Event mehr. Eine Eingabe,
die nur eingefügter Code ist, wird weiterhin erfasst, aber mit `data.kind: "code"` markiert, damit das Portal
sie aus dem Fragen-Clustering heraushalten kann; sobald ein Fragezeichen vorkommt, gilt die Eingabe als Frage.

**Bereinigung vor dem Versand** (und in der lokalen Datei): E-Mail-Adressen, URLs mit `user:pass@` und URLs,
deren Query `token`/`api_key`/`access_token`/`password`/`secret`/`sig` trägt. URLs werden **zuerst** ersetzt,
weil ein Userinfo-Teil wie eine E-Mail-Adresse aussieht und sonst halb stehen bliebe.

`edit.metrics` zählt Einfügungen > 200 Zeichen als Paste, alles andere als Tippen; Löschungen werden ignoriert
statt als negatives Tippen gezählt. Aggregiert je Step, gesendet beim Speichern und beim Beenden.

## Bekannte Grenzen

- **Hardware-Checks** (`board`, `flash`, `serialExpect`, Bridge-Events) sind gegen die Exports-API aus SPEC §3.2 mit einem Fake implementiert und unit-getestet, aber nicht gegen die echte Bridge/Hardware verifiziert (Bridge-Strang, ein ST-Link).
- **LLM-Pfade** (`ask`, `checkIn`, `question`-Rubrik, generischer Hinweis) sind mit einem Fake-LLM getestet; der Live-Endpunkt wurde nicht aufgerufen (kein Key in der Umgebung dieses Strangs). Ohne LLM zeigt „Frag den Tutor“ die Meldung „nicht konfiguriert“ **plus** die per BM25 gefundenen Quellen.
- Der generische (LLM-)Hinweis bei Task-Fehlschlag ohne authored `socratic` wird nur bei manuellem „Prüfen“ angefordert, nicht bei den stillen Live-Checks beim Speichern.
- BM25-Schwelle 8.0 des Firmware-Packs ist streng: kurze Fragen („Wie flashe ich?“) werden abgelehnt; Kurse können `grounding.threshold` senken oder eigene `sources/` mitliefern.
- Beispielkurs `courses/_example` ist Fixture/Doku, nicht als `contributes.cadsTutorCourses` registriert (er würde sonst in jeder Installation neben dem echten Kurs erscheinen). Sein Modul `m2` zeigt alle v1.1-Features mit Checks, die tatsächlich laufen.
- `--solutions` des Validators führt nur Checks **oberster Ebene** aus; ein `command` in `all`/`any` oder in `predict.then` wird schema-geprüft, aber nicht ausgeführt (die `seedMustFail`-Semantik eines Teil-Checks in einem `any` ist nicht eindeutig).
- Die Vorhersage-Bewertung braucht `rubric` **und** ein LLM. Ohne beides bleibt das Ergebnis offen, bis der Studierende selbst einschätzt; der Check besteht davon unabhängig.
- Telemetrie ist gegen einen echten lokalen HTTP-Server getestet, nicht gegen das Portal aus A5 (Portal-Strang).

## Integrationstest (code-server 4.135, Node 24.18 im Extension-Host)

`scripts/tutor-e2e-container.sh <cads-zero>` startet den Container auf 127.0.0.1:8086; Ablauf und Screenshots
in `e2e/tutor/`. Gefunden und behoben durch den Test: (1) esbuild-Shim für `node:sqlite` löste sich selbst auf
→ Events fielen still auf JSON zurück; (2) CSP `style-src` ohne `unsafe-inline` blockierte Inline-Styles des
VS-Code-Webview-Wrappers; (3) Hinweis blieb nach bestandenem Check sichtbar.
