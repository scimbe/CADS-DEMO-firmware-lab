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
  - { trigger: "task:stop-in-main:failed", question: { en: "The session started but never stopped at your breakpoint. Did it stop at main() at all, and is the breakpoint on a line that actually contains code?", de: "Die Sitzung startete, hielt aber nie an deinem Breakpoint. Hat sie überhaupt bei main() gehalten, und liegt der Breakpoint auf einer Zeile, die tatsächlich Code enthält?" }, hints: [ { en: "Is the image on the board the one you are debugging - or did the last build never reach the flash?", de: "Ist das Image auf dem Board dasselbe, das du debuggst - oder hat der letzte Bau den Flash nie erreicht?" }, { en: "Open targets/itsboard/main.c with Ctrl/Cmd+P and check which line your red dot sits on; a dot on a comment or a blank line slides or is dropped.", de: "Öffne targets/itsboard/main.c mit Strg/Cmd+P und sieh nach, auf welcher Zeile dein roter Punkt sitzt; ein Punkt auf einem Kommentar oder einer Leerzeile rutscht oder entfällt." }, { en: "Only one client may hold the probe at a time - end an earlier session with Stop on the debug toolbar at the top before pressing F5 again.", de: "Nur ein Client darf die Probe gleichzeitig halten - beende eine frühere Sitzung mit Stop in der Debug-Werkzeugleiste oben, bevor du F5 erneut drückst." } ] }
  - { trigger: "question:backtrace-frame:weak", question: { en: "How many lines does your Call Stack panel show, and did you take the backtrace after the halt or before it?", de: "Wie viele Zeilen zeigt dein Call-Stack-Panel, und hast du den Backtrace nach dem Halt genommen oder davor?" }, hints: [ { en: "A one-line stack usually means the target was still running when you looked - halt first, then read.", de: "Ein einzeiliger Stack heißt meistens, dass das Target beim Hinsehen noch lief - erst anhalten, dann lesen." }, { en: "Open targets/itsboard/startup/startup_stm32f429.c with Ctrl/Cmd+P and search it for the one place where main is called.", de: "Öffne targets/itsboard/startup/startup_stm32f429.c mit Strg/Cmd+P und suche darin die eine Stelle, an der main aufgerufen wird." }, { en: "Look up which single function the vector table names as the entry point after power-up - that one calls everything else.", de: "Sieh nach, welche einzelne Funktion die Vektortabelle als Einsprung nach dem Einschalten nennt - diese ruft alles Weitere auf." } ] }
---

## Lernziel

Führe die echte Firmware unter einem Debugger aus: halte an einem Breakpoint, gehe schrittweise durch den Bootpfad und lies den Call-Stack - und verstehe, was das Anhängen selbst mit dem Target macht.

## Wo du klickst

Die Bedienoberfläche ist englisch, der Kurstext deutsch - der Menüpunkt heißt also `Run Task...`. Eine sichtbare Menüleiste gibt es nicht: die Menüs stecken hinter dem Symbol mit den drei Strichen (**☰**) ganz oben links, das `File`, `Edit`, `Selection`, `View`, `Go`, `Run`, `Terminal` und `Help` öffnet.

Die Ansicht **Run and Debug** liegt hinter dem Käfer-Symbol in der Leiste ganz links. Ein Klick zeigt oben die Konfigurationsliste, darunter `VARIABLES`, `WATCH`, `CALL STACK` und `BREAKPOINTS`.

![Das Käfer-Symbol in der Leiste links öffnet die Ansicht Run and Debug, in der F5 startet](run-and-debug-view.png)

Wähle in der Liste oben **`Debug CaDS Zero (Board im Browser)`**. Der zweite Eintrag, `Attach CaDS Zero (Board im Browser, no flash)`, hängt an ein bereits laufendes Board an, ohne zu flashen; hier brauchst du ihn nicht.

![Die Konfigurationsliste aufgeklappt, Debug CaDS Zero (Board im Browser) gewählt, Attach darunter](debug-configurations.png)

Es ist eine `cortex-debug`-Konfiguration mit `servertype: external`: der GDB-Server ist die Bridge des Labors auf `127.0.0.1:3333`, die mit der ST-Link in deinem Browser spricht. Weder `st-util` noch OpenOCD sind im Container; `F5` ist der einzige Debug-Weg. Die Konfiguration führt zuerst den Task `CaDS: Build + Flash` aus, sodass die ELF, die du debuggst, das Image auf dem Board ist, setzt `monitor reset halt` ab, läuft bis zum Einsprungpunkt `main()` und lädt `targets/itsboard/STM32F429.svd`, das der nächste Step nutzt.

## Den Breakpoint setzen

Öffne die Datei mit `Strg`/`Cmd`+`P`, tippe den Pfad und drücke Enter:

```text
targets/itsboard/main.c
```

Ohne Tastatur: ganz links das oberste Symbol der Leiste (Datei-Explorer), dann durch den Baum klicken. Klick nun links neben der Zeilennummer 14 in den Rand. Ein roter Punkt erscheint, und die Liste `BREAKPOINTS` in der Debug-Ansicht führt ihn mit Datei und Zeile auf. Auf einem Kommentar oder einer Leerzeile rutscht der Punkt beim Start weiter oder entfällt.

![Der rote Breakpoint-Punkt im Rand neben dem Aufruf cads_bringup_run(), daneben die Liste BREAKPOINTS](breakpoint-in-gutter.png)

