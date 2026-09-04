---
id: m0-02-connect
title: Connect the board
bloom: understand
objectives: [firmware-hardware]
requires: [m0-01-welcome]
estimatedMinutes: 10
scaffold: worked
links:
  - { step: m0-03-build }
  - { doc: "docs/how-to/flash.md" }
  - { file: "scripts/cads_env.sh", line: 28 }
sources: [docs/HARDWARE.md, docs/how-to/flash.md, docs/reference/explorer-console.md]
tasks:
  - id: connected
    title: The board reports as connected
    check: { type: board, state: connected }
  - id: probe-identity
    title: Explain what the single link carries
    check: { type: question, prompt: { en: "The debugger halts the board, but the console window stays silent. Can an unplugged USB cable be the cause?", de: "Der Debugger hält das Board an, aber im Konsolenfenster bleibt es still. Kann ein abgezogenes USB-Kabel die Ursache sein?" }, rubric: "No — and the reasoning is what counts: debug and flash access (SWD) and the serial console (virtual COM port on USART3) run over the same probe and the same cable. As long as the debugger can halt the board, the cable is demonstrably attached. The answer must name the shared wire as the reason and look for the cause elsewhere, e.g. wrong serial port, console not opened, firmware sending nothing.", bloom: understand }
socratic:
  - { trigger: "task:connected:failed", question: { en: "Did a device chooser open at all, and did you pick something in it?", de: "Ging überhaupt ein Geräte-Dialog auf, und hast du darin etwas ausgewählt?" }, hints: [ { en: "Most often it is not the board: the chooser never opened, or it was closed without a choice.", de: "Meistens liegt es nicht am Board: der Geräte-Dialog ging nie auf, oder er wurde ohne Auswahl geschlossen." }, { en: "Open the command palette with F1, type CaDS Board: Verbinden and run the entry; the chooser then comes from the browser, not from the IDE — look at the top edge of the browser window.", de: "Öffne die Befehlspalette mit F1, tippe „CaDS Board: Verbinden“ und führe den Eintrag aus; der Dialog kommt danach vom Browser, nicht von der Umgebung — sieh am oberen Rand des Browserfensters nach." }, { en: "The chooser only lists devices with vendor id 0x0483. If the list stays empty, the browser does not hear the cable at all: another USB port, a cable that carries data wires, then run the command again. What the bridge currently sees is in the channel CaDS Board under the OUTPUT tab at the bottom; the palette command CaDS Board: Log anzeigen takes you there.", de: "Der Dialog listet nur Geräte mit der Vendor-ID 0x0483. Bleibt die Liste leer, hört der Browser das Kabel gar nicht: anderer USB-Anschluss, ein Kabel mit Datenadern, dann den Befehl erneut. Was die Bridge gerade sieht, steht unten im Reiter OUTPUT im Kanal „CaDS Board“; dorthin führt der Palettenbefehl „CaDS Board: Log anzeigen“." } ] }
  - { trigger: "question:probe-identity:weak", question: { en: "Count the cables first: how many plugs join the board and your computer?", de: "Zähl zuerst die Kabel: wie viele Stecker verbinden Board und Rechner?" }, hints: [ { en: "The most common wrong assumption is that debugger and console take separate paths. Test that assumption before you answer.", de: "Die häufigste falsche Annahme ist, dass Debugger und Konsole getrennte Wege nehmen. Prüf diese Annahme, bevor du antwortest." }, { en: "The section One probe, two jobs above numbers exactly two services. Read both items and match each to something the lab does.", de: "Der Abschnitt „Eine Probe, zwei Aufgaben“ weiter oben nummeriert genau zwei Dienste. Lies beide Punkte und ordne jedem eine Tätigkeit im Labor zu." }, { en: "If the debugger is working, the wire is demonstrably there. So the question is not whether something is plugged in, but which of the two services is silent.", de: "Wenn der Debugger arbeitet, ist die Leitung nachweislich da. Die Frage ist also nicht, ob etwas steckt, sondern welcher der beiden Dienste gerade schweigt." } ] }
---
## Learning goal

Get the board recognised by the lab, and understand what the single USB link between your computer and the board actually carries.

## The handgrip: releasing the board to the lab

There is no button in the window for connecting. The command lives in the **command palette** — the input line through which this environment offers every command it has. The user interface is in English while this course text is in German; our own board commands still carry German titles, because they come from our own extension.

1. Press **`F1`**. An input line drops down at the top centre of the window. (`Ctrl`/`Cmd`+`Shift`+`P` does the same, but a browser often keeps it for itself — use `F1`.)
2. Type into that line:

