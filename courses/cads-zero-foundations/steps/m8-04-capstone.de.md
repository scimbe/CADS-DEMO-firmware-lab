---
id: m8-04-capstone
title: Abschluss – eine begutachtbare Änderung mit bestehendem Test
bloom: create
objectives: [cz.quality.capstone]
requires: [m8-03-clean-room-pr]
estimatedMinutes: 30
links:
  - { doc: "docs/how-to/agent-workflow.md" }
  - { file: "tests/unit/CMakeLists.txt", line: 23 }
  - { file: "modules/toolbox/include/cads/toolbox/str.h", line: 60 }
  - { step: m8-03-clean-room-pr }
sources: [docs/how-to/agent-workflow.md, tests/unit/CMakeLists.txt, tests/unit/test_str.c, modules/toolbox/include/cads/toolbox/str.h, scripts/check_ram_budget.py]
tasks:
  - id: tests-green
    title: Dein neuer Test ist in der Suite und die Suite besteht
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0 }
  - id: self-review
    title: Selbst-Review in Form einer PR-Beschreibung
    check: { type: question, prompt: { en: "Write the self-review a reviewer would read first: what exactly changed and where, what your new test proves that the existing tests did not, how you confirmed both targets still build, and why the RAM budget is unaffected.", de: "Schreibe das Selbst-Review, das ein Reviewer zuerst liest: was genau sich wo geändert hat, was dein neuer Test beweist, den die vorhandenen nicht bewiesen, wie du bestätigt hast, dass beide Targets noch bauen, und warum das RAM-Budget unberührt ist." }, rubric: "Nennt die Testdatei und die hinzugefügte CMake-Registrierungszeile; benennt ein konkretes Verhalten, das der neue Fall zusichert (z. B. eine Parser-Grenze von cads_str_to_uint/cads_str_to_hex oder einen Trunkierungsvertrag), das kein vorhandener Fall abdeckte; berichtet, dass CaDS: Host tests (ctest) und CaDS: Build (itsboard) beide gelingen; erklärt, dass ein reiner Host-Test dem Firmware-Image weder Code noch Daten hinzufügt, sodass __cads_heap_size und die Marge von check_ram_budget.py unverändert sind; hält die Änderung auf den Test und seine Registrierung begrenzt.", bloom: create }
  - id: pr-summary
    title: Stelle die PR-förmige Zusammenfassung gemäß Agenten-Workflow zusammen
    check: { type: manual }
socratic:
  - { trigger: "task:tests-green:failed", question: { en: "ctest prints the failing subject's name first. Is it your new binary - and if so, did it fail to compile, fail an assertion, or never get registered?", de: "ctest druckt zuerst den Namen des scheiternden Subjekts. Ist es dein neues Binary - und falls ja, kompilierte es nicht, scheiterte eine Zusicherung oder wurde es nie registriert?" }, hints: [ { en: "A new test needs both the .c file and a cads_add_unit_test + target_link_libraries pair in tests/unit/CMakeLists.txt, then a reconfigure.", de: "Ein neuer Test braucht sowohl die .c-Datei als auch ein Paar cads_add_unit_test + target_link_libraries in tests/unit/CMakeLists.txt, dann eine Neukonfiguration." }, { en: "Every RUN_TEST must appear in main() between UNITY_BEGIN() and UNITY_END(); a case that is defined but not run passes vacuously.", de: "Jedes RUN_TEST muss in main() zwischen UNITY_BEGIN() und UNITY_END() stehen; ein definierter, aber nicht ausgeführter Fall besteht leer." }, { en: "Read the assertion's expected/actual line: the str parsers deliberately return false and leave *value untouched on no digit or overflow - assert on that contract, not a guessed zero.", de: "Lies die Expected/Actual-Zeile der Zusicherung: die str-Parser geben absichtlich false zurück und lassen *value bei fehlender Ziffer oder Überlauf unverändert - prüfe diesen Vertrag, nicht eine geratene Null." } ] }
---
## Lernziel

Liefere eine kleine Änderung, die das Review aus dem vorigen Step überstehen würde: einen neuen Host-Unit-Test für ein portables Modul, im Build registriert, unter ctest bestehend und so beschrieben, wie der Agenten-Workflow es erwartet.

## Die Änderung

Wähle eine portable Toolbox-Funktion, deren Vertrag im Header dokumentiert ist, und füge einen Testfall für ein Verhalten hinzu, das die vorhandene Suite nicht zusichert. `modules/toolbox/include/cads/toolbox/str.h` ist ein gutes Subjekt: seine Parser `cads_str_to_uint`, `cads_str_to_int` und `cads_str_to_hex` versprechen, `false` zurückzugeben und `*value` unverändert zu lassen, wenn keine Ziffer verbraucht wurde oder der Wert nicht passt, und `end` auf das erste Nicht-Ziffern-Zeichen zu setzen, damit eine Befehlsschleife mehrere Argumente aus einer Zeile liest. `tests/unit/test_str.c` deckt vieles davon bereits ab; suche eine dokumentierte, aber nicht zugesicherte Kante — ein `0x`-Präfix ohne Ziffern dahinter, ein Wert eins über `UINT32_MAX`, führende Tabulatoren statt Leerzeichen.

Zwei Wege, beide begutachtbar:

1. **Ein neuer Fall in der vorhandenen Datei.** Füge `tests/unit/test_str.c` ein `static void test_...(void)` und ein passendes `RUN_TEST` in `main()` hinzu. Kleinster Diff, keine CMake-Änderung.
2. **Ein neues Subjekt.** Lege `tests/unit/test_<name>.c` mit eigenem `main()` an und registriere es in `tests/unit/CMakeLists.txt` genau wie seine Nachbarn:

```cmake
cads_add_unit_test(test_<name> test_<name>.c)
target_link_libraries(test_<name> PRIVATE cads_toolbox)
```

So oder so gilt die Regel aus M8-01: eine ausführbare Datei je Subjekt, sechzig Sekunden Timeout, Unity-Zusicherungen, nichts, das ein Board braucht.

## Beweisen, wie CI es tut

Führe **CaDS: Host tests** aus. ctest muss deinen Test auflisten und grün enden. Führe dann noch einmal **CaDS: Build** aus: ein reiner Host-Test fügt dem Firmware-Image kein Objekt hinzu, sodass Größenbericht und `__cads_heap_size` — das Symbol, das `scripts/check_ram_budget.py` liest, um den 48-KB-Boden mit seiner 256-Byte-Marge abzusichern — unverändert sind. Sag das in deinem Review; ein Reviewer sollte es nicht erschließen müssen.

## Beschreiben

`docs/how-to/agent-workflow.md` sagt, was ein begutachtbarer PR enthält: die Änderung und nichts Unverwandtes; Tests, wo die Logik es erlaubt; `docs/ROADMAP.md` aktualisiert; ein Bench-Hinweis nur, wenn sich ein Hardwarepfad änderte (deiner nicht); der neue Größenbericht nur, wenn sich der Speicherverbrauch änderte (deiner nicht). Schreibe diese Zusammenfassung, als würdest du den PR eröffnen — Titel in der Form `[M<n>] ...`, ein Text, der die Datei, den geprüften Vertrag und die beiden grünen Läufe nennt.

## Deine Aufgabe

Füge den Test hinzu, bringe die Suite zum Bestehen, schreibe das Selbst-Review, das die vier Fragen des Checks beantwortet, und stelle die PR-förmige Zusammenfassung zusammen. Damit ist der Grundlagenkurs abgeschlossen; der Projektkurs baut in größerem Maßstab auf genau dieser Disziplin auf.
