---
id: m2-00-hex-and-bits
title: Hexadezimal, Bits und Adressen
bloom: understand
objectives: [cz.mmio.registers]
requires: [m1-04-splash]
estimatedMinutes: 10
scaffold: worked
links:
  - { step: m2-01-memory-map }
  - { file: "targets/itsboard/hal/hal_io.c", line: 24 }
  - { doc: "docs/HARDWARE.md" }
sources: [targets/itsboard/hal/hal_io.c, targets/itsboard/hal/hal_gpio.h, docs/HARDWARE.md]
tasks:
  - id: address-arithmetic
    title: Sage die Adresse voraus, bevor du sie nachschlägst
    check: { type: predict, prompt: { en: "GPIOE sits 0x400 above GPIOD, and ODR has offset 0x14. Which address does GPIOE->ODR have?", de: "GPIOE liegt 0x400 über GPIOD, ODR hat den Offset 0x14. Welche Adresse hat GPIOE->ODR?" }, then: { type: command, cwd: ".", command: "grep -n 'define PERIPH_BASE\\|define AHB1PERIPH_BASE\\|define GPIOE_BASE\\|uint32_t ODR;' lib/cmsis_device_f4/Include/stm32f429xx.h", expectExitCode: 0 }, rubric: "Die Vorhersage nennt 0x40021014 oder rechnet nachvollziehbar 0x40020000 + 0x1000 + 0x14. Eine falsche Zahl mit richtiger Rechenkette zählt als bestanden, sofern die Abweichung nach dem Vergleich benannt wird.", bloom: understand }
socratic:
  - { trigger: "task:address-arithmetic:stuck", question: { en: "Two additions in hex, nothing else. What is AHB1PERIPH_BASE as a number?", de: "Zwei Additionen im Hexsystem, mehr nicht. Welche Zahl ist AHB1PERIPH_BASE?" }, hints: [ { en: "The table 'Where the numbers come from' above gives every value you need.", de: "Die Tabelle „Woher die Zahlen kommen“ weiter oben nennt jeden Wert, den du brauchst." }, { en: "Add in hex column by column, from the right; there is no carry in this sum.", de: "Addiere im Hexsystem spaltenweise von rechts; in dieser Summe gibt es keinen Übertrag." }, { en: "Write the prediction down even if you are unsure — the point of this task is the comparison afterwards, not a perfect guess.", de: "Schreib die Vorhersage auch dann hin, wenn du unsicher bist — diese Aufgabe lebt vom Vergleich danach, nicht vom perfekten Raten." } ] }
---
## Lernziel

Lies Zahlen, wie Hardware sie schreibt: hexadezimal, in Bits zerlegt, und mit einer Adresse aus Basis plus Abstand berechnet.

## Zuerst: Zahlen mit `0x` davor

Ab hier stehen ständig Zahlen wie `0x40020C18` im Text. Das `0x` heißt: die Zahl ist **hexadezimal** geschrieben, also im Sechzehnersystem. Sie zählt mit sechzehn Ziffern — `0` bis `9`, dann `a` bis `f` — statt mit zehn. `0x0a` ist zehn, `0x10` ist sechzehn, `0xff` ist 255.

Der Grund, warum Hardware so notiert wird: **eine Hexziffer ist genau vier Bits.** Ein Bit ist eine einzelne Ja/Nein-Stelle, und Hardware wird bitweise angesprochen. Damit ist jede Hexzahl ohne Rechnen in Bits lesbar:

| Hexziffer | Bits | | Hexziffer | Bits |
|---|---|---|---|---|
| `0` | `0000` | | `8` | `1000` |
| `1` | `0001` | | `9` | `1001` |
| `3` | `0011` | | `c` | `1100` |
| `7` | `0111` | | `f` | `1111` |

Ein gerechnetes Beispiel, das du in `m2-02-mmio-gpio` wieder brauchst. `0x0301` hat vier Hexziffern, jede steht für vier Bits:

```
  0     3     0     1     Hexziffern
0000  0011  0000  0001   je vier Bits
  ^     ^^    ^      ^
 15..12 11..8  7..4   3..0   Bitnummern
```

Zählt man die Stellen von **rechts** ab null durch, sind **Bit 0, Bit 8 und Bit 9** gesetzt. Rechnerisch: 1 + 256 + 512 = 769, und `0x0301` ist 769. Achte auf die Falle: die Ziffer `3` steht *nicht* für die Bits 0 und 1, sondern für die Bits 8 und 9 — welche Bits eine Hexziffer meint, hängt davon ab, an welcher Stelle sie steht.

Dazu ein Schreibweise, die überall auftaucht: `1 << 3` heißt „nimm die Zahl 1 und schiebe sie um drei Stellen nach links“. Aus `0001` wird `1000` — genau ein gesetztes Bit an Position 3. So schreibt man „das Bit mit der Nummer *n*“, ohne die Zahl auszurechnen.

## Woher die Zahlen kommen

Die Adressen sind nicht willkürlich, sondern Basis plus **Offset**. Ein Offset ist ein Abstand: die Zahl, die man auf eine Basisadresse addiert, um zu einem bestimmten Register zu kommen. Addiert wird im Hexsystem stellenweise von rechts, genau wie im Zehnersystem — solange keine Stelle über `f` hinauswächst, ändert sich nur die eine Stelle: `0x40020000 + 0x0C00` ergibt `0x40020C00`.

Alle Werte unten stehen in `lib/cmsis_device_f4/Include/stm32f429xx.h`:

| Name | Wert |
|---|---|
| `PERIPH_BASE` | `0x40000000` |
| `AHB1PERIPH_BASE` | `PERIPH_BASE + 0x00020000` = `0x40020000` |
| `GPIOD_BASE` | `AHB1PERIPH_BASE + 0x0C00` = `0x40020C00` |
| `RCC_BASE` | `AHB1PERIPH_BASE + 0x3800` = `0x40023800` |
| GPIO-Offsets | `MODER` `0x00`, `IDR` `0x10`, `ODR` `0x14`, `BSRR` `0x18` |
| `AHB1ENR`-Offset in RCC | `0x30` |

Daraus folgt `RCC_AHB1ENR` = `0x40023800 + 0x30` = `0x40023830`. Die GPIO-Ports liegen jeweils `0x400` auseinander, deshalb ist GPIOA bei `0x40020000`, GPIOB bei `0x40020400` und so weiter bis GPIOD bei `0x40020C00`.

Statt der rohen Casts benutzt die Firmware die Kurzschreibweise des Herstellerheaders: `RCC->AHB1ENR` und `GPIOD->BSRR`. Das ist **dasselbe** — `RCC` ist als Zeiger auf eine Struktur an der Adresse `0x40023800` definiert, und `__IO` im Header ist nichts anderes als `volatile`. Die Pfeilschreibweise spart nur das Rechnen.

## Deine Aufgabe

Sage eine Adresse voraus, bevor du sie nachschlägst, und vergleiche danach mit dem Herstellerheader. Schreib die Vorhersage auch dann hin, wenn du unsicher bist — diese Aufgabe lebt vom Vergleich, nicht vom Raten.

**Wo du arbeitest:** Vorhersage in das Textfeld an der Aufgabe · Datei öffnen `Strg`/`Cmd`+`P` · Aufgabe prüfen mit dem Knopf **Prüfen** an der Aufgabe.
