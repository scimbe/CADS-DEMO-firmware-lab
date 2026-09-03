---
id: m3-04-stack-guard
title: Catching a stack overflow
bloom: analyze
objectives: [cz.debug.stack-guard]
requires: [m3-03-fault-forensics]
estimatedMinutes: 18
scaffold: independent
recallFrom: [m3-03-fault-forensics]
links:
  - { step: m3-05-spi-mutex }
  - { step: m3-03-fault-forensics }
  - { doc: "docs/ROADMAP.md" }
  - { file: "core/cads_hal.h" }
  - { file: "apps/bringup/tasks.c", line: 128 }
  - { file: "targets/itsboard/linker/cads_itsboard.ld", line: 174 }
sources: [apps/bringup/tasks.c, docs/ROADMAP.md, docs/how-to/debug.md, core/cads_hal.h, scripts/check_ram_budget.py, targets/itsboard/linker/cads_itsboard.ld]
tasks:
  - id: build
    title: The firmware still builds with the guard in place
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: guard-vs-hook
    title: Argue why the kernel's own check was not enough
    check: { type: question, prompt: { en: "FreeRTOS already checks stacks with configCHECK_FOR_STACK_OVERFLOW 2. Why was the canary table added on top?", de: "FreeRTOS prüft Stacks bereits mit configCHECK_FOR_STACK_OVERFLOW 2. Warum kam die Canary-Tabelle trotzdem dazu?" }, rubric: "Two gaps, both named in docs/ROADMAP.md under 2026-08-26. First, the FreeRTOS check only samples at context switches: a deep excursion that overflows and returns between two switches is invisible to it. Second, it sees task stacks only and has zero visibility into the MSP. The sentinel table closes both: it carries msp as an entry of its own and is polled from the idle hook, independently of whether a context switch is happening. An answer that merely says „belt and braces“ has named neither gap.", bloom: analyze }
  - id: ccm-cost
    title: Compute what the fix cost
    check: { type: question, prompt: { en: "CADS_INPUT_STACK grew from 256 to 1024 words. How many bytes of CCM did that cost?", de: "CADS_INPUT_STACK wuchs von 256 auf 1024 Wörter. Wie viele Byte CCM kostete das?" }, rubric: "768 extra words. A word here is four bytes, because the stacks are declared as uint32_t arrays, so 768 × 4 = 3072 bytes, three kilobytes. The second half of the answer is the point: not one of those bytes comes out of the SRAM budget, because the stacks live in CCM via CADS_CCM_SECTION - which is exactly why the fix could afford to be generous. Answering 768 bytes or 3072 words confuses the unit.", bloom: analyze }
misconceptions:
  - { pattern: "CCM overflow", question: { en: "The link failed with a CCM overflow. Which region ran out, and what shares it with your stacks?", de: "Der Link scheiterte mit einem CCM-Überlauf. Welcher Bereich ging aus, und was teilt ihn sich mit deinen Stacks?" }, hints: [ { en: "Is the region that ran out the same 192 KB the RAM budget talks about, or a different, much smaller one?", de: "Ist der Bereich, der ausging, dieselben 192 KB, von denen das RAM-Budget spricht, oder ein anderer, viel kleinerer?" }, { en: "Read the second ASSERT in targets/itsboard/linker/cads_itsboard.ld: it names the two things that collided.", de: "Lies den zweiten ASSERT in targets/itsboard/linker/cads_itsboard.ld: er nennt die beiden Dinge, die kollidiert sind." }, { en: "CCM is 64 KB in total and the main stack is carved out of its top end, so the section below it cannot grow without limit.", de: "CCM hat insgesamt 64 KB, und der Main-Stack wird oben herausgeschnitten, die Sektion darunter kann also nicht unbegrenzt wachsen." } ] }
socratic:
  - { trigger: "task:build:failed", question: { en: "Does the error come from the compiler or from the linker, and does it name a region rather than a symbol?", de: "Kommt der Fehler vom Compiler oder vom Linker, und nennt er einen Bereich statt eines Symbols?" }, hints: [ { en: "Compiler errors name a file and a line; linker errors name a section, a region or a symbol - which kind is yours?", de: "Compilerfehler nennen Datei und Zeile; Linkerfehler nennen Sektion, Bereich oder Symbol - welche Art ist deiner?" }, { en: "Run the CaDS: Build task again and read the last twenty lines from the bottom up; the first real error is usually near the end.", de: "Führe den Task CaDS: Build erneut aus und lies die letzten zwanzig Zeilen von unten nach oben; der erste echte Fehler steht meist nahe am Ende." }, { en: "Two ASSERTs in the linker script can stop a build that compiles perfectly - one guards SRAM, the other guards CCM.", de: "Zwei ASSERTs im Linkerskript können einen Bau stoppen, der einwandfrei kompiliert - einer bewacht das SRAM, der andere das CCM." } ] }
  - { trigger: "question:guard-vs-hook:weak", question: { en: "At which moments does FreeRTOS look at a stack, and which stack does it never look at?", de: "Zu welchen Zeitpunkten sieht FreeRTOS auf einen Stack, und auf welchen Stack sieht es nie?" }, hints: [ { en: "A check that only runs at certain moments can be outrun - what happens if the deep call returns before the next such moment?", de: "Eine Prüfung, die nur zu bestimmten Zeitpunkten läuft, lässt sich überholen - was passiert, wenn der tiefe Aufruf vor dem nächsten solchen Zeitpunkt zurückkehrt?" }, { en: "Open docs/ROADMAP.md and read the 2026-08-26 entry; it weighs the kernel's own check against the canary proposal in so many words.", de: "Öffne docs/ROADMAP.md und lies den Eintrag vom 2026-08-26; er wiegt die kerneleigene Prüfung dort ausdrücklich gegen den Canary-Vorschlag ab." }, { en: "Compare the four names in the sentinel table with the list of tasks - one of the four entries is not a task at all.", de: "Vergleich die vier Namen in der Wächtertabelle mit der Liste der Tasks - einer der vier Einträge ist gar keine Task." } ] }
  - { trigger: "question:ccm-cost:weak", question: { en: "What is the C type of the arrays these stacks are declared as, and how wide is one element?", de: "Welchen C-Typ haben die Felder, als die diese Stacks deklariert sind, und wie breit ist ein Element?" }, hints: [ { en: "Did you compute the difference between the two sizes, or the new size?", de: "Hast du die Differenz der beiden Größen ausgerechnet oder die neue Größe?" }, { en: "Look at the declarations of cads_ui_stack and friends in apps/bringup/tasks.c and read the element type.", de: "Sieh dir die Deklarationen von cads_ui_stack und den anderen in apps/bringup/tasks.c an und lies den Elementtyp." }, { en: "FreeRTOS counts stacks in words, not bytes, everywhere - that is the whole reason the conversion is needed at all.", de: "FreeRTOS zählt Stacks überall in Wörtern, nicht in Byte - genau deshalb ist die Umrechnung überhaupt nötig." } ] }
