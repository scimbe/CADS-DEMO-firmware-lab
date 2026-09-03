---
id: m2-05-explorer-command
title: Dein eigenes Explorer-Kommando
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
    title: Der Dispatcher ruft deinen Handler auf
    check: { type: fileMatches, file: "apps/bringup/explorer.c", pattern: "cads_app_my_command" }
  - id: linked
    title: Dein Handler existiert in der gebauten Firmware
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_app_my_command" }
  - id: builds
    title: Die Firmware baut weiterhin
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
socratic:
  - { trigger: "task:linked:failed", question: { en: "The file mentions your function but the ELF does not contain it. Is the function defined (not just declared), and is anything actually calling it?", de: "Die Datei erwähnt deine Funktion, aber die ELF enthält sie nicht. Ist die Funktion definiert (nicht nur deklariert), und wird sie tatsächlich irgendwo aufgerufen?" }, hints: [ { en: "The link uses --gc-sections: a function nobody calls is dropped. Make sure your new case in the switch calls it.", de: "Der Link nutzt --gc-sections: eine Funktion, die niemand aufruft, wird entfernt. Stelle sicher, dass dein neuer case im switch sie aufruft." }, { en: "A 'static' handler that is called is fine, but the name must be exactly cads_app_my_command and it must be a definition with a body.", de: "Ein aufgerufener 'static'-Handler ist in Ordnung, aber der Name muss exakt cads_app_my_command lauten und es muss eine Definition mit Rumpf sein." }, { en: "Pick a letter the switch does not already use — grep for case '<letter>' first — and rebuild with CaDS: Build.", de: "Wähle einen Buchstaben, den der switch noch nicht nutzt — grep zuerst nach case '<Buchstabe>' — und baue mit CaDS: Build neu." } ] }
---
## Lernziel

Erweitere den Bring-up-Explorer um ein eigenes Kommando, sodass eine echte Firmware-Änderung von dir dispatcht, gelinkt und von der Host-Konsole aus ansteuerbar ist.

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

Jedes Kommando ist ein Buchstabe; ein unbekannter Buchstabe druckt die Hilfe erneut. `cads_help()` weiter oben in der Datei ist ein einziges String-Literal, das jedes Kommando auflistet — die maßgebliche Wahrheit der Firmware, ausgegeben durch `?`.

Ausgabe läuft über `cads_probe_puts()` (Zeichenkette) und `cads_probe_put_uint()` (Zahl), beide in `apps/bringup/bringup.c` definiert; ein `printf` gibt es nicht, weil sein Linken einen Heap hereinzöge, den diese Firmware absichtlich nicht hat. Diagnosezeilen beginnen per Konvention mit `# `, damit `scripts/board_test.py` sie von TAP-Zusicherungen unterscheiden kann.

## Was du hinzufügst

1. **Einen Handler** mit dem exakten Namen `cads_app_my_command(void)`, in `explorer.c` oberhalb der Dispatch-Schleife definiert. Halte ihn innerhalb der Sicherheitsregeln aus dem vorigen Step: OUT-LEDs über `cads_hal_adapter_outputs()` oder die Nucleo-LEDs über `cads_hal_led_set()` zu treiben ist sicher; PF/PG sind nur lesbar; PA7 und das Display nie außerhalb eines Bus-Claims anfassen. Ein gutes erstes Kommando druckt eine Zeile und lässt eine LED blinken, oder gibt `cads_hal_adapter_inputs()` als Zahl aus.
2. **Einen case** im `switch`, der ihn aufruft. Wähle einen Buchstaben, den der switch noch nicht nutzt — grep zuerst nach `case '`; der Großteil des Alphabets ist belegt.
3. **Eine Hilfezeile** in `cads_help()`, damit `?` dein Kommando wie jedes andere dokumentiert.

Dann baue mit dem Task **CaDS: Build** neu. Der Link läuft mit `--gc-sections`, ein Handler, den nichts aufruft, würde also entfernt und die Symbolprüfung schlüge fehl — der case ist nicht optional.

## Ansteuern

Flashe, kehre bei Bedarf aus dem App-Baum zum Prompt zurück (`board_key.py quit`) und sende deinen Buchstaben. Aus einer Shell tut `scripts/board_cmd.py <Buchstabe> --timeout 5` dasselbe nicht-interaktiv.

## Deine Aufgabe

Füge `cads_app_my_command` hinzu, dispatche es über einen freien Buchstaben, dokumentiere es im Hilfetext und baue neu. Die Checks bestätigen, dass der Dispatcher deinen Handler nennt, die ELF ihn tatsächlich enthält und die Firmware weiterhin baut. Nächstes Modul: du hältst den Debugger in genau solchem Code an.
