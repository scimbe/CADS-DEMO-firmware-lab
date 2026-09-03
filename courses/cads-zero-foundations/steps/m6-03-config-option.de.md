---
id: m6-03-config-option
title: Eine Einstellung am laufenden Board ändern
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
    title: Pushe display.brightness = 40 und hole die Datei zurück
    check: { type: command, cwd: ".", command: "grep -nE '^[[:space:]]*display[.]brightness[[:space:]]*=[[:space:]]*40[[:space:]]*$' config.txt", expectExitCode: 0, bloom: apply }
  - id: not-live
    title: Welcher Schlüssel nicht live wirkt
    check: { type: question, prompt: { en: "Of display.brightness, net.ip and wifi.ssid, which one does Reload config not put into effect?", de: "Welcher der Schlüssel display.brightness, net.ip und wifi.ssid wirkt nach Reload config nicht?" }, rubric: "wifi.ssid. display.* und net.* werden von Reload config angewendet - die Netzadresse sofort bei aktivem Link, sonst beim nächsten Link-up. wifi.ssid und wifi.password aktualisieren nur, was ein späteres Settings-Join-WiFi benutzen würde; Reload allein löst keinen Join aus. Die Antwort braucht diese Begründung, nicht nur den Namen des Schlüssels.", bloom: apply }
  - id: truncated
    title: Wozu eine abgeschnittene Datei degradiert
    check: { type: question, prompt: { en: "Your editor left config.txt truncated half way. What state is the board in after the next boot?", de: "Dein Editor hat config.txt zur Hälfte abgeschnitten. In welchem Zustand ist das Board nach dem nächsten Boot?" }, rubric: "Defaults plus dem, was geparst wurde. Der Parser überspringt unbekannte Schlüssel, lässt fehlende auf ihrem eingebauten Default und behält bei einem fehlerhaften Wert - etwa einer unvollständigen IP - den vorherigen. Es entsteht nie ein Müllzustand und nie eine Struktur voller Nullen. Bestanden nur, wenn alle drei Fälle unterschieden werden.", bloom: apply }
socratic:
  - { trigger: "task:applied:failed", question: { en: "You pushed the file, but a fresh pull shows the old value. Did anything actually re-read the file, and did the board write over your push?", de: "Du hast die Datei gepusht, aber ein frischer Pull zeigt den alten Wert. Hat überhaupt etwas die Datei neu gelesen, und hat das Board deinen Push überschrieben?" }, hints: [ { en: "A push changes flash, not the running configuration - the file is read at boot and on one explicit menu action.", de: "Ein Push ändert das Flash, nicht die laufende Konfiguration - die Datei wird beim Booten und bei einer expliziten Menüaktion gelesen." }, { en: "The check reads your local config.txt, so pull once more after the reload to see what the board actually holds.", de: "Der Check liest deine lokale config.txt, hol sie also nach dem Reload noch einmal, um zu sehen, was das Board wirklich hält." }, { en: "The value the check wants is the one named in the task text; a different brightness is a correct edit but not the one being verified.", de: "Der Wert, den der Check erwartet, ist der im Aufgabentext genannte; eine andere Helligkeit ist eine korrekte Änderung, aber nicht die geprüfte." } ] }
  - { trigger: "question:not-live:weak", question: { en: "Reload config re-reads the file. Which of the three keys describes something the board only does when you ask it to?", de: "Reload config liest die Datei neu. Welcher der drei Schlüssel beschreibt etwas, das das Board nur auf Aufforderung tut?" }, hints: [ { en: "Two of the three describe a state the firmware can simply adopt; the third describes an action it would have to perform.", de: "Zwei der drei beschreiben einen Zustand, den die Firmware einfach übernehmen kann; der dritte beschreibt eine Handlung, die sie ausführen müsste." }, { en: "docs/reference/config-file.md lists, per key, when it takes effect; read the wifi block especially.", de: "docs/reference/config-file.md nennt je Schlüssel, wann er wirkt; lies besonders den wifi-Block." }, { en: "Your answer needs the reason as well: say what a reload does with that key instead of applying it.", de: "Deine Antwort braucht auch den Grund: sag, was ein Reload mit diesem Schlüssel tut, statt ihn anzuwenden." } ] }
  - { trigger: "question:truncated:weak", question: { en: "The parser reads line by line and stops where the file stops. What does it have for the keys it never reached?", de: "Der Parser liest Zeile für Zeile und hört auf, wo die Datei aufhört. Was hat er für die Schlüssel, die er nie erreicht hat?" }, hints: [ { en: "Three separate rules cover the three ways a key can be broken: unknown, missing, malformed.", de: "Drei getrennte Regeln decken die drei Arten ab, auf die ein Schlüssel kaputt sein kann: unbekannt, fehlend, fehlerhaft." }, { en: "docs/reference/config-file.md states all three; the interesting one is what happens to a value that parses but is nonsense.", de: "docs/reference/config-file.md nennt alle drei; die interessante ist, was mit einem Wert geschieht, der parst, aber Unsinn ist." }, { en: "State the resulting configuration as a formula, not as a mood - the answer is a combination of two sources.", de: "Formuliere die entstehende Konfiguration als Formel, nicht als Stimmung - die Antwort ist eine Kombination aus zwei Quellen." } ] }
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

