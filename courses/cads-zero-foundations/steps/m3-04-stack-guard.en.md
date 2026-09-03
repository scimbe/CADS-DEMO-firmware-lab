---
id: m3-04-stack-guard
title: Catching a stack overflow
bloom: analyze
objectives: [cz.debug.stack-guard]
requires: [m3-03-fault-forensics]
estimatedMinutes: 15
links:
  - { step: m3-05-spi-mutex }
  - { step: m3-03-fault-forensics }
  - { doc: "docs/ROADMAP.md" }
  - { file: "core/cads_hal.h" }
  - { file: "apps/bringup/tasks.c", line: 128 }
sources: [apps/bringup/tasks.c, docs/ROADMAP.md, docs/how-to/debug.md, core/cads_hal.h, scripts/check_ram_budget.py]
tasks:
  - id: build
    title: The firmware still builds with the guard in place
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: overflow-signature
    title: Recognise a stack overflow from the evidence
    check: { type: question, prompt: { en: "Name the register signature of a stack overflow this firmware has actually produced, and explain how the stack-guard sentinel and the forensic ring turned 'the board froze' into 'the input task's stack overflowed'.", de: "Nenne die Registersignatur eines Stack-Überlaufs, den diese Firmware tatsächlich erzeugt hat, und erkläre, wie der Stack-Guard-Wächter und der Forensik-Ring aus 'das Board fror ein' ein 'der Stack der Input-Task lief über' machten." }, rubric: "Signature: a garbage PC such as 0xF7FF0FF0 (an instruction-fetch violation, CFSR IACCVIOL) reached through a corrupted return address, and/or an SP clobbered to an absurd low value, with the CPU trapped in the fault handler itself. Mechanism: each task stack's lowest word is a 0xA5A5A5A5 canary (xTaskCreateStatic's fill; the MSP sentinel is painted in cads_stackguard_arm); vApplicationIdleHook polls the four sentinels (msp, ui, input, console) and calls cads_hal_panic() with the stack's name; the panic writes a forensic record with reason='input', which the E command showed 22 ms before the follow-on HardFault - so the ring named the exact stack, and the fix was to grow CADS_INPUT_STACK (256 to 1024 words) in CCM.", bloom: analyze }
socratic:
  - { trigger: "question:overflow-signature:weak", question: { en: "Where is the canary, who checks it, and what does the check do when it fails?", de: "Wo liegt der Canary, wer prüft ihn, und was tut die Prüfung, wenn sie fehlschlägt?" }, hints: [ { en: "Read cads_stackguards[] and vApplicationIdleHook() in apps/bringup/tasks.c.", de: "Lies cads_stackguards[] und vApplicationIdleHook() in apps/bringup/tasks.c." }, { en: "The lowest word of each stack is the sentinel; an overflow is the last thing to overwrite it.", de: "Das unterste Wort jedes Stacks ist der Wächter; ein Überlauf überschreibt es als Letztes." }, { en: "cads_hal_panic(name) records reason=<stack name> in the forensic ring before halting - that string is what E prints.", de: "cads_hal_panic(name) schreibt reason=<Stackname> in den Forensik-Ring, bevor es anhält - diese Zeichenkette druckt E." } ] }
---
## Learning goal

Recognise a stack overflow from its register signature, and understand how this firmware's stack-guard sentinel and forensic ring convert a silent freeze into a named, fixable cause.

## Why overflows are hard to see

There is no MPU guard page here and no kernel heap. A task stack that overflows simply writes past its bottom into whatever the linker placed below it. The symptom is rarely "stack overflow"; it is a corrupted return address, a jump into nowhere, and a fault taken *inside* code that had nothing to do with the cause. The project's record has two hardware-confirmed cases (`apps/bringup/tasks.c`, header comment; `docs/ROADMAP.md`, 2026-08-28 and 2026-08-30):

- **Console task, `net.dhcp = 1`.** The app-tree loop calls `cads_net_poll()` on the console task's stack; the DHCP client's state machine is visibly deeper than the static-IP path. Caught live with GDB: `vApplicationIdleHook()` faulted with a garbage `PC` of `0xF7FF0FF0` - an instruction-fetch violation, `CFSR` bit `IACCVIOL` - reached through a corrupted return address, and `SP` clobbered to an absurdly low value with the CPU trapped in the fault handler itself. Fix: `CADS_CONSOLE_STACK` 512 → 1024 words.
- **Input task, Marauder menu.** `cads_input_tick()` calls straight into the active app's input handler on the input task's own stack, so a 256-word stack carried arbitrary app call depth. Fix: `CADS_INPUT_STACK` 256 → 1024 words.

That signature - a `PC` that is not a flash address, a nonsensical `SP`, a fault in code that cannot have caused it - is the one to memorise.

## The sentinel

`apps/bringup/tasks.c` keeps a small table:

```c
static const cads_stackguard_t cads_stackguards[] = {
    {"msp", &__cads_stack_bottom},
    {"ui", cads_ui_stack},
    {"input", cads_input_stack},
    {"console", cads_console_stack},
};
```

Each entry points at the **lowest word** of a stack, which an overflow is the last thing to overwrite. Task stacks are filled with `0xA5` by `xTaskCreateStatic`; the MSP sentinel is painted by `cads_stackguard_arm()` before the scheduler starts. `vApplicationIdleHook()` - FreeRTOS's idle callback, so it runs whenever nothing else does - checks all four against `CADS_STACKGUARD_CANARY` and calls `cads_hal_panic(name)` on the first mismatch.

This is also why a live GDB attach can show `PC` parked inside `cads_stackguard_breached()` and mean nothing: that is the idle hook's normal polling, not a caught crash (`docs/ROADMAP.md`, 2026-09-01).

## The ring closes the loop

`cads_hal_panic()` records the reason in the forensic ring before halting. In the input-task case, `E` showed `reason=input` **22 ms before** a `HardFault` record with `HFSR = 0x80000000` (DEBUGEVT) - the panic's own `bkpt` escalating because no debugger was attached, itself a bug fixed the same day. The ring therefore named the exact stack; nothing had to be guessed.

## Where the fix lives, and what it costs

Task stacks live in **CCM** (`CADS_CCM_SECTION`), not in the SRAM heap that `scripts/check_ram_budget.py` guards to a 256 B margin. Quadrupling the input stack cost 3 KB of CCM (about 54.7 KB of 64 KB still free) and not one byte of the tight SRAM budget - which is why the fix could be generous. M4 revisits this trade-off when you size a stack yourself.

## Your task

Read the sentinel table and `vApplicationIdleHook()` in `apps/bringup/tasks.c`, confirm the firmware still builds, and then describe the overflow signature and how the sentinel plus ring identified the input task. The next step turns to the other classic shared-resource bug: the SPI bus.
