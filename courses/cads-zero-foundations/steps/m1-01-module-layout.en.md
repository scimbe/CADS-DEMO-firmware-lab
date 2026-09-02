---
id: m1-01-module-layout
title: The module layout
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
    title: You have walked the tree once
    check: { type: manual }
  - id: downward-only
    title: Explain the dependency rule
    check: { type: question, prompt: { en: "Dependencies in CaDS Zero point downwards only, and hal_api is headers with no implementation. Why is each of those two rules load-bearing rather than tidiness?", de: "Abhängigkeiten in CaDS Zero zeigen nur nach unten, und hal_api besteht nur aus Headern ohne Implementierung. Warum ist jede dieser beiden Regeln tragend und nicht bloß Ordnungssinn?" }, rubric: "Explains that the acyclic, downward graph keeps hardware dependence confined to one module so everything above builds for both board and simulator, and that a headers-only hal_api lets the same object files link against either backend (targets/itsboard or targets/sim).", bloom: understand }
socratic:
  - { trigger: "question:downward-only:weak", question: { en: "If a feature module included a header from targets/itsboard, what would happen to the host build?", de: "Wenn ein Feature-Modul einen Header aus targets/itsboard einbände, was geschähe mit dem Host-Build?" }, hints: [ { en: "docs/reference/module-layout.md lists three reasons, in order of cost; the first is the simulator.", de: "docs/reference/module-layout.md nennt drei Gründe nach Kosten geordnet; der erste ist der Simulator." }, { en: "A PRIVATE include directory makes a module's own headers unreachable from outside.", de: "Ein PRIVATE-Include-Verzeichnis macht die eigenen Header eines Moduls von außen unerreichbar." }, { en: "hal_api being interface-only is exactly what lets one set of object files link against two backends.", de: "Dass hal_api nur Schnittstelle ist, erlaubt genau, dass ein Satz Objektdateien gegen zwei Backends linkt." } ] }
---
## Learning goal

Read the firmware's tree as a dependency graph, and understand why the boundaries between modules are enforced by the build rather than by convention.

## Libraries, not a blob

CaDS Zero is built as a set of independent CMake libraries, each with a declared public surface. The top-level `CMakeLists.txt` adds them in dependency order: `modules/toolbox`, `modules/storage`, `modules/config`, `modules/net`, `modules/cli`, `modules/diag`, the kernel (board only), then the portable GUI layer (`gui/`), the services (`services/`), the apps under `apps/`, and finally one target directory — `targets/itsboard` or `targets/sim`.

The layout of one module is fixed (`docs/reference/module-layout.md`):

```
modules/<name>/
  include/cads/<name>/*.h    public API, the only thing dependents may include
  src/*.c *.h                implementation, private headers live here
  tests/*.c                  host unit tests, run by ctest
  README.md                  what, why, how, limits
  CMakeLists.txt
```

The include path is `cads/<name>/...` rather than a bare filename, so an `#include` says where a type comes from.

## The rule the build enforces

Dependencies point **downwards only**, and the graph is acyclic:

```
        apps/            desktop, menu, tools
          │
        gui/             views, widgets, compositor
          │
   canvas ─┴─ input ─ storage ─ net        feature modules
     └─────────┴────┬────┴────────┘
                 hal_api            the interface, no implementation
        ┌───────────┴───────────┐
   targets/itsboard        targets/sim
```

A feature module never includes a target header. `hal_api` is **headers only**, which is what lets the same object files link against either backend. The mechanism is one CMake keyword: a module's `src/` is a `PRIVATE` include directory, so its own headers are unreachable from outside and the public header stays the only way in.

## Why it costs to ignore this

Three reasons, in order of how much they cost when ignored:

1. **The simulator.** Everything above the HAL must build for the host as well as the board. That only stays true if hardware dependence is confined to one module with a declared interface, not diffused through `#include "stm32f4xx.h"` in whatever file needed a register.
2. **Parallel work.** A module with a narrow public header can be implemented, reviewed and merged without reading the rest of the tree.
3. **Reuse.** The canvas, the font renderer and the toolbox are not specific to this firmware.

The inventory in the reference marks which modules are reusable beyond this project (`toolbox` entirely, `canvas` for any indexed framebuffer, `net` not at all) and what each depends on.

## Your task

Open `core/cads_hal.h` and one module under `modules/` and trace the graph above in the real tree: find the public `include/cads/<name>/` directory, the private `src/`, and the module README. Then answer the question on why the two rules are load-bearing. The next step looks at the boundary itself.
