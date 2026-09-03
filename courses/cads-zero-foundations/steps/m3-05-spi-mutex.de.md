---
id: m3-05-spi-mutex
title: Der geteilte SPI-Bus - eine Fallstudie
bloom: analyze
objectives: [cz.rtos.mutex]
requires: [m3-04-stack-guard]
estimatedMinutes: 22
scaffold: independent
links:
  - { step: m4-01-freertos-tasks }
  - { step: m3-02-registers-svd }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/ROADMAP.md" }
  - { file: "targets/itsboard/hal/hal_spi.h", line: 42 }
  - { file: "modules/kernel/src/FreeRTOSConfig.h", line: 89 }
  - { doc: "docs/SAFETY.md" }
sources: [docs/explanation/pa7-conflict.md, docs/ROADMAP.md, targets/itsboard/hal/hal_spi.h, targets/itsboard/hal/hal_spi.c, targets/itsboard/hal/hal_console.c, modules/kernel/src/FreeRTOSConfig.h, docs/SAFETY.md, core/cads_hal.h]
tasks:
  - id: per-byte-count
    title: Leite die 307 200 MAC-Zyklen her
    check: { type: question, prompt: { en: "The older driver arbitrates per byte. Where do its 307,200 MAC cycles per full frame come from?", de: "Der ältere Treiber arbitriert pro Byte. Woraus ergeben sich seine 307 200 MAC-Zyklen je Vollbild?" }, rubric: "Aus der Bildgröße mal der Farbtiefe des Busses: 480 × 320 = 153 600 Bildpunkte, und das Panel wird in RGB565 beschrieben, also zwei Byte je Bildpunkt - 307 200 Byte je Vollbild. Wer pro Byte arbitriert, macht genau einen Stopp-und-Start-Zyklus des MAC je Byte, also 307 200 Zyklen. Wer 153 600 nennt, hat die zwei Byte je Bildpunkt vergessen; wer 76 800 nennt, hat mit den 4 bpp des Framebuffers statt mit dem Busformat gerechnet.", bloom: analyze }
  - id: basepri-dma
    title: Erkläre, warum 0x50 ausgerechnet die DMA traf
    check: { type: question, prompt: { en: "BASEPRI read 0x50. Why did that mask the DMA completion interrupt in particular?", de: "BASEPRI stand auf 0x50. Warum maskierte das ausgerechnet den DMA-Abschluss-Interrupt?" }, rubric: "Die Antwort führt die Rechnung vor: 6 wird als 0x60 abgelegt, und 0x60 ist numerisch größer als 0x50, also fällt DMA2_Stream3 unter die Sperre - und mit ihm die Abschlussmeldung, auf die der Flush wartete. Wer stattdessen 6 unmittelbar mit 0x50 vergleicht, lässt die Verschiebung aus und kommt zum gegenteiligen Ergebnis. Wer nur wiederholt, dass die DMA maskiert war, ohne den Zahlenvergleich zu führen, hat die gestellte Frage nicht beantwortet.", bloom: analyze }
  - id: find-gate
    title: Finde die Absicherung im Quelltext
    check: { type: command, cwd: ".", command: "grep -n 'xTaskGetSchedulerState' targets/itsboard/hal/hal_spi.c", expectExitCode: 0 }
