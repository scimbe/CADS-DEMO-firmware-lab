---
id: p3-config-option
title: "Projekt: eine Konfigurationsoption"
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
    title: Der Schlüssel wird geparst und serialisiert
    check: { type: all, bloom: create, checks: [ { type: command, cwd: ".", command: "grep -nE 'key_is\\([^)]*project[.]option' modules/config/src/cads_config.c", expectExitCode: 0 }, { type: command, cwd: ".", command: "grep -nE 'append_kv_[a-z]+\\([^)]*project[.]option' modules/config/src/cads_config.c", expectExitCode: 0 }, { type: task, label: "CaDS: Build", expectExitCode: 0 } ] }
  - id: round-trip
    title: Die Host-Suite überlebt deine Änderung
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0, bloom: create }
  - id: defend
    title: Verteidige Standard und Fehlerverhalten
    check: { type: question, prompt: { en: "What does your key default to, and what happens to a running board when its value is malformed?", de: "Worauf steht dein Schlüssel als Standard, und was geschieht mit einem laufenden Board bei einem fehlerhaften Wert?" }, rubric: "Nennt einen konkreten Standardwert und begründet, warum er für ein nie konfiguriertes Board sicher ist. Trennt danach drei Fälle: ein unbekannter Schlüssel wird übersprungen, ein fehlender behält den eingebauten Standard, ein Wert falscher Form lässt den vorherigen intakt - nie eine Struktur voller Nullen. Nennt außerdem, warum diese Option Laufzeitzustand in /config.txt ist und nicht in ein Build-Profil gehört: Profile liest CMake zur Configure-Zeit auf der Entwicklerplatte, die Datei liest die Firmware beim Booten auf dem Board, und ein Feld-Edit darf kein Feature entfernen. Eine Antwort ohne die drei Fehlerfälle besteht nicht.", bloom: create }
socratic:
  - { trigger: "task:option-parsed:failed", question: { en: "Your key has to appear inside two different calls in one file. Which of the two is missing - the parse branch or the serialiser?", de: "Dein Schlüssel muss in zwei verschiedenen Aufrufen derselben Datei auftauchen. Welcher fehlt - der Parse-Zweig oder der Serialisierer?" }, hints: [ { en: "The parser compares keys with key_is(...); follow the existing chain and add a branch in the same shape.", de: "Der Parser vergleicht Schlüssel mit key_is(...); folge der bestehenden Kette und ergänze einen Zweig in derselben Form." }, { en: "The serialiser uses append_kv_uint, append_kv_ip or append_kv_str depending on the type of the value.", de: "Der Serialisierer benutzt append_kv_uint, append_kv_ip oder append_kv_str, je nach Typ des Werts." }, { en: "A comment mentioning the key satisfies neither check - both require the key inside a call.", de: "Ein Kommentar, der den Schlüssel erwähnt, besteht keinen der beiden Checks - beide verlangen den Schlüssel innerhalb eines Aufrufs." } ] }
  - { trigger: "task:round-trip:failed", question: { en: "The host suite is red. Is it the config test, and does it complain about a value or about the shape of the written file?", de: "Die Host-Suite ist rot. Ist es der Config-Test, und beschwert er sich über einen Wert oder über die Form der geschriebenen Datei?" }, hints: [ { en: "Run ctest with --output-on-failure; the config subject is its own binary and names itself.", de: "Führ ctest mit --output-on-failure aus; das Config-Subjekt ist ein eigenes Binary und nennt sich selbst." }, { en: "A key that parses but is not serialised disappears on the first push, which the round-trip test is written to catch.", de: "Ein Schlüssel, der parst, aber nicht serialisiert wird, verschwindet beim ersten Push - genau dafür ist der Rundreisetest da." }, { en: "Give the field a default in the defaults path, not only in the parser, or a board with no file will differ from one with an incomplete file.", de: "Gib dem Feld einen Standard im Defaults-Pfad, nicht nur im Parser, sonst unterscheidet sich ein Board ohne Datei von einem mit unvollständiger Datei." } ] }
  - { trigger: "question:defend:weak", question: { en: "Feed your parser three broken inputs on paper: an unknown key, an omitted key, a value of the wrong shape. What does the board hold after each?", de: "Füttere deinen Parser auf dem Papier mit drei kaputten Eingaben: unbekannter Schlüssel, fehlender Schlüssel, Wert falscher Form. Was hält das Board danach jeweils?" }, hints: [ { en: "The three cases have three different answers, and none of them is a struct full of zeros.", de: "Die drei Fälle haben drei verschiedene Antworten, und keine davon ist eine Struktur voller Nullen." }, { en: "docs/reference/config-file.md states the grammar rules your branch has to keep obeying.", de: "docs/reference/config-file.md nennt die Grammatikregeln, denen dein Zweig weiter folgen muss." }, { en: "Say what your default is and why that value is safe for a board that has never been configured.", de: "Sag, was dein Standard ist und warum dieser Wert für ein nie konfiguriertes Board sicher ist." } ] }
