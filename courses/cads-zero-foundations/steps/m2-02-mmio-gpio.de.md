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
    check: { type: question, prompt: { en: "Which adapter outputs does the mask 0x0301 drive high?", de: "Welche Adapter-Ausgänge treibt die Maske 0x0301 auf High?" }, rubric: "0x0301 ist binär 0000 0011 0000 0001, also sind Bit 0, Bit 8 und Bit 9 gesetzt (1 + 256 + 512 = 769). Bits 0..7 gehen an GPIOD, Bits 8..15 an GPIOE, also gehen OUT0, OUT8 und OUT9 auf High und ihre LEDs leuchten. Die Antwort muss die Umrechnung zeigen, nicht nur drei Namen nennen. Wer die Ziffer 3 fälschlich als Bit 0 und 1 liest und auf OUT0, OUT1, OUT9 kommt, hat den Stellenwert der Hexziffer übersehen und besteht nicht.", bloom: apply }
  - id: bsrr-vs-odr
    title: Beurteile BSRR gegen Read-Modify-Write
    check: { type: question, prompt: { en: "A task toggles a pin with ODR ^= (1u << pin) while an interrupt writes BSRR on the same port. Whose write is lost?", de: "Eine Task schaltet einen Pin mit ODR ^= (1u << pin) um, während ein Interrupt auf demselben Port BSRR schreibt. Wessen Schreibvorgang geht verloren?" }, rubric: "Der BSRR-Schreibvorgang des Interrupts geht verloren. Das Read-Modify-Write der Task besteht aus drei Schritten; faehrt der Interrupt zwischen Lesen und Zurueckschreiben dazwischen, schreibt die Task anschliessend den vor der Aenderung gelesenen Wert zurueck und loescht sie damit. Die Gegenrichtung ist unmoeglich, weil auf einem Cortex-M Thread-Code einen Interrupt nicht verdraengen kann: das BSRR-Schreiben des Interrupts ist ein einzelner Store und liegt immer ganz vor oder ganz nach dem Zugriff der Task. Wer nur BSRR als atomar bezeichnet, ohne diese Asymmetrie zu benennen, hat die Haelfte.", bloom: analyze }
socratic:
  - { trigger: "task:drive-outputs:failed", question: { en: "Nothing came back from the board. Is it at the console prompt, or still in the app tree that ignores typed bytes?", de: "Vom Board kam nichts zurück. Ist es am Konsolen-Prompt oder noch im App-Baum, der getippte Bytes ignoriert?" }, hints: [ { en: "A freshly flashed board boots into the touchscreen app tree and ignores single letters.", de: "Ein frisch geflashtes Board startet in den Touchscreen-App-Baum und ignoriert einzelne Buchstaben." }, { en: "Open a terminal (menu Terminal, New Terminal) and run python3 scripts/board_key.py quit there, not in the board console.", de: "Öffne ein Terminal (Menü Terminal, New Terminal) und führe dort python3 scripts/board_key.py quit aus, nicht in der Board-Konsole." }, { en: "Then the console answers single letters again; the o command echoes the mask it applied.", de: "Danach beantwortet die Konsole wieder einzelne Buchstaben; der Befehl o gibt die angewandte Maske zurück." } ] }
  - { trigger: "question:bits-to-ports:weak", question: { en: "Split the four hex digits into four bits each first. Which positions carry a one?", de: "Zerleg die vier Hexziffern zuerst in je vier Bits. Welche Positionen tragen eine Eins?" }, hints: [ { en: "m2-00-hex-and-bits worked one of these through: 0x03 is 0000 0011, so bits 0 and 1.", de: "m2-00-hex-and-bits hat eines davon vorgerechnet: 0x03 ist 0000 0011, also Bit 0 und Bit 1." }, { en: "Count bit positions from the right, starting at zero, across the whole 16-bit value.", de: "Zähl die Bitpositionen von rechts, beginnend bei null, über den ganzen 16-Bit-Wert." }, { en: "The header comment on cads_hal_adapter_outputs() says which half of the mask goes to which port.", de: "Der Header-Kommentar an cads_hal_adapter_outputs() sagt, welche Hälfte der Maske an welchen Port geht." } ] }
  - { trigger: "question:bsrr-vs-odr:weak", question: { en: "Write out the three machine steps of ODR ^= (1u << pin). Where can the interrupt land?", de: "Schreib die drei Maschinenschritte von ODR ^= (1u << pin) auf. Wo kann der Interrupt dazwischenfahren?" }, hints: [ { en: "Read, change, write back: the value read is already stale if something else writes in between.", de: "Lesen, ändern, zurückschreiben: der gelesene Wert ist bereits veraltet, wenn dazwischen jemand anderes schreibt." }, { en: "Now ask the same question the other way round, and check whether a task can interrupt an interrupt handler at all.", de: "Stell dieselbe Frage nun andersherum und prüf, ob eine Task einen Interrupt-Handler überhaupt unterbrechen kann." }, { en: "One direction is possible and the other is not; that asymmetry is the whole point of the question.", de: "Eine Richtung ist möglich, die andere nicht; genau diese Asymmetrie ist der Kern der Frage." } ] }
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

Hier siehst du wieder, was `m2-00-mmio-primer` vorgemacht hat. Der portable Aufruf endet in einem einzigen Store an eine feste Adresse — `GPIOD->BSRR` liegt bei `0x40020C18` —, und dieser Store verändert Spannungen an echten Beinchen. Das ist Memory-mapped I/O, diesmal nicht als Beispiel, sondern im laufenden Betrieb.

Die Registerwahl ist dabei kein Zufall. Ein BSRR-Schreibvorgang trägt Setz- und Löschhälfte in sich und ist ein einzelner Store. Die naheliegende Alternative ist, das ODR zu lesen, ein Bit zu ändern und zurückzuschreiben — ein **Read-Modify-Write** aus drei Maschinenschritten, und genau das tut die Firmware an anderer Stelle: `cads_gpio_toggle()` in `targets/itsboard/hal/hal_gpio.h` ist `port->ODR ^= (1u << pin)`.

Ein **Interrupt** ist eine Unterbrechung durch die Hardware: sie hält den laufenden Code mitten im Satz an, lässt eine kurze eigene Routine laufen und kehrt zurück. Weil sie jederzeit dazwischenkommen kann, laufen die beiden Codestücke **nebenläufig** — sie können sich in die Quere kommen, ohne dass im Quelltext etwas davon zu sehen wäre. Wer von beiden dabei einen Schreibvorgang verliert und warum nur eine Richtung möglich ist, ist die dritte Aufgabe dieses Steps.

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