socratic:
  - { trigger: "question:per-byte-count:weak", question: { en: "How many pixels does this panel have, and how many bytes does one pixel take on the wire?", de: "Wie viele Bildpunkte hat dieses Panel, und wie viele Byte belegt ein Bildpunkt auf der Leitung?" }, hints: [ { en: "Is 307,200 a round multiple of the pixel count, and if so, by what factor?", de: "Ist 307 200 ein glattes Vielfaches der Bildpunktzahl, und wenn ja, mit welchem Faktor?" }, { en: "The panel resolution is in docs/HARDWARE.md; the format the display bus is fed with is named in this step under Arbitrierung pro Blit.", de: "Die Panelauflösung steht in docs/HARDWARE.md; das Format, in dem der Displaybus gefüttert wird, nennt dieser Step im Abschnitt Arbitrierung pro Blit." }, { en: "The framebuffer's own depth and the depth on the bus are not the same number - the conversion happens on the way out.", de: "Die Tiefe des Framebuffers und die Tiefe auf dem Bus sind nicht dieselbe Zahl - die Umwandlung passiert erst auf dem Weg hinaus." } ] }
  - { trigger: "question:basepri-dma:weak", question: { en: "Is a numerically larger priority value more urgent or less urgent on this core, and which way does BASEPRI compare?", de: "Ist ein numerisch größerer Prioritätswert auf diesem Kern dringender oder weniger dringend, und in welche Richtung vergleicht BASEPRI?" }, hints: [ { en: "Did you compare 6 against 0x50, or the value the NVIC actually stores for priority 6?", de: "Hast du 6 mit 0x50 verglichen oder den Wert, den die NVIC für Priorität 6 tatsächlich ablegt?" }, { en: "The section Was BASEPRI maskiert gives the shift rule and names the two interrupt priorities this firmware sets; hal_spi.c sets one of them.", de: "Der Abschnitt Was BASEPRI maskiert nennt die Verschiebungsregel und die beiden Interrupt-Prioritäten, die diese Firmware setzt; hal_spi.c setzt eine davon." }, { en: "With four priority bits the stored byte is the priority number times sixteen - do that one multiplication before comparing.", de: "Bei vier Prioritätsbits ist das abgelegte Byte die Prioritätsnummer mal sechzehn - mach diese eine Multiplikation vor dem Vergleich." } ] }
  - { trigger: "task:find-gate:failed", question: { en: "Is the search running from the firmware's top-level directory, and is the path spelled exactly as in the repository?", de: "Läuft die Suche aus dem obersten Verzeichnis der Firmware, und ist der Pfad genau so geschrieben wie im Repository?" }, hints: [ { en: "A grep that finds nothing exits non-zero - is that because the pattern is wrong or because the file is not where you looked?", de: "Ein grep ohne Treffer endet mit einem Fehlercode - liegt das am Muster oder daran, dass die Datei nicht dort liegt, wo du gesucht hast?" }, { en: "Open targets/itsboard/hal/hal_spi.c and read the comment block above cads_spi_lock_active().", de: "Öffne targets/itsboard/hal/hal_spi.c und lies den Kommentarblock über cads_spi_lock_active()." }, { en: "The gate is a single comparison against one FreeRTOS enumerator that describes the state before the scheduler exists.", de: "Die Absicherung ist ein einziger Vergleich gegen einen FreeRTOS-Aufzählungswert, der den Zustand vor der Existenz des Schedulers beschreibt." } ] }
---
## Lernziel

Analysiere, wie ein umkämpfter Pin ein Bus-Arbitrierungsdesign erzwang und warum ein Mutex in diesem Design den Boot abstürzen ließ - eine Fallstudie zu geteilten Ressourcen unter einem Scheduler.

## Ein Pin, zwei Besitzer

`SPI1_MOSI` - die Datenleitung des Displays, die auf Arduino D11 ankommt - und `ETH_RMII_CRS_DV` - Carrier Sense / Data Valid, das der MAC bei jedem empfangenen Frame braucht - sind **derselbe physische Pin, PA7**. `CRS_DV` hat auf dem STM32F429 genau eine mögliche Position; es gibt keine alternative Zuordnung. Ein Pin hat eine Alternate Function zur Zeit, also gewinnt der zuletzt initialisierende Treiber den Multiplexer, und der andere verstummt (`docs/explanation/pa7-conflict.md`). Die saubere Lösung ist ein Lötbrücken-Tausch (SB121/SB122), der MOSI auf PB5 verlegt; das Projekt entschied, das Board unverändert zu lassen, die Firmware gestaltet also dauerhaft um den Konflikt herum.

Das ist die einzige Stelle im Kurs, an der diese Tatsachen ausführlich stehen. M4 und M7 rufen sie ab, statt sie zu wiederholen.

## Arbitrierung pro Blit

`cads_hal_spi_claim_bus()` / `cads_hal_spi_release_bus()` (`targets/itsboard/hal/hal_spi.h`) arbitrieren auf der Ebene eines ganzen Blits:

```
claim:    MAC anhalten -> laufende Frames auslaufen lassen -> PA7 übernehmen
          Fenster setzen, RAMWR, das ganze Rechteck per DMA
release:  auf SPI-Leerlauf warten -> PA7 zurückgeben -> MAC neu starten
```

Der ältere Referenztreiber des Labors machte denselben Tanz **pro Byte**, und zwar für jedes Byte, das über den Bus geht: das Panel wird in **RGB565** beschrieben, also zwei Byte je Bildpunkt, bei 480 × 320 Bildpunkten. Wie viele MAC-Stopp/Start-Zyklen daraus je Vollbild werden, rechnest du gleich selbst aus. Pro Blit sind es drei Größenordnungen weniger Neustarts, und DMA wird überhaupt erst nutzbar, weil sich eine Alternate Function nicht mitten im Burst umschalten lässt. Die Claims verschachteln, sodass der Touch-Controller den Bus einmal um mehrere Transfers nimmt. Ist der Ethernet-Datenpfad gar nicht aktiv, entfällt die Arbitrierung (`cads_hal_spi_set_eth_datapath_active()`).

Die daraus folgenden Regeln sind verbindlich (`docs/SAFETY.md` §6): **niemals Display oder Touch-Controller außerhalb eines Claim/Release-Paars anfassen** - es korrumpiert, was die PHY gerade empfängt, und das Symptom (gelegentlich verlorene Frames unter Last) ist elend aufzuspüren; niemals einen RMII-Pin außerhalb des Ethernet-Treibers umkonfigurieren; und **davon ausgehen, dass der Pin dir weggenommen werden kann** - Code, der „die SPI ist für das Display konfiguriert“ über einen Yield hinweg cacht, ist falsch, weil eine andere Task oder der Treiber den Multiplexer verschoben haben kann.

