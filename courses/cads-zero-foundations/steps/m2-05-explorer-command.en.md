---
id: m2-05-explorer-command
title: Add your own explorer command
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
    title: The dispatcher calls your handler
    check: { type: fileMatches, file: "apps/bringup/explorer.c", pattern: "cads_app_my_command" }
  - id: linked
    title: Your handler exists in the built firmware
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_app_my_command" }
  - id: builds
    title: The firmware still builds
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
socratic:
  - { trigger: "task:wired:failed", question: { en: "The check reads one file and looks for one name. Is the name in apps/bringup/explorer.c, spelled exactly like that?", de: "Der Check liest eine Datei und sucht einen Namen. Steht der Name in apps/bringup/explorer.c, und genau so geschrieben?" }, hints: [ { en: "Could the edit have landed in a different file that was open in the tab next to it?", de: "Könnte die Änderung in einer anderen Datei gelandet sein, die im Reiter daneben offen war?" }, { en: "Open the file with Ctrl/Cmd+P and the typed name explorer.c, then save with Ctrl/Cmd+S — an unsaved editor still shows your text but the file on disk does not have it.", de: "Öffne die Datei mit Strg/Cmd+P und dem getippten Namen explorer.c und speichere mit Strg/Cmd+S — ein ungespeicherter Editor zeigt deinen Text noch, die Datei auf der Platte hat ihn aber nicht." }, { en: "The check compares text, not meaning: cads_app_mycommand or cads_app_my_Command counts as absent.", de: "Der Check vergleicht Text, keine Bedeutung: cads_app_mycommand oder cads_app_my_Command zählt als nicht vorhanden." } ] }
  - { trigger: "task:linked:failed", question: { en: "The file mentions your function but the ELF does not contain it. Which of the two, definition or call, is missing?", de: "Die Datei erwähnt deine Funktion, aber die ELF enthält sie nicht. Was von beidem fehlt, die Definition oder der Aufruf?" }, hints: [ { en: "Is your function defined with a body and called from exactly one case, or does it sit unused in the file?", de: "Ist deine Funktion mit Rumpf definiert und wird sie von genau einem case aufgerufen, oder steht sie unbenutzt in der Datei?" }, { en: "Rebuild via the task CaDS: Build and read the warnings in the terminal panel: a line saying defined but not used points at exactly this case.", de: "Bau über die Task CaDS: Build neu und lies die Warnungen im Terminal-Panel: eine Zeile mit defined but not used zeigt genau diesen Fall an." }, { en: "The link runs with --gc-sections: whatever nobody calls never reaches the ELF. The case is not decoration.", de: "Der Link läuft mit --gc-sections: was niemand aufruft, landet nicht in der ELF. Der case ist keine Zierde." } ] }
  - { trigger: "task:builds:failed", question: { en: "Does the first message name a line in explorer.c, or does the build fail before it gets there?", de: "Nennt die erste Meldung eine Zeile in explorer.c, oder scheitert der Build schon davor?" }, hints: [ { en: "Did the build stop at your change, or at something that was already broken before you touched anything?", de: "Ist der Build an deiner Änderung stehengeblieben, oder an etwas, das schon vorher kaputt war?" }, { en: "The build log is in the panel Terminal, in the tab of the task CaDS: Build. Scroll up to the first line containing error: — the later ones are usually consequences.", de: "Das Build-Protokoll steht im Panel Terminal, im Reiter der Task CaDS: Build. Scroll hoch zur ersten Zeile mit error: — die späteren sind meist Folgefehler." }, { en: "Two causes are common here: a case character that is already taken, and a handler that sits below the switch instead of above it.", de: "Zwei Ursachen sind hier häufig: ein case-Zeichen, das schon vergeben ist, und ein Handler, der unter dem switch steht statt darüber." } ] }
misconceptions:
  - { pattern: "duplicate case value", question: { en: "The compiler says this character already exists in the switch. Which characters are still free?", de: "Der Compiler sagt, dieses Zeichen gibt es im switch schon. Welche Zeichen sind überhaupt noch frei?" }, hints: [ { en: "Did you pick a letter? Every letter of the alphabet, upper and lower case, is already a command.", de: "Hast du einen Buchstaben gewählt? Jeder Buchstabe des Alphabets ist bereits ein Kommando, groß wie klein." }, { en: "Open a terminal (menu Terminal, New Terminal) and run grep -n case apps/bringup/explorer.c to see every character that is taken.", de: "Öffne ein Terminal (Menü Terminal, New Terminal) und führe grep -n case apps/bringup/explorer.c aus, um jedes vergebene Zeichen zu sehen." }, { en: "The digits 0 to 9 are all free; the dispatcher compares a single character, not a word.", de: "Die Ziffern 0 bis 9 sind alle frei; der Dispatcher vergleicht ein einzelnes Zeichen, kein Wort." } ] }
  - { pattern: "implicit declaration of function", question: { en: "At the line of your case the compiler does not know the function yet. Where is it defined?", de: "An der Zeile deines case kennt der Compiler die Funktion noch nicht. Wo steht sie definiert?" }, hints: [ { en: "Could your function be sitting below the dispatch loop instead of above it?", de: "Könnte deine Funktion unter der Dispatch-Schleife stehen statt über ihr?" }, { en: "Scroll through explorer.c to your definition and compare its line number with that of switch(line[0]).", de: "Scroll in explorer.c zu deiner Definition und vergleiche ihre Zeilennummer mit der von switch(line[0])." }, { en: "C reads a file from top to bottom: what was not there yet at the point of the call is unknown at that point.", de: "C liest eine Datei von oben nach unten: was an der Stelle des Aufrufs noch nicht dastand, ist dort noch unbekannt." } ] }
  - { pattern: "defined but not used", question: { en: "Your handler exists but nothing calls it. What is missing between the switch and the function?", de: "Dein Handler existiert, aber niemand ruft ihn auf. Was fehlt zwischen dem switch und der Funktion?" }, hints: [ { en: "Does your case really call the function, or does it only print a line of its own?", de: "Ruft dein case die Funktion wirklich auf, oder druckt er nur eine eigene Zeile?" }, { en: "Search the switch(line[0]) for your character and check that the call with its parentheses and semicolon stands behind it.", de: "Suche im switch(line[0]) nach deinem Zeichen und prüfe, ob dahinter der Aufruf mit Klammern und Semikolon steht." }, { en: "This warning and the failing symbol check have one cause: what nobody calls is removed by the linker with --gc-sections.", de: "Diese Warnung und der fehlschlagende Symbol-Check haben eine gemeinsame Ursache: was niemand aufruft, entfernt der Linker mit --gc-sections." } ] }
