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
    check: { type: all, bloom: create, checks: [ { type: command, cwd: ".", command: "grep -rlE 'void[[:space:]]+cads_project_driver' apps --include=*.c | xargs -r grep -lE 'cads_hal_' | grep -q .", expectExitCode: 0 }, { type: command, cwd: ".", command: "grep -nE '^[[:space:]]*case .*cads_project_driver' apps/bringup/explorer.c", expectExitCode: 0 }, { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_driver" }, { type: task, label: "CaDS: Build", expectExitCode: 0 } ] }
  - id: safety-assured
    title: No forbidden pin direction in the source
    check: { type: all, bloom: create, checks: [ { type: fileNotMatches, file: "apps/bringup/explorer.c", pattern: "GPIO[AFGH]->MODER" }, { type: command, cwd: ".", command: "if grep -rqE 'GPIO[FG]->MODER' apps --include=*.c; then exit 1; else exit 0; fi", expectExitCode: 0 } ] }
  - id: defend
    title: Defend the safety of your diagnostic
    check: { type: question, prompt: { en: "Which pin does your tool deliberately leave alone, and what would driving it cost?", de: "Welchen Pin lässt dein Werkzeug bewusst in Ruhe, und was würde es kosten, ihn zu treiben?" }, rubric: "Names every pin used with its direction and justifies each against docs/SAFETY.md. Then names at least one deliberately avoided pin with the concrete consequence, not merely the rule: PA13/PA14 cost the debug access and with it every flash over SWD; PH0/PH1 cost the external clock and with it the boot; PF0..7 and PG0..5 are pulled-up inputs the adapter can drive, and two push-pull drivers on one net destroy hardware; the RMII pins cost Ethernet. An answer that only cites the rule without naming the consequence does not pass.", bloom: create }
socratic:
  - { trigger: "task:driver-substance:failed", question: { en: "Four things are checked. Does your handler touch hardware through the HAL, and is it reached from a real dispatch case?", de: "Vier Dinge werden geprüft. Fasst dein Handler Hardware über die HAL an, und wird er aus einem echten Dispatch-Case erreicht?" }, hints: [ { en: "A handler that touches no HAL function is not a hardware diagnostic - the check reads the file that defines it.", de: "Ein Handler, der keine HAL-Funktion anfasst, ist keine Hardware-Diagnose - der Check liest die Datei, die ihn definiert." }, { en: "Model the shape on the existing diagnostics in apps/bringup/explorer.c: a case line, a call, a break, and a help line.", de: "Baue die Form nach den vorhandenen Diagnosen in apps/bringup/explorer.c: eine case-Zeile, ein Aufruf, ein break und eine Hilfezeile." }, { en: "Board-only code needs a sim counterpart or a guard, or the host build stops linking and the board build alone is not enough.", de: "Board-only-Code braucht ein Sim-Gegenstück oder einen Guard, sonst linkt der Host-Build nicht mehr, und der Board-Build allein genügt nicht." } ] }
  - { trigger: "task:safety-assured:failed", question: { en: "Something in the source now configures the direction of a pin group that must stay input. Which group, and what is on those nets?", de: "Irgendetwas im Quelltext konfiguriert jetzt die Richtung einer Pin-Gruppe, die Eingang bleiben muss. Welche Gruppe, und was hängt an diesen Netzen?" }, hints: [ { en: "docs/SAFETY.md section 3 names the groups that are pulled-up inputs and must never become outputs.", de: "docs/SAFETY.md Abschnitt 3 nennt die Gruppen, die hochgezogene Eingänge sind und nie Ausgänge werden dürfen." }, { en: "The adapter can drive those nets; two push-pull drivers on one net is the failure this check exists to prevent.", de: "Der Adapter kann diese Netze treiben; zwei Push-Pull-Treiber auf einem Netz ist der Fehler, den dieser Check verhindern soll." }, { en: "If you need an output, use a pin the HAL already drives - the PWM surface owns one that is documented as safe.", de: "Brauchst du einen Ausgang, nimm einen Pin, den die HAL schon treibt - die PWM-Oberfläche besitzt einen, der als sicher dokumentiert ist." } ] }
  - { trigger: "question:defend:weak", question: { en: "List every pin your tool reads or drives, with a direction each. Now pick the one you were tempted by and did not take.", de: "Liste jeden Pin auf, den dein Werkzeug liest oder treibt, mit je einer Richtung. Wähl nun den, der dich reizte und den du nicht genommen hast." }, hints: [ { en: "Four groups are off limits for different reasons: the debug pins, the oscillator pins, the pulled-up inputs, and the RMII set.", de: "Vier Gruppen sind aus verschiedenen Gründen tabu: die Debug-Pins, die Oszillator-Pins, die hochgezogenen Eingänge und der RMII-Satz." }, { en: "The cost is not always a dead board - one of the groups costs you the debugger, another the clock, another the network.", de: "Der Preis ist nicht immer ein totes Board - eine der Gruppen kostet dich den Debugger, eine andere den Takt, eine andere das Netzwerk." }, { en: "Name the concrete consequence for the pin you avoided, not the rule that forbids it.", de: "Nenne die konkrete Folge für den Pin, den du gemieden hast, nicht die Regel, die ihn verbietet." } ] }
---
## Goal

Extend the board's driver surface with a new hardware diagnostic — a genuinely useful measurement or generator — reached from the explorer console and provably safe.

## What you build on

This project assumes the Foundations steps on adding an explorer command (m2-05-explorer-command) and driving GPIO (m2-02-mmio-gpio), and the binding rules in `docs/SAFETY.md`. The existing diagnostics in `apps/bringup/explorer.c` (the `F` frequency counter, the `D` PWM generator on PE5, the `L` logic analyzer) are your models.

## Requirements

- Build a handler named exactly **`cads_project_driver`** that exercises real hardware: a timing measurement, a signal generator, a bus probe, or similar. Reach it by adding a case to the explorer dispatch (`switch(line[0])`) and a help line in `cads_help()`.
- Prefer the HAL. If you want PWM, `cads_hal_pwm_start()/stop()` already drives PE5 (adapter OUT13, TIM9_CH1) — the only genuinely PWM-capable OUT pin — and returns it cleanly. Reuse a HAL surface rather than writing raw timer registers.
- **Safety is the hard requirement.** Never configure PF0-7 or PG0-5 as outputs; never touch PA13/PA14 (SWD) or PH0/PH1 (HSE); leave the RMII pins to the Ethernet driver. If your tool needs a jumper (like the continuity test `K`), say so, and treat "nothing wired" as a well-formed negative result, not a failure.
- Keep the host build linking: split board-only code the way the existing `explorer_*_demo.c` / `_sim.c` pairs do.

## Acceptance

The safety rule is checked **mechanically** here, not merely asked about.

1. **Substance and reachability.** The file that *defines* `cads_project_driver` must call at least one `cads_hal_` function — an empty body is not a hardware diagnostic. `apps/bringup/explorer.c` needs a real `case` line for your letter, the symbol must be in the ELF, and the board image must build.
2. **Safety assurance.** Two checks that *fail* if you break the rule: `apps/bringup/explorer.c` must contain no direction configuration of ports A, F, G or H, and `GPIO[FG]->MODER` must appear nowhere in the whole `apps/` tree. That turns "never configure them as outputs" from a request into an acceptance condition.
3. **Defence.** You name every pin you touch and one you deliberately leave alone.

## Deliver

One hardware diagnostic that measures or generates something real, with a written safety argument for every pin it touches.
