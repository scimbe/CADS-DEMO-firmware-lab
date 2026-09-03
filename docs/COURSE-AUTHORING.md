# Kurs-Packs für den CaDS Tutor schreiben (Format v1)

Ein Kurs ist ein Verzeichnis. Der Tutor lädt Kurse aus (Reihenfolge = Vorrang bei gleicher `id`):

1. Extensions mit `contributes.cadsTutorCourses: [{ "path": "courses/<dir>" }]` in ihrer `package.json`
2. `/opt/cads-tutor/courses/*` (Image), `~/.cads-tutor/courses/*` (Nutzer), `<workspace>/.cads-tutor/courses/*` (Projekt)
3. Setting `cadsTutor.extraCourseDirs`

Änderungen an `course.json`/`*.md` werden automatisch neu geladen (FileSystemWatcher); manuell: Command
`cads.tutor.reloadCourses`. Fehler stehen im Output-Channel **CaDS Tutor** mit Datei und Feldpfad.
Vollständiges Beispiel: `extensions/cads-tutor/courses/_example`.

```
<course>/course.json
<course>/steps/<stepId>.en.md      Pflicht (Front Matter + Markdown)
<course>/steps/<stepId>.de.md      optional, Fallback en
<course>/assets/**                 Bilder (relativ im Markdown: ![..](diagram.svg))
<course>/sources/**.md             optional: zusätzliche Grounding-Quellen für „Frag den Tutor“
<course>/curriculum.json           optional: neue Objectives (Array oder {track: [...]})
```

## course.json

```jsonc
{
  "id": "cads-zero-foundations", "version": "1.0.0", "schema": 1,
  "title": { "de": "…", "en": "…" }, "description": { "de": "…", "en": "…" },
  "project": { "root": "cads-zero", "repo": "https://github.com/scimbe/cads-zero" },
  "prerequisites": [],                          // andere Kurs-IDs; sperren alle Steps bis diese Kurse fertig sind
  "grounding": { "pack": "firmware", "threshold": 8.0 },   // tutor-platform Content-Pack + BM25-Schwelle
  "modules": [ { "id": "m0", "title": { "de": "…", "en": "…" }, "steps": ["m0-01-welcome"] } ]
}
```

`project.root`: Unterordner des Workspace; existiert er nicht, gilt der Workspace selbst als Projekt-Root.
Alle `file`/`elf`/`doc`-Pfade sind relativ dazu und dürfen ihn nicht verlassen.

## Step-Datei

```yaml
---
id: m0-02-connect                  # muss dem Dateinamen entsprechen
title: Connect the board
bloom: apply                       # remember|understand|apply|analyze|evaluate|create
objectives: [firmware-how-to-flash]   # IDs aus content-packs/curriculum.json (tutor-platform) oder <course>/curriculum.json
requires: [m0-01-welcome]          # Step-IDs desselben Kurses; alle müssen erledigt sein
estimatedMinutes: 10
links:
  - { step: m0-03-build }
  - { file: "scripts/cads_env.sh", line: 30, title: {de: "…", en: "…"} }
  - { doc: "docs/how-to/flash.md" }
  - { url: "https://…", title: "…" }
tasks:
  - id: connected
    title: Board connected          # string oder {de,en}; optional description
    check: { type: board, state: connected }
scaffold: worked                   # worked | faded | independent (Default independent)
recallFrom: [m0-01-welcome]        # Steps, deren question-Aufgabe als Wiederholungskarte erscheinen darf
misconceptions:                    # RegExp auf die Ausgabe der Checks dieses Steps
  - pattern: "error\\[E0382\\]"
    question: { en: "…", de: "…" }
    hints: [ {en: "…", de: "…"}, {en: "…", de: "…"} ]
socratic:
  - trigger: "task:connected:failed"   # oder "event:hardfault|assert|result-fail|flash-failed|debug-stop", oder "*"
    question: { en: "…", de: "…" }
    hints: [ {en: "…", de: "…"}, {en: "…", de: "…"}, {en: "…", de: "…"} ]   # Tier 1..3 bei 1., 2., ≥3. Fehlschlag
---
Markdown (GFM). Links: [Text](step:m0-03-build), [Text](file:core/cads_hal.h#L42), [Text](doc:docs/HARDWARE.md).
```

