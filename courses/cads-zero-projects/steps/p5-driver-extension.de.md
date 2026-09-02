---
id: p5-driver-extension
title: "Projekt: eine Treiber-Erweiterung"
bloom: create
objectives: [cz.explorer.extend]
requires: []
estimatedMinutes: 120
links:
  - { file: "apps/bringup/explorer.c" }
  - { doc: "docs/SAFETY.md" }
  - { doc: "docs/reference/explorer-console.md" }
sources: [apps/bringup/explorer.c, targets/itsboard/hal/hal_pwm.h, docs/SAFETY.md]
tasks:
  - id: driver-builds
    title: Die Diagnose existiert, ist erreichbar und baut
    check: { type: all, checks: [ { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_driver" }, { type: fileMatches, file: "apps/bringup/explorer.c", pattern: "cads_project_driver" }, { type: task, label: "CaDS: Build", expectExitCode: 0 } ] }
  - id: defend
    title: Verteidige die Sicherheit deiner Diagnose
    check: { type: question, prompt: { en: "Which pins does your diagnostic drive or read, and how do you know every one of them is safe to touch? Name at least one pin your tool deliberately never drives, and why.", de: "Welche Pins treibt oder liest deine Diagnose, und woher weißt du, dass jeder einzelne sicher zu berühren ist? Nenne mindestens einen Pin, den dein Werkzeug bewusst nie treibt, und warum." }, rubric: "Nennt die genutzten Pins mit Richtung je Pin; zitiert SAFETY.md-Regeln (PF0-7/PG0-5 nie Ausgänge; PA13/PA14 SWD und PH0/PH1 HSE unangetastet; RMII-Pins dem Ethernet-Treiber überlassen); und gibt mindestens einen bewusst unangetasteten Pin mit Grund an.", bloom: create }
socratic:
  - { trigger: "task:driver-builds:failed", question: { en: "The build cannot see cads_project_driver, or nothing calls it. Did you add a dispatch case and keep the handler board-portable?", de: "Der Build sieht cads_project_driver nicht, oder nichts ruft es auf. Hast du einen Dispatch-Case ergänzt und den Handler board-portabel gehalten?" }, hints: [ { en: "Add a case to the switch on line[0] in apps/bringup/explorer.c calling cads_project_driver, and give it a help line in cads_help().", de: "Ergänze im switch über line[0] in apps/bringup/explorer.c einen Case, der cads_project_driver aufruft, und gib ihm eine Hilfezeile in cads_help()." }, { en: "For a PWM-style tool, cads_hal_pwm_start/stop already drives PE5 (OUT13, TIM9_CH1) safely — reuse the HAL rather than poking a timer directly.", de: "Für ein PWM-Werkzeug treibt cads_hal_pwm_start/stop bereits PE5 (OUT13, TIM9_CH1) sicher — nutze die HAL, statt direkt einen Timer anzufassen." }, { en: "Board-only hardware code needs a sim counterpart or a guard so the host build still links, matching the explorer_*_demo.c / _sim.c split.", de: "Board-only-Hardwarecode braucht ein Sim-Gegenstück oder einen Guard, damit der Host-Build weiter linkt, passend zur explorer_*_demo.c / _sim.c-Trennung." } ] }
---
## Ziel

Erweitere die Treiberoberfläche des Boards um eine neue Hardware-Diagnose — eine wirklich nützliche Messung oder einen Generator — erreichbar aus der Explorer-Konsole und nachweislich sicher.

## Worauf du aufbaust

Dieses Projekt setzt die Grundlagen-Steps zum Ergänzen eines Explorer-Befehls (m2-05-explorer-command) und zum Ansteuern von GPIO (m2-02-mmio-gpio) voraus sowie die verbindlichen Regeln in `docs/SAFETY.md`. Die vorhandenen Diagnosen in `apps/bringup/explorer.c` (der Frequenzzähler `F`, der PWM-Generator `D` auf PE5, der Logikanalysator `L`) sind deine Vorbilder.

## Anforderungen

- Baue einen Handler mit genau dem Namen **`cads_project_driver`**, der echte Hardware nutzt: eine Zeitmessung, einen Signalgenerator, eine Bus-Sonde oder Ähnliches. Erreiche ihn über einen Case im Explorer-Dispatch (`switch(line[0])`) und eine Hilfezeile in `cads_help()`.
- Bevorzuge die HAL. Für PWM treibt `cads_hal_pwm_start()/stop()` bereits PE5 (Adapter OUT13, TIM9_CH1) — der einzige wirklich PWM-fähige OUT-Pin — und gibt ihn sauber zurück. Nutze eine HAL-Oberfläche, statt rohe Timer-Register zu schreiben.
- **Sicherheit ist die harte Anforderung.** Konfiguriere PF0-7 oder PG0-5 nie als Ausgänge; berühre nie PA13/PA14 (SWD) oder PH0/PH1 (HSE); überlasse die RMII-Pins dem Ethernet-Treiber. Braucht dein Werkzeug einen Jumper (wie der Durchgangstest `K`), sage es, und behandle „nichts verdrahtet" als wohlgeformtes negatives Ergebnis, nicht als Fehler.
- Halte den Host-Build linkfähig: trenne board-only-Code so wie die vorhandenen `explorer_*_demo.c` / `_sim.c`-Paare.

## Abnahme

Der erste Check bestätigt, dass `cads_project_driver` in der ELF ist, dass `apps/bringup/explorer.c` es referenziert und dass das Board-Image baut. Der zweite ist eine Sicherheitsverteidigung: du nennst jeden Pin, den dein Werkzeug treibt oder liest, begründest jeden gegen `docs/SAFETY.md` und nennst einen, den du bewusst in Ruhe lässt.

## Liefern

Eine Hardware-Diagnose, die etwas Echtes misst oder erzeugt, mit einem schriftlichen Sicherheitsargument für jeden berührten Pin.
