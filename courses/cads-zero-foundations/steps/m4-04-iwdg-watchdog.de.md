---
id: m4-04-iwdg-watchdog
title: Der unabhängige Watchdog und die Reset-Ursache
bloom: understand
objectives: [cz.rtos.watchdog]
requires: [m4-03-mutex-spi-bus]
estimatedMinutes: 14
scaffold: independent
recallFrom: [m3-03-fault-forensics]
links:
  - { step: m4-05-stack-sizing }
  - { step: m3-03-fault-forensics }
  - { file: "core/cads_hal.h", line: 280 }
  - { file: "modules/kernel/src/kernel.c", line: 309 }
  - { file: "targets/itsboard/hal/hal_watchdog.c", line: 49 }
  - { doc: "docs/SAFETY.md" }
sources: [core/cads_hal.h, modules/kernel/src/kernel.c, targets/itsboard/hal/hal_watchdog.c, apps/bringup/explorer.c, docs/SAFETY.md]
tasks:
  - id: reset-cause
    title: Lies die Reset-Ursache dieses Boots
    check: { type: serialExpect, send: "E\n", pattern: "reset cause", timeoutMs: 15000 }
  - id: iwdg-period
    title: Entscheide den Widerspruch im Quelltext
    check: { type: question, prompt: { en: "Prescaler /64, reload 1000, LSI at about 32 kHz. The comment above the two defines in targets/itsboard/hal/hal_watchdog.c claims about 2.048 ms per tick and about 2.048 s in total. Which of the two figures - the comment's or your own - follows from the values given, and why?", de: "Prescaler /64, Reload 1000, LSI mit etwa 32 kHz. Der Kommentar über den beiden Defines in targets/itsboard/hal/hal_watchdog.c nennt etwa 2,048 ms je Tick und etwa 2,048 s insgesamt. Welche der beiden Zahlen - die des Kommentars oder deine eigene - folgt aus den angegebenen Werten, und warum?" }, rubric: "Die eigene Rechnung gewinnt, der Kommentar ist an dieser Stelle falsch. Der Prescaler teilt die LSI-Frequenz: 32 000 / 64 = 500 Hz, ein Zähltick dauert also 1/500 s = 2,0 ms. Der Zähler läuft von 1000 herunter, die Periode ist damit 2,0 s. Verlangt ist zusätzlich, woher die 2,048 kommen: 2,048 ms je Tick folgt aus 64 / 31 250 s, setzt also einen LSI von 31,25 kHz statt 32 kHz voraus - eine Zahl, die weder im Kommentar noch im Datenblattbezug dieses Steps steht. Bestanden, wenn 2,0 ms und 2,0 s genannt sind und der Kommentar ausdrücklich als widersprüchlich zu den angegebenen 32 kHz benannt wird; wer die 2,048 s ungeprüft übernimmt, besteht nicht. Der zweite Teil der Antwort ist der Vergleich: 2,0 s sind etwa das Vierfache der längsten normalen Blockierspanne dieser Firmware, des 448-ms-Vollbild-Flushs - deshalb kann keine legitime Operation den Watchdog auslösen. Wer 1000 Ticks mit der LSI-Frequenz statt mit der geteilten Frequenz multipliziert, landet bei 31 ms und hat den Prescaler übersprungen.", bloom: understand }
misconceptions:
  - { pattern: "reset cause: IWDG watchdog", question: { en: "The board says the watchdog reset it. Does that make this boot clean or suspect?", de: "Das Board meldet einen Watchdog-Reset. Ist dieser Boot damit sauber oder verdächtig?" }, hints: [ { en: "Something stopped the tick from reaching the watchdog for two whole seconds - is that ever normal here?", de: "Etwas hat den Tick zwei ganze Sekunden lang nicht bis zum Watchdog kommen lassen - ist das hier je normal?" }, { en: "Read on past the reset-cause line: the same E output lists the forensic ring underneath it.", de: "Lies über die Reset-Ursachen-Zeile hinaus: dieselbe E-Ausgabe listet darunter den Forensik-Ring." }, { en: "A record written shortly before the reset survives in CCM, so the reason string that preceded the reset is usually still readable.", de: "Ein kurz vor dem Reset geschriebener Datensatz überlebt im CCM, die Grundzeichenkette vor dem Reset ist also meist noch lesbar." } ] }
