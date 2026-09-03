---
id: m2-00-mmio-primer
title: How software reaches a pin — addresses, volatile, register names
bloom: understand
objectives: [cz.mmio.registers]
requires: [m1-04-splash]
estimatedMinutes: 20
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
  - id: why-volatile
    title: Explain what happens without volatile
    check: { type: question, prompt: { en: "Why does a register access need volatile?", de: "Warum braucht ein Registerzugriff volatile?" }, rubric: "Without volatile the compiler may remove or merge the access, because nothing in the source it can see reads or writes that value. With hardware the access itself is the effect, so every access must happen exactly as written and exactly as often.", bloom: understand }
  - id: register-naming
    title: Take the name RCC_AHB1ENR apart
    check: { type: question, prompt: { en: "Using the same pattern, what do RCC_APB2ENR and RCC_AHB1RSTR say?", de: "Was sagen nach demselben Muster RCC_APB2ENR und RCC_AHB1RSTR?" }, rubric: "RCC_APB2ENR is the enable register (ENR) for the units on bus APB2; RCC_AHB1RSTR is the reset register (RSTR) for the units on bus AHB1. In both, RCC is the unit, the middle part is the bus and the last part is the register's job. The answer must take both names apart, not just one.", bloom: understand }
socratic:
  - { trigger: "task:address-arithmetic:stuck", question: { en: "Two additions in hex, nothing else. What is AHB1PERIPH_BASE as a number?", de: "Zwei Additionen im Hexsystem, mehr nicht. Welche Zahl ist AHB1PERIPH_BASE?" }, hints: [ { en: "The table 'Where the numbers come from' above gives every value you need.", de: "Die Tabelle „Woher die Zahlen kommen“ weiter oben nennt jeden Wert, den du brauchst." }, { en: "Add in hex column by column, from the right; there is no carry in this sum.", de: "Addiere im Hexsystem spaltenweise von rechts; in dieser Summe gibt es keinen Übertrag." }, { en: "Write the prediction down even if you are unsure — the point of this task is the comparison afterwards, not a perfect guess.", de: "Schreib die Vorhersage auch dann hin, wenn du unsicher bist — diese Aufgabe lebt vom Vergleich danach, nicht vom perfekten Raten." } ] }
  - { trigger: "question:why-volatile:weak", question: { en: "Imagine the compiler reading your code: it sees a value written and never read again. What is it allowed to do?", de: "Stell dir den Compiler beim Lesen deines Codes vor: er sieht einen Wert, der geschrieben und nie wieder gelesen wird. Was darf er damit tun?" }, hints: [ { en: "The compiler optimises for the program it can see. It cannot see the pin.", de: "Der Compiler optimiert für das Programm, das er sehen kann. Den Pin sieht er nicht." }, { en: "The section 'volatile: the word that keeps the access alive' argues it with the LED example.", de: "Der Abschnitt „volatile: das Wort, das den Zugriff am Leben hält“ führt es am LED-Beispiel vor." }, { en: "The key sentence has two halves: what the compiler is allowed to remove, and why with hardware the access itself is the effect.", de: "Der entscheidende Satz hat zwei Hälften: was der Compiler entfernen darf, und warum bei Hardware der Zugriff selbst die Wirkung ist." } ] }
  - { trigger: "question:register-naming:weak", question: { en: "Split the name at the underscores first. How many parts do you get, and which one is a bus?", de: "Zerleg den Namen zuerst an den Unterstrichen. Wie viele Teile bekommst du, und welcher davon ist ein Bus?" }, hints: [ { en: "Compare it with RCC_APB1ENR and RCC_AHB1RSTR: what stays, what changes?", de: "Vergleich ihn mit RCC_APB1ENR und RCC_AHB1RSTR: was bleibt, was ändert sich?" }, { en: "The table 'How the names are built' above has one row per part.", de: "Die Tabelle „Wie die Namen gebaut sind“ weiter oben hat eine Zeile je Teil." }, { en: "The last part is always the register's job. ENR is short for enable register; RSTR would be the reset register of the same bus.", de: "Der letzte Teil ist immer die Aufgabe des Registers. ENR steht für Enable Register; RSTR wäre das Reset-Register desselben Busses." } ] }
---
## Learning goal

