---
id: m3-02-registers-svd
title: Core and peripheral registers, live
bloom: apply
objectives: [cz.debug.registers-svd]
requires: [m3-01-gdb-breakpoints]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m2-00-mmio-primer]
links:
  - { step: m3-03-fault-forensics }
  - { file: "targets/itsboard/STM32F429.svd" }
  - { file: "targets/itsboard/hal/hal_clock.c", line: 46 }
  - { file: "targets/itsboard/hal/hal_io.c", line: 62 }
  - { doc: "docs/how-to/vscode-setup.md" }
sources: [docs/how-to/vscode-setup.md, docs/how-to/debug.md, targets/itsboard/hal/hal_clock.c, targets/itsboard/hal/hal_io.c, targets/itsboard/board.h, docs/HARDWARE.md]
tasks:
  - id: odr-after-write
    title: Predict GPIOD->ODR, then write the outputs
    check: { type: predict, prompt: { en: "You are about to send `o 0055` on the console. Which value will the low byte of GPIOD->ODR hold afterwards, and why?", de: "Du sendest gleich `o 0055` an der Konsole. Welchen Wert hält danach das niederwertige Byte von GPIOD->ODR, und warum?" }, then: { type: serialExpect, send: "o 0055\n", pattern: "outputs = 0055", timeoutMs: 15000 }, rubric: "The prediction names 0x55 (binary 0101 0101) for the low byte of GPIOD->ODR and grounds it in cads_hal_adapter_outputs() writing the argument's low byte through GPIOD->BSRR, setting and clearing all eight bits in one word, so ODR afterwards mirrors exactly that byte. A different number with a traceable chain of reasoning counts as a pass, provided the difference is named after the comparison.", bloom: apply }
  - id: sws-mask
    title: Build the mask for the SWS field
    check: { type: question, prompt: { en: "SWS sits in bits 3:2 of RCC_CFGR. Which hex mask isolates that field, and which masked value do you expect here?", de: "SWS liegt in RCC_CFGR auf den Bits 3:2. Welche Hexmaske isoliert dieses Feld, und welchen maskierten Wert erwartest du hier?" }, rubric: "Mask 0x0000000C (bit 2 and bit 3, binary 1100). Since PLL as the system clock puts binary 10 into the field and the field starts at bit 2, the masked value reads 0x00000008; shifted right by two it becomes 0b10 = 2. An answer giving only 0xC without the expected value is incomplete; an answer of 0x3 or 0x0C000000 counted bit positions from the wrong end.", bloom: apply }
misconceptions:
  - { pattern: "outputs = 0085", question: { en: "The board echoed 0085, not 0055. In which number base does the o command read its argument?", de: "Das Board hat 0085 geantwortet, nicht 0055. In welchem Zahlensystem liest der Befehl o sein Argument?" }, hints: [ { en: "Did you type the decimal value of the pattern instead of its hex digits?", de: "Hast du den Dezimalwert des Musters getippt statt seiner Hexziffern?" }, { en: "Look at the help line for o in apps/bringup/explorer.c: the argument is documented as <hex>.", de: "Sieh dir die Hilfezeile zu o in apps/bringup/explorer.c an: das Argument ist als <hex> dokumentiert." }, { en: "The console never prints a 0x prefix; the four digits it echoes are already hex, so 85 there means 0x85, not eighty-five.", de: "Die Konsole druckt nie ein 0x-Präfix; die vier Ziffern, die sie zurückgibt, sind bereits hexadezimal, 85 dort heißt also 0x85, nicht fünfundachtzig." } ] }
