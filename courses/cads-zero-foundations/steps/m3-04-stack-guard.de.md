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

## Warum Überläufe schwer zu sehen sind

Es gibt hier keine MPU-Schutzseite und keinen Kernel-Heap. Ein Task-Stack, der überläuft, schreibt schlicht über sein unteres Ende hinaus in das, was der Linker darunter platziert hat. Das Symptom heißt selten „Stack-Überlauf“; es ist eine korrumpierte Rücksprungadresse, ein Sprung ins Nichts und ein Fault *in* Code, der mit der Ursache nichts zu tun hatte.

## Die Fallstudie, auf die dieser Kurs später zurückgreift

Zwei Überläufe sind an dieser Hardware bestätigt worden (`apps/bringup/tasks.c`, Kopfkommentar; `docs/ROADMAP.md`, 2026-08-28 und 2026-08-30). Sie sind der Referenzfall des Kurses; spätere Steps rufen ihn ab, statt ihn neu zu erzählen.

**Fall 1 - die Konsolen-Task mit `net.dhcp = 1`.** Die App-Baum-Schleife ruft `cads_net_poll()` auf dem Stack der Konsolen-Task; die Zustandsmaschine des DHCP-Clients ist deutlich tiefer als der Static-IP-Pfad. Das Board fror einfach ein. Live mit GDB gefangen sah es so aus:

| Beobachtung | Was daran auffällt |
|---|---|
| `PC = 0xF7FF0FF0` | keine Flash-Adresse, überhaupt keine gültige Codeadresse |
| `CFSR`-Bit `IACCVIOL` | eine Instruction-Fetch-Verletzung: die CPU hat versucht, *dort* Code zu holen |
| angehalten in `vApplicationIdleHook()` | Code, der die Ursache unmöglich enthalten kann |
| `SP` auf einen absurd niedrigen Wert verbogen | der Stackpointer selbst war überschrieben |

Gelesen ergibt das eine Kette: der Stack lief über sein unteres Ende hinaus, überschrieb dabei eine gespeicherte Rücksprungadresse, die nächste Rückkehr sprang nach `0xF7FF0FF0`, und der Fault fiel auf die erstbeste Funktion, die zufällig gerade lief. Korrektur: `CADS_CONSOLE_STACK` von 512 auf 1024 Wörter.

**Fall 2 - die Input-Task im Marauder-Menü.** `cads_input_tick()` ruft direkt in den Eingabe-Handler der aktiven App auf dem eigenen Stack der Input-Task, sodass ein 256-Wort-Stack beliebige App-Aufruftiefe tragen musste. Korrektur: `CADS_INPUT_STACK` von 256 auf 1024 Wörter.

Diese Signatur - ein `PC`, der keine Flash-Adresse ist, ein unsinniger `SP`, ein Fault in Code, der ihn nicht verursacht haben kann - ist die, die du dir merkst. Sie sagt nie, *welcher* Stack es war. Dafür braucht es den Wächter.

## Der Wächter

`apps/bringup/tasks.c` führt eine kleine Tabelle:

```c
static const cads_stackguard_t cads_stackguards[] = {
    {"msp", &__cads_stack_bottom},
    {"ui", cads_ui_stack},
    {"input", cads_input_stack},
    {"console", cads_console_stack},
};
```

Jeder Eintrag zeigt auf das **unterste Wort** eines Stacks, das ein Überlauf als Letztes überschreibt. Task-Stacks werden von `xTaskCreateStatic` mit `0xA5` gefüllt; der MSP-Wächter wird von `cads_stackguard_arm()` vor dem Scheduler-Start gesetzt. `vApplicationIdleHook()` - der Idle-Callback von FreeRTOS, läuft also immer, wenn sonst nichts läuft - prüft alle vier gegen `CADS_STACKGUARD_CANARY` und ruft beim ersten Unterschied `cads_hal_panic(name)`.

FreeRTOS bringt für dieselbe Frage eine eigene Einrichtung mit: `configCHECK_FOR_STACK_OVERFLOW 2` ist in `modules/kernel/src/FreeRTOSConfig.h` eingeschaltet und ruft bei einem Befund `vApplicationStackOverflowHook()`. Der Eintrag vom 2026-08-26 in `docs/ROADMAP.md` wägt beide gegeneinander ab und begründet, warum die Tabelle trotzdem dazukam - das ist deine zweite Aufgabe, und die Antwort steht dort, nicht hier.

Nebenbei erklärt der Wächter eine Beobachtung, die sonst erschreckt: ein Live-GDB-Attach kann `PC` in `cads_stackguard_breached()` zeigen und nichts bedeuten. Das ist das normale Polling des Idle-Hooks, kein gefangener Absturz (`docs/ROADMAP.md`, 2026-09-01).

## Der Ring schließt den Kreis

`cads_hal_panic()` schreibt den Grund in den Forensik-Ring, bevor es anhält. Im Fall der Input-Task zeigte `E` `reason=input` **22 ms vor** einem `HardFault`-Datensatz mit `HFSR = 0x80000000` (DEBUGEVT) - das eigene `bkpt` der Panik eskalierte, weil kein Debugger hing, selbst ein am selben Tag behobener Fehler. Der Ring benannte also den exakten Stack; nichts musste geraten werden.

Damit ist die Kette vollständig: **Signatur** sagt „ein Stack ist übergelaufen“, **Wächter** sagt „dieser hier“, **Ring** hebt beides über den Reset hinweg auf.

## Wo die Korrektur liegt und was sie kostet

Task-Stacks liegen im **CCM** (`CADS_CCM_SECTION`), nicht im SRAM-Heap, den `scripts/check_ram_budget.py` mit 256 B Marge bewacht. Sie sind als `uint32_t`-Felder deklariert und in **Wörtern** dimensioniert, so wie FreeRTOS überall zählt - die Umrechnung in Byte ist deine dritte Aufgabe.

Kostenlos ist CCM aber nicht: `targets/itsboard/linker/cads_itsboard.ld` schneidet den Main-Stack oben aus den 64 KB heraus und hat einen zweiten `ASSERT`, der den Link abbricht, sobald die `.ccm`-Sektion in ihn hineinwächst. Von 64 KB waren nach der Korrektur noch etwa 54,7 KB frei. M4 greift diese Abwägung wieder auf, wenn du selbst einen Stack dimensionierst.

## Deine Aufgabe

Lies die Wächtertabelle und `vApplicationIdleHook()` in `apps/bringup/tasks.c` und bestätige, dass die Firmware weiterhin baut. Begründe dann, warum die kerneleigene Überlaufprüfung nicht reichte, und rechne aus, was die Korrektur an CCM gekostet hat. Der nächste Step wendet sich dem anderen klassischen Fehler geteilter Ressourcen zu: dem SPI-Bus.
