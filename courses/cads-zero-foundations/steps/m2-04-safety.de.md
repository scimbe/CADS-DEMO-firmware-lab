---
id: m2-04-safety
title: Die Hardware-Sicherheitsregeln
bloom: understand
objectives: [firmware-safety]
requires: [m2-03-buttons]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m2-00-mmio-primer, m2-01-memory-map]
links:
  - { step: m2-05-explorer-command }
  - { doc: "docs/SAFETY.md" }
  - { doc: "docs/HARDWARE.md" }
  - { file: "scripts/flash.sh", line: 20 }
sources: [docs/SAFETY.md, docs/HARDWARE.md, scripts/flash.sh, docs/reference/memory-map.md]
tasks:
  - id: read-safety
    title: Belege maschinell, dass kein App-Code die Eingangsports umkonfiguriert
    check: { type: command, cwd: ".", command: "! grep -rn 'GPIO[FG]->MODER' apps/", expectExitCode: 0 }
  - id: state-rules
    title: Ordne die zwei verbotenen Flash-Operationen nach ihrem Schaden
    check: { type: question, prompt: { en: "Why is a wrong write to FLASH_OPTCR worse than an accidental mass erase?", de: "Warum ist ein falscher Schreibzugriff auf FLASH_OPTCR schlimmer als ein versehentliches Mass-Erase?" }, rubric: "Ein Mass-Erase löscht Inhalte: die Firmware und das littlefs-Volume in Bank 2. Beides lässt sich neu schreiben, der Verlust sind Daten und Zeit. Ein Schreibzugriff auf FLASH_OPTCR ändert dagegen dauerhafte Konfigurationsbits des Bausteins: RDP Stufe 1 sperrt den Debug-Zugriff auf den Flash und ist nur um den Preis eines vollständigen Löschens zurückzunehmen, RDP Stufe 2 sperrt ihn endgültig und ist unwiderruflich — danach ist das Board weder zu debuggen noch neu zu flashen. Die Antwort muss den Unterschied umkehrbar gegen unumkehrbar benennen; beide Operationen nur aufzuzählen genügt nicht.", bloom: understand }
  - id: protected-pins
    title: Sage die Folge eines portweiten MODER-Schreibzugriffs voraus
    check: { type: question, prompt: { en: "A driver writes GPIOA->MODER in one go instead of pin by pin. Which access do you lose?", de: "Ein Treiber schreibt GPIOA->MODER in einem Rutsch statt Pin für Pin. Welchen Zugang verlierst du dabei?" }, rubric: "Ein MODER-Schreibzugriff legt die Richtung aller sechzehn Pins des Ports auf einmal fest, also auch die von PA13 und PA14. Das sind SWDIO und SWCLK, die beiden Leitungen der Debug-Schnittstelle: sind sie umkonfiguriert, antwortet das Board der ST-Link nicht mehr, es gibt weder Debuggen noch Flashen über SWD, und die Wiederherstellung braucht den BOOT0-Jumper und einen seriellen Bootloader. Genau deshalb initialisiert die HAL Pins einzeln beim Namen. Die Antwort muss den Weg von PA13/PA14 zum verlorenen Debug-Zugang zeigen, nicht nur das Wort SWD nennen.", bloom: understand }
socratic:
  - { trigger: "task:read-safety:failed", question: { en: "The grep found a write to the mode register of an input port under apps/. Where did that line come from?", de: "Der Grep hat unter apps/ einen Schreibzugriff auf das Moderegister eines Eingangsports gefunden. Woher stammt diese Zeile?" }, hints: [ { en: "Could a quick experiment of your own have configured PF or PG as an output, perhaps to make an LED blink?", de: "Könnte ein schneller eigener Versuch PF oder PG als Ausgang konfiguriert haben, vielleicht um eine LED blinken zu lassen?" }, { en: "The check is a grep over apps/. Open a terminal (menu Terminal, New Terminal) and run it yourself: grep -rn 'GPIO[FG]->MODER' apps/ prints file and line.", de: "Der Check ist ein Grep über apps/. Öffne ein Terminal (Menü Terminal, New Terminal) und lass ihn selbst laufen: grep -rn 'GPIO[FG]->MODER' apps/ nennt Datei und Zeile." }, { en: "PF and PG are inputs because whatever the adapter has wired there may be driving those nets. The line has to go, not be rewritten.", de: "PF und PG sind Eingänge, weil das, was der Adapter dort angeschlossen hat, diese Netze treiben kann. Die Zeile gehört gelöscht, nicht umgeschrieben." } ] }
  - { trigger: "question:state-rules:weak", question: { en: "Both operations do damage. After which of the two can you still put the board back the way it was?", de: "Beide Operationen richten Schaden an. Nach welcher der beiden kannst du das Board noch in den alten Zustand bringen?" }, hints: [ { en: "Is the difference in how much is destroyed, or in whether the destruction can be taken back?", de: "Liegt der Unterschied in der Menge des Zerstörten, oder darin, ob es sich zurücknehmen lässt?" }, { en: "Section 4 names both operations. Look up what RDP means in the paragraph on option bytes, and what its two levels do differently.", de: "Der Abschnitt 4 nennt beide Operationen. Sieh im Absatz über die Option-Bytes nach, wofür RDP steht und was seine beiden Stufen unterschiedlich tun." }, { en: "One of the two levels has no way back at all, and what it locks is the very access this course needs in every module from M3 onwards.", de: "Eine der beiden Stufen hat gar keinen Rückweg, und was sie sperrt, ist genau der Zugang, den dieser Kurs ab M3 in jedem Modul braucht." } ] }
  - { trigger: "question:protected-pins:weak", question: { en: "Which pins of port A does a port-wide write carry along that you were not thinking about?", de: "Welche Pins von Port A trägt ein portweiter Schreibzugriff mit, an die du gar nicht gedacht hast?" }, hints: [ { en: "Is your answer about the pin the driver wanted, or about the pins it took along by accident?", de: "Handelt deine Antwort vom Pin, den der Treiber wollte, oder von den Pins, die er nebenbei mitgenommen hat?" }, { en: "Compare the pin numbers in the table of section 1 with the number of pins one MODER register covers, given in the paragraph right above it.", de: "Vergleich die Pinnummern in der Tabelle des Abschnitts 1 mit der Zahl der Pins, die ein MODER-Register abdeckt — sie steht im Absatz direkt darüber." }, { en: "Ask what the ST-Link still has to talk to after that write, and what recovering it would cost in hardware terms.", de: "Frag, womit die ST-Link nach diesem Schreibzugriff noch reden soll, und was eine Wiederherstellung an Hardware kosten würde." } ] }