socratic:
  - { trigger: "task:odr-after-write:failed", question: { en: "Did the board answer at all, or is it still inside the touchscreen app tree that ignores plain typed bytes?", de: "Hat das Board überhaupt geantwortet, oder steckt es noch im Touchscreen-App-Baum, der einfach getippte Bytes ignoriert?" }, hints: [ { en: "A console command that produces no echo at all usually means the prompt is not the thing listening right now.", de: "Ein Konsolenbefehl ganz ohne Echo heißt meistens, dass gerade nicht der Prompt zuhört." }, { en: "Open a terminal with the menu icon at the top left, Terminal, New Terminal, run python3 scripts/board_key.py quit there, then let the check run again.", de: "Öffne mit dem Menü-Symbol oben links, Terminal, New Terminal ein Terminal, führe dort python3 scripts/board_key.py quit aus und lass den Check dann erneut laufen." }, { en: "The board is also deaf while a debug session has it halted - press Continue or Stop on the debug toolbar at the top before writing to the console.", de: "Das Board ist auch taub, solange eine Debug-Sitzung es angehalten hat - drücke Continue oder Stop in der Debug-Werkzeugleiste oben, bevor du auf die Konsole schreibst." } ] }
  - { trigger: "question:sws-mask:weak", question: { en: "Which single bit is bit 2, written as a hex number, and which is bit 3?", de: "Welches einzelne Bit ist Bit 2, als Hexzahl geschrieben, und welches ist Bit 3?" }, hints: [ { en: "Are you counting bit positions from the right-hand end of the word, starting at zero?", de: "Zählst du die Bitpositionen vom rechten Ende des Wortes, beginnend bei null?" }, { en: "Write 1 << 2 and 1 << 3 as binary, put them side by side, and combine them with a bitwise or.", de: "Schreib 1 << 2 und 1 << 3 binär hin, leg sie nebeneinander und verknüpfe sie mit einem bitweisen Oder." }, { en: "Two adjacent bits sitting anywhere but at the far right: what you cut out is not yet the small number the datasheet talks about.", de: "Zwei benachbarte Bits, die nicht ganz rechts sitzen: was du herausschneidest, ist noch nicht die kleine Zahl aus dem Datenblatt." } ] }
---

## Learning goal

Read the STM32's own registers on the live board through the debugger, so you can answer hardware questions - is the clock right, what does an output pin hold - by looking rather than guessing.

## Opening the session you will read in

The user interface is in English while this course text is in German, and there is no visible menu bar: the menus hide behind the three-line icon (**☰**) at the very top left, which opens `File`, `Edit`, `Selection`, `View`, `Go`, `Run`, `Terminal` and `Help`.

Click the **bug icon** in the bar on the far left, which opens the **Run and Debug** view. Pick **`Debug CaDS Zero (Board im Browser)`** in the configuration list at the top and press **`F5`**; without the keyboard, **☰ → `Run` → `Start Debugging`**. In the terminal area at the bottom, `CaDS: Build + Flash` runs first in terminals of its own - about a minute plus 15 seconds the first time. Execution then halts at `main()`, which you can tell from the debug toolbar at the top and from `Paused on breakpoint` in `CALL STACK`.

You can only read registers on a **halted** target. If it is running, press the pause button on the debug toolbar at the top.

## Core registers

The **`VARIABLES`** section lists `Local`, `Global`, `Static` and **`Registers`**. Expand `Registers`.

![The VARIABLES pane with its Local, Global, Static and Registers sections](debug-variables.png)

Inside are `r0`-`r12`, `sp`, `lr`, `pc`, `xPSR` with live values - the CPU's state at the halt. `pc` is where execution will resume; `lr` is the return address of the current function; `sp` is the active stack pointer (MSP before the scheduler starts, PSP inside a task). You will need all three in the next step.

![Registers expanded, with the live values of r0, r1 and the remaining core registers](debug-registers.png)

## Peripheral registers through the SVD

Raw core registers rarely answer the embedded question you have. What you want is "is `RCC->CR` showing HSE ready?" or "what is in `GPIOD->ODR`?". `cortex-debug` answers those with an **SVD file**: `targets/itsboard/STM32F429.svd` describes every peripheral, register, field and reset value, from STMicroelectronics itself and wired into the configuration.

