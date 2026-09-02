---
id: m6-04-build-profiles
title: Build profiles
bloom: apply
objectives: [cz.storage.profiles]
requires: [m6-03-config-option]
estimatedMinutes: 12
links:
  - { step: m7-01-lwip-netif }
  - { file: "scripts/check_profile.py", line: 1 }
  - { doc: "docs/reference/config-file.md" }
  - { file: "profiles/minimal.profile", line: 13 }
sources: [docs/reference/config-file.md, docs/how-to/configure.md, scripts/check_profile.py, profiles/minimal.profile, docs/explanation/config-design.md]
tasks:
  - id: checked
    title: Validate the minimal profile with check_profile.py
    check: { type: manual }
  - id: why-two-files
    title: Why profiles are a separate file, and what the capacity check catches
    check: { type: question, prompt: { en: "Both /config.txt and a *.profile are key = value text. Why does the project keep them as two separate files, and what does check_profile.py's view-registry capacity check catch that a plain syntax check never would?", de: "Sowohl /config.txt als auch ein *.profile sind key = value-Text. Warum hält das Projekt sie als zwei getrennte Dateien, und was fängt die View-Registry-Kapazitätsprüfung von check_profile.py ab, was eine reine Syntaxprüfung nie könnte?" }, rubric: "Different timescales and actors: /config.txt is read by the firmware at boot on the board, a profile by CMake at configure time on the developer's machine; merging them would let a field edit remove a feature or a build need a running board - a blast-radius decision. The capacity check counts the cads_view_dispatcher_add() call sites of the enabled apps against CADS_APP_DEMO_VIEW_CAPACITY (28), because past capacity the add returns false, every caller discards it with (void), and the excess views silently never exist - a dead menu row with no error, a bug that shipped twice.", bloom: analyze }
socratic:
  - { trigger: "task:checked:failed", question: { en: "check_profile.py refused the file. Is it complaining about the grammar of a line, or about the image the profile would produce?", de: "check_profile.py hat die Datei abgelehnt. Beschwert es sich über die Grammatik einer Zeile oder über das Image, das das Profil erzeugen würde?" }, hints: [ { en: "Only lines of the form app.<name> = on|off are accepted, and only for the nine apps CMake knows.", de: "Nur Zeilen der Form app.<name> = on|off werden akzeptiert, und nur für die neun Apps, die CMake kennt." }, { en: "An app the profile omits defaults to ON - the checker models the same image CMake will build.", de: "Eine App, die das Profil auslässt, ist standardmäßig ON - der Prüfer modelliert dasselbe Image, das CMake bauen wird." }, { en: "Run it on profiles/minimal.profile first; that one is known good, so a failure there points at your environment, not the file.", de: "Führe es zuerst auf profiles/minimal.profile aus; das ist bekannt gut, ein Fehler dort zeigt also auf deine Umgebung, nicht auf die Datei." } ] }
---
## Learning goal

Select which apps go into an image with a build profile, and understand why that decision lives in a different file from the runtime configuration.

## Feature selection at configure time

A build profile is a text file of `app.<name> = on|off` lines in `profiles/`, read once by CMake at configure time. It picks which optional apps compile into the image at all; `desktop` and the menu shell are always built and are not profile keys. The nine recognised apps are `settings`, `about`, `gpio`, `netinfo`, `filebrowser`, `game`, `netiperf`, `nettools` and `active`, mapped onto the `CADS_APP_*` CMake options. An unknown app name or a malformed line is a hard configure error — a typo must not quietly build the wrong image.

Two profiles ship. `profiles/full.profile` turns everything on, the same as omitting `CADS_PROFILE`. `profiles/minimal.profile` keeps only `settings` — deliberately, because Settings is the only way to reach touch calibration and the config-reload entry even on a stripped image. A smaller image has more RAM margin and less attack surface.

```bash
cmake -S . -B build/itsboard -G Ninja \
    -DCMAKE_TOOLCHAIN_FILE=cmake/arm-none-eabi-gcc.cmake \
    -DCADS_PROFILE=profiles/minimal.profile
cmake --build build/itsboard
```

With a profile active it is **authoritative** for the apps it names: it FORCE-sets those cache variables, so editing or switching a profile in an existing build directory takes effect on the next configure, and a `-DCADS_APP_X=` on the command line does not beat it. Without a profile, `-D` overrides the built-in `ON` default as usual.

## Why not fold it into /config.txt

Both files look alike, and folding them together is the obvious economy. It is also a category error (`docs/explanation/config-design.md`): `/config.txt` is read by the **firmware, at boot, on the board**; a profile is read by **CMake, at configure time, on the developer's disk**. A field engineer editing a network address should not be able to remove the network stack; a build server selecting a minimal image should not need a running board. Keeping them apart is a blast-radius decision, not tidiness.

## Validate before you spend a build

```bash
scripts/check_profile.py profiles/minimal.profile          # syntax + capacity
scripts/check_profile.py profiles/minimal.profile --build  # + real build + RAM check
```

The syntax check catches a typo in milliseconds instead of after a slower configure. The check that earns its place is the second one: it counts the real `cads_view_dispatcher_add()` call sites in the enabled apps' sources and compares the total against `CADS_APP_DEMO_VIEW_CAPACITY` (28, in `apps/bringup/explorer_app_demo.c`). That failure is *silent* in the firmware — past capacity the add returns `false`, every caller discards it with `(void)`, and the excess views simply never exist: a dead menu row, no error anywhere. That exact bug shipped twice before it was understood, which is why a profile that would reintroduce it fails on your laptop instead of in front of a panel.

## Your task

Run `scripts/check_profile.py profiles/minimal.profile` and read both verdicts; if you have time, add `--build` and read the RAM-budget line it produces. Then answer the question on why the two files are separate and what the capacity check catches. The next module leaves storage for the network.
