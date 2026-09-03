---
id: m3-01-gdb-breakpoints
title: Breakpoints, Stepping und der Call-Stack
bloom: apply
objectives: [firmware-how-to-debug]
requires: [m2-05-explorer-command]
estimatedMinutes: 15
scaffold: worked
links:
  - { step: m3-02-registers-svd }
  - { doc: "docs/how-to/debug.md" }
  - { doc: "docs/how-to/vscode-setup.md" }
  - { file: "targets/itsboard/main.c", line: 13 }
  - { file: "targets/itsboard/startup/startup_stm32f429.c", line: 69 }
sources: [docs/how-to/debug.md, docs/how-to/vscode-setup.md, targets/itsboard/main.c, apps/bringup/bringup.c, targets/itsboard/startup/startup_stm32f429.c]
tasks:
  - id: stop-in-main
    title: An einem Breakpoint in main() anhalten
    check: { type: debugStop, file: "targets/itsboard/main.c", line: 14 }
  - id: backtrace-frame
    title: Den Frame unter main() benennen
    check: { type: question, prompt: { en: "Halt at your breakpoint and take a backtrace. Which frame sits directly below main()?", de: "Halte an deinem Breakpoint und nimm einen Backtrace. Welcher Frame steht direkt unter main()?" }, rubric: "Nennt Reset_Handler - oder gleichbedeutend den Startup- bzw. Reset-Handler - als den Frame unterhalb von main(). Belegbar in targets/itsboard/startup/startup_stm32f429.c, wo der einzige Aufruf von main() steht. Eine Antwort, die eine Task, die Idle-Task oder „nichts“ nennt, hat den Backtrace nicht gelesen oder das Target gar nicht angehalten. Die genaue Schreibweise des Symbolnamens zählt nicht.", bloom: apply }
socratic:
  - { trigger: "task:stop-in-main:failed", question: { en: "The session started but never stopped at your breakpoint. Did it stop at main() at all, and is the breakpoint on a line that actually contains code?", de: "Die Sitzung startete, hielt aber nie an deinem Breakpoint. Hat sie überhaupt bei main() gehalten, und liegt der Breakpoint auf einer Zeile, die tatsächlich Code enthält?" }, hints: [ { en: "Is the image on the board the one you are debugging - or did the last build never reach the flash?", de: "Ist das Image auf dem Board dasselbe, das du debuggst - oder hat der letzte Bau den Flash nie erreicht?" }, { en: "Open targets/itsboard/main.c and check which line your red dot sits on; a dot on a comment or a blank line slides or is dropped.", de: "Öffne targets/itsboard/main.c und sieh nach, auf welcher Zeile dein roter Punkt sitzt; ein Punkt auf einem Kommentar oder einer Leerzeile rutscht oder entfällt." }, { en: "Only one client may hold the probe at a time - check whether an earlier debug session is still open before pressing F5 again.", de: "Nur ein Client darf die Probe gleichzeitig halten - prüfe, ob noch eine frühere Debug-Sitzung offen ist, bevor du F5 erneut drückst." } ] }
  - { trigger: "question:backtrace-frame:weak", question: { en: "How many lines does your Call Stack panel show, and did you take the backtrace after the halt or before it?", de: "Wie viele Zeilen zeigt dein Call-Stack-Panel, und hast du den Backtrace nach dem Halt genommen oder davor?" }, hints: [ { en: "A one-line stack usually means the target was still running when you looked - halt first, then read.", de: "Ein einzeiliger Stack heißt meistens, dass das Target beim Hinsehen noch lief - erst anhalten, dann lesen." }, { en: "Open targets/itsboard/startup/startup_stm32f429.c and search for the one place where main is called.", de: "Öffne targets/itsboard/startup/startup_stm32f429.c und suche die eine Stelle, an der main aufgerufen wird." }, { en: "Look up which single function the vector table names as the entry point after power-up - that one calls everything else.", de: "Sieh nach, welche einzelne Funktion die Vektortabelle als Einsprung nach dem Einschalten nennt - diese ruft alles Weitere auf." } ] }
---
## Lernziel

Führe die echte Firmware unter einem Debugger aus: halte an einem Breakpoint, gehe schrittweise durch den Bootpfad und lies den Call-Stack - und verstehe, was das Anhängen selbst mit dem Target macht.

## Wie Debugging hier verdrahtet ist

