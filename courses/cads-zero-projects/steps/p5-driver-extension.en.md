---
id: p5-driver-extension
title: "Project: a driver extension"
bloom: create
objectives: [cz.explorer.extend]
requires: []
estimatedMinutes: 120
scaffold: independent
creates: [cads_project_driver]
links:
  - { file: "apps/bringup/explorer.c" }
  - { doc: "docs/SAFETY.md" }
  - { doc: "docs/reference/explorer-console.md" }
sources: [apps/bringup/explorer.c, targets/itsboard/hal/hal_pwm.h, docs/SAFETY.md, core/cads_hal.h]
misconceptions:
  - { pattern: "unknown, .[?]. for help", question: { en: "The console did not recognise your letter. Is the case missing from the dispatch, or is the board not reading the console at all?", de: "Die Konsole hat deinen Buchstaben nicht erkannt. Fehlt der Case im Dispatch, oder liest das Board die Konsole gar nicht?" }, hints: [ { en: "The dispatch is a switch on the first character of the line, and letters are case sensitive.", de: "Das Dispatch ist ein switch über das erste Zeichen der Zeile, und Buchstaben unterscheiden Groß- und Kleinschreibung." }, { en: "Send the help command and check whether your letter appears; every taken letter is listed there.", de: "Sende den Hilfebefehl und prüf, ob dein Buchstabe auftaucht; jeder vergebene Buchstabe steht dort." }, { en: "If the board is inside the app tree it never reaches the dispatch - leave it first.", de: "Sitzt das Board im App-Baum, erreicht es das Dispatch nie - verlass ihn zuerst." } ] }
