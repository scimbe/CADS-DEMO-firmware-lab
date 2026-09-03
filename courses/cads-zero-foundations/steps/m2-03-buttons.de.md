---
id: m2-03-buttons
title: Taster, Eingänge und eine Invertierung
bloom: analyze
objectives: [cz.gpio.buttons]
requires: [m2-02-mmio-gpio]
estimatedMinutes: 12
links:
  - { step: m2-04-safety }
  - { doc: "docs/explanation/input-scheme.md" }
  - { doc: "docs/HARDWARE.md" }
  - { file: "targets/itsboard/hal/hal_io.c", line: 53 }
sources: [docs/HARDWARE.md, docs/explanation/input-scheme.md, targets/itsboard/hal/hal_io.c, core/cads_hal.h]
tasks:
  - id: find-pin
    title: Finde den Pin eines Tasters mit dem Port-Watcher
    check: { type: manual }
  - id: why-invert
    title: Erkläre die Verdrahtung und die Invertierung
    check: { type: question, prompt: { en: "S0..S7 are wired active-low with internal pull-ups, yet cads_hal_adapter_inputs() returns a set bit for 'pressed'. Why are pull-ups the correct configuration, where exactly does the inversion happen, and why is it done there and nowhere else? Also: why are INT0..INT5 not buttons?", de: "S0..S7 sind active-low mit internen Pull-ups verdrahtet, dennoch liefert cads_hal_adapter_inputs() ein gesetztes Bit für 'gedrückt'. Warum sind Pull-ups die richtige Konfiguration, wo genau findet die Invertierung statt, und warum dort und nirgends sonst? Außerdem: Warum sind INT0..INT5 keine Taster?" }, rubric: "Ein Druck zieht die Leitung auf Masse (der GPIOTest des Herstellers wartet, bis das GPIOF->IDR-Bit LOW wird), also muss der Ruhezustand per Pull-up auf High gehalten werden. Die Invertierung ist ein ~IDR in cads_hal_adapter_inputs() in hal_io.c; in der HAL sieht portabler Code 'Bit gesetzt = gedrückt' unabhängig von der Polarität. INT0..5 (PG0..5, auf dem Aufdruck AUX) sind ungepufferte Allzweck-Eingänge, die der Herstellertest mit einer Drahtbrücke prüft, kein Tasterblock.", bloom: analyze }
socratic:
  - { trigger: "task:find-pin:stuck", question: { en: "The watcher only reports changes. Did you press the button during the watch window, and which port letter moved?", de: "Der Watcher meldet nur Änderungen. Hast du den Taster während des Beobachtungsfensters gedrückt, und welcher Port-Buchstabe hat sich bewegt?" }, hints: [ { en: "Run 'w 10', then press one button within ten seconds; the console prints the port and the bit that changed.", de: "Führe 'w 10' aus und drücke innerhalb von zehn Sekunden einen Taster; die Konsole druckt Port und Bit, das sich geändert hat." }, { en: "Buttons are on port F: pressing S3 pulls PF3 low, so the IDR bit clears.", de: "Die Taster liegen an Port F: S3 zieht PF3 auf Low, das IDR-Bit wird also gelöscht." }, { en: "'s 10' streams the debounced S0..S7 state with key names if you want the mapping without reading raw bits.", de: "'s 10' streamt den entprellten Zustand S0..S7 mit Tastennamen, wenn du die Zuordnung ohne Rohbits willst." } ] }
---
## Lernziel

Lies die Taster und Eingangsleitungen des Adapters korrekt und verstehe, warum die Firmware die Verdrahtung des Boards an genau einer Stelle invertiert.

## Was die Leitungen sind

Der ITS-Adapter führt vierzehn Eingangsleitungen zum MCU (`docs/HARDWARE.md`):

| Name | Port | Was es ist |
|---|---|---|
| IN0..IN7 (S0..S7) | PF0..PF7 | die acht Taster, **active low**, mit Pull-up |
| INT0..INT5 | PG0..PG5 | Allzweck-Eingänge, EXTI-fähig, mit Pull-up — **keine Taster** |

Die Tasterzuordnung wurde aus dem Hardwaretest des Herstellers (`ITS-BRD/its_brd_tst`, `GPIOTest`) abgeleitet, der auf jeden Taster mit `while ((GPIOF->IDR & (1 << i)) != 0) {}` wartet — also darauf, dass die Leitung **Low** wird. Ein Druck zieht die Leitung auf Masse. Der Ruhezustand muss also auf High gehalten werden, und interne Pull-ups sind die richtige Konfiguration.

INT0..INT5 sind etwas anderes. Derselbe Test prüft sie, indem er den Bediener bittet, OUT0 per Draht auf INTx zu brücken; der Adapter-Schaltplan zeigt sie ungepuffert, direkt vom MCU zum Stecker `CN3`, auf dem Aufdruck als `AUX0..5` beschriftet. Jeder Entwurf, der sie als zweite Tasterreihe behandelt, ist falsch.

## Eine Invertierung, in der HAL

`core/cads_hal.h` verspricht:

```c
/** IN0..IN7 on GPIOF, active low (pulled up). Bit n = INn. */
uint8_t cads_hal_adapter_inputs(void);
```

und `docs/reference/hal.md` ergänzt den entscheidenden Vertrag: die Funktion **invertiert die active-low-Verdrahtung des Boards bereits**, sodass ein gesetztes Bit „gedrückt" bedeutet, unabhängig von der Polarität der Hardware. Auf dem Board erledigt `targets/itsboard/hal/hal_io.c` das in einer Zeile — das Komplement des IDR des Ports, auf acht Bits maskiert. Diese Invertierung lebt hier und nirgends sonst. Der Input-Service, die Softkey-Leiste, jede App: alle sehen „Bit gesetzt = gedrückt" und liefen unverändert auf einem active-high verdrahteten Board.

Das ist dasselbe Argument wie auf der Ausgangsseite im vorigen Step, aus Eingangsrichtung gesehen: die HAL nimmt die elektrische Tatsache auf, damit portabler Code sie nie kennen muss.

## Die Pins live beobachten

Zwei Explorer-Befehle machen das sichtbar:

- `w <sec>` beobachtet das Eingaberegister jedes Ports auf Änderungen — drücke während des Fensters einen Taster, und die Konsole nennt Port und Bit, das sich bewegt hat. Das ist der schnellste Weg, den Pin eines Tasters zu finden, und so wurde die Zuordnung an dieser Bank verifiziert.
- `s <sec>` streamt den entprellten Zustand S0..S7 mit Tastennamen, damit du die Zuordnung Taster-zu-Label ohne Neubau bestätigen kannst.
- `i` gibt die IDR aller Ports einmal aus, als statische Grundlinie.

## Deine Aufgabe

Führe `w 10` aus und drücke während der Beobachtung einen Taster; notiere, welcher Port und welches Bit sich ändern. Beantworte dann die Analysefrage: warum Pull-ups, wo die Invertierung lebt und warum dort, und was INT0..5 tatsächlich sind.
