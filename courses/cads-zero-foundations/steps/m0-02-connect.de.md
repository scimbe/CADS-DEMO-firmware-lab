---
id: m0-02-connect
title: Das Board verbinden
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
    title: Das Board meldet sich als verbunden
    check: { type: board, state: connected }
  - id: probe-identity
    title: Erkläre, was die eine Verbindung trägt
    check: { type: question, prompt: { en: "The debugger halts the board, but the console window stays silent. Can an unplugged USB cable be the cause?", de: "Der Debugger hält das Board an, aber im Konsolenfenster bleibt es still. Kann ein abgezogenes USB-Kabel die Ursache sein?" }, rubric: "Nein — und die Begründung zählt: Debug- und Flash-Zugriff (SWD) und die serielle Konsole (virtueller COM-Port an USART3) laufen über dieselbe Probe und dasselbe Kabel. Solange der Debugger das Board anhält, steckt das Kabel nachweislich. Die Antwort muss die gemeinsame Leitung als Begründung nennen und die Ursache anderswo suchen, etwa falscher serieller Port, Konsole nicht geöffnet, Firmware sendet nichts.", bloom: understand }
socratic:
  - { trigger: "task:connected:failed", question: { en: "Did a device chooser open at all, and did you pick something in it?", de: "Ging überhaupt ein Geräte-Dialog auf, und hast du darin etwas ausgewählt?" }, hints: [ { en: "Most often it is not the board: the chooser never opened, or it was closed without a choice.", de: "Meistens liegt es nicht am Board: der Geräte-Dialog ging nie auf, oder er wurde ohne Auswahl geschlossen." }, { en: "Open the command palette with F1, type CaDS Board: Verbinden and run the entry; the chooser then comes from the browser, not from the IDE — look at the top edge of the browser window.", de: "Öffne die Befehlspalette mit F1, tippe „CaDS Board: Verbinden“ und führe den Eintrag aus; der Dialog kommt danach vom Browser, nicht von der Umgebung — sieh am oberen Rand des Browserfensters nach." }, { en: "The chooser only lists devices with vendor id 0x0483. If the list stays empty, the browser does not hear the cable at all: another USB port, a cable that carries data wires, then run the command again. What the bridge currently sees is printed by CaDS Board: Status (JSON).", de: "Der Dialog listet nur Geräte mit der Vendor-ID 0x0483. Bleibt die Liste leer, hört der Browser das Kabel gar nicht: anderer USB-Anschluss, ein Kabel mit Datenadern, dann den Befehl erneut. Was die Bridge gerade sieht, druckt „CaDS Board: Status (JSON)“." } ] }
  - { trigger: "question:probe-identity:weak", question: { en: "Count the cables first: how many plugs join the board and your computer?", de: "Zähl zuerst die Kabel: wie viele Stecker verbinden Board und Rechner?" }, hints: [ { en: "The most common wrong assumption is that debugger and console take separate paths. Test that assumption before you answer.", de: "Die häufigste falsche Annahme ist, dass Debugger und Konsole getrennte Wege nehmen. Prüf diese Annahme, bevor du antwortest." }, { en: "The section One probe, two jobs above numbers exactly two services. Read both items and match each to something the lab does.", de: "Der Abschnitt „Eine Probe, zwei Aufgaben“ weiter oben nummeriert genau zwei Dienste. Lies beide Punkte und ordne jedem eine Tätigkeit im Labor zu." }, { en: "If the debugger is working, the wire is demonstrably there. So the question is not whether something is plugged in, but which of the two services is silent.", de: "Wenn der Debugger arbeitet, ist die Leitung nachweislich da. Die Frage ist also nicht, ob etwas steckt, sondern welcher der beiden Dienste gerade schweigt." } ] }
---
## Lernziel

Bringe das Board dazu, vom Labor erkannt zu werden, und verstehe, was die eine USB-Verbindung zwischen deinem Rechner und dem Board tatsächlich trägt.

## Wo du das machst

