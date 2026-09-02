---
id: m3-05-spi-mutex
title: Der geteilte SPI-Bus - eine Fallstudie
bloom: analyze
objectives: [cz.rtos.mutex]
requires: [m3-04-stack-guard]
estimatedMinutes: 20
links:
  - { step: m4-01-freertos-tasks }
  - { step: m3-02-registers-svd }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/ROADMAP.md" }
  - { file: "targets/itsboard/hal/hal_spi.h", line: 42 }
  - { doc: "docs/SAFETY.md" }
sources: [docs/explanation/pa7-conflict.md, docs/ROADMAP.md, targets/itsboard/hal/hal_spi.h, targets/itsboard/hal/hal_spi.c, docs/SAFETY.md, core/cads_hal.h]
tasks:
  - id: claim-release
    title: Die Bus-Arbitrierung und ihre Fehlerbilder erklären
    check: { type: question, prompt: { en: "Why must every display or touch access sit between cads_hal_spi_claim_bus() and cads_hal_spi_release_bus() on a stock board? What does claim_bus actually do, why is it per blit rather than per byte, and what goes wrong if code caches 'the SPI is configured for the display' across a yield? Finally: why did adding a FreeRTOS mutex inside claim_bus crash the boot, and how was it gated?", de: "Warum muss auf einem unveränderten Board jeder Display- oder Touch-Zugriff zwischen cads_hal_spi_claim_bus() und cads_hal_spi_release_bus() liegen? Was tut claim_bus tatsächlich, warum pro Blit statt pro Byte, und was geht schief, wenn Code 'die SPI ist für das Display konfiguriert' über einen Yield hinweg zwischenspeichert? Und: warum ließ ein FreeRTOS-Mutex in claim_bus den Boot abstürzen, und wie wurde er abgesichert?" }, rubric: "PA7 ist zugleich SPI1_MOSI (Displaydaten) und ETH_RMII_CRS_DV, und CRS_DV hat keinen alternativen Pin, also kann nur eine Alternate Function den Pin besitzen. claim_bus hält den MAC an, lässt laufende Frames auslaufen und übernimmt PA7; release gibt den Pin zurück und startet den MAC neu; Claims verschachteln. Pro Blit (ein DMA-Rechteck) statt pro Byte senkt MAC-Neustarts um drei Größenordnungen und macht DMA möglich. Ein Zugriff außerhalb der Klammer korrumpiert, was die PHY gerade empfängt; den Pin-Zustand über einen Yield zu cachen ist falsch, weil eine andere Task oder der Ethernet-Treiber den Pin zurücknehmen kann, Besitz also pro Zugriff neu hergestellt werden muss. Der Mutex-Absturz: claim_bus nahm einen rekursiven FreeRTOS-Mutex bedingungslos, aber der Boot flusht das Panel vor dem Scheduler-Start; xSemaphoreTakeRecursive dereferenzierte das NULL-pxCurrentTCB -> UsageFault INVSTATE, PC=0x0, leerer Forensik-Ring. Korrektur: take/give nur wenn xTaskGetSchedulerState() != taskSCHEDULER_NOT_STARTED, plus portENABLE_INTERRUPTS() nach dem Anlegen des Mutex, weil die Critical Section vor dem Scheduler BASEPRI auf 0x50 ließ und den DMA-Abschluss-IRQ maskierte.", bloom: analyze }
socratic:
  - { trigger: "question:claim-release:weak", question: { en: "Which physical pin do the display and the Ethernet PHY both need, and how many alternative locations does the PHY's signal have on this part?", de: "Welchen physischen Pin brauchen Display und Ethernet-PHY beide, und wie viele alternative Positionen hat das PHY-Signal auf diesem Chip?" }, hints: [ { en: "docs/explanation/pa7-conflict.md: SPI1_MOSI and ETH_RMII_CRS_DV are both PA7, and CRS_DV has exactly one possible location.", de: "docs/explanation/pa7-conflict.md: SPI1_MOSI und ETH_RMII_CRS_DV sind beide PA7, und CRS_DV hat genau eine mögliche Position." }, { en: "Read the doc comment above cads_hal_spi_claim_bus() in targets/itsboard/hal/hal_spi.h: stop MAC, steal PA7, nested claims, restart on the outermost release.", de: "Lies den Doc-Kommentar über cads_hal_spi_claim_bus() in targets/itsboard/hal/hal_spi.h: MAC anhalten, PA7 übernehmen, verschachtelte Claims, Neustart beim äußersten Release." }, { en: "The boot crash is the 2026-08-26 ROADMAP entry: PC=0x0, INVSTATE, pxCurrentTCB NULL before vTaskStartScheduler; the fix gates on xTaskGetSchedulerState().", de: "Der Boot-Absturz ist der ROADMAP-Eintrag vom 2026-08-26: PC=0x0, INVSTATE, pxCurrentTCB NULL vor vTaskStartScheduler; die Korrektur prüft xTaskGetSchedulerState()." } ] }
---
## Lernziel

