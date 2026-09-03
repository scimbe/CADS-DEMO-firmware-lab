# Hardware screenshots for the CaDS Zero foundations course

Captured 2026-09-03 against the production image `ghcr.io/scimbe/cads-firmware-lab:next-dbfa3c5`
with the real ITSboard (NUCLEO-F429ZI, ST-Link V2-1 V2J33M25, serial 066FFF565282494867161033)
and Google Chrome 152 driving WebUSB. Every image is a real session; none is mocked or staged.

| File | What it shows | Use it for |
|---|---|---|
| `board-statusbar-disconnected.png` | Status bar entry `Board: getrennt` | "This is where the board lives" – before connecting |
| `board-menu-disconnected.png` | The board menu with only *Board verbinden* and *Log anzeigen* | The first click of the course |
| `board-statusbar-connected.png` | Status bar entry `Board: verbunden · läuft` | Confirming a successful connect |
| `board-statusbar-tooltip.png` | Tooltip: ST-Link V2-1 V2J33M25, STM32F42x/F43x (2048 KB), core running | Proving *which* probe and chip were found |
| `board-menu-connected.png` | Full menu: Flash, Reset, Anhalten, Konsole öffnen, Log anzeigen, Trennen | The hub for every later hardware step |
| `shim-board-not-connected.png` | Terminal: `st-info --probe` → "Found 0 stlink programmers"; `st-flash write` → "error: flash failed: board not connected" | The error case a student hits when they flash before connecting |
| `flash-progress.png` | Notification `CaDS: Flash cads-zero.bin: program 60%` | What flashing looks like while it runs |
| `flash-ok.png` | Status bar `Flash ok: 327088 Bytes in 15973 ms`, tooltip with the last flash | What success looks like |
| `board-console-boot.png` | Boot self-test: banner, `1..10`, ten `ok` lines, `# 10/10 passed`, `# RESULT: PASS` | Reading the self-test |
| `board-console-no-serial-grant.png` | "CaDS Board Console" with the yellow hint that no serial port is granted, plus a breakpoint in the gutter | The console error case; also shows the red breakpoint dot |
| `breakpoint-in-gutter.png` | Red breakpoint dot on the `cads_bringup_run();` line, BREAKPOINTS pane listing it | Setting the first breakpoint |
| `run-and-debug-view.png` | Run and Debug side bar before starting | Where F5 lives |
| `debug-configurations.png` | Configuration list: *Debug CaDS Zero (Board im Browser)* selected, *Attach …* below | Choosing launch vs attach |
| `debug-halted-at-main.png` | Halted at `main`, debug toolbar, call stack `Paused on breakpoint` | The moment execution stops |
| `debug-variables.png` | Variables pane with Local, Global, Static and Registers | Inspecting state |
| `debug-registers.png` | Registers expanded with live values (`r0`, `r1`, …) | Reading CPU registers |
| `debug-peripherals-svd.png` | XPeripherals from the SVD: ADC1 @0x40012000, CAN1 @0x40006400, … | Peripheral inspection |
| `debug-after-step-over.png` | Call stack after Step Over: `main@0x0802310e`, `main.c:14` | Stepping |
| `debug-after-continue.png` | Continue, stopping again on the breakpoint | The run/stop cycle |
| `debug-after-stop.png` | After Stop: status bar back to `Board: verbunden · läuft`, no GDB marker | The board keeps running after the session ends |

One caveat, stated in the docs too: `board-console-boot.png` was streamed from the host's virtual
COM port into a lab terminal, not through the browser's WebSerial console. Granting WebSerial needs
a manual click in Chrome's own dialog that no automation can perform, and the policy that would
bypass it is only honoured at "mandatory" level, which needs root. The text is identical to what the
CaDS Board Console shows once the port is granted.

The two chooser dialogs (WebUSB and WebSerial) are missing on purpose: they are browser UI, not page
content, so Playwright cannot see them, and `screencapture` on this host returns an all-black image
because the process has no Screen Recording permission. They need a human with a screenshot key.
