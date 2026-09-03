---
id: m0-04-flash-console
title: Flash and pass the hardware gate
bloom: apply
objectives: [firmware-how-to-flash, firmware-how-to-board-test]
requires: [m0-03-build]
estimatedMinutes: 15
links:
  - { step: m0-05-explorer }
  - { doc: "docs/how-to/board-test.md" }
  - { doc: "docs/tutorials/first-gate.md" }
sources: [docs/how-to/flash.md, docs/tutorials/first-gate.md, docs/SAFETY.md, docs/reference/measurements.md]
tasks:
  - id: flashed
    title: The image is written to the board
    check: { type: flash, since: stepStart }
  - id: self-test
    title: The on-target self test passes
    check: { type: serialExpect, pattern: "RESULT: PASS", timeoutMs: 60000 }
  - id: read-numbers
    title: Read one measured number from the gate
    check: { type: question, prompt: { en: "The self test prints diagnostic lines beginning with '#'. What does flush_kpixel_per_s report, and why is a full-screen redraw so slow on this board?", de: "Der Selbsttest druckt Diagnosezeilen, die mit '#' beginnen. Was meldet flush_kpixel_per_s, und warum ist ein Vollbild-Neuaufbau auf diesem Board so langsam?" }, rubric: "States roughly 342 kpixel/s (a full screen ~448 ms) and explains the shift-register chain costs 16 SPI clocks per pixel, so the bus, not the driver, is the limit.", bloom: understand }
socratic:
  - { trigger: "task:self-test:failed", question: { en: "No RESULT line arrived. Is the console reading the ST-Link's virtual COM port, or a different serial device?", de: "Keine RESULT-Zeile kam an. Liest die Konsole den virtuellen COM-Port der ST-Link oder ein anderes serielles Gerät?" }, hints: [ { en: "The gate reads TAP over the ST-Link VCP; the wrong port produces silence that looks like a hardware fault.", de: "Das Gate liest TAP über den VCP der ST-Link; der falsche Port erzeugt Stille, die wie ein Hardwarefehler aussieht." }, { en: "A plan of 9 assertions with fewer arriving means the firmware died part way — reflash and watch the count.", de: "Ein Plan mit 9 Zusicherungen, von denen weniger ankommen, heißt, die Firmware starb unterwegs — neu flashen und die Zählung beobachten." }, { en: "If flashing itself failed, a stale GDB server may hold the probe; disconnect and reconnect the board.", de: "Schlug das Flashen selbst fehl, hält womöglich ein verwaister GDB-Server die Probe; trenne und verbinde das Board neu." } ] }
---
## Learning goal

Put your build onto the real board and pass the hardware gate — the moment a compiled image becomes firmware that provably runs on silicon.

## Flashing, and what it refuses to do

Flashing writes `cads-zero.bin` to `0x08000000` over the ST-Link. The tooling is deliberately narrow (`docs/SAFETY.md`, `docs/how-to/flash.md`):

- **`st-flash write` sector-erases only the range it writes.** A ~230 KB image touches the first few sectors and nothing else.
- **No mass erase, ever.** A chip erase would take the littlefs filesystem in flash bank 2 with it.
- **Image size is checked against 1 MB**, so an oversized image cannot run past bank 1 into the filesystem window at `0x08120000`.
- **Option bytes are never written**, so read protection can never be set by accident.

In this lab the Build + Flash task builds, then writes the fresh image and resets the board.

## The gate, not the screen

The display bus is write-only, so "the screen looked right" cannot be a gate. Instead `apps/bringup` runs an on-target self test that emits **TAP** (Test Anything Protocol) over the serial console, and the gate reads it back:

```
1..9
ok 1 - SysTick advances at 1 kHz
ok 2 - DWT microsecond clock agrees
...
# flush_pixels: 153600
# flush_us: 448233
# flush_kpixel_per_s: 342
ok 7 - dirty rectangle limits the transfer
# RESULT: PASS
```

`1..9` is the plan; `ok`/`not ok` are assertions; `#` lines are diagnostics. The format is deliberate: a human's opinion cannot fail a build, but `ok 4` can.

## The number that shapes everything

`flush_kpixel_per_s: 342` is measured, not calculated. A full screen is 153 600 pixels, so at that rate one full redraw costs about **448 ms**. The panel is fed through a shift-register chain that spends 16 SPI clocks per pixel, so the bus is the limit and the driver is already at 97 % of it. That single fact is why the canvas tracks dirty rectangles — you will meet the consequences again in M5.

## Your task

Flash the board and let the self test run. The checks confirm the write happened and that `RESULT: PASS` came back over the console. Then read one measured number out of the gate output. The next step opens the diagnostic console you just used.
