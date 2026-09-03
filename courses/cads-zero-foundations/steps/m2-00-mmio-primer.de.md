---
id: m2-00-mmio-primer
title: Wie Software an einen Pin kommt
bloom: understand
objectives: [cz.mmio.registers]
requires: [m2-00-hex-and-bits]
estimatedMinutes: 12
scaffold: worked
links:
  - { step: m2-01-memory-map }
  - { file: "targets/itsboard/hal/hal_io.c", line: 24 }
  - { doc: "docs/HARDWARE.md" }
sources: [targets/itsboard/hal/hal_io.c, targets/itsboard/hal/hal_gpio.h, docs/HARDWARE.md]
tasks:
  - id: why-volatile
    title: Erkläre, was ohne volatile passiert
    check: { type: question, prompt: { en: "Why does a register access need volatile?", de: "Warum braucht ein Registerzugriff volatile?" }, rubric: "Ohne volatile darf der Compiler den Zugriff wegoptimieren oder zusammenfassen, weil er im Quelltext niemanden sieht, der den Wert liest oder schreibt. Bei Hardware ist der Zugriff selbst die Wirkung, deshalb muss jeder Zugriff genau so und genau so oft stattfinden, wie er dasteht.", bloom: understand }
socratic:
  - { trigger: "question:why-volatile:weak", question: { en: "Imagine the compiler reading your code: it sees a value written and never read again. What is it allowed to do?", de: "Stell dir den Compiler beim Lesen deines Codes vor: er sieht einen Wert, der geschrieben und nie wieder gelesen wird. Was darf er damit tun?" }, hints: [ { en: "The compiler optimises for the program it can see. It cannot see the pin.", de: "Der Compiler optimiert für das Programm, das er sehen kann. Den Pin sieht er nicht." }, { en: "The section 'volatile: the word that keeps the access alive' argues it with the LED example.", de: "Der Abschnitt „volatile: das Wort, das den Zugriff am Leben hält“ führt es am LED-Beispiel vor." }, { en: "The key sentence has two halves: what the compiler is allowed to remove, and why with hardware the access itself is the effect.", de: "Der entscheidende Satz hat zwei Hälften: was der Compiler entfernen darf, und warum bei Hardware der Zugriff selbst die Wirkung ist." } ] }
---
## Lernziel

Verstehe, wie ein Stück C-Code eine Spannung an einem Beinchen des Chips verändert — und warum ein Wort darin, `volatile`, darüber entscheidet, ob überhaupt etwas passiert.

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

Und genauso wichtig ist, was `volatile` **nicht** tut: es schützt den Zugriff vor dem Compiler, macht ihn aber nicht unteilbar. Zwei Zugriffe bleiben zwei Zugriffe, und dazwischen kann etwas anderes laufen. Das ist der Grund für das Register `BSRR` in `m2-02-mmio-gpio`.

Ohne `volatile` verschwindet der Schreibvorgang, und die LED bleibt dunkel — ohne Fehlermeldung, ohne Warnung. Der Code sieht richtig aus und tut nichts.

## Deine Aufgabe

Erkläre in eigenen Worten, was ohne `volatile` passiert. Ein Satz zu dem, was der Compiler entfernen darf, und einer dazu, warum bei Hardware der Zugriff selbst die Wirkung ist.

**Wo du arbeitest:** Antwort in das Textfeld an der Aufgabe · Aufgabe prüfen mit dem Knopf **Prüfen**.
