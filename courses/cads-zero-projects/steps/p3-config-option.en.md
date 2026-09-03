---
id: p3-config-option
title: "Project: a configuration option"
bloom: create
objectives: [cz.storage.profiles]
requires: []
estimatedMinutes: 90
scaffold: independent
links:
  - { file: "scripts/check_profile.py" }
  - { doc: "docs/reference/config-file.md" }
  - { doc: "docs/how-to/configure.md" }
sources: [modules/config/src/cads_config.c, modules/config/include/cads/config/config.h, docs/reference/config-file.md, tests/unit/test_config.c]
misconceptions:
  - { pattern: "test_config", question: { en: "The config round-trip test failed. Does your key survive being written out and read back in?", de: "Der Konfigurations-Rundreisetest ist gescheitert. Übersteht dein Schlüssel das Herausschreiben und Wiedereinlesen?" }, hints: [ { en: "Parsing and serialising are two separate functions in the same file; a key added to one only is asymmetric.", de: "Parsen und Serialisieren sind zwei getrennte Funktionen in derselben Datei; ein Schlüssel nur in einer davon ist asymmetrisch." }, { en: "The serialiser writes fixed sections; put your key in the section its name belongs to.", de: "Der Serialisierer schreibt feste Abschnitte; setz deinen Schlüssel in den Abschnitt, zu dem sein Name gehört." }, { en: "The default matters too: a board with no config file must produce the same struct as one with a file that omits your key.", de: "Der Standard zählt auch: ein Board ohne Konfigurationsdatei muss dieselbe Struktur ergeben wie eines mit einer Datei, die deinen Schlüssel auslässt." } ] }
tasks:
  - id: option-parsed
    title: The key is parsed and serialised
    check: { type: all, bloom: create, checks: [ { type: task, label: "CaDS: Build", expectExitCode: 0 }, { type: command, cwd: ".", command: "for o in $(find build/itsboard -name 'cads_config.c.obj' -o -name 'cads_config.c.o'); do strings $o | grep -q 'project[.]option' && exit 0; done; exit 1", expectExitCode: 0 }, { type: command, cwd: ".", command: "grep -nE 'key_is[(][^)]*project[.]option' modules/config/src/cads_config.c", expectExitCode: 0 }, { type: command, cwd: ".", command: "grep -nE 'append_kv_[a-z]+[(][^)]*project[.]option' modules/config/src/cads_config.c", expectExitCode: 0 } ] }
  - id: round-trip
    title: The host suite survives your change
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0, bloom: create }
  - id: defend
    title: Defend the default and the failure behaviour
    check: { type: question, prompt: { en: "What does your key default to, and what happens to a running board when its value is malformed? One sentence on the default and why it is safe, three cases - unknown key, missing key, value of the wrong shape - one sentence each, plus one sentence on why this is runtime state in /config.txt and not a build profile.", de: "Worauf steht dein Schlüssel als Standard, und was geschieht mit einem laufenden Board bei einem fehlerhaften Wert? Ein Satz zum Standard und warum er sicher ist, drei Fälle - unbekannter Schlüssel, fehlender Schlüssel, Wert falscher Form - je ein Satz, plus ein Satz dazu, warum das Laufzeitzustand in /config.txt ist und kein Build-Profil." }, rubric: "Names a concrete default value and argues why it is safe for a board that was never configured. Then separates three cases: an unknown key is skipped, an omitted key keeps the built-in default, a value of the wrong shape leaves the previous one intact - never a struct full of zeros. Also names why this option is runtime state in /config.txt rather than a build profile: profiles are read by CMake at configure time on the developer disk, the file is read by the firmware at boot on the board, and a field edit must not be able to remove a feature. An answer without the three failure cases does not pass.", bloom: create }
