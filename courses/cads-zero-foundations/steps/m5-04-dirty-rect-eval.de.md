---
id: m5-04-dirty-rect-eval
title: Eine Bounding-Box oder eine Damage-Liste?
bloom: evaluate
objectives: [cz.gui.dirty-rects]
requires: [m5-03-own-app]
estimatedMinutes: 15
links:
  - { step: m6-01-littlefs }
  - { doc: "docs/explanation/dirty-rectangles.md" }
  - { doc: "docs/reference/measurements.md" }
  - { file: "gui/canvas.h", line: 145 }
sources: [docs/explanation/dirty-rectangles.md, docs/reference/measurements.md, docs/reference/canvas.md, docs/explanation/pa7-conflict.md]
tasks:
  - id: judge-design
    title: Beurteile das Design mit einer einzigen Bounding-Box
    check: { type: question, prompt: { en: "The canvas keeps ONE damage bounding box, so two small updates in opposite corners produce a box covering the whole screen. A damage LIST would avoid that. Using the measured numbers (342 kpixel/s, ~448 ms full screen, 4.7 ms for 40x40) and the project's own reasoning, argue whether the single box is the right design today, name the concrete UI pattern that would make it wrong, and state what you would have to do before replacing it.", de: "Das Canvas hält EINE Damage-Bounding-Box, zwei kleine Updates in gegenüberliegenden Ecken erzeugen also eine Box über den ganzen Bildschirm. Eine Damage-LISTE würde das vermeiden. Argumentiere anhand der gemessenen Zahlen (342 kpixel/s, ~448 ms Vollbild, 4,7 ms für 40x40) und der projekteigenen Begründung, ob die einzelne Box heute das richtige Design ist, benenne das konkrete UI-Muster, das sie falsch machen würde, und sage, was du vor einem Ersatz tun müsstest." }, rubric: "Wägt die Kosten ab: im schlimmsten Fall wird ein 4,7-ms-Update zu ~448 ms, die Oberfläche fällt also kurzzeitig auf etwa 2 fps und der Ethernet-Empfänger ist für den gesamten Neuaufbau blind; erkennt, dass die Box eine bewusste Vereinfachung ist, weil die heutigen Widget-Layouts (Statusleisten-Uhr, Menüauswahl über zwei Zeilen) kein Damage in gegenüberliegenden Ecken erzeugen; benennt das brechende Muster (gleichzeitige kleine Updates weit auseinander, z. B. eine Uhr in einer Ecke und ein Indikator in einer anderen); und schließt mit der Projektregel: erst eine reale Last messen, dann die Box nur dann durch eine Liste auf dem heißen Pfad ersetzen, wenn die Messung die zusätzliche Komplexität rechtfertigt.", bloom: evaluate }
socratic:
  - { trigger: "question:judge-design:weak", question: { en: "What does a two-corner update actually cost in milliseconds with one box, and what would it cost with a list of two rectangles?", de: "Was kostet ein Zwei-Ecken-Update mit einer Box tatsächlich in Millisekunden, und was mit einer Liste aus zwei Rechtecken?" }, hints: [ { en: "One box covering 480x320 is a full flush: ~448 ms at 342 kpixel/s. Two 40x40 rectangles are 2 x 4.7 ms.", de: "Eine Box über 480x320 ist ein voller Flush: ~448 ms bei 342 kpixel/s. Zwei 40x40-Rechtecke sind 2 x 4,7 ms." }, { en: "docs/reference/canvas.md calls the single box a deliberate simplification because the widget layouts here do not generate that pattern.", de: "docs/reference/canvas.md nennt die einzelne Box eine bewusste Vereinfachung, weil die Widget-Layouts hier dieses Muster nicht erzeugen." }, { en: "The stated rule is: if a future app does generate it, measure before building a list - the list costs complexity on the hot path.", de: "Die festgelegte Regel lautet: erzeugt eine künftige App es doch, erst messen, dann eine Liste bauen - die Liste kostet Komplexität auf dem heißen Pfad." } ] }
---
## Lernziel