Drücke **F5** mit der ausgewählten Konfiguration **Debug CaDS Zero (Board im Browser)**. Es ist eine `cortex-debug`-Launch-Konfiguration mit `servertype: external`: der GDB-Server ist die Bridge des Labors auf `127.0.0.1:3333`, die mit der ST-Link in deinem Browser spricht. Es gibt weder `st-util` noch OpenOCD im Container; F5 ist der einzige Debug-Weg. Die Konfiguration:

- führt zuerst den Task **CaDS: Build + Flash** aus, sodass die ELF, die du debuggst, das Image auf dem Board ist;
- setzt `monitor reset halt` ab und läuft dann bis zum Einsprungpunkt `main()`;
- lädt `targets/itsboard/STM32F429.svd`, das der nächste Step nutzt.

`docs/how-to/debug.md` beschreibt dieselbe Sitzung von Hand mit `st-util` und `arm-none-eabi-gdb`; jedes GDB-Konzept dort gilt unverändert.

## Der Bootpfad, den du durchschreitest

`targets/itsboard/main.c` ist absichtlich winzig:

```c
int main(void) {
    cads_hal_init();
    cads_bringup_run();
    for(;;) { __asm volatile("wfi"); }
}
```

`cads_hal_init()` bringt Takte, GPIO, Konsole und Display hoch; `cads_bringup_run()` (in `apps/bringup/bringup.c`) führt den Selbsttest aus, zeichnet den Splash, startet den Scheduler und kehrt nicht zurück. Ein Breakpoint auf Zeile 14, dem Aufruf `cads_bringup_run()`, hält dich also genau zwischen „Hardware bereit“ und „Anwendung läuft“ - ein guter Ort, um zu sehen, was die HAL hinterlassen hat.

Aber `main()` ist nicht der Anfang. Vor ihm läuft der Reset-Pfad in `targets/itsboard/startup/startup_stm32f429.c`: die Vektortabelle nennt eine Einsprungfunktion, diese kopiert `.data`, nullt `.bss`, setzt `VTOR` und ruft erst dann `main()` auf. Genau deshalb hat ein Stack an deinem Breakpoint einen Frame **unterhalb** von `main()` - und dieser Frame ist deine Aufgabe.

## Anhängen ist nicht umsonst

Zwei Tatsachen über ein angehaltenes Target werden leicht fehlgedeutet (`docs/how-to/debug.md`, „Where am I?“ und „Time is frozen while halted“):

1. **Anhängen setzt das Target zurück.** Die Launch-Konfiguration führt `monitor reset halt` aus, der erste Halt liegt also wenige Millisekunden nach dem Boot. Ein Backtrace dort zeigt den frühen Boot, nicht den Ort, an dem die Firmware vor F5 war. Das ist normal, kein Hänger. Um einen *laufenden* Absturz zu untersuchen, hängst du ohne Reset an - das manuelle How-to dokumentiert dafür `st-util --no-reset`; `monitor halt` über die Bridge ist hier das Gegenstück.
2. **`DWT->CYCCNT` läuft im Halt nicht weiter.** Zweimal aus dem Debugger gelesen liefert denselben Wert; das ist kein kaputter Zähler.

## Schrittweise ausführen

Bei angehaltenem Target führt *Step Over* (F10) `cads_hal_init()` als Einheit aus; *Step Into* (F11) steigt hinein. Das Panel **Call Stack** zeigt die Frames von `main()` aufwärts, das Panel **Variables** die lokalen Variablen des gewählten Frames. Continue (F5) setzt fort; Pause hält den laufenden Kern, wo er gerade ist - sobald der Scheduler läuft, meist in der Idle-Task.

Einen Backtrace bekommst du auf zwei Wegen: das Panel **Call Stack** liest ihn ab, und in der Debug-Konsole tut `-exec bt` dasselbe in Textform. Beide zeigen dieselben Frames, oben der aktuelle.

## Deine Aufgabe

Setze einen Breakpoint auf `targets/itsboard/main.c` Zeile 14 (den Aufruf `cads_bringup_run()`), starte die Sitzung mit F5 und lass sie in diesen Breakpoint laufen; der Check bestätigt den Halt. Lies dann den Call-Stack und benenne den Frame direkt unter `main()`. Der nächste Step liest Peripherieregister desselben angehaltenen Boards.
