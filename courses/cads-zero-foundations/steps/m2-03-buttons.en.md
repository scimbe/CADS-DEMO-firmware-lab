---
id: m2-03-buttons
title: Buttons, inputs and one inversion
bloom: analyze
objectives: [cz.gpio.buttons]
requires: [m2-02-mmio-gpio]
estimatedMinutes: 12
links:
  - { step: m2-04-safety }
  - { doc: "docs/explanation/input-scheme.md" }
  - { doc: "docs/HARDWARE.md" }
  - { file: "targets/itsboard/hal/hal_io.c", line: 53 }
sources: [docs/HARDWARE.md, docs/explanation/input-scheme.md, targets/itsboard/hal/hal_io.c, core/cads_hal.h]
tasks:
  - id: find-pin
    title: Find a button's pin with the port watcher
    check: { type: manual }
  - id: why-invert
    title: Explain the wiring and the inversion
    check: { type: question, prompt: { en: "S0..S7 are wired active-low with internal pull-ups, yet cads_hal_adapter_inputs() returns a set bit for 'pressed'. Why are pull-ups the correct configuration, where exactly does the inversion happen, and why is it done there and nowhere else? Also: why are INT0..INT5 not buttons?", de: "S0..S7 sind active-low mit internen Pull-ups verdrahtet, dennoch liefert cads_hal_adapter_inputs() ein gesetztes Bit für 'gedrückt'. Warum sind Pull-ups die richtige Konfiguration, wo genau findet die Invertierung statt, und warum dort und nirgends sonst? Außerdem: Warum sind INT0..INT5 keine Taster?" }, rubric: "A press pulls the line to ground (manufacturer's GPIOTest waits for GPIOF->IDR bit to go LOW), so the idle state must be held high by a pull-up. The inversion is one ~IDR in hal_io.c's cads_hal_adapter_inputs(); keeping it in the HAL means portable code sees 'bit set = pressed' regardless of polarity. INT0..5 (PG0..5, labelled AUX on the silkscreen) are unbuffered general-purpose inputs the manufacturer's test exercises with a jumper wire, not a button cluster.", bloom: analyze }
socratic:
  - { trigger: "task:find-pin:stuck", question: { en: "The watcher only reports changes. Did you press the button during the watch window, and which port letter moved?", de: "Der Watcher meldet nur Änderungen. Hast du den Taster während des Beobachtungsfensters gedrückt, und welcher Port-Buchstabe hat sich bewegt?" }, hints: [ { en: "Run 'w 10', then press one button within ten seconds; the console prints the port and the bit that changed.", de: "Führe 'w 10' aus und drücke innerhalb von zehn Sekunden einen Taster; die Konsole druckt Port und Bit, das sich geändert hat." }, { en: "Buttons are on port F: pressing S3 pulls PF3 low, so the IDR bit clears.", de: "Die Taster liegen an Port F: S3 zieht PF3 auf Low, das IDR-Bit wird also gelöscht." }, { en: "'s 10' streams the debounced S0..S7 state with key names if you want the mapping without reading raw bits.", de: "'s 10' streamt den entprellten Zustand S0..S7 mit Tastennamen, wenn du die Zuordnung ohne Rohbits willst." } ] }
---
## Learning goal

Read the adapter's buttons and input lines correctly, and understand why the firmware inverts the board's wiring in exactly one place.

## What the lines are

The ITS adapter brings fourteen input lines to the MCU (`docs/HARDWARE.md`):

| Name | Port | What it is |
|---|---|---|
| IN0..IN7 (S0..S7) | PF0..PF7 | the eight push buttons, **active low**, pulled up |
| INT0..INT5 | PG0..PG5 | general-purpose inputs, EXTI capable, pulled up — **not buttons** |

The button mapping was settled from the manufacturer's own hardware test (`ITS-BRD/its_brd_tst`, `GPIOTest`), which waits for each button with `while ((GPIOF->IDR & (1 << i)) != 0) {}` — that is, it waits for the line to go **low**. A press pulls the line to ground. So the idle state must be held high, and internal pull-ups are the correct configuration.

INT0..INT5 are something else. The same test exercises them by asking the operator to jumper OUT0 to INTx with a wire; the adapter schematic shows them unbuffered, straight from the MCU to connector `CN3`, labelled `AUX0..5` on the silkscreen. Any design that treats them as a second button row is wrong.

## One inversion, in the HAL

`core/cads_hal.h` promises:

```c
/** IN0..IN7 on GPIOF, active low (pulled up). Bit n = INn. */
uint8_t cads_hal_adapter_inputs(void);
```

and `docs/reference/hal.md` adds the contract that matters: the function **already inverts the board's active-low wiring**, so a set bit means "pressed" regardless of the hardware's polarity. On the board, `targets/itsboard/hal/hal_io.c` does it in one line — the complement of the port's IDR, masked to eight bits. That inversion lives here and nowhere else. The input service, the soft-key strip, every app: all of them see "bit set = pressed" and would work unchanged on a board wired active-high.

This is the same argument as the output side in the previous step, seen from the input direction: the HAL absorbs the electrical fact so portable code never has to know it.

## Watching the pins live

Two explorer commands turn this into something you can see:

- `w <sec>` watches every port's input data register for changes — press a button during the window and the console names the port and bit that moved. This is the fastest way to find which pin a button is wired to, and it is how the mapping was verified on this bench.
- `s <sec>` streams the debounced S0..S7 state with key names, so you can confirm the button-to-label mapping without a rebuild.
- `i` dumps all ports' IDR once, for a static baseline.

## Your task

Run `w 10` and press one button while it watches; note which port and bit change. Then answer the analysis question: why pull-ups, where the inversion lives and why there, and what INT0..5 actually are.
