---
id: m2-04-safety
title: The hardware safety rules
bloom: understand
objectives: [firmware-safety]
requires: [m2-03-buttons]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m2-00-mmio-primer, m2-01-memory-map]
links:
  - { step: m2-05-explorer-command }
  - { doc: "docs/SAFETY.md" }
  - { doc: "docs/HARDWARE.md" }
  - { file: "scripts/flash.sh", line: 20 }
sources: [docs/SAFETY.md, docs/HARDWARE.md, scripts/flash.sh, docs/reference/memory-map.md]
tasks:
  - id: read-safety
    title: Show by machine that no app code reconfigures the input ports
    check: { type: command, cwd: ".", command: "! grep -rn 'GPIO[FG]->MODER' apps/", expectExitCode: 0 }
  - id: state-rules
    title: Rank the two forbidden flash operations by the damage they do
    check: { type: question, prompt: { en: "Why is a wrong write to FLASH_OPTCR worse than an accidental mass erase?", de: "Warum ist ein falscher Schreibzugriff auf FLASH_OPTCR schlimmer als ein versehentliches Mass-Erase?" }, rubric: "A mass erase destroys contents: the firmware and the littlefs volume in bank 2. Both can be written again, so the loss is data and time. A write to FLASH_OPTCR changes the part's permanent configuration bits instead: RDP level 1 locks debug access to the flash and can only be taken back at the price of a full erase, while RDP level 2 locks it for good and cannot be undone at all — after that the board can neither be debugged nor reflashed. The answer must name the difference between reversible and irreversible; merely listing both operations is not enough.", bloom: understand }
  - id: protected-pins
    title: Predict what a port-wide MODER write takes with it
    check: { type: question, prompt: { en: "A driver writes GPIOA->MODER in one go instead of pin by pin. Which access do you lose?", de: "Ein Treiber schreibt GPIOA->MODER in einem Rutsch statt Pin für Pin. Welchen Zugang verlierst du dabei?" }, rubric: "One MODER write sets the direction of all sixteen pins of the port at once, PA13 and PA14 included. Those are SWDIO and SWCLK, the two lines of the debug interface: once reconfigured, the board stops answering the ST-Link, there is no debugging and no flashing over SWD, and recovery needs the BOOT0 jumper and a serial bootloader. That is exactly why the HAL initialises pins one at a time by name. The answer must trace the path from PA13/PA14 to the lost debug access, not just say the word SWD.", bloom: understand }
