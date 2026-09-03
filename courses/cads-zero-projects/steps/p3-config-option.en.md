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
    check: { type: all, bloom: create, checks: [ { type: command, cwd: ".", command: "grep -nE 'key_is\\([^)]*project[.]option' modules/config/src/cads_config.c", expectExitCode: 0 }, { type: command, cwd: ".", command: "grep -nE 'append_kv_[a-z]+\\([^)]*project[.]option' modules/config/src/cads_config.c", expectExitCode: 0 }, { type: task, label: "CaDS: Build", expectExitCode: 0 } ] }
  - id: round-trip
    title: The host suite survives your change
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0, bloom: create }
  - id: defend
    title: Defend the default and the failure behaviour
    check: { type: question, prompt: { en: "What does your key default to, and what happens to a running board when its value is malformed?", de: "Worauf steht dein Schlüssel als Standard, und was geschieht mit einem laufenden Board bei einem fehlerhaften Wert?" }, rubric: "Names a concrete default value and argues why it is safe for a board that was never configured. Then separates three cases: an unknown key is skipped, an omitted key keeps the built-in default, a value of the wrong shape leaves the previous one intact - never a struct full of zeros. Also names why this option is runtime state in /config.txt rather than a build profile: profiles are read by CMake at configure time on the developer disk, the file is read by the firmware at boot on the board, and a field edit must not be able to remove a feature. An answer without the three failure cases does not pass.", bloom: create }
socratic:
  - { trigger: "task:option-parsed:failed", question: { en: "Your key has to appear inside two different calls in one file. Which of the two is missing - the parse branch or the serialiser?", de: "Dein Schlüssel muss in zwei verschiedenen Aufrufen derselben Datei auftauchen. Welcher fehlt - der Parse-Zweig oder der Serialisierer?" }, hints: [ { en: "The parser compares keys with key_is(...); follow the existing chain and add a branch in the same shape.", de: "Der Parser vergleicht Schlüssel mit key_is(...); folge der bestehenden Kette und ergänze einen Zweig in derselben Form." }, { en: "The serialiser uses append_kv_uint, append_kv_ip or append_kv_str depending on the type of the value.", de: "Der Serialisierer benutzt append_kv_uint, append_kv_ip oder append_kv_str, je nach Typ des Werts." }, { en: "A comment mentioning the key satisfies neither check - both require the key inside a call.", de: "Ein Kommentar, der den Schlüssel erwähnt, besteht keinen der beiden Checks - beide verlangen den Schlüssel innerhalb eines Aufrufs." } ] }
  - { trigger: "task:round-trip:failed", question: { en: "The host suite is red. Is it the config test, and does it complain about a value or about the shape of the written file?", de: "Die Host-Suite ist rot. Ist es der Config-Test, und beschwert er sich über einen Wert oder über die Form der geschriebenen Datei?" }, hints: [ { en: "Run ctest with --output-on-failure; the config subject is its own binary and names itself.", de: "Führ ctest mit --output-on-failure aus; das Config-Subjekt ist ein eigenes Binary und nennt sich selbst." }, { en: "A key that parses but is not serialised disappears on the first push, which the round-trip test is written to catch.", de: "Ein Schlüssel, der parst, aber nicht serialisiert wird, verschwindet beim ersten Push - genau dafür ist der Rundreisetest da." }, { en: "Give the field a default in the defaults path, not only in the parser, or a board with no file will differ from one with an incomplete file.", de: "Gib dem Feld einen Standard im Defaults-Pfad, nicht nur im Parser, sonst unterscheidet sich ein Board ohne Datei von einem mit unvollständiger Datei." } ] }
  - { trigger: "question:defend:weak", question: { en: "Feed your parser three broken inputs on paper: an unknown key, an omitted key, a value of the wrong shape. What does the board hold after each?", de: "Füttere deinen Parser auf dem Papier mit drei kaputten Eingaben: unbekannter Schlüssel, fehlender Schlüssel, Wert falscher Form. Was hält das Board danach jeweils?" }, hints: [ { en: "The three cases have three different answers, and none of them is a struct full of zeros.", de: "Die drei Fälle haben drei verschiedene Antworten, und keine davon ist eine Struktur voller Nullen." }, { en: "docs/reference/config-file.md states the grammar rules your branch has to keep obeying.", de: "docs/reference/config-file.md nennt die Grammatikregeln, denen dein Zweig weiter folgen muss." }, { en: "Say what your default is and why that value is safe for a board that has never been configured.", de: "Sag, was dein Standard ist und warum dieser Wert für ein nie konfiguriertes Board sicher ist." } ] }
---
## Goal

Add a real, persisted configuration option to CaDS Zero — a `/config.txt` key that a running board reads, applies, and degrades from safely when it is wrong.

## What you build on

This project assumes the Foundations steps on the config file (m6-02-config-file) and build profiles (m6-04-build-profiles). The complete format reference is `docs/reference/config-file.md`; the task walkthrough is `docs/how-to/configure.md`.

## Requirements

- Choose a genuinely useful runtime setting and add a key named **`project.option`** (rename it in your own copy if you prefer, but keep that token so the acceptance check can find it).
- Add the field to the config struct in `modules/config/include/cads/config/config.h`, parse it in `modules/config/src/cads_config.c` (follow the existing `key_is(...)` branches), and give it a sensible built-in default so a board with no config file still boots.
- **Serialise it alongside the other keys.** This is not optional: a key that is parsed but never written disappears on the first `push`, and the acceptance check requires both.
- Make a malformed value harmless: an unrecognised key is skipped and a bad value keeps the previous one — never a struct full of zeros.
- Keep it out of the build profile: profiles select which apps compile in and are read by CMake at configure time; your option is runtime state read by the firmware at boot. `scripts/check_profile.py` is the tool for the profile side, for contrast.

## Acceptance

1. **Parsing and serialising.** The key must appear in `modules/config/src/cads_config.c` inside a `key_is(...)` call *and* inside an `append_kv_*` call — a comment `/* project.option */` passes neither. The board image must also build.
2. **Round trip.** The host suite must stay green. `tests/unit/test_config.c` exercises the configuration through writing out and reading back; a key added asymmetrically, or a missing default, shows up there.
3. **Defence.** You name your default and the behaviour on a malformed value.

## Deliver

One new config key that does something worth setting, with a default and safe degradation, plus a note on why it belongs in `/config.txt` rather than a profile.
