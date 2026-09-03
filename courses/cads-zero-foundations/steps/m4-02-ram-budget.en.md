---
id: m4-02-ram-budget
title: The RAM budget and the 48 KB floor
bloom: apply
objectives: [cz.rtos.ram-budget]
requires: [m4-01-freertos-tasks]
estimatedMinutes: 15
links:
  - { step: m4-03-mutex-spi-bus }
  - { file: "scripts/check_ram_budget.py", line: 1 }
  - { file: "targets/itsboard/linker/cads_itsboard.ld", line: 157 }
  - { doc: "docs/reference/measurements.md" }
  - { doc: "docs/how-to/build.md" }
sources: [scripts/check_ram_budget.py, targets/itsboard/linker/cads_itsboard.ld, docs/reference/measurements.md, docs/reference/memory-map.md]
tasks:
  - id: build-report
    title: Produce the size report
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: floor-vs-budget
    title: Distinguish the floor from the budget
    check: { type: question, prompt: { en: "The linker script asserts __cads_heap_size >= 48K, and scripts/check_ram_budget.py also reads __cads_heap_size. What does each one guard, and why was the second one added when the first already exists?", de: "Das Linkerskript sichert __cads_heap_size >= 48K zu, und scripts/check_ram_budget.py liest ebenfalls __cads_heap_size. Was sichert jedes der beiden ab, und warum wurde das zweite ergänzt, obwohl das erste schon existiert?" }, rubric: "The linker ASSERT is a hard floor: below 48 KB lwIP and the GUI do not fit, so the link fails. check_ram_budget.py reads the same symbol via nm and fails if the margin ABOVE the floor is under --min-margin-bytes (default 256 B); it exists because the project hit the floor at exactly zero bytes of slack more than once and only noticed by hand - a floor a build either clears or not is not a budget that warns while there is still room to fix it.", bloom: analyze }
socratic:
  - { trigger: "task:build-report:failed", question: { en: "Does the link error mention heap? If so, which 48 KB rule tripped, and what did your last change add to SRAM?", de: "Erwähnt der Linkfehler den Heap? Wenn ja, welche 48-KB-Regel hat ausgelöst, und was hat deine letzte Änderung dem SRAM hinzugefügt?" }, hints: [ { en: "Read the --print-memory-usage table: RAM used vs 192 KB; the heap is what is left.", de: "Lies die Tabelle von --print-memory-usage: RAM belegt gegen 192 KB; der Heap ist der Rest." }, { en: "Static buffers (.bss/.dmaram) are the usual culprit; task stacks are in CCM and do not count here.", de: "Statische Puffer (.bss/.dmaram) sind der übliche Grund; Task-Stacks liegen im CCM und zählen hier nicht." }, { en: "Offset a RAM-hungry change with a cut, or move CPU-only state into CCM via CADS_CCM_SECTION.", de: "Gleiche eine RAM-hungrige Änderung durch einen Abbau aus oder verlege CPU-only-Zustand per CADS_CCM_SECTION ins CCM." } ] }
---
## Learning goal

Read the firmware's RAM budget correctly: what the linker's 48 KB floor guards, what the margin check adds on top, and why the margin is the whole safety net.

## There is no heap — and that is the point

FreeRTOS allocates nothing (M4-01), and there is no `malloc` in use anywhere. What the linker calls "heap" is simply **whatever SRAM is left** after `.data`, `.bss` and `.dmaram` are placed. `targets/itsboard/linker/cads_itsboard.ld` deliberately does not fill the region with a section, so `--print-memory-usage` keeps reporting a meaningful number instead of 100 % forever:

```
__cads_heap_start = .;                      /* after .dmaram */
__cads_heap_end   = ORIGIN(RAM) + LENGTH(RAM);
__cads_heap_size  = __cads_heap_end - __cads_heap_start;

ASSERT(__cads_heap_size >= 48K,
       "Less than 48K of heap left in SRAM - lwIP and the GUI will not fit")
```

Below 48 KB the network stack's pools and the GUI do not fit, so the link **fails** rather than the board failing in the field. That is a floor: a build either clears it or does not.

## Why a floor is not a budget

`docs/reference/measurements.md` records the margin over that floor: 416 B after the three arcade games landed (down from 928 B), and the project's own log shows it hit the floor at *exactly zero bytes of slack* more than once, each time noticed only by a human counting bytes afterwards. A build that merely links leaves no room for the next feature.

`scripts/check_ram_budget.py` closes that gap. It reads `__cads_heap_size` back out of the built ELF with `nm` — the very symbol the ASSERT computes, not a re-derivation from section sizes that could drift — and fails if the margin above 48 KB is thinner than `--min-margin-bytes`, default **256 B**, the smallest margin the project ever accepted as real. CI runs it right after the size report; you can run it yourself:

```bash
python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf
python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf --min-margin-bytes 512
```

## Where the SRAM goes

Roughly: 75 KB framebuffer (480×320 at 4 bpp), 30 KB RGB565 staging, lwIP's pools, and statics. Task stacks are **not** in this number — they live in CCM (M4-01), which is why the two stack fixes in M4-05 cost nothing from this budget. A RAM-hungry change to anything in SRAM needs an offsetting cut, not a hopeful build.

## Your task

Run the board build and read the `--print-memory-usage` table it prints. Then answer the question distinguishing the linker floor from the margin budget.
