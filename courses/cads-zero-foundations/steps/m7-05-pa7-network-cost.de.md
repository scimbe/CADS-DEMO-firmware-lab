---
id: m7-05-pa7-network-cost
title: Was der PA7-Zeitscheibe das Netzwerk kostet
bloom: analyze
objectives: [cz.net.arbitration]
requires: [m7-04-recon-tools]
estimatedMinutes: 12
scaffold: independent
recallFrom: [m3-05-spi-mutex, m4-03-mutex-spi-bus, m5-04-dirty-rect-measure]
links:
  - { step: m7-06-pa7-position }
  - { step: m3-05-spi-mutex }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/reference/measurements.md" }
sources: [docs/explanation/pa7-conflict.md, docs/reference/measurements.md, gui/canvas.c]
tasks:
  - id: band-bounds-blackout
    title: Sichere zu, dass ein Band den Ausfall begrenzt
    check: { type: all, bloom: analyze, checks: [ { type: command, cwd: ".", command: "t=$(mktemp); { git diff -U0 -- tests/unit; git ls-files --others --exclude-standard -- tests/unit | xargs -r sed 's/^/+/'; } | grep -vE '^[+][[:space:]]*([/][/*]|[*])' > $t; grep -qE '^[+].*cads_fake_blit_at' $t && grep -qE '^[+].*cads_fake_blit_count' $t && grep -qE '^[+].*(480[^;]*16|16[^;]*480|7680)' $t; r=$?; rm -f $t; exit $r", expectExitCode: 0 }, { type: task, label: "CaDS: Host tests", expectExitCode: 0 } ] }
  - id: blackout-bound
    title: Warum der Ausfall begrenzt ist
    check: { type: question, prompt: { en: "Why is the longest single receiver blackout one band rather than a whole redraw?", de: "Warum ist der längste einzelne Empfänger-Ausfall ein Band und nicht ein ganzer Neuaufbau?" }, recallPrompt: { en: "The display and Ethernet share pin PA7 on this board, and the MAC's receiver is off while the display holds the bus. Why is the longest uninterrupted blackout one band rather than a whole redraw?", de: "Display und Ethernet teilen sich auf diesem Board den Pin PA7, und der Empfänger des MAC ist aus, solange das Display den Bus hält. Warum ist der längste ununterbrochene Ausfall ein Band und nicht ein ganzer Neuaufbau?" }, rubric: "Weil cads_canvas_flush() die beschädigte Region nicht in einem Stück überträgt, sondern in Bändern, und cads_hal_display_blit() den Bus je Band claimt und wieder freigibt. Zwischen zwei Bändern kommt der MAC also zurück. Die Bandgrenze ist dabei der Zwischenpuffer cads_stage, und zwar in Bildpunkten, nicht in Zeilen: gui/canvas.c rechnet rows_per_band = CADS_STAGE_PIXELS / width, mit CADS_STAGE_PIXELS = 480 × 16 = 7680. Über die volle Breite sind das sechzehn Zeilen je Band; ein halb so breiter Schadensbereich bekommt bei gleichem Pixelbudget zweiunddreißig. Der Ausfall ist also durch die Bankgröße in Bildpunkten begrenzt, nicht durch eine feste Zeilenzahl. Ein Vollbild sind zwanzig solche Bänder: 448 ms Gesamtdauer, aber nie ein einzelner 448-ms-Ausfall, sondern zwanzigmal 22,5 ms mit Empfangsfenstern dazwischen. Bestanden nur, wenn die Granularität des Bus-Claims genannt wird; wer nur sagt, es werde in Bändern gezeichnet, besteht nicht.", bloom: evaluate }
  - id: traffic-class
    title: Welcher Verkehr ihn nicht verträgt
    check: { type: question, prompt: { en: "Which traffic class does not survive the blackout, and what does that demand of your protocol?", de: "Welche Verkehrsart übersteht den Ausfall nicht, und was verlangt das von deinem Protokoll?" }, rubric: "UDP. TCP verkraftet den Ausfall als kurzen Verlust-Burst, den Neuübertragung und Fensteranpassung aufholen; Datagramme, die im Fenster ankommen, sind dagegen ersatzlos weg, weil niemand sie wiederholt. Folge für den eigenen Entwurf: alles hier Gebaute, das an einzelnen Datagrammen hängt - ein Discovery-Protokoll, ein Telemetriestrom, die passiven Wachen aus dem vorigen Step - muss Verlust tolerieren oder selbst wiederholen. Nennt zusätzlich, dass Dirty-Rectangles damit zur Netzwerkregel werden. Eine Antwort ohne eine Regel für den eigenen Entwurf besteht nicht.", bloom: evaluate }
