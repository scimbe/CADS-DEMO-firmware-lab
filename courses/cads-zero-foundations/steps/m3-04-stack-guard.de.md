---
id: m3-04-stack-guard
title: Einen Stack-Überlauf fangen
bloom: analyze
objectives: [cz.debug.stack-guard]
requires: [m3-03-fault-forensics]
estimatedMinutes: 18
scaffold: independent
recallFrom: [m3-03-fault-forensics]
links:
  - { step: m3-05-spi-mutex }
  - { step: m3-03-fault-forensics }
  - { doc: "docs/ROADMAP.md" }
  - { file: "core/cads_hal.h" }
  - { file: "apps/bringup/tasks.c", line: 128 }
  - { file: "targets/itsboard/linker/cads_itsboard.ld", line: 174 }
sources: [apps/bringup/tasks.c, docs/ROADMAP.md, docs/how-to/debug.md, core/cads_hal.h, scripts/check_ram_budget.py, targets/itsboard/linker/cads_itsboard.ld]
tasks:
  - id: build
    title: Die Firmware baut weiterhin mit dem Wächter
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: guard-vs-hook
    title: Begründe, warum FreeRTOS eigene Prüfung nicht reichte
    check: { type: question, prompt: { en: "FreeRTOS already checks stacks with configCHECK_FOR_STACK_OVERFLOW 2. Why was the canary table added on top?", de: "FreeRTOS prüft Stacks bereits mit configCHECK_FOR_STACK_OVERFLOW 2. Warum kam die Canary-Tabelle trotzdem dazu?" }, rubric: "Zwei Lücken, beide in docs/ROADMAP.md unter dem 2026-08-26 benannt. Erstens tastet die Prüfung von FreeRTOS nur beim Kontextwechsel ab: eine tiefe Exkursion, die zwischen zwei Wechseln überläuft und wieder zurückkehrt, bleibt für sie unsichtbar. Zweitens sieht sie ausschließlich Task-Stacks und hat null Sicht auf den MSP. Die Wächtertabelle schließt beides: sie führt msp als eigenen Eintrag und wird im Idle-Hook geprüft, also unabhängig davon, ob gerade ein Kontextwechsel stattfindet. Wer nur „zur Sicherheit doppelt“ antwortet, hat keine der beiden Lücken benannt.", bloom: analyze }
  - id: ccm-cost
    title: Rechne die Kosten der Korrektur aus
    check: { type: question, prompt: { en: "CADS_INPUT_STACK grew from 256 to 1024 words. How many bytes of CCM did that cost?", de: "CADS_INPUT_STACK wuchs von 256 auf 1024 Wörter. Wie viele Byte CCM kostete das?" }, rubric: "768 zusätzliche Wörter. Ein Wort ist hier vier Byte, weil die Stacks als uint32_t-Felder deklariert sind, also 768 × 4 = 3072 Byte, drei Kilobyte. Der zweite Teil der Antwort ist die Pointe: keines dieser Byte kommt aus dem SRAM-Budget, weil die Stacks per CADS_CCM_SECTION im CCM liegen - deshalb durfte die Korrektur großzügig ausfallen. Wer 768 Byte oder 3072 Wörter nennt, hat die Einheit verwechselt.", bloom: analyze }
misconceptions:
  - { pattern: "CCM overflow", question: { en: "The link failed with a CCM overflow. Which region ran out, and what shares it with your stacks?", de: "Der Link scheiterte mit einem CCM-Überlauf. Welcher Bereich ging aus, und was teilt ihn sich mit deinen Stacks?" }, hints: [ { en: "Is the region that ran out the same 192 KB the RAM budget talks about, or a different, much smaller one?", de: "Ist der Bereich, der ausging, dieselben 192 KB, von denen das RAM-Budget spricht, oder ein anderer, viel kleinerer?" }, { en: "Read the second ASSERT in targets/itsboard/linker/cads_itsboard.ld: it names the two things that collided.", de: "Lies den zweiten ASSERT in targets/itsboard/linker/cads_itsboard.ld: er nennt die beiden Dinge, die kollidiert sind." }, { en: "CCM is 64 KB in total and the main stack is carved out of its top end, so the section below it cannot grow without limit.", de: "CCM hat insgesamt 64 KB, und der Main-Stack wird oben herausgeschnitten, die Sektion darunter kann also nicht unbegrenzt wachsen." } ] }