---
## Ziel

Füge CaDS Zero eine echte, dauerhafte Konfigurationsoption hinzu — einen `/config.txt`-Schlüssel, den ein laufendes Board liest, anwendet und bei Fehlern sicher abfängt.

## Worauf du aufbaust

Dieses Projekt setzt die Grundlagen-Steps zur Konfigurationsdatei (m6-02-config-file) und zu Build-Profilen (m6-04-build-profiles) voraus. Die vollständige Formatreferenz ist `docs/reference/config-file.md`; die Aufgaben-Anleitung ist `docs/how-to/configure.md`.

## Anforderungen

- Wähle eine wirklich nützliche Laufzeiteinstellung und ergänze einen Schlüssel mit dem Namen **`project.option`** (benenne ihn in deiner Kopie um, wenn du magst, aber behalte diesen Token, damit der Abnahme-Check ihn findet).
- Ergänze das Feld in der Konfig-Struktur in `modules/config/include/cads/config/config.h`, parse es in `modules/config/src/cads_config.c` (folge den bestehenden `key_is(...)`-Zweigen) und gib ihm einen sinnvollen eingebauten Standard, sodass ein Board ohne Konfigurationsdatei trotzdem bootet.
- **Serialisiere ihn neben den anderen Schlüsseln.** Das ist keine Kür: ein Schlüssel, der geparst, aber nicht geschrieben wird, verschwindet beim ersten `push`, und der Abnahme-Check verlangt beides.
- Mache einen fehlerhaften Wert harmlos: ein unbekannter Schlüssel wird übersprungen und ein schlechter Wert behält den vorherigen — nie eine Struktur voller Nullen.
- Halte ihn aus dem Build-Profil heraus: Profile wählen, welche Apps hineinkompiliert werden, und werden von CMake zur Konfigurationszeit gelesen; deine Option ist Laufzeitzustand, den die Firmware beim Booten liest. `scripts/check_profile.py` ist zum Vergleich das Werkzeug für die Profilseite.

## Abnahme

1. **Parsen und Serialisieren.** Der Schlüssel muss in `modules/config/src/cads_config.c` innerhalb eines `key_is(...)`-Aufrufs *und* innerhalb eines `append_kv_*`-Aufrufs auftauchen — ein Kommentar `/* project.option */` besteht keinen der beiden. Dazu muss das Board-Image bauen.
2. **Rundreise.** Die Host-Suite muss grün bleiben. `tests/unit/test_config.c` prüft die Konfiguration über Schreiben und Wiedereinlesen; ein asymmetrisch ergänzter Schlüssel oder ein fehlender Standard fällt dort auf.
3. **Verteidigung.** Du nennst deinen Standard und das Verhalten bei einem fehlerhaften Wert.

## Liefern

Ein neuer Konfig-Schlüssel, der etwas Setzenswertes tut, mit Standard und sicherer Degradierung, plus eine Notiz, warum er in `/config.txt` gehört und nicht in ein Profil.
