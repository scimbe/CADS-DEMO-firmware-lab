---
id: m6-02-config-file
title: Die Konfigurationsdatei
bloom: apply
objectives: [cz.storage.config]
requires: [m6-01-littlefs]
estimatedMinutes: 15
scaffold: faded
links:
  - { step: m6-03-config-option }
  - { doc: "docs/reference/config-file.md" }
  - { doc: "docs/how-to/configure.md" }
  - { file: "scripts/cads_config.py", line: 1 }
sources: [docs/reference/config-file.md, docs/how-to/configure.md, scripts/cads_config.py, docs/explanation/config-design.md, modules/config/src/cads_config.c]
misconceptions:
  - { pattern: "cads_fs did not build", question: { en: "The host helper is missing. Which of the two builds produces it, and did you run that one?", de: "Der Host-Helfer fehlt. Welcher der beiden Builds erzeugt ihn, und hast du den ausgeführt?" }, hints: [ { en: "cads_fs is a host tool, not part of the board image; the board build never produces it.", de: "cads_fs ist ein Host-Werkzeug und nicht Teil des Board-Images; der Board-Build erzeugt es nie." }, { en: "The CaDS: Host tests task configures the host preset, which is where the tool ends up.", de: "Der Task CaDS: Host tests konfiguriert das Host-Preset, und dort landet das Werkzeug." }, { en: "Check that build/host exists and holds the binary before blaming the probe or the board.", de: "Prüf, ob build/host existiert und das Binary enthält, bevor du Probe oder Board verdächtigst." } ] }
  - { pattern: "st-flash not found on PATH", question: { en: "The volume is only reachable over SWD. Which host tool actually moves the bytes, and is it installed?", de: "Das Volume ist nur über SWD erreichbar. Welches Host-Werkzeug bewegt die Bytes tatsächlich, und ist es installiert?" }, hints: [ { en: "cads_config.py does not talk to the probe itself - it drives a separate command-line tool.", de: "cads_config.py spricht nicht selbst mit der Probe - es steuert ein eigenes Kommandozeilenwerkzeug." }, { en: "The error line names both the tool and the package that provides it.", de: "Die Fehlerzeile nennt sowohl das Werkzeug als auch das Paket, das es liefert." }, { en: "In the lab container the tool is present; if it is not on PATH here, you are running the script outside that container.", de: "Im Laborcontainer ist das Werkzeug vorhanden; fehlt es hier im PATH, führst du das Skript außerhalb dieses Containers aus." } ] }
tasks:
  - id: pulled
    title: Hole die config.txt des Boards
    check: { type: command, cwd: ".", command: "grep -nE '^[[:space:]]*(net[.]ip|display[.]brightness)[[:space:]]*=' config.txt", expectExitCode: 0, bloom: apply }
  - id: why-text
    title: Erkläre die Wahl des Formats
    check: { type: question, prompt: { en: "Why is /config.txt plain text when a binary key-value store already existed?", de: "Warum ist /config.txt Klartext, obwohl es schon einen binären Key-Value-Speicher gab?" }, rubric: "Text, weil ein Mensch die Datei bearbeitet und eine Binärtabelle nicht von Hand editierbar ist; die Trennung folgt dem Publikum, denn die Touch-Kalibrierung bleibt im kv-Speicher, weil ihre rohen ADC-Werte für einen Menschen nichts bedeuten und durch ein Tippen erzeugt, nie getippt werden. Nennt zusätzlich den Robustheitsgewinn: ein unbekannter Schlüssel wird übersprungen, ein fehlender behält seinen Default, ein fehlerhafter Wert lässt den vorherigen intakt - eine abgeschnittene Textdatei degradiert zu Defaults plus dem Geparsten, eine abgeschnittene Binärtabelle zu Müll. Eine Antwort, die nur lesbarer sagt, besteht nicht.", bloom: apply }
  - id: push-while-busy
    title: Ein Push zur falschen Zeit
    check: { type: question, prompt: { en: "You push while the board is saving a fresh touch calibration. What is lost, and why?", de: "Du pushst, während das Board gerade eine frische Touch-Kalibrierung speichert. Was geht verloren, und warum?" }, rubric: "Die Kalibrierung. Ein push liest das ganze Volume, ändert eine Datei darin und schreibt das ganze Volume zurück; das gelesene Abbild entstand vor dem Schreibvorgang des Boards, also überschreibt das Zurückschreiben alles, was das Board dazwischen selbst gespeichert hat. Nennt den sicheren Zeitpunkt: solange das Board im Leerlauf ist, am verlässlichsten direkt nach einem Reset.", bloom: apply }