## Der Bootpfad, den du durchschreitest

`targets/itsboard/main.c` ist absichtlich winzig:

```c
int main(void) {
    cads_hal_init();
    cads_bringup_run();
    for(;;) { __asm volatile("wfi"); }
}
```

`cads_hal_init()` bringt Takte, GPIO, Konsole und Display hoch; `cads_bringup_run()` (in `apps/bringup/bringup.c`) führt den Selbsttest aus, zeichnet den Splash, startet den Scheduler und kehrt nicht zurück. Zeile 14, der Aufruf `cads_bringup_run()`, hält dich also genau zwischen „Hardware bereit“ und „Anwendung läuft“.

Aber `main()` ist nicht der Anfang. Vor ihm läuft der Reset-Pfad in `targets/itsboard/startup/startup_stm32f429.c`: die Vektortabelle nennt eine Einsprungfunktion, diese kopiert `.data`, nullt `.bss`, setzt `VTOR` und ruft erst dann `main()` auf. Genau deshalb hat ein Stack an deinem Breakpoint einen Frame **unterhalb** von `main()` - und dieser Frame ist deine Aufgabe.

## Die Sitzung starten

Drücke **`F5`**. Ohne Tastatur: **☰ → `Run` → `Start Debugging`**.

Unten im Terminal-Bereich öffnet sich zuerst ein eigenes Terminal `CaDS: Build`, danach eines `CaDS: Flash` - beim ersten Mal etwa eine Minute für den Bau, dann etwa 15 Sekunden für das Flashen. Ist der Bereich zugeklappt, klappt ihn `Strg`/`Cmd`+`J` auf und zu.

Erst danach startet GDB, und der **erste** Halt ist der Einsprungpunkt `main()`, nicht dein Breakpoint (`runToEntryPoint: main`). Du erkennst ihn an drei Dingen zugleich: oben erscheint die Debug-Werkzeugleiste, im Bereich `CALL STACK` steht `Paused on breakpoint`, und im Editor ist die Haltezeile hervorgehoben.

![Angehalten bei main(), mit Debug-Werkzeugleiste und dem Call Stack](debug-halted-at-main.png)

Drücke jetzt noch einmal **`F5`** (Continue). Die Ausführung läuft in deinen Breakpoint auf Zeile 14 und hält dort; genau diesen Halt bestätigt der Check.

![Nach Continue hält die Ausführung wieder am Breakpoint](debug-after-continue.png)

## Schrittweise ausführen und den Stack lesen

Bei angehaltenem Target führt **`F10`** (Step Over) `cads_hal_init()` als Einheit aus, **`F11`** (Step Into) steigt hinein, **`F5`** setzt fort. Ohne Tastatur: dieselben Knöpfe in der Debug-Werkzeugleiste oben.

![Der Call Stack nach einem Step Over, mit Funktion, Adresse und Zeile des neuen Halts](debug-after-step-over.png)

Der Bereich `CALL STACK` zeigt die Frames von `main()` aufwärts, der Bereich `VARIABLES` die lokalen Variablen des gewählten Frames. Denselben Backtrace in Textform bekommst du unten im Terminal-Bereich im Reiter `DEBUG CONSOLE`; tippe dort:

```text
-exec bt
```

Beide zeigen dieselben Frames, oben der aktuelle.

## Anhängen ist nicht umsonst

Zwei Tatsachen werden leicht fehlgedeutet (`docs/how-to/debug.md`). **Anhängen setzt das Target zurück:** ein Backtrace am ersten Halt zeigt den frühen Boot, nicht den Ort, an dem die Firmware vor `F5` war. Für einen laufenden Absturz nimmst du den zweiten Eintrag der Konfigurationsliste. Und **`DWT->CYCCNT` läuft im Halt nicht weiter** - zweimal gelesen derselbe Wert, kein kaputter Zähler.

## Drei Bedienfehler, die hier fast jeder einmal macht

- **Der Task lief, aber die Ausgabe wird im falschen Fenster gesucht.** Sie steht nicht im Steptext und nicht im Editor, sondern unten im Terminal-Bereich in dem Terminal, das den Namen des Tasks trägt - `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts in der Liste wählst du das richtige Terminal.
- **Das Terminal geschlossen und damit den Vorgang beendet.** Das Kreuz am Terminal beendet den Prozess darin - zum Wegklappen `Strg`/`Cmd`+`J` nehmen, das lässt ihn weiterlaufen.
- **Die Palette reagiert nicht auf das Tastenkürzel.** Der Browser hat `Strg`/`Cmd`+`Umschalt`+`P` abgefangen - nimm `F1`, oder den Weg über **☰ → `Terminal`**.

## Deine Aufgabe

Setze den Breakpoint auf `targets/itsboard/main.c` Zeile 14, wähle **`Debug CaDS Zero (Board im Browser)`** und starte mit **`F5`** (oder **☰ → `Run` → `Start Debugging`**). Drücke nach dem Halt bei `main()` noch einmal **`F5`**, bis die Ausführung in Zeile 14 steht. Lies dann den Frame direkt unter `main()` im Bereich `CALL STACK` ab oder mit `-exec bt` im Reiter `DEBUG CONSOLE`.

Geprüft wird mit dem Knopf **Prüfen** an der Aufgabe oder **Run all checks** oben im Steptext-Reiter in der Mitte. Der nächste Step liest Peripherieregister desselben angehaltenen Boards.
