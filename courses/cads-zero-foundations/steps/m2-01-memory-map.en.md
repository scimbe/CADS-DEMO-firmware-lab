---
id: m2-01-memory-map
title: Reading the memory map
bloom: analyze
objectives: [firmware-reference-memory-map]
requires: [m2-00-mmio-primer]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m2-00-mmio-primer]
links:
  - { step: m2-02-mmio-gpio }
  - { doc: "docs/reference/memory-map.md" }
  - { file: "targets/itsboard/linker/cads_itsboard.ld", line: 23 }
sources: [docs/reference/memory-map.md, targets/itsboard/linker/cads_itsboard.ld, docs/SAFETY.md]
tasks:
  - id: predict-region
    title: Predict where a DMA buffer has to live
    check: { type: predict, prompt: { en: "A buffer that a DMA controller fills: which of the four regions must it live in?", de: "Ein Puffer, den ein DMA-Controller füllt: in welchem der vier Bereiche muss er liegen?" }, then: { type: command, cwd: ".", command: "grep -n -A6 'MEMORY' targets/itsboard/linker/cads_itsboard.ld", expectExitCode: 0 }, rubric: "The prediction names RAM at 0x20000000 and grounds it in the CCM being unreachable for DMA. A wrong prediction counts as a pass if the comparison against the MEMORY block is named afterwards.", bloom: analyze }
  - id: silent-zeros
    title: Explain a driver that measures only zeroes
    check: { type: question, prompt: { en: "A driver puts its DMA receive buffer in .ccm and reads only zeroes, with no fault. Why?", de: "Ein Treiber legt seinen DMA-Empfangspuffer nach .ccm und liest nur Nullen, ohne Fault. Warum?" }, rubric: "No DMA controller on this part reaches the CCM at 0x10000000; the transfer goes nowhere, with no error flag and no fault, because no bus reports the access. The buffer belongs in a .dmaram section in SRAM from 0x20000000. The answer must name the silent failure as the core, not just the wrong address.", bloom: analyze }
  - id: flash-window
    title: Derive why a reflash spares the filesystem
    check: { type: question, prompt: { en: "st-flash writes a 300 KB image at 0x08000000. Which two facts keep the filesystem intact?", de: "st-flash schreibt ein 300-KB-Image ab 0x08000000. Welche zwei Tatsachen lassen das Dateisystem unberührt?" }, rubric: "First, the image lies wholly in bank 1 and ends far below 0x08100000, while the filesystem only starts at 0x08120000 in bank 2. Second, the tool erases only the sectors it writes and never triggers a chip erase. Both facts are needed together; either one alone is not enough.", bloom: analyze }
socratic:
  - { trigger: "task:predict-region:stuck", question: { en: "Four regions, and one of them carries a warning in the linker script. Which one?", de: "Vier Bereiche, und einer trägt eine Warnung im Linkerskript. Welcher?" }, hints: [ { en: "Open targets/itsboard/linker/cads_itsboard.ld with Ctrl/Cmd+P and read the MEMORY block at the top.", de: "Öffne targets/itsboard/linker/cads_itsboard.ld mit Strg/Cmd+P und lies den MEMORY-Block ganz oben." }, { en: "One region's comment rules out a whole class of user. Which class, and what does that leave?", de: "Der Kommentar eines Bereichs schließt eine ganze Nutzerklasse aus. Welche, und was bleibt dann übrig?" }, { en: "Write down a region even if you are unsure — this task is about the comparison afterwards.", de: "Schreib einen Bereich hin, auch wenn du unsicher bist — diese Aufgabe lebt vom Vergleich danach." } ] }
  - { trigger: "question:silent-zeros:weak", question: { en: "You named the wrong address. Now the harder half: why is there no fault, no error flag, nothing?", de: "Du hast die falsche Adresse benannt. Jetzt die schwerere Hälfte: warum gibt es keinen Fault, kein Fehlerflag, nichts?" }, hints: [ { en: "A fault is reported by whoever notices the access. Who would have to notice here, and does that path exist?", de: "Einen Fault meldet, wer den Zugriff bemerkt. Wer müsste ihn hier bemerken, und gibt es diesen Weg überhaupt?" }, { en: "The section 'CCM: die Regel, die über die Platzierung entscheidet' names the consequence in one line.", de: "Der Abschnitt „CCM: die Regel, die über die Platzierung entscheidet“ nennt die Folge in einer Zeile." }, { en: "This is why the project marks DMA buffers explicitly instead of relying on a crash to find them.", de: "Genau deshalb markiert das Projekt DMA-Puffer ausdrücklich, statt sich auf einen Absturz zu verlassen, der sie findet." } ] }
  - { trigger: "question:flash-window:weak", question: { en: "You named one fact. Would it still hold if the tool erased the whole chip before writing?", de: "Du hast eine Tatsache genannt. Gälte sie auch, wenn das Werkzeug vor dem Schreiben den ganzen Chip löschte?" }, hints: [ { en: "Two independent things must be true: where the image lands, and how the tool clears space for it.", de: "Zwei unabhängige Dinge müssen zutreffen: wo das Image landet, und wie das Werkzeug Platz dafür schafft." }, { en: "Compare the FLASH_APP and FLASH_FS rows of the table with the size of the image.", de: "Vergleich die Zeilen FLASH_APP und FLASH_FS der Tabelle mit der Größe des Images." }, { en: "docs/SAFETY.md states which flash operations are forbidden outright; that is the second half.", de: "docs/SAFETY.md nennt die rundweg verbotenen Flash-Operationen; das ist die zweite Hälfte." } ] }
