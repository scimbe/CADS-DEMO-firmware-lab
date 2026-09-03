---
id: m2-00-register-names
title: Registernamen und die Taktfreigabe
bloom: understand
objectives: [cz.mmio.registers]
requires: [m2-00-mmio-primer]
estimatedMinutes: 12
scaffold: worked
links:
  - { step: m2-01-memory-map }
  - { file: "targets/itsboard/hal/hal_io.c", line: 24 }
  - { doc: "docs/HARDWARE.md" }
sources: [targets/itsboard/hal/hal_io.c, targets/itsboard/hal/hal_gpio.h, docs/HARDWARE.md]
tasks:
  - id: register-naming
    title: Zerlege den Namen RCC_AHB1ENR
    check: { type: question, prompt: { en: "Using the same pattern, what do RCC_APB2ENR and RCC_AHB1RSTR say?", de: "Was sagen nach demselben Muster RCC_APB2ENR und RCC_AHB1RSTR?" }, rubric: "RCC_APB2ENR ist das Einschaltregister (ENR) für die Einheiten am Bus APB2, RCC_AHB1RSTR das Reset-Register (RSTR) für die Einheiten am Bus AHB1. Beide Male ist RCC die Einheit, der mittlere Teil der Bus und der letzte die Aufgabe des Registers. Die Antwort muss beide Namen zerlegen, nicht nur einen.", bloom: understand }
socratic:
  - { trigger: "question:register-naming:weak", question: { en: "Split the name at the underscores first. How many parts do you get, and which one is a bus?", de: "Zerleg den Namen zuerst an den Unterstrichen. Wie viele Teile bekommst du, und welcher davon ist ein Bus?" }, hints: [ { en: "Compare it with RCC_APB1ENR and RCC_AHB1RSTR: what stays, what changes?", de: "Vergleich ihn mit RCC_APB1ENR und RCC_AHB1RSTR: was bleibt, was ändert sich?" }, { en: "The table 'How the names are built' above has one row per part.", de: "Die Tabelle „Wie die Namen gebaut sind“ weiter oben hat eine Zeile je Teil." }, { en: "The last part is always the register's job. ENR is short for enable register; RSTR would be the reset register of the same bus.", de: "Der letzte Teil ist immer die Aufgabe des Registers. ENR steht für Enable Register; RSTR wäre das Reset-Register desselben Busses." } ] }
---
## Lernziel

Lies die Namen, die der Chiphersteller seinen Registern gibt, und kenne die eine Regel, an der auf diesem Baustein die meisten zuerst scheitern.

## Wie die Namen gebaut sind

Niemand behält Adressen wie `0x40023830` im Kopf, also gibt der Chiphersteller ihnen Namen. Für die Register, die sich auf einen Bus beziehen, sind diese Namen nach einem festen Muster gebaut:

| Teil | Beispiel | Was er sagt |
|---|---|---|
| Peripherie | `RCC` | *Reset and Clock Control* — die Einheit, die alle Takte verteilt |
| Bus | `AHB1` | das interne Leitungsbündel, an dem die betroffenen Einheiten hängen |
| Register | `ENR` | *Enable Register* — die Aufgabe dieses Registers: hier wird eingeschaltet |

`RCC_AHB1ENR` heißt also wörtlich: **„das Einschaltregister für alles, was am Bus AHB1 hängt“.** Nach demselben Muster ist `RCC_APB1ENR` das Einschaltregister des langsameren Busses APB1 und `RCC_AHB1RSTR` das Reset-Register desselben AHB1.

Das Muster gilt für die busbezogenen Register, nicht für alle. Im selben Baustein heißen andere RCC-Register schlicht `RCC_CR`, `RCC_CFGR` oder `RCC_CSR` — zwei Teile, kein Busteil, weil sie sich auf keinen Bus beziehen. Wer die Regel kennt, weiß also auch, wo sie aufhört.

Auch die Registernamen der GPIO-Ports folgen dem Muster ihrer Aufgabe: `MODER` = *mode register* (Richtung eines Pins), `IDR` = *input data register* (was gerade anliegt), `ODR` = *output data register* (was ausgegeben wird), `BSRR` = *bit set/reset register* (einzelne Bits setzen oder löschen, ohne die anderen zu lesen).

## Die Regel, an der die meisten zuerst scheitern

Ein Peripherieteil, dessen **Takt nicht eingeschaltet ist, reagiert überhaupt nicht.** Ein Schreibzugriff verpufft, ein Lesezugriff liefert Nullen — kein Fault, keine Warnung, kein Hinweis. Das ist der häufigste Anfängerfehler auf diesem Chip, und er sieht aus wie ein kaputtes Board.

Deshalb beginnt `cads_hal_io_init()` in `targets/itsboard/hal/hal_io.c` mit genau einer Zeile dieser Art, bevor irgendein Pin angefasst wird:

```c
RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN | RCC_AHB1ENR_GPIOBEN | /* … */ RCC_AHB1ENR_GPIODEN | /* … */;
(void)RCC->AHB1ENR;
```

`RCC_AHB1ENR_GPIODEN` ist dabei nichts anderes als `1 << 3` — Bit 3 dieses Registers gehört zu Port D. Die zweite Zeile liest das Register wieder zurück und wirft den Wert weg. Das sieht sinnlos aus, ist es aber nicht: die Taktfreigabe wird erst einige Peripherietakte nach dem Schreiben wirksam, und das Rücklesen desselben Registers überbrückt genau diese Lücke, bevor die nächste Zeile den Port anfasst. Ohne `volatile` dürfte der Compiler genau dieses Rücklesen streichen — hier siehst du den Grund im Einsatz.

Der Kommentar im Quelltext hält außerdem fest, warum das gefahrlos ist: einen Takt einzuschalten ändert an keiner einzigen Pinrichtung etwas.

## Deine Aufgabe

Zerlege zwei Registernamen nach dem Muster, das du hier gelernt hast. Beide Namen zerlegen, nicht nur einen.

**Wo du arbeitest:** Antwort in das Textfeld an der Aufgabe · Datei öffnen `Strg`/`Cmd`+`P` · Aufgabe prüfen mit dem Knopf **Prüfen**.