Titel mit `: ` in YAML quoten (`title: "Build (Task: X)"`). Die Aufgabenliste (Task-IDs) der `.en.md` ist
maßgeblich; die `.de.md` liefert Titel/Beschreibungen/Body auf Deutsch.

## Check-Typen

| type | Felder | Quelle |
|---|---|---|
| `board` | `state`: connected (default) / disconnected / halted / running | Board-Bridge |
| `task` | `label` (Task-Name aus tasks.json), `expectExitCode` (0), `timeoutMs` | VS Code Tasks |
| `build` | `label` **oder** `preset` (→ `cmake --preset P && cmake --build --preset P`) oder nichts (→ Setting `cadsTutor.buildTaskLabel`, Default `CaDS: Build`) | VS Code Tasks |
| `fileMatches` / `fileNotMatches` | `file`, `pattern` (RegExp), `flags` | lokal, läuft auch beim Speichern („live“) |
| `symbolInElf` | `elf`, `symbol` | `arm-none-eabi-nm` (CADS_ARM_TOOLCHAIN_BIN/PATH), Fallback eingebauter ELF32-Parser |
| `flash` | `since`: stepStart (default) / sessionStart / any, `file` | Board-Bridge `getStatus().lastFlash` |
| `serialExpect` | `send`, `pattern`, `timeoutMs` (30 s) | Board-Bridge `waitForSerial` |
| `debugStop` | `file`, `line`, `timeoutMs` (60 s) | Bridge-Event `debug-stop` **und** DebugAdapterTracker (cortex-debug) |
| `question` | `prompt` {de,en}, `rubric`, `bloom`, `minChars` (20) | LLM-Rubrik (grounded); ohne LLM → manuelle Bestätigung |
| `manual` | `label` | Button „Als erledigt markieren“ |
| `all` / `any` | `checks: [...]` | Komposition |
| `command` | `command`, `cwd` (relativ, muss im Projekt-Root bleiben), `expectExitCode` (0), `expectStdout`/`expectStderr` (RegExp, je auf ihrem Strom), `timeoutMs` (120 s) | `/bin/sh -c` im Projekt-Root |
| `testSuite` | `runner`: cargo \| node-test \| tap \| custom, `command` (Pflicht bei tap/custom), `cwd`, `expectPass`, `expectFail`, `minPass`, `timeoutMs` | Kommando + Parser (siehe unten) |
| `predict` | `prompt` {de,en}, `then` (der beobachtete Check), `rubric` (optional), `bloom` (Default `evaluate`), `minChars` (10) | Vorhersage, dann `then` |

### `command`

Läuft mit `/bin/sh -c` im Projekt-Root; `cwd` verengt das relativ dazu und darf ihn nicht verlassen (die
Runtime prüft das erneut, auch wenn der Validator es schon abgelehnt hat). Bestanden, wenn der Exit-Code
passt **und** jede gesetzte RegExp auf ihrem eigenen Strom matcht – `expectStdout` sieht nur stdout,
`expectStderr` nur stderr. Die Ausgabe wird gespeichert (letzte 64 KB, weil das Ende die Diagnose trägt) und
steht `misconceptions` und `output:`-Triggern zur Verfügung.

### `testSuite`

Wertet **einzelne** Testergebnisse aus, damit ein Hinweis den gebrochenen Test benennen kann.

| runner | Default-Kommando | Parser |
|---|---|---|
| `cargo` | `cargo test` | libtests `test <name> ... ok\|FAILED\|ignored`; Modulpfade bleiben erhalten (`tests::a::b`) |
| `node-test` | `node --test --test-reporter=tap` | TAP 13 inklusive verschachtelter Subtests |
| `tap` | – (`command` ist Pflicht) | TAP 13 |
| `custom` | – (`command` ist Pflicht) | TAP 13; für jedes Werkzeug, das TAP ausgeben kann |

