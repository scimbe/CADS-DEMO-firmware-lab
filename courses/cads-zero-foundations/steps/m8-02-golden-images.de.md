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
    title: Der Host-Test-Task läuft fehlerfrei durch
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0, bloom: analyze }
  - id: read-a-diff
    title: Lies einen Pixel-Diff
    check: { type: question, prompt: { en: "A golden fails: 12 differing pixels, all inside one flat palette block, each off by (0,0,32). Regression or environment?", de: "Ein Golden schlägt fehl: 12 abweichende Pixel, alle in einer flachen Palettenfläche, jedes um (0,0,32) daneben. Regression oder Umgebung?" }, rubric: "Regression. Der Ort entscheidet: eine flache Palettenfläche kommt unverändert aus der Palette mit sechzehn Farben, dort gibt es für eine Farbkonvertierung nichts zu runden - anders als an geglätteten Kanten, wo Zwischenwerte entstehen. Die Größe bestätigt es: ein Delta von 32 in einem Kanal ist keine Rundung um eins, sondern ein Vielfaches des Nachbarabstands im 5-6-5-Raster. Das Delta (0,0,32) trifft den Blaukanal, und der hat fünf Bit, sein Nachbarabstand in 8-Bit-Ausgabe also 8 - 32 sind demnach vier Nachbarschritte, nicht einer. Damit wurde ein anderer Palettenwert oder eine andere Füllung gezeichnet, nicht dieselbe Farbe anders gerundet. Eine Antwort, die 32 als einen einzigen Nachbarschritt ausgibt, hat die im Fließtext hergeleitete Rechnung nicht angewandt. Nennt den nächsten Schritt: im git nach einem renderingrelevanten Commit seit der letzten Regeneration suchen. Eine Antwort, die nur die Diagnose vom 2026-08-30 wiederholt, besteht nicht.", bloom: analyze }
  - id: regeneration-rule
    title: Wann ein Golden neu erzeugt werden darf
    check: { type: question, prompt: { en: "When are you allowed to regenerate a golden with update_golden?", de: "Wann darfst du ein Golden mit update_golden neu erzeugen?" }, rubric: "Erst wenn geklärt ist, dass die Änderung beabsichtigt war - danach, nie davor. Der Weg ist ausdrücklich ein Build-Target, damit die neue Referenz als begutachteter Diff zweier PNGs in denselben Commit kommt und keine stille Bearbeitung ist. Voraussetzung ist die Sichtprüfung des Diff-PNG, denn ein Golden, das einen Fehler festgehalten hat, ist schlimmer als gar keines: es macht den Fehler ab sofort zur Sollvorgabe. Nennt die Reihenfolge Urteil vor Regeneration; wer nur das Target nennt, besteht nicht.", bloom: analyze }
socratic:
  - { trigger: "task:suite-green:failed", question: { en: "This task excludes the golden scenes, so a unit test failed. Which subject does ctest name, and did it fail to compile or fail an assertion?", de: "Dieser Task schließt die Golden-Szenen aus, es scheiterte also ein Unit-Test. Welches Subjekt nennt ctest, und scheiterte es beim Kompilieren oder an einer Zusicherung?" }, hints: [ { en: "Look in the terminal at the bottom named after the task, not in the step text; the failing subject is named in the summary block at the end.", de: "Sieh unten im Terminal nach, das den Namen des Tasks trägt, nicht im Steptext; das gescheiterte Subjekt steht im Schlussblock." }, { en: "The task already passes --output-on-failure, so the failing assertion is printed in full with its file and line.", de: "Der Task übergibt bereits --output-on-failure, die gescheiterte Zusicherung steht also vollständig mit Datei und Zeile da." }, { en: "If the run stopped before any test line appeared, it was the build, not a test; read the first compiler error rather than the last line.", de: "Brach der Lauf ab, bevor eine Testzeile erschien, war es der Build und kein Test; lies den ersten Compilerfehler statt der letzten Zeile." } ] }
  - { trigger: "question:read-a-diff:weak", question: { en: "Where does the colour of a flat block come from, and where does the colour of an anti-aliased edge come from?", de: "Woher kommt die Farbe einer flachen Fläche, und woher die Farbe einer geglätteten Kante?" }, hints: [ { en: "Flat regions come straight out of the sixteen-colour palette; there is nothing there for a conversion to round.", de: "Flache Flächen kommen direkt aus der Palette mit sechzehn Farben; dort gibt es für eine Konvertierung nichts zu runden." }, { en: "Compare the size of the delta in this case against the deltas the 2026-08-30 investigation found.", de: "Vergleich die Größe des Deltas in diesem Fall mit den Deltas, die die Untersuchung vom 2026-08-30 fand." }, { en: "Say what you would check in git next, and what result would confirm your reading.", de: "Sag, was du als Nächstes im git prüfen würdest und welches Ergebnis deine Lesart bestätigte." } ] }
  - { trigger: "question:regeneration-rule:weak", question: { en: "A golden is a record of what the code should draw. What does regenerating it do to that record?", de: "Ein Golden hält fest, was der Code zeichnen soll. Was macht ein Neuerzeugen mit dieser Aufzeichnung?" }, hints: [ { en: "The regeneration path is a build target on purpose, so the new reference lands in a commit and can be looked at.", de: "Der Regenerationspfad ist mit Absicht ein Build-Target, damit die neue Referenz in einem Commit landet und angesehen werden kann." }, { en: "Ask what a golden is worth once it has recorded a bug rather than the intended picture.", de: "Frag, was ein Golden wert ist, sobald es einen Fehler statt des beabsichtigten Bildes festhält." }, { en: "Your answer needs the order of the two acts: which one comes first, the judgement or the regeneration?", de: "Deine Antwort braucht die Reihenfolge der beiden Handlungen: welche kommt zuerst, das Urteil oder die Regeneration?" } ] }
