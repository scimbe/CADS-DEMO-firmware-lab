---
id: m8-02-golden-images
title: Golden Images für ein nur beschreibbares Display
bloom: analyze
objectives: [cz.quality.golden]
requires: [m8-01-unit-tests]
estimatedMinutes: 15
links:
  - { file: "tests/gallery/gallery.c", line: 1 }
  - { file: "targets/sim/tests/golden_check.py", line: 1 }
  - { doc: "docs/ROADMAP.md" }
  - { step: m8-03-clean-room-pr }
sources: [tests/gallery/gallery.c, targets/sim/tests/golden_check.py, targets/sim/tests/CMakeLists.txt, targets/sim/golden/README.md, docs/ROADMAP.md]
tasks:
  - id: read-gallery
    title: Lies, wie die Galerie einen Bildschirm einfängt
    check: { type: manual }
  - id: diff-reading
    title: Unterscheide eine Umgebungsabweichung von einer Regression
    check: { type: question, prompt: { en: "Why does this project keep golden images at all for a panel whose bus is write-only, and how did the maintainers decide that the golden_splash/golden_boot_desktop failures of 2026-08-30 were environmental rather than a rendering regression?", de: "Warum hält dieses Projekt überhaupt Golden Images für ein Panel, dessen Bus nur beschreibbar ist, und wie entschieden die Maintainer, dass die Fehlschläge von golden_splash/golden_boot_desktop am 2026-08-30 umgebungsbedingt und keine Rendering-Regression waren?" }, rubric: "Erklärt, dass der RAM-Framebuffer die einzige Wahrheit ist, sodass der Host-Simulator (gleicher Canvas-Code, Fake- oder SDL-HAL) ihn deterministisch ohne Kamera ausgeben kann; die Fehlschläge wurden mit einem Delta-Histogramm je Pixel diagnostiziert: jedes abweichende Pixel lag um genau +1 in R/G/B daneben, nur an geglätteten Kanten, flache Palettenflächen stimmten, kein Rendering-Commit seit Erzeugung der Goldens - die Signatur der RGB565-nach-24-bpp-Rundung von SDL, deshalb wurden die Goldens über das Target update_golden regeneriert statt Code zu ändern.", bloom: analyze }
socratic:
  - { trigger: "question:diff-reading:weak", question: { en: "golden_check.py writes a diff PNG on mismatch. If every marked pixel sits on a text edge and none inside a flat colour block, what does that tell you about where the difference was introduced?", de: "golden_check.py schreibt bei Abweichung ein Diff-PNG. Wenn jedes markierte Pixel auf einer Textkante liegt und keines in einer flachen Farbfläche, was sagt dir das darüber, wo die Abweichung entstand?" }, hints: [ { en: "Flat regions come straight from the 16-colour palette; edges are where a conversion rounds.", de: "Flache Flächen kommen direkt aus der 16-Farben-Palette; Kanten sind dort, wo eine Konvertierung rundet." }, { en: "Check git log for a rendering-relevant commit since the goldens were last regenerated.", de: "Prüfe im git log, ob seit der letzten Regeneration der Goldens ein renderingrelevanter Commit landete." }, { en: "The ROADMAP entry of 2026-09-01 walks through exactly this diagnosis, ending in update_golden and 37/37 passing.", de: "Der ROADMAP-Eintrag vom 2026-09-01 geht genau diese Diagnose durch und endet mit update_golden und 37/37 bestanden." } ] }
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

Die Lehre verallgemeinert sich: eine Diff-Zahl ist keine Diagnose. Wo die Pixel liegen, wie groß die Deltas sind und was sich in git änderte, entscheiden gemeinsam, ob Code oder Umgebung sich bewegt hat.

## Deine Aufgabe

Lies die Aufnahmeschleife der Galerie und den Kopf von `golden_check.py`; erkläre dann, warum Golden Images für ein nur beschreibbares Panel existieren und wie die Umgebungsabweichung von einer Regression unterschieden wurde. Der nächste Step wendet sich vom Beweisen zum Beurteilen von Code.
