---
id: m7-05-pa7-network-eval
title: Den PA7-Zeitschlitz als Netzwerkentscheidung bewerten
bloom: evaluate
objectives: [cz.net.arbitration]
requires: [m7-04-recon-tools]
estimatedMinutes: 15
scaffold: independent
recallFrom: [m3-05-spi-mutex, m4-03-mutex-spi-bus]
links:
  - { step: m8-01-unit-tests }
  - { step: m3-05-spi-mutex }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/HARDWARE.md" }
  - { doc: "docs/reference/measurements.md" }
sources: [docs/explanation/pa7-conflict.md, docs/HARDWARE.md, docs/reference/measurements.md, docs/ROADMAP.md, gui/canvas.c]
tasks:
  - id: blackout-bound
    title: Warum der Ausfall begrenzt ist
    check: { type: question, prompt: { en: "Why is the longest single receiver blackout one band rather than a whole redraw?", de: "Warum ist der längste einzelne Empfänger-Ausfall ein Band und nicht ein ganzer Neuaufbau?" }, rubric: "Weil cads_canvas_flush() die beschädigte Region nicht in einem Stück überträgt, sondern in Bändern von höchstens sechzehn Zeilen, und cads_hal_display_blit() den Bus je Aufruf claimt und wieder freigibt. Zwischen zwei Bändern kommt der MAC also zurück. Ein Vollbild sind zwanzig solche Bänder: 448 ms Gesamtdauer, aber nie ein einzelner 448-ms-Ausfall, sondern zwanzigmal 22,5 ms mit Empfangsfenstern dazwischen. Bestanden nur, wenn die Granularität des Bus-Claims genannt wird; wer nur sagt, es werde in Bändern gezeichnet, besteht nicht.", bloom: evaluate }
  - id: traffic-class
    title: Welcher Verkehr ihn nicht verträgt
    check: { type: question, prompt: { en: "Which traffic class does not survive the blackout, and what does that demand of your protocol?", de: "Welche Verkehrsart übersteht den Ausfall nicht, und was verlangt das von deinem Protokoll?" }, rubric: "UDP. TCP verkraftet den Ausfall als kurzen Verlust-Burst, den Neuübertragung und Fensteranpassung aufholen; Datagramme, die im Fenster ankommen, sind dagegen ersatzlos weg, weil niemand sie wiederholt. Folge für den eigenen Entwurf: alles hier Gebaute, das an einzelnen Datagrammen hängt - ein Discovery-Protokoll, ein Telemetriestrom, die passiven Wachen aus dem vorigen Step - muss Verlust tolerieren oder selbst wiederholen. Nennt zusätzlich, dass Dirty-Rectangles damit zur Netzwerkregel werden. Eine Antwort ohne eine Regel für den eigenen Entwurf besteht nicht.", bloom: evaluate }
  - id: solder-bridge
    title: Die Lötbrücken-Entscheidung
    check: { type: question, prompt: { en: "Would you swap SB121/SB122 on this lab board?", de: "Würdest du SB121/SB122 auf diesem Laborboard tauschen?" }, rubric: "Jede Position besteht, die die Fakten benutzt. Nennt die Entscheidung des Projekts vom 2026-08-18 - keine Modifikation - und mindestens einen der festgehaltenen Gründe: physische Arbeit an einem geteilten Laborboard, abweichende Anforderungen gegenüber jedem anderen Projekt auf derselben Hardware, Überraschung für den nächsten Nutzer. Und benennt, was für die Gegenposition spricht: der Tausch ist laut UM1974 reversibel, legt D11 auf PB5, lässt PA7 der PHY und kompiliert mit CADS_SPI_MOSI_ON_PB5 jede Arbitrierung weg, sodass Display und Ethernet gleichzeitig mit voller Geschwindigkeit laufen. Wer nur die Projektgründe wiederholt, ohne eine Bedingung zu nennen, unter der die andere Wahl gewinnt, besteht nicht.", bloom: evaluate }
