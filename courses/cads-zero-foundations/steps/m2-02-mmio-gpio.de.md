---
id: m2-02-mmio-gpio
title: Ausgänge und LEDs über die HAL treiben
bloom: apply
objectives: [cz.gpio.mmio]
requires: [m2-01-memory-map]
estimatedMinutes: 15
links:
  - { step: m2-03-buttons }
  - { doc: "docs/HARDWARE.md" }
  - { doc: "docs/reference/explorer-console.md" }
  - { file: "core/cads_hal.h", line: 222 }
sources: [core/cads_hal.h, targets/itsboard/hal/hal_io.c, docs/HARDWARE.md, docs/reference/explorer-console.md]
tasks:
  - id: drive-outputs
    title: Treibe die Ausgangsbänke und die Board-LEDs live
    check: { type: manual }
  - id: bits-to-ports
    title: Ordne den HAL-Aufruf der Hardware zu
    check: { type: question, prompt: { en: "You call cads_hal_adapter_outputs(0x0301). Which port pins go high, which adapter LEDs light, and how do you know the OUT LEDs are active-high rather than active-low?", de: "Du rufst cads_hal_adapter_outputs(0x0301) auf. Welche Port-Pins gehen auf High, welche Adapter-LEDs leuchten, und woher weißt du, dass die OUT-LEDs active-high und nicht active-low sind?" }, rubric: "Bits 0..7 gehen an GPIOD (OUT0..7), Bits 8..15 an GPIOE (OUT8..15); 0x0301 setzt PD0, PD1 und PE1 (OUT0, OUT1, OUT9). Active-high ist durch den GPIOTest des Herstellers belegt, der die LEDs mit GPIOD->BSRR = 1 << i durchläuft, und durch den Adapter-Schaltplan bestätigt; eine frühere fotobasierte 'active low'-Lesart war ein Irrtum.", bloom: apply }
socratic:
  - { trigger: "task:drive-outputs:stuck", question: { en: "Nothing changed on the adapter when you sent a command. Is the board at the console prompt, or still in the app-tree session that ignores plain typed bytes?", de: "Am Adapter hat sich nichts getan, als du einen Befehl gesendet hast. Ist das Board am Konsolen-Prompt oder noch in der App-Baum-Sitzung, die einfache getippte Bytes ignoriert?" }, hints: [ { en: "Send board_key.py quit once, then retry 'o ffff'.", de: "Sende einmal board_key.py quit, dann 'o ffff' erneut." }, { en: "The 'o' command takes a 16-bit hex mask: 'o ff' drives OUT0..7 (GPIOD), 'o ff00' drives OUT8..15 (GPIOE).", de: "Der Befehl 'o' nimmt eine 16-Bit-Hexmaske: 'o ff' treibt OUT0..7 (GPIOD), 'o ff00' treibt OUT8..15 (GPIOE)." }, { en: "'l 100' lights the red Nucleo LED only; the three digits are red, green, blue in that order.", de: "'l 100' schaltet nur die rote Nucleo-LED ein; die drei Ziffern stehen für Rot, Grün, Blau in dieser Reihenfolge." } ] }
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

Auf dem Board implementiert `targets/itsboard/hal/hal_io.c` die Funktion `cads_hal_adapter_outputs()` mit einem Schreibzugriff pro Port auf das **BSRR** (Bit-Set/Reset-Register): das Low-Byte von `value` setzt und löscht PD0..PD7 in einem einzigen atomaren Schreibvorgang, das High-Byte tut dasselbe für PE0..PE7. BSRR statt Read-Modify-Write auf ODR bedeutet, dass ein gleichzeitiger Interrupt am selben Port kein Bit verlieren kann. Das ist Memory-mapped I/O: ein Store an eine feste Adresse im Peripheriebereich verändert Spannungen an echten Pins.

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

Sende `o ff`, `o ff00`, `o ffff`, `o 0` und einige `l`-Muster über die Board-Konsole und beobachte, wie Adapter- und Nucleo-LEDs reagieren. Beantworte dann die Zuordnungsfrage — welche Pins `0x0301` setzt und wie die Polarität festgestellt wurde.