socratic:
  - { trigger: "task:build:failed", question: { en: "Does the error come from the compiler or from the linker, and does it name a region rather than a symbol?", de: "Kommt der Fehler vom Compiler oder vom Linker, und nennt er einen Bereich statt eines Symbols?" }, hints: [ { en: "Compiler errors name a file and a line; linker errors name a section, a region or a symbol - which kind is yours?", de: "Compilerfehler nennen Datei und Zeile; Linkerfehler nennen Sektion, Bereich oder Symbol - welche Art ist deiner?" }, { en: "Run the CaDS: Build task again and read the last twenty lines from the bottom up; the first real error is usually near the end.", de: "Führe den Task CaDS: Build erneut aus und lies die letzten zwanzig Zeilen von unten nach oben; der erste echte Fehler steht meist nahe am Ende." }, { en: "Two ASSERTs in the linker script can stop a build that compiles perfectly - one guards SRAM, the other guards CCM.", de: "Zwei ASSERTs im Linkerskript können einen Bau stoppen, der einwandfrei kompiliert - einer bewacht das SRAM, der andere das CCM." } ] }
  - { trigger: "question:guard-vs-hook:weak", question: { en: "At which moments does FreeRTOS look at a stack, and which stack does it never look at?", de: "Zu welchen Zeitpunkten sieht FreeRTOS auf einen Stack, und auf welchen Stack sieht es nie?" }, hints: [ { en: "A check that only runs at certain moments can be outrun - what happens if the deep call returns before the next such moment?", de: "Eine Prüfung, die nur zu bestimmten Zeitpunkten läuft, lässt sich überholen - was passiert, wenn der tiefe Aufruf vor dem nächsten solchen Zeitpunkt zurückkehrt?" }, { en: "Open docs/ROADMAP.md and read the 2026-08-26 entry; it weighs the kernel's own check against the canary proposal in so many words.", de: "Öffne docs/ROADMAP.md und lies den Eintrag vom 2026-08-26; er wiegt die kerneleigene Prüfung dort ausdrücklich gegen den Canary-Vorschlag ab." }, { en: "Compare the four names in the sentinel table with the list of tasks - one of the four entries is not a task at all.", de: "Vergleich die vier Namen in der Wächtertabelle mit der Liste der Tasks - einer der vier Einträge ist gar keine Task." } ] }
  - { trigger: "question:ccm-cost:weak", question: { en: "What is the C type of the arrays these stacks are declared as, and how wide is one element?", de: "Welchen C-Typ haben die Felder, als die diese Stacks deklariert sind, und wie breit ist ein Element?" }, hints: [ { en: "Did you compute the difference between the two sizes, or the new size?", de: "Hast du die Differenz der beiden Größen ausgerechnet oder die neue Größe?" }, { en: "Look at the declarations of cads_ui_stack and friends in apps/bringup/tasks.c and read the element type.", de: "Sieh dir die Deklarationen von cads_ui_stack und den anderen in apps/bringup/tasks.c an und lies den Elementtyp." }, { en: "FreeRTOS counts stacks in words, not bytes, everywhere - that is the whole reason the conversion is needed at all.", de: "FreeRTOS zählt Stacks überall in Wörtern, nicht in Byte - genau deshalb ist die Umrechnung überhaupt nötig." } ] }
---

## Lernziel

Erkenne einen Stack-Überlauf an seiner Registersignatur und verstehe, wie der Stack-Guard-Wächter und der Forensik-Ring dieser Firmware ein stilles Einfrieren in eine benannte, behebbare Ursache verwandeln.

## Der erste Handgriff: die Firmware bauen

