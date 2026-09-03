---
id: m2-00-register-names
title: Register names and the clock enable
bloom: understand
objectives: [cz.mmio.registers]
requires: [m2-00-mmio-primer]
estimatedMinutes: 12
scaffold: worked
links:
  - { step: m2-01-memory-map }
  - { file: "targets/itsboard/hal/hal_io.c", line: 24 }
  - { doc: "docs/HARDWARE.md" }
sources: [targets/itsboard/hal/hal_io.c, targets/itsboard/hal/hal_gpio.h, docs/HARDWARE.md]
tasks:
  - id: register-naming
    title: Take the name RCC_AHB1ENR apart
    check: { type: question, prompt: { en: "Using the same pattern, what do RCC_APB2ENR and RCC_AHB1RSTR say?", de: "Was sagen nach demselben Muster RCC_APB2ENR und RCC_AHB1RSTR?" }, rubric: "RCC_APB2ENR is the enable register (ENR) for the units on bus APB2; RCC_AHB1RSTR is the reset register (RSTR) for the units on bus AHB1. In both, RCC is the unit, the middle part is the bus and the last part is the register's job. The answer must take both names apart, not just one.", bloom: understand }
socratic:
  - { trigger: "question:register-naming:weak", question: { en: "Split the name at the underscores first. How many parts do you get, and which one is a bus?", de: "Zerleg den Namen zuerst an den Unterstrichen. Wie viele Teile bekommst du, und welcher davon ist ein Bus?" }, hints: [ { en: "Compare it with RCC_APB1ENR and RCC_AHB1RSTR: what stays, what changes?", de: "Vergleich ihn mit RCC_APB1ENR und RCC_AHB1RSTR: was bleibt, was ändert sich?" }, { en: "The table 'How the names are built' above has one row per part.", de: "Die Tabelle „Wie die Namen gebaut sind“ weiter oben hat eine Zeile je Teil." }, { en: "The last part is always the register's job. ENR is short for enable register; RSTR would be the reset register of the same bus.", de: "Der letzte Teil ist immer die Aufgabe des Registers. ENR steht für Enable Register; RSTR wäre das Reset-Register desselben Busses." } ] }
---
## Learning goal

Read the names the chip vendor gives its registers, and learn the one rule most people trip over first on this part.

## How the names are built

Nobody keeps addresses like `0x40023830` in their head, so the chip vendor gives them names. For the registers that refer to a bus, those names are built to a fixed pattern:

| Part | Example | What it says |
|---|---|---|
| Peripheral | `RCC` | *reset and clock control* — the unit that hands out all the clocks |
| Bus | `AHB1` | the internal bundle of wires the affected units hang off |
| Register | `ENR` | *enable register* — this register's job: this is where things are switched on |

So `RCC_AHB1ENR` reads literally as **"the enable register for everything on bus AHB1".** By the same pattern `RCC_APB1ENR` is the enable register of the slower APB1 bus, and `RCC_AHB1RSTR` is the reset register of that same AHB1.

The pattern holds for the bus-related registers, not for all of them. In the same part, other RCC registers are called simply `RCC_CR`, `RCC_CFGR` or `RCC_CSR` — two parts, no bus part, because they refer to no bus. Knowing the rule means knowing where it stops.

The GPIO ports' own register names follow the pattern of their job too: `MODER` = mode register (a pin's direction), `IDR` = input data register (what is present right now), `ODR` = output data register (what is being driven), `BSRR` = bit set/reset register (set or clear individual bits without reading the others).

## The rule most people trip over first

A peripheral whose **clock is not switched on does not react at all.** A write evaporates, a read returns zeroes — no fault, no warning, no hint. This is the most common beginner's mistake on this chip, and it looks exactly like a broken board.

That is why `cads_hal_io_init()` in `targets/itsboard/hal/hal_io.c` opens with exactly one line of this kind, before any pin is touched:

```c
RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN | RCC_AHB1ENR_GPIOBEN | /* … */ RCC_AHB1ENR_GPIODEN | /* … */;
(void)RCC->AHB1ENR;
```

`RCC_AHB1ENR_GPIODEN` is nothing other than `1 << 3` — bit 3 of that register belongs to port D. The second line reads the register back and throws the value away. That looks pointless and is not: the clock enable only takes effect a few peripheral cycles after the write, and reading the same register back bridges exactly that gap before the next line touches the port. Without `volatile` the compiler would be allowed to drop exactly that read-back — here you can see the reason at work.

The comment in the source also records why this is safe: switching a clock on changes no pin's direction at all.

## Your task

Take two register names apart using the pattern you have just learned. Both names, not just one.

**Where you work:** answer into the text box on the task · open a file `Ctrl`/`Cmd`+`P` · check the task with the **Check** button.
