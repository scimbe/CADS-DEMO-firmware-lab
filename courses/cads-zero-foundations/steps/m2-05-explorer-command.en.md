---
id: m2-05-explorer-command
title: Add your own explorer command
bloom: create
objectives: [cz.explorer.extend]
requires: [m2-04-safety]
estimatedMinutes: 25
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
  - { trigger: "task:linked:failed", question: { en: "The file mentions your function but the ELF does not contain it. Is the function defined (not just declared), and is anything actually calling it?", de: "Die Datei erwähnt deine Funktion, aber die ELF enthält sie nicht. Ist die Funktion definiert (nicht nur deklariert), und wird sie tatsächlich irgendwo aufgerufen?" }, hints: [ { en: "The link uses --gc-sections: a function nobody calls is dropped. Make sure your new case in the switch calls it.", de: "Der Link nutzt --gc-sections: eine Funktion, die niemand aufruft, wird entfernt. Stelle sicher, dass dein neuer case im switch sie aufruft." }, { en: "A 'static' handler that is called is fine, but the name must be exactly cads_app_my_command and it must be a definition with a body.", de: "Ein aufgerufener 'static'-Handler ist in Ordnung, aber der Name muss exakt cads_app_my_command lauten und es muss eine Definition mit Rumpf sein." }, { en: "Pick a letter the switch does not already use — grep for case '<letter>' first — and rebuild with CaDS: Build.", de: "Wähle einen Buchstaben, den der switch noch nicht nutzt — grep zuerst nach case '<Buchstabe>' — und baue mit CaDS: Build neu." } ] }
---
## Learning goal

Extend the bring-up explorer with a command of your own, so that a real firmware change of yours is dispatched, linked, and drivable from the host console.

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

Every command is one letter; an unrecognised letter reprints the help. `cads_help()` near the top of the file is a single string literal listing every command — the firmware's own ground truth, printed by `?`.

Output goes through `cads_probe_puts()` (a string) and `cads_probe_put_uint()` (a number), both defined in `apps/bringup/bringup.c`; there is no `printf`, because linking it pulls in a heap this firmware deliberately does not have. Diagnostic lines start with `# ` by convention so `scripts/board_test.py` can tell them from TAP assertions.

## What you will add

1. **A handler** named exactly `cads_app_my_command(void)`, defined in `explorer.c` above the dispatch loop. Keep it inside the safety rules from the previous step: driving OUT LEDs via `cads_hal_adapter_outputs()` or the Nucleo LEDs via `cads_hal_led_set()` is safe; PF/PG are read-only; never touch PA7 or the display outside a bus claim. A good first command prints a line and blinks an LED, or prints `cads_hal_adapter_inputs()` as a number.
2. **A case** in the `switch` that calls it. Pick a letter the switch does not already use — grep for `case '` first; most of the alphabet is taken.
3. **A help line** in `cads_help()`, so `?` documents your command like every other one.

Then rebuild with the **CaDS: Build** task. The link runs with `--gc-sections`, so a handler nothing calls would be discarded and the symbol check would fail — the case is not optional.

## Driving it

Flash, return to the prompt if the board is in the app tree (`board_key.py quit`), and send your letter. From a shell, `scripts/board_cmd.py <letter> --timeout 5` does the same non-interactively.

## Your task

Add `cads_app_my_command`, dispatch it from a free letter, document it in the help string, and rebuild. The checks confirm the dispatcher names your handler, the ELF actually contains it, and the firmware still builds. Next module: you will stop the debugger inside code exactly like this.
