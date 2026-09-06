# Kurs-Packs für den CaDS Tutor schreiben (Format v1)

Ein Kurs ist ein Verzeichnis. Der Tutor lädt Kurse aus (Reihenfolge = Vorrang bei gleicher `id`):

1. Extensions mit `contributes.cadsTutorCourses: [{ "path": "courses/<dir>" }]` in ihrer `package.json`
2. `/opt/cads-tutor/courses/*` (Image), `~/.cads-tutor/courses/*` (Nutzer), `<workspace>/.cads-tutor/courses/*` (Projekt)
3. Setting `cadsTutor.extraCourseDirs`

Änderungen an `course.json`/`*.md` werden automatisch neu geladen (FileSystemWatcher); manuell: Command
`cads.tutor.reloadCourses`. Fehler stehen im Output-Channel **CaDS Tutor** mit Datei und Feldpfad.
Vollständiges Beispiel: `extensions/cads-tutor/courses/_example`.

> **Dieses Dokument sagt, wie ein Kurs aufgebaut ist. [`PEDAGOGY-RULES.md`](PEDAGOGY-RULES.md) sagt, wie ein Step
> aussehen muss, damit er etwas taugt** — und das ist verbindlich, nicht empfohlen. Die Kurzfassung: die Antwort
> steht nicht im Steptext; jeder Check muss fehlschlagen können; Hinweis-Stufe 3 ist nie die Lösung; eine Frage je
> Aufgabe; jeder Fachbegriff wird bei erster Verwendung erklärt; die deklarierte Bloom-Stufe muss durch einen
> Check belegt sein, der sie misst. Jede Regel nennt das Review-Finding, aus dem sie stammt
> ([`review/round-1-firmware.md`](review/round-1-firmware.md),
> [`review/round-2-firmware.md`](review/round-2-firmware.md)).

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
der Sinn der Aufgabe.

**Deshalb trägt die Rubrik einer `predict`-Aufgabe keine „Besteht nicht"-Klausel** – anders als bei `question`,
wo R4.4 sie verlangt. Eine solche Klausel behauptete ein Urteil, das die Prüfung gar nicht fällen kann, und das
wäre eine Falschaussage über die eigene Prüfung (R3.4), die schwerer wiegt als die fehlende Aufzählung. Was an
ihre Stelle gehört, ist das **verbreitete falsche Modell**, benannt als das, was es ist: „Eine Vorhersage von 6
für den inneren Bereich übersieht die zweite Überschattung – eine falsche Vorhersage, und das ist ein nützliches
Ergebnis, kein Fehlschlag." Ein Rubrikdurchgang, der die Klausel kursweit zählt, muss die `predict`-Aufgaben
also ausnehmen, sonst meldet er neun Lücken, die keine sind. Mit `rubric` und LLM vergleicht das Modell beides, ohne LLM schätzt der Studierende
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

**Innerhalb von `misconceptions` gewinnt das erste passende Muster, nicht das beste.** `selectOutputInsight`
geht die Liste von oben nach unten durch und nimmt den ersten Treffer. Ein breites Muster verschluckt deshalb
jede spezifischere Diagnose, die darunter steht – und breit ist ein Muster schneller, als es aussieht: `cleanup`
trifft auch den Testnamen „always runs the cleanup", `deep-equal` trifft jede fehlgeschlagene Tiefengleichheit
des Steps. **Spezifische Muster stehen vor breiten.** Wer ein Muster ergänzt, prüft an einer echten Fehlausgabe,
welches zuerst greift: Fehllösung schreiben, Test des Steps laufen lassen, Ausgabe gegen die Musterliste halten.
Ohne diese Probe ist ein neues Muster am Ende der Liste wirkungslos und sieht in den Daten trotzdem aus wie
Abdeckung.

Aus demselben Grund ist ein Muster nur dann Abdeckung, wenn es eine **reale** Ausgabe trifft (R6.2). Beim Zählen
einer Abdeckungstabelle zählt nur, was an einer erzeugten Fehlausgabe belegt wurde.

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

## Fachwörter: gemessen, nicht geraten

Rubriken, Hinweise, Fehlermeldungen und Aufgabentitel benutzen die Fachwörter, die die **Kursrümpfe derselben
Sprachfassung** benutzen – nicht die, die im Lehrbuch stehen. Wer unsicher ist, zählt nach, statt zu wählen:

```bash
grep -o "Trait" courses/<pack>/steps/*.de.md | wc -l
```

Belegt an genau diesem Fall: für den Rust-Kurs war „Eigentum, Ausleihe, Lebensdauer, Merkmal, Mustervergleich"
als Terminologie vorgegeben. Gezählt über die 31 deutschen Steps kommen diese Wörter **null** Mal vor, während
`Trait` 51-mal, `Slice` 48-mal, `Lifetime` 15-mal, `Heap` 11-mal und `Borrow` 11-mal dastehen – neben den
deutschen Wörtern, die der Kurs tatsächlich führt: `Leihe` 49, `Referenz` 61, `Zeichenkette` 33, `Schranke` 31,
`Zweig` 31, `Eigentümer` 10. Eine Rubrik, die von „Merkmalen" spricht, während ihr Step durchgehend „Trait"
sagt, liest sich wie ein anderer Kurs, und die Studierende sucht anschließend nach zwei Begriffen für eine
Sache – zu einem Zeitpunkt, an dem sie ohne Sprachmodell ohnehin allein mit dem Text dasteht.

