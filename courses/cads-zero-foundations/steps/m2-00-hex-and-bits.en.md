---
id: m2-00-hex-and-bits
title: Hex, bits and addresses
bloom: understand
objectives: [cz.mmio.registers]
requires: [m1-04-splash]
estimatedMinutes: 10
scaffold: worked
links:
  - { step: m2-01-memory-map }
  - { file: "targets/itsboard/hal/hal_io.c", line: 24 }
  - { doc: "docs/HARDWARE.md" }
sources: [targets/itsboard/hal/hal_io.c, targets/itsboard/hal/hal_gpio.h, docs/HARDWARE.md]
tasks:
  - id: address-arithmetic
    title: Predict the address before you look it up
    check: { type: predict, prompt: { en: "GPIOE sits 0x400 above GPIOD, and ODR has offset 0x14. Which address does GPIOE->ODR have?", de: "GPIOE liegt 0x400 über GPIOD, ODR hat den Offset 0x14. Welche Adresse hat GPIOE->ODR?" }, then: { type: command, cwd: ".", command: "grep -n 'define PERIPH_BASE\\|define AHB1PERIPH_BASE\\|define GPIOE_BASE\\|uint32_t ODR;' lib/cmsis_device_f4/Include/stm32f429xx.h", expectExitCode: 0 }, rubric: "The prediction gives 0x40021014, or shows the chain 0x40020000 + 0x1000 + 0x14. A wrong number with a sound chain counts as a pass, provided the difference is named after the comparison.", bloom: understand }
socratic:
  - { trigger: "task:address-arithmetic:stuck", question: { en: "Two additions in hex, nothing else. What is AHB1PERIPH_BASE as a number?", de: "Zwei Additionen im Hexsystem, mehr nicht. Welche Zahl ist AHB1PERIPH_BASE?" }, hints: [ { en: "The table 'Where the numbers come from' above gives every value you need.", de: "Die Tabelle „Woher die Zahlen kommen“ weiter oben nennt jeden Wert, den du brauchst." }, { en: "Add in hex column by column, from the right; there is no carry in this sum.", de: "Addiere im Hexsystem spaltenweise von rechts; in dieser Summe gibt es keinen Übertrag." }, { en: "Write the prediction down even if you are unsure — the point of this task is the comparison afterwards, not a perfect guess.", de: "Schreib die Vorhersage auch dann hin, wenn du unsicher bist — diese Aufgabe lebt vom Vergleich danach, nicht vom perfekten Raten." } ] }
---
## Learning goal

Read numbers the way hardware writes them: hexadecimal, split into bits, and with an address worked out from a base plus an offset.

## First: numbers with `0x` in front

From here on the text is full of numbers like `0x40020C18`. The `0x` says: this number is written in **hexadecimal**, base sixteen. It counts with sixteen digits — `0` to `9`, then `a` to `f` — instead of ten. `0x0a` is ten, `0x10` is sixteen, `0xff` is 255.

The reason hardware is written this way: **one hex digit is exactly four bits.** A bit is a single yes/no position, and hardware is addressed bit by bit. So any hex number can be read as bits without arithmetic:

| Hex digit | Bits | | Hex digit | Bits |
|---|---|---|---|---|
| `0` | `0000` | | `8` | `1000` |
| `1` | `0001` | | `9` | `1001` |
| `3` | `0011` | | `c` | `1100` |
| `7` | `0111` | | `f` | `1111` |

A worked example you will need again in `m2-02-mmio-gpio`. `0x0301` has four hex digits, each standing for four bits:

```
  0     3     0     1     hex digits
0000  0011  0000  0001   four bits each
  ^     ^^    ^      ^
 15..12 11..8  7..4   3..0   bit numbers
```

Counting positions from the **right**, starting at zero, **bits 0, 8 and 9** are set. Arithmetically: 1 + 256 + 512 = 769, and `0x0301` is 769. Watch the trap: the digit `3` does *not* stand for bits 0 and 1, it stands for bits 8 and 9 — which bits a hex digit means depends on the place it sits in.

And one notation that shows up everywhere: `1 << 3` means "take the number 1 and shift it three places to the left". `0001` becomes `1000` — exactly one bit set at position 3. That is how you write "the bit numbered *n*" without working out the number.

## Where the numbers come from

The addresses are not arbitrary; they are base plus **offset**. An offset is a distance: the number you add to a base address to reach one particular register. Adding is done in hex place by place from the right, exactly as in decimal — as long as no place grows past `f`, only that one place changes: `0x40020000 + 0x0C00` gives `0x40020C00`.

Every value below is in `lib/cmsis_device_f4/Include/stm32f429xx.h`:

| Name | Value |
|---|---|
| `PERIPH_BASE` | `0x40000000` |
| `AHB1PERIPH_BASE` | `PERIPH_BASE + 0x00020000` = `0x40020000` |
| `GPIOD_BASE` | `AHB1PERIPH_BASE + 0x0C00` = `0x40020C00` |
| `RCC_BASE` | `AHB1PERIPH_BASE + 0x3800` = `0x40023800` |
| GPIO offsets | `MODER` `0x00`, `IDR` `0x10`, `ODR` `0x14`, `BSRR` `0x18` |
| `AHB1ENR` offset inside RCC | `0x30` |

From which `RCC_AHB1ENR` = `0x40023800 + 0x30` = `0x40023830`. The GPIO ports sit `0x400` apart, which is why GPIOA is at `0x40020000`, GPIOB at `0x40020400`, and so on up to GPIOD at `0x40020C00`.

Instead of the raw casts, the firmware uses the vendor header's shorthand: `RCC->AHB1ENR` and `GPIOD->BSRR`. That is **the same thing** — `RCC` is defined as a pointer to a struct at address `0x40023800`, and `__IO` in the header is nothing other than `volatile`. The arrow notation only saves you the arithmetic.

## Your task

Predict an address before you look it up, then compare against the vendor header. Write the prediction down even if you are unsure — this task lives on the comparison, not on the guess.

**Where you work:** prediction into the text box on the task · open a file `Ctrl`/`Cmd`+`P` · check the task with the **Check** button on it.