## Ein Mutex, und der Boot stürzt ab

Sobald mehrere Tasks (ui, input, console) den Bus teilten, kam ein rekursiver FreeRTOS-**Mutex** in `claim_bus` (Commit `9506a46`). Das Board kam danach in einer Absturzschleife an, bevor es eine einzige Zeile gedruckt hatte: ein Live-Registerlesen zeigte `PC = 0x0`, einen UsageFault `INVSTATE` und einen leeren Forensik-Ring (`docs/ROADMAP.md`, 2026-08-26). Ursache: der Bootpfad flusht das Panel (Selbsttest, Splash) **bevor** der Scheduler startet, und `xSemaphoreTakeRecursive` dereferenziert `pxCurrentTCB`, das bis dahin NULL ist - FreeRTOS verbietet blockierende Aufrufe vor `vTaskStartScheduler()`. Die Korrektur in `hal_spi.c` prüft vor take/give `xTaskGetSchedulerState() != taskSCHEDULER_NOT_STARTED`: der Boot ist per Konstruktion einfädig, das Lock dort also unnötig und unsicher zugleich.

Ein **zweiter** Hänger zeigte sich sofort: das Banner erschien, dann drehte der erste `cads_canvas_flush()` ewig. Live: die DMA lief, aber `BASEPRI` las `0x50`. Das Anlegen des Mutex vor dem Scheduler hatte eine Critical Section betreten, deren Verlassen den Poison-Zählwert des Ports dekrementierte, statt `BASEPRI` wiederherzustellen - der Wert blieb also stehen. Korrektur: `portENABLE_INTERRUPTS()` direkt nach dem Anlegen des Mutex.

Beides wurde durch **Registerlesen am angehaltenen Board** gefunden, nicht durch Nachdenken über den Code - die Gewohnheit aus den vorherigen Steps.

## Was `BASEPRI` maskiert

`BASEPRI` ist ein Kernregister des Cortex-M4 mit genau einer Aufgabe: **es sperrt Ausnahmen unterhalb einer Dringlichkeitsschwelle, ohne alle Interrupts abzuschalten.** Drei Regeln reichen, um jeden Wert darin zu lesen:

1. **Kleiner heißt dringender.** Prioritäten sind auf Cortex-M invertiert: Priorität 0 ist die dringendste. Steht in `BASEPRI` der Wert *n*, sperrt der Kern jede Ausnahme, deren Prioritätswert **größer oder gleich** *n* ist. `BASEPRI = 0` ist der Sonderfall „nichts gesperrt“.
2. **Die NVIC benutzt das obere Nibble.** Der STM32F429 hat vier implementierte Prioritätsbits (`configPRIO_BITS 4` in `modules/kernel/src/FreeRTOSConfig.h`). Sie sitzen im **oberen** Ende des Prioritätsbytes, eine Prioritätsnummer wird also um `8 - 4 = 4` Stellen nach links geschoben abgelegt. Aus Priorität 5 wird `0x50`, aus Priorität 6 wird `0x60`.
3. **0x50 ist eine benannte Konstante, kein Zufall.** `configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY` ist 5, und `configMAX_SYSCALL_INTERRUPT_PRIORITY` ist genau dieser Wert nach der Verschiebung aus Regel 2. Das ist der Wert, den FreeRTOS beim Betreten einer Critical Section in `BASEPRI` schreibt: alles, was der Kernel bedienen können muss, bleibt draußen; die zeitkritischen Interrupts oberhalb der Schwelle laufen weiter.

Der Kommentar am Anfang von `FreeRTOSConfig.h` zieht die Konsequenz für die Treiber: jeder ISR, der eine `FromISR`-API aufruft, muss eine numerisch **größere** Prioritätszahl als 5 tragen. Diese Firmware hat genau zwei echte ISR-Handler, und beide halten sich daran: die Display-DMA wird in `targets/itsboard/hal/hal_spi.c` auf `NVIC_SetPriority(DMA2_Stream3_IRQn, 6u)` gesetzt, die Konsolen-UART in `targets/itsboard/hal/hal_console.c` auf 8.

Damit hast du alle Zahlen, die du für die zweite Aufgabe brauchst. Die Rechnung ist eine Multiplikation und ein Vergleich.

## Deine Aufgabe

Lies den Doc-Kommentar über `cads_hal_spi_claim_bus()` und den ROADMAP-Eintrag vom 2026-08-26. Leite dann her, woher die 307 200 MAC-Zyklen des alten Treibers kommen, und erkläre, warum `BASEPRI = 0x50` ausgerechnet die Display-DMA stillgelegt hat. Der dritte Check lässt dich die Absicherung in `hal_spi.c` selbst finden. M4 greift die Scheduler-Seite derselben Geschichte auf.
