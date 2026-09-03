---
id: m2-02-mmio-gpio
title: Ausgänge und LEDs über die HAL treiben
bloom: apply
objectives: [cz.gpio.mmio]
requires: [m2-01-memory-map]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m2-00-mmio-primer]
links:
  - { step: m2-03-buttons }
  - { doc: "docs/HARDWARE.md" }
  - { doc: "docs/reference/explorer-console.md" }
  - { file: "core/cads_hal.h", line: 222 }
sources: [core/cads_hal.h, targets/itsboard/hal/hal_io.c, docs/HARDWARE.md, docs/reference/explorer-console.md]
tasks:
  - id: drive-outputs
    title: Treibe eine gewählte Bitmaske und sieh sie am Adapter
    check: { type: serialExpect, send: "o 0301\n", pattern: "outputs = 0301", timeoutMs: 20000 }
  - id: bits-to-ports
    title: Rechne die Maske in Pins um
    check: { type: question, prompt: { en: "Which adapter outputs does the mask 0x0301 drive high?", de: "Welche Adapter-Ausgänge treibt die Maske 0x0301 auf High?" }, rubric: "0x0301 ist binär 0000 0011 0000 0001, also sind Bit 0, Bit 1 und Bit 8 gesetzt. Bits 0..7 gehen an GPIOD, Bits 8..15 an GPIOE, also gehen OUT0, OUT1 und OUT9 auf High und ihre LEDs leuchten. Die Antwort muss die Umrechnung zeigen, nicht nur drei Namen nennen.", bloom: apply }
  - id: bsrr-vs-odr
    title: Beurteile BSRR gegen Read-Modify-Write
    check: { type: question, prompt: { en: "An interrupt sets OUT9 via ODR while the main code writes BSRR. Which write can be lost?", de: "Ein Interrupt setzt OUT9 über ODR, während der Hauptcode BSRR schreibt. Welcher Schreibvorgang kann verlorengehen?" }, rubric: "Der ODR-Zugriff des Interrupts geht verloren, wenn er zwischen das Lesen und das Zurückschreiben eines Read-Modify-Write fällt: der Hauptcode schreibt einen Wert zurück, der vor der Änderung des Interrupts gelesen wurde. Ein BSRR-Schreibvorgang ist ein einzelner Store ohne vorheriges Lesen und kann deshalb nichts überschreiben, was er nicht kennt. Die Antwort muss das Zeitfenster zwischen Lesen und Zurückschreiben benennen.", bloom: analyze }
socratic:
  - { trigger: "task:drive-outputs:failed", question: { en: "Nothing came back from the board. Is it at the console prompt, or still in the app tree that ignores typed bytes?", de: "Vom Board kam nichts zurück. Ist es am Konsolen-Prompt oder noch im App-Baum, der getippte Bytes ignoriert?" }, hints: [ { en: "A freshly flashed board boots into the touchscreen app tree and ignores single letters.", de: "Ein frisch geflashtes Board startet in den Touchscreen-App-Baum und ignoriert einzelne Buchstaben." }, { en: "Open a terminal (menu Terminal, New Terminal) and run python3 scripts/board_key.py quit there, not in the board console.", de: "Öffne ein Terminal (Menü Terminal, New Terminal) und führe dort python3 scripts/board_key.py quit aus, nicht in der Board-Konsole." }, { en: "Then the console answers single letters again; the o command echoes the mask it applied.", de: "Danach beantwortet die Konsole wieder einzelne Buchstaben; der Befehl o gibt die angewandte Maske zurück." } ] }
  - { trigger: "question:bits-to-ports:weak", question: { en: "Split the four hex digits into four bits each first. Which positions carry a one?", de: "Zerleg die vier Hexziffern zuerst in je vier Bits. Welche Positionen tragen eine Eins?" }, hints: [ { en: "m2-00 worked one of these through: 0x03 is 0000 0011, so bits 0 and 1.", de: "m2-00 hat eines davon vorgerechnet: 0x03 ist 0000 0011, also Bit 0 und Bit 1." }, { en: "Count bit positions from the right, starting at zero, across the whole 16-bit value.", de: "Zähl die Bitpositionen von rechts, beginnend bei null, über den ganzen 16-Bit-Wert." }, { en: "The header comment on cads_hal_adapter_outputs() says which half of the mask goes to which port.", de: "Der Header-Kommentar an cads_hal_adapter_outputs() sagt, welche Hälfte der Maske an welchen Port geht." } ] }
  - { trigger: "question:bsrr-vs-odr:weak", question: { en: "Write out the three machine steps a read-modify-write on ODR takes. Where can the interrupt land?", de: "Schreib die drei Maschinenschritte auf, die ein Read-Modify-Write auf ODR braucht. Wo kann der Interrupt dazwischenfahren?" }, hints: [ { en: "Read, change, write back: the value read is already stale if something else writes in between.", de: "Lesen, ändern, zurückschreiben: der gelesene Wert ist bereits veraltet, wenn dazwischen jemand anderes schreibt." }, { en: "A BSRR write is a single store and carries its own set and clear halves, so it never reads first.", de: "Ein BSRR-Schreibvorgang ist ein einziger Store und trägt Setz- und Löschhälfte in sich, liest also nie vorher." }, { en: "Ask which of the two participants loses its bit, and whether swapping who uses which register would help.", de: "Frag, welcher der beiden Beteiligten sein Bit verliert, und ob es hülfe, die Registerwahl zu tauschen." } ] }
