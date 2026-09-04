---
id: m3-03-fault-forensics
title: Reading a fault, and the forensic ring
bloom: analyze
objectives: [cz.debug.forensics]
requires: [m3-02-registers-svd]
estimatedMinutes: 20
scaffold: faded
links:
  - { step: m3-04-stack-guard }
  - { doc: "docs/how-to/debug.md" }
  - { file: "targets/itsboard/startup/fault_handlers.c" }
  - { file: "lib/CMSIS_6/CMSIS/Core/Include/core_cm4.h", line: 626 }
  - { file: "modules/diag/include/cads/diag/forensic.h" }
  - { file: "apps/bringup/explorer.c", line: 568 }
sources: [docs/how-to/debug.md, docs/ROADMAP.md, targets/itsboard/startup/fault_handlers.c, lib/CMSIS_6/CMSIS/Core/Include/core_cm4.h, modules/diag/include/cads/diag/forensic.h, modules/diag/src/cads_forensic.c, apps/bringup/explorer.c]
tasks:
  - id: run-e
    title: Dump the forensic ring with the E command
    check: { type: serialExpect, send: "E\n", pattern: "forensic ring", timeoutMs: 15000 }
  - id: decode-busfault
    title: Decode a bus-fault signature
    check: { type: question, prompt: { en: "A dump reads BusFault, CFSR = 0x00008200, with a BFAR line under it. Which two bits are set?", de: "Ein Dump zeigt BusFault, CFSR = 0x00008200 und darunter eine BFAR-Zeile. Welche zwei Bits sind gesetzt?" }, rubric: "Bit 9 and bit 15, both inside the range 15:8, so BFSR. Bit 9 is called PRECISERR, bit 15 is called BFARVALID; the second explains why the address line was printed at all. Evidenced by SCB_CFSR_PRECISERR_Pos and SCB_CFSR_BFARVALID_Pos. Assigning 0x82 to the low byte is off by eight places; naming only one set bit means 0x8200 was not taken apart completely.", bloom: analyze }
  - id: decode-usagefault
    title: Decode a usage-fault signature
    check: { type: question, prompt: { en: "A second dump reads UsageFault, CFSR = 0x00020000, and no BFAR line. Which bit reports that?", de: "Ein zweiter Dump zeigt UsageFault, CFSR = 0x00020000 und keine BFAR-Zeile. Welches Bit meldet das?" }, rubric: "Bit 17, inside the range 31:16, so in the UFSR sub-register. It is INVSTATE (SCB_CFSR_INVSTATE_Pos in lib/CMSIS_6/CMSIS/Core/Include/core_cm4.h): the core was asked to enter a state it cannot take - on this part almost always a branch target with no Thumb bit set, such as a jump to 0x0. The absent BFAR line is consistent: a usage fault latches no address, so its validity bit stays clear. Counting bit 17 as the second bit from the right means the 31:16 base was not subtracted.", bloom: analyze }
misconceptions:
  - { pattern: "forensic ring: 0 record", question: { en: "The ring is empty. Does that mean nothing ever crashed, or that something erased it?", de: "Der Ring ist leer. Heißt das, dass nie etwas abgestürzt ist, oder dass etwas ihn gelöscht hat?" }, hints: [ { en: "Which of the two - a reset or a real power cycle - did this board just go through?", de: "Welches von beiden - ein Reset oder ein echter Power-Cycle - hat dieses Board gerade hinter sich?" }, { en: "Read the section on where the ring is placed: it names the memory region and what the reset handler does to it.", de: "Lies den Abschnitt dazu, wo der Ring liegt: er nennt den Speicherbereich und was der Reset-Handler mit ihm macht." }, { en: "An empty ring after unplugging the board is the correct, expected reading - it is not evidence that the ring is broken.", de: "Ein leerer Ring nach dem Abziehen des Boards ist die korrekte, erwartete Anzeige - er ist kein Beleg dafür, dass der Ring kaputt ist." } ] }
