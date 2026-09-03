---
id: m2-00-mmio-primer
title: Wie Software an einen Pin kommt — Adressen, volatile, Registernamen
bloom: understand
objectives: [cz.mmio.registers]
requires: [m1-04-splash]
estimatedMinutes: 20
scaffold: worked
links:
  - { step: m2-01-memory-map }
  - { file: "targets/itsboard/hal/hal_io.c", line: 24 }
  - { doc: "docs/HARDWARE.md" }
sources: [targets/itsboard/hal/hal_io.c, targets/itsboard/hal/hal_gpio.h, docs/HARDWARE.md]
tasks:
  - id: address-arithmetic
    title: Sage die Adresse voraus, bevor du sie nachschlägst
    check: { type: predict, prompt: { en: "GPIOD sits at AHB1PERIPH_BASE + 0x0C00 and BSRR is at offset 0x18. Which address does GPIOD->BSRR have?", de: "GPIOD liegt bei AHB1PERIPH_BASE + 0x0C00, BSRR bei Offset 0x18. Welche Adresse hat GPIOD->BSRR?" }, then: { type: command, cwd: ".", command: "grep -n 'define AHB1PERIPH_BASE\\|define GPIOD_BASE\\|define RCC_BASE' lib/cmsis_device_f4/Include/stm32f429xx.h", expectExitCode: 0 }, rubric: "Die Vorhersage nennt 0x40020C18 oder rechnet nachvollziehbar 0x40020000 + 0x0C00 + 0x18. Eine falsche Zahl mit richtiger Rechenkette zählt als bestanden, sofern die Abweichung nach dem Vergleich benannt wird.", bloom: understand }
  - id: why-volatile
    title: Erkläre, was ohne volatile passiert
    check: { type: question, prompt: { en: "Why does a register access need volatile?", de: "Warum braucht ein Registerzugriff volatile?" }, rubric: "Ohne volatile darf der Compiler den Zugriff wegoptimieren oder zusammenfassen, weil er im Quelltext niemanden sieht, der den Wert liest oder schreibt. Bei Hardware ist der Zugriff selbst die Wirkung, deshalb muss jeder Zugriff genau so und genau so oft stattfinden, wie er dasteht.", bloom: understand }
  - id: register-naming
    title: Zerlege den Namen RCC_AHB1ENR
    check: { type: question, prompt: { en: "The name RCC_AHB1ENR has three parts. What does each one say?", de: "Der Name RCC_AHB1ENR besteht aus drei Teilen. Was sagt jeder aus?" }, rubric: "RCC = die Peripherieeinheit (Reset and Clock Control, die Takte verteilt), AHB1 = der interne Bus, an dem die betroffenen Einheiten hängen, ENR = die Funktion des Registers (Enable Register, hier wird eingeschaltet). Zusammen: das Einschaltregister für alles am Bus AHB1.", bloom: understand }
socratic:
  - { trigger: "task:address-arithmetic:stuck", question: { en: "Two additions in hex, nothing else. What is AHB1PERIPH_BASE as a number?", de: "Zwei Additionen im Hexsystem, mehr nicht. Welche Zahl ist AHB1PERIPH_BASE?" }, hints: [ { en: "The table 'Where the numbers come from' above gives every value you need.", de: "Die Tabelle „Woher die Zahlen kommen“ weiter oben nennt jeden Wert, den du brauchst." }, { en: "Add in hex column by column, from the right; there is no carry in this sum.", de: "Addiere im Hexsystem spaltenweise von rechts; in dieser Summe gibt es keinen Übertrag." }, { en: "Write the prediction down even if you are unsure — the point of this task is the comparison afterwards, not a perfect guess.", de: "Schreib die Vorhersage auch dann hin, wenn du unsicher bist — diese Aufgabe lebt vom Vergleich danach, nicht vom perfekten Raten." } ] }
  - { trigger: "question:why-volatile:weak", question: { en: "Imagine the compiler reading your code: it sees a value written and never read again. What is it allowed to do?", de: "Stell dir den Compiler beim Lesen deines Codes vor: er sieht einen Wert, der geschrieben und nie wieder gelesen wird. Was darf er damit tun?" }, hints: [ { en: "The compiler optimises for the program it can see. It cannot see the pin.", de: "Der Compiler optimiert für das Programm, das er sehen kann. Den Pin sieht er nicht." }, { en: "The section 'volatile: the word that keeps the access alive' argues it with the LED example.", de: "Der Abschnitt „volatile: das Wort, das den Zugriff am Leben hält“ führt es am LED-Beispiel vor." }, { en: "The key sentence has two halves: what the compiler is allowed to remove, and why with hardware the access itself is the effect.", de: "Der entscheidende Satz hat zwei Hälften: was der Compiler entfernen darf, und warum bei Hardware der Zugriff selbst die Wirkung ist." } ] }
  - { trigger: "question:register-naming:weak", question: { en: "Split the name at the underscores first. How many parts do you get, and which one is a bus?", de: "Zerleg den Namen zuerst an den Unterstrichen. Wie viele Teile bekommst du, und welcher davon ist ein Bus?" }, hints: [ { en: "Compare it with RCC_APB1ENR and RCC_AHB1RSTR: what stays, what changes?", de: "Vergleich ihn mit RCC_APB1ENR und RCC_AHB1RSTR: was bleibt, was ändert sich?" }, { en: "The table 'How the names are built' above has one row per part.", de: "Die Tabelle „Wie die Namen gebaut sind“ weiter oben hat eine Zeile je Teil." }, { en: "The last part is always the register's job. ENR is short for enable register; RSTR would be the reset register of the same bus.", de: "Der letzte Teil ist immer die Aufgabe des Registers. ENR steht für Enable Register; RSTR wäre das Reset-Register desselben Busses." } ] }
