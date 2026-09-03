---
id: m6-01-littlefs
title: Where the filesystem lives
bloom: understand
objectives: [cz.storage.littlefs]
requires: [m5-04-dirty-rect-eval]
estimatedMinutes: 12
links:
  - { step: m6-02-config-file }
  - { doc: "docs/reference/memory-map.md" }
  - { doc: "docs/SAFETY.md" }
  - { file: "modules/storage/src/cads_flash_stm32f4.c", line: 76 }
sources: [docs/reference/memory-map.md, docs/SAFETY.md, modules/storage/src/cads_flash_stm32f4.c, docs/reference/explorer-console.md]
tasks:
  - id: storage-gate
    title: Run the storage gate on the console
    check: { type: manual }
  - id: why-safe
    title: Explain why a reflash cannot destroy the volume
    check: { type: question, prompt: { en: "Where exactly does the littlefs volume sit in flash, and give two independent reasons why writing a new firmware image with the lab's flash task cannot destroy it.", de: "Wo genau liegt das littlefs-Volume im Flash, und nenne zwei voneinander unabhängige Gründe, warum das Schreiben eines neuen Firmware-Images mit dem Flash-Task des Labors es nicht zerstören kann?" }, rubric: "Places the volume in flash bank 2 at 0x08120000 (896 KB, sectors 17-23). Reasons: st-flash write sector-erases only the range it writes at 0x08000000 and there is never a mass erase; the image is size-checked against 1 MB so it cannot run past bank 1; and the part is dual-bank so bank 2 is a separate erase domain from the firmware in bank 1.", bloom: understand }
socratic:
  - { trigger: "task:storage-gate:failed", question: { en: "The 'u' gate reported a failure. Does the raw flash driver work at all, or is it the filesystem layer on top that is unhappy?", de: "Das 'u'-Gate meldete einen Fehler. Funktioniert der rohe Flash-Treiber überhaupt, oder ist die Dateisystemschicht darüber unglücklich?" }, hints: [ { en: "The explorer has a second command that bypasses littlefs entirely and talks to the flash driver alone.", de: "Der Explorer hat einen zweiten Befehl, der littlefs komplett umgeht und nur den Flash-Treiber anspricht." }, { en: "Run 'y' - the raw flash driver diagnostic - and compare its verdict with 'u'.", de: "Führe 'y' aus - die rohe Flash-Treiberdiagnose - und vergleiche ihr Urteil mit 'u'." }, { en: "If 'y' passes and 'u' fails, the volume content is the problem; a fresh 'u' after a reset formats on first run.", de: "Besteht 'y' und 'u' scheitert, ist der Volume-Inhalt das Problem; ein frisches 'u' nach einem Reset formatiert beim ersten Lauf." } ] }
---
## Learning goal

Locate the on-board filesystem in the flash map and understand why a firmware update, done the way this lab does it, cannot touch it.

## There is no card

The Waveshare shield carries a microSD slot, but the ITS adapter does not route it and no card is in use, so CaDS Zero stores its files in **internal flash**. The STM32F429ZI has 2 MB of flash split into **two banks of 1 MB**, and the firmware uses that split as a hard wall (`docs/reference/memory-map.md`):

| Region | Address | Size | Sectors | Use |
|---|---|---|---|---|
| `FLASH_APP` | `0x08000000` | 1024 KB | bank 1, 0–11 | firmware |
| reserved | `0x08100000` | 128 KB | bank 2, 12–16 | left erased |
| `FLASH_FS` | `0x08120000` | 896 KB | bank 2, 17–23 | littlefs volume |

Sector geometry is not uniform: sectors 0–3 are 16 KB, sector 4 is 64 KB, sectors 5–11 are 128 KB. The filesystem uses only the 128 KB sectors of bank 2 so that its block size is constant.

## littlefs, and why that one

littlefs is a small filesystem designed for raw flash that survives power loss mid-write. The firmware's flash driver (`modules/storage/src/cads_flash_stm32f4.c`) refuses any address below `0x08120000` — checked at compile time with a `_Static_assert` and again at run time against the sector number — so even a bug in the filesystem layer cannot turn into a write over the firmware.

## Why a reflash cannot hurt it

Three independent facts, any one of which is enough:

1. **`st-flash write` sector-erases only the range it writes**, starting at `0x08000000`. A ~230 KB image touches a handful of bank-1 sectors and nothing else. There is **no mass erase, ever** (`docs/SAFETY.md` §4).
2. **The image size is checked against 1 MB** before writing, so an oversized image cannot spill past bank 1 into the filesystem window.
3. **The part is dual-bank.** Bank 2 is a separate erase domain, and the CPU can keep executing from bank 1 while bank 2 is being erased or programmed. That is also what lets the running firmware write its own files without stalling.

The same wall works in the other direction: the linker asserts the firmware fits in bank 1, and CI fails if any section lands above `0x08100000`.

## The gate you can run

The explorer command `u` is the M4 hardware gate: on a fresh volume it formats and writes test data; on every later run it verifies the same data survived a reset. `y` is its lower-level sibling, a raw flash-driver diagnostic that bypasses littlefs entirely — the tool for isolating a driver fault from a filesystem one.

## Your task

From the board console, run `u` and read its report (remember `board_key.py quit` if the board sits in the app tree). Then answer the question on where the volume lives and why a reflash leaves it intact. The next step opens the one file you will edit inside that volume.
