---
id: m3-04-stack-guard
title: Einen Stack-Überlauf fangen
bloom: analyze
objectives: [cz.debug.stack-guard]
requires: [m3-03-fault-forensics]
estimatedMinutes: 15
links:
  - { step: m3-05-spi-mutex }
  - { step: m3-03-fault-forensics }
  - { doc: "docs/ROADMAP.md" }
  - { file: "core/cads_hal.h" }
  - { file: "apps/bringup/tasks.c", line: 128 }
sources: [apps/bringup/tasks.c, docs/ROADMAP.md, docs/how-to/debug.md, core/cads_hal.h, scripts/check_ram_budget.py]
tasks:
  - id: build
    title: Die Firmware baut weiterhin mit dem Wächter
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: overflow-signature
    title: Einen Stack-Überlauf an den Beweisen erkennen
    check: { type: question, prompt: { en: "Name the register signature of a stack overflow this firmware has actually produced, and explain how the stack-guard sentinel and the forensic ring turned 'the board froze' into 'the input task's stack overflowed'.", de: "Nenne die Registersignatur eines Stack-Überlaufs, den diese Firmware tatsächlich erzeugt hat, und erkläre, wie der Stack-Guard-Wächter und der Forensik-Ring aus 'das Board fror ein' ein 'der Stack der Input-Task lief über' machten." }, rubric: "Signatur: ein sinnloser PC wie 0xF7FF0FF0 (Instruction-Fetch-Verletzung, CFSR IACCVIOL) über eine korrumpierte Rücksprungadresse erreicht, und/oder ein auf einen absurd niedrigen Wert verbogener SP, mit der CPU im Fault-Handler selbst gefangen. Mechanismus: das unterste Wort jedes Task-Stacks ist ein 0xA5A5A5A5-Canary (Füllung von xTaskCreateStatic; der MSP-Wächter wird in cads_stackguard_arm gesetzt); vApplicationIdleHook prüft die vier Wächter (msp, ui, input, console) und ruft cads_hal_panic() mit dem Stacknamen; die Panik schreibt einen Forensik-Datensatz mit reason='input', den der Befehl E 22 ms vor dem Folge-HardFault zeigte - der Ring benannte also den exakten Stack, und die Korrektur war, CADS_INPUT_STACK (256 auf 1024 Wörter) im CCM zu vergrößern.", bloom: analyze }
socratic:
  - { trigger: "question:overflow-signature:weak", question: { en: "Where is the canary, who checks it, and what does the check do when it fails?", de: "Wo liegt der Canary, wer prüft ihn, und was tut die Prüfung, wenn sie fehlschlägt?" }, hints: [ { en: "Read cads_stackguards[] and vApplicationIdleHook() in apps/bringup/tasks.c.", de: "Lies cads_stackguards[] und vApplicationIdleHook() in apps/bringup/tasks.c." }, { en: "The lowest word of each stack is the sentinel; an overflow is the last thing to overwrite it.", de: "Das unterste Wort jedes Stacks ist der Wächter; ein Überlauf überschreibt es als Letztes." }, { en: "cads_hal_panic(name) records reason=<stack name> in the forensic ring before halting - that string is what E prints.", de: "cads_hal_panic(name) schreibt reason=<Stackname> in den Forensik-Ring, bevor es anhält - diese Zeichenkette druckt E." } ] }
---
## Lernziel

Erkenne einen Stack-Überlauf an seiner Registersignatur und verstehe, wie der Stack-Guard-Wächter und der Forensik-Ring dieser Firmware ein stilles Einfrieren in eine benannte, behebbare Ursache verwandeln.

## Warum Überläufe schwer zu sehen sind

Es gibt hier keine MPU-Schutzseite und keinen Kernel-Heap. Ein Task-Stack, der überläuft, schreibt schlicht über sein unteres Ende hinaus in das, was der Linker darunter platziert hat. Das Symptom heißt selten „Stack-Überlauf"; es ist eine korrumpierte Rücksprungadresse, ein Sprung ins Nichts und ein Fault *in* Code, der mit der Ursache nichts zu tun hatte. Die Projektakte kennt zwei hardwarebestätigte Fälle (`apps/bringup/tasks.c`, Kopfkommentar; `docs/ROADMAP.md`, 2026-08-28 und 2026-08-30):