socratic:
  - { trigger: "task:read-safety:failed", question: { en: "The grep found a write to the mode register of an input port under apps/. Where did that line come from?", de: "Der Grep hat unter apps/ einen Schreibzugriff auf das Moderegister eines Eingangsports gefunden. Woher stammt diese Zeile?" }, hints: [ { en: "Could a quick experiment of your own have configured PF or PG as an output, perhaps to make an LED blink?", de: "Könnte ein schneller eigener Versuch PF oder PG als Ausgang konfiguriert haben, vielleicht um eine LED blinken zu lassen?" }, { en: "The check is a grep over apps/. Open a terminal (menu Terminal, New Terminal) and run it yourself: grep -rn 'GPIO[FG]->MODER' apps/ prints file and line.", de: "Der Check ist ein Grep über apps/. Öffne ein Terminal (Menü Terminal, New Terminal) und lass ihn selbst laufen: grep -rn 'GPIO[FG]->MODER' apps/ nennt Datei und Zeile." }, { en: "PF and PG are inputs because whatever the adapter has wired there may be driving those nets. The line has to go, not be rewritten.", de: "PF und PG sind Eingänge, weil das, was der Adapter dort angeschlossen hat, diese Netze treiben kann. Die Zeile gehört gelöscht, nicht umgeschrieben." } ] }
  - { trigger: "question:state-rules:weak", question: { en: "Both operations do damage. After which of the two can you still put the board back the way it was?", de: "Beide Operationen richten Schaden an. Nach welcher der beiden kannst du das Board noch in den alten Zustand bringen?" }, hints: [ { en: "Is the difference in how much is destroyed, or in whether the destruction can be taken back?", de: "Liegt der Unterschied in der Menge des Zerstörten, oder darin, ob es sich zurücknehmen lässt?" }, { en: "Section 4 names both operations. Look up what RDP stands for in the paragraph on option bytes, and what its two levels do differently.", de: "Der Abschnitt 4 nennt beide Operationen. Sieh im Absatz über die Option-Bytes nach, wofür RDP steht und was seine beiden Stufen unterschiedlich tun." }, { en: "One of the two levels has no way back at all, and what it locks is the very access this course needs in every module from M3 onwards.", de: "Eine der beiden Stufen hat gar keinen Rückweg, und was sie sperrt, ist genau der Zugang, den dieser Kurs ab M3 in jedem Modul braucht." } ] }
  - { trigger: "question:protected-pins:weak", question: { en: "Which pins of port A does a port-wide write carry along that you were not thinking about?", de: "Welche Pins von Port A trägt ein portweiter Schreibzugriff mit, an die du gar nicht gedacht hast?" }, hints: [ { en: "Is your answer about the pin the driver wanted, or about the pins it took along by accident?", de: "Handelt deine Antwort vom Pin, den der Treiber wollte, oder von den Pins, die er nebenbei mitgenommen hat?" }, { en: "Compare the pin numbers in the table of section 1 with the number of pins one MODER register covers, given in the paragraph right above it.", de: "Vergleich die Pinnummern in der Tabelle des Abschnitts 1 mit der Zahl der Pins, die ein MODER-Register abdeckt — sie steht im Absatz direkt darüber." }, { en: "Ask what the ST-Link still has to talk to after that write, and what recovering it would cost in hardware terms.", de: "Frag, womit die ST-Link nach diesem Schreibzugriff noch reden soll, und was eine Wiederherstellung an Hardware kosten würde." } ] }
misconceptions:
  - { pattern: "GPIO[FG]->MODER", question: { en: "The grep names a file and a line. Does that line configure an input port as an output?", de: "Der Grep nennt Datei und Zeile. Konfiguriert diese Zeile einen Eingangsport als Ausgang?" }, hints: [ { en: "Was the line meant as a quick test, and did it stay behind afterwards?", de: "War die Zeile als schneller Test gemeint, und ist sie danach liegengeblieben?" }, { en: "Open the named file with Ctrl/Cmd+P and delete the write; nothing under apps/ needs to set a pin direction.", de: "Öffne die genannte Datei mit Strg/Cmd+P und entferne den Schreibzugriff; nichts unter apps/ muss eine Pinrichtung setzen." }, { en: "Apps drive outputs through the HAL, which has already set every direction once in cads_hal_io_init().", de: "Apps treiben Ausgänge über die HAL, die jede Richtung in cads_hal_io_init() bereits einmal gesetzt hat." } ] }
---
## Learning goal

Know the board's non-negotiable safety rules — protected pins, input-only ports, the flash window, and the two forbidden flash operations — before you write code that drives real silicon.

## Binding, not advisory

`docs/SAFETY.md` is binding for every change and every person or agent working on this repository. Most of the board is robust; a handful of things are not, and those are enumerated. The rule of thumb at the top: **when in doubt, do not drive the pin.**

## 1. Never touch the debug interface

One word first, because it turns up three times below: `MODER` is a GPIO port's *mode register*. Two bits in it set the direction of one pin — input, output, alternate function or analog — and one `MODER` covers all sixteen pins of its port in a single 32-bit word.

| Pin | Function | Why |
|---|---|---|
| PA13 | SWDIO | Reconfiguring either pin costs debug access to the board. |
| PA14 | SWCLK | Recovery then needs the BOOT0 jumper and a serial bootloader. |
| PB3 | SWO | Trace output, left alone. |

Nothing in this firmware configures GPIOA pins 13/14 or GPIOB pin 3. The HAL initialises pins one at a time by name rather than writing whole `MODER` registers — that is not an inconvenience, it is the point. `cads_hal_pin_is_reserved()` exists so the explorer flags these pins; you saw the flag in the transcript of the previous step.