socratic:
  - { trigger: "task:option-parsed:failed", question: { en: "Your key has to appear inside two different calls in one file. Which of the two is missing - the parse branch or the serialiser?", de: "Dein Schlüssel muss in zwei verschiedenen Aufrufen derselben Datei auftauchen. Welcher fehlt - der Parse-Zweig oder der Serialisierer?" }, hints: [ { en: "Did you add only the parse branch and forget the serialiser, or the other way round? The check wants both, in the same file.", de: "Hast du nur den Parse-Zweig ergänzt und das Serialisieren vergessen - oder umgekehrt? Der Check verlangt beides, in derselben Datei." }, { en: "Open modules/config/src/cads_config.c and put the place where keys are compared next to the place where the file is written; both are in that one file, and the serialiser picks append_kv_uint, append_kv_ip or append_kv_str by the type of the value.", de: "Öffne modules/config/src/cads_config.c und stell die Stelle, an der Schlüssel verglichen werden, neben die Stelle, an der die Datei geschrieben wird; beide stehen in dieser einen Datei, und der Serialisierer wählt append_kv_uint, append_kv_ip oder append_kv_str nach dem Typ des Werts." }, { en: "One sub-check reads the built object file: a comment produces no string literal, so your key has to be genuinely compiled in, not merely written down.", de: "Ein Teil-Check liest die gebaute Objektdatei: ein Kommentar erzeugt kein Zeichenkettenliteral, dein Schlüssel muss also wirklich übersetzt werden und nicht bloß dastehen." } ] }
  - { trigger: "task:round-trip:failed", question: { en: "The host suite is red. Is it the config test, and does it complain about a value or about the shape of the written file?", de: "Die Host-Suite ist rot. Ist es der Config-Test, und beschwert er sich über einen Wert oder über die Form der geschriebenen Datei?" }, hints: [ { en: "Does your value vanish on read-back, or does it come back wrong? The first points at the serialiser, the second at the parse branch.", de: "Verschwindet dein Wert beim Wiedereinlesen, oder kommt er falsch zurück? Das erste deutet auf den Serialisierer, das zweite auf den Parse-Zweig." }, { en: "Run ctest with --output-on-failure; the config subject is its own binary and names itself, and tests/unit/test_config.c shows which assertion breaks.", de: "Führ ctest mit --output-on-failure aus; das Config-Subjekt ist ein eigenes Binary und nennt sich selbst, und tests/unit/test_config.c zeigt, welche Zusicherung bricht." }, { en: "Give the field a default in the defaults path, not only in the parser, or a board with no file will differ from one with an incomplete file.", de: "Gib dem Feld einen Standard im Defaults-Pfad, nicht nur im Parser, sonst unterscheidet sich ein Board ohne Datei von einem mit unvollständiger Datei." } ] }
  - { trigger: "question:defend:weak", question: { en: "Feed your parser three broken inputs on paper: an unknown key, an omitted key, a value of the wrong shape. What does the board hold after each?", de: "Füttere deinen Parser auf dem Papier mit drei kaputten Eingaben: unbekannter Schlüssel, fehlender Schlüssel, Wert falscher Form. Was hält das Board danach jeweils?" }, hints: [ { en: "Do you give the same answer for all three inputs? Then you are checking whether parsing happened, not what is in memory afterwards.", de: "Gibst du für alle drei Eingaben dieselbe Antwort? Dann prüfst du, ob geparst wurde, und nicht, was danach im Speicher steht." }, { en: "docs/reference/config-file.md states the grammar rules your branch has to keep obeying; then walk your branch in modules/config/src/cads_config.c line by line with each of the three inputs.", de: "docs/reference/config-file.md nennt die Grammatikregeln, denen dein Zweig weiter folgen muss; geh danach deinen Zweig in modules/config/src/cads_config.c Zeile für Zeile mit jeder der drei Eingaben durch." }, { en: "The built-in default is produced in the defaults path, before any file is read at all - which value belongs there, and the argument for it, are yours.", de: "Der eingebaute Standard entsteht im Defaults-Pfad, bevor überhaupt eine Datei gelesen wird - welcher Wert dorthin gehört und die Begründung dafür sind deine." } ] }
---
## Goal

Add a real, persisted configuration option to CaDS Zero — a `/config.txt` key that a running board reads, applies, and degrades from safely when it is wrong.

## What you build on

**Prerequisite:** work through this project step only after the Foundations steps `m6-02-config-file` and `m6-04-build-profiles`. The tutor cannot enforce that: `requires:` resolves only steps of the same pack, and the lock in `course.json` demands the whole Foundations course — the ordering among the projects is yours to keep.

This project assumes the Foundations steps on the config file (m6-02-config-file) and build profiles (m6-04-build-profiles). The complete format reference is `docs/reference/config-file.md`; the task walkthrough is `docs/how-to/configure.md`.

## Requirements

- Choose a genuinely useful runtime setting and add a key named **`project.option`** (rename it in your own copy if you prefer, but keep that token so the acceptance check can find it).
- Add the field to the config struct in `modules/config/include/cads/config/config.h`, parse it in `modules/config/src/cads_config.c` (follow the existing `key_is(...)` branches), and give it a sensible built-in default so a board with no config file still boots.
- **Serialise it alongside the other keys.** This is not optional: a key that is parsed but never written disappears on the first `push`, and the acceptance check requires both.
- Make a malformed value harmless: an unrecognised key is skipped and a bad value keeps the previous one — never a struct full of zeros.
- Keep it out of the build profile: profiles select which apps compile in and are read by CMake at configure time; your option is runtime state read by the firmware at boot. `scripts/check_profile.py` is the tool for the profile side, for contrast.

## Acceptance

1. **Parsing and serialising.** First the board image builds. Then a check reads the **built object file** of `modules/config/src/cads_config.c` and requires the string literal `project.option` in it: the compiler throws comments away, so a commented-out key produces no literal and fails this check. Two further checks require the key in the source inside a `key_is(...)` call *and* inside an `append_kv_*` call, so that both directions are really there.
2. **Round trip.** The host suite must stay green. `tests/unit/test_config.c` exercises the configuration through writing out and reading back; a key added asymmetrically, or a missing default, shows up there.
3. **Defence.** You name your default and the behaviour on a malformed value.

## Deliver

One new config key that does something worth setting, with a default and safe degradation, plus a note on why it belongs in `/config.txt` rather than a profile.