socratic:
  - { trigger: "task:band-bounds-blackout:failed", question: { en: "The check reads the lines your change ADDS under tests/unit. Does your case look at the blit log at all?", de: "Der Check liest die Zeilen, die deine Änderung unter tests/unit HINZUFÜGT. Sieht dein Fall überhaupt in den Blit-Mitschnitt?" }, hints: [ { en: "A full-screen flush is not one transfer. Ask the fake HAL how many blits it recorded before you assert anything about their size.", de: "Ein Vollbild-Flush ist nicht eine Übertragung. Frag die Fake-HAL zuerst, wie viele Blits sie aufgezeichnet hat, bevor du etwas über ihre Größe zusicherst." }, { en: "tests/unit/fake_hal.h offers cads_fake_blit_count() and cads_fake_blit_at(); each record carries x, y, width and height.", de: "tests/unit/fake_hal.h bietet cads_fake_blit_count() und cads_fake_blit_at(); jeder Eintrag trägt x, y, width und height." }, { en: "One band is the canvas width times sixteen rows. Assert that for every record, and require more than one record.", de: "Ein Band ist die Canvasbreite mal sechzehn Zeilen. Sichere das für jeden Eintrag zu und verlange mehr als einen Eintrag." } ] }
  - { trigger: "question:blackout-bound:weak", question: { en: "A full redraw and one band are both flushes. What does the flush path do between them that hands the pin back?", de: "Ein Vollbild und ein Band sind beide Flushes. Was tut der Flush-Pfad dazwischen, das den Pin zurückgibt?" }, hints: [ { en: "Look at how much of the damaged region cads_canvas_flush() converts at a time in gui/canvas.c - and note that rows_per_band is computed, not fixed.", de: "Sieh dir an, wie viel der beschädigten Region cads_canvas_flush() in gui/canvas.c auf einmal umwandelt - und beachte, dass rows_per_band gerechnet wird und nicht festverdrahtet ist." }, { en: "Ask where the bus claim and release sit - around the whole flush, or around each transfer.", de: "Frag dich, wo Claim und Release des Busses sitzen - um den ganzen Flush oder um jede einzelne Übertragung." }, { en: "Your answer needs the consequence for the MAC, not just the mechanism: what does it get to do between two bands?", de: "Deine Antwort braucht die Folge für den MAC, nicht nur den Mechanismus: was darf er zwischen zwei Bändern tun?" } ] }
  - { trigger: "question:traffic-class:weak", question: { en: "One of the two transport protocols notices loss and does something about it. Which one, and what does the other one do instead?", de: "Eines der beiden Transportprotokolle bemerkt Verlust und tut etwas dagegen. Welches, und was tut das andere stattdessen?" }, hints: [ { en: "Retransmission and window adjustment are properties of one protocol only.", de: "Neuübertragung und Fensteranpassung sind Eigenschaften nur eines Protokolls." }, { en: "Think about the recon watches from the previous step: they observe single frames that nobody repeats.", de: "Denk an die Wachen aus dem vorigen Step: sie beobachten einzelne Frames, die niemand wiederholt." }, { en: "The question asks for a demand on your own design, so end with a rule you would follow when building on this board.", de: "Gefragt ist eine Anforderung an deinen eigenen Entwurf, schließe also mit einer Regel, der du auf diesem Board folgen würdest." } ] }
---
## Lernziel

Miss mit den Werkzeugen des Projekts, was die PA7-Zeitscheibe zwischen Display und Ethernet das Netzwerk tatsächlich kostet. [Der nächste Step](step:m7-06-pa7-position) nutzt diese Kosten, um zur Lösung Stellung zu beziehen, die das Projekt nicht angewendet hat.

## Sichere die Grenze zu, statt sie nur zu zitieren

Dass der längste Ausfall ein Band und kein ganzer Bildaufbau ist, hängt an einer einzigen Eigenschaft des Canvas: `cads_canvas_flush()` überträgt in Bändern von höchstens sechzehn Zeilen, und `cads_hal_display_blit()` beansprucht und gibt den Bus je Band frei. Diese Eigenschaft ist portabler Code und deshalb auf dem Host prüfbar.

Die erste Aufgabe verlangt einen Unity-Fall in `tests/unit/test_canvas.c`, der einen Vollbild-Flush auslöst und danach über den Blit-Mitschnitt der aufzeichnenden HAL zusichert, dass **kein einzelner Blit** mehr als ein Band trägt — 480 × 16 Pixel. Entfernst du die Bandzerlegung, fällt genau dieser Fall, und mit ihm die Zahl, mit der du gleich argumentierst.

Die Rate von 342 kpixel/s aus `docs/reference/measurements.md` gilt für den `/16`-Teiler; die `/8`-Zeile dieser Tabelle hat keine Host-Entsprechung, dieser Fall deckt sie also nicht ab.

## Die M5-Damage-Entscheidung zahlt sich hier aus

In [M5-05](step:m5-05-dirty-rect-judge) hast du die einzelne Bounding-Box gegen eine Damage-Liste beurteilt und dort gelesen, dass eine Damage-Entscheidung zugleich eine Netzwerkentscheidung ist. Wie teuer genau, misst du jetzt.

## Die Randbedingung kennst du schon