Für das Verbinden gibt es keinen Knopf im Fenster. Der Befehl liegt in der **Befehlspalette** — der Eingabezeile, über die diese Umgebung jeden ihrer Befehle anbietet:

1. Drücke `F1` (oder `Strg`/`Cmd`+`Shift`+`P`). Oben in der Mitte des Fensters klappt eine Eingabezeile auf.
2. Tippe `CaDS Board: Verbinden`. Der vollständige Eintrag heißt **CaDS Board: Verbinden (USB/Serial freigeben)**; sobald er in der Liste steht, wähle ihn mit `Enter`.
3. Jetzt fragt **der Browser**, nicht die Umgebung: am oberen Rand des Browserfensters erscheint ein Auswahldialog mit den angeschlossenen USB-Geräten. Diesen Dialog stellt der Browser selbst, deshalb sieht er auf jedem Rechner ein wenig anders aus.
4. Wähle darin die ST-Link aus und bestätige.

**Woran du erkennst, dass es geklappt hat:** Scroll in diesem Panel nach unten zur ersten Aufgabe und drücke **Prüfen**. Der Check fragt das Labor, ob eine Probe verbunden ist, und wird grün, wenn ja. Zwei weitere Befehle derselben Palette helfen beim Nachsehen: **CaDS Board: Status (JSON)** druckt den Verbindungszustand als Text, **CaDS Board: Log anzeigen** das Protokoll der **Bridge** — so heißt das Vermittlungsstück im Container, das die im Browser hergestellte Verbindung an die Werkzeuge weiterreicht.

## Eine Probe, zwei Aufgaben

Das NUCLEO-F429ZI hat eine **fest aufgelötete ST-Link/V2-1-Debug-Probe**. Eine *Debug-Probe* ist ein kleines Stück Hardware, das einen fremden Chip von außen steuert und ausliest — anhalten, Speicher lesen, ein Programm hineinschreiben. Hier steckt sie nicht in einem eigenen Gehäuse, sondern sitzt auf derselben Platine. Diese eine Probe erledigt über ein einziges USB-Kabel zwei getrennte Dinge:

1. **SWD** — *Serial Wire Debug*, eine Schnittstelle mit nur zwei Leitungen (`SWDIO` an PA13, `SWCLK` an PA14), über die der Chip von außen steuerbar ist. Alles, was flasht, anhält, schrittweise ausführt oder Speicher liest, läuft hierüber.
2. **Ein virtueller COM-Port** — die **USART3** des STM32 (eine der seriellen Sendeeinheiten im Chip: sie schiebt Zeichen einzeln nacheinander über eine Leitung) wird auf ein USB-Serial-Gerät gebrückt. Dein Rechner zeigt daraufhin eine serielle Schnittstelle an, obwohl physisch nur USB da ist — daher *virtuell*. Die Konsole der Firmware erscheint dort mit **115200 Baud, 8N1**: 115200 Symbole je Sekunde, 8 Datenbits, keine Parität, 1 Stoppbit. Beide Seiten müssen dieselbe Einstellung benutzen, sonst kommt nur Zeichensalat an.

„Das Board verbinden“ heißt also, dem Browser die Erlaubnis zu geben, mit dieser Probe zu sprechen. Der Dialog filtert auf die **Vendor-ID** `0x0483` von STMicroelectronics — die Nummer, mit der sich ein USB-Gerät als Produkt seines Herstellers ausweist. Das `0x` davor heißt: die Zahl ist hexadezimal geschrieben, also im Sechzehnersystem; wie man das liest, führt M2 in Ruhe ein. Wähle die ST-Link, und ab dann erreicht die Bridge sie ohne erneutes Nachfragen, auch über ein Aus- und Wiedereinstecken hinweg.

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

Verbinde das Board über die Befehlspalette, bis der erste Check grün wird. Beantworte dann die Frage dazu, was diese eine Verbindung trägt. Ist verbunden, baut der nächste Step die Firmware.
