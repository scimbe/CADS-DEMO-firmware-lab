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
    check: { type: all, bloom: create, checks: [ { type: task, label: "CaDS: Build", expectExitCode: 0 }, { type: command, cwd: ".", command: "for o in $(find build/itsboard -name 'cads_config.c.obj' -o -name 'cads_config.c.o'); do strings $o | grep -q 'project[.]option' && exit 0; done; exit 1", expectExitCode: 0 }, { type: command, cwd: ".", command: "grep -nE 'key_is[(][^)]*project[.]option' modules/config/src/cads_config.c", expectExitCode: 0 }, { type: command, cwd: ".", command: "grep -nE 'append_kv_[a-z]+[(][^)]*project[.]option' modules/config/src/cads_config.c", expectExitCode: 0 } ] }
  - id: round-trip
    title: Die Host-Suite überlebt deine Änderung
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0, bloom: create }
  - id: defend
    title: Verteidige Standard und Fehlerverhalten
    check: { type: question, prompt: { en: "What does your key default to, and what happens to a running board when its value is malformed? One sentence on the default and why it is safe, three cases - unknown key, missing key, value of the wrong shape - one sentence each, plus one sentence on why this is runtime state in /config.txt and not a build profile.", de: "Worauf steht dein Schlüssel als Standard, und was geschieht mit einem laufenden Board bei einem fehlerhaften Wert? Ein Satz zum Standard und warum er sicher ist, drei Fälle - unbekannter Schlüssel, fehlender Schlüssel, Wert falscher Form - je ein Satz, plus ein Satz dazu, warum das Laufzeitzustand in /config.txt ist und kein Build-Profil." }, rubric: "Nennt einen konkreten Standardwert und begründet, warum er für ein nie konfiguriertes Board sicher ist. Trennt danach drei Fälle: ein unbekannter Schlüssel wird übersprungen, ein fehlender behält den eingebauten Standard, ein Wert falscher Form lässt den vorherigen intakt - nie eine Struktur voller Nullen. Nennt außerdem, warum diese Option Laufzeitzustand in /config.txt ist und nicht in ein Build-Profil gehört: Profile liest CMake zur Configure-Zeit auf der Entwicklerplatte, die Datei liest die Firmware beim Booten auf dem Board, und ein Feld-Edit darf kein Feature entfernen. Eine Antwort ohne die drei Fehlerfälle besteht nicht.", bloom: create }
socratic:
  - { trigger: "task:option-parsed:failed", question: { en: "Your key has to appear inside two different calls in one file. Which of the two is missing - the parse branch or the serialiser?", de: "Dein Schlüssel muss in zwei verschiedenen Aufrufen derselben Datei auftauchen. Welcher fehlt - der Parse-Zweig oder der Serialisierer?" }, hints: [ { en: "Did you add only the parse branch and forget the serialiser, or the other way round? The check wants both, in the same file.", de: "Hast du nur den Parse-Zweig ergänzt und das Serialisieren vergessen - oder umgekehrt? Der Check verlangt beides, in derselben Datei." }, { en: "Open modules/config/src/cads_config.c and put the place where keys are compared next to the place where the file is written; both are in that one file, and the serialiser picks append_kv_uint, append_kv_ip or append_kv_str by the type of the value.", de: "Öffne modules/config/src/cads_config.c und stell die Stelle, an der Schlüssel verglichen werden, neben die Stelle, an der die Datei geschrieben wird; beide stehen in dieser einen Datei, und der Serialisierer wählt append_kv_uint, append_kv_ip oder append_kv_str nach dem Typ des Werts." }, { en: "One sub-check reads the built object file: a comment produces no string literal, so your key has to be genuinely compiled in, not merely written down.", de: "Ein Teil-Check liest die gebaute Objektdatei: ein Kommentar erzeugt kein Zeichenkettenliteral, dein Schlüssel muss also wirklich übersetzt werden und nicht bloß dastehen." } ] }
  - { trigger: "task:round-trip:failed", question: { en: "The host suite is red. Is it the config test, and does it complain about a value or about the shape of the written file?", de: "Die Host-Suite ist rot. Ist es der Config-Test, und beschwert er sich über einen Wert oder über die Form der geschriebenen Datei?" }, hints: [ { en: "Does your value vanish on read-back, or does it come back wrong? The first points at the serialiser, the second at the parse branch.", de: "Verschwindet dein Wert beim Wiedereinlesen, oder kommt er falsch zurück? Das erste deutet auf den Serialisierer, das zweite auf den Parse-Zweig." }, { en: "Run ctest with --output-on-failure; the config subject is its own binary and names itself, and tests/unit/test_config.c shows which assertion breaks.", de: "Führ ctest mit --output-on-failure aus; das Config-Subjekt ist ein eigenes Binary und nennt sich selbst, und tests/unit/test_config.c zeigt, welche Zusicherung bricht." }, { en: "Give the field a default in the defaults path, not only in the parser, or a board with no file will differ from one with an incomplete file.", de: "Gib dem Feld einen Standard im Defaults-Pfad, nicht nur im Parser, sonst unterscheidet sich ein Board ohne Datei von einem mit unvollständiger Datei." } ] }
  - { trigger: "question:defend:weak", question: { en: "Feed your parser three broken inputs on paper: an unknown key, an omitted key, a value of the wrong shape. What does the board hold after each?", de: "Füttere deinen Parser auf dem Papier mit drei kaputten Eingaben: unbekannter Schlüssel, fehlender Schlüssel, Wert falscher Form. Was hält das Board danach jeweils?" }, hints: [ { en: "Do you give the same answer for all three inputs? Then you are checking whether parsing happened, not what is in memory afterwards.", de: "Gibst du für alle drei Eingaben dieselbe Antwort? Dann prüfst du, ob geparst wurde, und nicht, was danach im Speicher steht." }, { en: "docs/reference/config-file.md states the grammar rules your branch has to keep obeying; then walk your branch in modules/config/src/cads_config.c line by line with each of the three inputs.", de: "docs/reference/config-file.md nennt die Grammatikregeln, denen dein Zweig weiter folgen muss; geh danach deinen Zweig in modules/config/src/cads_config.c Zeile für Zeile mit jeder der drei Eingaben durch." }, { en: "The built-in default is produced in the defaults path, before any file is read at all - which value belongs there, and the argument for it, are yours.", de: "Der eingebaute Standard entsteht im Defaults-Pfad, bevor überhaupt eine Datei gelesen wird - welcher Wert dorthin gehört und die Begründung dafür sind deine." } ] }
