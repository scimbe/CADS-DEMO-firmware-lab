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
  - { trigger: "task:odr-after-write:failed", question: { en: "Did the board answer at all, or is it still inside the touchscreen app tree that ignores plain typed bytes?", de: "Hat das Board überhaupt geantwortet, oder steckt es noch im Touchscreen-App-Baum, der einfach getippte Bytes ignoriert?" }, hints: [ { en: "A console command that produces no echo at all usually means the prompt is not the thing listening right now.", de: "Ein Konsolenbefehl ganz ohne Echo heißt meistens, dass gerade nicht der Prompt zuhört." }, { en: "Send scripts/board_key.py quit from the terminal first, then let the check run again.", de: "Sende zuerst scripts/board_key.py quit aus dem Terminal, dann lass den Check erneut laufen." }, { en: "The board is also deaf while a debug session has it halted - resume or end the session before writing to the console.", de: "Das Board ist auch taub, solange eine Debug-Sitzung es angehalten hat - setze fort oder beende die Sitzung, bevor du auf die Konsole schreibst." } ] }
  - { trigger: "question:sws-mask:weak", question: { en: "Which single bit is bit 2, written as a hex number, and which is bit 3?", de: "Welches einzelne Bit ist Bit 2, als Hexzahl geschrieben, und welches ist Bit 3?" }, hints: [ { en: "Are you counting bit positions from the right-hand end of the word, starting at zero?", de: "Zählst du die Bitpositionen vom rechten Ende des Wortes, beginnend bei null?" }, { en: "Write 1 << 2 and 1 << 3 as binary, put them side by side, and combine them with a bitwise or.", de: "Schreib 1 << 2 und 1 << 3 binär hin, leg sie nebeneinander und verknüpfe sie mit einem bitweisen Oder." }, { en: "Two adjacent bits sitting anywhere but at the far right: what you cut out is not yet the small number the datasheet talks about.", de: "Zwei benachbarte Bits, die nicht ganz rechts sitzen: was du herausschneidest, ist noch nicht die kleine Zahl aus dem Datenblatt." } ] }
---
## Learning goal

Read the STM32's own registers on the live board through the debugger, so you can answer hardware questions - is the clock right, what does an output pin hold - by looking rather than guessing.

## Core registers

With the target halted, the **Variables** panel has a **Registers** section: `r0`-`r12`, `sp`, `lr`, `pc`, `xPSR`. These are the CPU's state at the halt. `pc` is where execution will resume; `lr` is the return address of the current function; `sp` is the active stack pointer (MSP before the scheduler starts, PSP inside a task). You will need all three when you read a fault dump in the next step.

## Peripheral registers through the SVD

Raw core registers rarely answer the embedded question you have. What you want is "is `RCC->CR` showing HSE ready?" or "what is in `GPIOD->ODR`?". `cortex-debug` answers those with an **SVD file**: `targets/itsboard/STM32F429.svd` is STMicroelectronics' own description of every peripheral, register, field and reset value, vendored into the repository (Apache-2.0) and wired into the launch configuration. During a session an **XPeripherals** panel appears in the Run and Debug sidebar with every peripheral by name and base address; expand one for its registers and their live values. Outside a session it reads "No active debug session", which is correct.

## Cutting a field out of a register

A register is rarely one number; it is a row of **fields**, each a few bits wide. The SVD breaks them out for you, but the moment you compute one yourself - in GDB, in a script, in your head - you need the craft, and it is two steps:

1. **Mask.** A field on bits *h:l* is isolated with a mask that has exactly those bits set. Bit *n* is `1 << n`; several bits are joined with a bitwise or. Bit positions always count from the right-hand end of the word, starting at zero.
2. **Shift.** The masked word is not yet the field value - the field still sits at its position. Only `>> l` moves it all the way right and turns the masked word into the small number the datasheet talks about.

You need both steps for `SWS` in a moment.

## Two things worth reading right now

**The clock tree.** `targets/itsboard/hal/hal_clock.c` sets `RCC->CR` bits `HSEBYP` and `HSEON`, then spins until `HSERDY` is set - the 8 MHz reference is a square wave from the ST-Link's MCO, not a crystal, which is why *bypass* is on (`docs/HARDWARE.md`). The main PLL is then configured for 8 / 8 × 360 / 2 = 180 MHz, and `RCC->CFGR` is switched to the PLL. The confirmation that the switch happened is the `SWS` field on **bits 3:2** of `RCC_CFGR`: with the PLL running as the system clock it reads binary `10` - the same register check `docs/tutorials/first-gate.md` names for a failing time-base assertion.

**An output port.** `cads_hal_adapter_outputs()` (`targets/itsboard/hal/hal_io.c`, line 62) writes OUT0..7 through `GPIOD->BSRR` in one atomic set-and-clear word, and OUT8..15 through `GPIOE->BSRR` (`targets/itsboard/board.h` fixes which port carries which half). `BSRR` is write-only; the *result* is visible in `GPIOD->ODR`, whose low byte is the current state of PD0..PD7. Reading `ODR` in the debugger is therefore a way to confirm what the last output write actually did.

That is exactly what you are about to do: the explorer's `o <hex>` command calls `cads_hal_adapter_outputs()` with the value you pass and confirms it with a line `# outputs = ....`. Afterwards `ODR` holds something you could have worked out beforehand - so work it out first.

## Reading, not assuming

The project's own record has more than one case where a register read settled an argument that reasoning could not: the SPI-mutex boot hang was found by reading `BASEPRI` live, and the "stuck at Reset_Handler" signature is a specific set of register values (`docs/ROADMAP.md`, 2026-08-26 and 2026-08-29 entries). The habit to build is: when the firmware's behaviour and your model of it disagree, read the register.

## Your task

Bring the board to the console prompt (with `scripts/board_key.py quit` from the terminal if needed). Predict what the low byte of `GPIOD->ODR` will hold after `o 0055`, let the check send the command, and then verify your prediction in a debug session under XPeripherals → `GPIOD` → `ODR`. Then build the mask for the `SWS` field. The next step uses the same registers to read a crash.