Die Bedienoberfläche ist englisch, der Kurstext deutsch - der Menüpunkt heißt also `Run Task...`. Eine Menüleiste ist nicht sichtbar: die Menüs stecken hinter dem Symbol mit den drei Strichen (**☰**) ganz oben links, das `File`, `Edit`, `Selection`, `View`, `Go`, `Run`, `Terminal` und `Help` öffnet.

Starte den Task: **`F1`**, dann `Tasks: Run Task` tippen, Enter, dann **`CaDS: Build`** aus der Liste wählen. Ohne Tastatur: **☰ → `Terminal` → `Run Task...` → `CaDS: Build`**.

Unten im Terminal-Bereich öffnet sich ein eigenes Terminal `CaDS: Build`; ist der Bereich zugeklappt, klappt ihn `Strg`/`Cmd`+`J` auf und zu. Der Bau dauert beim ersten Mal etwa eine Minute, danach Sekunden. Fertig ist er, wenn keine neuen Zeilen mehr kommen und wieder eine Eingabeaufforderung dasteht; erfolgreich, wenn die letzte Zeile vom Build-Werkzeug stammt und keine Fehlermeldung darübersteht.

<!-- SHOT: m3-build-task-terminal | Das Terminal CaDS: Build unten nach einem erfolgreichen Lauf, letzte Zeile vom Build-Werkzeug, darueber keine Fehlermeldung -->

## Die Fallstudie, auf die dieser Kurs später zurückgreift

Es gibt hier keine MPU-Schutzseite. Ein Task-Stack, der überläuft, schreibt über sein unteres Ende hinaus in das, was der Linker darunter platziert hat, und das Symptom heißt selten „Stack-Überlauf“. Zwei solche Überläufe sind an dieser Hardware bestätigt (`apps/bringup/tasks.c`, Kopfkommentar; `docs/ROADMAP.md`, 2026-08-28 und 2026-08-30) und der Referenzfall des Kurses.

**Fall 1 - die Konsolen-Task mit `net.dhcp = 1`.** Die App-Baum-Schleife ruft `cads_net_poll()` auf dem Stack der Konsolen-Task, und die Zustandsmaschine des DHCP-Clients ist deutlich tiefer als der Static-IP-Pfad. Das Board fror ein. Live mit GDB gefangen:

| Beobachtung | Was daran auffällt |
|---|---|
| `PC = 0xF7FF0FF0` | keine Flash-Adresse, überhaupt keine gültige Codeadresse |
| `CFSR`-Bit `IACCVIOL` | eine Instruction-Fetch-Verletzung: die CPU hat versucht, *dort* Code zu holen |
| angehalten in `vApplicationIdleHook()` | Code, der die Ursache unmöglich enthalten kann |
| `SP` auf einen absurd niedrigen Wert verbogen | der Stackpointer selbst war überschrieben |

Zusammen ergibt das eine Kette: der Stack lief über sein Ende hinaus, überschrieb eine gespeicherte Rücksprungadresse, die nächste Rückkehr sprang nach `0xF7FF0FF0`, und der Fault fiel auf die gerade laufende Funktion. Korrektur: `CADS_CONSOLE_STACK` von 512 auf 1024 Wörter.

**Fall 2 - die Input-Task im Marauder-Menü.** `cads_input_tick()` ruft direkt in den Eingabe-Handler der aktiven App auf dem eigenen Stack der Input-Task, sodass ein 256-Wort-Stack beliebige App-Aufruftiefe tragen musste. Korrektur: `CADS_INPUT_STACK` von 256 auf 1024 Wörter.

Diese Signatur merkst du dir. Sie sagt nie, *welcher* Stack es war - dafür braucht es den Wächter.

## Der Wächter

Öffne `apps/bringup/tasks.c` mit `Strg`/`Cmd`+`P` (Pfad tippen, Enter); ohne Tastatur über das oberste Symbol der Leiste ganz links, den Datei-Explorer. Dort steht diese Tabelle:

```c
static const cads_stackguard_t cads_stackguards[] = {
    {"msp", &__cads_stack_bottom},
    {"ui", cads_ui_stack},
    {"input", cads_input_stack},
    {"console", cads_console_stack},
};
```

