---
id: m6-04-build-profiles
title: Build profiles
bloom: analyze
objectives: [cz.storage.profiles]
requires: [m6-03-config-option]
estimatedMinutes: 15
scaffold: independent
links:
  - { step: m7-01-lwip-netif }
  - { file: "scripts/check_profile.py", line: 1 }
  - { doc: "docs/reference/config-file.md" }
  - { file: "profiles/minimal.profile", line: 13 }
sources: [docs/reference/config-file.md, docs/how-to/configure.md, scripts/check_profile.py, profiles/minimal.profile, docs/explanation/config-design.md, apps/bringup/explorer_app_demo.c]
misconceptions:
  - { pattern: "unrecognised line|unknown app", question: { en: "The checker rejected a line before it ever looked at the image. What shape does it accept, and which names?", de: "Der Prüfer hat eine Zeile abgelehnt, bevor er das Image überhaupt ansah. Welche Form akzeptiert er, und welche Namen?" }, hints: [ { en: "Only lines of the form app.<name> = on|off are accepted, and only for the apps CMake knows about.", de: "Nur Zeilen der Form app.<name> = on|off werden akzeptiert, und nur für die Apps, die CMake kennt." }, { en: "The error line prints the file and line number; compare that line against profiles/minimal.profile character by character.", de: "Die Fehlerzeile nennt Datei und Zeilennummer; vergleich diese Zeile Zeichen für Zeichen mit profiles/minimal.profile." }, { en: "A typo is a hard error on purpose - the alternative would be quietly building an image you did not ask for.", de: "Ein Tippfehler ist mit Absicht ein harter Fehler - die Alternative wäre, stillschweigend ein Image zu bauen, das du nicht wolltest." } ] }
  - { pattern: "FAIL: this profile needs", question: { en: "Your profile passes the grammar and fails the model. What resource did the checker count, and against what?", de: "Dein Profil besteht die Grammatik und scheitert am Modell. Welche Ressource hat der Prüfer gezählt, und wogegen?" }, hints: [ { en: "It counted something in the sources of the apps you switched on, not the number of apps.", de: "Er hat etwas in den Quellen der eingeschalteten Apps gezählt, nicht die Anzahl der Apps." }, { en: "An app the profile omits defaults to ON, so a profile that turns nothing off is the full image.", de: "Eine App, die das Profil auslässt, ist standardmäßig ON, ein Profil, das nichts abschaltet, ist also das volle Image." }, { en: "Switch apps off until the count fits, and note which app cost the most slots - that number is a design fact about it.", de: "Schalte Apps ab, bis die Zahl passt, und merk dir, welche App die meisten Plätze kostete - diese Zahl ist eine Entwurfsaussage über sie." } ] }
tasks:
  - id: checked
    title: Check the minimal profile that ships with the project
    check: { type: command, cwd: ".", command: "python3 scripts/check_profile.py profiles/minimal.profile", expectExitCode: 0, bloom: analyze }
  - id: own-profile
    title: Write a profile of your own and have it checked
    check: { type: command, cwd: ".", command: "test -f profiles/lab.profile && python3 scripts/check_profile.py profiles/lab.profile", expectExitCode: 0, bloom: analyze }
  - id: capacity-catch
    title: What the capacity check catches
    check: { type: question, prompt: { en: "What does the view-registry capacity check catch that a syntax check never could?", de: "Was fängt die View-Registry-Kapazitätsprüfung ab, was eine Syntaxprüfung nie könnte?" }, rubric: "It counts the real cads_view_dispatcher_add() call sites in the sources of the enabled apps and compares the total against CADS_APP_DEMO_VIEW_CAPACITY. The reason that is needed: past capacity the add returns false, every caller discards the return value with (void), and the excess views simply never exist - a dead menu row, no error anywhere, neither at build time nor at run time. A syntax check could never see it, because the fault is not in the file but in the image the file would produce. Names the silent nature of the failure; an answer that only says too many apps does not pass.", bloom: analyze }
