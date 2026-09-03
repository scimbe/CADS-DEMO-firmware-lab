---
id: m6-02-config-file
title: The configuration file
bloom: apply
objectives: [cz.storage.config]
requires: [m6-01-littlefs]
estimatedMinutes: 15
links:
  - { step: m6-03-config-option }
  - { doc: "docs/reference/config-file.md" }
  - { doc: "docs/how-to/configure.md" }
  - { file: "scripts/cads_config.py", line: 1 }
sources: [docs/reference/config-file.md, docs/how-to/configure.md, scripts/cads_config.py, docs/explanation/config-design.md]
tasks:
  - id: pulled
    title: Pull the board's config.txt and read it
    check: { type: manual }
  - id: why-text
    title: Explain the format and the editing mechanism
    check: { type: question, prompt: { en: "The firmware already had a binary key-value store for touch calibration. Why is /config.txt a plain text file instead, and how does cads_config.py change it on a board that exposes no USB drive - without reflashing the firmware?", de: "Die Firmware hatte bereits einen binären Key-Value-Speicher für die Touch-Kalibrierung. Warum ist /config.txt stattdessen eine Klartextdatei, und wie ändert cads_config.py sie auf einem Board ohne USB-Laufwerk - ohne die Firmware neu zu flashen?" }, rubric: "Text because a human edits it and the grammar tolerates partial files (unknown key skipped, omitted key keeps default, malformed IP keeps previous value); calibration stays in kv because its raw ADC counts are never hand-edited. Mechanism: dump the littlefs volume (bank 2, 0x08120000, 896 KB) over SWD with st-flash, change one file inside the image with cads_fs (built from the same littlefs sources the firmware uses), write the volume back - only the filesystem region is touched.", bloom: apply }
socratic:
  - { trigger: "task:pulled:failed", question: { en: "cads_config.py needs a host-side helper before it can open the dumped image. Which binary is that, and where does it come from?", de: "cads_config.py braucht einen Host-Helfer, bevor es das ausgelesene Image öffnen kann. Welches Binary ist das, und woher kommt es?" }, hints: [ { en: "The helper is cads_fs, and it is built from the host preset, not the board build.", de: "Der Helfer ist cads_fs, und er wird aus dem Host-Preset gebaut, nicht aus dem Board-Build." }, { en: "Run the CaDS: Host tests task (or cmake --build build/host --target cads_fs) so build/host/cads_fs exists.", de: "Führe den Task CaDS: Host tests aus (oder cmake --build build/host --target cads_fs), damit build/host/cads_fs existiert." }, { en: "If the pull still fails, the board must be idle and connected over SWD - a live debug session holds the probe.", de: "Schlägt der Pull weiterhin fehl, muss das Board im Leerlauf und über SWD verbunden sein - eine laufende Debug-Sitzung hält die Probe." } ] }
---
## Learning goal

Read the one file a running board is configured by, and understand how you can edit it from your computer even though the board has no USB drive.

## One text file on the volume

`/config.txt` is a plain `key = value` file inside the littlefs volume. The firmware reads it at boot; if it is missing, it writes the built-in defaults so the file always exists to edit. `#` starts a comment, blank lines are ignored, whitespace is trimmed. The base version (`docs/reference/config-file.md`):

```ini
# boot
boot.autostart = 1

# display
display.brightness = 80
display.fast_clock = 0

# network
net.dhcp = 0
net.ip = 192.168.33.99
net.netmask = 255.255.255.0
net.gateway = 192.168.33.1
net.mac_random = 0
```

plus a `wifi.*` block for the ESP32 co-processor. Booleans accept `1`/`0`, `on`/`off`, `true`/`false`, `yes`/`no`; IPv4 values are dotted decimal, and a malformed one is rejected so the key keeps its previous value.

## Why text, when a binary store already existed

`cads/storage`'s `kv` table already persisted touch calibration. It was deliberately **not** reused for configuration (`docs/explanation/config-design.md`): the whole point of the config file is that a person edits it, and a binary table is not hand-editable. The split follows the audience — calibration stays in `kv` because its raw XPT2046 ADC counts mean nothing to a human and are produced by a tap, never typed.

The text grammar pays for itself in robustness: an unknown key is skipped, an omitted key keeps its default, a malformed value leaves the previous one intact. A hand-truncated file — the normal outcome of an interrupted edit over a debug link — degrades to "defaults plus whatever parsed", never to a struct full of zeros.

## Editing without a drive

The board exposes no USB mass storage; its filesystem is reachable only over SWD. So `scripts/cads_config.py` does the practical equivalent of mounting it:

1. **dump** the littlefs volume (bank 2, `0x08120000`, 896 KB) with `st-flash read`;
2. **change one file** inside the image with `cads_fs`, a host tool built from the *same* `cads/storage` and littlefs sources the firmware links — so the on-disk format cannot drift;
3. **write the volume back**. The firmware is never reflashed; only the filesystem region changes.

```bash
scripts/cads_config.py pull            # -> ./config.txt
scripts/cads_config.py edit            # pull, $EDITOR, push if changed
scripts/cads_config.py push config.txt
```

`cads_fs` comes from the host build (`build/host/cads_fs`), which is why M0 built both targets. One caution: `push` writes the whole volume back, so do it while the board is idle — right after a reset is the safe moment — or a calibration save the board made in between is overwritten.

## Your task

Pull the board's `config.txt` and read every key against the reference. Then answer the question on why the format is text and how the edit reaches the board. The next step changes a value and applies it live.