socratic:
  - { trigger: "task:reset-cause:failed", question: { en: "Did E produce any output at all, or is the board still inside the app tree that ignores plain typed bytes?", de: "Hat E überhaupt eine Ausgabe erzeugt, oder steckt das Board noch im App-Baum, der einfach getippte Bytes ignoriert?" }, hints: [ { en: "No echo at all usually means the prompt is not the thing listening right now.", de: "Gar kein Echo heißt meistens, dass gerade nicht der Prompt zuhört." }, { en: "Send scripts/board_key.py quit from the terminal, then let the check run again.", de: "Sende scripts/board_key.py quit aus dem Terminal, dann lass den Check erneut laufen." }, { en: "The reset-cause line is the first thing E prints, before the ring - if you see ring records but no cause line, the output was truncated at the top.", de: "Die Reset-Ursachen-Zeile ist das Erste, was E druckt, noch vor dem Ring - siehst du Ring-Datensätze, aber keine Ursachenzeile, wurde die Ausgabe oben abgeschnitten." } ] }
  - { trigger: "question:iwdg-period:weak", question: { en: "What does a prescaler of /64 do to the 32 kHz before the counter ever sees it?", de: "Was macht ein Prescaler von /64 mit den 32 kHz, bevor der Zähler sie überhaupt sieht?" }, hints: [ { en: "Are you dividing the clock first and then counting, or counting at the raw clock rate?", de: "Teilst du den Takt zuerst und zählst dann, oder zählst du mit dem rohen Takt?" }, { en: "Read the comment block above the two defines in targets/itsboard/hal/hal_watchdog.c; it walks the same two steps but arrives at a different number - do the arithmetic yourself before you believe it.", de: "Lies den Kommentarblock über den beiden Defines in targets/itsboard/hal/hal_watchdog.c; er geht dieselben zwei Schritte durch, kommt aber auf eine andere Zahl - rechne selbst nach, bevor du sie glaubst." }, { en: "One counting step lasts as long as one cycle of the already-divided clock; the reload number only says how many steps it takes to reach zero.", de: "Ein Zählschritt dauert so lange wie eine Schwingung des bereits geteilten Takts; die Reload-Zahl sagt nur, wie viele Schritte bis null nötig sind." } ] }
---
## Lernziel

Verstehe, wie der unabhängige Watchdog aus „das Board hängt mit roter LED“ ein „das Board erholt sich selbst, und die Ursache ist danach noch lesbar“ macht.

## Zwei Hälften eines Features

`core/cads_hal.h` dokumentiert das Design im Kommentar über `cads_hal_watchdog_init()`:

1. **`cads_hal_watchdog_init()` / `cads_hal_watchdog_feed()`.** `modules/kernel/src/kernel.c` schärft den IWDG beim Scheduler-Start und füttert ihn aus `vApplicationTickHook()` — einmal je SysTick bei 1 kHz — **nie aus einer Anwendungs-Task**.
2. **`cads_hal_reset_cause()`.** Dekodiert `RCC->CSR`, bevor etwas es löscht, sodass ein vom Watchdog verursachter Reset von einem Power-on oder einem Debugger-Reset unterscheidbar ist.

Eine Feinheit, die beim Lesen auffällt: `cads_hal_watchdog_init()` nimmt zwar einen Timeout-Parameter (`CADS_WATCHDOG_TIMEOUT_MS` aus `kernel.c`), verwirft ihn aber mit `(void)timeout_ms` und benutzt feste Prescaler- und Reload-Werte. Die tatsächliche Periode steht also nicht im Aufrufer, sondern in der Hardwarekonfiguration weiter unten — und die rechnest du gleich selbst nach.

## Warum der Tick, nicht eine Task

Das Füttern aus dem Tick ist eine bewusste Scope-Entscheidung. Es beweist, dass das Interrupt-System lebt, und erholt sich zuverlässig von einem echten Lockup — einer HardFault-Rekursion oder global gesperrten Interrupts — mit **null** Risiko eines Fehl-Resets während einer legitimen langen Operation. Ein 448-ms-Vollbild-Flush oder eine minutenlange Explorer-Demo halten den Tick nie an, können ihn also nie auslösen.

Die ehrliche Grenze: er fängt **nicht** eine kooperative Task, die ewig auf etwas wartet, das nie eintritt, während Interrupts weiterlaufen. Das ist ein anderes, schwereres Problem, und der HAL-Kommentar sagt das, statt anderes anzudeuten.

## Was die Hardware tut

`targets/itsboard/hal/hal_watchdog.c` schreibt nur IWDG, DBGMCU und `RCC->CSR` — kein GPIO, also greift keine Pin-Regel aus `docs/SAFETY.md`. Drei Dinge zählen:

- **Einbahnstraße.** Einmal mit Schlüssel `0xCCCC` gestartet, lässt sich der IWDG per Software nicht stoppen, auch nicht per Peripherie-Reset — nur durch ein volles Power-on. Getaktet wird er vom **LSI**, dem chipeigenen RC-Oszillator mit nominell **32 kHz**, völlig unabhängig von PLL und HSE. Konfiguriert ist er mit Prescaler **`/64`** (`CADS_IWDG_PRESCALER_BITS`) und Reload **1000** (`CADS_IWDG_RELOAD_VALUE`). Wie lang die Periode damit ist, ist deine zweite Aufgabe; vergleiche das Ergebnis anschließend mit dem 448-ms-Flush.
- **Eingefroren beim Debug-Halt.** `DBGMCU->APB1FZ |= DBGMCU_APB1_FZ_DBG_IWDG_STOP`, sodass GDB an einer lebenden Panic nie gegen einen überraschenden Reset antritt. Damit bleibt „hält mit Debugger nützlich an“ aus `docs/SAFETY.md` wahr. (Es erklärt auch einen echten Fehler aus M7: ein *Reset* beim Flashen schärft diesen Watchdog neu, bevor der Kern wieder angehalten ist.)
- **Haftende Flags.** Die Reset-Ursachen-Bits in `RCC->CSR` bleiben bis zum Löschen. `cads_hal_reset_cause()` liest sie genau einmal je Boot — `RCC_CSR_IWDGRSTF` wird zu `CadsResetWatchdogIndependent`, POR/BOR zu `CadsResetPowerOn`, NRST zu `CadsResetPin` — löscht sie per `RMVF` und liefert bei jedem späteren Aufruf die gecachte Antwort.

Der LSI ist übrigens ein RC-Oszillator ohne enge Toleranzangabe. Anders als beim HSE liest die Firmware nirgends nach, welche Frequenz er tatsächlich erreicht; die berechnete Periode ist deshalb ein Nennwert, kein garantierter. Für einen Watchdog, der um den Faktor vier über der längsten normalen Operation liegt, reicht das — und genau deshalb ist der Abstand so großzügig gewählt.

## Ein Kommentar, der nicht zu seinen eigenen Zahlen passt

Rechne nicht ab, sondern nach. Der Kommentar über den beiden Defines in `targets/itsboard/hal/hal_watchdog.c` nennt zwei Werte:

> `IWDG_PR prescaler /64 (PR=100b) gives a ~2.048 ms tick at nominal 32 kHz;`
> `IWDG_RLR=1000 (max 0xFFF=4095) gives ~2.048 s.`

Derselbe Kommentar nennt als Nennfrequenz des LSI 32 kHz. Aus 32 kHz und `/64` folgen diese beiden Zahlen aber nicht. Welche Zahl aus den angegebenen Werten folgt, welche nicht, und welche LSI-Frequenz man voraussetzen müsste, damit der Kommentar recht behielte — das ist deine zweite Aufgabe. Öffne die Datei und lies den Kommentar im Original nach, bevor du ihn beurteilst; die zwei Zeilen oben sind ein Zitat, keine Zusammenfassung.

Das ist kein konstruiertes Beispiel: eine Zahl in einem Kommentar ist eine Behauptung wie jede andere, und der Kurs übernimmt sie nicht ungeprüft, nur weil sie im Quelltext steht.

## Wo du es siehst

Der Explorer-Befehl `E` druckt `# this boot's reset cause: ...`, gefolgt vom Forensik-Ring aus M3-03. Zusammen beantworten sie „folgte dieser Boot auf einen Absturz?“, bevor du ihn für sauber hältst. Ein Ring, der über einen guten Lauf nicht wächst, beweist, dass alte Einträge inert sind — nicht, dass ein Fehler wiederkehrt.

## Deine Aufgabe

Öffne die Board-Konsole, damit du mitliest — senden musst du nichts: der Knopf **Prüfen** an dieser Aufgabe schickt `E` selbst und wartet auf die Antwort. Lies die Reset-Ursache dieses Boots. Steht das Board im App-Baum, führe vorher einmal `python3 scripts/board_key.py quit` in einem Terminal aus. Rechne dann aus den drei Hardwarewerten oben aus, wie lang die Watchdog-Periode ist, entscheide den Widerspruch zum Kommentar in `targets/itsboard/hal/hal_watchdog.c`, und vergleiche das Ergebnis mit der längsten normalen Blockierspanne der Firmware.

**Wo du das machst:**
- Datei öffnen: `Strg`/`Cmd`+`P`.
- Terminal öffnen: Menü *Terminal → New Terminal*.
- Board-Konsole öffnen: `F1`, dann *CaDS Board: Konsole öffnen*.
- Bauen: Menü *Terminal → Run Build Task…*.
