---
id: m2-01-memory-map
title: Read the memory map
bloom: analyze
objectives: [firmware-reference-memory-map]
requires: [m2-00-mmio-primer]
estimatedMinutes: 15
links:
  - { step: m2-02-mmio-gpio }
  - { doc: "docs/reference/memory-map.md" }
  - { file: "targets/itsboard/linker/cads_itsboard.ld", line: 23 }
sources: [docs/reference/memory-map.md, targets/itsboard/linker/cads_itsboard.ld, docs/SAFETY.md]
tasks:
  - id: read-ld
    title: Read the MEMORY block of the linker script
    check: { type: manual }
  - id: place-buffers
    title: Decide where a buffer has to live
    check: { type: question, prompt: { en: "A new driver needs a receive buffer that a DMA controller will fill, and a second scratch buffer only the CPU touches. Where does each one go in this memory map, and why? Also: at which address does the littlefs volume start, and why can a firmware update not destroy it?", de: "Ein neuer Treiber braucht einen Empfangspuffer, den ein DMA-Controller füllt, und einen zweiten Arbeitspuffer, den nur die CPU berührt. Wohin gehört jeder in dieser Speicherkarte, und warum? Außerdem: Bei welcher Adresse beginnt das littlefs-Volume, und warum kann ein Firmware-Update es nicht zerstören?" }, rubric: "DMA buffer in SRAM at 0x20000000 (the .dmaram section) because CCM at 0x10000000 is invisible to every DMA controller and a transfer from there silently produces nothing; the CPU-only buffer may go in CCM (.ccm). littlefs starts at 0x08120000 in flash bank 2; firmware lives in bank 1 (0x08000000) and the flasher only sector-erases the range it writes, never a mass erase.", bloom: analyze }
socratic:
  - { trigger: "question:place-buffers:weak", question: { en: "The linker script names four memory regions. Which one carries the comment 'NO DMA ACCESS', and what does that rule out?", de: "Das Linkerskript benennt vier Speicherbereiche. Welcher trägt den Kommentar 'NO DMA ACCESS', und was schließt das aus?" }, hints: [ { en: "Look at the MEMORY block near the top of targets/itsboard/linker/cads_itsboard.ld.", de: "Sieh dir den MEMORY-Block oben in targets/itsboard/linker/cads_itsboard.ld an." }, { en: "CCM at 0x10000000 cannot be read by any DMA engine; the framebuffer therefore sits in a .dmaram section inside RAM.", de: "CCM bei 0x10000000 kann von keiner DMA-Einheit gelesen werden; der Framebuffer liegt deshalb in einer .dmaram-Sektion im RAM." }, { en: "FLASH_FS begins at 0x08120000 in bank 2; the firmware in bank 1 is written by st-flash with per-sector erase only.", de: "FLASH_FS beginnt bei 0x08120000 in Bank 2; die Firmware in Bank 1 schreibt st-flash nur mit sektorweisem Löschen." } ] }
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

Flash is 2 MB in two banks, and the part supports read-while-write across banks. Firmware occupies bank 1 only; the filesystem lives in bank 2. `scripts/flash.sh` writes with `st-flash write`, which sector-erases only the range it writes, refuses an image larger than 1 MB, and never issues a chip erase. Three independent checks — the linker asserts the image fits in bank 1, the script refuses oversize images, and CI fails if any section lands above `0x08100000` — because overwriting the filesystem would be silent.

## CCM: the rule that decides placement

**CCM is invisible to every DMA controller on this part.** A transfer sourced from `0x10000000` produces nothing — no fault, no error flag, just wrong output. That one fact drives the split:

- Anything a peripheral reads or writes goes into `.dmaram`, explicitly, so its placement in SRAM is visible in the map file. The framebuffer and the display staging buffers live there.
- Anything only the CPU touches goes into CCM (`.ccm`), where it costs nothing scarce: FreeRTOS task stacks and the main stack.

The header `core/cads_hal.h` provides `CADS_DMA_SECTION` and `CADS_CCM_SECTION` so a portable file can request the right region without naming a target.

## What is left is the heap

The linker computes `__cads_heap_size` as whatever RAM remains after `.data`, `.bss` and `.dmaram`, and asserts it is at least 48 KB — lwIP and the GUI do not fit below that. A change that quietly squeezes out the network stack fails the link rather than the field. You will meet this floor again in M4.

## Your task

Read the `MEMORY` block of the linker script and `docs/reference/memory-map.md`, then answer the placement question: where a DMA buffer goes, where a CPU-only buffer may go, where littlefs starts, and why a reflash leaves it intact.
