---
id: m2-02-mmio-gpio
title: Drive outputs and LEDs through the HAL
bloom: apply
objectives: [cz.gpio.mmio]
requires: [m2-01-memory-map]
estimatedMinutes: 15
links:
  - { step: m2-03-buttons }
  - { doc: "docs/HARDWARE.md" }
  - { doc: "docs/reference/explorer-console.md" }
  - { file: "core/cads_hal.h", line: 222 }
sources: [core/cads_hal.h, targets/itsboard/hal/hal_io.c, docs/HARDWARE.md, docs/reference/explorer-console.md]
tasks:
  - id: drive-outputs
    title: Drive the output banks and the on-board LEDs live
    check: { type: manual }
  - id: bits-to-ports
    title: Map the HAL call to the hardware
    check: { type: question, prompt: { en: "You call cads_hal_adapter_outputs(0x0301). Which port pins go high, which adapter LEDs light, and how do you know the OUT LEDs are active-high rather than active-low?", de: "Du rufst cads_hal_adapter_outputs(0x0301) auf. Welche Port-Pins gehen auf High, welche Adapter-LEDs leuchten, und woher weißt du, dass die OUT-LEDs active-high und nicht active-low sind?" }, rubric: "Bits 0..7 go to GPIOD (OUT0..7), bits 8..15 to GPIOE (OUT8..15); 0x0301 sets PD0, PD1 and PE1 (OUT0, OUT1, OUT9). Active-high is settled by the manufacturer's GPIOTest walking the LEDs with GPIOD->BSRR = 1 << i, and confirmed by the adapter schematic; an earlier photo-based 'active low' reading was a mistake.", bloom: apply }
socratic:
  - { trigger: "task:drive-outputs:stuck", question: { en: "Nothing changed on the adapter when you sent a command. Is the board at the console prompt, or still in the app-tree session that ignores plain typed bytes?", de: "Am Adapter hat sich nichts getan, als du einen Befehl gesendet hast. Ist das Board am Konsolen-Prompt oder noch in der App-Baum-Sitzung, die einfache getippte Bytes ignoriert?" }, hints: [ { en: "Send board_key.py quit once, then retry 'o ffff'.", de: "Sende einmal board_key.py quit, dann 'o ffff' erneut." }, { en: "The 'o' command takes a 16-bit hex mask: 'o ff' drives OUT0..7 (GPIOD), 'o ff00' drives OUT8..15 (GPIOE).", de: "Der Befehl 'o' nimmt eine 16-Bit-Hexmaske: 'o ff' treibt OUT0..7 (GPIOD), 'o ff00' treibt OUT8..15 (GPIOE)." }, { en: "'l 100' lights the red Nucleo LED only; the three digits are red, green, blue in that order.", de: "'l 100' schaltet nur die rote Nucleo-LED ein; die drei Ziffern stehen für Rot, Grün, Blau in dieser Reihenfolge." } ] }
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

On the board, `targets/itsboard/hal/hal_io.c` implements `cads_hal_adapter_outputs()` with one write per port to the **BSRR** (bit set/reset register): the low byte of `value` sets and clears PD0..PD7 in a single atomic write, the high byte does the same for PE0..PE7. BSRR rather than a read-modify-write of ODR means a concurrent interrupt touching the same port cannot lose a bit. This is memory-mapped I/O: a store to a fixed address in the peripheral region changes voltages on real pins.

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

Drive `o ff`, `o ff00`, `o ffff`, `o 0` and a few `l` patterns from the board console and watch the adapter and Nucleo LEDs respond. Then answer the mapping question — which pins `0x0301` raises, and how the polarity was established.
