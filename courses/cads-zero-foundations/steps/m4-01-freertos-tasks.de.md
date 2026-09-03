---
id: m4-01-freertos-tasks
title: FreeRTOS ohne Heap
bloom: apply
objectives: [cz.rtos.tasks]
requires: [m3-05-spi-mutex]
estimatedMinutes: 15
scaffold: worked
recallFrom: [m3-04-stack-guard]
links:
  - { step: m4-02-ram-budget }
  - { doc: "docs/reference/memory-map.md" }
  - { file: "modules/kernel/src/FreeRTOSConfig.h", line: 53 }
  - { file: "apps/bringup/tasks.c", line: 72 }
  - { file: "modules/kernel/src/kernel.c", line: 119 }
  - { doc: "docs/ROADMAP.md" }
sources: [modules/kernel/src/FreeRTOSConfig.h, apps/bringup/tasks.c, modules/kernel/src/kernel.c, docs/reference/memory-map.md]
tasks:
  - id: stack-report
    title: Lass das Board seinen Stack-Bericht drucken
    check: { type: serialExpect, send: "k\n", pattern: "ui_free=", timeoutMs: 15000 }
  - id: console-used
    title: Rechne aus, wie viel des Konsolen-Stacks benutzt ist
    check: { type: question, prompt: { en: "Your k run printed console_free. How many bytes of the console stack have actually been used?", de: "Dein k-Lauf hat console_free gedruckt. Wie viele Byte des Konsolen-Stacks sind damit tatsächlich benutzt?" }, rubric: "Die Antwort nennt die eigene gemessene Zahl und die Rechnung dazu, nicht ein Beispiel aus dem Text. CADS_CONSOLE_STACK ist 1024 Wörter, ein Wort ist vier Byte, der Stack ist also 4096 Byte groß; benutzt sind 4096 minus dem gedruckten console_free. Wer console_free selbst als Verbrauch ausgibt, hat die Bedeutung des Namens übersehen: cads_thread_stack_free() liefert uxTaskGetStackHighWaterMark, also den kleinsten je gemessenen freien Rest, mal vier Byte. Eine Antwort ohne konkrete Zahl vom eigenen Board zählt nicht.", bloom: apply }
socratic:
  - { trigger: "task:stack-report:failed", question: { en: "Did the board answer with anything at all, or is it still inside the touchscreen app tree that ignores plain typed bytes?", de: "Hat das Board überhaupt geantwortet, oder steckt es noch im Touchscreen-App-Baum, der einfach getippte Bytes ignoriert?" }, hints: [ { en: "A console command with no echo at all usually means the prompt is not the thing listening right now.", de: "Ein Konsolenbefehl ganz ohne Echo heißt meistens, dass gerade nicht der Prompt zuhört." }, { en: "Send scripts/board_key.py quit from the terminal, then let the check run again.", de: "Sende scripts/board_key.py quit aus dem Terminal, dann lass den Check erneut laufen." }, { en: "The board is also silent while a debug session has it halted - resume or end that session first.", de: "Das Board schweigt auch, solange eine Debug-Sitzung es angehalten hat - setze fort oder beende diese Sitzung zuerst." } ] }
  - { trigger: "question:console-used:weak", question: { en: "Does the word free in console_free describe what has been consumed, or what is left over?", de: "Beschreibt das Wort free in console_free, was verbraucht wurde, oder was übrig ist?" }, hints: [ { en: "Did you subtract from the stack's total size, or report the printed number unchanged?", de: "Hast du von der Gesamtgröße des Stacks abgezogen oder die gedruckte Zahl unverändert weitergegeben?" }, { en: "Read cads_thread_stack_free() in modules/kernel/src/kernel.c: it names the FreeRTOS call behind it and the factor it multiplies by.", de: "Lies cads_thread_stack_free() in modules/kernel/src/kernel.c: die Funktion nennt den FreeRTOS-Aufruf dahinter und den Faktor, mit dem sie multipliziert." }, { en: "CADS_CONSOLE_STACK is given in words in tasks.c, while the console prints bytes - one of the two numbers has to be converted before you subtract.", de: "CADS_CONSOLE_STACK steht in tasks.c in Wörtern, die Konsole druckt Byte - eine der beiden Zahlen muss vor dem Abziehen umgerechnet werden." } ] }
---
## Lernziel

Verstehe, wie CaDS Zero FreeRTOS ohne Kernel-Heap und mit Task-Stacks im CCM betreibt, und lies den Live-Stack-Bericht vom Board.

## Nur statische Allokation

`modules/kernel/src/FreeRTOSConfig.h` setzt `configSUPPORT_STATIC_ALLOCATION 1` und `configSUPPORT_DYNAMIC_ALLOCATION 0`. Es gibt kein `pvPortMalloc` und nirgends einen Kernel-Heap: jede Task, Queue, Mutex und jeder Timer wird **vom Aufrufer allokiert**. Die Kernel-Wrapper in `modules/kernel` (`cads_thread`, `cads_mutex`, `cads_queue`, `cads_timer`, `cads_event`) folgen derselben Konvention — der Aufrufer besitzt den Speicher. Selbst Idle- und Timer-Service-Task bekommen ihren Speicher aus `vApplicationGetIdleTaskMemory()` / `vApplicationGetTimerTaskMemory()` in `modules/kernel/src/kernel.c`.

