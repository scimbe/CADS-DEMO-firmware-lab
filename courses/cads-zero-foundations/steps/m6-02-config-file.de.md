---
id: m6-02-config-file
title: Die Konfigurationsdatei
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
    title: Hole die config.txt des Boards und lies sie
    check: { type: manual }
  - id: why-text
    title: Erkläre das Format und den Bearbeitungsmechanismus
    check: { type: question, prompt: { en: "The firmware already had a binary key-value store for touch calibration. Why is /config.txt a plain text file instead, and how does cads_config.py change it on a board that exposes no USB drive - without reflashing the firmware?", de: "Die Firmware hatte bereits einen binären Key-Value-Speicher für die Touch-Kalibrierung. Warum ist /config.txt stattdessen eine Klartextdatei, und wie ändert cads_config.py sie auf einem Board ohne USB-Laufwerk - ohne die Firmware neu zu flashen?" }, rubric: "Text, weil ein Mensch sie bearbeitet und die Grammatik unvollständige Dateien toleriert (unbekannter Schlüssel übersprungen, fehlender Schlüssel behält Default, fehlerhafte IP behält vorherigen Wert); Kalibrierung bleibt im kv-Speicher, weil ihre rohen ADC-Werte nie von Hand bearbeitet werden. Mechanismus: littlefs-Volume (Bank 2, 0x08120000, 896 KB) über SWD mit st-flash auslesen, eine Datei im Image mit cads_fs ändern (aus denselben littlefs-Quellen gebaut wie die Firmware), Volume zurückschreiben - nur die Dateisystem-Region wird berührt.", bloom: apply }
socratic:
  - { trigger: "task:pulled:failed", question: { en: "cads_config.py needs a host-side helper before it can open the dumped image. Which binary is that, and where does it come from?", de: "cads_config.py braucht einen Host-Helfer, bevor es das ausgelesene Image öffnen kann. Welches Binary ist das, und woher kommt es?" }, hints: [ { en: "The helper is cads_fs, and it is built from the host preset, not the board build.", de: "Der Helfer ist cads_fs, und er wird aus dem Host-Preset gebaut, nicht aus dem Board-Build." }, { en: "Run the CaDS: Host tests task (or cmake --build build/host --target cads_fs) so build/host/cads_fs exists.", de: "Führe den Task CaDS: Host tests aus (oder cmake --build build/host --target cads_fs), damit build/host/cads_fs existiert." }, { en: "If the pull still fails, the board must be idle and connected over SWD - a live debug session holds the probe.", de: "Schlägt der Pull weiterhin fehl, muss das Board im Leerlauf und über SWD verbunden sein - eine laufende Debug-Sitzung hält die Probe." } ] }
---
## Lernziel

Lies die eine Datei, über die ein laufendes Board konfiguriert wird, und verstehe, wie du sie von deinem Rechner aus bearbeiten kannst, obwohl das Board kein USB-Laufwerk hat.

## Eine Textdatei auf dem Volume

`/config.txt` ist eine einfache `key = value`-Datei im littlefs-Volume. Die Firmware liest sie beim Booten; fehlt sie, schreibt sie die eingebauten Defaults, damit die Datei immer zum Bearbeiten existiert. `#` beginnt einen Kommentar, Leerzeilen werden ignoriert, Leerraum wird abgeschnitten. Die Basisversion (`docs/reference/config-file.md`):

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

dazu ein `wifi.*`-Block für den ESP32-Coprozessor. Booleans akzeptieren `1`/`0`, `on`/`off`, `true`/`false`, `yes`/`no`; IPv4-Werte sind dotted decimal, und ein fehlerhafter wird verworfen, sodass der Schlüssel seinen vorherigen Wert behält.

## Warum Text, wenn es schon einen Binärspeicher gab

Die `kv`-Tabelle aus `cads/storage` sicherte bereits die Touch-Kalibrierung. Sie wurde bewusst **nicht** für die Konfiguration wiederverwendet (`docs/explanation/config-design.md`): Der ganze Sinn der Konfigurationsdatei ist, dass ein Mensch sie bearbeitet, und eine Binärtabelle ist nicht von Hand editierbar. Die Trennung folgt dem Publikum — die Kalibrierung bleibt im `kv`-Speicher, weil ihre rohen XPT2046-ADC-Werte für einen Menschen nichts bedeuten und durch ein Tippen erzeugt, nie getippt werden.

Die Textgrammatik zahlt sich in Robustheit aus: ein unbekannter Schlüssel wird übersprungen, ein fehlender behält seinen Default, ein fehlerhafter Wert lässt den vorherigen intakt. Eine von Hand abgeschnittene Datei — das normale Ergebnis eines unterbrochenen Edits über den Debug-Link — degradiert zu „Defaults plus was geparst wurde", nie zu einer Struktur voller Nullen.

## Bearbeiten ohne Laufwerk

Das Board bietet keinen USB-Massenspeicher; sein Dateisystem ist nur über SWD erreichbar. `scripts/cads_config.py` tut deshalb das praktische Äquivalent zum Einhängen:

1. **Auslesen** des littlefs-Volumes (Bank 2, `0x08120000`, 896 KB) mit `st-flash read`;
2. **eine Datei ändern** im Image mit `cads_fs`, einem Host-Werkzeug, das aus *denselben* `cads/storage`- und littlefs-Quellen gebaut ist, die die Firmware linkt — das Format auf dem Datenträger kann also nicht auseinanderdriften;
3. **Volume zurückschreiben**. Die Firmware wird nie neu geflasht; nur die Dateisystem-Region ändert sich.

```bash
scripts/cads_config.py pull            # -> ./config.txt
scripts/cads_config.py edit            # pull, $EDITOR, push bei Änderung
scripts/cads_config.py push config.txt
```

`cads_fs` stammt aus dem Host-Build (`build/host/cads_fs`) — deshalb hat M0 beide Targets gebaut. Eine Vorsicht: `push` schreibt das ganze Volume zurück, also tu es, während das Board im Leerlauf ist — direkt nach einem Reset ist der sichere Moment — sonst wird eine Kalibrierung, die das Board zwischendurch gespeichert hat, überschrieben.

## Deine Aufgabe

Hole die `config.txt` des Boards und lies jeden Schlüssel gegen die Referenz. Beantworte dann die Frage, warum das Format Text ist und wie der Edit das Board erreicht. Der nächste Step ändert einen Wert und wendet ihn live an.
