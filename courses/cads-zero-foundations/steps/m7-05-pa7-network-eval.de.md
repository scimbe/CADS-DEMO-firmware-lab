---
id: m7-05-pa7-network-eval
title: Den PA7-Zeitschlitz als Netzwerkentscheidung bewerten
bloom: evaluate
objectives: [cz.net.arbitration]
requires: [m7-04-recon-tools]
estimatedMinutes: 15
links:
  - { step: m8-01-unit-tests }
  - { step: m3-05-spi-mutex }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/HARDWARE.md" }
  - { doc: "docs/reference/measurements.md" }
sources: [docs/explanation/pa7-conflict.md, docs/HARDWARE.md, docs/reference/measurements.md, docs/ROADMAP.md]
tasks:
  - id: judge-the-tradeoff
    title: Beurteile den Zeitschlitz und die Lötbrücken-Entscheidung
    check: { type: question, prompt: { en: "The display and the Ethernet receiver share PA7 and are time-sliced per blit. Using the measured numbers, judge: (1) how large the worst-case receiver blackout is and why it is bounded at that value rather than the full redraw time; (2) which kinds of traffic tolerate it and which do not, and what that demands of anything you build on this board; (3) whether the SB121/SB122 solder-bridge fix should have been applied - state the decision the project took and argue for or against it with its own reasons.", de: "Display und Ethernet-Empfänger teilen sich PA7 und werden pro Blit zeitgeschlitzt. Beurteile anhand der gemessenen Zahlen: (1) wie groß der schlimmste Empfänger-Ausfall ist und warum er auf diesen Wert begrenzt ist statt auf die volle Neuzeichenzeit; (2) welche Verkehrsarten ihn vertragen und welche nicht, und was das von allem verlangt, was du auf diesem Board baust; (3) ob die SB121/SB122-Lötbrücken-Korrektur hätte angewendet werden sollen - nenne die Entscheidung des Projekts und argumentiere mit dessen eigenen Gründen dafür oder dagegen." }, rubric: "(1) 22,5 ms bei /16 (11,5 ms bei /8): cads_canvas_flush() schiebt in Bändern von höchstens 16 Zeilen und cads_hal_display_blit() claimt/gibt den Bus pro Aufruf frei, der MAC kommt also zwischen den Bändern zurück; ein Vollbild sind 20 Bänder = 448 ms gesamt, aber nie ein einzelner 448-ms-Ausfall. (2) TCP verkraftet es als kurzen Verlust mit Neuübertragung/Fensteranpassung; UDP verliert schlicht, was im Fenster ankam, also müssen hier gebaute Discovery- oder Telemetrieprotokolle Verlust tolerieren oder wiederholen; Dirty-Rectangles werden damit zum Netzwerkmerkmal - nur zeichnen, was sich geändert hat. (3) Entscheidung 2026-08-18: keine Modifikation, CADS_SPI_MOSI_ON_PB5 bleibt 0; Gründe: physische Arbeit an einem geteilten Laborboard, die Anforderungen dieser Firmware weichen von jedem anderen Projekt auf derselben Hardware ab, überrascht den nächsten Nutzer; ein vertretbares Gegenargument ist, dass der Tausch laut UM1974 reversibel ist und jede Arbitrierung entfernt, sodass beides mit voller Geschwindigkeit läuft. Jede gut begründete Position, die diese Fakten nutzt, besteht.", bloom: evaluate }
socratic:
  - { trigger: "question:judge-the-tradeoff:weak", question: { en: "Why is the number that matters the longest single blackout rather than the total redraw time - what in the flush path makes those two different?", de: "Warum ist die maßgebliche Zahl der längste einzelne Ausfall und nicht die gesamte Neuzeichenzeit - was im Flush-Pfad macht die beiden verschieden?" }, hints: [ { en: "cads_canvas_flush() converts and pushes in 16-row bands; the bus claim is per blit, so the MAC restarts between bands.", de: "cads_canvas_flush() wandelt und schiebt in 16-Zeilen-Bändern; der Bus-Claim gilt pro Blit, der MAC startet also zwischen den Bändern neu." }, { en: "One 480x16 band at /16 is 22.5 ms; measurements.md and pa7-conflict.md both carry that table.", de: "Ein 480x16-Band bei /16 sind 22,5 ms; measurements.md und pa7-conflict.md tragen beide diese Tabelle." }, { en: "The decision and its reasons are under 'The decision: no modification' in pa7-conflict.md and in ROADMAP.md's Resolved decisions.", de: "Die Entscheidung und ihre Gründe stehen unter 'The decision: no modification' in pa7-conflict.md und in den Resolved decisions der ROADMAP.md." } ] }
---
## Lernziel