---
## Lernziel

Verstehe, wie ein Stück C-Code überhaupt eine Spannung an einem Beinchen des Chips verändert — und wie man die Namen liest, die dabei auftauchen.

## Zuerst: Zahlen mit `0x` davor

Ab hier stehen ständig Zahlen wie `0x40020C18` im Text. Das `0x` heißt: die Zahl ist **hexadezimal** geschrieben, also im Sechzehnersystem. Sie zählt mit sechzehn Ziffern — `0` bis `9`, dann `a` bis `f` — statt mit zehn. `0x0a` ist zehn, `0x10` ist sechzehn, `0xff` ist 255.

Der Grund, warum Hardware so notiert wird: **eine Hexziffer ist genau vier Bits.** Ein Bit ist eine einzelne Ja/Nein-Stelle, und Hardware wird bitweise angesprochen. Damit ist jede Hexzahl ohne Rechnen in Bits lesbar:

| Hexziffer | Bits | | Hexziffer | Bits |
|---|---|---|---|---|
| `0` | `0000` | | `8` | `1000` |
| `1` | `0001` | | `9` | `1001` |
| `3` | `0011` | | `c` | `1100` |
| `7` | `0111` | | `f` | `1111` |

Ein gerechnetes Beispiel, das du in `m2-02` wieder brauchst: `0x0301` in Bits ist `0000 0011 0000 0001`. Zählt man die Stellen von **rechts** ab null, sind Bit 0, Bit 1 und Bit 8 gesetzt.

Dazu ein Schreibweise, die überall auftaucht: `1 << 3` heißt „nimm die Zahl 1 und schiebe sie um drei Stellen nach links“. Aus `0001` wird `1000` — genau ein gesetztes Bit an Position 3. So schreibt man „das Bit mit der Nummer *n*“, ohne die Zahl auszurechnen.

## Ein Mikrocontroller hat keinen Befehl „mach Pin 3 an“

Der Prozessorkern kann rechnen, springen, laden und speichern. Mehr nicht. Er hat keine Anweisung für Leuchtdioden.

Der Trick ist, dass die Hardwareteile des Chips — die GPIO-Ports, die Timer, die serielle Schnittstelle — auf **Adressen** gelegt sind, genau wie Speicherplätze. Schreibt die CPU eine Zahl an die Adresse `0x40020C18`, verändert das keine Variable, sondern Spannungen an echten Beinchen des Bausteins. Liest sie von `0x40020C10`, bekommt sie zurück, welche Spannung dort gerade anliegt.

Genau das heißt **Memory-mapped I/O**: Hardware bedienen, indem man an eine Adresse schreibt oder von ihr liest. Ein solcher Speicherplatz mit Hardwarewirkung heißt **Register**. Ein *Store* ist dabei nichts weiter als der Maschinenbefehl, der einen Wert an eine Adresse schreibt.

## Wie man das in C hinschreibt

```c
*(volatile uint32_t *)0x40020C18 = (1u << 3);
```

Von innen nach außen gelesen:

| Teil | Bedeutung |
|---|---|
| `0x40020C18` | die Adresse, eine ganz gewöhnliche Zahl |
| `(uint32_t *)` | „behandle diese Zahl als Zeiger auf einen 32-Bit-Wert“ |
| `volatile` | „und optimiere den Zugriff nicht weg“ (gleich mehr dazu) |
| `*…` | der Stern ganz vorn: „und jetzt schreibe oder lies an dieser Stelle“ |
| `(1u << 3)` | der Wert: genau Bit 3 gesetzt |

Wenn dir diese Zeile im Quelltext der Firmware begegnet — auch in der Form `#define GPIOD_BSRR (*(volatile uint32_t *)0x40020C18)`, damit man danach einfach `GPIOD_BSRR = …` schreiben kann —, dann ist es immer dasselbe: eine Zahl wird zur Adresse erklärt, und an dieser Adresse sitzt Hardware.