socratic:
  - { trigger: "question:blackout-bound:weak", question: { en: "A full redraw and one band are both flushes. What does the flush path do between them that hands the pin back?", de: "Ein Vollbild und ein Band sind beide Flushes. Was tut der Flush-Pfad dazwischen, das den Pin zurückgibt?" }, hints: [ { en: "Look at how much of the damaged region cads_canvas_flush() converts at a time in gui/canvas.c.", de: "Sieh dir an, wie viel der beschädigten Region cads_canvas_flush() in gui/canvas.c auf einmal umwandelt." }, { en: "Ask where the bus claim and release sit - around the whole flush, or around each transfer.", de: "Frag dich, wo Claim und Release des Busses sitzen - um den ganzen Flush oder um jede einzelne Übertragung." }, { en: "Your answer needs the consequence for the MAC, not just the mechanism: what does it get to do between two bands?", de: "Deine Antwort braucht die Folge für den MAC, nicht nur den Mechanismus: was darf er zwischen zwei Bändern tun?" } ] }
  - { trigger: "question:traffic-class:weak", question: { en: "One of the two transport protocols notices loss and does something about it. Which one, and what does the other one do instead?", de: "Eines der beiden Transportprotokolle bemerkt Verlust und tut etwas dagegen. Welches, und was tut das andere stattdessen?" }, hints: [ { en: "Retransmission and window adjustment are properties of one protocol only.", de: "Neuübertragung und Fensteranpassung sind Eigenschaften nur eines Protokolls." }, { en: "Think about the recon watches from the previous step: they observe single frames that nobody repeats.", de: "Denk an die Wachen aus dem vorigen Step: sie beobachten einzelne Frames, die niemand wiederholt." }, { en: "The question asks for a demand on your own design, so end with a rule you would follow when building on this board.", de: "Gefragt ist eine Anforderung an deinen eigenen Entwurf, schließe also mit einer Regel, der du auf diesem Board folgen würdest." } ] }
  - { trigger: "question:solder-bridge:weak", question: { en: "The modification is documented and reversible. So what makes it a decision rather than an obvious improvement?", de: "Die Modifikation ist dokumentiert und reversibel. Was macht sie also zu einer Entscheidung statt zu einer offensichtlichen Verbesserung?" }, hints: [ { en: "Ask who else touches this board, and what they would find changed without being told.", de: "Frag, wer dieses Board sonst noch anfasst und was diese Person verändert vorfände, ohne es zu wissen." }, { en: "The recorded reasons are under the decision heading in docs/explanation/pa7-conflict.md and in the resolved decisions of docs/ROADMAP.md.", de: "Die festgehaltenen Gründe stehen unter der Entscheidungsüberschrift in docs/explanation/pa7-conflict.md und in den Resolved decisions von docs/ROADMAP.md." }, { en: "A position that only repeats the project's reasons is not an evaluation - say what would have to be true for the other choice to win.", de: "Eine Position, die nur die Gründe des Projekts wiederholt, ist keine Bewertung - sag, was wahr sein müsste, damit die andere Wahl gewinnt." } ] }
---
## Lernziel

Bewerte mit den eigenen Messungen des Projekts, was der PA7-Zeitschlitz zwischen Display und Ethernet das Netzwerk kostet, und nimm eine begründete Position zur Lötbrücken-Korrektur ein, die das Projekt bewusst nicht angewendet hat.

## Den Zwang kennst du

Dass `SPI1_MOSI` und `ETH_RMII_CRS_DV` derselbe Pin PA7 sind, dass eine Alternativfunktion einen Pin zu einer Zeit besitzt und dass die Firmware das mit `cads_hal_spi_claim_bus()` / `release_bus()` pro Blit arbitriert, steht in **M3-05** und wird in **M4-03** zur Scheduler-Frage. Auch die Zahlentabelle — Band, Vollbild, längster Ausfall bei `/16` und `/8` — steht dort und in `docs/reference/measurements.md`. Hier wird beides **benutzt**, nicht wiederholt: schlag die Zahlen nach, wenn du sie brauchst.

Neu ist die Frage: was kostet dieser Zwang das **Netzwerk**, und was folgt daraus für alles, was du auf diesem Board baust?

## Die Größe, über die man nachdenkt

Solange das Display PA7 besitzt, ist der Empfänger des MAC aus. Die interessante Zahl ist deshalb nicht die gesamte Neuzeichenzeit, sondern der **längste ununterbrochene Ausfall** — und die beiden sind nicht dasselbe. Warum sie auseinanderfallen, liegt im Flush-Pfad (`gui/canvas.c`) und ist die erste Frage dieses Steps.

Zur Einordnung: 22,5 ms sind auf einem 100-Mbit-Link grob 280 KB Leitungszeit. Kleinere Bänder wurden erwogen und verworfen, weil jedes Band einen Bus-Claim, einen MAC-Stop/Start und eine Fenstersetz-Sequenz kostet — das Halbieren des Bands verdoppelt diesen Aufwand, um einen Ausfall zu halbieren, den nicht jede Verkehrsart überhaupt bemerkt. Welche ihn bemerkt, ist die zweite Frage.

## Die Korrektur, die es gibt

UM1974 §6.9 dokumentiert die Lötbrücken SB121/SB122: ihr Tausch legt D11 auf PB5, lässt PA7 der PHY, und `-DCADS_SPI_MOSI_ON_PB5=1` kompiliert jede Arbitrierung weg — Display und Ethernet liefen dann gleichzeitig mit voller Geschwindigkeit. **Entschieden am 2026-08-18: das Board bleibt unverändert.** Die Gründe stehen unter der Entscheidungsüberschrift in `docs/explanation/pa7-conflict.md` und in den Resolved decisions von `docs/ROADMAP.md`. Das Projekt behandelt den Zeitschlitz als Zwang, um den es herum entwirft, nicht als einen, den es bloß erträgt.

## Deine Aufgabe

Drei getrennte Urteile. Erst der Mechanismus: warum der Ausfall auf ein Band begrenzt ist und nicht auf den Neuaufbau. Dann die Folge: welche Verkehrsart ihn nicht verträgt und welche Regel du daraus für eigene Protokolle ableitest. Zuletzt die Entscheidung: würdest du die Lötbrücken tauschen? Zustimmung ist nicht verlangt — die Nutzung der Fakten schon, und eine Bedingung, unter der die andere Wahl gewinnt.
