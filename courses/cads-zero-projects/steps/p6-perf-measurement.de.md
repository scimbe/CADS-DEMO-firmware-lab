---
id: p6-perf-measurement
title: "Projekt: eine Performance-Messung"
bloom: evaluate
objectives: [cz.net.arbitration]
requires: []
estimatedMinutes: 90
links:
  - { doc: "docs/reference/measurements.md" }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/explanation/dirty-rectangles.md" }
sources: [docs/reference/measurements.md, docs/explanation/pa7-conflict.md, docs/explanation/dirty-rectangles.md]
tasks:
  - id: measured
    title: Du hast eine Messung auf dem echten Board gefahren
    check: { type: manual }
  - id: judge
    title: Interpretiere und beurteile das Ergebnis
    check: { type: question, prompt: { en: "Report the number you measured and compare it to the documented figure in measurements.md. Given the PA7 time-slice — a full-screen redraw is ~448 ms at /16 and the longest receiver blackout per 16-row band is ~22.5 ms — judge one design decision: is the /16 divider, the single-bounding-box damage model, or leaving SB121/SB122 unswapped the right call for this board, and under what workload would you revisit it?", de: "Berichte die gemessene Zahl und vergleiche sie mit dem dokumentierten Wert in measurements.md. Angesichts des PA7-Zeitmultiplex — ein Vollbild-Neuaufbau dauert ~448 ms bei /16 und die längste Empfänger-Blackout-Zeit je 16-Zeilen-Band ~22,5 ms — beurteile eine Entwurfsentscheidung: ist der /16-Teiler, das Einzel-Bounding-Box-Schadensmodell oder das Nicht-Umlöten von SB121/SB122 die richtige Wahl für dieses Board, und unter welcher Last würdest du sie überdenken?" }, rubric: "Berichtet einen gemessenen Wert und vergleicht ihn mit den dokumentierten ~342 kpixel/s (oder der passenden Zahl); erklärt die Zahl über das Bus-Limit von 16 Takten pro Pixel; und erreicht ein verteidigtes Urteil zu einer Entscheidung (z. B. /16 ist sicher und nahe der Busgrenze; eine Schadenliste lohnt nur bei Updates in gegenüberliegenden Ecken; das Umlöten tauscht Portabilität gegen gleichzeitiges Display+Ethernet), samt einer Last, die es ändern würde.", bloom: evaluate }
socratic:
  - { trigger: "question:judge:weak", question: { en: "Is the bottleneck the driver or the bus, and how does the measured number settle that?", de: "Ist der Engpass der Treiber oder der Bus, und wie entscheidet die gemessene Zahl das?" }, hints: [ { en: "The V command re-measures flush throughput under real scheduler and network contention; compare its min/avg/max to 342 kpixel/s.", de: "Der V-Befehl misst den Flush-Durchsatz unter echter Scheduler- und Netzlast neu; vergleiche sein Min/Mittel/Max mit 342 kpixel/s." }, { en: "16 SPI clocks per pixel at /16 gives a theoretical 351 kpixel/s, so 342 is 97% — there is no driver inefficiency left, the bus is the wall.", de: "16 SPI-Takte pro Pixel bei /16 ergeben theoretische 351 kpixel/s, 342 sind also 97 % — es bleibt keine Treiber-Ineffizienz, der Bus ist die Wand." }, { en: "A judgement needs a workload: TCP absorbs a 22.5 ms blackout with a retransmit; a UDP telemetry stream during a full redraw does not.", de: "Ein Urteil braucht eine Last: TCP verkraftet eine 22,5-ms-Blackout mit Neuübertragung; ein UDP-Telemetriestrom während eines Vollbild-Neuaufbaus nicht." } ] }
---
## Ziel

Miss etwas Echtes auf dem Board, vergleiche es mit den eigenen dokumentierten Zahlen des Projekts und erreiche ein verteidigtes Urteil über eine daraus folgende Entwurfsentscheidung.

## Worauf du aufbaust

Dieses Projekt setzt die Grundlagen-Steps zur Dirty-Rectangle-Bewertung (m5-04-dirty-rect-eval) und zur PA7-Netzwerkbewertung (m7-05-pa7-network-eval) voraus. Die Vergleichszahlen stehen in `docs/reference/measurements.md`; die Begründung der Zwänge in `docs/explanation/dirty-rectangles.md` und `docs/explanation/pa7-conflict.md`.

## Anforderungen

- Nimm eine ehrliche Messung auf dem echten Board. Der Explorer-Befehl `V` misst den Vollbild-Flush-Durchsatz unter echter Scheduler- und Live-netif-Last neu und druckt Min/Mittel/Max in kpixel/s; das ist der einfachste Start, aber du darfst eine eigene entwerfen (eine Neuaufbau-Rate, eine Blackout-Schätzung je Band).
- **Vergleiche, berichte nicht nur.** Stelle deine Zahl neben die dokumentierte (rund 342 kpixel/s beim `/16`-Teiler, ein Vollbild rund 448 ms) und erkläre die Abweichung oder Übereinstimmung. Erinnere das Modell: 16 SPI-Takte pro Pixel, also ist der Bus die Decke und der Treiber schon bei 97 % davon.
- **Beurteile eine Entscheidung.** Nutze deine Zahl und die dokumentierten, um eine echte Wahl dieses Boards zu bewerten — den `/16`-Teiler, das Einzel-Bounding-Box-Schadensmodell oder das Nicht-Umlöten von SB121/SB122 — und nenne die Last, unter der du sie überdenken würdest.
- Dies ist eine Bewerten-Aufgabe: das Ergebnis ist ein begründetes, auf Messdaten gestütztes Argument, kein Code.

## Abnahme

Die erste Aufgabe hält fest, dass du eine Messung auf dem echten Board gefahren hast. Die zweite ist der Kern: berichte die Zahl, vergleiche sie mit `docs/reference/measurements.md`, erkläre sie über das Busmodell und verteidige ein Urteil zu einer Entwurfsentscheidung mit einer konkreten Last, die es ändern würde.

## Liefern

Ein kurzer Messbericht: deine Zahl, die dokumentierte Zahl, die Erklärung und ein verteidigtes Entwurfsurteil.
