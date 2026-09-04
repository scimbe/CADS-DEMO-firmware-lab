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
  - { trigger: "task:stack-report:failed", question: { en: "Did the board answer with anything at all, or is it still inside the touchscreen app tree that ignores plain typed bytes?", de: "Hat das Board überhaupt geantwortet, oder steckt es noch im Touchscreen-App-Baum, der einfach getippte Bytes ignoriert?" }, hints: [ { en: "A console command with no echo at all usually means the prompt is not the thing listening right now.", de: "Ein Konsolenbefehl ganz ohne Echo heißt meistens, dass gerade nicht der Prompt zuhört." }, { en: "Open a terminal at the bottom (menu icon with three lines at the top left, then Terminal, then New Terminal), run python3 scripts/board_key.py quit there, then let the check run again.", de: "Öffne unten ein Terminal (Symbol mit den drei Strichen oben links, dann Terminal, dann New Terminal), führe dort python3 scripts/board_key.py quit aus, dann lass den Check erneut laufen." }, { en: "The board is also silent while a debug session has it halted - resume or end that session first.", de: "Das Board schweigt auch, solange eine Debug-Sitzung es angehalten hat - setze fort oder beende diese Sitzung zuerst." } ] }
  - { trigger: "question:console-used:weak", question: { en: "Does the word free in console_free describe what has been consumed, or what is left over?", de: "Beschreibt das Wort free in console_free, was verbraucht wurde, oder was übrig ist?" }, hints: [ { en: "Did you subtract from the stack's total size, or report the printed number unchanged?", de: "Hast du von der Gesamtgröße des Stacks abgezogen oder die gedruckte Zahl unverändert weitergegeben?" }, { en: "Read cads_thread_stack_free() in modules/kernel/src/kernel.c: it names the FreeRTOS call behind it and the factor it multiplies by.", de: "Lies cads_thread_stack_free() in modules/kernel/src/kernel.c: die Funktion nennt den FreeRTOS-Aufruf dahinter und den Faktor, mit dem sie multipliziert." }, { en: "CADS_CONSOLE_STACK is given in words in tasks.c, while the console prints bytes - one of the two numbers has to be converted before you subtract.", de: "CADS_CONSOLE_STACK steht in tasks.c in Wörtern, die Konsole druckt Byte - eine der beiden Zahlen muss vor dem Abziehen umgerechnet werden." } ] }
---

## Lernziel

Verstehe, wie CaDS Zero FreeRTOS ohne Kernel-Heap und mit Task-Stacks im CCM betreibt, und lies den Live-Stack-Bericht vom Board.

## Nur statische Allokation

`modules/kernel/src/FreeRTOSConfig.h` setzt `configSUPPORT_STATIC_ALLOCATION 1` und `configSUPPORT_DYNAMIC_ALLOCATION 0`. Es gibt kein `pvPortMalloc` und nirgends einen Kernel-Heap: jede Task, Queue, Mutex und jeder Timer wird **vom Aufrufer allokiert**. Selbst Idle- und Timer-Service-Task bekommen ihren Speicher aus `vApplicationGetIdleTaskMemory()` / `vApplicationGetTimerTaskMemory()` in `modules/kernel/src/kernel.c`.

**Lies das selbst nach:** drücke `Strg`/`Cmd`+`P`, tippe `FreeRTOSConfig.h`, Enter. Die Datei öffnet sich als Reiter **in der Mitte** des Fensters. Ohne Tastatur: ganz links das oberste Symbol der schmalen Leiste (der Datei-Explorer), dann durch den Baum klicken. Es dauert einen Augenblick; du erkennst den Erfolg daran, dass der Reitername oben `FreeRTOSConfig.h` lautet.

Warum so streng? Weil auf diesem Board der SRAM-Heap *die* Sicherheitsreserve ist (`docs/reference/memory-map.md`). Ein Kernel, der nichts allokiert, macht die gesamten RAM-Kosten zur Linkzeit sichtbar, wo die 48-KB-Zusicherung sie abfängt.

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

`CADS_CCM_SECTION` (aus `core/cads_hal.h`) legt sie in die `.ccm`-Sektion bei `0x10000000`. CCM ist für jeden DMA-Controller des STM32F429 unsichtbar — nutzlos für einen Framebuffer, aber perfekt für einen Stack. Auch der 4 KB große Main-Stack (MSP) sitzt dort. Alle 192 KB DMA-fähiges SRAM bleiben damit frei für Framebuffer, Staging-Puffer und lwIP.

## Drei Tasks, drei Prioritäten

Der Kopfkommentar von `apps/bringup/tasks.c` begründet die Auswahl: `ui` besitzt das Display, ein Flush blockiert bis zu 448 ms; `input` tastet Knöpfe und Touch mit 100 Hz ab; `console` ist der Diagnosekanal. Welche Priorität jede bekommt, ist das Thema von M4-03.

## Zwei Hooks, die wachen