Für den Check dieses Steps nimm die sichtbare Variante: setze `display.brightness = 40`, pushe, lade auf dem Board neu und hole die Datei danach **noch einmal**. Der Check liest deine lokale `config.txt` — steht dort nach dem zweiten Pull `40`, hat der Wert wirklich den Weg über das Volume und zurück genommen. Wer will, übt denselben Mechanismus zusätzlich an `net.ip` (Adresse frei im selben `/24`, danach `192.168.33.99` wiederherstellen, damit M7 zum Tutorial passt).

## Was „live" genau umfasst

Reload config liest die Datei neu und wendet an, was sich anwenden lässt. Genau da liegt die Feinheit: manche Schlüssel beschreiben einen **Zustand**, den die Firmware einfach übernehmen kann, andere beschreiben eine **Handlung**, die sie ausführen müsste. `docs/reference/config-file.md` nennt je Schlüssel, wann er wirkt; der `wifi`-Block ist die Stelle, an der sich die beiden Sorten trennen.

`boot.autostart` ist der klare Fall der anderen Art: er wird naturgemäß nur beim Booten gelesen, weil er entscheidet, wohin der Boot geht.

## Warum eine halb geschriebene Datei keine Katastrophe ist

`push` liest das ganze Volume, ändert eine Datei und schreibt alles zurück. Schreibt das Board dazwischen seinen eigenen Speicher — eine Kalibrierungs-Speicherung, ein Konfigurationsschreiben vom Panel — geht dieser Schreibvorgang verloren. Bearbeite also, während das Board im Leerlauf ist; direkt nach einem Reset ist der sichere Moment.

Und lässt dein Editor die Datei abgeschnitten zurück, passiert nichts Dramatisches. Der Parser wurde ausdrücklich für den unterbrochenen Edit über einen Debug-Link entworfen und behandelt einen unbekannten, einen fehlenden und einen fehlerhaften Schlüssel jeweils anders. Welche drei Regeln das sind und was für eine Konfiguration daraus insgesamt entsteht, steht in `docs/reference/config-file.md` — und ist die dritte Aufgabe dieses Steps.

## Deine Aufgabe

Hole die Datei, setze `display.brightness = 40`, pushe, lade auf dem Board neu und hole sie erneut — der erste Check prüft die Rundreise, nicht deinen guten Willen. Beantworte dann die zwei Fragen: welcher der drei genannten Schlüssel nicht live wirkt, und wozu eine abgeschnittene Datei degradiert. Der nächste Step geht von der Laufzeitkonfiguration zur Feature-Auswahl beim Bauen über.