```
CaDS Board: Verbinden
```

The full entry reads `CaDS Board: Verbinden (USB/Serial freigeben)`; once it shows up in the list, select it with `Enter`.

3. The same command without any keyboard, through the **status bar at the bottom left**: it reads `Board: getrennt`. One click on it opens a small menu with `Board verbinden (USB/Serial freigeben)` and `Log anzeigen`.

![The status bar at the bottom left with the entry Board: getrennt](board-statusbar-disconnected.png)

![The board menu while disconnected, offering Board verbinden and Log anzeigen](board-menu-disconnected.png)

4. Now **the browser** asks, not the IDE: a chooser listing the attached USB devices appears at the top edge of the browser window. The browser renders that dialog itself, which is why it looks slightly different on every machine. Pick the ST-Link in it and confirm. This takes a few seconds.

<!-- SHOT: browser-usb-chooser | Der USB-Auswahldialog des Browsers am oberen Fensterrand, in der Liste ein Eintrag der ST-Link, Knopf zum Verbinden sichtbar | HARDWARE -->

**How you know it worked:** the same status bar entry now reads `Board: verbunden · läuft`. Hover over it and the tooltip names the probe it found and the chip.

![The status bar after connecting: Board: verbunden · läuft](board-statusbar-connected.png)

![The tooltip names ST-Link V2-1 and STM32F42x/F43x with 2048 KB of flash](board-statusbar-tooltip.png)

Then scroll down in this step text to the first task and press the **Check** button. The check asks the lab whether a probe is connected, and turns green if one is.

**Two operating mistakes that happen right here.** First: *the keyboard shortcut for the palette does nothing* — the browser swallowed it; use `F1`, or the status bar route, which needs no keyboard at all. Second: *you look for output in the wrong window* — connecting writes no line into a terminal. Its log sits at the bottom under the `OUTPUT` tab, in the channel `CaDS Board`; the palette command that takes you there is

```
CaDS Board: Log anzeigen
```

If the bottom area is collapsed, `Ctrl`/`Cmd`+`J` opens it.

## One probe, two jobs

The NUCLEO-F429ZI has an **ST-Link/V2-1 debug probe soldered onto it**. A *debug probe* is a small piece of hardware that drives and reads a foreign chip from the outside — halt it, read memory, write a program into it. Here it does not sit in a case of its own; it lives on the same board. That one probe does two separate things over a single USB cable:

1. **SWD** — *serial wire debug*, an interface with only two wires (`SWDIO` on PA13, `SWCLK` on PA14) through which the chip can be driven from outside. Everything that flashes, halts, steps or reads memory goes through here.
2. **A virtual COM port** — the STM32's **USART3** (one of the chip's serial transmit units: it pushes characters one after another down a single wire) is bridged to a USB serial device. Your computer then shows a serial port even though physically there is only USB — hence *virtual*. The firmware's console appears there at **115200 baud, 8N1**: 115200 symbols per second, 8 data bits, no parity, 1 stop bit. Both ends must use the same setting, or only garbage arrives.

So "connect the board" means giving the browser permission to talk to that probe. The chooser filters for STMicroelectronics' **vendor id** `0x0483` — the number with which a USB device identifies its maker. The `0x` in front means the number is written in hexadecimal, base sixteen; M2 introduces how to read that, at leisure. Pick the ST-Link, and from then on the **bridge** can reach it without asking again — the bridge being the relay inside the container that passes the connection made in your browser on to the tooling.

## The board this repository knows

The reference board's probe has a fixed serial, `066FFF565282494867161033` (`docs/HARDWARE.md`, and `scripts/cads_env.sh` exports it as `CADS_STLINK_SERIAL`). The flashing and debug tooling default to exactly that probe, so with more than one ST-Link attached the right one is still selected. `st-info --probe` reports the same identity:

```
serial:     066FFF565282494867161033
chipid:     0x419          -> STM32F42x/F43x
flash:      2097152 (pagesize: 16384)
```

The IDE, by the way, runs on a container while the board hangs off your own machine. Server-side USB passthrough would be the wrong architecture — so the connection is made in your browser and relayed to the bridge. This is why you, not an admin, click the chooser.

## Your task

Connect the board as described above (`F1` → `CaDS Board: Verbinden` → `Enter` → pick the ST-Link in the browser dialog) until the first check turns green after a press on **Check**. Then answer, in the second task's field, the question about what that single link carries, and press **Submit answer**. Once connected, the next step builds the firmware.
