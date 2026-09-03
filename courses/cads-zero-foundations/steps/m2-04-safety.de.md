---
id: m2-04-safety
title: Die Hardware-Sicherheitsregeln
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
    title: Lies docs/SAFETY.md vollständig
    check: { type: manual }
  - id: state-rules
    title: Nenne die verbindlichen Regeln, bevor du einen Pin anfasst
    check: { type: question, prompt: { en: "Before you write any driver for this board, state the binding rules: which pins must never be repurposed and why; which adapter ports must never be configured as outputs and why; which flash address range the flashing tool may write; and which two flash operations are forbidden outright.", de: "Bevor du einen Treiber für dieses Board schreibst, nenne die verbindlichen Regeln: welche Pins nie umkonfiguriert werden dürfen und warum; welche Adapter-Ports nie als Ausgang konfiguriert werden dürfen und warum; welchen Flash-Adressbereich das Flash-Werkzeug beschreiben darf; und welche zwei Flash-Operationen rundweg verboten sind." }, rubric: "PA13/PA14 (SWDIO/SWCLK) und PB3 (SWO) werden nie angefasst, weil ihre Umkonfiguration den Debug-Zugang kostet; PH0/PH1 führen den 8-MHz-HSE-Bypass-Takt der ST-Link, PH0 ist ein Eingang. PF0..PF7 und PG0..PG5 sind Eingänge, die der Adapter treiben kann, zwei Push-Pull-Treiber auf einem Netz können das Board zerstören. Der Flasher schreibt nur 0x08000000-0x080FFFFF (Bank 1); das Dateisystem liegt bei 0x08120000. Verboten: jedes Mass-/Chip-Erase und jedes Schreiben von Option-Bytes (FLASH_OPTCR / Leseschutz).", bloom: understand }
socratic:
  - { trigger: "question:state-rules:weak", question: { en: "SAFETY.md has seven numbered sections. Which four of them name a pin, a port, or an address range, and what is the one-line rule of thumb at the top?", de: "SAFETY.md hat sieben nummerierte Abschnitte. Welche vier davon nennen einen Pin, einen Port oder einen Adressbereich, und wie lautet die einzeilige Faustregel ganz oben?" }, hints: [ { en: "Sections 1 (debug interface), 2 (clock input), 3 (adapter pin directions) and 4 (flash writes) carry the hard rules.", de: "Die Abschnitte 1 (Debug-Schnittstelle), 2 (Takteingang), 3 (Pinrichtungen des Adapters) und 4 (Flash-Schreibzugriffe) tragen die harten Regeln." }, { en: "The rule of thumb: when in doubt, do not drive the pin.", de: "Die Faustregel: im Zweifel den Pin nicht treiben." }, { en: "Flash: bank 1 only (0x08000000-0x080FFFFF), sector erase only, never option bytes.", de: "Flash: nur Bank 1 (0x08000000-0x080FFFFF), nur Sektorlöschen, nie Option-Bytes." } ] }
---
## Lernziel

Kenne die nicht verhandelbaren Sicherheitsregeln des Boards — geschützte Pins, Nur-Eingangs-Ports, das Flash-Fenster und die zwei verbotenen Flash-Operationen —, bevor du Code schreibst, der echtes Silizium treibt.

## Verbindlich, nicht beratend

`docs/SAFETY.md` ist verbindlich für jede Änderung und jede Person oder jeden Agenten, die an diesem Repository arbeiten. Das meiste am Board ist robust; eine Handvoll Dinge nicht, und die sind aufgezählt. Die Faustregel ganz oben: **im Zweifel den Pin nicht treiben.**

## 1. Die Debug-Schnittstelle nie anfassen

| Pin | Funktion | Warum |
|---|---|---|
| PA13 | SWDIO | Eine Umkonfiguration kostet den Debug-Zugang zum Board. |
| PA14 | SWCLK | Die Wiederherstellung braucht dann den BOOT0-Jumper und einen seriellen Bootloader. |
| PB3 | SWO | Trace-Ausgang, bleibt unberührt. |

