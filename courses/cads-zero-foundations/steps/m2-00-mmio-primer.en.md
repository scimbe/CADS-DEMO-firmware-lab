---
id: m2-00-mmio-primer
title: How software reaches a pin
bloom: understand
objectives: [cz.mmio.registers]
requires: [m2-00-hex-and-bits]
estimatedMinutes: 12
scaffold: worked
links:
  - { step: m2-01-memory-map }
  - { file: "targets/itsboard/hal/hal_io.c", line: 24 }
  - { doc: "docs/HARDWARE.md" }
sources: [targets/itsboard/hal/hal_io.c, targets/itsboard/hal/hal_gpio.h, docs/HARDWARE.md]
tasks:
  - id: why-volatile
    title: Explain what happens without volatile
    check: { type: question, prompt: { en: "Why does a register access need volatile?", de: "Warum braucht ein Registerzugriff volatile?" }, rubric: "Without volatile the compiler may remove or merge the access, because nothing in the source it can see reads or writes that value. With hardware the access itself is the effect, so every access must happen exactly as written and exactly as often.", bloom: understand }
socratic:
  - { trigger: "question:why-volatile:weak", question: { en: "Imagine the compiler reading your code: it sees a value written and never read again. What is it allowed to do?", de: "Stell dir den Compiler beim Lesen deines Codes vor: er sieht einen Wert, der geschrieben und nie wieder gelesen wird. Was darf er damit tun?" }, hints: [ { en: "The compiler optimises for the program it can see. It cannot see the pin.", de: "Der Compiler optimiert für das Programm, das er sehen kann. Den Pin sieht er nicht." }, { en: "The section 'volatile: the word that keeps the access alive' argues it with the LED example.", de: "Der Abschnitt „volatile: das Wort, das den Zugriff am Leben hält“ führt es am LED-Beispiel vor." }, { en: "The key sentence has two halves: what the compiler is allowed to remove, and why with hardware the access itself is the effect.", de: "Der entscheidende Satz hat zwei Hälften: was der Compiler entfernen darf, und warum bei Hardware der Zugriff selbst die Wirkung ist." } ] }
---
## Learning goal

Understand how a piece of C code changes a voltage on a leg of the chip — and why one word in it, `volatile`, decides whether anything happens at all.

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

Just as important is what `volatile` does **not** do: it protects the access from the compiler, but it does not make it indivisible. Two accesses stay two accesses, and something else can run in between. That is the reason for the `BSRR` register in `m2-02-mmio-gpio`.

Without `volatile` the write disappears and the LED stays dark — no error, no warning. The code looks right and does nothing.

## Your task

Explain in your own words what happens without `volatile`. One sentence on what the compiler is allowed to remove, and one on why with hardware the access itself is the effect.

**Where you work:** answer into the text box on the task · check the task with the **Check** button.
