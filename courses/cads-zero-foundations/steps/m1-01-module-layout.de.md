---
id: m1-01-module-layout
title: Das Modul-Layout
bloom: understand
objectives: [firmware-reference-module-layout]
requires: [m0-05-explorer]
estimatedMinutes: 15
links:
  - { step: m1-02-hal-boundary }
  - { doc: "docs/reference/module-layout.md" }
  - { file: "core/cads_hal.h", line: 1 }
sources: [docs/reference/module-layout.md, CMakeLists.txt, README.md]
tasks:
  - id: navigated
    title: Du bist den Baum einmal abgegangen
    check: { type: manual }
  - id: downward-only
    title: Erkläre die Abhängigkeitsregel
    check: { type: question, prompt: { en: "Dependencies in CaDS Zero point downwards only, and hal_api is headers with no implementation. Why is each of those two rules load-bearing rather than tidiness?", de: "Abhängigkeiten in CaDS Zero zeigen nur nach unten, und hal_api besteht nur aus Headern ohne Implementierung. Warum ist jede dieser beiden Regeln tragend und nicht bloß Ordnungssinn?" }, rubric: "Erklärt, dass der azyklische, nach unten gerichtete Graph die Hardwareabhängigkeit auf ein Modul beschränkt, sodass alles darüber für Board und Simulator baut, und dass ein reines Header-hal_api dieselben Objektdateien gegen beide Backends (targets/itsboard oder targets/sim) linken lässt.", bloom: understand }
socratic:
  - { trigger: "question:downward-only:weak", question: { en: "If a feature module included a header from targets/itsboard, what would happen to the host build?", de: "Wenn ein Feature-Modul einen Header aus targets/itsboard einbände, was geschähe mit dem Host-Build?" }, hints: [ { en: "docs/reference/module-layout.md lists three reasons, in order of cost; the first is the simulator.", de: "docs/reference/module-layout.md nennt drei Gründe nach Kosten geordnet; der erste ist der Simulator." }, { en: "A PRIVATE include directory makes a module's own headers unreachable from outside.", de: "Ein PRIVATE-Include-Verzeichnis macht die eigenen Header eines Moduls von außen unerreichbar." }, { en: "hal_api being interface-only is exactly what lets one set of object files link against two backends.", de: "Dass hal_api nur Schnittstelle ist, erlaubt genau, dass ein Satz Objektdateien gegen zwei Backends linkt." } ] }
---
## Lernziel

Lies den Quellbaum der Firmware als Abhängigkeitsgraphen und verstehe, warum die Grenzen zwischen Modulen vom Build erzwungen werden statt nur vereinbart zu sein.

## Bibliotheken, kein Klumpen

CaDS Zero ist als Satz unabhängiger CMake-Bibliotheken gebaut, jede mit einer deklarierten öffentlichen Oberfläche. Das oberste `CMakeLists.txt` fügt sie in Abhängigkeitsreihenfolge hinzu: `modules/toolbox`, `modules/storage`, `modules/config`, `modules/net`, `modules/cli`, `modules/diag`, den Kernel (nur Board), dann die portable GUI-Schicht (`gui/`), die Dienste (`services/`), die Apps unter `apps/` und zuletzt genau ein Target-Verzeichnis — `targets/itsboard` oder `targets/sim`.

Der Aufbau eines Moduls ist festgelegt (`docs/reference/module-layout.md`):

```
modules/<name>/
  include/cads/<name>/*.h    öffentliche API, das Einzige, was Abhängige einbinden dürfen
  src/*.c *.h                Implementierung, private Header liegen hier
  tests/*.c                  Host-Unit-Tests, von ctest ausgeführt
  README.md                  was, warum, wie, Grenzen
  CMakeLists.txt
```

Der Include-Pfad lautet `cads/<name>/...` statt eines nackten Dateinamens, damit ein `#include` sagt, woher ein Typ stammt.

## Die Regel, die der Build erzwingt

Abhängigkeiten zeigen **nur nach unten**, und der Graph ist azyklisch:

```
        apps/            Desktop, Menü, Werkzeuge
          │
        gui/             Views, Widgets, Compositor
          │
   canvas ─┴─ input ─ storage ─ net        Feature-Module
     └─────────┴────┬────┴────────┘
                 hal_api            die Schnittstelle, keine Implementierung
        ┌───────────┴───────────┐
   targets/itsboard        targets/sim
```

Ein Feature-Modul bindet nie einen Target-Header ein. `hal_api` besteht **nur aus Headern**, und genau das lässt dieselben Objektdateien gegen beide Backends linken. Der Mechanismus ist ein einziges CMake-Schlüsselwort: das `src/` eines Moduls ist ein `PRIVATE`-Include-Verzeichnis, seine eigenen Header sind also von außen unerreichbar, und der öffentliche Header bleibt der einzige Weg hinein.

## Warum es kostet, das zu ignorieren

Drei Gründe, geordnet danach, wie teuer ihre Missachtung ist:

1. **Der Simulator.** Alles oberhalb der HAL muss für den Host genauso bauen wie für das Board. Das bleibt nur wahr, wenn die Hardwareabhängigkeit auf ein Modul mit deklarierter Schnittstelle beschränkt ist — nicht verstreut über `#include "stm32f4xx.h"` in jeder Datei, die ein Register brauchte.
2. **Parallele Arbeit.** Ein Modul mit schmalem öffentlichem Header lässt sich implementieren, prüfen und mergen, ohne den Rest des Baums zu lesen.
3. **Wiederverwendung.** Canvas, Font-Renderer und Toolbox sind nicht spezifisch für diese Firmware.

Die Inventarliste in der Referenz markiert, welche Module über dieses Projekt hinaus wiederverwendbar sind (`toolbox` vollständig, `canvas` für jeden indizierten Framebuffer, `net` gar nicht) und wovon jedes abhängt.

## Deine Aufgabe

Öffne `core/cads_hal.h` und ein Modul unter `modules/` und verfolge den Graphen oben im echten Baum: finde das öffentliche Verzeichnis `include/cads/<name>/`, das private `src/` und die Modul-README. Beantworte dann die Frage, warum die beiden Regeln tragend sind. Der nächste Step betrachtet die Grenze selbst.