socratic:
  - { trigger: "task:run-e:failed", question: { en: "E printed nothing at all. Is the board at the console prompt, or still inside the app-tree session that ignores plain typed bytes?", de: "E druckte gar nichts. Ist das Board am Konsolen-Prompt oder noch in der App-Baum-Sitzung, die einfache getippte Bytes ignoriert?" }, hints: [ { en: "No echo at all usually means the prompt is not the thing listening right now.", de: "Gar kein Echo heißt meistens, dass gerade nicht der Prompt zuhört." }, { en: "Open a terminal with the menu icon at the top left, Terminal, New Terminal, run python3 scripts/board_key.py quit there, then let the check run again.", de: "Öffne mit dem Menü-Symbol oben links, Terminal, New Terminal ein Terminal, führe dort python3 scripts/board_key.py quit aus und lass den Check dann erneut laufen." }, { en: "Do not run z FAULT to force output - it halts the firmware for good and needs a reflash.", de: "Führe nicht z FAULT aus, um eine Ausgabe zu erzwingen - es hält die Firmware für immer an und braucht einen Reflash." } ] }
  - { trigger: "question:decode-busfault:weak", question: { en: "Write 0x00008200 out as 32 binary digits. Which two of them are ones, and which numbered positions are those?", de: "Schreib 0x00008200 als 32 Binärziffern aus. Welche zwei davon sind Einsen, und welche Positionsnummern sind das?" }, hints: [ { en: "Each hex digit is exactly four bits - are you converting the whole word, or only the two digits that caught your eye?", de: "Jede Hexziffer ist genau vier Bits - wandelst du das ganze Wort um oder nur die zwei Ziffern, die dir aufgefallen sind?" }, { en: "Compare each position against the table of the three sub-registers above, then open lib/CMSIS_6/CMSIS/Core/Include/core_cm4.h with Ctrl/Cmd+P and search it for SCB_CFSR_ with Ctrl/Cmd+F.", de: "Vergleiche jede Position mit der Tabelle der drei Teilregister weiter oben, öffne dann lib/CMSIS_6/CMSIS/Core/Include/core_cm4.h mit Strg/Cmd+P und such darin mit Strg/Cmd+F nach SCB_CFSR_." }, { en: "One of the two bits is not a fault cause at all - it is the flag that decides whether the address line below is meaningful.", de: "Eines der beiden Bits ist gar keine Fehlerursache - es ist das Kennzeichen, das entscheidet, ob die Adresszeile darunter etwas bedeutet." } ] }
  - { trigger: "question:decode-usagefault:weak", question: { en: "Which sub-register does bit 17 belong to, and how far into that sub-register is it?", de: "Zu welchem Teilregister gehört Bit 17, und wie weit liegt es in diesem Teilregister drin?" }, hints: [ { en: "Did you subtract the sub-register's own starting position before counting inside it?", de: "Hast du die Startposition des Teilregisters abgezogen, bevor du darin weitergezählt hast?" }, { en: "In core_cm4.h the usage-fault bits are written as SCB_CFSR_USGFAULTSR_Pos plus an offset - read the offsets, not the absolute numbers.", de: "In core_cm4.h sind die Usage-Fault-Bits als SCB_CFSR_USGFAULTSR_Pos plus einen Versatz geschrieben - lies die Versätze, nicht die absoluten Zahlen." }, { en: "Offset 0 at that spot is the undefined-instruction case; you want the next one along, offset 1.", de: "Versatz 0 an dieser Stelle ist der Fall der undefinierten Instruktion; du suchst den nächsten, also Versatz 1." } ] }
---

## Learning goal

Turn a fault dump and the board's crash ring into a diagnosis: which fault, which instruction, and where in the source.

## First: bring the board to the console prompt

The user interface is in English while this course text is in German. No menu bar is visible: the menus hide behind the three-line icon (**☰**) at the very top left, which opens `File`, `Edit`, `Selection`, `View`, `Go`, `Run`, `Terminal` and `Help`.

A freshly flashed board starts in the touchscreen app tree and mishears single letters. So open a terminal (**☰ → `Terminal` → `New Terminal`**; if the area at the bottom is folded away, `Ctrl`/`Cmd`+`J` opens it) and run once:

```bash
python3 scripts/board_key.py quit
```

The working directory is the project root; it takes under a second. To read along, open the board console: **`F1`**, then type `CaDS Board: Konsole öffnen`, Enter.

You do not type `E` there yourself: the check button sends it, you only read the answer. A board halted by a debug session will not listen either - press Continue or Stop on the debug toolbar at the top.

<!-- SHOT: m3-forensic-ring-output | Die Board-Konsole nach dem Befehl E: Reset-Ursache, die Zeile # forensic ring: N record(s) und mindestens ein Datensatz mit PC, LR, CFSR | HARDWARE -->

## The firmware halts and prints; it does not reset

A memory, bus or usage fault does not silently reboot this firmware. The four handlers in `targets/itsboard/startup/fault_handlers.c` override the vector table's weak `Default_Handler` aliases. Each is a *naked* trampoline: it reads `EXC_RETURN` out of `LR` to pick MSP or PSP **before** any C prologue can disturb it, then dumps the stacked frame:

```
*** CaDS FAULT: <the fault's name> ***
R0 .. R3, R12, LR, PC, PSR
CFSR = 0x........
HFSR = 0x........
```