Bestanden, wenn alle `expectPass` bestanden, alle `expectFail` fehlgeschlagen sind und mindestens `minPass`
**Blatt**-Tests bestanden haben. Ohne alle drei Angaben besteht der Check, wenn Ergebnisse geparst wurden und
keines fehlschlug.

Fünf Punkte, an denen Autoren sonst stolpern:

- **Der Exit-Code des Runners wird ignoriert.** Eine Suite mit einem absichtlich roten Test (`expectFail`)
  endet per Definition ungleich 0; maßgeblich sind die geparsten Ergebnisse.
- **Verschachtelte Tests sind unter beiden Namen ansprechbar**, dem Blattnamen (`inner`) und dem vollen Pfad
  (`outer > inner`). `expectPass` akzeptiert beides.
- **Ein Test mit Subtests zählt nicht zu `minPass`.** Sonst würde eine Suite, die alles in einen äußeren Test
  wickelt, doppelt gezählt.
- **`# SKIP` und `# TODO` gelten als übersprungen, nie als bestanden.** Ein übersprungener Test in
  `expectPass` lässt den Check fehlschlagen.
- **`cargo test -- --format terse` gibt Punkte statt Namen aus.** Dann lässt sich nichts parsen, und der Check
  meldet genau das, statt stillschweigend zu bestehen. Nicht verwenden.

Gibt das Kommando nichts Parsbares aus, schlägt der Check mit „no test results could be parsed" fehl – ein
Check, der immer besteht, wäre wertlos.

### `predict`

```yaml
- id: guess
  check:
    type: predict
    prompt: { en: "What will this print, and why?", de: "Was gibt das aus, und warum?" }
    rubric: "The prediction names the printed value and refers to ownership"   # optional
    bloom: evaluate
    then: { type: command, command: "cargo run --bin ch04_move" }
```

Das Panel führt `then` **erst aus, wenn eine Vorhersage von mindestens `minChars` (10) Zeichen vorliegt** –
die Ausgabe steht vorher nicht einmal im DOM, sonst könnte man sie ablesen und abschreiben. Danach stehen
Vorhersage und tatsächliche Ausgabe nebeneinander.

**Bestanden ist der Check, sobald `then` besteht und eine Vorhersage vorliegt.** Ob die Vorhersage stimmte,
wird als `correct`/`deviated` festgehalten, ist aber nie eine Hürde: falsch zu liegen und zu sehen warum, ist
der Sinn der Aufgabe. Mit `rubric` und LLM vergleicht das Modell beides, ohne LLM schätzt der Studierende
selbst ein. `then` darf kein weiteres `predict` und kein `question`/`manual` sein – dort gäbe es nichts zu
beobachten.

Ohne installierte Board-Bridge melden `board`/`flash`/`serialExpect` **„nicht verfügbar“** (kein Fehlschlag,
kein Hinweis-Tier). Ein Step gilt als erledigt, wenn alle Tasks bestanden sind; ein Step ohne Tasks gilt als
erledigt, sobald er geöffnet wurde.

## Lehr-Features (Addendum v1.1)

### `scaffold`

`worked` (alles vorgemacht) → `faded` (Lücken) → `independent` (Default, eigenständig). Das Panel zeigt ein
Badge und einen Einzeiler dazu. Gedacht als Verlauf **innerhalb eines Moduls**: der erste Step macht vor, der
letzte lässt machen.

### `recallFrom`

Beim Öffnen des Steps zeigt das Panel **eine** `question`-Aufgabe aus einem der genannten Steps als kurze
Wiederholung. Bedingungen, damit die Karte erscheint:

- der genannte Step existiert, ist **nicht** dieser Step, und ist **erledigt** (unerledigtes Material
  abzufragen wäre ein Test, keine Wiederholung),
- er besitzt mindestens eine `question`-Aufgabe (sonst warnt der Validator, dass die Karte nie erscheint).

Die Auswahl ist pro Step und Tag deterministisch, damit ein Reload dieselbe Karte zeigt. Die Karte ist
überspringbar und blockiert den Step nie; die Antwort wird als LearningEvent (`remember`) gespeichert.

### `misconceptions` und die neuen Trigger