Bewerte eine reale Designentscheidung dieser Firmware anhand gemessener Zahlen: Das Canvas verfolgt Damage als eine einzige Bounding-Box, und du beurteilst, ob das die richtige Wahl ist und wann sie es nicht mehr wäre.

## Die Entscheidung, wie das Projekt sie formuliert

`docs/reference/canvas.md` ist deutlich: *„Eine einzelne Bounding-Box ist eine bewusste Vereinfachung. Zwei kleine Updates in gegenüberliegenden Ecken erzeugen eine Box über den Bildschirm. Eine Damage-Liste würde das besser handhaben und ist nicht implementiert, weil die Widget-Layouts hier dieses Muster nicht erzeugen und eine Liste Komplexität auf dem heißen Pfad kostet. Erzeugt eine künftige App es doch: erst messen, dann bauen."*

Das ist eine Entscheidung mit genanntem Grund, genanntem Fehlerfall und genannter Bedingung für ihre Revision. Deine Aufgabe in diesem Step ist, alle drei gegen die Belege zu prüfen.

## Die Belege

Alles auf dem physischen Board gemessen (`docs/reference/measurements.md`, `docs/explanation/dirty-rectangles.md`):

| Transfer | Pixel | Zeit | Rate |
|---|---|---|---|
| Vollbild | 153 600 | **448 233 µs** | 342 kpixel/s |
| 40×40-Rechteck | 1 600 | **4 717 µs** | 339 kpixel/s |

Teiltransfers skalieren linear — die Rate ist dieselbe —, also bringt Damage-Verfolgung genau das, was sie verspricht: einen Faktor von etwa 95 zwischen einem kleinen Update und einem vollen Neuaufbau. Der Bus ist die Grenze; der Treiber liegt bei 97 % der theoretischen 351 kpixel/s, es gibt also keinen Software-Spielraum mehr.

Zwei Folgen prägen die Bewertung. Erstens: Eine Oberfläche, die das Vollbild neu zeichnet, läuft mit 2,2 fps, und jede Touch-Reaktion kommt eine halbe Sekunde zu spät — Damage zum Vollbild zu befördern ist also keine Verlangsamung, sondern Unbenutzbarkeit. Zweitens: Auf diesem Board teilen sich Display und Ethernet-PHY den Pin PA7 (`docs/explanation/pa7-conflict.md`); der Empfänger des MAC ist aus, während ein Band hinausgeht, ein Vollbild-Neuaufbau sind also zwanzig Blackouts von je 22,5 ms hintereinander. Eine Damage-Entscheidung ist deshalb zugleich eine Netzwerkentscheidung.

## Was die einzelne Box voraussetzt

Die Box ist richtig, wenn Damage räumlich zusammenhängt: Ein Menü, das seine Auswahl bewegt, berührt zwei benachbarte Zeilen; eine Statusleisten-Uhr beschädigt die Uhr, nicht die Leiste; deine Hello-App aus dem letzten Step zeichnet ein Widget neu. Die Gestaltungsregel in `docs/explanation/dirty-rectangles.md` — *„Gestalte die Oberfläche so, dass Damage klein bleibt"* — hält diese Annahme wahr, und es ist eine Regel, der Apps folgen, keine Eigenschaft, die das Canvas garantiert.

Die Box ist in dem Moment falsch, in dem zwei kleine, gleichzeitige Updates weit auseinanderliegen. Dann wird aus 2 × 4,7 ms ein 448-ms-Auftrag, stillschweigend: `ok 7 - dirty rectangle limits the transfer` im M0-Gate prüft genau deshalb `partial_pixels: 1600`, weil ein Fehler, der Damage zum Vollbild befördert, sich nur als „die Oberfläche fühlt sich träge an" zeigt.

## Deine Aufgabe

Schreibe dein Urteil. Beziehe Stellung, ob die einzelne Box *heute* richtig ist, benenne das konkrete UI-Muster, das sie bricht, beziffere mit den Zahlen oben, was dieses Muster kostet, und sage, was das Projekt von dir verlangt, bevor du die Box durch eine Liste ersetzt. In diesem Step gibt es keine Codeänderung — das Ergebnis ist eine verteidigte Entscheidung.