Bewerte mit den eigenen Messungen des Projekts, was der PA7-Zeitschlitz zwischen Display und Ethernet das Netzwerk kostet, und nimm eine begründete Position zur Lötbrücken-Korrektur ein, die das Projekt bewusst nicht angewendet hat.

## Der Zwang, noch einmal

`SPI1_MOSI` (die Datenleitung des Displays, Arduino D11) und `ETH_RMII_CRS_DV` sind beide PA7, und Carrier-Sense hat auf dem STM32F429 keinen alternativen Ort. Eine Alternativfunktion besitzt einen Pin zu einer Zeit. Die Antwort der Firmware ist Arbitrierung pro Blit: `cads_hal_spi_claim_bus()` stoppt den MAC, lässt laufende Frames auslaufen, nimmt PA7, das Rechteck geht per DMA hinaus, und `cads_hal_spi_release_bus()` gibt den Pin zurück. Frames, die während eines Blits ankommen, gehen verloren. Die Korrektheitsseite davon kennst du aus M3; in diesem Step geht es um die Kosten.

## Die Zahl, die zählt

Solange das Display PA7 besitzt, ist der Empfänger aus. Die Größe, über die es nachzudenken gilt, ist also nicht die gesamte Neuzeichenzeit, sondern der **längste ununterbrochene Ausfall**. Der Flush-Pfad begrenzt ihn — nebenbei, durch eine Entscheidung aus anderem Grund: `cads_canvas_flush()` wandelt und schiebt die beschädigte Region in Bändern von höchstens sechzehn Zeilen, und `cads_hal_display_blit()` claimt und gibt pro Aufruf frei, sodass der MAC zwischen den Bändern wieder hochkommt.

| | bei /16 | bei /8 |
|---|---|---|
| Ein 480×16-Band | **22,5 ms** | 11,5 ms |
| Vollbild, 20 Bänder | 448 ms gesamt | 229 ms gesamt |
| Längster einzelner Ausfall | **22,5 ms** | **11,5 ms** |

22,5 ms sind auf einem 100-Mbit-Link lang — grob 280 KB Leitungszeit — aber zwanzigmal besser als die 448 ms einer Einzeltransfer-Implementierung, und begrenzt statt proportional zur Neuzeichengröße. Kleinere Bänder wurden erwogen und verworfen: jedes Band kostet einen Bus-Claim, ein MAC-Stop/Start und eine Fenstersetz-Sequenz, das Halbieren des Bands verdoppelt also diesen Aufwand, um einen Ausfall zu halbieren, den TCP ohnehin verkraftet.

## Was für den Verkehr folgt

**TCP verkraftet es.** Ein stehender Empfänger sieht aus wie ein kurzer Verlust-Burst; Neuübertragung und Fensteranpassung holen das auf. **UDP nicht.** Datagramme, die im Fenster ankommen, sind weg. Alles, was hier gebaut wird und an einzelnen Datagrammen hängt — ein Discovery-Protokoll, ein Telemetriestrom, die Wachen aus dem vorigen Step — muss das tolerieren oder wiederholen. Und Dirty-Rectangles hören auf, eine Display-Optimierung zu sein: eine 40×40-Aktualisierung ist ein Band, ein einzelner 4,7-ms-Ausfall, „nur zeichnen, was sich änderte" ist jetzt auch eine Netzwerkregel. Screen-Streaming begrenzt sich aus demselben Grund selbst — den Framebuffer zu schieben verlangt, dass das Display gerade *nicht* zeichnet.

## Die Korrektur, die es gibt, und die Entscheidung

UM1974 §6.9 dokumentiert die Lötbrücken SB121/SB122: ihr Tausch legt D11 auf PB5, lässt PA7 der PHY, und `-DCADS_SPI_MOSI_ON_PB5=1` kompiliert jede Arbitrierung weg. **Entschieden am 2026-08-18: das Board bleibt unverändert.** Die festgehaltenen Gründe: es ist physische Arbeit an einem Laborboard, das andere mitbenutzen; es lässt die Anforderungen dieser Firmware von jedem anderen Projekt auf derselben Hardware abweichen; und ein für die Bequemlichkeit eines Projekts modifiziertes Board überrascht den Nächsten, der es in die Hand nimmt. Das Projekt behandelt den Zeitschlitz als Zwang, um den es herum entwirft, nicht als einen, den es bloß erträgt.

## Deine Aufgabe

Beantworte die dreiteilige Bewertung. Nutze die gemessenen Zahlen, benenne die Verkehrsklassen ausdrücklich, nenne die Entscheidung des Projekts und begründe deine eigene Position dazu — Zustimmung ist nicht verlangt, die Nutzung der Fakten schon.