Understand how a piece of C code changes a voltage on a leg of the chip at all — and how to read the names that show up while it does.

## First: numbers with `0x` in front

From here on the text is full of numbers like `0x40020C18`. The `0x` says: this number is written in **hexadecimal**, base sixteen. It counts with sixteen digits — `0` to `9`, then `a` to `f` — instead of ten. `0x0a` is ten, `0x10` is sixteen, `0xff` is 255.

The reason hardware is written this way: **one hex digit is exactly four bits.** A bit is a single yes/no position, and hardware is addressed bit by bit. So any hex number can be read as bits without arithmetic:

| Hex digit | Bits | | Hex digit | Bits |
|---|---|---|---|---|
| `0` | `0000` | | `8` | `1000` |
| `1` | `0001` | | `9` | `1001` |
| `3` | `0011` | | `c` | `1100` |
| `7` | `0111` | | `f` | `1111` |

A worked example you will need again in `m2-02`. `0x0301` has four hex digits, each standing for four bits:

```
  0     3     0     1     hex digits
0000  0011  0000  0001   four bits each
  ^     ^^    ^      ^
 15..12 11..8  7..4   3..0   bit numbers
```

Counting positions from the **right**, starting at zero, **bits 0, 8 and 9** are set. Arithmetically: 1 + 256 + 512 = 769, and `0x0301` is 769. Watch the trap: the digit `3` does *not* stand for bits 0 and 1, it stands for bits 8 and 9 — which bits a hex digit means depends on the place it sits in.

And one notation that shows up everywhere: `1 << 3` means "take the number 1 and shift it three places to the left". `0001` becomes `1000` — exactly one bit set at position 3. That is how you write "the bit numbered *n*" without working out the number.

## A microcontroller has no instruction for "turn pin 3 on"

The processor core can compute, branch, load and store. That is all. It has no instruction for light-emitting diodes.

The trick is that the chip's hardware blocks — the GPIO ports, the timers, the serial interface — are placed at **addresses**, exactly like memory locations. When the CPU writes a number to address `0x40020C18`, that changes no variable; it changes voltages on real legs of the package. When it reads from `0x40020C10`, it gets back which voltage is present there right now.

That is what **memory-mapped I/O** means: operating hardware by writing to or reading from an address. Such a memory location with a hardware effect is called a **register**. A *store*, in this context, is nothing more than the machine instruction that writes a value to an address.

## How you write that in C

```c
*(volatile uint32_t *)0x40020C18 = (1u << 3);
```

Read from the inside out:

| Part | Meaning |
|---|---|
| `0x40020C18` | the address, an ordinary number |
| `(uint32_t *)` | "treat this number as a pointer to a 32-bit value" |
| `volatile` | "and do not optimise the access away" (more on that in a moment) |
| `*…` | the star at the front: "and now write to, or read from, that place" |
| `(1u << 3)` | the value: exactly bit 3 set |

When this line meets you in the firmware's source — including in the form `#define GPIOD_BSRR (*(volatile uint32_t *)0x40020C18)`, so that afterwards one can simply write `GPIOD_BSRR = …` — it is always the same thing: a number is declared to be an address, and at that address sits hardware.

## `volatile`: the word that keeps the access alive

`volatile` is the most important ingredient, and it is the only one you cannot see when it is missing.

A compiler optimises for the program in front of it. If it sees a value written to an address and never read back, it may drop the write — apparently nothing changes. If it sees the same address read twice in a row, it may skip the second read and reuse the first value.

For ordinary variables both are correct. For hardware both are fatal, because **the access itself is the effect**: the write *is* the switching on of the LED, and the second read may find a different value because somebody pressed a button in between. `volatile` tells the compiler: "Something is at work here that you cannot see. Perform every access exactly as written and exactly as often."

Just as important is what `volatile` does **not** do: it protects the access from the compiler, but it does not make it indivisible. Two accesses stay two accesses, and something else can run in between. That is the reason for the `BSRR` register in `m2-02`.

Without `volatile` the write disappears and the LED stays dark — no error, no warning. The code looks right and does nothing.

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

Three short tasks, each on its own. First you predict an address and then compare it against what the vendor header says. Then you explain in your own words what happens without `volatile`. Last you take the name `RCC_AHB1ENR` apart into its three pieces.