---

## Lernziel

Verstehe, wie eine Firmware, deren Panel nicht zurückgelesen werden kann, dennoch prüft, was sie zeichnet, und lerne, einen Golden-Image-Fehlschlag zu lesen, ohne ein Rundungsartefakt für einen Bug zu halten.

**Der erste Handgriff:** starte den Task `CaDS: Host tests`, danach den Task `CaDS: Golden images (informativ)`. Beide Wege stehen im nächsten Abschnitt.

## Die zwei Tasks starten

Die Bedienoberfläche ist englisch, der Kurstext deutsch — der Menüpunkt heißt also `Run Task...`.

Drücke **`F1`**, tippe `Tasks: Run Task`, Enter, dann **`CaDS: Host tests`** aus der Liste wählen. Ohne Tastatur: das Symbol mit den drei Strichen (**☰**) ganz oben links, dann **`Terminal` → `Run Task...` → `CaDS: Host tests`**. (`Strg`/`Cmd`+`Umschalt`+`P` öffnet die Palette auch, wird im Browser aber oft abgefangen; `F1` ist der zuverlässige Weg.) Unten im Terminal-Bereich öffnet sich ein eigenes Terminal mit dem Namen des Tasks; ist der Bereich zugeklappt, klappt ihn `Strg`/`Cmd`+`J` auf und zu. Dauer etwa eine halbe Minute, Schlusszeile bei Erfolg `100% tests passed, 0 tests failed out of 35`.

**Dieser Task enthält die Golden-Szenen nicht.** Sein Kommando endet auf `-E '^golden_'`, schließt sie also ausdrücklich aus. Die Szenen laufen im zweiten Task: **`F1`** → `Tasks: Run Task` → Enter → **`CaDS: Golden images (informativ)`**, oder **☰ → `Terminal` → `Run Task...` → `CaDS: Golden images (informativ)`**. Auch er baut zuerst das Host-Preset, dauert also etwa eine halbe Minute, und führt `ctest` mit `-R '^golden_'` aus: zwei Zeilen, `golden_splash` und `golden_boot_desktop`, jede mit `Passed` oder `Failed`.

Der Zusatz **(informativ)** ist wörtlich zu nehmen: die SDL2-Version in diesem Container rundet Kantenpixel um ±1 anders als die Aufnahmemaschine. Ein Fehlschlag hier ist deshalb kein Urteil über deinen Code — darum prüft die erste Aufgabe den Host-Test-Task.

<!-- SHOT: m8-golden-task-run | Terminal-Bereich unten, Terminal mit dem Namen CaDS: Golden images (informativ), die zwei ctest-Zeilen golden_splash und golden_boot_desktop -->

## Drei Bedienfehler, die genau hier passieren

