---
id: m0-02-connect
title: Connect the board
bloom: understand
objectives: [firmware-hardware]
requires: [m0-01-welcome]
estimatedMinutes: 10
links:
  - { step: m0-03-build }
  - { doc: "docs/how-to/flash.md" }
  - { file: "scripts/cads_env.sh", line: 28 }
sources: [docs/HARDWARE.md, docs/how-to/flash.md, docs/reference/explorer-console.md]
tasks:
  - id: connected
    title: The board reports as connected
    check: { type: board, state: connected }
  - id: probe-identity
    title: What the probe is, and what it carries
    check: { type: question, prompt: { en: "The board connects to your computer over one debug probe. What is that probe, what two roles does it play, and what is the fixed serial number this repository is developed against?", de: "Das Board verbindet sich über eine Debug-Probe mit deinem Rechner. Was ist diese Probe, welche zwei Rollen spielt sie, und welche feste Seriennummer ist im Repository hinterlegt?" }, rubric: "Names the on-board ST-Link/V2-1, that it provides both SWD debug access and the USART3 virtual COM port (serial console), and the serial 066FFF565282494867161033.", bloom: understand }
socratic:
  - { trigger: "task:connected:failed", question: { en: "When you asked the browser to share a device, which vendor did the chooser filter for, and did you pick the ST-Link rather than another USB device?", de: "Als der Browser dich um die Gerätefreigabe bat, nach welchem Hersteller filterte der Dialog, und hast du die ST-Link statt eines anderen USB-Geräts gewählt?" }, hints: [ { en: "The chooser filters on vendor id 0x0483 (STMicroelectronics).", de: "Der Dialog filtert auf Vendor-ID 0x0483 (STMicroelectronics)." }, { en: "Pick the device whose serial matches 066FFF565282494867161033.", de: "Wähle das Gerät, dessen Seriennummer 066FFF565282494867161033 lautet." }, { en: "If nothing appears, replug the ST-Link and re-run the Connect command, then retry the chooser.", de: "Erscheint nichts, stecke die ST-Link neu ein, führe den Connect-Befehl erneut aus und öffne den Dialog nochmals." } ] }
---
## Learning goal

Get the board recognised by the lab, and understand what the single USB link between your computer and the board actually carries.

## One probe, two jobs

The NUCLEO-F429ZI has an **ST-Link/V2-1 debug probe built onto it**. That one probe does two separate things over a single USB cable:

1. **SWD** — the two-wire serial-wire-debug interface (`SWDIO` on PA13, `SWCLK` on PA14). Everything that flashes, halts, steps or reads memory goes through here.
2. **A virtual COM port** — the STM32's USART3 is bridged to a USB serial device, so the firmware's console appears on your computer at 115200 baud, 8N1.

So "connect the board" means giving the browser permission to talk to that probe. In this lab the Connect command opens the native device chooser; it filters for STMicroelectronics' vendor id `0x0483`. Pick the ST-Link, and from then on the bridge can reach it without asking again, even across a replug.

## The board this repository knows

The reference board's probe has a fixed serial, `066FFF565282494867161033` (`docs/HARDWARE.md`, and `scripts/cads_env.sh` exports it as `CADS_STLINK_SERIAL`). The flashing and debug tooling default to exactly that probe, so with more than one ST-Link attached the right one is still selected. `st-info --probe` reports the same identity:

```
serial:     066FFF565282494867161033
chipid:     0x419          -> STM32F42x/F43x
flash:      2097152 (pagesize: 16384)
```

## Why the board is at your computer, not the server

The IDE runs on a container, but the board hangs off your own machine. Server-side USB passthrough would be the wrong architecture — the board is not on the server — so the connection is made in your browser and relayed to the container's bridge. This is why you, not an admin, click the chooser.

## Your task

Use the Connect command so the board reports as connected, then answer one question about what the ST-Link is and carries. Once connected, the next step builds the firmware.
