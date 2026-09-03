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
  - { trigger: "task:run-e:failed", question: { en: "E printed nothing at all. Is the board at the console prompt, or still inside the app-tree session that ignores plain typed bytes?", de: "E druckte gar nichts. Ist das Board am Konsolen-Prompt oder noch in der App-Baum-Sitzung, die einfache getippte Bytes ignoriert?" }, hints: [ { en: "No echo at all usually means the prompt is not the thing listening right now.", de: "Gar kein Echo heißt meistens, dass gerade nicht der Prompt zuhört." }, { en: "Send scripts/board_key.py quit from the terminal, then let the check run again.", de: "Sende scripts/board_key.py quit aus dem Terminal, dann lass den Check erneut laufen." }, { en: "Do not run z FAULT to force output - it halts the firmware for good and needs a reflash.", de: "Führe nicht z FAULT aus, um eine Ausgabe zu erzwingen - es hält die Firmware für immer an und braucht einen Reflash." } ] }
  - { trigger: "question:decode-busfault:weak", question: { en: "Write 0x00008200 out as 32 binary digits. Which two of them are ones, and which numbered positions are those?", de: "Schreib 0x00008200 als 32 Binärziffern aus. Welche zwei davon sind Einsen, und welche Positionsnummern sind das?" }, hints: [ { en: "Each hex digit is exactly four bits - are you converting the whole word, or only the two digits that caught your eye?", de: "Jede Hexziffer ist genau vier Bits - wandelst du das ganze Wort um oder nur die zwei Ziffern, die dir aufgefallen sind?" }, { en: "Compare each position against the table of the three sub-registers above, then look the names up in lib/CMSIS_6/CMSIS/Core/Include/core_cm4.h by searching for SCB_CFSR_.", de: "Vergleiche jede Position mit der Tabelle der drei Teilregister weiter oben und schlag die Namen dann in lib/CMSIS_6/CMSIS/Core/Include/core_cm4.h nach, indem du nach SCB_CFSR_ suchst." }, { en: "One of the two bits is not a fault cause at all - it is the flag that decides whether the address line below is meaningful.", de: "Eines der beiden Bits ist gar keine Fehlerursache - es ist das Kennzeichen, das entscheidet, ob die Adresszeile darunter etwas bedeutet." } ] }
  - { trigger: "question:decode-usagefault:weak", question: { en: "Which sub-register does bit 17 belong to, and how far into that sub-register is it?", de: "Zu welchem Teilregister gehört Bit 17, und wie weit liegt es in diesem Teilregister drin?" }, hints: [ { en: "Did you subtract the sub-register's own starting position before counting inside it?", de: "Hast du die Startposition des Teilregisters abgezogen, bevor du darin weitergezählt hast?" }, { en: "In core_cm4.h the usage-fault bits are written as SCB_CFSR_USGFAULTSR_Pos plus an offset - read the offsets, not the absolute numbers.", de: "In core_cm4.h sind die Usage-Fault-Bits als SCB_CFSR_USGFAULTSR_Pos plus einen Versatz geschrieben - lies die Versätze, nicht die absoluten Zahlen." }, { en: "Offset 0 at that spot is the undefined-instruction case; you want the next one along, offset 1.", de: "Versatz 0 an dieser Stelle ist der Fall der undefinierten Instruktion; du suchst den nächsten, also Versatz 1." } ] }
---
## Learning goal

Turn a fault dump and the board's crash ring into a diagnosis: which fault, which instruction, and where in the source - using the evidence the firmware keeps for you.

## The firmware halts and prints; it does not reset

A memory, bus or usage fault does not silently reboot this firmware. The four handlers in `targets/itsboard/startup/fault_handlers.c` are strong definitions overriding the generated vector table's weak `Default_Handler` aliases. Each is a *naked* trampoline that reads `EXC_RETURN` out of `LR` to pick MSP or PSP **before** any C prologue can disturb it, then dumps the stacked frame:

```
*** CaDS FAULT: <the fault's name> ***
R0 .. R3, R12, LR, PC, PSR
CFSR = 0x........
HFSR = 0x........
```

`PC` is the faulting instruction. The dump ends in `bkpt #0` and a loop, on the halt-don't-reset principle: a reset would throw away the only copy of the evidence. With a debugger attached the `bkpt` traps to it; untethered, it escalates to a HardFault and the board sits with the red LED on - the intended safe failure mode.

