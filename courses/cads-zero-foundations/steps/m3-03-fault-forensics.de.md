---
id: m3-03-fault-forensics
title: Einen Fault lesen, und der Forensik-Ring
bloom: analyze
objectives: [cz.debug.forensics]
requires: [m3-02-registers-svd]
estimatedMinutes: 20
links:
  - { step: m3-04-stack-guard }
  - { doc: "docs/how-to/debug.md" }
  - { file: "targets/itsboard/startup/fault_handlers.c" }
  - { file: "modules/diag/include/cads/diag/forensic.h" }
  - { file: "apps/bringup/explorer.c", line: 568 }
sources: [docs/how-to/debug.md, targets/itsboard/startup/fault_handlers.c, modules/diag/include/cads/diag/forensic.h, modules/diag/src/cads_forensic.c, apps/bringup/explorer.c]
tasks:
  - id: run-e
    title: Den Forensik-Ring mit dem Befehl E ausgeben
    check: { type: manual }
  - id: decode-cfsr
    title: Eine echte Fault-Signatur dekodieren
    check: { type: question, prompt: { en: "A fault dump reads UsageFault, CFSR = 0x00010000, HFSR = 0x00000000, and no MMFAR/BFAR lines. Decode it: which sub-register and bit is set, what instruction class caused it, what does HFSR = 0 prove about cads_fault_init(), and why are MMFAR/BFAR absent? Then: what does the explorer's E command print, and why does its ring survive a warm reset?", de: "Ein Fault-Dump zeigt UsageFault, CFSR = 0x00010000, HFSR = 0x00000000 und keine MMFAR/BFAR-Zeilen. Dekodiere ihn: welches Teilregister und Bit ist gesetzt, welche Instruktionsklasse verursachte ihn, was beweist HFSR = 0 über cads_fault_init(), und warum fehlen MMFAR/BFAR? Und: was druckt der Explorer-Befehl E, und warum überlebt sein Ring einen Warm-Reset?" }, rubric: "Bit 16 von CFSR ist UFSR.UNDEFINSTR (eine undefinierte Instruktion, z. B. udf #0 aus z FAULT); HFSR = 0 heißt, der Fault wurde direkt als UsageFault behandelt und nicht zu HardFault eskaliert (FORCED nicht gesetzt), was beweist, dass die SHCSR-Freigabe in cads_fault_init() wirkt; MMFAR/BFAR werden nur gedruckt, wenn ihre Gültigkeitsbits in CFSR gesetzt sind, und ein Undefined-Instruction-Fault rastet keine Adresse ein. E druckt die Reset-Ursache dieses Boots (cads_hal_reset_cause) und jeden gespeicherten Datensatz, neueste zuerst (seq, Uptime, reason, PC/LR/xPSR, R0-R3/R12, CFSR/HFSR, MMFAR/BFAR wenn gültig); der Ring liegt per CADS_CCM_SECTION im CCM, das der Reset-Handler nicht nullt, sodass Datensätze kurz vor einem Halt oder Watchdog-Reset danach noch lesbar sind.", bloom: analyze }
socratic:
  - { trigger: "task:run-e:stuck", question: { en: "E printed nothing at all. Is the board at the console prompt, or still inside the app-tree session that ignores plain typed bytes?", de: "E druckte gar nichts. Ist das Board am Konsolen-Prompt oder noch in der App-Baum-Sitzung, die einfache getippte Bytes ignoriert?" }, hints: [ { en: "Send board_key.py quit first, then E again.", de: "Sende zuerst board_key.py quit, dann erneut E." }, { en: "An empty ring ('0 record(s)') after a real power cycle is correct: CCM survives a reset but not power loss.", de: "Ein leerer Ring ('0 record(s)') nach einem echten Power-Cycle ist korrekt: CCM überlebt einen Reset, aber keinen Stromverlust." }, { en: "Do not run z FAULT to fill the ring - it halts for good and needs a reflash; read the reference signature in docs/how-to/debug.md instead.", de: "Führe nicht z FAULT aus, um den Ring zu füllen - es hält für immer an und braucht einen Reflash; lies stattdessen die Referenzsignatur in docs/how-to/debug.md." } ] }
---
## Lernziel

Mache aus einem Fault-Dump und dem Absturz-Ring des Boards eine Diagnose: welcher Fault, welche Instruktion und wo im Quelltext - mit den Beweisen, die die Firmware für dich aufbewahrt.

## Die Firmware hält an und druckt; sie setzt nicht zurück