---
## Ziel

Füge CaDS Zero eine echte, dauerhafte Konfigurationsoption hinzu — einen `/config.txt`-Schlüssel, den ein laufendes Board liest, anwendet und bei Fehlern sicher abfängt.

## Worauf du aufbaust

**Voraussetzung:** Bearbeite diesen Projekt-Step erst nach den Grundlagen-Steps `m6-02-config-file` und `m6-04-build-profiles`. Der Tutor kann das nicht erzwingen: `requires:` löst nur Steps desselben Packs auf, und die Sperre in `course.json` verlangt den gesamten Grundlagenkurs — die Reihenfolge innerhalb der Projekte liegt bei dir.

Dieses Projekt setzt die Grundlagen-Steps zur Konfigurationsdatei (m6-02-config-file) und zu Build-Profilen (m6-04-build-profiles) voraus. Die vollständige Formatreferenz ist `docs/reference/config-file.md`; die Aufgaben-Anleitung ist `docs/how-to/configure.md`.

## Anforderungen

- Wähle eine wirklich nützliche Laufzeiteinstellung und ergänze einen Schlüssel mit dem Namen **`project.option`** (benenne ihn in deiner Kopie um, wenn du magst, aber behalte diesen Token, damit der Abnahme-Check ihn findet).
- Ergänze das Feld in der Konfig-Struktur in `modules/config/include/cads/config/config.h`, parse es in `modules/config/src/cads_config.c` (folge den bestehenden `key_is(...)`-Zweigen) und gib ihm einen sinnvollen eingebauten Standard, sodass ein Board ohne Konfigurationsdatei trotzdem bootet.
- **Serialisiere ihn neben den anderen Schlüsseln.** Das ist keine Kür: ein Schlüssel, der geparst, aber nicht geschrieben wird, verschwindet beim ersten `push`, und der Abnahme-Check verlangt beides.
- Mache einen fehlerhaften Wert harmlos: ein unbekannter Schlüssel wird übersprungen und ein schlechter Wert behält den vorherigen — nie eine Struktur voller Nullen.
- Halte ihn aus dem Build-Profil heraus: Profile wählen, welche Apps hineinkompiliert werden, und werden von CMake zur Konfigurationszeit gelesen; deine Option ist Laufzeitzustand, den die Firmware beim Booten liest. `scripts/check_profile.py` ist zum Vergleich das Werkzeug für die Profilseite.

## Abnahme

1. **Parsen und Serialisieren.** Zuerst baut das Board-Image. Danach liest ein Check die **gebaute Objektdatei** von `modules/config/src/cads_config.c` und verlangt darin das Zeichenkettenliteral `project.option`: der Compiler wirft Kommentare weg, ein auskommentierter Schlüssel erzeugt also kein Literal und besteht diesen Check nicht. Zwei weitere Checks verlangen den Schlüssel im Quelltext innerhalb eines `key_is(...)`-Aufrufs *und* innerhalb eines `append_kv_*`-Aufrufs, damit beide Richtungen wirklich vorhanden sind.
2. **Rundreise.** Die Host-Suite muss grün bleiben. `tests/unit/test_config.c` prüft die Konfiguration über Schreiben und Wiedereinlesen; ein asymmetrisch ergänzter Schlüssel oder ein fehlender Standard fällt dort auf.
3. **Verteidigung.** Du nennst deinen Standard und das Verhalten bei einem fehlerhaften Wert.

## Liefern

Ein neuer Konfig-Schlüssel, der etwas Setzenswertes tut, mit Standard und sicherer Degradierung, plus eine Notiz, warum er in `/config.txt` gehört und nicht in ein Profil.