socratic:
  - { trigger: "task:pulled:failed", question: { en: "The pull writes one file into your working directory. Did it get that far, and if not, which of its three steps stopped?", de: "Der Pull schreibt eine Datei in dein Arbeitsverzeichnis. Kam er so weit, und wenn nicht, welcher seiner drei Schritte hielt an?" }, hints: [ { en: "The script prints one line per stage on stderr; the last line you see names the stage that failed.", de: "Das Skript druckt je Stufe eine Zeile auf stderr; die letzte Zeile, die du siehst, nennt die gescheiterte Stufe." }, { en: "It needs a host-side helper before it can open the dumped image, and that helper comes from the host build.", de: "Es braucht einen Host-Helfer, bevor es das ausgelesene Image öffnen kann, und der stammt aus dem Host-Build." }, { en: "The board must be idle and connected over SWD - a live debug session holds the probe and the read will fail.", de: "Das Board muss im Leerlauf und über SWD verbunden sein - eine laufende Debug-Sitzung hält die Probe und das Lesen scheitert." } ] }
  - { trigger: "question:why-text:weak", question: { en: "Both stores are on the same volume and both survive a reset. So what is actually different about them?", de: "Beide Speicher liegen auf demselben Volume und beide überstehen einen Reset. Was unterscheidet sie also wirklich?" }, hints: [ { en: "Ask who produces each value and who reads it back - a person, or the firmware.", de: "Frag, wer den jeweiligen Wert erzeugt und wer ihn zurückliest - ein Mensch oder die Firmware." }, { en: "docs/explanation/config-design.md argues this split explicitly; the touch calibration is the counter-example.", de: "docs/explanation/config-design.md begründet diese Trennung ausdrücklich; die Touch-Kalibrierung ist das Gegenbeispiel." }, { en: "There is a second half to the answer: what a partly written text file degrades to, and what a partly written binary table would.", de: "Die Antwort hat eine zweite Hälfte: wozu eine halb geschriebene Textdatei degradiert und wozu eine halb geschriebene Binärtabelle." } ] }
  - { trigger: "question:push-while-busy:weak", question: { en: "How much of the volume does a push write back - the one file, or more?", de: "Wie viel vom Volume schreibt ein Push zurück - die eine Datei oder mehr?" }, hints: [ { en: "Re-read the three numbered steps above and note what the first and third of them operate on.", de: "Lies die drei nummerierten Schritte oben noch einmal und achte darauf, worauf der erste und der dritte wirken." }, { en: "The image you push back was read before the board wrote anything - the two are snapshots taken at different times.", de: "Das Image, das du zurückschreibst, wurde gelesen, bevor das Board etwas schrieb - die beiden sind Momentaufnahmen zu verschiedenen Zeiten." }, { en: "Name the safe moment as well: the point in the board's life at which it is guaranteed not to be writing.", de: "Nenne auch den sicheren Zeitpunkt: die Stelle im Leben des Boards, an der es garantiert nicht schreibt." } ] }
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

## Zwei Speicher auf demselben Volume

Die `kv`-Tabelle aus `cads/storage` sicherte schon vor der Konfigurationsdatei die Touch-Kalibrierung, und sie liegt bis heute daneben — binär, im selben littlefs-Volume. Für die Konfiguration wurde sie bewusst **nicht** wiederverwendet. `docs/explanation/config-design.md` begründet das; der Unterschied liegt weder in der Haltbarkeit noch im Ort, sondern darin, wer den Wert erzeugt und wer ihn zurückliest.

Die Textgrammatik hat außerdem ein Verhalten, das eine Binärtabelle nicht hätte: ein unbekannter Schlüssel wird übersprungen, ein fehlender behält seinen Default, ein fehlerhafter Wert lässt den vorherigen intakt. Wozu eine halb geschriebene Datei damit degradiert — und wozu eine halb geschriebene Tabelle degradieren würde — gehört in deine Antwort.

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

`cads_fs` stammt aus dem Host-Build (`build/host/cads_fs`) — deshalb hat M0 beide Targets gebaut. Achte auf Schritt 1 und Schritt 3: der Push schreibt zurück, was er vorher gelesen hat. Was das für ein Board bedeutet, das zwischendurch selbst schreibt, ist die dritte Aufgabe dieses Steps.

## Deine Aufgabe

Führe `scripts/cads_config.py pull` aus; der erste Check sieht in der so entstandenen `./config.txt` nach, ob die erwarteten Schlüssel darin stehen. Lies jeden Schlüssel gegen die Referenz. Beantworte dann die zwei Fragen: warum das Format Text ist, und was ein Push zur falschen Zeit kostet. Der nächste Step ändert einen Wert und wendet ihn live an.
