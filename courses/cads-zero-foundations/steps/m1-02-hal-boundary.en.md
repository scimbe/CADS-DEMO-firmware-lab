---
id: m1-02-hal-boundary
title: The HAL boundary
bloom: understand
objectives: [firmware-reference-hal]
requires: [m1-01-module-layout]
estimatedMinutes: 15
scaffold: worked
links:
  - { step: m1-03-sim-vs-board }
  - { doc: "docs/reference/hal.md" }
  - { file: "core/cads_hal.h", line: 57 }
  - { doc: "docs/reference/memory-map.md" }
sources: [docs/reference/hal.md, core/cads_hal.h, docs/reference/memory-map.md]
tasks:
  - id: read-header
    title: You have opened the three places in the HAL header
    check: { type: command, cwd: ".", command: "grep -nE 'CADS_DMA_SECTION|display_readable|no FIFO' core/cads_hal.h", expectExitCode: 0 }
  - id: ccm-and-readable
    title: Decide which buffer may live in CCM
    check: { type: question, prompt: { en: "The framebuffer and the console ring buffer are both to move into CCM. For which of the two is that safe?", de: "Der Framebuffer und der Konsolen-Ringpuffer sollen beide ins CCM wandern. Für welchen der beiden ist das gefahrlos?" }, rubric: "Only the console ring buffer. It is filled by the USART receive interrupt handler, that is by the processor itself, and the processor reaches CCM without restriction. The framebuffer, by contrast, is the source of a DMA transfer, and DMA cannot see CCM on this part: such a transfer then produces nothing, with no fault and no error flag. The deciding criterion is therefore who reads the buffer — the CPU or DMA. Allowing both or forbidding both means that criterion was not applied.", bloom: understand }
  - id: readable-widget
    title: Diagnose a difference between simulator and board
    check: { type: question, prompt: { en: "A widget draws correctly in the simulator and wrongly on the board, from the same object code. Which assumption in the widget explains that?", de: "Ein Widget zeichnet im Simulator richtig und auf dem Board falsch, aus demselben Objektcode. Welche Annahme im Widget erklärt das?" }, rubric: "The widget reads the screen contents back instead of keeping its own copy — a read, modify and write back on video memory. In the simulator display_readable is true and the return path exists; on the ITSboard the field is false and there is none, so what comes back is not picture content at all. The correct approach is to ask the descriptor and treat the own buffer in RAM as the only truth. Pointing merely at different hardware does not name the field.", bloom: understand }
socratic:
  - { trigger: "task:read-header:failed", question: { en: "The check reads one file in the firmware root. Is the path in the output the one you expected?", de: "Der Check liest eine einzige Datei im Wurzelverzeichnis der Firmware. Ist der Pfad in der Ausgabe der, den du erwartet hast?" }, hints: [ { en: "Nothing here depends on your editing anything: the check fails when it runs outside the firmware root or the header has been moved.", de: "Nichts hier hängt davon ab, dass du etwas änderst: der Check scheitert, wenn er außerhalb des Firmware-Wurzelverzeichnisses läuft oder der Header verschoben wurde." }, { en: "Open the file by hand with Ctrl/Cmd+P and type cads_hal.h; it lives in core/, next to cads_version.h.", de: "Öffne die Datei von Hand mit Strg/Cmd+P und tippe cads_hal.h; sie liegt in core/, neben cads_version.h." }, { en: "The three search terms are the three places this step is about: the memory-placement macros, the descriptor field for readability, and the sentence about the USART receive register.", de: "Die drei Suchbegriffe sind die drei Stellen, um die es in diesem Step geht: die Makros zur Speicherplatzierung, das Descriptor-Feld zur Lesbarkeit und der Satz über das Empfangsregister der USART." } ] }
  - { trigger: "question:ccm-and-readable:weak", question: { en: "For each of the two buffers, name who reads it: the processor itself, or the copying engine beside it?", de: "Nenne für jeden der beiden Puffer, wer ihn liest: der Prozessor selbst oder das Kopierwerk daneben?" }, hints: [ { en: "The commonest wrong turn is to treat CCM as simply forbidden. It is not — the header offers CADS_CCM_SECTION on purpose, for a particular kind of user.", de: "Der häufigste Irrweg ist, das CCM für schlicht verboten zu halten. Ist es nicht — der Header bietet CADS_CCM_SECTION mit Absicht an, für eine bestimmte Sorte Nutzer." }, { en: "Search core/cads_hal.h for CADS_CCM_SECTION with Ctrl/Cmd+F and read the comment above the two macros; it names the criterion in one half-sentence.", de: "Suche in core/cads_hal.h mit Strg/Cmd+F nach CADS_CCM_SECTION und lies den Kommentar über den beiden Makros; er nennt das Kriterium in einem Halbsatz." }, { en: "The console path in this step is described as interrupt-driven. An interrupt handler runs on the processor — that already settles one of the two cases.", de: "Der Konsolenpfad heißt in diesem Step interruptgetrieben. Eine Unterbrechungsroutine läuft auf dem Prozessor — damit ist einer der beiden Fälle schon entschieden." } ] }
  - { trigger: "question:readable-widget:weak", question: { en: "Which single field of the board descriptor has different values in the two worlds, and what does a widget do differently when it is true?", de: "Welches einzelne Feld des Board-Descriptors hat in den beiden Welten verschiedene Werte, und was macht ein Widget anders, wenn es true ist?" }, hints: [ { en: "The bug is not in the drawing arithmetic; the same object code produces it. Look for something the widget asks the hardware for instead of remembering it.", de: "Der Fehler steckt nicht in der Zeichenrechnung; derselbe Objektcode erzeugt ihn. Such nach etwas, das das Widget bei der Hardware erfragt, statt es sich zu merken." }, { en: "Open core/cads_hal.h at the cads_board_info_t struct (Ctrl/Cmd+P, then Ctrl/Cmd+F for board_info) and read the comment on each bool field.", de: "Öffne core/cads_hal.h bei der Struktur cads_board_info_t (Strg/Cmd+P, dann Strg/Cmd+F nach board_info) und lies den Kommentar an jedem bool-Feld." }, { en: "On this shield the display bus is write-only. A routine that first reads a pixel back therefore gets something on one target and nothing usable on the other.", de: "Auf diesem Shield ist der Displaybus nur beschreibbar. Eine Routine, die einen Bildpunkt erst zurückliest, bekommt auf dem einen Target etwas und auf dem anderen nichts Brauchbares." } ] }