---
## Learning goal

Recognise a stack overflow from its register signature, and understand how this firmware's stack-guard sentinel and forensic ring convert a silent freeze into a named, fixable cause.

## Why overflows are hard to see

There is no MPU guard page here and no kernel heap. A task stack that overflows simply writes past its bottom into whatever the linker placed below it. The symptom is rarely "stack overflow"; it is a corrupted return address, a jump into nowhere, and a fault taken *inside* code that had nothing to do with the cause.

## The case study the rest of this course refers back to

Two overflows have been confirmed on this hardware (`apps/bringup/tasks.c`, header comment; `docs/ROADMAP.md`, 2026-08-28 and 2026-08-30). They are the course's reference case; later steps recall it rather than retelling it.

**Case 1 - the console task with `net.dhcp = 1`.** The app-tree loop calls `cads_net_poll()` on the console task's stack; the DHCP client's state machine is visibly deeper than the static-IP path. The board simply froze. Caught live with GDB it looked like this:

| Observation | What stands out about it |
|---|---|
| `PC = 0xF7FF0FF0` | not a flash address, not a valid code address at all |
| `CFSR` bit `IACCVIOL` | an instruction-fetch violation: the CPU tried to fetch code *there* |
| halted inside `vApplicationIdleHook()` | code that cannot possibly contain the cause |
| `SP` clobbered to an absurdly low value | the stack pointer itself had been overwritten |

Read together those form a chain: the stack ran past its bottom, overwrote a saved return address on the way, the next return branched to `0xF7FF0FF0`, and the fault landed on whichever function happened to be running. Fix: `CADS_CONSOLE_STACK` from 512 to 1024 words.

**Case 2 - the input task in the Marauder menu.** `cads_input_tick()` calls straight into the active app's input handler on the input task's own stack, so a 256-word stack had to carry arbitrary app call depth. Fix: `CADS_INPUT_STACK` from 256 to 1024 words.

That signature - a `PC` that is not a flash address, a nonsensical `SP`, a fault in code that cannot have caused it - is the one to memorise. It never tells you *which* stack it was. That takes the sentinel.

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

FreeRTOS ships its own facility for the same question: `configCHECK_FOR_STACK_OVERFLOW 2` is switched on in `modules/kernel/src/FreeRTOSConfig.h` and calls `vApplicationStackOverflowHook()` on a hit. The 2026-08-26 entry in `docs/ROADMAP.md` weighs the two against each other and gives the reason the table was added anyway - that is your second task, and the answer is there, not here.

As a side effect the sentinel explains an observation that otherwise alarms people: a live GDB attach can show `PC` parked inside `cads_stackguard_breached()` and mean nothing. That is the idle hook's normal polling, not a caught crash (`docs/ROADMAP.md`, 2026-09-01).

## The ring closes the loop

`cads_hal_panic()` records the reason in the forensic ring before halting. In the input-task case, `E` showed `reason=input` **22 ms before** a `HardFault` record with `HFSR = 0x80000000` (DEBUGEVT) - the panic's own `bkpt` escalating because no debugger was attached, itself a bug fixed the same day. The ring therefore named the exact stack; nothing had to be guessed.

That completes the chain: the **signature** says "a stack overflowed", the **sentinel** says "this one", the **ring** carries both across the reset.

## Where the fix lives, and what it costs

Task stacks live in **CCM** (`CADS_CCM_SECTION`), not in the SRAM heap that `scripts/check_ram_budget.py` guards to a 256 B margin. They are declared as `uint32_t` arrays and sized in **words**, the way FreeRTOS counts everywhere - converting that into bytes is your third task.

CCM is not free either: `targets/itsboard/linker/cads_itsboard.ld` carves the main stack out of the top of the 64 KB and carries a second `ASSERT` that aborts the link as soon as the `.ccm` section grows into it. Of the 64 KB, about 54.7 KB were still free after the fix. M4 revisits this trade-off when you size a stack yourself.

## Your task

Read the sentinel table and `vApplicationIdleHook()` in `apps/bringup/tasks.c` and confirm the firmware still builds. Then argue why the kernel's own overflow check was not enough, and compute what the fix cost in CCM. The next step turns to the other classic shared-resource bug: the SPI bus.