- **Der Task lief, aber die Ausgabe wird im falschen Fenster gesucht.** Sie steht nicht im Steptext und nicht im Editor, sondern unten im Terminal-Bereich in dem Terminal, das den Namen des Tasks trägt — `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts in der Liste wählst du das richtige Terminal. Weil du hier zwei Tasks startest, liegen zwei gleichnamige Ausgaben nebeneinander; achte auf den Namen.
- **Das Terminal geschlossen und damit den Vorgang beendet.** Das Kreuz am Terminal beendet den Prozess darin — zum Wegklappen `Strg`/`Cmd`+`J` nehmen, das lässt ihn weiterlaufen.
- **Die Palette reagiert nicht auf das Tastenkürzel.** Der Browser hat `Strg`/`Cmd`+`Umschalt`+`P` abgefangen — nimm `F1`, oder den Weg über **☰ → `Terminal`**.

## Die einzige Wahrheit liegt im RAM

Der Displaybus hat keinen Rückkanal, das Panel kann also nie gefragt werden, was es zeigt. Aber das Canvas ist ein gehaltener 4-bpp-Framebuffer im RAM, und dieser Puffer ist ohnehin die Quelle der Wahrheit. Alles, was ihn lesen kann, kann das Bild prüfen — und der Host kann es.

Zwei Mechanismen tun das. **`tests/gallery/gallery.c`** rendert jede Ansicht gegen `tests/unit/fake_hal.c` und schreibt ein PPM je Bildschirm. **Die Golden-Tests** in `targets/sim/tests/` starten den SDL2-Simulator mit `--screenshot`, der das erste Bild nach Ruhe des Panels sichert, und vergleichen es Pixel für Pixel mit einer Referenz in `targets/sim/golden/`. Zwei Szenen: `splash.png` (250 ms Ruhe) und `boot_desktop.png` (2000 ms Ruhe, wo ein gebootetes Board landet).

Eine Abweichung schreibt ein Diff-PNG, in dem jedes abweichende Pixel gesättigt rot markiert ist. Öffne es mit `Strg`/`Cmd`+`P` und diesem Pfad — der Editor zeigt PNGs in der Mitte als Bild an:

```
build/host/targets/sim/tests/splash.diff.png
```

Der Regenerationspfad ist ein CMake-Target, kein Task. Öffne ein Terminal mit **☰ → `Terminal` → `New Terminal`** — Arbeitsverzeichnis ist die Projektwurzel — und führe aus:

```
cmake --build build/host --target update_golden
```

So ist eine beabsichtigte UI-Änderung ein begutachteter Diff zweier PNGs im selben Commit.

## Einen Fehlschlag richtig lesen

Am 2026-08-30 scheiterten beide Golden-Tests mit 18 866 und 14 273 abweichenden Pixeln von 153 600 — naheliegend eine Rendering-Regression. Ein Delta-Histogramm zeigte etwas anderes: jedes abweichende Pixel lag um genau **+1** in mindestens einem von R, G, B daneben, und nur an geglätteten Textkanten, während jede flache Palettenfläche stimmte. Kein renderingrelevanter Commit war seit der Erzeugung gelandet. Das ist die Signatur der RGB565-nach-24-bpp-Konvertierung von SDL. Der Bericht steht in `docs/ROADMAP.md`.

Daraus werden drei Fragen an jeden Fehlschlag: **wo** liegen die abweichenden Pixel, **wie groß** sind die Deltas, **was** hat sich seit der letzten Regeneration in git geändert. Eine Diff-Zahl allein ist keine Diagnose.

Für die zweite Frage: das Panel arbeitet in RGB565, ein Kanal hat 5 oder 6 Bit. Ein Delta von 1 in einem 8-Bit-Ausgabekanal ist Rundung; der Abstand zwischen zwei *benachbarten* darstellbaren Werten ist im 5-Bit-Kanal 8 und im 6-Bit-Kanal 4. Ein Delta dieser Größe heißt: ein anderer Wert wurde gezeichnet, nicht derselbe anders gerundet.

## Deine Aufgabe

Drei Aufgaben, jede mit ihrem eigenen Knopf **Prüfen** unten im Steptext; **Run all checks** oben im Reiter `CaDS Tutor: Golden Images für ein nur beschreibbares Display` prüft alle auf einmal.

1. **Der Host-Test-Task läuft durch.** Starte ihn wie oben: **`F1`** → `Tasks: Run Task` → Enter → **`CaDS: Host tests`**.
2. **Lies einen Diff.** Beurteile den Fehlschlag, den die Aufgabe beschreibt — er hat andere Zahlen als der Fall von 2026-08-30, das Verfahren ist dasselbe; rechne den Nachbarabstand des betroffenen Kanals aus, bevor du das Delta einordnest.
3. **Die Regenerationsregel.** Beantworte, wann ein Golden neu erzeugt werden darf.

Lies dazu die Aufnahmeschleife der Galerie und den Kopf von `golden_check.py`, beide mit `Strg`/`Cmd`+`P`. Der nächste Step wendet sich vom Beweisen zum Beurteilen von Code.
