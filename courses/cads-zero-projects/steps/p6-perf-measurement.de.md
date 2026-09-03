---
id: p6-perf-measurement
title: "Projekt: eine Performance-Messung"
bloom: evaluate
objectives: [cz.net.arbitration]
requires: []
estimatedMinutes: 90
scaffold: independent
links:
  - { doc: "docs/reference/measurements.md" }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/explanation/dirty-rectangles.md" }
sources: [docs/reference/measurements.md, docs/explanation/pa7-conflict.md, docs/explanation/dirty-rectangles.md, apps/bringup/explorer_throughput_demo.c]
tasks:
  - id: measured
    title: Du hast den Durchsatz auf dem echten Board gemessen
    check: { type: serialExpect, send: "V 10\n", pattern: "kpixel/s: min=", timeoutMs: 45000, bloom: evaluate }
  - id: compare
    title: Vergleiche mit der dokumentierten Zahl
    check: { type: question, prompt: { en: "How far does your measured rate sit from the documented 342 kpixel/s, and what explains the gap?", de: "Wie weit liegt deine gemessene Rate von den dokumentierten 342 kpixel/s entfernt, und was erklärt die Abweichung?" }, rubric: "Berichtet Minimum, Mittel und Maximum aus dem eigenen Lauf und stellt sie neben die dokumentierten 342 kpixel/s. Erklärt die Zahl über das Busmodell: sechzehn SPI-Takte pro Pixel beim /16-Teiler ergeben theoretisch 351 kpixel/s, der Treiber liegt also bei rund 97 Prozent davon und es bleibt kein Software-Spielraum - der Bus ist die Decke. Nennt bei einer Abweichung eine Ursache aus der Messbedingung, nicht aus dem Gefühl: der Befehl misst unter Scheduler- und Netzlast, die Streuung zwischen Minimum und Maximum ist selbst der Beleg. Eine Antwort mit nur einer Zahl und ohne Busmodell besteht nicht.", bloom: evaluate }
  - id: judge
    title: Beurteile eine Entwurfsentscheidung
    check: { type: question, prompt: { en: "Under which workload would you revisit one of this board's three design decisions?", de: "Unter welcher Last würdest du eine der drei Entwurfsentscheidungen dieses Boards revidieren?" }, rubric: "Nennt eine konkrete Last, die es heute nicht gibt, und die davon zuerst gebrochene Entscheidung. Beispiele, die bestehen: ein UDP-Telemetriestrom, der einzelne Datagramme nicht wiederholen kann, bricht das Nicht-Umlöten von SB121/SB122, weil nur dort Display und Ethernet gleichzeitig laufen; eine Oberfläche mit gleichzeitigen kleinen Updates in gegenüberliegenden Ecken bricht das Einzel-Bounding-Box-Modell; eine geforderte Neuzeichenrate über zwei Bildern je Sekunde bricht den /16-Teiler. Schließt mit dem, was zuerst gemessen würde, um die Last zu bestätigen. Ein Urteil ohne benannte Last besteht nicht.", bloom: evaluate }
socratic:
  - { trigger: "task:measured:failed", question: { en: "The command measures under real contention, so it needs a console prompt and time. Which of the two is missing?", de: "Der Befehl misst unter echter Last, er braucht also einen Konsolen-Prompt und Zeit. Welches der beiden fehlt?" }, hints: [ { en: "Send scripts/board_key.py quit first if the board is sitting in the app tree.", de: "Sende zuerst scripts/board_key.py quit, wenn das Board im App-Baum sitzt." }, { en: "It waits briefly for a link before it starts, then runs for the number of seconds you gave it.", de: "Es wartet kurz auf einen Link, bevor es beginnt, und läuft dann die von dir angegebene Anzahl Sekunden." }, { en: "Too short a duration can finish no full-screen flush at all, and the report says so instead of printing rates.", de: "Eine zu kurze Dauer schafft womöglich keinen einzigen Vollbild-Flush, und der Bericht sagt das, statt Raten zu drucken." } ] }
  - { trigger: "question:compare:weak", question: { en: "Is the bottleneck the driver or the bus, and which of the two would your number have to beat to prove the other?", de: "Ist der Engpass der Treiber oder der Bus, und welchen der beiden müsste deine Zahl schlagen, um den anderen zu beweisen?" }, hints: [ { en: "Sixteen SPI clocks per pixel at the /16 divider give a theoretical ceiling; compare your number to that, not only to the documented one.", de: "Sechzehn SPI-Takte pro Pixel beim /16-Teiler ergeben eine theoretische Decke; vergleich deine Zahl damit, nicht nur mit der dokumentierten." }, { en: "The command measures under scheduler and live-netif contention, so min and avg can differ from a quiet-bench figure.", de: "Der Befehl misst unter Scheduler- und Netzlast, min und Mittel können also von einem Wert an der stillen Werkbank abweichen." }, { en: "Report min, average and max, not one number - the spread is itself evidence about contention.", de: "Berichte Minimum, Mittel und Maximum, nicht eine Zahl - die Streuung ist selbst ein Beleg über die Last." } ] }
  - { trigger: "question:judge:weak", question: { en: "A judgement needs a workload that does not exist today. Describe one, then say which decision it breaks first.", de: "Ein Urteil braucht eine Last, die es heute nicht gibt. Beschreib eine und sag dann, welche Entscheidung sie zuerst bricht." }, hints: [ { en: "The three candidates fail under different loads: a redraw rate, a damage pattern, and a simultaneous display-plus-network demand.", de: "Die drei Kandidaten scheitern unter verschiedenen Lasten: einer Neuzeichenrate, einem Damage-Muster und einer gleichzeitigen Display- und Netzanforderung." }, { en: "TCP absorbs a bounded blackout with a retransmit; a stream of single datagrams does not.", de: "TCP verkraftet einen begrenzten Ausfall mit einer Neuübertragung; ein Strom einzelner Datagramme nicht." }, { en: "End with what you would measure first to confirm the workload really breaks it - the project requires evidence before complexity.", de: "Schließe damit, was du zuerst messen würdest, um zu bestätigen, dass die Last sie wirklich bricht - das Projekt verlangt Belege vor Komplexität." } ] }
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

1. **Die Messung.** Der Check sendet `V 10` an die Board-Konsole und wartet auf die Ergebniszeile mit Minimum, Mittel und Maximum. Es gibt hier kein Häkchen: entweder das Board hat gemessen, oder der Check schlägt fehl.
2. **Der Vergleich.** Du berichtest deine drei Zahlen gegen die dokumentierten 342 kpixel/s und erklärst die Abweichung oder die Übereinstimmung über das Busmodell.
3. **Das Urteil.** Du nennst eine Last, unter der du eine der drei Entwurfsentscheidungen revidieren würdest.

## Liefern

Ein kurzer Messbericht: deine Zahl, die dokumentierte Zahl, die Erklärung und ein verteidigtes Entwurfsurteil.