`cads_fault_init()` (called from `hal_init.c` right after the console exists) enables MemManage, BusFault and UsageFault in `SCB->SHCSR`. Without it every fault is still caught, but only as an undifferentiated HardFault. That is why the dump's banner already names the fault and you do not have to infer it from `HFSR`.

## How CFSR is laid out

`CFSR` is not one register but three sub-registers laid end to end (PM0214 §4.4.7-4.4.9). The handler prints them as **one** 32-bit word, because shifting them apart in four lines of firmware costs more than doing it in your head:

| Bits | Sub-register | Covers |
|---|---|---|
| 7:0 | MMFSR | memory-management faults |
| 15:8 | BFSR | bus faults |
| 31:16 | UFSR | usage faults |

That is all the table says - and all it needs to say. A set bit falls into exactly one of those three ranges, and **which** bit it is you look up where the names live: `lib/CMSIS_6/CMSIS/Core/Include/core_cm4.h` defines every single bit position as `SCB_CFSR_<NAME>_Pos`, each written as an offset from `SCB_CFSR_MEMFAULTSR_Pos` (0), `SCB_CFSR_BUSFAULTSR_Pos` (8) or `SCB_CFSR_USGFAULTSR_Pos` (16). Search that file for `SCB_CFSR_` and the whole legend is in front of you.

The procedure is always the same:

1. Write the word out in bits and note the positions of the ones (counting from the right, from zero).
2. Assign each position to the range 7:0, 15:8 or 31:16 - that fixes the sub-register.
3. The position minus the start of that range is the offset under which `core_cm4.h` files the name.

Two bits are special: `MMFAR` and `BFAR` - the faulting *address* - are printed only when their validity bits in `CFSR` are set. Their absence is therefore information too, and their presence tells you that one of those validity bits is in the word.

## Where this course's signatures come from

The two signatures in your tasks are not made up. Both come from the crash investigation `docs/ROADMAP.md` logs under 2026-08-26: three different fault signatures were captured from the same firmware in sequence - a clean `configASSERT` panic, a UsageFault, and, freshest, a **precise BusFault with `BFAR` at `0x5808615E`**, an address that is neither flash nor RAM nor CCM nor any peripheral. The UsageFault case with `PC = 0x0` is recorded in the source, in the comment above `cads_spi_lock_active()` in `targets/itsboard/hal/hal_spi.c`.

The conclusion the log draws from that is itself instructive: signatures that *vary* across several crashes read more like memory corruption landing on a different victim after every relink than like one deterministic logic bug.

There is a third source of a real fault: the explorer's one destructive command, `z FAULT`, executes `udf #0`. **Do not run it now**; it halts for good and needs a reflash. Its signature is documented in `docs/how-to/debug.md` if you want to read it up.

## From PC to a line

```bash
arm-none-eabi-addr2line -e build/itsboard/cads-zero.elf 0x<PC>
```

or, inside the debug session, `info line *0x<PC>`. `cads-zero.map` resolves an address to its section and symbol - a `.ramfunc` bus fault was found exactly this way. On a *precise* bus fault the stacked `PC` points straight at the guilty instruction; on an imprecise one it does not, because the write had long since left the CPU.

## The forensic ring: evidence that survives a reset

`modules/diag` keeps a ring of the last **6** crashes (`CADS_FORENSIC_RING_DEPTH`). Every fault handler and `cads_hal_panic()` calls `cads_forensic_record()` in the instant before halting: reason, uptime, the frame, `CFSR`/`HFSR`, `MMFAR`/`BFAR` when valid, `MSP` and `PSP`. The ring is placed in **CCM** via `CADS_CCM_SECTION` - the reset handler zeroes `.bss` but not `.ccm`, so a record written just before a watchdog reset is still there after the reboot. Real power loss clears it.

The explorer's `E` command prints this boot's reset cause first (`cads_hal_reset_cause()`: power-on, pin, software, IWDG watchdog, …), then a line `# forensic ring: N record(s)`, and then every record newest first: sequence number, uptime, reason, `PC`/`LR`/`xPSR`, `R0`-`R3`/`R12`, `CFSR`/`HFSR` and the address lines when valid. Check it **before** assuming a boot was clean. One caveat from the project's record: after `cads_forensic_record_t` gains a field, old CCM bytes briefly read as one garbled record - stale layout, not a new bug.

## Your task

Return to the console prompt (with `scripts/board_key.py quit` if needed) and let the check run `E`; read the reset cause and however many records the ring holds. Then decode the two signatures in the tasks - with the range table above and `core_cm4.h` as your legend. The next step uses the ring to catch a stack overflow.
