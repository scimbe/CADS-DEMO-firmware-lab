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
    check: { type: question, prompt: { en: "How far does your measured rate sit from the documented 342 kpixel/s, and what explains the gap? Your three numbers - min, average, max - beside the documented one, plus two sentences: the bus model and the cause of the deviation.", de: "Wie weit liegt deine gemessene Rate von den dokumentierten 342 kpixel/s entfernt, und was erklärt die Abweichung? Deine drei Zahlen - Minimum, Mittel, Maximum - neben die dokumentierte, plus zwei Sätze: das Busmodell und die Ursache der Abweichung." }, rubric: "Berichtet Minimum, Mittel und Maximum aus dem eigenen Lauf und stellt sie neben die dokumentierten 342 kpixel/s. Erklärt die Zahl über das Busmodell: sechzehn SPI-Takte pro Pixel beim /16-Teiler ergeben theoretisch 351 kpixel/s, der Treiber liegt also bei rund 97 Prozent davon und es bleibt kein Software-Spielraum - der Bus ist die Decke. Nennt bei einer Abweichung eine Ursache aus der Messbedingung, nicht aus dem Gefühl: der Befehl misst unter Scheduler- und Netzlast, die Streuung zwischen Minimum und Maximum ist selbst der Beleg. Eine Antwort mit nur einer Zahl und ohne Busmodell besteht nicht.", bloom: evaluate }
  - id: judge
    title: Beurteile eine Entwurfsentscheidung
    check: { type: question, prompt: { en: "Under which workload would you revisit one of this board's three design decisions? Three sentences - the named workload, the decision it breaks first, and the measurement you would take first to confirm it.", de: "Unter welcher Last würdest du eine der drei Entwurfsentscheidungen dieses Boards revidieren? Drei Sätze - die benannte Last, die davon zuerst gebrochene Entscheidung, und die Messung, die du zuerst machen würdest, um sie zu bestätigen." }, rubric: "Nennt eine konkrete Last, die es heute nicht gibt, und die davon zuerst gebrochene Entscheidung. Beispiele, die bestehen: ein UDP-Telemetriestrom, der einzelne Datagramme nicht wiederholen kann, bricht das Nicht-Umlöten von SB121/SB122, weil nur dort Display und Ethernet gleichzeitig laufen; eine Oberfläche mit gleichzeitigen kleinen Updates in gegenüberliegenden Ecken bricht das Einzel-Bounding-Box-Modell; eine geforderte Neuzeichenrate über zwei Bildern je Sekunde bricht den /16-Teiler. Schließt mit dem, was zuerst gemessen würde, um die Last zu bestätigen. Ein Urteil ohne benannte Last besteht nicht.", bloom: evaluate }
socratic:
  - { trigger: "task:measured:failed", question: { en: "The command measures under real contention, so it needs a console prompt and time. Which of the two is missing?", de: "Der Befehl misst unter echter Last, er braucht also einen Konsolen-Prompt und Zeit. Welches der beiden fehlt?" }, hints: [ { en: "Does the console answer at all - or is the board still inside the app tree, where the dispatch never sees your line?", de: "Antwortet die Konsole überhaupt - oder sitzt das Board noch im App-Baum, wo das Dispatch deine Zeile nie sieht?" }, { en: "Send scripts/board_key.py quit first if the board is sitting in the app tree, then V with a duration; the command waits briefly for a link before it starts.", de: "Sende zuerst scripts/board_key.py quit, wenn das Board im App-Baum sitzt, dann V mit einer Dauer; der Befehl wartet kurz auf einen Link, bevor er beginnt." }, { en: "Too short a duration can finish no full-screen flush at all, and the report says so instead of printing rates.", de: "Eine zu kurze Dauer schafft womöglich keinen einzigen Vollbild-Flush, und der Bericht sagt das, statt Raten zu drucken." } ] }
  - { trigger: "question:compare:weak", question: { en: "Is the bottleneck the driver or the bus, and which of the two would your number have to beat to prove the other?", de: "Ist der Engpass der Treiber oder der Bus, und welchen der beiden müsste deine Zahl schlagen, um den anderen zu beweisen?" }, hints: [ { en: "Are you comparing your number only against the documented one - or also against the ceiling the bus allows at all?", de: "Vergleichst du deine Zahl nur mit der dokumentierten - oder auch mit der Decke, die der Bus überhaupt zulässt?" }, { en: "The command measures under scheduler and live-netif contention; docs/reference/measurements.md states the conditions under which the documented figure was taken.", de: "Der Befehl misst unter Scheduler- und Netzlast; docs/reference/measurements.md nennt die Bedingungen, unter denen die dokumentierte Zahl entstand." }, { en: "Sixteen SPI clocks per pixel at the /16 divider give the theoretical ceiling; how close your driver sits to it is yours to work out, and the spread between min and max is itself evidence about contention.", de: "Sechzehn SPI-Takte je Pixel beim /16-Teiler ergeben die theoretische Decke; wie nah dein Treiber daran liegt, rechnest du aus, und die Streuung zwischen Minimum und Maximum ist selbst ein Beleg über die Last." } ] }
  - { trigger: "question:judge:weak", question: { en: "A judgement needs a workload that does not exist today. Describe one, then say which decision it breaks first.", de: "Ein Urteil braucht eine Last, die es heute nicht gibt. Beschreib eine und sag dann, welche Entscheidung sie zuerst bricht." }, hints: [ { en: "Are you describing a workload that already exists today? Then it is no test - it is running.", de: "Beschreibst du eine Last, die es heute schon gibt? Dann ist sie kein Prüfstein - sie läuft ja." }, { en: "The three candidates fail under different loads - a redraw rate, a damage pattern, and a simultaneous display-plus-network demand; docs/explanation/pa7-conflict.md and docs/explanation/dirty-rectangles.md each name the constraint behind one.", de: "Die drei Kandidaten scheitern unter verschiedenen Lasten - einer Neuzeichenrate, einem Damage-Muster und einer gleichzeitigen Display- und Netzanforderung; docs/explanation/pa7-conflict.md und docs/explanation/dirty-rectangles.md nennen je den Zwang dahinter." }, { en: "TCP absorbs a bounded blackout with a retransmit; a stream of single datagrams does not. That difference is what makes one workload a test and another one not.", de: "TCP verkraftet einen begrenzten Ausfall mit einer Neuübertragung; ein Strom einzelner Datagramme nicht. Genau dieser Unterschied macht die eine Last zum Prüfstein und die andere nicht." } ] }
---
## Ziel

Miss etwas Echtes auf dem Board, vergleiche es mit den eigenen dokumentierten Zahlen des Projekts und erreiche ein verteidigtes Urteil über eine daraus folgende Entwurfsentscheidung.

## Worauf du aufbaust

**Voraussetzung:** Bearbeite diesen Projekt-Step erst nach den Grundlagen-Steps `m5-04-dirty-rect-eval` und `m7-05-pa7-network-eval`. Der Tutor kann das nicht erzwingen: `requires:` löst nur Steps desselben Packs auf, und die Sperre in `course.json` verlangt den gesamten Grundlagenkurs — die Reihenfolge innerhalb der Projekte liegt bei dir.

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
