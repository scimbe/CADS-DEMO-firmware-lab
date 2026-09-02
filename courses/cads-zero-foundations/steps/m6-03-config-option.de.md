---
id: m6-03-config-option
title: Eine Einstellung am laufenden Board ändern
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
    title: Pushe eine geänderte config.txt und lade sie auf dem Board neu
    check: { type: manual }
  - id: live-vs-reboot
    title: Welche Änderungen wirken live, und wozu eine kaputte Datei degradiert
    check: { type: question, prompt: { en: "You pushed a config.txt that changes display.brightness, net.ip and wifi.ssid, and then chose Settings -> Reload config. Which of these take effect immediately, which do not, and why? Then: your editor truncated the file half way - what state is the board in after the next boot?", de: "Du hast eine config.txt gepusht, die display.brightness, net.ip und wifi.ssid ändert, und dann Settings -> Reload config gewählt. Welche davon wirken sofort, welche nicht, und warum? Und: dein Editor hat die Datei zur Hälfte abgeschnitten - in welchem Zustand ist das Board nach dem nächsten Boot?" }, rubric: "display.* und net.* werden von Reload config live angewendet (Netzadresse sofort bei aktivem Link, sonst beim nächsten Link-up); wifi.ssid/wifi.password aktualisieren nur, was ein späteres Settings -> Join WiFi nutzt - Reload allein löst keinen Join aus. Eine abgeschnittene Datei degradiert zu Defaults plus dem, was geparst wurde: unbekannte Schlüssel übersprungen, fehlende behalten Defaults, eine fehlerhafte IP behält den vorherigen Wert - nie ein Müllzustand.", bloom: apply }
socratic:
  - { trigger: "task:applied:failed", question: { en: "You pushed the file, but the board still shows the old value. Did anything actually re-read /config.txt after the push?", de: "Du hast die Datei gepusht, aber das Board zeigt noch den alten Wert. Hat überhaupt etwas /config.txt nach dem Push neu gelesen?" }, hints: [ { en: "The file is read at boot and on one explicit menu action - a push alone changes flash, not the running configuration.", de: "Die Datei wird beim Booten und bei einer expliziten Menüaktion gelesen - ein Push allein ändert das Flash, nicht die laufende Konfiguration." }, { en: "Open Settings -> Reload config on the panel (board_key.py can navigate there), or power-cycle the board.", de: "Öffne Settings -> Reload config auf dem Panel (board_key.py kann dorthin navigieren) oder schalte das Board aus und ein." }, { en: "If the value still does not change, pull the file again: a push done while the board was writing its own storage may have been overwritten by the board's live volume.", de: "Ändert sich der Wert weiterhin nicht, hole die Datei erneut: ein Push, während das Board seinen eigenen Speicher schrieb, kann vom Live-Volume des Boards überschrieben worden sein." } ] }
---
## Lernziel

Ändere eine Einstellung eines laufenden Boards von deinem Rechner aus, wende sie ohne Neustart an und wisse genau, welche Schlüssel sich so verhalten.

## Zwei Wege, ein laufendes Board zu ändern

Der schnelle Weg braucht gar keine Host-Werkzeuge: **Settings** auf dem Panel ändert **Brightness** oder **SPI clock** direkt und speichert die in `/config.txt` hinterlegten dauerhaft. Der Weg, den du hier übst, ist der für alles, wofür das Panel kein Bedienelement hat — die Netzwerkadresse, mehrere Einstellungen auf einmal oder eine Konfiguration, die du unter Versionskontrolle haben willst (`docs/how-to/configure.md`):

```bash
scripts/cads_config.py pull            # -> ./config.txt
$EDITOR config.txt
scripts/cads_config.py push config.txt
```

Dann auf dem Board **Settings → Reload config**. Es meldet `Re-reading /config.txt and applying it.`, und die Änderung wirkt kurz darauf auf der Konsolen-Task. Ein Aus- und Einschalten funktioniert ebenfalls, weil die Datei beim Booten gelesen wird.

## Eine statische Adresse als durchgerechnetes Beispiel

Die Ethernet-Übungen des Labors in M7 setzen die voreingestellte statische Adressierung voraus. Übe den Mechanismus jetzt daran:

```ini
net.dhcp = 0
net.ip = 192.168.33.99
net.netmask = 255.255.255.0
net.gateway = 192.168.33.1
```

Ändere `net.ip` auf eine andere freie Adresse im selben `/24` (oder, wenn du eine sichtbare Änderung bevorzugst, setze `display.brightness = 40`), pushe, lade neu. Die Adresse wird dem netif sofort zugewiesen, wenn der Link aktiv ist, sonst beim nächsten Link-up. Stelle anschließend `192.168.33.99` wieder her, damit M7 zum Tutorial passt.

## Was „live" genau umfasst

`display.*`, `net.*` und `wifi.*` werden alle von Reload config angewendet, und einmal beim Start. Zwei Feinheiten sind wichtig (`docs/reference/config-file.md`):

- `wifi.ssid` / `wifi.password` wirken erst, wenn **Settings → Join WiFi** tatsächlich ausgewählt wird — Reload allein aktualisiert nur, was ein späterer Join nutzen würde, es löst keinen aus.
- `wifi.pcap_target` wirkt sofort; das Marauder-Relay liest es bei jedem Reload neu.

`boot.autostart` wird naturgemäß nur beim Booten gelesen: es entscheidet, wohin der Boot geht.

## Warum eine halb geschriebene Datei keine Katastrophe ist

`push` liest das ganze Volume, ändert eine Datei und schreibt alles zurück. Schreibt das Board dazwischen seinen eigenen Speicher — eine Kalibrierungs-Speicherung, ein Konfigurationsschreiben vom Panel — geht dieser Schreibvorgang verloren. Bearbeite also, während das Board im Leerlauf ist; direkt nach einem Reset ist der sichere Moment.

Und lässt dein Editor die Datei abgeschnitten zurück, passiert nichts Dramatisches: unbekannte Schlüssel werden übersprungen, fehlende behalten ihre Defaults, eine fehlerhafte IP behält den vorherigen Wert. Der Parser wurde so entworfen, dass ein unterbrochener Edit über einen Debug-Link zu „Defaults plus was geparst wurde" degradiert.

## Deine Aufgabe

Hole, ändere einen Schlüssel, pushe und lade auf dem Board neu; bestätige den neuen Wert auf dem Panel oder, bei der Adresse, über den Netzstatus der Konsole. Beantworte dann die Frage, was live wirkt und wozu eine abgeschnittene Datei degradiert. Der nächste Step geht von der Laufzeitkonfiguration zur Feature-Auswahl beim Bauen über.
