---
id: m6-03-config-option
title: Change a setting on a running board
bloom: apply
objectives: [cz.storage.config]
requires: [m6-02-config-file]
estimatedMinutes: 15
scaffold: faded
links:
  - { step: m6-04-build-profiles }
  - { doc: "docs/how-to/configure.md" }
  - { doc: "docs/reference/config-file.md" }
  - { step: m7-01-lwip-netif }
sources: [docs/how-to/configure.md, docs/reference/config-file.md, scripts/cads_config.py, modules/config/include/cads/config/config.h, modules/config/src/cads_config.c]
tasks:
  - id: applied
    title: Push display.brightness = 40 and pull the file back
    check: { type: command, cwd: ".", command: "grep -nE '^[[:space:]]*display[.]brightness[[:space:]]*=[[:space:]]*40[[:space:]]*$' config.txt", expectExitCode: 0, bloom: apply }
  - id: not-live
    title: Which key does not take effect live
    check: { type: question, prompt: { en: "Of display.brightness, net.ip and wifi.ssid, which one does Reload config not put into effect?", de: "Welcher der Schlüssel display.brightness, net.ip und wifi.ssid wirkt nach Reload config nicht?" }, rubric: "wifi.ssid. display.* and net.* are applied by Reload config - the network address immediately if the link is up, otherwise at the next link-up. wifi.ssid and wifi.password only update what a later Settings Join WiFi would use; a reload on its own triggers no join. The answer needs that reasoning, not just the key name.", bloom: apply }
  - id: truncated
    title: What a truncated file degrades to
    check: { type: question, prompt: { en: "Your editor left config.txt truncated half way. What state is the board in after the next boot?", de: "Dein Editor hat config.txt zur Hälfte abgeschnitten. In welchem Zustand ist das Board nach dem nächsten Boot?" }, rubric: "Defaults plus whatever parsed. The parser skips unknown keys, leaves omitted ones on their built-in default, and on a malformed value - an incomplete IP, say - keeps the previous one. It never produces a garbage state and never a struct full of zeros. Passes only if all three cases are distinguished.", bloom: apply }
socratic:
  - { trigger: "task:applied:failed", question: { en: "You pushed the file, but a fresh pull shows the old value. Did anything actually re-read the file, and did the board write over your push?", de: "Du hast die Datei gepusht, aber ein frischer Pull zeigt den alten Wert. Hat überhaupt etwas die Datei neu gelesen, und hat das Board deinen Push überschrieben?" }, hints: [ { en: "A push changes flash, not the running configuration - the file is read at boot and on one explicit menu action.", de: "Ein Push ändert das Flash, nicht die laufende Konfiguration - die Datei wird beim Booten und bei einer expliziten Menüaktion gelesen." }, { en: "The check reads your local config.txt, so pull once more after the reload to see what the board actually holds.", de: "Der Check liest deine lokale config.txt, hol sie also nach dem Reload noch einmal, um zu sehen, was das Board wirklich hält." }, { en: "The value the check wants is the one named in the task text; a different brightness is a correct edit but not the one being verified.", de: "Der Wert, den der Check erwartet, ist der im Aufgabentext genannte; eine andere Helligkeit ist eine korrekte Änderung, aber nicht die geprüfte." } ] }
  - { trigger: "question:not-live:weak", question: { en: "Reload config re-reads the file. Which of the three keys describes something the board only does when you ask it to?", de: "Reload config liest die Datei neu. Welcher der drei Schlüssel beschreibt etwas, das das Board nur auf Aufforderung tut?" }, hints: [ { en: "Two of the three describe a state the firmware can simply adopt; the third describes an action it would have to perform.", de: "Zwei der drei beschreiben einen Zustand, den die Firmware einfach übernehmen kann; der dritte beschreibt eine Handlung, die sie ausführen müsste." }, { en: "docs/reference/config-file.md lists, per key, when it takes effect; read the wifi block especially.", de: "docs/reference/config-file.md nennt je Schlüssel, wann er wirkt; lies besonders den wifi-Block." }, { en: "Your answer needs the reason as well: say what a reload does with that key instead of applying it.", de: "Deine Antwort braucht auch den Grund: sag, was ein Reload mit diesem Schlüssel tut, statt ihn anzuwenden." } ] }
  - { trigger: "question:truncated:weak", question: { en: "The parser reads line by line and stops where the file stops. What does it have for the keys it never reached?", de: "Der Parser liest Zeile für Zeile und hört auf, wo die Datei aufhört. Was hat er für die Schlüssel, die er nie erreicht hat?" }, hints: [ { en: "Three separate rules cover the three ways a key can be broken: unknown, missing, malformed.", de: "Drei getrennte Regeln decken die drei Arten ab, auf die ein Schlüssel kaputt sein kann: unbekannt, fehlend, fehlerhaft." }, { en: "docs/reference/config-file.md states all three; the interesting one is what happens to a value that parses but is nonsense.", de: "docs/reference/config-file.md nennt alle drei; die interessante ist, was mit einem Wert geschieht, der parst, aber Unsinn ist." }, { en: "State the resulting configuration as a formula, not as a mood - the answer is a combination of two sources.", de: "Formuliere die entstehende Konfiguration als Formel, nicht als Stimmung - die Antwort ist eine Kombination aus zwei Quellen." } ] }
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

For this step's check, take the visible variant: set `display.brightness = 40`, push, reload on the board, and then pull the file **again**. The check reads your local `config.txt` — if the second pull shows `40`, the value really made the trip through the volume and back. If you want, practise the same mechanism on `net.ip` as well (a free address in the same `/24`, then restore `192.168.33.99` so M7 matches the tutorial).

## What "live" covers, precisely

Reload config re-reads the file and applies what can be applied. That is exactly where the nuance sits: some keys describe a **state** the firmware can simply adopt, others describe an **action** it would have to perform. `docs/reference/config-file.md` states, per key, when it takes effect; the `wifi` block is where the two sorts separate.

`boot.autostart` is the clear case of the other kind: it is read at boot only, by its nature, because it decides where the boot goes.

## Why a half-written file is not a disaster

`push` reads the whole volume, changes one file, and writes it all back. If the board writes its own storage in between — a calibration save, a config write from the panel — that write is lost. So edit while the board is idle; right after a reset is the safe moment.

And if your editor leaves the file truncated, nothing dramatic happens. The parser was designed explicitly for the interrupted edit over a debug link, and it treats an unknown, an omitted and a malformed key each differently. Which three rules those are, and what configuration they add up to, is in `docs/reference/config-file.md` — and is the third task of this step.

## Your task

Pull the file, set `display.brightness = 40`, push, reload on the board, and pull again — the first check verifies the round trip, not your good intentions. Then answer the two questions: which of the three named keys does not take effect live, and what a truncated file degrades to. The next step moves from runtime configuration to build-time feature selection.
