# Flashen / Flash

- **CaDS Board: Flash** (`cads.board.flash`) schreibt `build/itsboard/cads-zero.bin` nach `0x08000000` – ausschließlich in den Flash-Bereich, nie Mass-Erase (siehe `docs/SAFETY.md`).
- Vor dem Flashen wird der Core angehalten (Halt statt Reset – wichtig wegen des Watchdogs).
- Danach: **CaDS Board: Open Console** für die serielle Konsole (115200 Baud).

---

- **CaDS Board: Flash** writes `build/itsboard/cads-zero.bin` to `0x08000000` – flash range only, never a mass erase (see `docs/SAFETY.md`).
- The core is halted before flashing (halt instead of reset – the watchdog matters here).
- Afterwards: **CaDS Board: Open Console** for the serial console (115200 baud).