- **Konsolen-Task, `net.dhcp = 1`.** Die App-Baum-Schleife ruft `cads_net_poll()` auf dem Stack der Konsolen-Task; die Zustandsmaschine des DHCP-Clients ist deutlich tiefer als der Static-IP-Pfad. Live mit GDB gefangen: `vApplicationIdleHook()` faultete mit einem sinnlosen `PC` von `0xF7FF0FF0` - eine Instruction-Fetch-Verletzung, `CFSR`-Bit `IACCVIOL` - über eine korrumpierte Rücksprungadresse erreicht, und `SP` auf einen absurd niedrigen Wert verbogen, mit der CPU im Fault-Handler selbst gefangen. Korrektur: `CADS_CONSOLE_STACK` 512 → 1024 Wörter.
- **Input-Task, Marauder-Menü.** `cads_input_tick()` ruft direkt in den Eingabe-Handler der aktiven App auf dem eigenen Stack der Input-Task, sodass ein 256-Wort-Stack beliebige App-Aufruftiefe trug. Korrektur: `CADS_INPUT_STACK` 256 → 1024 Wörter.

Diese Signatur - ein `PC`, der keine Flash-Adresse ist, ein unsinniger `SP`, ein Fault in Code, der ihn nicht verursacht haben kann - ist die, die du dir merkst.

## Der Wächter

`apps/bringup/tasks.c` führt eine kleine Tabelle:

```c
static const cads_stackguard_t cads_stackguards[] = {
    {"msp", &__cads_stack_bottom},
    {"ui", cads_ui_stack},
    {"input", cads_input_stack},
    {"console", cads_console_stack},
};
```

Jeder Eintrag zeigt auf das **unterste Wort** eines Stacks, das ein Überlauf als Letztes überschreibt. Task-Stacks werden von `xTaskCreateStatic` mit `0xA5` gefüllt; der MSP-Wächter wird von `cads_stackguard_arm()` vor dem Scheduler-Start gesetzt. `vApplicationIdleHook()` - der Idle-Callback von FreeRTOS, läuft also immer, wenn sonst nichts läuft - prüft alle vier gegen `CADS_STACKGUARD_CANARY` und ruft beim ersten Unterschied `cads_hal_panic(name)`.

Deshalb kann ein Live-GDB-Attach auch `PC` in `cads_stackguard_breached()` zeigen und nichts bedeuten: das ist das normale Polling des Idle-Hooks, kein gefangener Absturz (`docs/ROADMAP.md`, 2026-09-01).

## Der Ring schließt den Kreis

`cads_hal_panic()` schreibt den Grund in den Forensik-Ring, bevor es anhält. Im Fall der Input-Task zeigte `E` `reason=input` **22 ms vor** einem `HardFault`-Datensatz mit `HFSR = 0x80000000` (DEBUGEVT) - das eigene `bkpt` der Panik eskalierte, weil kein Debugger hing, selbst ein am selben Tag behobener Fehler. Der Ring benannte also den exakten Stack; nichts musste geraten werden.

## Wo die Korrektur liegt und was sie kostet

Task-Stacks liegen im **CCM** (`CADS_CCM_SECTION`), nicht im SRAM-Heap, den `scripts/check_ram_budget.py` mit 256 B Marge bewacht. Die Vervierfachung des Input-Stacks kostete 3 KB CCM (etwa 54,7 KB von 64 KB weiter frei) und kein Byte des knappen SRAM-Budgets - deshalb durfte die Korrektur großzügig sein. M4 greift diese Abwägung wieder auf, wenn du selbst einen Stack dimensionierst.

## Deine Aufgabe

Lies die Wächtertabelle und `vApplicationIdleHook()` in `apps/bringup/tasks.c`, bestätige, dass die Firmware weiterhin baut, und beschreibe dann die Überlaufsignatur und wie Wächter plus Ring die Input-Task identifizierten. Der nächste Step wendet sich dem anderen klassischen Fehler geteilter Ressourcen zu: dem SPI-Bus.