`configUSE_IDLE_HOOK 1` und `configCHECK_FOR_STACK_OVERFLOW 2` sind beide aktiv. `vApplicationIdleHook()` in `tasks.c` prüft die Stack-Guard-Wächter; `vApplicationStackOverflowHook()` in `kernel.c` löst eine Panic aus, statt weiterzulaufen.

## Die Live-Zahlen lesen

Der Explorer-Befehl `k` (`cads_tasks_report()` in `tasks.c`) druckt eine Zeile dieser Form:

```
# tasks  ui_free=... input_free=... console_free=... tasks=... events=... last_key=...
```

Achte auf den Namen: `*_free` ist **freier Rest**, nicht Verbrauch. Dahinter steckt `cads_thread_stack_free()` in `modules/kernel/src/kernel.c`; die Funktion liefert `uxTaskGetStackHighWaterMark()` — den *kleinsten* freien Rest, den diese Task je hatte — multipliziert mit der Wortbreite. Der Wert ist ein Tiefstand über die gesamte Laufzeit und taugt genau deshalb zum Dimensionieren.

Am M2-Hardware-Gate konvergierten diese Marken bei ui 224 B, input 132 B und console 372 B. **Deine** Zahlen werden andere sein; sie hängen davon ab, was das Board seit dem Boot getan hat.

## Deine Aufgabe

**Schritt 1 — die Board-Konsole öffnen, damit du mitliest.** Drücke **`F1`**, tippe `CaDS Board: Konsole öffnen`, Enter. **Unten** im Terminal-Bereich erscheint ein Terminal mit dem Namen `CaDS Board Console`, die serielle Konsole des Boards mit 115200 Baud. Dieser Bereich sitzt unten und trägt die Reiter `PROBLEMS`, `OUTPUT`, `DEBUG CONSOLE`, `TERMINAL`, `PORTS`, `MEMORY`, `XRTOS`; `Strg`/`Cmd`+`J` klappt ihn auf und wieder zu. Es dauert eine Sekunde, und du erkennst den Erfolg an der blauen Kopfzeile des Terminals.

<!-- SHOT: m4-board-console-terminal | Der Terminal-Bereich unten mit dem geoeffneten Terminal CaDS Board Console und seiner blauen Kopfzeile | HARDWARE -->

**Schritt 2 — das Board an den Prompt bringen.** Ein frisch geflashtes Board startet im Touchscreen-App-Baum und überhört einzelne Buchstaben. Öffne darum vorher ein Terminal (**☰ → `Terminal` → `New Terminal`**; ☰ ist das Symbol mit den drei Strichen ganz oben links, es gibt keine sichtbare Menüleiste) und führe einmal aus:

```bash
python3 scripts/board_key.py quit
```

Das Arbeitsverzeichnis ist die Projektwurzel, es dauert unter einer Sekunde, und danach antwortet die Konsole wieder auf Buchstaben.

**Schritt 3 — den Bericht anfordern.** Den Befehl `k` tippst du **nicht** selbst: der Knopf **Prüfen** an dieser Aufgabe sendet ihn, du liest nur die Antwort mit. Der Knopf sitzt an der Aufgabe unten im Steptext, dem Reiter `CaDS Tutor: FreeRTOS ohne Heap` **in der Mitte** des Fensters; oben in diesem Reiter liegt außerdem **Run all checks**. Die Antwort kommt in unter einer Sekunde und beginnt mit `# tasks`. Notiere die drei Zahlen.

**Schritt 4.** Rechne aus, wie viele Byte des Konsolen-Stacks tatsächlich benutzt sind — mit deiner eigenen Zahl, nicht mit der aus dem Text.

## Wenn die Bedienung klemmt

- **Der Befehl lief, aber die Ausgabe wird im falschen Fenster gesucht.** Sie steht nicht im Steptext und nicht im Editor, sondern unten im Terminal-Bereich im Terminal `CaDS Board Console` — `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts in der Liste wählst du das richtige Terminal.
- **Das Terminal geschlossen und damit den Vorgang beendet.** Das Kreuz am Terminal beendet den Prozess darin und trennt die Konsole — zum Wegklappen `Strg`/`Cmd`+`J` nehmen, das lässt sie weiterlaufen.
- **Die Palette reagiert nicht auf das Tastenkürzel.** Der Browser hat `Strg`/`Cmd`+`Umschalt`+`P` abgefangen — nimm `F1`, oder den Weg über **☰ → `Terminal`**.

**Wo du arbeitest:** Datei öffnen `Strg`/`Cmd`+`P` · Terminal-Bereich `Strg`/`Cmd`+`J` · Befehlspalette `F1` · Menü **☰** oben links · Board-Konsole `F1` → `CaDS Board: Konsole öffnen` · prüfen mit **Prüfen** an der Aufgabe oder **Run all checks** oben im Steptext. Die Bedienoberfläche ist englisch, der Kurstext deutsch — der Menüpunkt heißt also `New Terminal`.
