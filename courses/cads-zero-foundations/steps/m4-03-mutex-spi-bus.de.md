---
id: m4-03-mutex-spi-bus
title: Ein Bus, zwei Besitzer - der SPI-Claim als Mutex
bloom: analyze
objectives: [cz.rtos.mutex]
requires: [m4-02-ram-budget]
estimatedMinutes: 15
links:
  - { step: m4-04-iwdg-watchdog }
  - { step: m3-05-spi-mutex }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/reference/hal.md" }
  - { file: "targets/itsboard/hal/hal_spi.c", line: 38 }
sources: [docs/explanation/pa7-conflict.md, targets/itsboard/hal/hal_spi.c, targets/itsboard/hal/hal_spi.h, docs/reference/measurements.md]
tasks:
  - id: per-blit
    title: Begründe Pro-Blit-Arbitrierung und Banding
    check: { type: question, prompt: { en: "The display and the Ethernet PHY share PA7. The lab's reference project arbitrates per byte; CaDS Zero arbitrates per blit and flushes in 16-row bands. Why per blit instead of per byte, and why does the banding matter for the network rather than for the display?", de: "Display und Ethernet-PHY teilen sich PA7. Das Referenzprojekt des Labors arbitriert pro Byte; CaDS Zero arbitriert pro Blit und flusht in 16-Zeilen-Bändern. Warum pro Blit statt pro Byte, und warum ist das Banding für das Netzwerk wichtig, nicht für das Display?" }, rubric: "Pro Byte wird der MAC 307200-mal pro Frame abgebaut und DMA ist unmöglich; pro Blit ist ein Stop/Drain/Steal/DMA/Restore je Rechteck, drei Größenordnungen weniger Neustarts, DMA wird nutzbar. Solange das Display PA7 besitzt, ist der Empfänger aus und Frames gehen verloren; die Kennzahl ist der längste Blackout, nicht die gesamte Redraw-Zeit; 16-Zeilen-Bänder mit Claim/Release je Blit begrenzen ihn auf 22,5 ms bei /16 (11,5 ms bei /8) statt der ganzen 448 ms.", bloom: analyze }
socratic:
  - { trigger: "question:per-blit:weak", question: { en: "While a blit owns PA7, what is the Ethernet receiver doing, and what happens to a frame that arrives then?", de: "Während ein Blit PA7 besitzt, was tut der Ethernet-Empfänger, und was passiert mit einem Frame, der dann ankommt?" }, hints: [ { en: "claim: stop MAC -> drain in-flight frames -> steal PA7; release: wait idle -> return PA7 -> restart MAC.", de: "claim: MAC stoppen -> laufende Frames abschließen -> PA7 übernehmen; release: auf idle warten -> PA7 zurückgeben -> MAC neu starten." }, { en: "The number that matters is the longest uninterrupted blackout; see the table in pa7-conflict.md.", de: "Die entscheidende Zahl ist der längste ununterbrochene Blackout; siehe Tabelle in pa7-conflict.md." }, { en: "One 480x16 band is 22.5 ms at /16; a full screen is 20 such bands with the MAC back up in between.", de: "Ein 480x16-Band dauert 22,5 ms bei /16; ein Vollbild sind 20 solche Bänder, dazwischen ist der MAC wieder an." } ] }
---
## Lernziel

Analysiere den SPI-Bus-Claim als das konkrete Mutual-Exclusion-Primitiv dieser Firmware: was er serialisiert, wie er PA7 mit dem Ethernet-MAC arbitriert und warum das Pro-Blit-Design in Bändern die Netzwerkkosten begrenzt.

## Zwei Peripherien, ein Pin

`SPI1_MOSI` (die Datenleitung des Displays, Arduino D11) und `ETH_RMII_CRS_DV` sind derselbe physische Pin, PA7, und `CRS_DV` hat auf dem STM32F429 keinen alternativen Ort (`docs/explanation/pa7-conflict.md`). Nur eine Alternate Function kann einen Pin besitzen, Display und MAC können also nicht beide angeschlossen sein. Die Lötbrücken-Lösung (SB121/SB122) wurde abgelehnt; die Firmware schneidet stattdessen die Zeit auf.

