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
    title: Deine Änderung unter tests/unit fügt einen ausgeführten Fall mit Zusicherung hinzu
    check: { type: all, bloom: create, checks: [ { type: command, cwd: ".", command: "( git diff -U0 -- tests/unit; git ls-files --others --exclude-standard -- tests/unit | xargs -r sed 's/^/+/' ) | grep -qE '^[+][^/*]*RUN_TEST[(]'", expectExitCode: 0 }, { type: command, cwd: ".", command: "( git diff -U0 -- tests/unit; git ls-files --others --exclude-standard -- tests/unit | xargs -r sed 's/^/+/' ) | grep -qE '^[+][^/*]*TEST_ASSERT'", expectExitCode: 0 } ] }
  - id: tests-green
    title: Die Suite besteht mit deinem Test
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0, bloom: create }
  - id: self-review
    title: Selbst-Review der Zusicherung
    check: { type: question, prompt: { en: "Which documented behaviour does your new case assert that no existing case covered? Three items - the function with its input, the promised return value, the promised side effect - plus one sentence on how you checked that no existing case covers it already.", de: "Welches dokumentierte Verhalten sichert dein neuer Fall zu, das kein vorhandener Fall abdeckte? Drei Angaben - die Funktion samt Eingabe, der versprochene Rückgabewert, die versprochene Nebenwirkung - plus ein Satz dazu, woran du geprüft hast, dass kein vorhandener Fall das schon abdeckt." }, rubric: "Benennt genau drei Dinge: die Funktion samt Eingabe, den versprochenen Rückgabewert und die versprochene Nebenwirkung - etwa dass cads_str_to_uint bei einem 0x-Präfix ohne Ziffern dahinter false liefert und *value unverändert lässt, oder dass end auf das erste Nicht-Ziffern-Zeichen zeigt, damit eine Befehlsschleife mehrere Argumente aus einer Zeile liest. Und sagt, woran du geprüft hast, dass kein vorhandener Fall das schon abdeckt. Ein Fall, der eine vorhandene Zusicherung wiederholt, besteht diese Aufgabe nicht, auch wenn er grün ist.", bloom: create }
socratic:
  - { trigger: "task:tests-touched:failed", question: { en: "The check looks for added lines under tests/unit. Did your edit land somewhere else, or has it already been committed away?", de: "Der Check sucht hinzugefügte Zeilen unter tests/unit. Ist deine Änderung woanders gelandet, oder schon wegkommittiert?" }, hints: [ { en: "Does your change really add a case that runs, or did you only create a file? The check reads the added lines, not the file list.", de: "Fügt deine Änderung wirklich einen ausgeführten Fall hinzu, oder hast du nur eine Datei angelegt? Der Check liest die hinzugefügten Zeilen, nicht die Dateiliste." }, { en: "Both routes from the step text count: a new case in an existing file, or a new, still untracked file under tests/unit. Run git diff -- tests/unit to see what the check sees.", de: "Beide Wege aus dem Steptext zählen: ein neuer Fall in einer vorhandenen Datei oder eine neue, noch nicht verfolgte Datei unter tests/unit. Führ git diff -- tests/unit aus, um zu sehen, was der Check sieht." }, { en: "Only lines on which RUN_TEST( and TEST_ASSERT are real code count; a commented-out line does not, and neither does an empty file.", de: "Gezählt werden nur Zeilen, auf denen RUN_TEST( und TEST_ASSERT wirklich Code sind; eine auskommentierte Zeile zählt nicht, eine leere Datei auch nicht." } ] }
  - { trigger: "task:tests-green:failed", question: { en: "ctest prints the failing subject's name first. Is it your test - and if so, did it fail to compile, fail an assertion, or never get registered?", de: "ctest druckt zuerst den Namen des scheiternden Subjekts. Ist es dein Test - und falls ja, kompilierte er nicht, scheiterte eine Zusicherung oder wurde er nie registriert?" }, hints: [ { en: "Is it your subject that is red, or another one? A new subject needs a registration and a link line in tests/unit/CMakeLists.txt, then a reconfigure, before ctest knows it at all.", de: "Ist dein Subjekt rot oder ein anderes? Ein neues Subjekt braucht eine Registrierung und eine Link-Zeile in tests/unit/CMakeLists.txt, dann eine Neukonfiguration, bevor ctest es überhaupt kennt." }, { en: "Every RUN_TEST must appear in main() between UNITY_BEGIN() and UNITY_END(); a case defined but not run passes vacuously.", de: "Jedes RUN_TEST muss in main() zwischen UNITY_BEGIN() und UNITY_END() stehen; ein definierter, aber nicht ausgeführter Fall besteht leer." }, { en: "Read the expected/actual line before changing the assertion: the header documents what the parsers do on failure, and it is not what most people guess.", de: "Lies die Expected/Actual-Zeile, bevor du die Zusicherung änderst: der Header dokumentiert, was die Parser im Fehlerfall tun, und das ist nicht, was die meisten raten." } ] }
  - { trigger: "question:self-review:weak", question: { en: "Point at the sentence in the header that documents the behaviour, then at the existing test file. What is in the first and not in the second?", de: "Zeig auf den Satz im Header, der das Verhalten dokumentiert, und dann auf die vorhandene Testdatei. Was steht im ersten und nicht in der zweiten?" }, hints: [ { en: "Are you asserting an edge of the contract or the normal case? A contract has edges: an empty input, a prefix without digits, a value one past the maximum.", de: "Sicherst du einen Rand des Vertrags zu oder den Normalfall? Ein Vertrag hat Ränder: eine leere Eingabe, ein Präfix ohne Ziffern, ein Wert eins über dem Maximum." }, { en: "Read the sentence in the header that documents the behaviour, and put tests/unit/test_str.c beside it; what stands in the first and not in the second is your case.", de: "Lies den Satz im Header, der das Verhalten dokumentiert, und stell tests/unit/test_str.c daneben; was im ersten steht und in der zweiten nicht, ist dein Fall." }, { en: "modules/toolbox/include/cads/toolbox/str.h documents what each parser promises on failure - the return value and what it leaves *value and end at. That contract is where an uncovered edge is found.", de: "modules/toolbox/include/cads/toolbox/str.h dokumentiert, was jeder Parser im Fehlerfall verspricht - den Rückgabewert und den Zustand von *value und end. In diesem Vertrag findet sich ein noch nicht abgedeckter Rand." } ] }
