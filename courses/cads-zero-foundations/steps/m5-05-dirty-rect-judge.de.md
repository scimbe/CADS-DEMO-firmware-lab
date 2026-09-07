---
id: m5-05-dirty-rect-judge
title: Eine Bounding-Box oder eine Damage-Liste?
bloom: evaluate
objectives: [cz.gui.dirty-rects]
requires: [m5-04-dirty-rect-measure]
estimatedMinutes: 8
scaffold: independent
links:
  - { step: m5-04-dirty-rect-measure }
  - { step: m6-01-littlefs }
  - { doc: "docs/explanation/dirty-rectangles.md" }
  - { file: "gui/canvas.h", line: 145 }
sources: [docs/reference/canvas.md, docs/explanation/dirty-rectangles.md, docs/explanation/pa7-conflict.md]
tasks:
  - id: judge-today
    title: Beurteile die Box gegen die heutigen Layouts
    check: { type: question, prompt: { en: "Is the single bounding box the right choice for the widget layouts that exist today?", de: "Ist die einzelne Bounding-Box für die heute vorhandenen Widget-Layouts die richtige Wahl?" }, rubric: "Bezieht Stellung und begründet mit einem konkreten heutigen Layout: die Menüauswahl bewegt sich über benachbarte Zeilen, die Statusleisten-Uhr beschädigt die Uhr und nicht die Leiste, eine App zeichnet ein Widget neu - Damage bleibt räumlich zusammenhängend, die Box kostet also nichts. Wer die Gegenposition vertritt, muss ein heute existierendes Layout benennen, das gleichzeitiges Damage weit auseinander erzeugt. Eine Antwort ohne einen benannten Bildschirm besteht nicht.", bloom: evaluate }
  - id: revision-condition
    title: Nenne die Bedingung für einen Ersatz
    check: { type: question, prompt: { en: "Under what condition would this project replace the box with a damage list?", de: "Unter welcher Bedingung würde dieses Projekt die Box durch eine Damage-Liste ersetzen?" }, rubric: "Zwei Bedingungen zusammen: erstens ein UI-Muster, das tatsächlich auftritt - zwei kleine, gleichzeitige Updates weit auseinander, etwa eine Uhr in einer Ecke und ein Indikator in einer anderen; zweitens eine Messung unter realer Last, bevor gebaut wird, weil die Liste Komplexität auf dem heißen Pfad kostet. Wer nur eine der beiden Hälften nennt, besteht nicht.", bloom: evaluate }
socratic:
  - { trigger: "question:judge-today:weak", question: { en: "Take the three screens you have already seen - the menu, the status bar, your own app. Where does each of them put its damage?", de: "Nimm die drei Bildschirme, die du schon gesehen hast - das Menü, die Statusleiste, deine eigene App. Wohin legt jeder von ihnen sein Damage?" }, hints: [ { en: "The question is not whether a bounding box is elegant, but whether today's layouts produce far-apart damage at all.", de: "Die Frage ist nicht, ob eine Bounding-Box elegant ist, sondern ob die heutigen Layouts überhaupt weit auseinanderliegendes Damage erzeugen." }, { en: "docs/explanation/dirty-rectangles.md states a design rule that apps follow; a rule is not a guarantee the canvas gives.", de: "docs/explanation/dirty-rectangles.md nennt eine Gestaltungsregel, der Apps folgen; eine Regel ist keine Zusicherung des Canvas." }, { en: "Whichever side you take, your answer has to name a concrete screen - a general argument does not settle this.", de: "Egal welche Seite du wählst, deine Antwort muss einen konkreten Bildschirm nennen - ein allgemeines Argument entscheidet das nicht." } ] }
  - { trigger: "question:revision-condition:weak", question: { en: "The project does not forbid the list. What does it demand first, and why that order?", de: "Das Projekt verbietet die Liste nicht. Was verlangt es zuerst, und warum in dieser Reihenfolge?" }, hints: [ { en: "A list costs complexity on the hot path, so it needs a reason that exists rather than one that might.", de: "Eine Liste kostet Komplexität auf dem heißen Pfad, sie braucht also einen Grund, der existiert, nicht einen, der könnte." }, { en: "Name the UI pattern that would produce the cost you computed in the previous step.", de: "Benenne das UI-Muster, das die Kosten erzeugen würde, die du im vorigen Step berechnet hast." }, { en: "The condition has two halves and both must appear in your answer: a pattern that really occurs, and evidence from a real load.", de: "Die Bedingung hat zwei Hälften und beide müssen in deiner Antwort auftauchen: ein Muster, das wirklich auftritt, und ein Beleg aus echter Last." } ] }