socratic:
  - { trigger: "task:checked:failed", question: { en: "This profile ships with the project and is known good. So is the checker complaining about the file, or about your environment?", de: "Dieses Profil wird mitgeliefert und ist bekannt gut. Beschwert sich der Prüfer also über die Datei oder über deine Umgebung?" }, hints: [ { en: "Run it from the project root; the script resolves the apps and the capacity source relative to it.", de: "Führ es aus dem Projektwurzelverzeichnis aus; das Skript löst Apps und Kapazitätsquelle relativ dazu auf." }, { en: "It reads the capacity out of a source file - if that read fails it says so instead of guessing a number.", de: "Es liest die Kapazität aus einer Quelldatei - schlägt das fehl, sagt es das, statt eine Zahl zu raten." }, { en: "A failure here is environmental, so fix the environment before touching any profile.", de: "Ein Fehler hier ist umgebungsbedingt, repariere also die Umgebung, bevor du ein Profil anfasst." } ] }
  - { trigger: "task:own-profile:failed", question: { en: "Your own profile has to pass two different gates. Which of the two rejected it - the grammar or the image model?", de: "Dein eigenes Profil muss zwei verschiedene Tore passieren. Welches der beiden hat es abgelehnt - die Grammatik oder das Image-Modell?" }, hints: [ { en: "The file has to exist at profiles/lab.profile and hold at least one line; an empty file is the full image.", de: "Die Datei muss unter profiles/lab.profile liegen und mindestens eine Zeile enthalten; eine leere Datei ist das volle Image." }, { en: "Copy profiles/minimal.profile as a starting point and change which apps are on, rather than inventing the syntax.", de: "Nimm profiles/minimal.profile als Ausgangspunkt und ändere, welche Apps an sind, statt die Syntax zu erfinden." }, { en: "Read the two verdict lines it prints: one is about the grammar, the other about how many view slots your selection needs.", de: "Lies die zwei Urteilszeilen, die es druckt: die eine betrifft die Grammatik, die andere, wie viele View-Plätze deine Auswahl braucht." } ] }
  - { trigger: "question:capacity-catch:weak", question: { en: "Suppose a profile enables one app too many. What does the firmware do, and what would a user see?", de: "Angenommen, ein Profil schaltet eine App zu viel ein. Was tut die Firmware dann, und was sähe ein Nutzer?" }, hints: [ { en: "The failure has no error path in the firmware at all - look at the return value of the registration call and what callers do with it.", de: "Der Fehler hat in der Firmware gar keinen Fehlerpfad - sieh dir den Rückgabewert des Registrierungsaufrufs an und was die Aufrufer damit tun." }, { en: "A syntax check can only see the file. This check reads the sources of the apps the file switches on.", de: "Eine Syntaxprüfung sieht nur die Datei. Diese Prüfung liest die Quellen der Apps, die die Datei einschaltet." }, { en: "Say where the failure would otherwise surface: on a laptop, in CI, or in front of a panel with a dead menu row.", de: "Sag, wo der Fehler sonst auftauchen würde: auf einem Laptop, in CI oder vor einem Panel mit einer toten Menüzeile." } ] }
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

It prints two verdicts, and they check different things. The first is about the **grammar**: a line that does not match `app.<name> = on|off`, or that names an app CMake does not know, is a typo and is caught in milliseconds instead of after a slower configure.

The second verdict is not about the file but about the **image the file would produce**. For that the checker opens the sources of the enabled apps and counts something in them, which it holds against `CADS_APP_DEMO_VIEW_CAPACITY` in `apps/bringup/explorer_app_demo.c` — the same capacity whose behaviour at the limit you predicted in M5-02. That exact bug shipped twice before it was understood; that is why the check exists. What it counts, and why a syntax check could never see it, is the third task of this step.

## Your task

First run `python3 scripts/check_profile.py profiles/minimal.profile` and read both verdict lines. Then write a profile of your own, `profiles/lab.profile` — your selection, but a reasoned one: which apps does a lab image actually need? — and put it through the same checker. If you have time, add `--build` and read the RAM-budget line it produces. Finally answer the question on what the capacity check catches. The next module leaves storage for the network.
