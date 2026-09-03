---
id: m8-02-golden-images
title: Golden Images für ein nur beschreibbares Display
bloom: analyze
objectives: [cz.quality.golden]
requires: [m8-01-unit-tests]
estimatedMinutes: 15
scaffold: faded
links:
  - { file: "tests/gallery/gallery.c", line: 1 }
  - { file: "targets/sim/tests/golden_check.py", line: 1 }
  - { doc: "docs/ROADMAP.md" }
  - { step: m8-03-clean-room-pr }
sources: [tests/gallery/gallery.c, targets/sim/tests/golden_check.py, targets/sim/tests/CMakeLists.txt, targets/sim/golden/README.md, docs/ROADMAP.md]
tasks:
  - id: suite-green
    title: Die Host-Suite einschließlich der Golden-Szenen ist grün
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0, bloom: analyze }
  - id: read-a-diff
    title: Lies einen Pixel-Diff
    check: { type: question, prompt: { en: "A golden fails: 12 differing pixels, all inside one flat palette block, each off by (0,0,32). Regression or environment?", de: "Ein Golden schlägt fehl: 12 abweichende Pixel, alle in einer flachen Palettenfläche, jedes um (0,0,32) daneben. Regression oder Umgebung?" }, rubric: "Regression. Der Ort entscheidet: eine flache Palettenfläche kommt unverändert aus der Palette mit sechzehn Farben, dort gibt es für eine Farbkonvertierung nichts zu runden - anders als an geglätteten Kanten, wo Zwischenwerte entstehen. Die Größe bestätigt es: ein Delta von 32 in einem Kanal ist keine Rundung um eins, sondern ein Vielfaches des Nachbarabstands im 5-6-5-Raster. Das Delta (0,0,32) trifft den Blaukanal, und der hat fünf Bit, sein Nachbarabstand in 8-Bit-Ausgabe also 8 - 32 sind demnach vier Nachbarschritte, nicht einer. Damit wurde ein anderer Palettenwert oder eine andere Füllung gezeichnet, nicht dieselbe Farbe anders gerundet. Eine Antwort, die 32 als einen einzigen Nachbarschritt ausgibt, hat die im Fließtext hergeleitete Rechnung nicht angewandt. Nennt den nächsten Schritt: im git nach einem renderingrelevanten Commit seit der letzten Regeneration suchen. Eine Antwort, die nur die Diagnose vom 2026-08-30 wiederholt, besteht nicht.", bloom: analyze }
  - id: regeneration-rule
    title: Wann ein Golden neu erzeugt werden darf
    check: { type: question, prompt: { en: "When are you allowed to regenerate a golden with update_golden?", de: "Wann darfst du ein Golden mit update_golden neu erzeugen?" }, rubric: "Erst wenn geklärt ist, dass die Änderung beabsichtigt war - danach, nie davor. Der Weg ist ausdrücklich ein Build-Target, damit die neue Referenz als begutachteter Diff zweier PNGs in denselben Commit kommt und keine stille Bearbeitung ist. Voraussetzung ist die Sichtprüfung des Diff-PNG, denn ein Golden, das einen Fehler festgehalten hat, ist schlimmer als gar keines: es macht den Fehler ab sofort zur Sollvorgabe. Nennt die Reihenfolge Urteil vor Regeneration; wer nur das Target nennt, besteht nicht.", bloom: analyze }
socratic:
  - { trigger: "task:suite-green:failed", question: { en: "Is the failing test a unit test or one of the two golden scenes? The two fail for completely different reasons.", de: "Ist der scheiternde Test ein Unit-Test oder eine der beiden Golden-Szenen? Die beiden scheitern aus völlig verschiedenen Gründen." }, hints: [ { en: "ctest names the test; the golden ones are named after the scene they capture.", de: "ctest nennt den Test; die Golden-Tests sind nach der Szene benannt, die sie aufnehmen." }, { en: "A golden mismatch writes a diff PNG next to the reference - open it before drawing any conclusion.", de: "Eine Golden-Abweichung schreibt ein Diff-PNG neben die Referenz - öffne es, bevor du irgendetwas schließt." }, { en: "The two scenes differ only in how long the panel is allowed to settle before the frame is taken.", de: "Die beiden Szenen unterscheiden sich nur darin, wie lange das Panel sich beruhigen darf, bevor das Bild genommen wird." } ] }
  - { trigger: "question:read-a-diff:weak", question: { en: "Where does the colour of a flat block come from, and where does the colour of an anti-aliased edge come from?", de: "Woher kommt die Farbe einer flachen Fläche, und woher die Farbe einer geglätteten Kante?" }, hints: [ { en: "Flat regions come straight out of the sixteen-colour palette; there is nothing there for a conversion to round.", de: "Flache Flächen kommen direkt aus der Palette mit sechzehn Farben; dort gibt es für eine Konvertierung nichts zu runden." }, { en: "Compare the size of the delta in this case against the deltas the 2026-08-30 investigation found.", de: "Vergleich die Größe des Deltas in diesem Fall mit den Deltas, die die Untersuchung vom 2026-08-30 fand." }, { en: "Say what you would check in git next, and what result would confirm your reading.", de: "Sag, was du als Nächstes im git prüfen würdest und welches Ergebnis deine Lesart bestätigte." } ] }
  - { trigger: "question:regeneration-rule:weak", question: { en: "A golden is a record of what the code should draw. What does regenerating it do to that record?", de: "Ein Golden hält fest, was der Code zeichnen soll. Was macht ein Neuerzeugen mit dieser Aufzeichnung?" }, hints: [ { en: "The regeneration path is a build target on purpose, so the new reference lands in a commit and can be looked at.", de: "Der Regenerationspfad ist mit Absicht ein Build-Target, damit die neue Referenz in einem Commit landet und angesehen werden kann." }, { en: "Ask what a golden is worth once it has recorded a bug rather than the intended picture.", de: "Frag, was ein Golden wert ist, sobald es einen Fehler statt des beabsichtigten Bildes festhält." }, { en: "Your answer needs the order of the two acts: which one comes first, the judgement or the regeneration?", de: "Deine Antwort braucht die Reihenfolge der beiden Handlungen: welche kommt zuerst, das Urteil oder die Regeneration?" } ] }