tasks:
  - id: driver-substance
    title: The diagnostic uses the HAL and is reachable from the console
    check: { type: all, bloom: create, checks: [ { type: task, label: "CaDS: Build", expectExitCode: 0 }, { type: command, cwd: ".", command: "for o in $(find build/itsboard -name '*.c.obj' -o -name '*.c.o'); do nm $o 2>/dev/null | grep -qE ' [Tt] _?cads_project_driver$' || continue; nm -u $o | grep -q cads_hal_ && exit 0; done; exit 1", expectExitCode: 0 }, { type: command, cwd: ".", command: "for o in $(find build/itsboard -name 'explorer.c.obj' -o -name 'explorer.c.o'); do nm -u $o 2>/dev/null | grep -q cads_project_driver && exit 0; done; exit 1", expectExitCode: 0 }, { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_driver" } ] }
  - id: safety-assured
    title: No forbidden pin direction in the source
    check: { type: all, bloom: create, checks: [ { type: fileNotMatches, file: "apps/bringup/explorer.c", pattern: "GPIO[AFGH]->MODER" }, { type: command, cwd: ".", command: "if grep -rqE 'GPIO[FG]->MODER' apps --include=*.c; then exit 1; else exit 0; fi", expectExitCode: 0 } ] }
  - id: defend
    title: Defend the safety of your diagnostic
    check: { type: question, prompt: { en: "Which pin does your tool deliberately leave alone, and what would driving it cost? One sentence per pin you touch, with its direction and its justification against docs/SAFETY.md, plus one sentence on the pin you avoided and the concrete consequence of driving it.", de: "Welchen Pin lässt dein Werkzeug bewusst in Ruhe, und was würde es kosten, ihn zu treiben? Je ein Satz für jeden Pin, den du anfasst, mit Richtung und Begründung gegen docs/SAFETY.md, plus ein Satz zu dem gemiedenen Pin und der konkreten Folge, ihn zu treiben." }, rubric: "Names every pin used with its direction and justifies each against docs/SAFETY.md. Then names at least one deliberately avoided pin with the concrete consequence, not merely the rule: PA13/PA14 cost the debug access and with it every flash over SWD; PH0/PH1 cost the external clock and with it the boot; PF0..7 and PG0..5 are pulled-up inputs the adapter can drive, and two push-pull drivers on one net destroy hardware; the RMII pins cost Ethernet. An answer that only cites the rule without naming the consequence does not pass.", bloom: create }
socratic:
  - { trigger: "task:driver-substance:failed", question: { en: "Four things are checked. Does your handler touch hardware through the HAL, and is it reached from a real dispatch case?", de: "Vier Dinge werden geprüft. Fasst dein Handler Hardware über die HAL an, und wird er aus einem echten Dispatch-Case erreicht?" }, hints: [ { en: "Did you build the board image after your last edit? These sub-checks read the object files under build/itsboard, not the source text.", de: "Hast du das Board-Image nach deiner letzten Änderung gebaut? Diese Teil-Checks lesen die Objektdateien unter build/itsboard, nicht den Quelltext." }, { en: "The check looks for the translation unit that defines cads_project_driver and wants at least one unresolved reference to a cads_hal_ function in it; model the shape on the existing diagnostics in apps/bringup/explorer.c - a case line, a call, a break, and a help line.", de: "Der Check sucht die Übersetzungseinheit, die cads_project_driver definiert, und will darin mindestens eine unaufgelöste Referenz auf eine cads_hal_-Funktion; baue die Form nach den vorhandenen Diagnosen in apps/bringup/explorer.c - eine case-Zeile, ein Aufruf, ein break und eine Hilfezeile." }, { en: "Board-only code needs a sim counterpart or a guard, or the host build stops linking and the board build alone is not enough.", de: "Board-only-Code braucht ein Sim-Gegenstück oder einen Guard, sonst linkt der Host-Build nicht mehr, und der Board-Build allein genügt nicht." } ] }
  - { trigger: "task:safety-assured:failed", question: { en: "Something in the source now configures the direction of a pin group that must stay input. Which group, and what is on those nets?", de: "Irgendetwas im Quelltext konfiguriert jetzt die Richtung einer Pin-Gruppe, die Eingang bleiben muss. Welche Gruppe, und was hängt an diesen Netzen?" }, hints: [ { en: "Did you set a direction yourself, or paste example code that writes a MODER register? The check searches the whole apps/ tree, not only your file.", de: "Hast du eine Richtung selbst gesetzt oder Beispielcode übernommen, der ein MODER-Register schreibt? Der Check sucht im ganzen apps/-Baum, nicht nur in deiner Datei." }, { en: "docs/SAFETY.md section 3 names the groups that are pulled-up inputs and must never become outputs; grep -rn MODER apps shows you every place that sets a direction.", de: "docs/SAFETY.md Abschnitt 3 nennt die Gruppen, die hochgezogene Eingänge sind und nie Ausgänge werden dürfen; grep -rn MODER apps zeigt dir jede Stelle, die eine Richtung setzt." }, { en: "The adapter can drive those nets, and two push-pull drivers on one net is the failure this check exists to prevent. If you need an output, use a pin the HAL already drives - the PWM surface owns one documented as safe.", de: "Der Adapter kann diese Netze treiben, und zwei Push-Pull-Treiber auf einem Netz sind der Fehler, den dieser Check verhindern soll. Brauchst du einen Ausgang, nimm einen Pin, den die HAL schon treibt - die PWM-Oberfläche besitzt einen, der als sicher dokumentiert ist." } ] }
  - { trigger: "question:defend:weak", question: { en: "List every pin your tool reads or drives, with a direction each. Now pick the one you were tempted by and did not take.", de: "Liste jeden Pin auf, den dein Werkzeug liest oder treibt, mit je einer Richtung. Wähl nun den, der dich reizte und den du nicht genommen hast." }, hints: [ { en: "Can you state a direction for every pin your tool touches? If not, you do not yet know what it does to the hardware.", de: "Kannst du für jeden Pin, den dein Werkzeug anfasst, die Richtung nennen? Wenn nicht, weißt du noch nicht, was es der Hardware antut." }, { en: "docs/SAFETY.md lists four groups that are off limits for different reasons: the debug pins, the oscillator pins, the pulled-up inputs, and the RMII set. Read what each one carries.", de: "docs/SAFETY.md listet vier Gruppen, die aus verschiedenen Gründen tabu sind: die Debug-Pins, die Oszillator-Pins, die hochgezogenen Eingänge und der RMII-Satz. Lies nach, was an jeder hängt." }, { en: "The cost is not always a dead board - one group costs you the debugger, another the clock, another the network. Which one did you avoid?", de: "Der Preis ist nicht immer ein totes Board - eine Gruppe kostet dich den Debugger, eine andere den Takt, eine andere das Netzwerk. Welche hast du gemieden?" } ] }
---
## Goal

Extend the board's driver surface with a new hardware diagnostic — a genuinely useful measurement or generator — reached from the explorer console and provably safe.

## What you build on

**Prerequisite:** work through this project step only after the Foundations steps `m2-02-mmio-gpio` and `m2-05-explorer-command`. The tutor cannot enforce that: `requires:` resolves only steps of the same pack, and the lock in `course.json` demands the whole Foundations course — the ordering among the projects is yours to keep.

This project assumes the Foundations steps on adding an explorer command (m2-05-explorer-command) and driving GPIO (m2-02-mmio-gpio), and the binding rules in `docs/SAFETY.md`. The existing diagnostics in `apps/bringup/explorer.c` (the `F` frequency counter, the `D` PWM generator on PE5, the `L` logic analyzer) are your models.

## Requirements

- Build a handler named exactly **`cads_project_driver`** that exercises real hardware: a timing measurement, a signal generator, a bus probe, or similar. Reach it by adding a case to the explorer dispatch (`switch(line[0])`) and a help line in `cads_help()`.
- Prefer the HAL. If you want PWM, `cads_hal_pwm_start()/stop()` already drives PE5 (adapter OUT13, TIM9_CH1) — the only genuinely PWM-capable OUT pin — and returns it cleanly. Reuse a HAL surface rather than writing raw timer registers.
- **Safety is the hard requirement.** Never configure PF0-7 or PG0-5 as outputs; never touch PA13/PA14 (SWD) or PH0/PH1 (HSE); leave the RMII pins to the Ethernet driver. If your tool needs a jumper (like the continuity test `K`), say so, and treat "nothing wired" as a well-formed negative result, not a failure.
- Keep the host build linking: split board-only code the way the existing `explorer_*_demo.c` / `_sim.c` pairs do.

## Acceptance

The safety rule is checked **mechanically** here, not merely asked about.

1. **Substance and reachability.** First the board image builds. Then the **object file** of the translation unit that *defines* `cads_project_driver` must carry at least one unresolved reference to a `cads_hal_` function — an empty body is not a hardware diagnostic, and a comment produces no reference. The object file of `apps/bringup/explorer.c` must list `cads_project_driver` as an undefined symbol, so your `case` really calls the handler; and the symbol must be in the ELF.
2. **Safety assurance.** Two checks that *fail* if you break the rule: `apps/bringup/explorer.c` must contain no direction configuration of ports A, F, G or H, and `GPIO[FG]->MODER` must appear nowhere in the whole `apps/` tree. That turns "never configure them as outputs" from a request into an acceptance condition.
3. **Defence.** You name every pin you touch and one you deliberately leave alone.

## Deliver

One hardware diagnostic that measures or generates something real, with a written safety argument for every pin it touches.
