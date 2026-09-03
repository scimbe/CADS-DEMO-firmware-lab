---
id: m2-02-mmio-gpio
title: Driving outputs and LEDs through the HAL
bloom: apply
objectives: [cz.gpio.mmio]
requires: [m2-01-memory-map]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m2-00-mmio-primer]
links:
  - { step: m2-03-buttons }
  - { doc: "docs/HARDWARE.md" }
  - { doc: "docs/reference/explorer-console.md" }
  - { file: "core/cads_hal.h", line: 222 }
sources: [core/cads_hal.h, targets/itsboard/hal/hal_io.c, docs/HARDWARE.md, docs/reference/explorer-console.md]
tasks:
  - id: drive-outputs
    title: Drive a chosen bit mask and watch it on the adapter
    check: { type: serialExpect, send: "o 0301\n", pattern: "outputs = 0301", timeoutMs: 20000 }
  - id: bits-to-ports
    title: Convert the mask into pins
    check: { type: question, prompt: { en: "Which adapter outputs does the mask 0x0301 drive high?", de: "Welche Adapter-Ausgänge treibt die Maske 0x0301 auf High?" }, rubric: "0x0301 is 0000 0011 0000 0001 in binary, so bits 0, 8 and 9 are set (1 + 256 + 512 = 769). Bits 0..7 go to GPIOD and bits 8..15 to GPIOE, so OUT0, OUT8 and OUT9 go high and their LEDs light. The answer must show the conversion, not merely name three outputs. Reading the digit 3 as bits 0 and 1 and arriving at OUT0, OUT1, OUT9 misses the place value of the hex digit and does not pass.", bloom: apply }
  - id: bsrr-vs-odr
    title: Judge BSRR against read-modify-write
    check: { type: question, prompt: { en: "A task toggles a pin with ODR ^= (1u << pin) while an interrupt writes BSRR on the same port. Whose write is lost?", de: "Eine Task schaltet einen Pin mit ODR ^= (1u << pin) um, während ein Interrupt auf demselben Port BSRR schreibt. Wessen Schreibvorgang geht verloren?" }, rubric: "The interrupt's BSRR write is the one that is lost. The task's read-modify-write is three steps; if the interrupt lands between the read and the write-back, the task then writes back the value it read before the change and erases it. The reverse is impossible, because on a Cortex-M thread code cannot preempt an interrupt: the interrupt's BSRR write is a single store and falls entirely before or entirely after the task's access. Naming BSRR as atomic without naming that asymmetry is half an answer.", bloom: analyze }
socratic:
  - { trigger: "task:drive-outputs:failed", question: { en: "Nothing came back from the board. Is it at the console prompt, or still in the app tree that ignores typed bytes?", de: "Vom Board kam nichts zurück. Ist es am Konsolen-Prompt oder noch im App-Baum, der getippte Bytes ignoriert?" }, hints: [ { en: "A freshly flashed board boots into the touchscreen app tree and ignores single letters.", de: "Ein frisch geflashtes Board startet in den Touchscreen-App-Baum und ignoriert einzelne Buchstaben." }, { en: "Open a terminal (menu Terminal, New Terminal) and run python3 scripts/board_key.py quit there, not in the board console.", de: "Öffne ein Terminal (Menü Terminal, New Terminal) und führe dort python3 scripts/board_key.py quit aus, nicht in der Board-Konsole." }, { en: "Then the console answers single letters again; the o command echoes the mask it applied.", de: "Danach beantwortet die Konsole wieder einzelne Buchstaben; der Befehl o gibt die angewandte Maske zurück." } ] }
  - { trigger: "question:bits-to-ports:weak", question: { en: "Split the four hex digits into four bits each first. Which positions carry a one?", de: "Zerleg die vier Hexziffern zuerst in je vier Bits. Welche Positionen tragen eine Eins?" }, hints: [ { en: "m2-00-hex-and-bits worked one of these through: 0x03 is 0000 0011, so bits 0 and 1.", de: "m2-00-hex-and-bits hat eines davon vorgerechnet: 0x03 ist 0000 0011, also Bit 0 und Bit 1." }, { en: "Count bit positions from the right, starting at zero, across the whole 16-bit value.", de: "Zähl die Bitpositionen von rechts, beginnend bei null, über den ganzen 16-Bit-Wert." }, { en: "The header comment on cads_hal_adapter_outputs() says which half of the mask goes to which port.", de: "Der Header-Kommentar an cads_hal_adapter_outputs() sagt, welche Hälfte der Maske an welchen Port geht." } ] }
  - { trigger: "question:bsrr-vs-odr:weak", question: { en: "Write out the three machine steps of ODR ^= (1u << pin). Where can the interrupt land?", de: "Schreib die drei Maschinenschritte von ODR ^= (1u << pin) auf. Wo kann der Interrupt dazwischenfahren?" }, hints: [ { en: "Read, change, write back: the value read is already stale if something else writes in between.", de: "Lesen, ändern, zurückschreiben: der gelesene Wert ist bereits veraltet, wenn dazwischen jemand anderes schreibt." }, { en: "Now ask the same question the other way round, and check whether a task can interrupt an interrupt handler at all.", de: "Stell dieselbe Frage nun andersherum und prüf, ob eine Task einen Interrupt-Handler überhaupt unterbrechen kann." }, { en: "One direction is possible and the other is not; that asymmetry is the whole point of the question.", de: "Eine Richtung ist möglich, die andere nicht; genau diese Asymmetrie ist der Kern der Frage." } ] }