Analysiere, wie ein umkämpfter Pin ein Bus-Arbitrierungsdesign erzwang und warum ein Mutex in diesem Design den Boot abstürzen ließ - eine Fallstudie zu geteilten Ressourcen unter einem Scheduler.

## Ein Pin, zwei Besitzer

`SPI1_MOSI` - die Datenleitung des Displays, die auf Arduino D11 ankommt - und `ETH_RMII_CRS_DV` - Carrier Sense / Data Valid, das der MAC bei jedem empfangenen Frame braucht - sind **derselbe physische Pin, PA7**. `CRS_DV` hat auf dem STM32F429 genau eine mögliche Position; es gibt keine alternative Zuordnung. Ein Pin hat eine Alternate Function zur Zeit, also gewinnt der zuletzt initialisierende Treiber den Multiplexer, und der andere verstummt (`docs/explanation/pa7-conflict.md`). Die saubere Lösung ist ein Lötbrücken-Tausch (SB121/SB122), der MOSI auf PB5 verlegt; das Projekt entschied, das Board unverändert zu lassen, die Firmware gestaltet also dauerhaft um den Konflikt herum.

## Arbitrierung pro Blit

`cads_hal_spi_claim_bus()` / `cads_hal_spi_release_bus()` (`targets/itsboard/hal/hal_spi.h`) arbitrieren auf der Ebene eines ganzen Blits:

```
claim:    MAC anhalten -> laufende Frames auslaufen lassen -> PA7 übernehmen
          Fenster setzen, RAMWR, das ganze Rechteck per DMA
release:  auf SPI-Leerlauf warten -> PA7 zurückgeben -> MAC neu starten
```

Der ältere Referenztreiber des Labors machte denselben Tanz **pro Byte** - 307 200 MAC-Stopp/Start-Zyklen pro Vollbild, und kein DMA möglich, weil eine Alternate Function nicht mitten im Burst umgeschaltet werden kann. Pro Blit sind es drei Größenordnungen weniger Neustarts, und DMA wird nutzbar. Die Claims verschachteln, sodass der Touch-Controller den Bus einmal um mehrere Transfers nimmt. Ist der Ethernet-Datenpfad gar nicht aktiv, entfällt die Arbitrierung (`cads_hal_spi_set_eth_datapath_active()`).

Die daraus folgenden Regeln sind verbindlich (`docs/SAFETY.md` §6): **niemals Display oder Touch-Controller außerhalb eines Claim/Release-Paars anfassen** - es korrumpiert, was die PHY gerade empfängt, und das Symptom (gelegentlich verlorene Frames unter Last) ist elend aufzuspüren; niemals einen RMII-Pin außerhalb des Ethernet-Treibers umkonfigurieren; und **davon ausgehen, dass der Pin dir weggenommen werden kann** - Code, der „die SPI ist für das Display konfiguriert" über einen Yield hinweg cacht, ist falsch, weil eine andere Task oder der Treiber den Multiplexer verschoben haben kann.

## Ein Mutex, und der Boot stürzt ab

Sobald mehrere Tasks (ui, input, console) den Bus teilten, kam ein rekursiver FreeRTOS-**Mutex** in `claim_bus` (Commit `9506a46`). Das Board kam danach in einer Absturzschleife an, bevor es eine einzige Zeile gedruckt hatte: ein Live-Registerlesen zeigte `PC = 0x0`, einen UsageFault `INVSTATE` und einen leeren Forensik-Ring (`docs/ROADMAP.md`, 2026-08-26). Ursache: der Bootpfad flusht das Panel (Selbsttest, Splash) **bevor** der Scheduler startet, und `xSemaphoreTakeRecursive` dereferenziert `pxCurrentTCB`, das bis dahin NULL ist - FreeRTOS verbietet blockierende Aufrufe vor `vTaskStartScheduler()`. Die Korrektur in `hal_spi.c` prüft vor take/give `xTaskGetSchedulerState() != taskSCHEDULER_NOT_STARTED`: der Boot ist per Konstruktion einfädig, das Lock dort also unnötig und unsicher zugleich.

Ein **zweiter** Hänger zeigte sich sofort: das Banner erschien, dann drehte der erste `cads_canvas_flush()` ewig. Live: die DMA lief, aber `BASEPRI` las `0x50` - das Anlegen des Mutex vor dem Scheduler hatte eine Critical Section betreten, deren Verlassen den Poison-Zählwert des Ports dekrementierte, statt `BASEPRI` wiederherzustellen, und so den DMA-Abschluss-Interrupt maskierte. Korrektur: `portENABLE_INTERRUPTS()` direkt nach dem Anlegen des Mutex.

Beides wurde durch **Registerlesen am angehaltenen Board** gefunden, nicht durch Nachdenken über den Code - die Gewohnheit aus den vorherigen Steps.

## Deine Aufgabe

Lies den Doc-Kommentar über `cads_hal_spi_claim_bus()` und den ROADMAP-Eintrag vom 2026-08-26 und beantworte dann die Frage: was Claim/Release tut, warum pro Blit, warum das Cachen des Besitzes falsch ist und wie der Mutex-Absturz abgesichert wurde. M4 greift die Scheduler-Seite derselben Geschichte auf.