---
## Learning goal

Read the STM32F429ZI memory map the way the linker sees it, and decide from it where a buffer must live — the single constraint that shapes most of this firmware's layout.

## Four regions, one script

`targets/itsboard/linker/cads_itsboard.ld` declares the memory this firmware may use:

| Region | Address | Size | Use |
|---|---|---|---|
| `FLASH_APP` | `0x08000000` | 1024 KB | bank 1, sectors 0–11: the firmware |
| `FLASH_FS` | `0x08120000` | 896 KB | bank 2, sectors 17–23: the littlefs volume |
| `RAM` | `0x20000000` | 192 KB | SRAM1+2+3, contiguous, **DMA capable** |
| `CCM` | `0x10000000` | 64 KB | core-coupled memory, **no DMA access** |

The 128 KB between the two flash regions (`0x08100000`, sectors 12–16) is reserved and left erased. Sector geometry within a bank is not uniform — sectors 0–3 are 16 KB, sector 4 is 64 KB, 5–11 are 128 KB — which is why the filesystem uses only the 128 KB sectors: a constant block size.

## Two banks are why an update is safe

Flash is 2 MB in two banks, and the part supports read-while-write across banks: the CPU can keep executing from one bank while the other is erased or programmed. Firmware occupies bank 1 only; the filesystem lives in bank 2. Writing goes through `scripts/flash.sh`; which flash operations that permits and which are forbidden outright is written down in `docs/SAFETY.md`, and you need it for the third task. Three independent checks stand guard — the linker asserts the image fits in bank 1, the script refuses oversize images, and CI fails if any section lands above `0x08100000` — because overwriting the filesystem would be silent.

## CCM: the rule that decides placement

**CCM is invisible to every DMA controller on this part.** It hangs off the core's data bus rather than off the bus matrix the DMA units run over — the connection simply is not there. That one fact drives the split:

- Anything a peripheral reads or writes goes into `.dmaram`, explicitly, so its placement in SRAM is visible in the map file. The framebuffer and the display staging buffers live there.
- Anything only the CPU touches goes into CCM (`.ccm`), where it costs nothing scarce: FreeRTOS task stacks and the main stack.

The header `core/cads_hal.h` provides `CADS_DMA_SECTION` and `CADS_CCM_SECTION` so a portable file can request the right region without naming a target.

## What is left is the heap

The linker computes `__cads_heap_size` as whatever RAM remains after `.data`, `.bss` and `.dmaram`, and asserts it is at least 48 KB — lwIP and the GUI do not fit below that. A change that quietly squeezes out the network stack fails the link rather than the field. You will meet this floor again in M4.

## Your task

Three tasks, each on its own. First you predict which region a DMA buffer has to live in, and compare your prediction against the linker script's `MEMORY` block. Then you explain why a misplaced buffer fails *silently* rather than loudly. Last you derive, from the table above and from `docs/SAFETY.md`, which two facts together protect the filesystem from a reflash.

Open a file with `Ctrl`/`Cmd`+`P` and the typed file name; checks run from the **Check** button on each task.