Ein Memory-, Bus- oder Usage-Fault startet diese Firmware nicht stillschweigend neu. Die vier Handler in `targets/itsboard/startup/fault_handlers.c` sind starke Definitionen, die die schwachen `Default_Handler`-Aliase der generierten Vektortabelle überschreiben. Jeder ist ein *naked* Trampolin, das `EXC_RETURN` aus `LR` liest, um MSP oder PSP zu wählen, **bevor** ein C-Prolog sie stören kann, und dann den gestapelten Frame ausgibt:

```
*** CaDS FAULT: UsageFault ***
R0 .. R3, R12, LR, PC, PSR
CFSR = 0x00010000
HFSR = 0x00000000
```

`PC` ist die auslösende Instruktion. Der Dump endet mit `bkpt #0` und einer Schleife, nach dem Prinzip „anhalten, nicht zurücksetzen": ein Reset würde die einzige Kopie der Beweise vernichten. Mit angehängtem Debugger fängt dieser das `bkpt`; ohne eskaliert es zu einem HardFault, und das Board steht mit roter LED - der beabsichtigte sichere Fehlerzustand.

`cads_fault_init()` (aus `hal_init.c` direkt nach der Konsole aufgerufen) schaltet MemManage, BusFault und UsageFault in `SCB->SHCSR` frei. Ohne sie wird jeder Fault trotzdem gefangen, aber nur als undifferenzierter HardFault.

## CFSR dekodieren

`CFSR` packt drei Teilregister (PM0214 §4.4.7-4.4.9):

| Bits | Teilregister | Deckt ab |
|---|---|---|
| 7:0 | MMFSR | Speicherverwaltungs-Faults |
| 15:8 | BFSR | Bus-Faults (ungültige Adresse, unpräziser Schreibzugriff) |
| 31:16 | UFSR | Usage-Faults (undefinierte Instruktion, unausgerichtet, Division durch null) |

`MMFAR` und `BFAR` - die auslösende *Adresse* - werden nur gedruckt, wenn ihre Gültigkeitsbits in `CFSR` das sagen; ihr Fehlen ist ebenfalls Information.

Die Referenzsignatur stammt vom einzigen destruktiven Explorer-Befehl, `z FAULT`, der `udf #0` ausführt: `UsageFault`, `CFSR = 0x00010000` (Bit 16, `UNDEFINSTR`), `HFSR = 0x00000000` (direkt behandelt, nicht eskaliert - der Hardware-Beweis, dass die `SHCSR`-Freigabe wirkt). **Führe ihn jetzt nicht aus**; er hält für immer an und braucht einen Reflash.

## Vom PC zur Zeile

```bash
arm-none-eabi-addr2line -e build/itsboard/cads-zero.elf 0x<PC>
```

oder in der Debug-Sitzung `info line *0x<PC>`. `cads-zero.map` löst eine Adresse in Sektion und Symbol auf - ein `.ramfunc`-Bus-Fault wurde genau so gefunden.

## Der Forensik-Ring: Beweise, die einen Reset überleben

`modules/diag` führt einen Ring der letzten **6** Abstürze (`CADS_FORENSIC_RING_DEPTH`). Jeder Fault-Handler und `cads_hal_panic()` ruft `cads_forensic_record()` im Moment vor dem Halt: Grund, Uptime, der Frame, `CFSR`/`HFSR`, `MMFAR`/`BFAR` wenn gültig, `MSP` und `PSP`. Der Ring liegt per `CADS_CCM_SECTION` im **CCM** - der Reset-Handler nullt `.bss`, aber nicht `.ccm`, sodass ein Datensatz von kurz vor einem Watchdog-Reset nach dem Neustart noch da ist. Echter Stromverlust löscht ihn.

Der Explorer-Befehl `E` druckt die Reset-Ursache dieses Boots (`cads_hal_reset_cause()`: Power-on, Pin, Software, IWDG-Watchdog, …) und danach jeden Datensatz, neueste zuerst. Prüfe ihn, **bevor** du einen Boot für sauber hältst. Ein Vorbehalt aus der Projektakte: nachdem `cads_forensic_record_t` ein Feld hinzubekommt, lesen sich alte CCM-Bytes kurz als ein verstümmelter Datensatz - veraltetes Layout, kein neuer Fehler.

## Deine Aufgabe

Kehre zum Konsolen-Prompt zurück und führe `E` aus; lies die Reset-Ursache und die Datensätze, die der Ring hält. Dekodiere dann die Referenzsignatur aus der Frage. Der nächste Step nutzt den Ring, um einen Stack-Überlauf zu fangen.
