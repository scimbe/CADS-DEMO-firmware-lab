---
id: m3-02-registers-svd
title: Kern- und Peripherieregister, live
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
    title: Den XPeripherals-Baum in einer laufenden Sitzung öffnen
    check: { type: manual }
  - id: read-rcc-gpio
    title: Takt und einen Ausgangsport aus den Registern lesen
    check: { type: question, prompt: { en: "In a halted session, which RCC register and which bit tell you the external clock (HSE) is running, and which two bits of RCC_CFGR confirm the PLL is the system clock? Then: what does GPIOD->ODR hold, and how does that relate to OUT0..7 on the adapter?", de: "Welches RCC-Register und welches Bit zeigen in einer angehaltenen Sitzung, dass der externe Takt (HSE) läuft, und welche zwei Bits von RCC_CFGR bestätigen, dass die PLL der Systemtakt ist? Und: was steht in GPIOD->ODR, und wie hängt das mit OUT0..7 am Adapter zusammen?" }, rubric: "Nennt RCC->CR Bit HSERDY (mit gesetztem HSEBYP, weil die 8 MHz vom MCO der ST-Link kommen); RCC_CFGR SWS Bits 3:2 lesen binär 10 für PLL als Systemtakt; GPIOD->ODR hält die aktuellen Ausgangsdaten von Port D, dessen Pins PD0..PD7 OUT0..7 sind, sein niederwertiges Byte spiegelt also das zuletzt per cads_hal_adapter_outputs() (über BSRR) geschriebene Low-Byte.", bloom: apply }
socratic:
  - { trigger: "task:peripherals-open:stuck", question: { en: "The XPeripherals panel says 'No active debug session'. Is the target actually halted at a breakpoint right now?", de: "Das XPeripherals-Panel meldet 'No active debug session'. Ist das Target gerade wirklich an einem Breakpoint angehalten?" }, hints: [ { en: "The tree only populates once a cortex-debug session is running; start it with F5 and stop at a breakpoint first.", de: "Der Baum füllt sich erst, wenn eine cortex-debug-Sitzung läuft; starte sie mit F5 und halte zuerst an einem Breakpoint." }, { en: "Peripheral values refresh on each halt; if they look stale, step once or pause the target.", de: "Peripheriewerte werden bei jedem Halt aktualisiert; wirken sie veraltet, mache einen Schritt oder pausiere das Target." }, { en: "Expand RCC, then CR, and look for HSERDY; expand GPIOD, then ODR.", de: "Klappe RCC, dann CR auf und suche HSERDY; klappe GPIOD, dann ODR auf." } ] }
---
## Lernziel

Lies die Register des STM32 auf dem laufenden Board durch den Debugger, damit du Hardwarefragen - stimmt der Takt, was hält ein Ausgangspin - durch Hinsehen statt durch Raten beantwortest.

## Kernregister

Bei angehaltenem Target hat das Panel **Variables** einen Abschnitt **Registers**: `r0`-`r12`, `sp`, `lr`, `pc`, `xPSR`. Das ist der Zustand der CPU im Halt. `pc` ist die Stelle, an der die Ausführung fortsetzt; `lr` die Rücksprungadresse der aktuellen Funktion; `sp` der aktive Stackpointer (MSP vor dem Scheduler-Start, PSP in einer Task). Alle drei brauchst du, wenn du im nächsten Step einen Fault-Dump liest.

## Peripherieregister über die SVD

Rohe Kernregister beantworten die Embedded-Frage selten. Du willst wissen: „Zeigt `RCC->CR` HSE bereit?" oder „Was steht in `GPIOD->ODR`?". `cortex-debug` beantwortet das mit einer **SVD-Datei**: `targets/itsboard/STM32F429.svd` ist die Beschreibung jedes Peripheriegeräts, Registers, Feldes und Resetwerts von STMicroelectronics selbst, im Repository mitgeliefert (Apache-2.0) und in die Launch-Konfiguration eingebunden. Während einer Sitzung erscheint ein Panel **XPeripherals** in der Seitenleiste Run and Debug mit jedem Peripheriegerät nach Name und Basisadresse; klappe eines auf, um seine Register mit Live-Werten zu sehen. Außerhalb einer Sitzung steht dort „No active debug session", was korrekt ist.

## Zwei Dinge, die sich jetzt zu lesen lohnen

**Der Taktbaum.** `targets/itsboard/hal/hal_clock.c` setzt in `RCC->CR` die Bits `HSEBYP` und `HSEON` und wartet dann, bis `HSERDY` gesetzt ist - die 8-MHz-Referenz ist ein Rechtecksignal vom MCO der ST-Link, kein Quarz, deshalb ist *Bypass* aktiv (`docs/HARDWARE.md`). Die Haupt-PLL wird dann auf 8 / 8 × 360 / 2 = 180 MHz konfiguriert und `RCC->CFGR` auf die PLL umgeschaltet. Die Bestätigung, dass die Umschaltung geschah, ist `SWS` (Bits 3:2 von `RCC_CFGR`) mit dem Wert binär `10` - dieselbe Registerprüfung, die `docs/tutorials/first-gate.md` für eine fehlschlagende Zeitbasis-Zusicherung nennt.

**Ein Ausgangsport.** `cads_hal_adapter_outputs()` (`targets/itsboard/hal/hal_io.c`) schreibt OUT0..7 über `GPIOD->BSRR` in einem atomaren Setz-und-Lösch-Wort und OUT8..15 über `GPIOE->BSRR`. `BSRR` ist nur beschreibbar; das *Ergebnis* ist in `GPIOD->ODR` sichtbar, dessen niederwertiges Byte der aktuelle Zustand von PD0..PD7 ist. `ODR` im Debugger zu lesen ist daher ein Weg zu bestätigen, was der letzte Ausgangsschreibvorgang wirklich getan hat.

## Lesen, nicht annehmen

Die Projektakte kennt mehr als einen Fall, in dem ein Registerlesen eine Frage entschied, die Nachdenken nicht klären konnte: der SPI-Mutex-Boot-Hänger wurde gefunden, indem `BASEPRI` live gelesen wurde (es stand auf `0x50` und maskierte den DMA-Abschluss-Interrupt), und die Signatur „hängt bei Reset_Handler" ist eine bestimmte Menge von Registerwerten (`docs/ROADMAP.md`, Einträge vom 2026-08-26 und 2026-08-29). Die Gewohnheit, die du aufbaust: wenn das Verhalten der Firmware und dein Modell davon auseinandergehen, lies das Register.

## Deine Aufgabe

Starte eine Sitzung, halte an deinem Breakpoint aus dem vorherigen Step, öffne XPeripherals und klappe `RCC` → `CR` sowie `GPIOD` → `ODR` auf. Beantworte dann die Frage, welche Bits den Takt bestätigen und was `ODR` hält. Der nächste Step nutzt dieselben Register, um einen Absturz zu lesen.