`misconceptions` sind RegExp auf das, was die `command`/`testSuite`-Checks des Steps ausgegeben haben – die
Kurzform für den typischen Compiler- oder Laufzeitfehler. Äquivalent ist der Trigger `output:<regex>`; die
Kurzform ist die bevorzugte Schreibweise und gewinnt, wenn beide dasselbe treffen.

`test:<name>:failed` feuert für einen fehlgeschlagenen Test aus einem `testSuite`-Check (Blattname oder
`outer > inner`).

**Reihenfolge, wenn mehreres passt** (der spezifischere Hinweis gewinnt):

1. `test:<name>:failed` – benennt den Test, der gebrochen ist,
2. `misconceptions`, dann `output:<regex>` – benennen die Fehlerklasse,
3. `task:<id>:failed` – weiß nur, dass die Aufgabe fehlschlug,
4. generischer Hinweis (LLM, falls konfiguriert).

Das Hinweis-Tier (1..3) folgt wie bisher der Zahl der Fehlschläge. Ein Trigger, der in seinem Step nie feuern
kann – `test:` ohne `testSuite`-Aufgabe, `output:` ohne `command`/`testSuite` –, ist eine Warnung des
Validators, kein Fehler.

### Modul-Reflexion

```jsonc
{ "id": "m1", "title": { "de": "…", "en": "…" }, "steps": ["…"],
  "reflection": { "prompts": [ { "de": "…", "en": "…" } ] } }   // 1–3 Prompts
```

Ist der **letzte** Step des Moduls erledigt, zeigt das Panel die Reflexionskarte. Die Antworten landen in der
Session und als LearningEvent (`evaluate`); die Fortschrittsansicht zeigt je Modul, ob eine Reflexion vorliegt.

### Fortschrittsansicht

Je Modul: Steps erledigt, Checks **im Erstversuch** bestanden gegenüber **mit Hinweisen**, offene Checks,
Vorhersagen korrekt/abweichend und ob die Reflexion vorliegt. „Erstversuch" verlangt beides – genau einen
Versuch **und** keinen gezeigten Hinweis: ein Check, der nach einem Tier-3-Hinweis im ersten Anlauf besteht,
ist keine eigenständige Leistung.

## Validieren

```bash
python3 scripts/validate-courses.py <PROJECT_ROOT> [--courses-dir DIR] [--only COURSE] [--solutions DIR]
```

Prüft Schema, Querverweise, Repo-Pfade, ELF-Symbole, Zweisprachigkeit, Bloom-Stufen und alle v1.1-Felder.
PyYAML wird genutzt, wenn vorhanden; sonst greift ein eingebauter Parser, der dieselben Ergebnisse liefert.

`--solutions DIR` ist die **Negativprobe** für sprachunabhängige Tracks: jeder `command`/`testSuite`-Check auf
oberster Ebene läuft zweimal in einer Kopie des Projekt-Roots – ohne Lösung **muss er fehlschlagen**, mit der
darübergelegten Referenzlösung **muss er bestehen**. Ein Check, der schon auf dem Seed-Workspace besteht, ist
ein Fehler; ist das ausnahmsweise beabsichtigt, trägt der Check `seedMustFail: false`. Fehlt das Werkzeug
(kein `cargo`, kein `node`), wird die Probe mit Warnung übersprungen statt fehlzuschlagen.

Nur Checks auf oberster Ebene werden ausgeführt; ein `command` innerhalb von `all`/`any` oder in `predict.then`
wird zwar schema-geprüft, aber nicht ausgeführt.

## Grounding und Objectives

`grounding.pack` wählt das tutor-platform-Pack (`firmware`: cads-zero-Docs, 155 Chunks). `sources/**.md`
werden zusätzlich gechunkt und indiziert (Zitat-Quelle „<Kurstitel>“). `objectives` der Steps steuern
Mastery (Fortschritts-View) und proaktive Check-ins; unbekannte IDs sind erlaubt, dann aber ohne Check-in –
lege sie in `<course>/curriculum.json` an (`sourceDocIds` müssen existierende Chunk-IDs des Packs sein).