---
## Lernziel

Verstehe, wie eine Firmware, deren Panel nicht zurückgelesen werden kann, dennoch prüft, was sie zeichnet, und lerne, einen Golden-Image-Fehlschlag zu lesen, ohne ein Rundungsartefakt für einen Bug zu halten.

## Die einzige Wahrheit liegt im RAM

Der Displaybus hat keinen Rückkanal, das Panel kann also nie gefragt werden, was es zeigt. Aber das Canvas ist ein gehaltener 4-bpp-Framebuffer im RAM, und dieser Puffer ist ohnehin die Quelle der Wahrheit für das Panel. Alles, was den Puffer lesen kann, kann daher das Bild prüfen — und der Host kann es.

Zwei Mechanismen tun das:

- **`tests/gallery/gallery.c`** rendert jede Anwendungsansicht (Desktop, Menü, Settings, About, GPIO, Netinfo, Dateibrowser, Spiel, Active Tools) gegen `tests/unit/fake_hal.c`, läuft die Palette Pixel für Pixel ab und schreibt ein PPM je Bildschirm. Es existiert, damit alle Oberflächen der Firmware auf einmal begutachtet werden können, ohne das echte Board von Hand durch sie zu führen.
- **Die Golden-Tests** in `targets/sim/tests/` starten den SDL2-Simulator mit `--screenshot`, der das erste Bild nach Ruhe des Panels sichert, und vergleichen es Pixel für Pixel mit einem Referenz-PNG in `targets/sim/golden/`. Zwei Szenen existieren: `splash.png` (250 ms Ruhe, das Boot-Zeichen) und `boot_desktop.png` (2000 ms Ruhe, wo ein gebootetes Board tatsächlich landet, weil `boot.autostart` an ist). Eine Abweichung schreibt ein Diff-PNG, in dem jedes abweichende Pixel gesättigt rot markiert ist.

Der Regenerationspfad ist ein CMake-Target, `update_golden`, sodass eine beabsichtigte UI-Änderung ein begutachteter Diff zweier PNGs im selben Commit ist — keine stille Bearbeitung.

## Einen Fehlschlag richtig lesen

Am 2026-08-30 scheiterten beide Golden-Tests mit 18 866 und 14 273 abweichenden Pixeln. Die naheliegende Lesart ist eine Rendering-Regression. Die Maintainer erstellten stattdessen ein Delta-Histogramm je Pixel und fanden, dass jedes abweichende Pixel um genau **+1** in einem oder mehreren von R, G, B daneben lag — Deltas nur von (1,1,0), (1,1,1) oder (1,0,1) — und nur an geglätteten Textkanten, während jede flache Palettenfläche exakt übereinstimmte. Seit Erzeugung der Goldens war kein renderingrelevanter Commit gelandet. Das ist die Signatur der RGB565-nach-24-bpp-Konvertierung von SDL, die auf diesem Host anders rundet als auf der Maschine, die die Goldens aufnahm: `golden_check.py` dokumentiert, dass SDL, nicht das Projekt, diese Konvertierung ausführt. Die Lösung war, die Goldens über `update_golden` zu regenerieren, 37/37 Host-Tests zu bestätigen und zu prüfen, dass der Board-Build unberührt blieb. Der vollständige Bericht steht in `docs/ROADMAP.md` (2026-09-01).

Die Lehre verallgemeinert sich zu drei Fragen, die man an jeden Fehlschlag stellt: **wo** liegen die abweichenden Pixel, **wie groß** sind die Deltas, und **was** hat sich seit der letzten Regeneration in git geändert. Eine Diff-Zahl allein ist keine Diagnose.

Für die zweite Frage lohnt eine Größenordnung: das Panel arbeitet in RGB565, ein Kanal hat also 5 oder 6 Bit. Ein Delta von 1 in einem 8-Bit-Ausgabekanal ist Rundung; der Abstand zwischen zwei *benachbarten* darstellbaren Werten ist im 5-Bit-Kanal 8 und im 6-Bit-Kanal 4, in 8 Bit hochgerechnet also deutlich größer. Ein Delta dieser Größe bedeutet, dass ein anderer Wert gezeichnet wurde, nicht derselbe anders gerundet.

## Deine Aufgabe

Führe die Host-Suite aus; sie enthält beide Golden-Szenen. Lies die Aufnahmeschleife der Galerie und den Kopf von `golden_check.py`. Beurteile dann den Fehlschlag, den die zweite Aufgabe beschreibt — er hat andere Zahlen als der Fall von 2026-08-30, das Verfahren ist dasselbe; rechne den Nachbarabstand des betroffenen Kanals aus, bevor du das Delta einordnest. Beantworte zuletzt, wann ein Golden neu erzeugt werden darf. Der nächste Step wendet sich vom Beweisen zum Beurteilen von Code.

**Wo du das machst:**
- Datei öffnen: `Strg`/`Cmd`+`P`.
- Terminal öffnen: Menü *Terminal → New Terminal*.
- Board-Konsole öffnen: `F1`, dann *CaDS Board: Konsole öffnen*.
- Bauen: Menü *Terminal → Run Build Task…*.
