# Example course notes

## Splash text

The desktop app in `apps/desktop/cads_desktop.c` draws the splash screen. Changing the splash text
is the smallest possible end-to-end edit: edit, build, flash, look at the display.

## Build artifacts

`cmake --preset itsboard && cmake --build --preset itsboard` produces `build/itsboard/cads-zero.elf`,
`.bin` and `.hex`. The ELF keeps the symbol table, which the tutor's `symbolInElf` check reads.
