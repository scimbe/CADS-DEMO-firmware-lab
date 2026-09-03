---
id: m6-02-config-file
title: The configuration file
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
    title: Pull the board configuration file
    check: { type: command, cwd: ".", command: "grep -nE '^[[:space:]]*(net[.]ip|display[.]brightness)[[:space:]]*=' config.txt", expectExitCode: 0, bloom: apply }
  - id: why-text
    title: Explain the choice of format
    check: { type: question, prompt: { en: "Why is /config.txt plain text when a binary key-value store already existed?", de: "Warum ist /config.txt Klartext, obwohl es schon einen binären Key-Value-Speicher gab?" }, rubric: "Text, because a person edits the file and a binary table is not hand-editable; the split follows the audience, since touch calibration stays in the kv store because its raw ADC counts mean nothing to a human and are produced by a tap, never typed. Also names the robustness gain: an unknown key is skipped, an omitted key keeps its default, a malformed value leaves the previous one intact - a truncated text file degrades to defaults plus whatever parsed, a truncated binary table to garbage. An answer that only says more readable does not pass.", bloom: apply }
  - id: push-while-busy
    title: A push at the wrong moment
    check: { type: question, prompt: { en: "You push while the board is saving a fresh touch calibration. What is lost, and why?", de: "Du pushst, während das Board gerade eine frische Touch-Kalibrierung speichert. Was geht verloren, und warum?" }, rubric: "The calibration. A push reads the whole volume, changes one file inside it and writes the whole volume back; the image it read was taken before the board wrote anything, so writing it back overwrites whatever the board saved in between. Names the safe moment as well: while the board is idle, most reliably right after a reset.", bloom: apply }
socratic:
  - { trigger: "task:pulled:failed", question: { en: "The pull writes one file into your working directory. Did it get that far, and if not, which of its three steps stopped?", de: "Der Pull schreibt eine Datei in dein Arbeitsverzeichnis. Kam er so weit, und wenn nicht, welcher seiner drei Schritte hielt an?" }, hints: [ { en: "The script prints one line per stage on stderr; the last line you see names the stage that failed.", de: "Das Skript druckt je Stufe eine Zeile auf stderr; die letzte Zeile, die du siehst, nennt die gescheiterte Stufe." }, { en: "It needs a host-side helper before it can open the dumped image, and that helper comes from the host build.", de: "Es braucht einen Host-Helfer, bevor es das ausgelesene Image öffnen kann, und der stammt aus dem Host-Build." }, { en: "The board must be idle and connected over SWD - a live debug session holds the probe and the read will fail.", de: "Das Board muss im Leerlauf und über SWD verbunden sein - eine laufende Debug-Sitzung hält die Probe und das Lesen scheitert." } ] }
  - { trigger: "question:why-text:weak", question: { en: "Both stores are on the same volume and both survive a reset. So what is actually different about them?", de: "Beide Speicher liegen auf demselben Volume und beide überstehen einen Reset. Was unterscheidet sie also wirklich?" }, hints: [ { en: "Ask who produces each value and who reads it back - a person, or the firmware.", de: "Frag, wer den jeweiligen Wert erzeugt und wer ihn zurückliest - ein Mensch oder die Firmware." }, { en: "docs/explanation/config-design.md argues this split explicitly; the touch calibration is the counter-example.", de: "docs/explanation/config-design.md begründet diese Trennung ausdrücklich; die Touch-Kalibrierung ist das Gegenbeispiel." }, { en: "There is a second half to the answer: what a partly written text file degrades to, and what a partly written binary table would.", de: "Die Antwort hat eine zweite Hälfte: wozu eine halb geschriebene Textdatei degradiert und wozu eine halb geschriebene Binärtabelle." } ] }
  - { trigger: "question:push-while-busy:weak", question: { en: "How much of the volume does a push write back - the one file, or more?", de: "Wie viel vom Volume schreibt ein Push zurück - die eine Datei oder mehr?" }, hints: [ { en: "Re-read the three numbered steps above and note what the first and third of them operate on.", de: "Lies die drei nummerierten Schritte oben noch einmal und achte darauf, worauf der erste und der dritte wirken." }, { en: "The image you push back was read before the board wrote anything - the two are snapshots taken at different times.", de: "Das Image, das du zurückschreibst, wurde gelesen, bevor das Board etwas schrieb - die beiden sind Momentaufnahmen zu verschiedenen Zeiten." }, { en: "Name the safe moment as well: the point in the board's life at which it is guaranteed not to be writing.", de: "Nenne auch den sicheren Zeitpunkt: die Stelle im Leben des Boards, an der es garantiert nicht schreibt." } ] }
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

## Two stores on the same volume

`cads/storage`'s `kv` table persisted touch calibration before the config file existed, and it still sits right next to it — binary, in the same littlefs volume. It was deliberately **not** reused for configuration. `docs/explanation/config-design.md` argues why; the difference is neither durability nor location, but who produces the value and who reads it back.

The text grammar also has a behaviour a binary table would not: an unknown key is skipped, an omitted key keeps its default, a malformed value leaves the previous one intact. What a half-written file therefore degrades to — and what a half-written table would degrade to — belongs in your answer.

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

`cads_fs` comes from the host build (`build/host/cads_fs`), which is why M0 built both targets. Note step 1 against step 3: the push writes back what it read earlier. What that means for a board that writes on its own in between is the third task of this step.

## Your task

Run `scripts/cads_config.py pull`; the first check looks inside the resulting `./config.txt` for the keys it expects. Read every key against the reference. Then answer the two questions: why the format is text, and what a push at the wrong moment costs. The next step changes a value and applies it live.
