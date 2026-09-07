---
id: m7-06-pa7-position
title: Die Lötbrücken-Entscheidung
bloom: evaluate
objectives: [cz.net.arbitration]
requires: [m7-05-pa7-network-cost]
estimatedMinutes: 8
scaffold: independent
links:
  - { step: m7-05-pa7-network-cost }
  - { step: m8-01-unit-tests }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/HARDWARE.md" }
sources: [docs/explanation/pa7-conflict.md, docs/ROADMAP.md, docs/HARDWARE.md]
tasks:
  - id: solder-bridge
    title: Die Lötbrücken-Entscheidung
    check: { type: question, prompt: { en: "Would you swap SB121/SB122 on this lab board?", de: "Würdest du SB121/SB122 auf diesem Laborboard tauschen?" }, rubric: "Jede Position besteht, die die Fakten benutzt. Nennt die Entscheidung des Projekts vom 2026-08-18 - keine Modifikation - und mindestens einen der festgehaltenen Gründe: physische Arbeit an einem geteilten Laborboard, abweichende Anforderungen gegenüber jedem anderen Projekt auf derselben Hardware, Überraschung für den nächsten Nutzer. Und benennt, was für die Gegenposition spricht: der Tausch ist laut UM1974 reversibel, legt D11 auf PB5, lässt PA7 der PHY und kompiliert mit CADS_SPI_MOSI_ON_PB5 jede Arbitrierung weg, sodass Display und Ethernet gleichzeitig mit voller Geschwindigkeit laufen. Wer nur die Projektgründe wiederholt, ohne eine Bedingung zu nennen, unter der die andere Wahl gewinnt, besteht nicht.", bloom: evaluate }
socratic:
  - { trigger: "question:solder-bridge:weak", question: { en: "The modification is documented and reversible. So what makes it a decision rather than an obvious improvement?", de: "Die Modifikation ist dokumentiert und reversibel. Was macht sie also zu einer Entscheidung statt zu einer offensichtlichen Verbesserung?" }, hints: [ { en: "Ask who else touches this board, and what they would find changed without being told.", de: "Frag, wer dieses Board sonst noch anfasst und was diese Person verändert vorfände, ohne es zu wissen." }, { en: "The recorded reasons are under the decision heading in docs/explanation/pa7-conflict.md and in the resolved decisions of docs/ROADMAP.md.", de: "Die festgehaltenen Gründe stehen unter der Entscheidungsüberschrift in docs/explanation/pa7-conflict.md und in den Resolved decisions von docs/ROADMAP.md." }, { en: "A position that only repeats the project's reasons is not an evaluation - say what would have to be true for the other choice to win.", de: "Eine Position, die nur die Gründe des Projekts wiederholt, ist keine Bewertung - sag, was wahr sein müsste, damit die andere Wahl gewinnt." } ] }
---
## Lernziel

Beziehe eine verteidigte Position zu der einen Hardware-Lösung, die die PA7-Zeitscheibe vollständig entfernen würde — mit den Kosten, die du eben gemessen hast, nicht mit einer neu geschätzten Zahl.

## Die Kosten, auf denen diese Entscheidung ruht

[M7-05](step:m7-05-pa7-network-cost) hat die Randbedingung gemessen, die du hier beurteilst: Der längste ununterbrochene Empfänger-Ausfall ist ein Band, etwa **22,5 ms**, begrenzt durch den Staging-Puffer des Canvas; ein Vollbild-Neuaufbau verteilt das auf zwanzig solcher Bänder statt auf einen 448-ms-Ausfall. Du hast außerdem benannt, welche Verkehrsart selbst den kurzen Ausfall nicht übersteht — UDP — und was das von einem Protokoll auf diesem Board verlangt. Beide Zahlen argumentieren unten mit; keine wird hier neu berechnet.

## Die Lösung, die es gäbe

UM1974 §6.9 dokumentiert die Lötbrücken SB121/SB122: Ihr Tausch verschiebt D11 nach PB5, überlässt PA7 dem PHY, und `-DCADS_SPI_MOSI_ON_PB5=1` rechnet die gesamte Schlichtung heraus — Display und Ethernet liefen dann gleichzeitig mit voller Geschwindigkeit. **Entschieden am 18.08.2026: Das Board bleibt unverändert.** Die Gründe stehen unter der Entscheidungsüberschrift in `docs/explanation/pa7-conflict.md` und in den Resolved decisions von `docs/ROADMAP.md`. Das Projekt behandelt die Zeitscheibe als Randbedingung, um die herum es entwirft, nicht als eine, die es bloß erträgt.

Dieser Step verlangt **keine Hardware-Änderung**: Du bewertest die Entscheidung, du lötest nicht. Es gibt nichts zu bauen und auch nichts zu flashen.

## Deine Aufgabe

Eine Freitextfrage, unten im Step-Text mit Antwortfeld und **Prüfen**-Knopf daneben. Bleibt sie rot, hilft der **Hinweis zeigen**-Knopf; seine erste Stufe fragt nach dem häufigsten Fehler.

Würdest du die Lötbrücken auf diesem Laborboard tauschen? Zustimmung zum Projekt ist nicht verlangt — die Fakten zu nutzen schon, ebenso eine Bedingung zu nennen, unter der die andere Wahl gewinnt.

<!-- SHOT: m7-position-task | Step-Text-Reiter in der Mitte, unten die Freitextaufgabe mit Antwortfeld, Prüfen-Knopf und Hinweis-zeigen-Knopf -->

Um zwischendurch zu einem anderen Step zu springen:

::: do palette="> CaDS Tutor: Zu Schritt springen"
Drücke **`F1`**, tippe `Zu Schritt springen` und bestätige mit `Enter`.
> expect: Die Palette listet die Steps dieses Kurses, und die Auswahl eines Eintrags öffnet dessen Steptext als Reiter in der Mitte.
> recover: Reagiert die Palette gar nicht, hat der Browser `Strg`/`Cmd`+`Umschalt`+`P` abgefangen — `F1` funktioniert immer. Mit der Maus tut der Kursbaum links in der Seitenleiste dasselbe, hinter dem Doktorhut-Symbol der äußersten Leiste.
:::

Die Oberfläche ist englisch, während der Kurstext deutsch ist; die Befehle des Tutors selbst sind dagegen deutsch, `Zu Schritt springen` heißt also wirklich so.