`PC` is the faulting instruction. The dump ends in `bkpt #0` and a loop: halt, don't reset, because a reset throws away the only copy of the evidence. Since `cads_fault_init()` enables MemManage, BusFault and UsageFault in `SCB->SHCSR`, the banner names the fault; otherwise every one arrives as an undifferentiated HardFault.

<!-- SHOT: m3-fault-dump-console | Ein vollstaendiger Fault-Dump in der Board-Konsole, von der Sternchen-Kopfzeile bis zur HFSR-Zeile | HARDWARE -->

## How CFSR is laid out

`CFSR` is not one register but three sub-registers laid end to end (PM0214 §4.4.7-4.4.9), which the handler prints as **one** 32-bit word:

| Bits | Sub-register | Covers |
|---|---|---|
| 7:0 | MMFSR | memory-management faults |
| 15:8 | BFSR | bus faults |
| 31:16 | UFSR | usage faults |

A set bit falls into exactly one of the three ranges. **Which** bit it is you look up where the names live: open `lib/CMSIS_6/CMSIS/Core/Include/core_cm4.h` with `Ctrl`/`Cmd`+`P`, press `Ctrl`/`Cmd`+`F` and search for `SCB_CFSR_`. Every bit position is filed there as `SCB_CFSR_<NAME>_Pos`, written as an offset from `SCB_CFSR_MEMFAULTSR_Pos` (0), `SCB_CFSR_BUSFAULTSR_Pos` (8) or `SCB_CFSR_USGFAULTSR_Pos` (16).

The procedure is always the same:

1. Write the word out in bits and note the positions of the ones (counting from the right, from zero).
2. Assign each position to the range 7:0, 15:8 or 31:16 - that fixes the sub-register.
3. The position minus the start of that range is the offset under which `core_cm4.h` files the name.

Two bits are special: `MMFAR` and `BFAR` - the faulting *address* - are printed only when their validity bits in `CFSR` are set. Their absence is therefore information too.

## Where this course's signatures come from

Both signatures in your tasks are real. `docs/ROADMAP.md` logs three signatures of the same firmware in sequence under 2026-08-26: a `configASSERT` panic, a UsageFault, and a precise BusFault with `BFAR` at `0x5808615E`, an address that is neither flash nor RAM nor CCM nor peripheral. That the signatures *varied* reads more like memory corruption than a logic bug.

A third source would be `z FAULT`, the explorer's one destructive command. **Do not run it now** - it halts for good and needs a reflash.

## From PC to a line

Open a terminal (**☰ → `Terminal` → `New Terminal`**) and paste in the address from the `PC` line:

```bash
arm-none-eabi-addr2line -e build/itsboard/cads-zero.elf 0x<PC>
```

The answer comes back at once, as one line with a file and a line number. Inside a running session, `info line *0x<PC>` in the `DEBUG CONSOLE` tab does the same. On a *precise* bus fault the stacked `PC` points at the guilty instruction; on an imprecise one it does not, because the write had long since left the CPU.

## The forensic ring: evidence that survives a reset

`modules/diag` keeps a ring of the last **6** crashes (`CADS_FORENSIC_RING_DEPTH`). Every fault handler and `cads_hal_panic()` calls `cads_forensic_record()` in the instant before halting: reason, uptime, frame, `CFSR`/`HFSR`, the addresses when valid, `MSP` and `PSP`. The ring lives in **CCM** via `CADS_CCM_SECTION` - the reset handler zeroes `.bss` but not `.ccm`, so a record survives a watchdog reset. Real power loss clears it.

The explorer's `E` command prints this boot's reset cause first (`cads_hal_reset_cause()`), then a line `# forensic ring: N record(s)`, then every record newest first. Check it **before** assuming a boot was clean.

## Three operating mistakes almost everyone makes here once

- **The task ran, but you are looking for its output in the wrong window.** It is not in the step text and not in the editor, but in the terminal area at the bottom, in the terminal named after the task - `Ctrl`/`Cmd`+`J` opens the area, and the list on the right selects the terminal.
- **You closed the terminal and ended the running process with it.** The cross on a terminal kills the process inside it - use `Ctrl`/`Cmd`+`J` to fold the area away instead, which leaves it running.
- **The palette does not react to the shortcut.** The browser swallowed `Ctrl`/`Cmd`+`Shift`+`P` - press `F1` instead, or go through **☰ → `Terminal`**.

## Your task

Bring the board to the console prompt with the terminal command above and press **Check** on the first task: the button sends `E`, and you read the reset cause and the records in the board console. Then decode the two signatures of the second and third tasks, with the range table above and `core_cm4.h` as your legend. The next step uses the ring to catch a stack overflow.
