---
id: p3-config-option
title: "Projekt: eine Konfigurationsoption"
bloom: create
objectives: [cz.storage.profiles]
requires: []
estimatedMinutes: 90
links:
  - { file: "scripts/check_profile.py" }
  - { doc: "docs/reference/config-file.md" }
  - { doc: "docs/how-to/configure.md" }
sources: [modules/config/src/cads_config.c, modules/config/include/cads/config/config.h, docs/reference/config-file.md]
tasks:
  - id: option-builds
    title: Die neue Option parst und das Image baut
    check: { type: all, checks: [ { type: fileMatches, file: "modules/config/src/cads_config.c", pattern: "project.option" }, { type: task, label: "CaDS: Build", expectExitCode: 0 } ] }
  - id: defend
    title: Verteidige die Option
    check: { type: question, prompt: { en: "Why does runtime configuration live in /config.txt while feature selection lives in a build profile — what failure does keeping them apart prevent? What does your key default to, and what happens to a running board when its value is malformed?", de: "Warum lebt Laufzeitkonfiguration in /config.txt, während Feature-Auswahl in einem Build-Profil lebt — welchen Fehler verhindert die Trennung? Worauf steht dein Schlüssel als Standard, und was passiert mit einem laufenden Board bei einem fehlerhaften Wert?" }, rubric: "Erklärt das Blast-Radius-Argument (ein Feld-Edit kann den Netzstack nicht entfernen; ein Build braucht kein laufendes Board), nennt einen sinnvollen Standard und merkt an, dass ein unbekannter oder fehlerhafter Wert übersprungen wird, sodass der Schlüssel seinen Standard behält, statt Zustand zu beschädigen.", bloom: create }
socratic:
  - { trigger: "task:option-builds:failed", question: { en: "Your key does not parse. Did you add it in both the struct and the parser, and give it a default?", de: "Dein Schlüssel wird nicht geparst. Hast du ihn in Struktur und Parser ergänzt und ihm einen Standard gegeben?" }, hints: [ { en: "modules/config/include/cads/config/config.h holds the config struct; add your field there.", de: "modules/config/include/cads/config/config.h hält die Konfig-Struktur; ergänze dort dein Feld." }, { en: "modules/config/src/cads_config.c parses keys with key_is(...) and sets a default in the defaults path; add a 'project.option' branch and a default.", de: "modules/config/src/cads_config.c parst Schlüssel mit key_is(...) und setzt einen Standard im Defaults-Pfad; ergänze einen Zweig 'project.option' und einen Standard." }, { en: "Serialise it too if it should survive a round trip, matching the append_kv_* calls already there.", de: "Serialisiere ihn auch, wenn er eine Rundreise überleben soll, passend zu den vorhandenen append_kv_*-Aufrufen." } ] }
---
## Ziel

Füge CaDS Zero eine echte, dauerhafte Konfigurationsoption hinzu — einen `/config.txt`-Schlüssel, den ein laufendes Board liest, anwendet und bei Fehlern sicher abfängt.

## Worauf du aufbaust

Dieses Projekt setzt die Grundlagen-Steps zur Konfigurationsdatei (m6-02-config-file) und zu Build-Profilen (m6-04-build-profiles) voraus. Die vollständige Formatreferenz ist `docs/reference/config-file.md`; die Aufgaben-Anleitung ist `docs/how-to/configure.md`.

## Anforderungen

- Wähle eine wirklich nützliche Laufzeiteinstellung und ergänze einen Schlüssel mit dem Namen **`project.option`** (benenne ihn in deiner Kopie um, wenn du magst, aber behalte diesen Token, damit der Abnahme-Check ihn findet).
- Ergänze das Feld in der Konfig-Struktur in `modules/config/include/cads/config/config.h`, parse es in `modules/config/src/cads_config.c` (folge den bestehenden `key_is(...)`-Zweigen) und gib ihm einen sinnvollen eingebauten Standard, sodass ein Board ohne Konfigurationsdatei trotzdem bootet.
- Serialisiere ihn neben den anderen Schlüsseln, wenn er eine `pull`/`push`-Rundreise überleben soll.
- Mache einen fehlerhaften Wert harmlos: ein unbekannter Schlüssel wird übersprungen und ein schlechter Wert behält den vorherigen — nie eine Struktur voller Nullen.
- Halte ihn aus dem Build-Profil heraus: Profile wählen, welche Apps hineinkompiliert werden, und werden von CMake zur Konfigurationszeit gelesen; deine Option ist Laufzeitzustand, den die Firmware beim Booten liest. `scripts/check_profile.py` ist zum Vergleich das Werkzeug für die Profilseite.

## Abnahme

Der erste Check bestätigt, dass `modules/config/src/cads_config.c` nun `project.option` behandelt und dass das Image baut. Der zweite verteidigt den Zwei-Dateien-Entwurf, deinen Standard und das Fehlerverhalten bei einem fehlerhaften Wert.

## Liefern

Ein neuer Konfig-Schlüssel, der etwas Setzenswertes tut, mit Standard und sicherer Degradierung, plus eine Notiz, warum er in `/config.txt` gehört und nicht in ein Profil.