misconceptions:
  - { pattern: "GPIO[FG]->MODER", question: { en: "The grep names a file and a line. Does that line configure an input port as an output?", de: "Der Grep nennt Datei und Zeile. Konfiguriert diese Zeile einen Eingangsport als Ausgang?" }, hints: [ { en: "Was the line meant as a quick test, and did it stay behind afterwards?", de: "War die Zeile als schneller Test gemeint, und ist sie danach liegengeblieben?" }, { en: "Open the named file with Ctrl/Cmd+P and delete the write; nothing under apps/ needs to set a pin direction.", de: "Öffne die genannte Datei mit Strg/Cmd+P und entferne den Schreibzugriff; nichts unter apps/ muss eine Pinrichtung setzen." }, { en: "Apps drive outputs through the HAL, which has already set every direction once in cads_hal_io_init().", de: "Apps treiben Ausgänge über die HAL, die jede Richtung in cads_hal_io_init() bereits einmal gesetzt hat." } ] }
---
## Lernziel

Kenne die nicht verhandelbaren Sicherheitsregeln des Boards — geschützte Pins, Nur-Eingangs-Ports, das Flash-Fenster und die zwei verbotenen Flash-Operationen —, bevor du Code schreibst, der echtes Silizium treibt.

## Verbindlich, nicht beratend

`docs/SAFETY.md` ist verbindlich für jede Änderung und jede Person oder jeden Agenten, die an diesem Repository arbeiten. Das meiste am Board ist robust; eine Handvoll Dinge nicht, und die sind aufgezählt. Die Faustregel ganz oben: **im Zweifel den Pin nicht treiben.**

## 1. Die Debug-Schnittstelle nie anfassen

Ein Wort vorweg, das gleich dreimal auftaucht: `MODER` ist das *Mode Register* eines GPIO-Ports. Je zwei Bits darin legen die Richtung eines Pins fest — Eingang, Ausgang, Alternativfunktion oder analog —, und ein `MODER` umfasst alle sechzehn Pins seines Ports in einem einzigen 32-Bit-Wort.

| Pin | Funktion | Warum |
|---|---|---|
| PA13 | SWDIO | Eine Umkonfiguration kostet den Debug-Zugang zum Board. |
| PA14 | SWCLK | Die Wiederherstellung braucht dann den BOOT0-Jumper und einen seriellen Bootloader. |
| PB3 | SWO | Trace-Ausgang, bleibt unberührt. |

Nichts in dieser Firmware konfiguriert GPIOA-Pins 13/14 oder GPIOB-Pin 3. Die HAL initialisiert Pins einzeln beim Namen, statt ganze `MODER`-Register zu schreiben — das ist kein Umstand, sondern Absicht. `cads_hal_pin_is_reserved()` existiert, damit der Explorer diese Pins markiert; im Mitschnitt aus dem vorigen Step hast du die Markierung gesehen.

## 2. Den Takteingang nie anfassen

PH0/PH1 führen den 8-MHz-Takt, den der eigene MCU der ST-Link einspeist. Die **PLL** (*Phase-Locked Loop*) ist die Schaltung im Chip, die daraus den schnellen Systemtakt vervielfacht; sie läuft hier im `HSE_BYPASS`, und das heißt: am Takteingang schwingt kein eigener Quarz, sondern es wird ein fertiges Taktsignal von außen eingespeist. Deshalb ist **PH0 ein Eingang**; als Ausgang konfiguriert kämpft er gegen den Treiber der ST-Link.