## Das Claim/Release-Paar

`cads_hal_spi_claim_bus()` und `cads_hal_spi_release_bus()` in `targets/itsboard/hal/hal_spi.c` klammern jeden Display-Blit und jede Touch-Lesung:

```
claim:    MAC stoppen -> laufende Frames abschließen -> PA7 übernehmen (AF5 SPI1)
          Fenster setzen, RAMWR, das ganze Rechteck per DMA
release:  auf SPI idle warten -> PA7 zurückgeben (AF11 ETH) -> MAC neu starten
```

Das `Stack`-Referenzprojekt des Labors macht denselben Tanz **pro Byte**: ein Vollbild hat 307 200 Bytes, also 307 200 MAC-Stop/Start-Zyklen, und DMA ist strukturell unmöglich, weil sich eine Alternate Function nicht mitten im Burst umschalten lässt. CaDS Zero macht es **pro Blit**: ein Stop und ein Start je Rechteck, drei Größenordnungen weniger Neustarts, und DMA wird nutzbar — daher kommen die gemessenen 342 kpixel/s.

Claims verschachteln, sodass ein Treiber, der mehrere Transfers unter einem Lock braucht (der Touch-Controller), den Bus einmal nimmt.

## Warum es zugleich ein echter Mutex ist

Den Pin zu arbitrieren ist nicht dasselbe wie Tasks auszuschließen. Der Kommentar `THE MISSING LOCK` am Anfang von `hal_spi.c` hält den Fehler fest, den du in M3-05 analysiert hast: die ui-Task (Display-Flush) und die input/console-Tasks (Touch-Lesungen) führten diesen Code nebenläufig aus, ohne dass etwas ihr Verzahnen verhinderte; eine Touch-Lesung hing in `while(!(SR & RXNE))`, während CR1 den Display-Teiler zeigte, weil die andere Task SPI1 mitten im Transfer umkonfiguriert hatte. Die Korrektur legte einen echten **rekursiven FreeRTOS-Mutex** (`cads_spi_mutex`, genommen mit `xSemaphoreTakeRecursive`) in claim/release, sodass verschachtelte Claims derselben Task sich nie gegen sich selbst verklemmen, während der Boot lockfrei bleibt, weil er vor dem Scheduler konstruktionsbedingt einfädig ist.

## Warum Bänder dem Netzwerk wichtig sind, nicht dem Display

Solange das Display PA7 besitzt, ist der Empfänger des MAC aus, und ankommende Frames gehen schlicht verloren. Die entscheidende Zahl ist also nicht die gesamte Redraw-Zeit, sondern der **längste ununterbrochene Blackout**. `cads_canvas_flush()` wandelt und schiebt den beschädigten Bereich in Bändern von höchstens 16 Zeilen, und `cads_hal_display_blit()` claimt und released pro Aufruf, sodass der MAC zwischen den Bändern zurückkommt:

| | bei /16 | bei /8 |
|---|---|---|
| Ein 480×16-Band | 22,5 ms | 11,5 ms |
| Vollbild (20 Bänder) | 448 ms | 229 ms |
| Längster einzelner Blackout | **22,5 ms** | **11,5 ms** |

TCP verdaut eine 22,5-ms-Lücke als Verlust und sendet neu; UDP verliert, was in der Zeit ankam. Dirty-Rectangles hören damit auf, eine Display-Optimierung zu sein, und werden zum Netzwerk-Feature: ein 40×40-Update ist ein einziger 4,7-ms-Blackout.

## Deine Aufgabe

Beantworte die Analysefrage: warum Pro-Blit-Arbitrierung Pro-Byte schlägt und warum das 16-Zeilen-Banding eine Netzwerkentscheidung ist.