---

## Lernziel

Liefere eine kleine Änderung, die das Review aus dem vorigen Step überstehen würde: einen neuen Host-Unit-Test für ein portables Modul, im Build registriert, unter ctest bestehend und so beschrieben, wie der Agenten-Workflow es erwartet.

**Der erste Handgriff:** öffne `modules/toolbox/include/cads/toolbox/str.h` und `tests/unit/test_str.c` nebeneinander. Wie das geht, steht im nächsten Abschnitt.

## Wo du arbeitest

Die Bedienoberfläche ist englisch, der Kurstext deutsch — der Menüpunkt heißt also `Run Task...`.

**Datei öffnen:** `Strg`/`Cmd`+`P`, dann den Pfad tippen, Enter. Oder ganz links das oberste Symbol der Leiste (Datei-Explorer) und durch den Baum klicken. Die drei Pfade dieses Steps:

```
modules/toolbox/include/cads/toolbox/str.h
tests/unit/test_str.c
tests/unit/CMakeLists.txt
```

**Terminal öffnen** (für `git diff`, für ein Kommando ohne Task): **☰ → `Terminal` → `New Terminal`**; ist der Terminal-Bereich zugeklappt, klappt ihn `Strg`/`Cmd`+`J` auf und wieder zu. Das Arbeitsverzeichnis ist die Projektwurzel.

**Deine Aufgaben prüfen:** im Steptext, dem Reiter in der Mitte namens `CaDS Tutor: Abschluss - eine begutachtbare Änderung mit bestehendem Test`. Jede Aufgabe unten hat einen Knopf **Prüfen** und einen Knopf **Hinweis anzeigen**; **Run all checks** oben im Reiter prüft alles auf einmal.

## Die Änderung

Wähle eine portable Toolbox-Funktion, deren Vertrag im Header dokumentiert ist, und füge einen Testfall für ein Verhalten hinzu, das die vorhandene Suite nicht zusichert. `modules/toolbox/include/cads/toolbox/str.h` ist ein gutes Subjekt: seine Parser `cads_str_to_uint`, `cads_str_to_int` und `cads_str_to_hex` versprechen, `false` zurückzugeben und `*value` unverändert zu lassen, wenn keine Ziffer verbraucht wurde oder der Wert nicht passt, und `end` auf das erste Nicht-Ziffern-Zeichen zu setzen, damit eine Befehlsschleife mehrere Argumente aus einer Zeile liest. `tests/unit/test_str.c` deckt vieles davon ab; suche eine dokumentierte, aber nicht zugesicherte Kante — ein `0x`-Präfix ohne Ziffern dahinter, ein Wert eins über `UINT32_MAX`, führende Tabulatoren statt Leerzeichen.

Zwei Wege, beide begutachtbar:

1. **Ein neuer Fall in der vorhandenen Datei.** Füge `tests/unit/test_str.c` ein `static void test_...(void)` und ein passendes `RUN_TEST` in `main()` hinzu. Kleinster Diff, keine CMake-Änderung.
2. **Ein neues Subjekt.** Lege `tests/unit/test_<name>.c` mit eigenem `main()` an und registriere es in `tests/unit/CMakeLists.txt` genau wie seine Nachbarn:

```cmake
cads_add_unit_test(test_<name> test_<name>.c)
target_link_libraries(test_<name> PRIVATE cads_toolbox)
```