---
## Learning goal

Extend the bring-up explorer with a command of your own, so that a real firmware change of yours is dispatched, linked, and drivable from the console.

## Two words first

A **handler** is an ordinary function that does exactly one thing when a particular event happens — here: when a particular character arrives over the console. A **dispatcher** is the place that looks at the incoming event and decides which handler's turn it is.

The explorer's dispatcher is a `switch`. A `switch` compares one value against the values of its `case` labels in turn; if one matches, the code behind it runs until a `break` leaves the `switch`. If none matches, `default` takes over. Here the compared value is the first character of the typed line, and every `case` label is a command.

## How a command reaches its handler

`apps/bringup/explorer.c` is the whole console. Its loop reads bytes from `cads_hal_console_read()` into a fixed `char line[32]`; on CR or LF it terminates the line, skips spaces after the first character to find `argument`, and dispatches on the first byte:

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

Every command is one character; an unrecognised character reprints the help. `cads_help()` near the top of the file is a single string literal listing every command — the firmware's own ground truth, printed by `?`.

Output goes through `cads_probe_puts()` (a string) and `cads_probe_put_uint()` (a number), both defined in `apps/bringup/bringup.c`; there is no `printf`, because linking it pulls in a heap this firmware deliberately does not have. Diagnostic lines start with `# ` by convention so `scripts/board_test.py` can tell them from TAP assertions.

## Which character is still free

Every letter is taken, upper and lower case alike. See for yourself: open a terminal (menu *Terminal → New Terminal*) and type

```
grep -n "case '" apps/bringup/explorer.c
```

`grep` searches a file for a text pattern and prints every line it occurs in; `-n` puts the line number in front. So you get the list of every character in use along with where it is used.

The **digits `0` to `9` are free.** The dispatcher compares a single character, not a word — a digit works as a command just as well as a letter. When in doubt, take `1`.

## The skeleton

Copy these three pieces into `apps/bringup/explorer.c`. They compile exactly as they stand; your own work starts at the spot marked `TODO`.

```c
/* --- 1. The handler: above the dispatch loop for(;;), e.g. right below cads_help() --- */
void cads_app_my_command(void) {
    cads_probe_puts("# my command\r\n");

    /* TODO: your work starts here. One line is enough to begin with.
     *       Safe under the rules from m2-04:
     *         cads_hal_led_set(CadsLedGreen, true);
     *         cads_hal_adapter_outputs(0x0001u);
     *         cads_probe_put_uint(cads_hal_adapter_inputs());
     *       Not allowed: configuring PF or PG as an output; touching PA7 or the
     *       display outside cads_hal_spi_claim_bus()/release_bus(). */
}

/* --- 2. The case: into the switch(line[0]) of the dispatch loop --- */
case '1': cads_app_my_command(); break;

/* --- 3. The help line: into the string literal in cads_help() --- */
"#   1          my own command\r\n"
```

The function is deliberately not `static`: that way its name is in the ELF in any case, and the second check tests a fact about your code rather than a mood of the optimiser.

## Where you work

- **Open the file:** `Ctrl`/`Cmd`+`P`, then type `explorer.c` and open it with Enter. Do not forget to save (`Ctrl`/`Cmd`+`S`).
- **Build:** menu *Terminal → Run Task…*, entry **CaDS: Build**. The log appears in the *Terminal* panel.
- **Check:** the **Check** button on each task.
- **Terminal for `grep`:** menu *Terminal → New Terminal*. That is a shell window in the working directory, not the board console.

The link runs with `--gc-sections`: a function nobody calls is discarded at link time and the symbol check would fail. Piece 2, the `case`, is therefore not optional.

## Driving it

Flash, return to the prompt if the board is in the app tree (`python3 scripts/board_key.py quit` in a terminal), and send your character in the board console. From a shell, `scripts/board_cmd.py 1 --timeout 5` does the same non-interactively.

## Your task

Copy the skeleton, pick a free digit, fill the `TODO` with one line of your choice inside the safety rules, and rebuild. The three checks confirm that the dispatcher names your handler, that the ELF actually contains it, and that the firmware still builds. Next module: you will stop the debugger inside code exactly like this.
