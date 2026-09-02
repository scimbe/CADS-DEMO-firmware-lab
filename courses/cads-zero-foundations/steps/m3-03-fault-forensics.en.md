---
id: m3-03-fault-forensics
title: Reading a fault, and the forensic ring
bloom: analyze
objectives: [cz.debug.forensics]
requires: [m3-02-registers-svd]
estimatedMinutes: 20
links:
  - { step: m3-04-stack-guard }
  - { doc: "docs/how-to/debug.md" }
  - { file: "targets/itsboard/startup/fault_handlers.c" }
  - { file: "modules/diag/include/cads/diag/forensic.h" }
  - { file: "apps/bringup/explorer.c", line: 568 }
sources: [docs/how-to/debug.md, targets/itsboard/startup/fault_handlers.c, modules/diag/include/cads/diag/forensic.h, modules/diag/src/cads_forensic.c, apps/bringup/explorer.c]
tasks:
  - id: run-e
    title: Dump the forensic ring with the E command
    check: { type: manual }
  - id: decode-cfsr
    title: Decode a real fault signature
    check: { type: question, prompt: { en: "A fault dump reads UsageFault, CFSR = 0x00010000, HFSR = 0x00000000, and no MMFAR/BFAR lines. Decode it: which sub-register and bit is set, what instruction class caused it, what does HFSR = 0 prove about cads_fault_init(), and why are MMFAR/BFAR absent? Then: what does the explorer's E command print, and why does its ring survive a warm reset?", de: "Ein Fault-Dump zeigt UsageFault, CFSR = 0x00010000, HFSR = 0x00000000 und keine MMFAR/BFAR-Zeilen. Dekodiere ihn: welches Teilregister und Bit ist gesetzt, welche Instruktionsklasse verursachte ihn, was beweist HFSR = 0 über cads_fault_init(), und warum fehlen MMFAR/BFAR? Und: was druckt der Explorer-Befehl E, und warum überlebt sein Ring einen Warm-Reset?" }, rubric: "Bit 16 of CFSR is UFSR.UNDEFINSTR (an undefined instruction, e.g. udf #0 from z FAULT); HFSR = 0 means the fault was handled directly as a UsageFault and not escalated to HardFault (FORCED clear), proving the SHCSR enable in cads_fault_init() is live; MMFAR/BFAR are only printed when their CFSR validity bits are set, and an undefined-instruction fault latches no address. E prints this boot's reset cause (cads_hal_reset_cause) and every stored record newest first (seq, uptime, reason, PC/LR/xPSR, R0-R3/R12, CFSR/HFSR, MMFAR/BFAR when valid); the ring lives in CCM via CADS_CCM_SECTION, which the reset handler does not zero, so records written just before a halt or watchdog reset are still readable afterwards.", bloom: analyze }
socratic:
  - { trigger: "task:run-e:stuck", question: { en: "E printed nothing at all. Is the board at the console prompt, or still inside the app-tree session that ignores plain typed bytes?", de: "E druckte gar nichts. Ist das Board am Konsolen-Prompt oder noch in der App-Baum-Sitzung, die einfache getippte Bytes ignoriert?" }, hints: [ { en: "Send board_key.py quit first, then E again.", de: "Sende zuerst board_key.py quit, dann erneut E." }, { en: "An empty ring ('0 record(s)') after a real power cycle is correct: CCM survives a reset but not power loss.", de: "Ein leerer Ring ('0 record(s)') nach einem echten Power-Cycle ist korrekt: CCM überlebt einen Reset, aber keinen Stromverlust." }, { en: "Do not run z FAULT to fill the ring - it halts for good and needs a reflash; read the reference signature in docs/how-to/debug.md instead.", de: "Führe nicht z FAULT aus, um den Ring zu füllen - es hält für immer an und braucht einen Reflash; lies stattdessen die Referenzsignatur in docs/how-to/debug.md." } ] }
---
## Learning goal

Turn a fault dump and the board's crash ring into a diagnosis: which fault, which instruction, and where in the source - using the evidence the firmware keeps for you.

## The firmware halts and prints; it does not reset

A memory, bus or usage fault does not silently reboot this firmware. The four handlers in `targets/itsboard/startup/fault_handlers.c` are strong definitions overriding the generated vector table's weak `Default_Handler` aliases. Each is a *naked* trampoline that reads `EXC_RETURN` out of `LR` to pick MSP or PSP **before** any C prologue can disturb it, then dumps the stacked frame:

```
*** CaDS FAULT: UsageFault ***
R0 .. R3, R12, LR, PC, PSR
CFSR = 0x00010000
HFSR = 0x00000000
```

`PC` is the faulting instruction. The dump ends in `bkpt #0` and a loop, on the halt-don't-reset principle: a reset would throw away the only copy of the evidence. With a debugger attached the `bkpt` traps to it; untethered, it escalates to a HardFault and the board sits with the red LED on - the intended safe failure mode.

`cads_fault_init()` (called from `hal_init.c` right after the console exists) enables MemManage, BusFault and UsageFault in `SCB->SHCSR`. Without it every fault is still caught, but only as an undifferentiated HardFault.

## Decoding CFSR

`CFSR` packs three sub-registers (PM0214 §4.4.7-4.4.9):

| Bits | Sub-register | Covers |
|---|---|---|
| 7:0 | MMFSR | memory-management faults |
| 15:8 | BFSR | bus faults (bad address, imprecise write) |
| 31:16 | UFSR | usage faults (undefined instruction, unaligned, divide by zero) |

`MMFAR` and `BFAR` - the faulting *address* - are printed only when their validity bits in `CFSR` say so; their absence is information too.

The reference signature comes from the explorer's one destructive command, `z FAULT`, which executes `udf #0`: `UsageFault`, `CFSR = 0x00010000` (bit 16, `UNDEFINSTR`), `HFSR = 0x00000000` (handled directly, not escalated - the on-hardware proof that the `SHCSR` enable is live). **Do not run it now**; it halts for good and needs a reflash.

## From PC to a line

```bash
arm-none-eabi-addr2line -e build/itsboard/cads-zero.elf 0x<PC>
```

or, inside the debug session, `info line *0x<PC>`. `cads-zero.map` resolves an address to its section and symbol - a `.ramfunc` bus fault was found exactly this way.

## The forensic ring: evidence that survives a reset

`modules/diag` keeps a ring of the last **6** crashes (`CADS_FORENSIC_RING_DEPTH`). Every fault handler and `cads_hal_panic()` calls `cads_forensic_record()` in the instant before halting: reason, uptime, the frame, `CFSR`/`HFSR`, `MMFAR`/`BFAR` when valid, `MSP` and `PSP`. The ring is placed in **CCM** via `CADS_CCM_SECTION` - the reset handler zeroes `.bss` but not `.ccm`, so a record written just before a watchdog reset is still there after the reboot. Real power loss clears it.

The explorer's `E` command prints this boot's reset cause (`cads_hal_reset_cause()`: power-on, pin, software, IWDG watchdog, …) and then every record newest first. Check it **before** assuming a boot was clean. One caveat from the project's record: after `cads_forensic_record_t` gains a field, old CCM bytes briefly read as one garbled record - stale layout, not a new bug.

## Your task

Return to the console prompt and run `E`; read the reset cause and however many records the ring holds. Then decode the reference signature in the question. The next step uses the ring to catch a stack overflow.
