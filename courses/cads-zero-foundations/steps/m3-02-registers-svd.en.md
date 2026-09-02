---
id: m3-02-registers-svd
title: Core and peripheral registers, live
bloom: apply
objectives: [cz.debug.registers-svd]
requires: [m3-01-gdb-breakpoints]
estimatedMinutes: 15
links:
  - { step: m3-03-fault-forensics }
  - { file: "targets/itsboard/STM32F429.svd" }
  - { file: "targets/itsboard/hal/hal_clock.c", line: 46 }
  - { doc: "docs/how-to/vscode-setup.md" }
sources: [docs/how-to/vscode-setup.md, docs/how-to/debug.md, targets/itsboard/hal/hal_clock.c, targets/itsboard/hal/hal_io.c, docs/HARDWARE.md]
tasks:
  - id: peripherals-open
    title: Open the XPeripherals tree in a live session
    check: { type: manual }
  - id: read-rcc-gpio
    title: Read the clock and an output port from the registers
    check: { type: question, prompt: { en: "In a halted session, which RCC register and which bit tell you the external clock (HSE) is running, and which two bits of RCC_CFGR confirm the PLL is the system clock? Then: what does GPIOD->ODR hold, and how does that relate to OUT0..7 on the adapter?", de: "Welches RCC-Register und welches Bit zeigen in einer angehaltenen Sitzung, dass der externe Takt (HSE) läuft, und welche zwei Bits von RCC_CFGR bestätigen, dass die PLL der Systemtakt ist? Und: was steht in GPIOD->ODR, und wie hängt das mit OUT0..7 am Adapter zusammen?" }, rubric: "Names RCC->CR bit HSERDY (with HSEBYP set because the 8 MHz comes from the ST-Link's MCO); RCC_CFGR SWS bits 3:2 reading 10 (binary) for PLL as system clock; GPIOD->ODR holds the current output data of port D, whose pins PD0..PD7 are OUT0..7, so its low byte mirrors the last cads_hal_adapter_outputs() low byte (written via BSRR).", bloom: apply }
socratic:
  - { trigger: "task:peripherals-open:stuck", question: { en: "The XPeripherals panel says 'No active debug session'. Is the target actually halted at a breakpoint right now?", de: "Das XPeripherals-Panel meldet 'No active debug session'. Ist das Target gerade wirklich an einem Breakpoint angehalten?" }, hints: [ { en: "The tree only populates once a cortex-debug session is running; start it with F5 and stop at a breakpoint first.", de: "Der Baum füllt sich erst, wenn eine cortex-debug-Sitzung läuft; starte sie mit F5 und halte zuerst an einem Breakpoint." }, { en: "Peripheral values refresh on each halt; if they look stale, step once or pause the target.", de: "Peripheriewerte werden bei jedem Halt aktualisiert; wirken sie veraltet, mache einen Schritt oder pausiere das Target." }, { en: "Expand RCC, then CR, and look for HSERDY; expand GPIOD, then ODR.", de: "Klappe RCC, dann CR auf und suche HSERDY; klappe GPIOD, dann ODR auf." } ] }
---
## Learning goal

Read the STM32's own registers on the live board through the debugger, so you can answer hardware questions - is the clock right, what does an output pin hold - by looking rather than guessing.

## Core registers

With the target halted, the **Variables** panel has a **Registers** section: `r0`-`r12`, `sp`, `lr`, `pc`, `xPSR`. These are the CPU's state at the halt. `pc` is where execution will resume; `lr` is the return address of the current function; `sp` is the active stack pointer (MSP before the scheduler starts, PSP inside a task). You will need all three when you read a fault dump in the next step.

## Peripheral registers through the SVD

Raw core registers rarely answer the embedded question you have. What you want is "is `RCC->CR` showing HSE ready?" or "what is in `GPIOD->ODR`?". `cortex-debug` answers those with an **SVD file**: `targets/itsboard/STM32F429.svd` is STMicroelectronics' own description of every peripheral, register, field and reset value, vendored into the repository (Apache-2.0) and wired into the launch configuration. During a session an **XPeripherals** panel appears in the Run and Debug sidebar with every peripheral by name and base address; expand one for its registers and their live values. Outside a session it reads "No active debug session", which is correct.

## Two things worth reading right now

**The clock tree.** `targets/itsboard/hal/hal_clock.c` sets `RCC->CR` bits `HSEBYP` and `HSEON`, then spins until `HSERDY` is set - the 8 MHz reference is a square wave from the ST-Link's MCO, not a crystal, which is why *bypass* is on (`docs/HARDWARE.md`). The main PLL is then configured for 8 / 8 × 360 / 2 = 180 MHz, and `RCC->CFGR` is switched to the PLL. The confirmation that the switch happened is `SWS` (bits 3:2 of `RCC_CFGR`) reading `10` binary, which is also the register check `docs/tutorials/first-gate.md` names for a failing time-base assertion.

**An output port.** `cads_hal_adapter_outputs()` (`targets/itsboard/hal/hal_io.c`) writes OUT0..7 through `GPIOD->BSRR` in one atomic set-and-clear word, and OUT8..15 through `GPIOE->BSRR`. `BSRR` is write-only; the *result* is visible in `GPIOD->ODR`, whose low byte is the current state of PD0..PD7. Reading `ODR` in the debugger is therefore a way to confirm what the last output write actually did.

## Reading, not assuming

The project's own record has more than one case where a register read settled an argument that reasoning could not: the SPI-mutex boot hang was found by reading `BASEPRI` live (it was `0x50`, masking the DMA completion interrupt), and the "stuck at Reset_Handler" signature is a specific set of register values (`docs/ROADMAP.md`, 2026-08-26 and 2026-08-29 entries). The habit to build is: when the firmware's behaviour and your model of it disagree, read the register.

## Your task

Start a session, halt at your breakpoint from the previous step, open XPeripherals and expand `RCC` → `CR` and `GPIOD` → `ODR`. Then answer the question about which bits confirm the clock and what `ODR` holds. The next step uses the same registers to read a crash.