Wer die Terminologie eines Kurses ändern will, ändert **Rümpfe und Rubriken im selben Zug**. Eine der beiden
Hälften allein umzubenennen ist keine Verbesserung, sondern erzeugt genau die Doppelbenennung, die der
Studierenden schadet.

## Validieren

```bash
python3 scripts/validate-courses.py <PROJECT_ROOT> [--courses-dir DIR] [--only COURSE] [--solutions DIR]
```

Prüft Schema, Querverweise, Repo-Pfade, ELF-Symbole, Zweisprachigkeit, Bloom-Stufen und alle v1.1-Felder.
Das Front Matter liest der Validator mit **demselben Parser wie der Tutor** (`scripts/read-front-matter.mjs`
ruft `extensions/cads-tutor/src/frontmatter.ts` auf). Er lehnt damit genau das ab, was auch die Laufzeit
ablehnt — ein unquotierter Titel mit Doppelpunkt (`title: CaDS: RAM budget`) oder ein unzulässiges Escape in
einem doppelt gequoteten Muster (`"…\s*…"`, in einfachen Anführungszeichen dagegen erlaubt) ist ein Fehler,
kein PASS. Voraussetzung: Node 22.18+ und einmal `npm ci` in `extensions/cads-tutor`; fehlt beides, bricht der
Lauf ab, statt mit einem zweiten Parser zu raten.

**Vorhersage-Steps:** Der Rumpf eines Steps mit `predict`-Check darf den Befehl aus `predict.then` nicht
wörtlich nennen — sonst führt die Studierende ihn aus, liest die Ausgabe und schreibt sie als „Vorhersage" auf.
Die Datei zu nennen ist erlaubt und nötig. Der Validator warnt.

**Erklärtes Bedienvokabular:** Nennt der Kurstext einen Befehl, den keine Prüfung des Pakets ausführt, gehört er
in `operatingRoutes` in der `course.json` (SPEC A9.1a) — mit `why`, einem Satz dazu, was der Kurs damit übt.
`<step-id>` steht dort für die Schritt-ID. Der Validator prüft die Deklaration: genannte Dateien müssen
existieren, das führende Programm muss auffindbar sein, Pfade müssen im Arbeitsbereich liegen. `needsNoTasks:
true` erklärt einen Kurs ohne VS-Code-Tasks.

**Sprache der Freitextfelder:** `rubric` sowie `title`/`description` sind einfache Strings, keine
`{de, en}`-Paare — sie tragen die Sprache ihrer eigenen Datei. Der Validator prüft das mit einer
Funktionswortprobe: ein Feld, das komplett in der falschen Sprache steht, wird gemeldet; bei kurzem oder
fachwortlastigem Text schweigt sie. Das ist kein Schönheitsfehler — ohne Sprachmodell zeigt der Tutor die
Rubrik als Selbstkontrolle an, deutschsprachige Studierende lasen also eine englische Bewertungsanleitung.
Das ist ein **Fehler**, seit beide Sprachkurse umgestellt sind.

Nicht geprüft und auch nicht zu prüfen: zweisprachige `{de, en}`-Objekte (dort ist deutscher Text in einer
`.en.md` richtig) und der Rumpf. Zitate echter Bedienelemente bleiben in ihrer Originalsprache stehen, in beide
Richtungen — `CaDS Board: Konsole öffnen` in einem englischen Text und `Tests: Run All` in einem deutschen
(Regel R11a.7b).

`--solutions DIR` ist die **Negativprobe** für sprachunabhängige Tracks: jeder `command`/`testSuite`-Check läuft
zweimal in einer Kopie des Projekt-Roots — auch dann, wenn er in `predict.then`, `all` oder `any` steckt. Bei
zusammengesetzten Checks zählt die Semantik des Verbunds: `all` besteht nur, wenn alle Kinder bestehen, `any`
schon bei einem, und auf dem Seed gilt die Umkehrung. Im Protokoll steht der Pfad der tatsächlich gelaufenen
Prüfung (`two-mut/then`, `substance/all[1]`). Ein `predict` beobachtet ein Programm, das es schon gibt; seine
`then`-Prüfung besteht deshalb regulär auf dem Seed und trägt `seedMustFail: false`.

Sonst gilt: ohne Lösung **muss der Check fehlschlagen**, mit der darübergelegten Referenzlösung **muss er
bestehen**. Ein Check, der schon auf dem Seed-Workspace besteht, ist ein Fehler; ist das ausnahmsweise
beabsichtigt, trägt er `seedMustFail: false`. Fehlt das Werkzeug
(kein `cargo`, kein `node`), wird die Probe mit Warnung übersprungen statt fehlzuschlagen.


## Grounding und Objectives

`grounding.pack` wählt das tutor-platform-Pack (`firmware`: cads-zero-Docs, 155 Chunks). `sources/**.md`
werden zusätzlich gechunkt und indiziert (Zitat-Quelle „<Kurstitel>“). `objectives` der Steps steuern
Mastery (Fortschritts-View) und proaktive Check-ins; unbekannte IDs sind erlaubt, dann aber ohne Check-in –
lege sie in `<course>/curriculum.json` an (`sourceDocIds` müssen existierende Chunk-IDs des Packs sein).