## 2. Never touch the clock input

PH0/PH1 carry the 8 MHz clock the ST-Link's own MCU feeds in. The **PLL** (*phase-locked loop*) is the circuit inside the chip that multiplies that up into the fast system clock; here it runs in `HSE_BYPASS`, which means no crystal of our own oscillates at the clock input — a finished clock signal is fed in from outside. That is why **PH0 is an input**; configured as an output it fights the ST-Link's driver.

Do not raise the clock beyond 180 MHz. Scale 1, over-drive and 5 flash wait states is the documented maximum at 3.3 V — **over-drive** is a mode of the chip's internal voltage regulator without which 180 MHz is not permitted, and a **flash wait state** is a cycle the CPU spends waiting when it reads from flash, because that memory is slower than the core.

## 3. Respect pin directions on the adapter

| Pins | Direction | Rule |
|---|---|---|
| PD0..PD7, PE0..PE7 | output | OUT0..15, LED banks. Safe to drive. |
| PF0..PF7 | **input** | IN0..7. **Never configure as output.** |
| PG0..PG5 | **input** | INT0..5. **Never configure as output.** |

Whatever the adapter has wired to PF/PG may be actively driving those nets. A **net** here is one electrically continuous connection: everything attached to it sees the same voltage. A **push-pull** output drives its line actively high *and* actively low — when two of them meet on one net with different opinions, the short-circuit current runs through both drivers. That is how boards die. `hal_io.c` configures PF and PG as pulled-up inputs and never changes that.

The first task of this step checks exactly this rule by machine: a `grep` over `apps/` must not find a write to `GPIOF->MODER` or `GPIOG->MODER`.

## 4. Flash writes are confined

You know the flash layout from `m2-01`; what counts here is who may write where:

| Region | Address | Use |
|---|---|---|
| Firmware | `0x08000000` – `0x080FFFFF` | bank 1, written only by the flashing tool |
| Reserved | `0x08100000` – `0x0811FFFF` | left erased |
| Filesystem | `0x08120000` – `0x081FFFFF` | bank 2, the littlefs volume |

Two operations are forbidden outright:

- **No mass erase, ever.** A chip erase would take the filesystem with it. `scripts/flash.sh` uses `st-flash write`, which erases only the sectors it writes, and refuses an image larger than 1 MB.
- **Never write option bytes.** `FLASH_OPTCR` is the *option control register*, through which the part's permanent configuration bits are written. Among them sits **RDP** (*read-out protection*): level 1 locks debug access to the flash and can only be taken back at the price of a full erase, level 2 locks it for good and cannot be undone. Nothing in this repository writes that register.

Which of the two is the worse one, and why, is the second task.

## 5–7 in brief

The display bus is write-only; the ILI9486 power and gamma registers are the vendor's and stay as they are, because wrong drive voltages can physically damage a TFT. `SPI1_MOSI` and `ETH_RMII_CRS_DV` share PA7, so the display is never written outside `cads_hal_spi_claim_bus()`/`release_bus()`; the full story of that is in M3.

Every probe or serial interaction runs under a timeout. `Default_Handler` — the catch-all routine for every interrupt that has no handler of its own — and `cads_hal_panic()` execute `bkpt #0`, a machine instruction that halts the core and hands it to an attached debugger. Without a debugger it escalates to a HardFault, which presents as a lock-up with the red LED on: the intended safe failure mode.

## Your task

Three tasks, each on its own.

First you run the `grep` that demonstrates rule 3 — the **Check** button on the task starts it, and you can type the same command yourself in a terminal (menu *Terminal → New Terminal*). Then you rank the two forbidden flash operations by the damage they do. Last you predict what a port-wide `MODER` write on port A takes with it.

Read `docs/SAFETY.md` once in full before you answer the second and third task; open the file with `Ctrl`/`Cmd`+`P` and the typed file name. You are about to add code of your own to the explorer — these are the constraints it must respect.
