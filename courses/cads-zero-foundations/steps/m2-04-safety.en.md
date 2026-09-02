---
id: m2-04-safety
title: The hardware safety rules
bloom: understand
objectives: [firmware-safety]
requires: [m2-03-buttons]
estimatedMinutes: 15
links:
  - { step: m2-05-explorer-command }
  - { doc: "docs/SAFETY.md" }
  - { doc: "docs/HARDWARE.md" }
  - { file: "scripts/flash.sh", line: 20 }
sources: [docs/SAFETY.md, docs/HARDWARE.md, scripts/flash.sh, docs/reference/memory-map.md]
tasks:
  - id: read-safety
    title: Read docs/SAFETY.md in full
    check: { type: manual }
  - id: state-rules
    title: State the binding rules before touching a pin
    check: { type: question, prompt: { en: "Before you write any driver for this board, state the binding rules: which pins must never be repurposed and why; which adapter ports must never be configured as outputs and why; which flash address range the flashing tool may write; and which two flash operations are forbidden outright.", de: "Bevor du einen Treiber für dieses Board schreibst, nenne die verbindlichen Regeln: welche Pins nie umkonfiguriert werden dürfen und warum; welche Adapter-Ports nie als Ausgang konfiguriert werden dürfen und warum; welchen Flash-Adressbereich das Flash-Werkzeug beschreiben darf; und welche zwei Flash-Operationen rundweg verboten sind." }, rubric: "PA13/PA14 (SWDIO/SWCLK) and PB3 (SWO) are never touched because reconfiguring them costs debug access; PH0/PH1 carry the 8 MHz HSE bypass clock from the ST-Link and PH0 is an input. PF0..PF7 and PG0..PG5 are inputs that the adapter may be driving, so two push-pull drivers on one net could destroy the board. The flasher writes only 0x08000000-0x080FFFFF (bank 1); the filesystem sits at 0x08120000. Forbidden: any mass/chip erase, and any write to option bytes (FLASH_OPTCR / read protection).", bloom: understand }
socratic:
  - { trigger: "question:state-rules:weak", question: { en: "SAFETY.md has seven numbered sections. Which four of them name a pin, a port, or an address range, and what is the one-line rule of thumb at the top?", de: "SAFETY.md hat sieben nummerierte Abschnitte. Welche vier davon nennen einen Pin, einen Port oder einen Adressbereich, und wie lautet die einzeilige Faustregel ganz oben?" }, hints: [ { en: "Sections 1 (debug interface), 2 (clock input), 3 (adapter pin directions) and 4 (flash writes) carry the hard rules.", de: "Die Abschnitte 1 (Debug-Schnittstelle), 2 (Takteingang), 3 (Pinrichtungen des Adapters) und 4 (Flash-Schreibzugriffe) tragen die harten Regeln." }, { en: "The rule of thumb: when in doubt, do not drive the pin.", de: "Die Faustregel: im Zweifel den Pin nicht treiben." }, { en: "Flash: bank 1 only (0x08000000-0x080FFFFF), sector erase only, never option bytes.", de: "Flash: nur Bank 1 (0x08000000-0x080FFFFF), nur Sektorlöschen, nie Option-Bytes." } ] }
---
## Learning goal

Know the board's non-negotiable safety rules — protected pins, input-only ports, the flash window, and the two forbidden flash operations — before you write code that drives real silicon.

## Binding, not advisory

`docs/SAFETY.md` is binding for every change and every person or agent working on this repository. Most of the board is robust; a handful of things are not, and those are enumerated. The rule of thumb at the top: **when in doubt, do not drive the pin.**

## 1. Never touch the debug interface

| Pin | Function | Why |
|---|---|---|
| PA13 | SWDIO | Reconfiguring either pin costs debug access to the board. |
| PA14 | SWCLK | Recovery then needs the BOOT0 jumper and a serial bootloader. |
| PB3 | SWO | Trace output, left alone. |

Nothing in this firmware configures GPIOA pins 13/14 or GPIOB pin 3. The HAL initialises pins one at a time by name rather than writing whole `MODER` registers, precisely so a stray port-wide write cannot take SWD out. `cads_hal_pin_is_reserved()` exists so the explorer flags these pins and nobody is tempted to wire a button to one.

## 2. Never touch the clock input

PH0/PH1 carry the 8 MHz clock the ST-Link's own MCU feeds in. The PLL runs in `HSE_BYPASS`, so **PH0 is an input**; configuring it as an output fights the ST-Link's driver. Do not raise the clock beyond 180 MHz — scale 1, over-drive, 5 flash wait states is the documented maximum at 3.3 V.

## 3. Respect pin directions on the adapter

| Pins | Direction | Rule |
|---|---|---|
| PD0..PD7, PE0..PE7 | output | OUT0..15, LED banks. Safe to drive. |
| PF0..PF7 | **input** | IN0..7. **Never configure as output.** |
| PG0..PG5 | **input** | INT0..5. **Never configure as output.** |

Whatever the adapter has wired to PF/PG may be actively driving those nets. Two push-pull drivers on one net is how boards die. `hal_io.c` configures them as pulled-up inputs and never changes that.

## 4. Flash writes are confined

| Region | Address | Use |
|---|---|---|
| Firmware | `0x08000000` – `0x080FFFFF` | bank 1, written only by the flashing tool |
| Reserved | `0x08100000` – `0x0811FFFF` | left erased |
| Filesystem | `0x08120000` – `0x081FFFFF` | bank 2, the littlefs volume |

- **No mass erase, ever.** It would take the filesystem with it and could touch option bytes. `scripts/flash.sh` uses `st-flash write`, which sector-erases only the range being written, and refuses an image larger than 1 MB.
- **Never write option bytes.** Read protection (RDP level 1 or 2) is either annoying or permanent; nothing here writes `FLASH_OPTCR`.
- The on-device flash driver refuses any address below `0x08120000` — that figure is the filesystem floor, not a constraint on the external flasher.

## 5–7 in brief

The display bus is write-only; the ILI9486 power and gamma registers are the vendor's and stay as they are, because wrong drive voltages can physically damage a TFT. `SPI1_MOSI` and `ETH_RMII_CRS_DV` share PA7, so the display is never written outside `cads_hal_spi_claim_bus()`/`release_bus()`. Every probe or serial interaction runs under a timeout; `Default_Handler` and `cads_hal_panic()` execute `bkpt #0`, which without a debugger presents as a lock-up with the red LED on — the intended safe failure mode.

## Your task

Read `docs/SAFETY.md` completely, then state the rules from memory in the question. You are about to add code to the explorer; these are the constraints it must respect.