Dass `SPI1_MOSI` und `ETH_RMII_CRS_DV` derselbe Pin sind, PA7, dass eine alternative Funktion einen Pin jeweils allein besitzt, und dass die Firmware das je Blit mit `cads_hal_spi_claim_bus()` / `release_bus()` schlichtet, steht in **M3-05** und wird in **M4-03** zur Scheduler-Frage. Die Zahlentabelle — Band, Vollbild, längster Ausfall bei `/16` und `/8` — steht in `docs/explanation/pa7-conflict.md`, im Abschnitt zum längsten ununterbrochenen Ausfall; dort und nirgends sonst. `docs/reference/measurements.md` trägt daneben die gemessenen Vollbildzeiten und Durchsätze je SPI-Teiler (448 233 µs bei `/16`, 229 526 µs bei `/8`), aber keine Bandzeile. All das wird hier **benutzt**, nicht wiederholt.

Öffne beide Dokumente so: `Strg`/`Cmd`+`P` drücken, `docs/explanation/pa7-conflict.md` tippen und Enter drücken, dann dasselbe noch einmal mit `docs/reference/measurements.md`. Ohne Tastatur: das oberste Symbol in der schmalen Symbolleiste ganz links (der Dateiexplorer), dann durch den Baum klicken. Jede Datei öffnet als eigener Reiter in der Mitte, neben dem Step-Text-Reiter `CaDS Tutor: <Titel>`; die Reiterleiste oben wechselt zwischen ihnen. `Strg`/`Cmd`+`F` sucht in der geöffneten Datei.

Neu ist die Frage: was kostet diese Randbedingung das **Netzwerk**, und was folgt daraus für alles, was du auf diesem Board baust?

## Die Größe, über die es sich zu urteilen lohnt

Solange das Display PA7 besitzt, ist der Empfänger des MAC aus. Die interessante Zahl ist also nicht die gesamte Neuaufbauzeit, sondern der **längste ununterbrochene Ausfall** — und die beiden sind nicht dasselbe. Warum sie auseinanderfallen, liegt im Flush-Pfad und ist die erste Frage dieses Steps.

Sieh dir diesen Pfad selbst an: `Strg`/`Cmd`+`P` drücken, `gui/canvas.c` tippen und Enter drücken. Suche in der geöffneten Datei mit `Strg`/`Cmd`+`F` nach `rows_per_band` — die Zeile steht in `cads_canvas_flush()`, und sie **berechnet** den Wert, statt ihn festzuverdrahten. Diese Berechnung trägt die Antwort.

Zum Größenvergleich: 22,5 ms sind auf einer 100-MBit-Leitung etwa 280 KB Leitungszeit. Kleinere Bänder wurden erwogen und verworfen, weil jedes Band einen Busclaim, ein MAC-Stop/Start und eine Fenster-Einstellsequenz kostet — die Halbierung des Bands verdoppelt diesen Aufwand, um einen Ausfall zu halbieren, den nicht jede Verkehrsart überhaupt bemerkt. Welche Klasse ihn bemerkt, ist die zweite Frage.

## Deine drei Aufgaben

Die erste ist eine Codeaufgabe mit Build-und-Test-Knopf; die anderen beiden sind Freitextfragen unten im Step-Text, jede mit Antwortfeld und **Prüfen**-Knopf daneben. **Alle Prüfungen ausführen** oben im selben Reiter bewertet die Freitextfragen auf einmal. Bleibt eine rot, hilft der **Hinweis zeigen**-Knopf bei genau dieser Aufgabe; seine erste Stufe fragt nach dem häufigsten Fehler.

1. **Sichere es zu.** Ergänze den Unity-Fall, der die Bandgrenze am Blit-Mitschnitt der aufzeichnenden HAL festmacht.
2. **Der Mechanismus.** Warum ist der Ausfall auf ein Band begrenzt und nicht auf einen Neuaufbau? Nimm die Berechnung aus `gui/canvas.c` und sag, wo Busclaim und -freigabe sitzen.
3. **Die Folge.** Welche Verkehrsart übersteht den Ausfall nicht, und welche Regel leitest du daraus für eigene Protokolle ab?

Um zwischendurch zu einem anderen Step zu springen:

::: do palette="> CaDS Tutor: Zu Schritt springen"
Drücke **`F1`**, tippe `Zu Schritt springen` und bestätige mit `Enter`.
> expect: Die Palette listet die Steps dieses Kurses, und die Auswahl eines Eintrags öffnet dessen Steptext als Reiter in der Mitte.
> recover: Reagiert die Palette gar nicht, hat der Browser `Strg`/`Cmd`+`Umschalt`+`P` abgefangen — `F1` funktioniert immer. Mit der Maus tut der Kursbaum links in der Seitenleiste dasselbe, hinter dem Doktorhut-Symbol der äußersten Leiste.
:::

Die Oberfläche ist englisch, während der Kurstext deutsch ist; die Befehle des Tutors selbst sind dagegen deutsch, `Zu Schritt springen` heißt also wirklich so.