---
## Lernziel

Treibe die sechzehn Ausgänge des ITS-Adapters und die drei LEDs des Nucleo über die HAL und sieh, wie ein portabler Aufruf darunter auf GPIO-Register abgebildet wird.

## Die portable Oberfläche

`core/cads_hal.h` stellt drei Aufrufe für die Ausgangsseite bereit:

```c
/** OUT0..OUT15: bits 0..7 go to GPIOD, bits 8..15 to GPIOE. */
void cads_hal_adapter_outputs(uint16_t value);

typedef enum { CadsLedGreen, CadsLedBlue, CadsLedRed } cads_led_t;
void cads_hal_led_set(cads_led_t led, bool on);
void cads_hal_led_toggle(cads_led_t led);
```

Nichts oberhalb der HAL kennt einen Port-Buchstaben. Eine App, die OUT3 auf High will, setzt Bit 3; das Target entscheidet, welcher Pin das ist. Das ist die Grenze aus M1 bei der Arbeit.

## Was darunter passiert

Auf dem Board implementiert `targets/itsboard/hal/hal_io.c` die Funktion `cads_hal_adapter_outputs()` mit einem Schreibzugriff pro Port auf das **BSRR**, das *Bit-Set/Reset-Register*: das Low-Byte von `value` setzt und löscht PD0..PD7, das High-Byte tut dasselbe für PE0..PE7.

Hier siehst du wieder, was `m2-00` vorgemacht hat. Der portable Aufruf endet in einem einzigen Store an eine feste Adresse — `GPIOD->BSRR` liegt bei `0x40020C18` —, und dieser Store verändert Spannungen an echten Beinchen. Das ist Memory-mapped I/O, diesmal nicht als Beispiel, sondern im laufenden Betrieb.

Die Registerwahl ist dabei kein Zufall. Ein BSRR-Schreibvorgang trägt Setz- und Löschhälfte in sich und ist ein einzelner Store. Die naheliegende Alternative wäre, das ODR zu lesen, ein Bit zu ändern und zurückzuschreiben — ein **Read-Modify-Write** aus drei Maschinenschritten. Warum das unter Nebenläufigkeit ein Unterschied ist, ist die dritte Aufgabe dieses Steps.

## Polarität wird gemessen, nicht angenommen

Die OUT-LEDs des Adapters sind **active high** — eine `1` lässt die LED leuchten. `docs/HARDWARE.md` hält fest, wie das geklärt wurde: der Hardwaretest des Herstellers (`ITS-BRD/its_brd_tst`, `GPIOTest`) durchläuft die LEDs mit `GPIOD->BSRR = 1 << i`, und der Adapter-Schaltplan bestätigt, dass OUT0..7 und OUT8..15 über SN74LVC245-Puffer blaue und grüne LED-Bänke speisen. Eine frühere Lesart aus einem Kamerabild hatte auf „active low" geschlossen; das war eine als Messung verkleidete Vermutung, und die Korrektur bleibt dokumentiert, damit niemand sie wiederholt.

Die drei LEDs des Nucleo (grün, blau, rot) sind von den Adapterbänken getrennt und werden über `cads_hal_led_set()` angesteuert; die rote ist zugleich die Panic-Anzeige.

## Von der Konsole aus treiben

Der Explorer kapselt beide Aufrufe:

| Befehl | Tut |
|---|---|
| `o <hex>` | `cads_hal_adapter_outputs()` mit einer 16-Bit-Maske, z. B. `o ff` für OUT0..7, `o ff00` für OUT8..15 |
| `l <rgb>` | Nucleo-LEDs; drei Ziffern Rot, Grün, Blau — `l 100` ist nur Rot |

Denk an den Stolperstein aus M0: ein Board im App-Baum ignoriert einfache Befehle. Erst `board_key.py quit`.

## Deine Aufgabe

Öffne die Board-Konsole (`F1`, dann `CaDS Board: Konsole öffnen`) und sende `o 0301`. Der Tutor liest die Antwort des Boards mit; am Adapter siehst du zugleich, welche Lampen angehen. Probier danach `o ff`, `o ff00`, `o ffff` und `o 0` sowie ein paar `l`-Muster aus, um ein Gefühl für die Maske zu bekommen.

Rechne dann die Maske `0x0301` selbst in Pins um, und beurteile zuletzt, warum die HAL das BSRR benutzt und nicht das ODR.

Wenn das Board nicht antwortet: ein frisch geflashtes Board startet im Touchscreen-App-Baum und überhört einzelne Buchstaben. Öffne ein Terminal (Menü *Terminal → New Terminal*) und führe dort einmal `python3 scripts/board_key.py quit` aus.