Erhöhe den Takt nicht über 180 MHz. Scale 1, Over-Drive und 5 Flash-Waitstates ist das dokumentierte Maximum bei 3,3 V — **Over-Drive** ist eine Betriebsart des Spannungsreglers im Chip, ohne die 180 MHz nicht zulässig sind, und ein **Flash-Waitstate** ist ein Wartetakt, den die CPU beim Lesen aus dem Flash einlegt, weil dieser Speicher langsamer ist als der Kern.

## 3. Pinrichtungen am Adapter respektieren

| Pins | Richtung | Regel |
|---|---|---|
| PD0..PD7, PE0..PE7 | Ausgang | OUT0..15, LED-Bänke. Sicher zu treiben. |
| PF0..PF7 | **Eingang** | IN0..7. **Nie als Ausgang konfigurieren.** |
| PG0..PG5 | **Eingang** | INT0..5. **Nie als Ausgang konfigurieren.** |

Was auch immer der Adapter an PF/PG angeschlossen hat, kann diese Netze aktiv treiben. Ein **Netz** ist dabei eine elektrisch durchverbundene Leitung: alles, was daran hängt, sieht dieselbe Spannung. Ein **Push-Pull**-Ausgang zieht seine Leitung aktiv nach oben *und* aktiv nach unten — treffen zwei davon mit verschiedener Meinung auf einem Netz aufeinander, fließt der Kurzschlussstrom durch beide Treiber. So sterben Boards. `hal_io.c` konfiguriert PF und PG als Eingänge mit Pull-up und ändert das nie.

Die erste Aufgabe dieses Steps prüft genau diese Regel maschinell: ein `grep` über `apps/` darf keinen Schreibzugriff auf `GPIOF->MODER` oder `GPIOG->MODER` finden.

## 4. Flash-Schreibzugriffe sind eingegrenzt

Die Aufteilung des Flash kennst du aus `m2-01`; hier zählt nur, wer wohin schreiben darf:

| Bereich | Adresse | Verwendung |
|---|---|---|
| Firmware | `0x08000000` – `0x080FFFFF` | Bank 1, nur vom Flash-Werkzeug beschrieben |
| Reserviert | `0x08100000` – `0x0811FFFF` | bleibt gelöscht |
| Dateisystem | `0x08120000` – `0x081FFFFF` | Bank 2, das littlefs-Volume |

Zwei Operationen sind rundweg verboten:

- **Kein Mass-Erase, niemals.** Ein Chip-Erase nähme das Dateisystem mit. `scripts/flash.sh` nutzt `st-flash write`, das nur die beschriebenen Sektoren löscht, und verweigert ein Image über 1 MB.
- **Nie Option-Bytes schreiben.** `FLASH_OPTCR` ist das *Option Control Register*, über das die dauerhaften Konfigurationsbits des Bausteins geschrieben werden. Darin sitzt **RDP** (*Read-Out Protection*), der Leseschutz: Stufe 1 sperrt den Debug-Zugriff auf den Flash und ist nur um den Preis eines vollständigen Löschens zurückzunehmen, Stufe 2 sperrt ihn endgültig und unwiderruflich. Nichts in diesem Repository schreibt dieses Register.

Welche der beiden Operationen die schlimmere ist und warum, ist die zweite Aufgabe.

## 5–7 in Kürze

Der Displaybus ist nur beschreibbar; die Power- und Gamma-Register des ILI9486 stammen vom Hersteller und bleiben, wie sie sind, weil falsche Treiberspannungen ein TFT physisch beschädigen können. `SPI1_MOSI` und `ETH_RMII_CRS_DV` teilen sich PA7, deshalb wird das Display nie außerhalb von `cads_hal_spi_claim_bus()`/`release_bus()` beschrieben; die ganze Geschichte dazu steht in M3.

Jede Probe- oder Serieninteraktion läuft unter einem Timeout. `Default_Handler` — die Auffangroutine für jeden Interrupt, für den kein eigener Handler eingetragen ist — und `cads_hal_panic()` führen `bkpt #0` aus, einen Maschinenbefehl, der den Kern anhält und an einen angeschlossenen Debugger übergibt. Ohne Debugger eskaliert er zum HardFault, und das erscheint als Blockade mit leuchtender roter LED: der beabsichtigte sichere Fehlermodus.

## Deine Aufgabe

Drei Aufgaben, jede für sich.

Zuerst lässt du den `grep` laufen, der Regel 3 nachweist — der Knopf **Prüfen** an der Aufgabe startet ihn; dasselbe Kommando kannst du in einem Terminal (Menü *Terminal → New Terminal*) selbst eingeben. Dann ordnest du die zwei verbotenen Flash-Operationen nach ihrem Schaden. Zuletzt sagst du voraus, was ein portweiter `MODER`-Schreibzugriff auf Port A mitnimmt.

Lies `docs/SAFETY.md` einmal vollständig, bevor du die zweite und dritte Aufgabe beantwortest; die Datei öffnest du mit `Strg`/`Cmd`+`P` und dem getippten Dateinamen. Gleich fügst du dem Explorer eigenen Code hinzu — das hier sind die Randbedingungen, die er einhalten muss.