Jeder Eintrag zeigt auf das **unterste Wort** eines Stacks, das ein Überlauf als Letztes überschreibt. Task-Stacks füllt `xTaskCreateStatic` mit `0xA5`; den MSP-Wächter setzt `cads_stackguard_arm()` vor dem Scheduler-Start. `vApplicationIdleHook()` - der Idle-Callback von FreeRTOS, läuft also immer, wenn sonst nichts läuft - prüft alle vier gegen `CADS_STACKGUARD_CANARY` und ruft beim ersten Unterschied `cads_hal_panic(name)`.

FreeRTOS hat für dieselbe Frage eine eigene Einrichtung: `configCHECK_FOR_STACK_OVERFLOW 2` in `modules/kernel/src/FreeRTOSConfig.h` ruft bei einem Befund `vApplicationStackOverflowHook()`. Der Eintrag vom 2026-08-26 in `docs/ROADMAP.md` wägt beide ab - das ist deine zweite Aufgabe, und die Antwort steht dort, nicht hier. Öffne die Datei mit `Strg`/`Cmd`+`P` und such mit `Strg`/`Cmd`+`F` nach dem Datum.

Nebenbei: zeigt ein Live-Attach `PC` in `cads_stackguard_breached()`, ist das nur das Polling des Idle-Hooks (`docs/ROADMAP.md`, 2026-09-01).

## Der Ring schließt den Kreis

`cads_hal_panic()` schreibt den Grund in den Forensik-Ring, bevor es anhält - denselben Ring, den du im vorigen Step mit `E` ausgelesen hast. Im Fall der Input-Task zeigte er `reason=input` **22 ms vor** einem `HardFault`-Datensatz, benannte den exakten Stack also selbst.

Die Kette ist vollständig: **Signatur** sagt „ein Stack lief über“, **Wächter** sagt „dieser hier“, **Ring** hebt beides über den Reset.

## Wo die Korrektur liegt und was sie kostet

Task-Stacks liegen im **CCM** (`CADS_CCM_SECTION`), nicht im SRAM-Heap, den `scripts/check_ram_budget.py` bewacht. Sie sind als `uint32_t`-Felder deklariert und in **Wörtern** dimensioniert, so wie FreeRTOS überall zählt - die Umrechnung in Byte ist deine dritte Aufgabe.

Kostenlos ist CCM nicht: `targets/itsboard/linker/cads_itsboard.ld` schneidet den Main-Stack oben aus den 64 KB heraus und bricht per `ASSERT` den Link ab, sobald die `.ccm`-Sektion in ihn hineinwächst. Nach der Korrektur waren noch etwa 54,7 KB frei.

## Drei Bedienfehler, die hier fast jeder einmal macht

- **Der Task lief, aber die Ausgabe wird im falschen Fenster gesucht.** Sie steht nicht im Steptext und nicht im Editor, sondern unten im Terminal-Bereich in dem Terminal, das den Namen des Tasks trägt - `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts in der Liste wählst du das richtige Terminal.
- **Das Terminal geschlossen und damit den Vorgang beendet.** Das Kreuz am Terminal beendet den Prozess darin - zum Wegklappen `Strg`/`Cmd`+`J` nehmen, das lässt ihn weiterlaufen.
- **Die Palette reagiert nicht auf das Tastenkürzel.** Der Browser hat `Strg`/`Cmd`+`Umschalt`+`P` abgefangen - nimm `F1`, oder den Weg über **☰ → `Terminal`**.

## Deine Aufgabe

Führe den Task **`CaDS: Build`** aus (**`F1`** → `Tasks: Run Task` → `CaDS: Build`, oder **☰ → `Terminal` → `Run Task...`**) und lies die Wächtertabelle und `vApplicationIdleHook()` in `apps/bringup/tasks.c`. Begründe dann, warum die kerneleigene Prüfung nicht reichte, und rechne aus, was die Korrektur an CCM kostete. Geprüft wird mit **Prüfen** an der Aufgabe oder **Run all checks** oben im Steptext-Reiter in der Mitte.