---
## Lernziel

Beurteile eine reale Designentscheidung dieser Firmware anhand der Zahl, die du eben gemessen hast: Das Canvas verfolgt Damage als eine einzige Bounding-Box, und du entscheidest, ob das die richtige Wahl ist und wann sie es nicht mehr wäre.

## Die Zahl, auf der dieses Urteil ruht

[M5-04](step:m5-04-dirty-rect-measure) hat den Zwei-Ecken-Fall gemessen: eine einzelne Bounding-Box kostet rund **448 ms** (die volle Fläche von 153 600 Pixeln, weil die Box beide Ecken umschließt); eine Liste aus zwei Rechtecken kostet rund **9,4 ms** (2 × 4,7 ms). Das Verhältnis liegt bei etwa **48**. Alles Folgende argumentiert mit diesen beiden Zahlen, nicht mit einer neu geschätzten.

## Die Entscheidung, wie das Projekt sie formuliert

`docs/reference/canvas.md` ist deutlich: *„Eine einzelne Bounding-Box ist eine bewusste Vereinfachung. Zwei kleine Updates in gegenüberliegenden Ecken erzeugen eine Box über den Bildschirm."*

Das ist eine Entscheidung mit einem genannten Fehlerfall, und du kennst jetzt ihren Preis. Warum sie trotzdem getroffen wurde und wann sie fiele, steht dort nicht — das entscheidest du in diesem Step.

## Woran die Box hängt

Ob eine einzelne Box genügt, hängt allein daran, wo die Oberfläche ihr Damage hinlegt. `docs/explanation/dirty-rectangles.md` formuliert dazu eine **Gestaltungsregel** — *„Gestalte die Oberfläche so, dass Damage klein bleibt"* —, und eine Regel ist etwas, dem Apps folgen, keine Eigenschaft, die das Canvas garantiert. Welche Bildschirme dieser Firmware die Regel heute einhalten und welches Muster sie brechen würde, ist deine Sache in diesem Step.

Dass die Verletzung stumm bleibt, ist der eigentliche Grund für die Sorgfalt: `ok 7 - dirty rectangle limits the transfer` im M0-Gate prüft `partial_pixels: 1600`, weil ein Fehler, der Damage zum Vollbild befördert, sich sonst nur als „die Oberfläche fühlt sich träge an" zeigt.

Eine Folge gehört noch dazu, und sie ist nicht optisch: Auf diesem Board teilen sich Display und Ethernet-PHY den Pin PA7 (`docs/explanation/pa7-conflict.md`), der Empfänger des MAC ist also aus, solange ein Band hinausgeht. Eine Damage-Entscheidung ist damit zugleich eine Netzwerkentscheidung — wie teuer genau, bewertest du in M7-05.

## Deine Aufgabe

Zwei Schritte, jeder für sich. Erst beziehst du Stellung, ob die Box für die heute existierenden Layouts richtig ist, und stützt das auf einen konkreten Bildschirm. Dann nennst du die Bedingung, unter der dieses Projekt sie ersetzen würde. In diesem Step gibt es keine Codeänderung — das Ergebnis ist eine verteidigte Entscheidung, aufgebaut auf der Zahl, die dir M5-04 gegeben hat.
