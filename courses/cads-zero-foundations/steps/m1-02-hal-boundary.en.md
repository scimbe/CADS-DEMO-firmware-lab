---
id: m1-02-hal-boundary
title: The HAL boundary
bloom: understand
objectives: [firmware-reference-hal]
requires: [m1-01-module-layout]
estimatedMinutes: 15
links:
  - { step: m1-03-sim-vs-board }
  - { doc: "docs/reference/hal.md" }
  - { file: "core/cads_hal.h", line: 57 }
sources: [docs/reference/hal.md, core/cads_hal.h, docs/reference/memory-map.md]
tasks:
  - id: read-header
    title: You have read the HAL header top to bottom
    check: { type: manual }
  - id: ccm-and-readable
    title: Two contracts that are easy to violate
    check: { type: question, prompt: { en: "Why must a buffer handed to cads_hal_display_blit() never live in CCM on this board, and what does the board descriptor's display_readable being false force every widget to do?", de: "Warum darf ein Puffer, der an cads_hal_display_blit() übergeben wird, auf diesem Board nie im CCM liegen, und wozu zwingt display_readable = false im Board-Descriptor jedes Widget?" }, rubric: "States that CCM at 0x10000000 is invisible to every DMA controller on the STM32F4, so a transfer sourced there silently produces nothing (no fault, no error flag), hence the .dmaram section in SRAM; and that display_readable=false means the panel cannot be read back, so the RAM framebuffer is the only truth and widgets must keep their own copy rather than read-modify-write video memory.", bloom: understand }
socratic:
  - { trigger: "question:ccm-and-readable:weak", question: { en: "The HAL header says a DMA transfer from CCM 'silently produces nothing'. What is the linker section that guarantees the framebuffer avoids that?", de: "Der HAL-Header sagt, ein DMA-Transfer aus dem CCM 'erzeugt stillschweigend nichts'. Welche Linker-Sektion garantiert, dass der Framebuffer das vermeidet?" }, hints: [ { en: "Search core/cads_hal.h for CADS_DMA_SECTION.", de: "Suche in core/cads_hal.h nach CADS_DMA_SECTION." }, { en: "docs/reference/memory-map.md: SRAM at 0x20000000 is DMA-capable, CCM at 0x10000000 is not.", de: "docs/reference/memory-map.md: SRAM bei 0x20000000 ist DMA-fähig, CCM bei 0x10000000 nicht." }, { en: "display_readable is false because the shield's 74HC4094 shift-register chain has no return path.", de: "display_readable ist false, weil die 74HC4094-Schieberegisterkette des Shields keinen Rückweg hat." } ] }
---
## Learning goal

Know the one header that separates portable code from hardware, and the two contracts in it that are easiest to break.

## One header, two implementations

`core/cads_hal.h` is the entire boundary between the firmware and the silicon. Everything above it compiles unchanged for the board and for the host simulator. Two implementations exist: `targets/itsboard/hal/` against STM32F429 registers, and `targets/sim/hal_sim.c` against SDL2. Keeping the surface this narrow is what makes the simulator honest — if a feature is not expressible here, it cannot silently work in only one of the two worlds.

The header groups roughly forty functions: lifecycle (`cads_hal_early_init`, `cads_hal_init`), time (derived from the DWT cycle counter, not a tick interrupt, so it is correct inside critical sections), console, display, touch, adapter I/O, on-board indicators, panic, watchdog and reset cause, and the hardware RNG.

## Ask the descriptor, do not assume

`cads_hal_board_info()` returns a `cads_board_info_t`. Layers above ask it questions rather than testing which board they are on: `has_network`, `has_touch`, `button_count`, `display_width`. The `CADS_DISPLAY_WIDTH`/`HEIGHT` macros exist only so the canvas can size its static framebuffer at link time; layout code uses the descriptor. Two fields carry the most weight:

- **`display_readable`** is `false` on the ITSboard: the bus has no return path, so nothing can read video memory back. The RAM framebuffer is the only truth about what is on screen. The simulator sets it `true`, because an SDL surface can be read.
- **`display_pixels_per_second`** is measured (342 000), not calculated. A GUI deciding whether an animation is affordable should look it up.

## The two contracts that bite

`cads_hal_display_blit()` hands a rectangle of RGB565 pixels to DMA and returns immediately:

- `pixels` must stay valid until `cads_hal_display_busy()` reports false.
- On hardware the buffer **must live in DMA-capable SRAM, never in CCM**. CCM at `0x10000000` is invisible to every DMA controller on this part; a transfer sourced there produces nothing — no fault, no error flag, just wrong output. The header supplies `CADS_DMA_SECTION` (the linker's `.dmaram`) so placement is guaranteed and visible in the map file, and `CADS_CCM_SECTION` for things only the CPU touches, such as task stacks.

The console receive path is the other one: interrupt-driven with a ring buffer, because the STM32F4 USART has a one-byte receive register and no FIFO. At 115200 baud a byte lands every 87 µs, and any slower polling loop drops characters. The two counters `cads_hal_console_dropped()` and `cads_hal_console_overruns()` exist so such loss can never again be silent — it once presented as a display fault.

## Your task

Read `core/cads_hal.h` from top to bottom once, then explain the two contracts above in your own words. The next step shows what the boundary buys: the same code running with no board attached.