Warum so streng? Weil auf diesem Board der SRAM-Heap *die* Sicherheitsreserve ist (`docs/reference/memory-map.md`). Ein Kernel, der zur Laufzeit allokiert, verbraucht Speicher, den der Linker nicht sieht; ein Kernel, der nichts allokiert, macht die gesamten RAM-Kosten zur Linkzeit sichtbar, wo die 48-KB-Zusicherung sie abfängt.

## Wo die Stacks liegen

`apps/bringup/tasks.c` definiert die drei Anwendungs-Tasks und ihre Stacks, in Worten:

```c
#define CADS_UI_STACK      512
#define CADS_INPUT_STACK   1024
#define CADS_CONSOLE_STACK 1024

CADS_CCM_SECTION __attribute__((aligned(8))) static uint32_t cads_ui_stack[CADS_UI_STACK];
CADS_CCM_SECTION ... cads_input_stack[CADS_INPUT_STACK];
CADS_CCM_SECTION ... cads_console_stack[CADS_CONSOLE_STACK];
```

Zwei Einheiten treffen hier aufeinander, und die Verwechslung ist der häufigste Rechenfehler in diesem Modul: FreeRTOS zählt Stacks in **Wörtern**, der Typ `uint32_t` macht daraus vier Byte je Wort, und der Konsolenbericht gleich druckt **Byte**.

`CADS_CCM_SECTION` (aus `core/cads_hal.h`) legt sie in die `.ccm`-Ausgabesektion des Linkers bei `0x10000000`. CCM ist für jeden DMA-Controller des STM32F429 unsichtbar — nutzlos für einen Framebuffer, aber perfekt für einen Stack: nur die CPU berührt ihn je. Auch der 4 KB große Main-Stack (MSP) sitzt oben im CCM (`__cads_main_stack_size = 4K` im Linkerskript). Ergebnis: alle 192 KB DMA-fähiges SRAM bleiben frei für Framebuffer, Staging-Puffer und lwIP, und CCM — 64 KB, davon belegen die Stacks wenige KB — kostet nichts Knappes.

## Drei Tasks, drei Prioritäten

Der Kopfkommentar von `apps/bringup/tasks.c` begründet die Auswahl: jede der drei Tasks steht für eine Art, wie eine die anderen aushungern kann. `ui` besitzt das Display, ein Flush blockiert bis zu 448 ms; `input` tastet Knöpfe und Touch mit 100 Hz ab; `console` ist der Diagnosekanal. Welche Priorität jede bekommt und was daraus folgt, ist das Thema von M4-03 — hier zählt nur, dass es drei sind und dass sie sich Hardware teilen.

## Zwei Hooks, die wachen

`configUSE_IDLE_HOOK 1` und `configCHECK_FOR_STACK_OVERFLOW 2` sind beide aktiv. `vApplicationIdleHook()` in `tasks.c` prüft die Stack-Guard-Wächter (die Canary-Technik aus M3-04); `vApplicationStackOverflowHook()` in `kernel.c` löst eine Panic aus, statt weiterzulaufen, denn eine Task, die ihren Stack verlassen hat, hat bereits überschrieben, was danach kam.

## Die Live-Zahlen lesen

Der Explorer-Befehl `k` (`cads_tasks_report()` in `tasks.c`) druckt eine Zeile dieser Form:

```
# tasks  ui_free=... input_free=... console_free=... tasks=... events=... last_key=...
```

Achte auf den Namen: `*_free` ist **freier Rest**, nicht Verbrauch. Dahinter steckt `cads_thread_stack_free()` in `modules/kernel/src/kernel.c`, und die Funktion liefert `uxTaskGetStackHighWaterMark()` — den *kleinsten* freien Rest, den diese Task je hatte — multipliziert mit der Wortbreite. Der Wert ist also ein Tiefstand über die gesamte Laufzeit, nicht eine Momentaufnahme, und genau deshalb taugt er zum Dimensionieren.

Am M2-Hardware-Gate konvergierten diese Marken bei ui 224 B, input 132 B und console 372 B — winzig gegenüber den Budgets, weshalb die zwei Überläufe aus M3-04 überraschten und weshalb die Zahlen bei jedem Lauf gelesen werden sollten. **Deine** Zahlen werden andere sein; sie hängen davon ab, was das Board seit dem Boot getan hat.

## Deine Aufgabe

Bring das Board an den Konsolen-Prompt (nötigenfalls mit `scripts/board_key.py quit`) und lass den Check `k` ausführen. Notiere die drei Zahlen. Rechne dann aus, wie viele Byte des Konsolen-Stacks tatsächlich benutzt sind — mit deiner eigenen Zahl, nicht mit der aus dem Text.
