---
id: m6-03-config-option
title: Change a setting on the running board
bloom: apply
objectives: [cz.storage.config]
requires: [m6-02-config-file]
estimatedMinutes: 15
links:
  - { step: m6-04-build-profiles }
  - { doc: "docs/how-to/configure.md" }
  - { doc: "docs/reference/config-file.md" }
  - { step: m7-01-lwip-netif }
sources: [docs/how-to/configure.md, docs/reference/config-file.md, scripts/cads_config.py, modules/config/include/cads/config/config.h]
tasks:
  - id: applied
    title: Push a changed config.txt and reload it on the board
    check: { type: manual }
  - id: live-vs-reboot
    title: Which changes apply live, and what a broken file degrades to
    check: { type: question, prompt: { en: "You pushed a config.txt that changes display.brightness, net.ip and wifi.ssid, and then chose Settings -> Reload config. Which of these take effect immediately, which do not, and why? Then: your editor truncated the file half way - what state is the board in after the next boot?", de: "Du hast eine config.txt gepusht, die display.brightness, net.ip und wifi.ssid ändert, und dann Settings -> Reload config gewählt. Welche davon wirken sofort, welche nicht, und warum? Und: dein Editor hat die Datei zur Hälfte abgeschnitten - in welchem Zustand ist das Board nach dem nächsten Boot?" }, rubric: "display.* and net.* are applied live by Reload config (net address applied at once if the link is up, else on the next link-up); wifi.ssid/wifi.password only update what a later Settings -> Join WiFi uses - Reload alone does not trigger a join. A truncated file degrades to defaults plus whatever parsed: unknown keys are skipped, omitted keys keep their defaults, a malformed IP keeps the previous value - never a garbage state.", bloom: apply }
socratic:
  - { trigger: "task:applied:failed", question: { en: "You pushed the file, but the board still shows the old value. Did anything actually re-read /config.txt after the push?", de: "Du hast die Datei gepusht, aber das Board zeigt noch den alten Wert. Hat überhaupt etwas /config.txt nach dem Push neu gelesen?" }, hints: [ { en: "The file is read at boot and on one explicit menu action - a push alone changes flash, not the running configuration.", de: "Die Datei wird beim Booten und bei einer expliziten Menüaktion gelesen - ein Push allein ändert das Flash, nicht die laufende Konfiguration." }, { en: "Open Settings -> Reload config on the panel (board_key.py can navigate there), or power-cycle the board.", de: "Öffne Settings -> Reload config auf dem Panel (board_key.py kann dorthin navigieren) oder schalte das Board aus und ein." }, { en: "If the value still does not change, pull the file again: a push done while the board was writing its own storage may have been overwritten by the board's live volume.", de: "Ändert sich der Wert weiterhin nicht, hole die Datei erneut: ein Push, während das Board seinen eigenen Speicher schrieb, kann vom Live-Volume des Boards überschrieben worden sein." } ] }
---
## Learning goal

Change one setting on a running board from your computer, apply it without a reboot, and know exactly which keys behave that way.

## Two ways to change a running board

The fast path needs no host tools at all: **Settings** on the panel changes **Brightness** or **SPI clock** directly and persists the ones stored in `/config.txt`. The path you practise here is the one for anything the panel has no control for — the network address, several settings at once, or a config you want under version control (`docs/how-to/configure.md`):

```bash
scripts/cads_config.py pull            # -> ./config.txt
$EDITOR config.txt
scripts/cads_config.py push config.txt
```

Then, on the board, **Settings → Reload config**. It reports `Re-reading /config.txt and applying it.` and the change takes effect on the console task a moment later. A power-cycle works too, because the file is read at boot.

## A static address as the worked example

The lab's Ethernet exercises in M7 assume the default static addressing. Practise the mechanism on it now:

```ini
net.dhcp = 0
net.ip = 192.168.33.99
net.netmask = 255.255.255.0
net.gateway = 192.168.33.1
```

Change `net.ip` to another free address in the same `/24` (or, if you prefer a visible change, set `display.brightness = 40`), push, reload. The address is applied to the netif immediately if the link is up, otherwise the next time it comes up. Restore `192.168.33.99` afterwards so M7 matches the tutorial.

## What "live" covers, precisely

`display.*`, `net.*` and `wifi.*` are all applied by Reload config, and once at startup. Two nuances matter (`docs/reference/config-file.md`):

- `wifi.ssid` / `wifi.password` only take effect when **Settings → Join WiFi** is actually selected — Reload alone updates what a later join would use, it does not trigger one.
- `wifi.pcap_target` takes effect immediately; the Marauder relay re-reads it on every reload.

`boot.autostart` is read at boot only, by its nature: it decides where the boot goes.

## Why a half-written file is not a disaster

`push` reads the whole volume, changes one file, and writes it all back. If the board writes its own storage in between — a calibration save, a config write from the panel — that write is lost. So edit while the board is idle; right after a reset is the safe moment.

And if your editor leaves the file truncated, nothing dramatic happens: unknown keys are skipped, omitted keys keep their defaults, a malformed IP keeps the previous value. The parser was designed so an interrupted edit over a debug link degrades to "defaults plus whatever parsed".

## Your task

Pull, change one key, push, and reload on the board; confirm the new value on the panel or, for the address, with the console's net status. Then answer the question on what applies live and what a truncated file degrades to. The next step moves from runtime configuration to build-time feature selection.