---
## Learning goal

Know the one header that separates portable code from hardware, and the two contracts in it that are easiest to break.

## Where you read

Open `core/cads_hal.h` with `Ctrl`/`Cmd`+`P` and by typing the name `cads_hal.h`. The first task at the bottom of this panel (button **Check**) searches for three places in exactly that file and prints their line numbers. Jump to each in the editor — `Ctrl`/`Cmd`+`G` and the number — and you will have read the three paragraphs this step is about.

## One header, two implementations

`core/cads_hal.h` is the entire boundary between the firmware and the silicon. Everything above it compiles unchanged for the board and for the host simulator. Two implementations exist: `targets/itsboard/hal/` against STM32F429 registers, and `targets/sim/hal_sim.c` against SDL2. Keeping the surface this narrow is what makes the simulator honest — if a feature is not expressible here, it cannot silently work in only one of the two worlds.

The header groups roughly forty functions: lifecycle (`cads_hal_early_init`, `cads_hal_init`), time, console, display, touch, adapter I/O, on-board indicators, panic, watchdog and reset cause, and the hardware random generator. Time is derived from the **DWT cycle counter** — a counter in the core's debug unit that counts every processor clock — rather than from a periodic interrupt. That is why it stays correct inside a **critical section**, that is a piece of code for whose duration interrupts are disabled.

## Ask the descriptor, do not assume

`cads_hal_board_info()` returns a `cads_board_info_t` — a **descriptor**: a struct that hands out properties of the board as data fields instead of hiding them in code. Layers above ask it questions rather than testing which board they are on: `has_network`, `has_touch`, `button_count`, `display_width`.

The `CADS_DISPLAY_WIDTH`/`HEIGHT` macros exist only so the canvas can size its static **framebuffer** at **link time**. A framebuffer is the region of RAM in which the picture stands complete before it goes to the panel; link time is the moment the linker assigns addresses — long before the program first runs. Layout code, by contrast, uses the descriptor. Two of its fields carry the most weight:

- **`display_readable`** is `false` on the ITSboard: the bus has no return path, so nothing can read video memory back. The simulator sets it `true`, because an SDL surface can be read.
- **`display_pixels_per_second`** is measured (342 000), not calculated. A GUI deciding whether an animation is affordable should look it up.

## The two contracts that bite

`cads_hal_display_blit()` hands a rectangle of **RGB565** pixels to DMA and returns immediately. A **blit** is the copying of a rectangular piece of image from one memory to another; *RGB565* is the panel's pixel format: sixteen bits per pixel, split between red, green and blue. **DMA** (direct memory access) is a copying engine beside the CPU: it fetches the bytes from memory itself while the processor carries on computing.

- `pixels` must stay valid until `cads_hal_display_busy()` reports false.
- On hardware the buffer **must live in DMA-capable SRAM, never in CCM**. CCM at `0x10000000` is invisible to every DMA controller on this part; a transfer sourced there produces nothing — no fault, no error flag, just wrong output. The header supplies `CADS_DMA_SECTION` for that: it places a buffer in the **linker section** `.dmaram`, that is in a named drawer of the memory plan to which the linker assigns a fixed region — here guaranteed in SRAM and readable in the map file. `CADS_CCM_SECTION` is its counterpart for things only the CPU touches, such as task stacks.

The console receive path is the other contract: interrupt-driven with a **ring buffer**. A ring buffer is a fixed-size array that starts again at the front when it is full at the back, buffering a stream of bytes between writer and reader; it is also called a **FIFO**, first in, first out. It is needed because the STM32F4 USART has a one-byte receive register and no FIFO of its own in the part. At 115200 baud a byte lands every 87 µs, and any slower polling loop drops characters. The ring buffer is filled by the receive interrupt handler, that is by the CPU itself. The two counters `cads_hal_console_dropped()` and `cads_hal_console_overruns()` exist so such loss can never again be silent — it once presented as a display fault.

## Your task

1. Press **Check** on the first task and read the three printed places in `core/cads_hal.h`.
2. Then decide which of the two named buffers may live in CCM, and justify it.
3. Finally, diagnose the widget that draws correctly on only one of the two sides.

The next step shows what the boundary buys: the same code running with no board attached.
