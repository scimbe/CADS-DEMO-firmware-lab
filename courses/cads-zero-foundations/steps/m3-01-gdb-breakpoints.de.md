---
id: m3-01-gdb-breakpoints
title: Breakpoints, Stepping und der Call-Stack
bloom: apply
objectives: [firmware-how-to-debug]
requires: [m2-05-explorer-command]
estimatedMinutes: 15
links:
  - { step: m3-02-registers-svd }
  - { doc: "docs/how-to/debug.md" }
  - { doc: "docs/how-to/vscode-setup.md" }
  - { file: "targets/itsboard/main.c", line: 13 }
sources: [docs/how-to/debug.md, docs/how-to/vscode-setup.md, targets/itsboard/main.c, apps/bringup/bringup.c]
tasks:
  - id: stop-in-main
    title: An einem Breakpoint in main() anhalten
    check: { type: debugStop, file: "targets/itsboard/main.c", line: 14 }
  - id: reset-on-attach
    title: Warum der erste Backtrace den frühen Boot zeigt
    check: { type: question, prompt: { en: "You start a debug session and immediately ask for a backtrace. Why does it show the board a few milliseconds into boot rather than where it was when you decided to look, and why is this easy to misread as a hang?", de: "Du startest eine Debug-Sitzung und forderst sofort einen Backtrace an. Warum zeigt er das Board wenige Millisekunden nach dem Boot statt dort, wo es war, als du hinschauen wolltest, und warum ist das leicht als Hänger fehlzudeuten?" }, rubric: "Nennt, dass die Launch-Konfiguration 'monitor reset halt' ausführt und bis zum Einsprungpunkt main() läuft, das Anhängen das Target also zurücksetzt; der erste Halt ist deshalb der frühe Boot, nicht der vorherige Live-Zustand, und ein Stack nahe Reset_Handler/main ist die normale Folge, kein Beleg für einen Hänger.", bloom: understand }
socratic:
  - { trigger: "task:stop-in-main:failed", question: { en: "The session started but never stopped at your breakpoint. Did it stop at main() at all, and is the breakpoint on a line that actually contains code?", de: "Die Sitzung startete, hielt aber nie an deinem Breakpoint. Hat sie überhaupt bei main() gehalten, und liegt der Breakpoint auf einer Zeile, die tatsächlich Code enthält?" }, hints: [ { en: "The launch configuration runs to main() first; if that never happened, the ELF and the flashed image may differ - rebuild and use Build + Flash.", de: "Die Launch-Konfiguration läuft zuerst bis main(); geschah das nie, unterscheiden sich womöglich ELF und geflashtes Image - neu bauen und Build + Flash nutzen." }, { en: "A breakpoint on a comment or blank line slides or is ignored; put it on the cads_bringup_run() call.", de: "Ein Breakpoint auf einem Kommentar oder einer Leerzeile rutscht oder wird ignoriert; setze ihn auf den Aufruf cads_bringup_run()." }, { en: "Only one client may hold the probe: end any earlier debug session before pressing F5 again.", de: "Nur ein Client darf die Probe halten: beende jede frühere Debug-Sitzung, bevor du F5 erneut drückst." } ] }
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

`cads_hal_init()` bringt Takte, GPIO, Konsole und Display hoch; `cads_bringup_run()` (in `apps/bringup/bringup.c`) führt den Selbsttest aus, zeichnet den Splash, startet den Scheduler und kehrt nicht zurück. Ein Breakpoint auf Zeile 14, dem Aufruf `cads_bringup_run()`, hält dich also genau zwischen „Hardware bereit" und „Anwendung läuft" - ein guter Ort, um zu sehen, was die HAL hinterlassen hat.

## Anhängen ist nicht umsonst

Zwei Tatsachen über ein angehaltenes Target werden leicht fehlgedeutet (`docs/how-to/debug.md`, „Where am I?" und „Time is frozen while halted"):

1. **Anhängen setzt das Target zurück.** Die Launch-Konfiguration führt `monitor reset halt` aus, der erste Halt liegt also wenige Millisekunden nach dem Boot. Ein Backtrace dort zeigt `main()` oder den Reset-Handler, nicht den Ort, an dem die Firmware vor F5 war. Das ist normal, kein Hänger. Um einen *laufenden* Absturz zu untersuchen, hängst du ohne Reset an - das manuelle How-to dokumentiert dafür `st-util --no-reset`; `monitor halt` über die Bridge ist hier das Gegenstück.
2. **`DWT->CYCCNT` läuft im Halt nicht weiter.** Zweimal aus dem Debugger gelesen liefert denselben Wert; das ist kein kaputter Zähler.

## Schrittweise ausführen

Bei angehaltenem Target führt *Step Over* (F10) `cads_hal_init()` als Einheit aus; *Step Into* (F11) steigt hinein. Das Panel **Call Stack** zeigt die Frames von `main()` aufwärts, das Panel **Variables** die lokalen Variablen des gewählten Frames. Continue (F5) setzt fort; Pause hält den laufenden Kern, wo er gerade ist - sobald der Scheduler läuft, meist in der Idle-Task.

## Deine Aufgabe

Setze einen Breakpoint auf `targets/itsboard/main.c` Zeile 14 (den Aufruf `cads_bringup_run()`), starte die Sitzung mit F5 und lass sie in diesen Breakpoint laufen; der Check bestätigt den Halt. Beantworte dann, warum der erste Backtrace den frühen Boot zeigt. Der nächste Step liest Peripherieregister desselben angehaltenen Boards.