## `volatile`: das Wort, das den Zugriff am Leben hält

`volatile` ist die wichtigste Zutat, und es ist die einzige, die man nicht sehen kann, wenn sie fehlt.

Ein Compiler optimiert für das Programm, das er vor sich hat. Sieht er, dass an eine Adresse geschrieben und von dort nie wieder gelesen wird, darf er den Schreibvorgang streichen — er ändert ja scheinbar nichts. Sieht er dieselbe Adresse zweimal hintereinander gelesen, darf er das zweite Lesen weglassen und den ersten Wert wiederverwenden.

Bei gewöhnlichen Variablen ist beides richtig. Bei Hardware ist es fatal, denn **der Zugriff selbst ist die Wirkung**: der Schreibvorgang *ist* das Einschalten der LED, und beim zweiten Lesen kann ein anderer Wert dastehen, weil in der Zwischenzeit jemand einen Taster gedrückt hat. `volatile` sagt dem Compiler: „Hier ist etwas im Spiel, das du nicht siehst. Führe jeden Zugriff genau so und genau so oft aus, wie er dasteht.“

Ohne `volatile` verschwindet der Schreibvorgang, und die LED bleibt dunkel — ohne Fehlermeldung, ohne Warnung. Der Code sieht richtig aus und tut nichts.

## Wie die Namen gebaut sind

Niemand behält Adressen wie `0x40023830` im Kopf, also gibt der Chiphersteller ihnen Namen. Die Namen sind nach einem festen Muster gebaut, und wer das Muster kennt, kann jeden weiteren Namen lesen, ohne ihn nachzuschlagen:

| Teil | Beispiel | Was er sagt |
|---|---|---|
| Peripherie | `RCC` | *Reset and Clock Control* — die Einheit, die alle Takte verteilt |
| Bus | `AHB1` | das interne Leitungsbündel, an dem die betroffenen Einheiten hängen |
| Register | `ENR` | *Enable Register* — die Aufgabe dieses Registers: hier wird eingeschaltet |

`RCC_AHB1ENR` heißt also wörtlich: **„das Einschaltregister für alles, was am Bus AHB1 hängt“.** Nach demselben Muster ist `RCC_APB1ENR` das Einschaltregister des langsameren Busses APB1 und `RCC_AHB1RSTR` das Reset-Register desselben AHB1.

Auch die Registernamen der GPIO-Ports folgen dem Muster ihrer Aufgabe: `MODER` = *mode register* (Richtung eines Pins), `IDR` = *input data register* (was gerade anliegt), `ODR` = *output data register* (was ausgegeben wird), `BSRR` = *bit set/reset register* (einzelne Bits setzen oder löschen, ohne die anderen zu lesen).

## Woher die Zahlen kommen

Die Adressen sind nicht willkürlich, sondern Basis plus Offset. Alle Werte stehen in `lib/cmsis_device_f4/Include/stm32f429xx.h`:

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

## Die Regel, an der die meisten zuerst scheitern

Ein Peripherieteil, dessen **Takt nicht eingeschaltet ist, reagiert überhaupt nicht.** Ein Schreibzugriff verpufft, ein Lesezugriff liefert Nullen — kein Fault, keine Warnung, kein Hinweis. Das ist der häufigste Anfängerfehler auf diesem Chip, und er sieht aus wie ein kaputtes Board.

Deshalb beginnt `cads_hal_io_init()` in `targets/itsboard/hal/hal_io.c` mit genau einer Zeile dieser Art, bevor irgendein Pin angefasst wird:

```c
RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN | RCC_AHB1ENR_GPIOBEN | /* … */ RCC_AHB1ENR_GPIODEN | /* … */;
(void)RCC->AHB1ENR;
```

`RCC_AHB1ENR_GPIODEN` ist dabei nichts anderes als `1 << 3` — Bit 3 dieses Registers gehört zu Port D. Die zweite Zeile liest das Register wieder zurück und wirft den Wert weg. Das sieht sinnlos aus, ist es aber nicht: der Schreibvorgang braucht ein paar Takte, bis er auf dem Bus angekommen ist, und das Rücklesen erzwingt, dass er fertig ist, bevor die nächste Zeile den Port anfasst. Ohne `volatile` dürfte der Compiler genau dieses Rücklesen streichen — hier siehst du den Grund im Einsatz.

Der Kommentar im Quelltext hält außerdem fest, warum das gefahrlos ist: einen Takt einzuschalten ändert an keiner einzigen Pinrichtung etwas.

## Deine Aufgabe

Drei kurze Aufgaben, jede für sich. Zuerst sagst du eine Adresse voraus und vergleichst sie dann mit dem, was im Herstellerheader steht. Dann erklärst du in eigenen Worten, was ohne `volatile` passiert. Zuletzt zerlegst du den Namen `RCC_AHB1ENR` in seine drei Teile.
