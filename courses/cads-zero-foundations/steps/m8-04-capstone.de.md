---
id: m8-04-capstone
title: Abschluss - eine begutachtbare Änderung mit bestehendem Test
bloom: create
objectives: [cz.quality.capstone]
requires: [m8-03-clean-room-pr]
estimatedMinutes: 30
scaffold: independent
links:
  - { doc: "docs/how-to/agent-workflow.md" }
  - { file: "tests/unit/CMakeLists.txt", line: 23 }
  - { file: "modules/toolbox/include/cads/toolbox/str.h", line: 60 }
  - { step: m8-03-clean-room-pr }
sources: [docs/how-to/agent-workflow.md, tests/unit/CMakeLists.txt, tests/unit/test_str.c, modules/toolbox/include/cads/toolbox/str.h, scripts/check_ram_budget.py]
tasks:
  - id: tests-touched
    title: Deine Änderung liegt unter tests/unit
    check: { type: command, cwd: ".", command: "git status --porcelain -- tests/unit | grep -q .", expectExitCode: 0, bloom: create }
  - id: tests-green
    title: Die Suite besteht mit deinem Test
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0, bloom: create }
  - id: self-review
    title: Selbst-Review der Zusicherung
    check: { type: question, prompt: { en: "Which documented behaviour does your new case assert that no existing case covered?", de: "Welches dokumentierte Verhalten sichert dein neuer Fall zu, das kein vorhandener Fall abdeckte?" }, rubric: "Benennt genau drei Dinge: die Funktion samt Eingabe, den versprochenen Rückgabewert und die versprochene Nebenwirkung - etwa dass cads_str_to_uint bei einem 0x-Präfix ohne Ziffern dahinter false liefert und *value unverändert lässt, oder dass end auf das erste Nicht-Ziffern-Zeichen zeigt, damit eine Befehlsschleife mehrere Argumente aus einer Zeile liest. Und sagt, woran du geprüft hast, dass kein vorhandener Fall das schon abdeckt. Ein Fall, der eine vorhandene Zusicherung wiederholt, besteht diese Aufgabe nicht, auch wenn er grün ist.", bloom: create }
socratic:
  - { trigger: "task:tests-touched:failed", question: { en: "The check looks for a change under tests/unit. Did your edit land somewhere else, or has it already been committed away?", de: "Der Check sucht eine Änderung unter tests/unit. Ist deine Änderung woanders gelandet, oder schon wegkommittiert?" }, hints: [ { en: "Both routes from the step text touch tests/unit: a new case in an existing file, or a new file plus its registration.", de: "Beide Wege aus dem Steptext berühren tests/unit: ein neuer Fall in einer vorhandenen Datei oder eine neue Datei samt Registrierung." }, { en: "A brand new file must be visible to git; an untracked file counts, a file outside the directory does not.", de: "Eine ganz neue Datei muss für git sichtbar sein; eine nicht verfolgte Datei zählt, eine Datei außerhalb des Verzeichnisses nicht." }, { en: "This check only sees that you changed the tests, not that the change is good - the other two tasks are for that.", de: "Dieser Check sieht nur, dass du die Tests geändert hast, nicht dass die Änderung gut ist - dafür sind die beiden anderen Aufgaben da." } ] }
  - { trigger: "task:tests-green:failed", question: { en: "ctest prints the failing subject's name first. Is it your test - and if so, did it fail to compile, fail an assertion, or never get registered?", de: "ctest druckt zuerst den Namen des scheiternden Subjekts. Ist es dein Test - und falls ja, kompilierte er nicht, scheiterte eine Zusicherung oder wurde er nie registriert?" }, hints: [ { en: "A new subject needs both a registration and a link line in tests/unit/CMakeLists.txt, then a reconfigure.", de: "Ein neues Subjekt braucht sowohl eine Registrierung als auch eine Link-Zeile in tests/unit/CMakeLists.txt, dann eine Neukonfiguration." }, { en: "Every RUN_TEST must appear in main() between UNITY_BEGIN() and UNITY_END(); a case defined but not run passes vacuously.", de: "Jedes RUN_TEST muss in main() zwischen UNITY_BEGIN() und UNITY_END() stehen; ein definierter, aber nicht ausgeführter Fall besteht leer." }, { en: "Read the expected/actual line before changing the assertion: the header documents what the parsers do on failure, and it is not what most people guess.", de: "Lies die Expected/Actual-Zeile, bevor du die Zusicherung änderst: der Header dokumentiert, was die Parser im Fehlerfall tun, und das ist nicht, was die meisten raten." } ] }
  - { trigger: "question:self-review:weak", question: { en: "Point at the sentence in the header that documents the behaviour, then at the existing test file. What is in the first and not in the second?", de: "Zeig auf den Satz im Header, der das Verhalten dokumentiert, und dann auf die vorhandene Testdatei. Was steht im ersten und nicht in der zweiten?" }, hints: [ { en: "A contract has edges: an empty input, a prefix without digits, a value one past the maximum, an unusual leading character.", de: "Ein Vertrag hat Ränder: eine leere Eingabe, ein Präfix ohne Ziffern, ein Wert eins über dem Maximum, ein ungewöhnliches führendes Zeichen." }, { en: "Name the assertion, not the feeling - which function, which input, which promised return value and which promised side effect.", de: "Nenne die Zusicherung, nicht das Gefühl - welche Funktion, welche Eingabe, welcher versprochene Rückgabewert und welche versprochene Nebenwirkung." }, { en: "A test that only re-checks a case the suite already has is honest work but does not answer this question.", de: "Ein Test, der nur einen Fall nachprüft, den die Suite schon hat, ist ehrliche Arbeit, beantwortet diese Frage aber nicht." } ] }
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

Füge den Test hinzu — der erste Check sieht nur nach, dass unter `tests/unit` überhaupt etwas von dir liegt, der zweite, dass die Suite damit grün bleibt. Beantworte dann die Frage, welche dokumentierte Zusicherung dein Fall neu abdeckt. Schreibe zuletzt die PR-förmige Zusammenfassung nach `docs/how-to/agent-workflow.md`: Titel in der Form `[M<n>] ...`, ein Text, der die Datei, den geprüften Vertrag und die beiden grünen Läufe nennt, und der Satz zum unveränderten RAM-Budget. Damit ist der Grundlagenkurs abgeschlossen; der Projektkurs baut in größerem Maßstab auf genau dieser Disziplin auf.