So oder so: eine ausführbare Datei je Subjekt, sechzig Sekunden Timeout, Unity-Zusicherungen, nichts, das ein Board braucht.

## Beweisen, wie CI es tut

**Den Test laufen lassen.** Drücke **`F1`**, tippe `Tasks: Run Task`, Enter, dann **`CaDS: Host tests`** aus der Liste wählen. Ohne Tastatur: das Symbol mit den drei Strichen (**☰**) ganz oben links, dann **`Terminal` → `Run Task...` → `CaDS: Host tests`**. (`Strg`/`Cmd`+`Umschalt`+`P` öffnet die Palette auch, wird im Browser aber oft abgefangen; `F1` ist der zuverlässige Weg.) Unten öffnet sich ein Terminal mit dem Namen des Tasks. Du siehst CMake, den Compiler und eine Zeile je Subjekt; es dauert etwa eine halbe Minute. **Erfolg:** deine Testdatei steht mit `Passed` in der Liste, und die Schlusszeile lautet `100% tests passed, 0 tests failed out of N` mit einem N, das um eins größer ist als vorher, falls du ein neues Subjekt angelegt hast.

**Das Image bauen.** Danach **`F1`** → `Tasks: Run Task` → Enter → **`CaDS: Build`**, oder **☰ → `Terminal` → `Run Task...` → `CaDS: Build`**. Beim ersten Mal dauert das etwa eine Minute, danach Sekunden. Ein reiner Host-Test fügt dem Firmware-Image kein Objekt hinzu, sodass Größenbericht und `__cads_heap_size` — das Symbol, das `scripts/check_ram_budget.py` liest, um den 48-KB-Boden mit seiner 256-Byte-Marge abzusichern — unverändert bleiben. Nachrechnen kannst du das mit **`F1`** → `Tasks: Run Task` → **`CaDS: RAM budget`**, unter einer Sekunde. Sag das Ergebnis in deinem Review; ein Reviewer sollte es nicht erschließen müssen.

**Sehen, was der Check sieht.** Der erste Check liest die *hinzugefügten Zeilen* unter `tests/unit`, nicht die Dateiliste. Öffne dafür ein Terminal mit **☰ → `Terminal` → `New Terminal`** und führe aus:

```
git diff -- tests/unit
```

Steht dort nichts, ist deine Änderung entweder woanders gelandet oder schon committet — dann sieht der Check sie nicht.

<!-- SHOT: m8-capstone-diff | Terminal-Bereich unten, git diff -- tests/unit mit den hinzugefuegten RUN_TEST- und TEST_ASSERT-Zeilen in gruen -->

## Drei Bedienfehler, die genau hier passieren

- **Der Task lief, aber die Ausgabe wird im falschen Fenster gesucht.** Sie steht nicht im Steptext und nicht im Editor, sondern unten im Terminal-Bereich in dem Terminal, das den Namen des Tasks trägt — `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts in der Liste wählst du das richtige Terminal.
- **Das Terminal geschlossen und damit den Vorgang beendet.** Das Kreuz am Terminal beendet den Prozess darin; mitten in `CaDS: Build` heißt das, der Build ist abgebrochen und das Image unvollständig. Zum Wegklappen `Strg`/`Cmd`+`J` nehmen, das lässt ihn weiterlaufen.
- **Die Palette reagiert nicht auf das Tastenkürzel.** Der Browser hat `Strg`/`Cmd`+`Umschalt`+`P` abgefangen — nimm `F1`, oder den Weg über **☰ → `Terminal`**.

## Beschreiben

`docs/how-to/agent-workflow.md` sagt, was ein begutachtbarer PR enthält: die Änderung und nichts Unverwandtes; Tests, wo die Logik es erlaubt; `docs/ROADMAP.md` aktualisiert; ein Bench-Hinweis nur, wenn sich ein Hardwarepfad änderte (deiner nicht); der neue Größenbericht nur, wenn sich der Speicherverbrauch änderte (deiner nicht).

## Deine Aufgabe

1. **Den Test hinzufügen.** Der erste Check sieht nach, dass unter `tests/unit` hinzugefügte Zeilen mit `RUN_TEST(` und `TEST_ASSERT` liegen — ein Kommentar zählt nicht.
2. **Die Suite grün halten.** Starte `CaDS: Host tests` wie oben: **`F1`** → `Tasks: Run Task` → Enter → **`CaDS: Host tests`**.
3. **Das Selbst-Review.** Beantworte, welche dokumentierte Zusicherung dein Fall neu abdeckt.

Schreibe zuletzt die PR-förmige Zusammenfassung nach `docs/how-to/agent-workflow.md`: Titel in der Form `[M<n>] ...`, ein Text, der die Datei, den geprüften Vertrag und die beiden grünen Läufe nennt, und der Satz zum unveränderten RAM-Budget. Damit ist der Grundlagenkurs abgeschlossen; der Projektkurs baut auf genau dieser Disziplin auf.
