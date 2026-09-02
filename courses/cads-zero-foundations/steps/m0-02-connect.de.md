---
id: m0-02-connect
title: Das Board verbinden
bloom: understand
objectives: [firmware-hardware]
requires: [m0-01-welcome]
estimatedMinutes: 10
links:
  - { step: m0-03-build }
  - { doc: "docs/how-to/flash.md" }
  - { file: "scripts/cads_env.sh", line: 28 }
sources: [docs/HARDWARE.md, docs/how-to/flash.md, docs/reference/explorer-console.md]
tasks:
  - id: connected
    title: Das Board meldet sich als verbunden
    check: { type: board, state: connected }
  - id: probe-identity
    title: Was die Probe ist und was sie trägt
    check: { type: question, prompt: { en: "The board connects to your computer over one debug probe. What is that probe, what two roles does it play, and what is the fixed serial number this repository is developed against?", de: "Das Board verbindet sich über eine Debug-Probe mit deinem Rechner. Was ist diese Probe, welche zwei Rollen spielt sie, und welche feste Seriennummer ist im Repository hinterlegt?" }, rubric: "Nennt die integrierte ST-Link/V2-1, dass sie sowohl SWD-Debugzugriff als auch den USART3-VCP (serielle Konsole) bereitstellt, und die Seriennummer 066FFF565282494867161033.", bloom: understand }
socratic:
  - { trigger: "task:connected:failed", question: { en: "When you asked the browser to share a device, which vendor did the chooser filter for, and did you pick the ST-Link rather than another USB device?", de: "Als der Browser dich um die Gerätefreigabe bat, nach welchem Hersteller filterte der Dialog, und hast du die ST-Link statt eines anderen USB-Geräts gewählt?" }, hints: [ { en: "The chooser filters on vendor id 0x0483 (STMicroelectronics).", de: "Der Dialog filtert auf Vendor-ID 0x0483 (STMicroelectronics)." }, { en: "Pick the device whose serial matches 066FFF565282494867161033.", de: "Wähle das Gerät, dessen Seriennummer 066FFF565282494867161033 lautet." }, { en: "If nothing appears, replug the ST-Link and re-run the Connect command, then retry the chooser.", de: "Erscheint nichts, stecke die ST-Link neu ein, führe den Connect-Befehl erneut aus und öffne den Dialog nochmals." } ] }
---
## Lernziel

Bringe das Board dazu, vom Labor erkannt zu werden, und verstehe, was die eine USB-Verbindung zwischen deinem Rechner und dem Board tatsächlich trägt.

## Eine Probe, zwei Aufgaben

Das NUCLEO-F429ZI hat eine **fest aufgelötete ST-Link/V2-1-Debug-Probe**. Diese eine Probe erledigt über ein einziges USB-Kabel zwei getrennte Dinge:

1. **SWD** — die zweidrahtige Serial-Wire-Debug-Schnittstelle (`SWDIO` an PA13, `SWCLK` an PA14). Alles, was flasht, anhält, schrittweise ausführt oder Speicher liest, läuft hierüber.
2. **Ein virtueller COM-Port** — die USART3 des STM32 wird auf ein USB-Serial-Gerät gebrückt, sodass die Konsole der Firmware auf deinem Rechner mit 115200 Baud, 8N1 erscheint.

„Das Board verbinden" heißt also, dem Browser die Erlaubnis zu geben, mit dieser Probe zu sprechen. Der Connect-Befehl öffnet den nativen Geräte-Dialog; er filtert auf die Vendor-ID `0x0483` von STMicroelectronics. Wähle die ST-Link, und ab dann erreicht die Bridge sie ohne erneutes Nachfragen, auch über ein Aus- und Wiedereinstecken hinweg.

## Das Board, das dieses Repository kennt

Die Probe des Referenzboards hat eine feste Seriennummer, `066FFF565282494867161033` (`docs/HARDWARE.md`; `scripts/cads_env.sh` exportiert sie als `CADS_STLINK_SERIAL`). Das Flash- und Debug-Werkzeug wählt genau diese Probe als Standard, sodass bei mehreren ST-Links die richtige getroffen wird. `st-info --probe` meldet dieselbe Identität:

```
serial:     066FFF565282494867161033
chipid:     0x419          -> STM32F42x/F43x
flash:      2097152 (pagesize: 16384)
```

## Warum das Board an deinem Rechner hängt, nicht am Server

Die IDE läuft in einem Container, aber das Board hängt an deinem eigenen Rechner. Serverseitiges USB-Passthrough wäre die falsche Architektur — das Board ist nicht am Server — deshalb wird die Verbindung in deinem Browser hergestellt und an die Bridge im Container weitergereicht. Darum klickst du, nicht ein Administrator, den Dialog.

## Deine Aufgabe

Verbinde das Board mit dem Connect-Befehl, sodass es als verbunden gemeldet wird, und beantworte dann eine Frage dazu, was die ST-Link ist und trägt. Ist verbunden, baut der nächste Step die Firmware.