Nichts in dieser Firmware konfiguriert GPIOA-Pins 13/14 oder GPIOB-Pin 3. Die HAL initialisiert Pins einzeln beim Namen statt ganze `MODER`-Register zu schreiben, genau damit ein verirrter portweiter Schreibzugriff SWD nicht abschalten kann. `cads_hal_pin_is_reserved()` existiert, damit der Explorer diese Pins markiert und niemand versucht ist, einen Taster daran zu hängen.

## 2. Den Takteingang nie anfassen

PH0/PH1 führen den 8-MHz-Takt, den der eigene MCU der ST-Link einspeist. Die PLL läuft im `HSE_BYPASS`, also ist **PH0 ein Eingang**; als Ausgang konfiguriert kämpft er gegen den Treiber der ST-Link. Erhöhe den Takt nicht über 180 MHz — Scale 1, Over-Drive, 5 Flash-Waitstates ist das dokumentierte Maximum bei 3,3 V.

## 3. Pinrichtungen am Adapter respektieren

| Pins | Richtung | Regel |
|---|---|---|
| PD0..PD7, PE0..PE7 | Ausgang | OUT0..15, LED-Bänke. Sicher zu treiben. |
| PF0..PF7 | **Eingang** | IN0..7. **Nie als Ausgang konfigurieren.** |
| PG0..PG5 | **Eingang** | INT0..5. **Nie als Ausgang konfigurieren.** |

Was auch immer der Adapter an PF/PG angeschlossen hat, kann diese Netze aktiv treiben. Zwei Push-Pull-Treiber auf einem Netz — so sterben Boards. `hal_io.c` konfiguriert sie als Eingänge mit Pull-up und ändert das nie.

## 4. Flash-Schreibzugriffe sind eingegrenzt

| Bereich | Adresse | Verwendung |
|---|---|---|
| Firmware | `0x08000000` – `0x080FFFFF` | Bank 1, nur vom Flash-Werkzeug beschrieben |
| Reserviert | `0x08100000` – `0x0811FFFF` | bleibt gelöscht |
| Dateisystem | `0x08120000` – `0x081FFFFF` | Bank 2, das littlefs-Volume |

- **Niemals ein Mass-Erase.** Es nähme das Dateisystem mit und könnte Option-Bytes berühren. `scripts/flash.sh` nutzt `st-flash write`, das nur den geschriebenen Bereich sektorweise löscht, und verweigert ein Image über 1 MB.
- **Nie Option-Bytes schreiben.** Leseschutz (RDP Level 1 oder 2) ist entweder lästig oder endgültig; nichts hier schreibt `FLASH_OPTCR`.
- Der Flash-Treiber auf dem Gerät verweigert jede Adresse unter `0x08120000` — diese Zahl ist der Boden des Dateisystems, keine Grenze für den externen Flasher.

## 5–7 in Kürze

Der Displaybus ist nur beschreibbar; die Power- und Gamma-Register des ILI9486 stammen vom Hersteller und bleiben, wie sie sind, weil falsche Treiberspannungen ein TFT physisch beschädigen können. `SPI1_MOSI` und `ETH_RMII_CRS_DV` teilen sich PA7, deshalb wird das Display nie außerhalb von `cads_hal_spi_claim_bus()`/`release_bus()` beschrieben. Jede Probe- oder Serieninteraktion läuft unter einem Timeout; `Default_Handler` und `cads_hal_panic()` führen `bkpt #0` aus, was ohne Debugger als Blockade mit leuchtender roter LED erscheint — der beabsichtigte sichere Fehlermodus.

## Deine Aufgabe

Lies `docs/SAFETY.md` vollständig und gib die Regeln dann in der Frage aus dem Gedächtnis wieder. Gleich fügst du dem Explorer Code hinzu; das sind die Randbedingungen, die er einhalten muss.
