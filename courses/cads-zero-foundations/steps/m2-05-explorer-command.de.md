---
id: m2-05-explorer-command
title: Dein eigenes Explorer-Kommando
bloom: apply
objectives: [cz.explorer.extend]
requires: [m2-04-safety]
estimatedMinutes: 25
scaffold: faded
recallFrom: [m2-04-safety]
creates: [cads_app_my_command]
links:
  - { step: m3-01-gdb-breakpoints }
  - { file: "apps/bringup/explorer.c", line: 499 }
  - { file: "apps/bringup/explorer.c", line: 388 }
  - { doc: "docs/reference/explorer-console.md" }
sources: [apps/bringup/explorer.c, docs/reference/explorer-console.md, core/cads_hal.h, docs/SAFETY.md]
tasks:
  - id: wired
    title: Der Dispatcher ruft deinen Handler auf, und er steht in der gebauten Firmware
    check: { type: all, checks: [ { type: fileMatches, file: "apps/bringup/explorer.c", pattern: "cads_app_my_command" }, { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_app_my_command" } ] }
  - id: builds
    title: Die Firmware baut weiterhin
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: line-buffer
    title: Leite das Verhalten am Pufferende ab
    check: { type: question, prompt: { en: "The console reads into a fixed char line[32]. What happens to a command whose line is longer, and how do you recognise it in the output?", de: "Die Konsole liest in ein festes char line[32]. Was geschieht mit einem Kommando, dessen Zeile länger ist, und woran erkennst du es an der Ausgabe?" }, rubric: "Der Puffer nimmt nur 32 Zeichen auf; alles danach passt nicht mehr in dieselbe Zeile. Die überzähligen Bytes verschwinden nicht, sondern werden als Beginn einer neuen Eingabe gelesen, und ihr erstes Zeichen landet erneut im switch des Dispatchers. Erkennbar ist das an zwei Dingen: das Kommando wirkt mit einem abgeschnittenen Argument, gibt also etwa eine zu kurz geparste Maske zurück, und unmittelbar danach erscheint die Antwort auf ein Kommando, das niemand tippen wollte — meist die Hilfe, weil ein beliebiges Zeichen als unbekannt gilt. Wer nur sagt, der Rest werde ignoriert, besteht nicht: dann bliebe die zweite Antwort aus.", bloom: analyze }
socratic:
  - { trigger: "question:line-buffer:weak", question: { en: "Do bytes that no longer fit into the buffer vanish, or are they read later?", de: "Verschwinden Bytes, die nicht mehr in den Puffer passen, oder werden sie später gelesen?" }, hints: [ { en: "The loop keeps reading byte by byte, even after it has terminated a line.", de: "Die Schleife liest Byte für Byte weiter, auch nachdem sie eine Zeile abgeschlossen hat." }, { en: "Look in apps/bringup/explorer.c for where the line is terminated and what happens to the next incoming byte.", de: "Sieh in apps/bringup/explorer.c nach, wo die Zeile terminiert wird und was mit dem nächsten eingehenden Byte geschieht." }, { en: "To the dispatcher the first surplus byte is an ordinary command character — and for an unknown character it prints the help.", de: "Das erste überzählige Byte ist für den Dispatcher ein ganz gewöhnliches Kommandozeichen — und für ein unbekanntes Zeichen druckt er die Hilfe." } ] }
  - { trigger: "task:wired:failed", question: { en: "The check reads one file and looks for one name. Is the name in apps/bringup/explorer.c, spelled exactly like that?", de: "Der Check liest eine Datei und sucht einen Namen. Steht der Name in apps/bringup/explorer.c, und genau so geschrieben?" }, hints: [ { en: "Could the edit have landed in a different file that was open in the tab next to it?", de: "Könnte die Änderung in einer anderen Datei gelandet sein, die im Reiter daneben offen war?" }, { en: "Open the file with Ctrl/Cmd+P and the typed name explorer.c, then save with Ctrl/Cmd+S — an unsaved editor still shows your text but the file on disk does not have it.", de: "Öffne die Datei mit Strg/Cmd+P und dem getippten Namen explorer.c und speichere mit Strg/Cmd+S — ein ungespeicherter Editor zeigt deinen Text noch, die Datei auf der Platte hat ihn aber nicht." }, { en: "The check compares text, not meaning: cads_app_mycommand or cads_app_my_Command counts as absent.", de: "Der Check vergleicht Text, keine Bedeutung: cads_app_mycommand oder cads_app_my_Command zählt als nicht vorhanden." } ] }
  - { trigger: "task:builds:failed", question: { en: "Does the first message name a line in explorer.c, or does the build fail before it gets there?", de: "Nennt die erste Meldung eine Zeile in explorer.c, oder scheitert der Build schon davor?" }, hints: [ { en: "Did the build stop at your change, or at something that was already broken before you touched anything?", de: "Ist der Build an deiner Änderung stehengeblieben, oder an etwas, das schon vorher kaputt war?" }, { en: "The build log is in the panel Terminal, in the tab of the task CaDS: Build. Scroll up to the first line containing error: — the later ones are usually consequences.", de: "Das Build-Protokoll steht im Panel Terminal, im Reiter der Task CaDS: Build. Scroll hoch zur ersten Zeile mit error: — die späteren sind meist Folgefehler." }, { en: "Two causes are common here: a case character that is already taken, and a handler that sits below the switch instead of above it.", de: "Zwei Ursachen sind hier häufig: ein case-Zeichen, das schon vergeben ist, und ein Handler, der unter dem switch steht statt darüber." } ] }
misconceptions:
  - { pattern: "duplicate case value", question: { en: "The compiler says this character already exists in the switch. Which characters are still free?", de: "Der Compiler sagt, dieses Zeichen gibt es im switch schon. Welche Zeichen sind überhaupt noch frei?" }, hints: [ { en: "Did you pick a letter? Every letter of the alphabet, upper and lower case, is already a command.", de: "Hast du einen Buchstaben gewählt? Jeder Buchstabe des Alphabets ist bereits ein Kommando, groß wie klein." }, { en: "Open a terminal (menu Terminal, New Terminal) and run grep -n case apps/bringup/explorer.c to see every character that is taken.", de: "Öffne ein Terminal (Menü Terminal, New Terminal) und führe grep -n case apps/bringup/explorer.c aus, um jedes vergebene Zeichen zu sehen." }, { en: "The digits 0 to 9 are all free; the dispatcher compares a single character, not a word.", de: "Die Ziffern 0 bis 9 sind alle frei; der Dispatcher vergleicht ein einzelnes Zeichen, kein Wort." } ] }
  - { pattern: "implicit declaration of function", question: { en: "At the line of your case the compiler does not know the function yet. Where is it defined?", de: "An der Zeile deines case kennt der Compiler die Funktion noch nicht. Wo steht sie definiert?" }, hints: [ { en: "Could your function be sitting below the dispatch loop instead of above it?", de: "Könnte deine Funktion unter der Dispatch-Schleife stehen statt über ihr?" }, { en: "Scroll through explorer.c to your definition and compare its line number with that of switch(line[0]).", de: "Scroll in explorer.c zu deiner Definition und vergleiche ihre Zeilennummer mit der von switch(line[0])." }, { en: "C reads a file from top to bottom: what was not there yet at the point of the call is unknown at that point.", de: "C liest eine Datei von oben nach unten: was an der Stelle des Aufrufs noch nicht dastand, ist dort noch unbekannt." } ] }
  - { pattern: "defined but not used", question: { en: "Your handler exists but nothing calls it. What is missing between the switch and the function?", de: "Dein Handler existiert, aber niemand ruft ihn auf. Was fehlt zwischen dem switch und der Funktion?" }, hints: [ { en: "Does your case really call the function, or does it only print a line of its own?", de: "Ruft dein case die Funktion wirklich auf, oder druckt er nur eine eigene Zeile?" }, { en: "Search the switch(line[0]) for your character and check that the call with its parentheses and semicolon stands behind it.", de: "Suche im switch(line[0]) nach deinem Zeichen und prüfe, ob dahinter der Aufruf mit Klammern und Semikolon steht." }, { en: "This warning and the failing symbol check have one cause: what nobody calls is removed by the linker with --gc-sections.", de: "Diese Warnung und der fehlschlagende Symbol-Check haben eine gemeinsame Ursache: was niemand aufruft, entfernt der Linker mit --gc-sections." } ] }
---
## Lernziel

Erweitere den Bring-up-Explorer um ein eigenes Kommando, sodass eine echte Firmware-Änderung von dir dispatcht, gelinkt und von der Konsole aus ansteuerbar ist.

Dein Kommando fällt unter dieselben Regeln wie jeder andere Code: die geschützten Pins und Nur-Eingangs-Ports aus `m2-04-safety` gelten auch für einen Handler, den nur du aufrufst.

## Zwei Wörter vorweg

Ein **Handler** ist eine gewöhnliche Funktion, die genau eine Sache erledigt, wenn ein bestimmtes Ereignis eintritt — hier: wenn ein bestimmtes Zeichen über die Konsole hereinkommt. Ein **Dispatcher** ist die Stelle, die das eingegangene Ereignis anschaut und entscheidet, welcher Handler dran ist.

Der Dispatcher des Explorers ist ein `switch`. Ein `switch` vergleicht einen Wert der Reihe nach mit den Werten seiner `case`-Marken; passt eine, läuft der Code dahinter, bis ein `break` den `switch` verlässt. Passt keine, greift `default`. Hier ist der verglichene Wert das erste Zeichen der eingetippten Zeile, und jede `case`-Marke ist ein Kommando.

## Wie ein Kommando seinen Handler erreicht

`apps/bringup/explorer.c` ist die gesamte Konsole. Ihre Schleife liest Bytes über `cads_hal_console_read()` in ein festes `char line[32]`; bei CR oder LF terminiert sie die Zeile, überspringt Leerzeichen nach dem ersten Zeichen, um `argument` zu finden, und verteilt nach dem ersten Byte:

```c
switch(line[0]) {
case '?': cads_help(); break;
case 'i': cads_dump_ports(); break;
case 'k': cads_tasks_report(); break;
/* ... */
case 'o': {
    uint32_t value = cads_parse_hex(argument);
    cads_hal_adapter_outputs((uint16_t)value);
    cads_probe_puts("# outputs = ");
    cads_put_hex16(value);
    cads_probe_puts("\r\n");
    break;
}
```

Jedes Kommando ist ein Zeichen; ein unbekanntes Zeichen druckt die Hilfe erneut. `cads_help()` weiter oben in der Datei ist ein einziges String-Literal, das jedes Kommando auflistet — die maßgebliche Wahrheit der Firmware, ausgegeben durch `?`.

Ausgabe läuft über `cads_probe_puts()` (Zeichenkette) und `cads_probe_put_uint()` (Zahl), beide in `apps/bringup/bringup.c` definiert; ein `printf` gibt es nicht, weil sein Linken einen Heap hereinzöge, den diese Firmware absichtlich nicht hat. Diagnosezeilen beginnen per Konvention mit `# `, damit `scripts/board_test.py` sie von TAP-Zusicherungen unterscheiden kann.

## Welches Zeichen noch frei ist

Alle Buchstaben sind vergeben, große wie kleine. Überzeug dich selbst: öffne ein Terminal (Menü *Terminal → New Terminal*) und tippe

```
grep -n "case '" apps/bringup/explorer.c
```

`grep` durchsucht eine Datei nach einem Textmuster und druckt jede Zeile, in der es vorkommt; `-n` stellt die Zeilennummer davor. Du bekommst also die Liste aller belegten Zeichen mitsamt ihrer Fundstelle.

Die **Ziffern `0` bis `9` sind frei.** Der Dispatcher vergleicht ein einzelnes Zeichen, kein Wort — eine Ziffer ist als Kommando genauso gut wie ein Buchstabe. Nimm im Zweifel die `1`.

## Das Skelett

Kopier diese drei Stücke in `apps/bringup/explorer.c`. Sie übersetzen so, wie sie dastehen; deine eigene Arbeit beginnt an der Stelle mit `TODO`.

```c
/* --- 1. Der Handler: über die Dispatch-Schleife for(;;), z. B. direkt unter cads_help() --- */
void cads_app_my_command(void) {
    cads_probe_puts("# my command\r\n");

    /* TODO: Ab hier deine Arbeit. Eine Zeile genügt für den Anfang.
     *       Sicher nach den Regeln aus m2-04:
     *         cads_hal_led_set(CadsLedGreen, true);
     *         cads_hal_adapter_outputs(0x0001u);
     *         cads_probe_put_uint(cads_hal_adapter_inputs());
     *       Nicht erlaubt: PF oder PG als Ausgang konfigurieren; PA7 oder das
     *       Display außerhalb von cads_hal_spi_claim_bus()/release_bus(). */
}

/* --- 2. Der case: in den switch(line[0]) der Dispatch-Schleife --- */
case '1': cads_app_my_command(); break;

/* --- 3. Die Hilfezeile: in das String-Literal in cads_help() --- */
"#   1          my own command\r\n"
```

Die Funktion ist absichtlich nicht `static`: so steht ihr Name in jedem Fall in der ELF, und der zweite Check prüft eine Tatsache über deinen Code statt eine Laune des Optimierers.

## Wo du arbeitest

- **Datei öffnen:** `Strg`/`Cmd`+`P`, dann `explorer.c` tippen und mit Enter öffnen. Speichern nicht vergessen (`Strg`/`Cmd`+`S`).
- **Prüfen:** der Knopf **Prüfen** an der jeweiligen Aufgabe.
- **Terminal für `grep`:** Menü *Terminal → New Terminal*. Das ist ein Shell-Fenster im Arbeitsverzeichnis, nicht die Board-Konsole.

Gebaut wird über den Task:

::: do task="CaDS: Build"
Starte den Task über **`F1`** → `Tasks: Run Task` → `Enter` → `CaDS: Build`, ohne Tastatur über **☰ → `Terminal` → `Run Task...` → `CaDS: Build`**.
> expect: Unten öffnet sich ein Terminal mit dem Namen des Tasks; am Ende steht dort der Größenbericht des Linkers und wieder eine Eingabeaufforderung.
> recover: Meldet der Compiler einen Fehler in `explorer.c`, hast du wahrscheinlich vor dem Bauen nicht gespeichert — `Strg`/`Cmd`+`S` und erneut starten. Scheitert danach der Symbol-Check statt des Baus, fehlt der `case` im Dispatcher: der Linker läuft mit `--gc-sections` und wirft eine Funktion weg, die niemand aufruft.
:::

Der Link läuft mit `--gc-sections`: eine Funktion, die niemand aufruft, wird beim Linken entfernt, und der Symbol-Check schlüge fehl. Der `case` aus Stück 2 ist deshalb nicht optional.

## Ansteuern

Flashe, kehre bei Bedarf aus dem App-Baum zum Prompt zurück (in einem Terminal `python3 scripts/board_key.py quit`) und sende dein Zeichen in der Board-Konsole. Aus einer Shell tut `scripts/board_cmd.py 1 --timeout 5` dasselbe nicht-interaktiv.

## Deine Aufgabe

Kopier das Skelett, wähle eine freie Ziffer, füll das `TODO` mit einer Zeile deiner Wahl innerhalb der Sicherheitsregeln und baue neu. Die drei Checks bestätigen, dass der Dispatcher deinen Handler nennt, dass die ELF ihn tatsächlich enthält und dass die Firmware weiterhin baut. Nächstes Modul: du hältst den Debugger in genau solchem Code an.
