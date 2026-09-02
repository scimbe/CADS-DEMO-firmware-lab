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

Ohne installierte Board-Bridge melden `board`/`flash`/`serialExpect` **„nicht verfügbar“** (kein Fehlschlag,
kein Hinweis-Tier). Ein Step gilt als erledigt, wenn alle Tasks bestanden sind; ein Step ohne Tasks gilt als
erledigt, sobald er geöffnet wurde.

## Grounding und Objectives

`grounding.pack` wählt das tutor-platform-Pack (`firmware`: cads-zero-Docs, 155 Chunks). `sources/**.md`
werden zusätzlich gechunkt und indiziert (Zitat-Quelle „<Kurstitel>“). `objectives` der Steps steuern
Mastery (Fortschritts-View) und proaktive Check-ins; unbekannte IDs sind erlaubt, dann aber ohne Check-in –
lege sie in `<course>/curriculum.json` an (`sourceDocIds` müssen existierende Chunk-IDs des Packs sein).