---
## Learning goal

Drive the ITS adapter's sixteen outputs and the Nucleo's three LEDs through the HAL, and see how one portable call maps onto GPIO registers underneath.

## The portable surface

`core/cads_hal.h` exposes three calls for the output side:

```c
/** OUT0..OUT15: bits 0..7 go to GPIOD, bits 8..15 to GPIOE. */
void cads_hal_adapter_outputs(uint16_t value);

typedef enum { CadsLedGreen, CadsLedBlue, CadsLedRed } cads_led_t;
void cads_hal_led_set(cads_led_t led, bool on);
void cads_hal_led_toggle(cads_led_t led);
```

Nothing above the HAL knows a port letter. An app that wants OUT3 high sets bit 3; the target decides which pin that is. That is the boundary you met in M1 doing its job.

## What happens underneath

On the board, `targets/itsboard/hal/hal_io.c` implements `cads_hal_adapter_outputs()` with one write per port to the **BSRR**, the *bit set/reset register*: the low byte of `value` sets and clears PD0..PD7, the high byte does the same for PE0..PE7.

Here you see again what `m2-00-mmio-primer` worked through. The portable call ends in a single store to a fixed address — `GPIOD->BSRR` sits at `0x40020C18` — and that store changes voltages on real legs of the package. This is memory-mapped I/O, this time not as an example but in service.

The choice of register is not incidental. A BSRR write carries its own set and clear halves and is a single store. The obvious alternative is to read ODR, change a bit and write it back — a **read-modify-write** of three machine steps, and the firmware does exactly that elsewhere: `cads_gpio_toggle()` in `targets/itsboard/hal/hal_gpio.h` is `port->ODR ^= (1u << pin)`. An **interrupt** is a hardware interruption: it halts the running code mid-sentence, runs a short routine of its own, and returns. Because it can land at any moment, the two pieces of code run **concurrently** — they can get in each other's way without anything in the source showing it. Which of the two loses a write, and why only one direction is possible, is this step's third task.

## Polarity is measured, not assumed

The adapter's OUT LEDs are **active high** — a `1` lights the LED. `docs/HARDWARE.md` records how that was settled: the manufacturer's own hardware test (`ITS-BRD/its_brd_tst`, `GPIOTest`) walks the LEDs with `GPIOD->BSRR = 1 << i`, and the adapter schematic confirms OUT0..7 and OUT8..15 feed blue and green LED banks through SN74LVC245 buffers. An earlier reading, taken from a camera frame, had concluded "active low"; that was a guess dressed up as a measurement, and the record keeps the correction so nobody repeats it.

The Nucleo's three LEDs (green, blue, red) are separate from the adapter banks and driven by `cads_hal_led_set()`; the red one is also the panic indicator.

## Driving it from the console

The explorer wraps both calls:

| Command | Does |
|---|---|
| `o <hex>` | `cads_hal_adapter_outputs()` with a 16-bit mask, e.g. `o ff` for OUT0..7, `o ff00` for OUT8..15 |
| `l <rgb>` | Nucleo LEDs; three digits red, green, blue — `l 100` is red only |

Remember the M0 gotcha: a board sitting in the app tree ignores plain commands. `board_key.py quit` first.

## Your task

Open the board console (`F1`, then `CaDS Board: Open console`) and send `o 0301`. The tutor reads the board's reply along with you; on the adapter you can see at the same time which lamps come on. Then try `o ff`, `o ff00`, `o ffff` and `o 0` and a few `l` patterns to get a feel for the mask.

Then convert the mask `0x0301` into pins yourself, and finally judge why the HAL uses BSRR rather than ODR.

If the board does not answer: a freshly flashed board starts in the touchscreen app tree and ignores single letters. Open a terminal (menu *Terminal → New Terminal*) and run `python3 scripts/board_key.py quit` there once.