During a session an **`XPeripherals`** section appears in the Run and Debug view with every peripheral by name and base address. Click the arrow in front of a name for its registers and their live values, the arrow in front of a register for its fields. Outside a session it reads "No active debug session", which is correct.

![The XPeripherals section from the SVD, with ADC1 at 0x40012000 and CAN1 at 0x40006400](debug-peripherals-svd.png)

## Cutting a field out of a register

A register is rarely one number; it is a row of **fields**. The SVD breaks them out; the moment you compute one yourself you need the two moves from the MMIO primer: **mask** with a mask that has exactly bits *h:l* set (bit *n* is `1 << n`, counting from the right-hand end from zero), and **shift** by `>> l`.

## Two things worth reading right now

**The clock tree.** `targets/itsboard/hal/hal_clock.c` sets `RCC->CR` bits `HSEBYP` and `HSEON`, then spins until `HSERDY` is set - the 8 MHz reference is a square wave from the ST-Link's MCO, not a crystal, hence *bypass* (`docs/HARDWARE.md`). The main PLL is configured for 8 / 8 × 360 / 2 = 180 MHz and `RCC->CFGR` is switched to the PLL. That the switch happened is confirmed by the `SWS` field on **bits 3:2** of `RCC_CFGR`, in a session under `XPeripherals` → `RCC` → `CFGR`.

**An output port.** `cads_hal_adapter_outputs()` (`targets/itsboard/hal/hal_io.c`, line 62) writes OUT0..7 through `GPIOD->BSRR` in one atomic set-and-clear word, and OUT8..15 through `GPIOE->BSRR` (`targets/itsboard/board.h` fixes the split). `BSRR` is write-only; the *result* is in `GPIOD->ODR`, whose low byte is the state of PD0..PD7. Reading `ODR` therefore confirms what the last output write actually did - it is also how this project found its SPI-mutex boot hang, by reading `BASEPRI` live (`docs/ROADMAP.md`, 2026-08-26).

## The check button sends the command, not you

The explorer's `o <hex>` command calls `cads_hal_adapter_outputs()` and confirms it with a line `# outputs = ....`. You do not type `o 0055` yourself: the check button sends it, you only read the answer.

Two things have to be true. First, the board must not be halted: end the session with **Stop** on the debug toolbar at the top, after which the status bar reads `Board: verbunden · läuft` again.

![After Stop the board keeps running, and the status bar reads Board: verbunden · läuft again](debug-after-stop.png)

Second, a freshly flashed board starts in the touchscreen app tree and mishears single letters. So open a terminal first (**☰ → `Terminal` → `New Terminal`**; if the area is folded away, `Ctrl`/`Cmd`+`J` opens it) and run once:

```bash
python3 scripts/board_key.py quit
```

The working directory is the project root. The board is then at the console prompt, and the check button gets through.

## Three operating mistakes almost everyone makes here once

- **The task ran, but you are looking for its output in the wrong window.** It is not in the step text and not in the editor, but in the terminal area at the bottom, in the terminal named after the task - `Ctrl`/`Cmd`+`J` opens the area, and the list on the right selects the terminal.
- **You closed the terminal and ended the running process with it.** The cross on a terminal kills the process inside it - use `Ctrl`/`Cmd`+`J` to fold the area away instead, which leaves it running.
- **The palette does not react to the shortcut.** The browser swallowed `Ctrl`/`Cmd`+`Shift`+`P` - press `F1` instead, or go through **☰ → `Terminal`**.

## Your task

First predict what the low byte of `GPIOD->ODR` will hold after `o 0055`, and write that prediction into the first task. Bring the board to the console prompt with the terminal command above and press **Check**: the button sends `o 0055`, you read the answer line. Then start a session with **`F5`** and compare under `XPeripherals` → `GPIOD` → `ODR`. Finally build the mask for `SWS`. The next step reads a crash with the same registers.
