# Review Runde 2 — die überarbeiteten Steps

**Datum:** 2026-09-03 · **Strang:** `stream-review` · **Grundlage:** [`round-1-firmware.md`](round-1-firmware.md)

Dieselben drei Personas haben den überarbeiteten Kurs erneut gelesen: **P** = skeptischer Professor,
**S+** = stärkste Studierende, **S−** = schwächste Studierende. Alle drei haben diesmal gemessen statt geschätzt,
und alle drei haben Fehler gefunden, die durch die Überarbeitung **neu entstanden** sind. Dieser Bericht hält
fest, was erreicht wurde, was neu kaputt ging, was daraufhin behoben wurde und was offen bleibt.

## Was die Messungen sagen

| Kennzahl | Runde 1 | Runde 2 |
|---|---|---|
| Steps (Foundations) | 41 | 42 |
| `manual`-Checks | 21 | 1 |
| ausführbare Checks (Anteil) | 33 % | 50 % |
| Steps ohne jeden ausführbaren Check | 27 von 41 | 4 von 48 |
| Rubrik/Fließtext-Überlappung, Median | 72 % | 34,7 % |
| Rubrik/Fließtext-Überlappung, Maximum | 86 % | 62,7 % |
| `analyze`/`evaluate`-Rubriken über 70 % | die Mehrheit | 0 |
| `hints[2]`/Rubrik-Überlappung, Median | — | 21,1 % |
| Stufe-3-Hinweise mit einzusetzender Codezeile | mehrere belegt | 0 |
| `question`-Prompts mit ≥ 3 Teilfragen | 19 von 47 | 0 |
| Tasks ohne eigenen `socratic`-Eintrag | 17 von 33 (M0–M2) | 0 von 135 |
| Steps mit `scaffold` | 0 | 48 von 48 |
| `recallFrom` / `misconceptions` / `predict` | 0 / 0 / 0 | 18 / 24 / 11 |

Die Kernkritik der ersten Runde ist damit messbar beantwortet: Die Rubrikantworten stehen nicht mehr im Steptext,
die Häkchen sind weg, jede Aufgabe hat eine eigene Hinweisleiter, und keine Hinweisleiter endet mehr in der
Lösung. P formuliert es so: „Ich habe in Runde 1 geschrieben, der Kurs sei Abschrift mit Umformulierungsaufwand.
Diesen Satz nehme ich zurück."

## Der Befund, der alles andere überlagert

### R2-1 — Die Runtime verwirft 28 der 48 Steps stillschweigend
**Persona:** alle drei · **Schwere:** blocker · **Ort:** `extensions/cads-tutor/src/types.ts`, `schema.ts`, `loader.ts`

**Beleg:** `types.ts` listet `board, task, build, fileMatches, fileNotMatches, symbolInElf, flash, serialExpect,
debugStop, question, manual, all, any` — **nicht** `command`, **nicht** `predict`. `schema.ts` wirft bei einem
unbekannten Typ, `loader.ts` überspringt daraufhin die ganze Datei (`continue`).

**Befund:** Der gesamte Umbau — 39 `command`-Checks, 11 `predict`-Checks, der neue Primer, fünf von sechs
Projekt-Steps — läuft gegen eine Schnittstelle, die die ausgelieferte Runtime nicht kennt. Modul M1 wäre komplett
leer. S− bringt es auf den Punkt: sie steigt in Runde 2 an *derselben* Stelle aus wie in Runde 1 (`m2-02`, die
Maske `0x0301`), weil der Hinweis auf `m2-00` verweist und `m2-00` in ihrer Kursliste fehlt. Die Rettung war
geschrieben, aber nicht auslieferbar. P nennt es einen Organisationsbefund: zwei Stränge, die aneinander vorbei
arbeiten, mit einem Validator dazwischen, der beiden recht gibt.

**Behoben in diesem Strang:**
1. `scripts/validate-courses.py` liest `CHECK_TYPES` jetzt direkt aus `extensions/cads-tutor/src/types.ts` und
   warnt je Check, den die Runtime nicht kennt („the runtime will DROP this whole step until it implements the
   type"). Es gibt keine zweite Liste zu pflegen; sobald die Runtime nachzieht, verschwinden die Warnungen von
   selbst. Abschaltbar mit `--no-runtime-check`. Bewusst Warnung und nicht Fehler: die Packs sind SPEC-konform
   (Addendum v1.1), die Lücke liegt bei der Runtime.
2. Ein selbstverschuldeter Ausfall ist beseitigt: `m0-01-welcome` trug einen Link
   `{ url: "command:workbench.action.openWalkthrough?…" }`, und `schema.ts` verlangt `^https?://` — damit war
   ausgerechnet der allererste Step des Kurses verworfen. Der Link ist raus, der Walkthrough steht als Satz im
   Fließtext.

**Offen, an `tutor3` gemeldet:** `command` und `predict` implementieren; unbekannte Check-Typen dürfen nie einen
ganzen Step verschlucken (Warnung plus Platzhalter im Panel); `test/realpacks.test.ts` in die CI.

## Neu entstandene Fehler — alle behoben

Die Überarbeitung lief arbeitsteilig, und genau dort entstanden Fehler. Jeder wurde von mindestens einer Persona
mit Beleg gefunden und anschließend an der Firmware verifiziert.

### R2-2 — Falsche Bitrechnung im Primer, weitergereicht nach m2-02
**Persona:** S+ · **Schwere:** blocker · **Ort:** `m2-00-mmio-primer`, `m2-02-mmio-gpio`

`0x0301` = 769 = 2⁹ + 2⁸ + 2⁰, gesetzt sind also **Bit 0, 8 und 9**. Primer und Rubrik nannten „Bit 0, Bit 1 und
Bit 8"; die m2-02-Rubrik war zusätzlich in sich widersprüchlich (Bits 0/1/8 → OUT0/OUT1/OUT9). Ausgerechnet das
eine vorgerechnete Beispiel des Anfängersteps war falsch, und die zugehörige Rubrik hätte korrekt rechnende
Studierende durchfallen lassen. *Anmerkung:* dieselbe Verwechslung stand bereits in der Fassung vor Runde 1
(„PD0, PD1 und PE1"), sie ist also nicht durch den Umbau entstanden, aber durch ihn verdoppelt worden.

**Behoben:** Primer rechnet die Ziffernstellen jetzt als beschriftetes Schema vor (`15..12 / 11..8 / 7..4 / 3..0`)
und nennt die Falle ausdrücklich; Rubrik korrigiert auf OUT0, OUT8, OUT9 und verwirft die alte Lesart namentlich.

### R2-3 — Die BSRR/ODR-Vertiefung stellte die Rollen vertauscht
**Persona:** S+ · **Schwere:** blocker · **Ort:** `m2-02-mmio-gpio`, Task `bsrr-vs-odr`

Der Prompt ließ einen Interrupt über ODR schreiben, während der Hauptcode BSRR schreibt — in dieser Richtung geht
**nichts** verloren, weil Thread-Code auf einem Cortex-M einen ISR nicht verdrängen kann. Wer das richtig erkannte,
fiel durch. Die Rubrik unterstellte dem Hauptcode zugleich ein Read-Modify-Write, das der Prompt ihm abgesprochen
hatte.

**Behoben:** Die Frage ist umgedreht und an die Firmware verankert — `cads_gpio_toggle()` in
`targets/itsboard/hal/hal_gpio.h` ist `port->ODR ^= (1u << pin)`, ein echtes Read-Modify-Write. Die Rubrik verlangt
jetzt zusätzlich die **Asymmetrie** (ISR verdrängt Thread, nie umgekehrt); genau das macht aus einer
Auswendigfrage eine Analysefrage. Interrupt und Nebenläufigkeit werden im selben Step erstmals erklärt (S−: beide
Begriffe waren neu und ungeklärt).

### R2-4 — Der englische m2-02-Text war der Stand aus Runde 1
**Persona:** S+ · **Schwere:** blocker

Die DE-Fassung wurde umgeschrieben, die EN-Fassung nicht — ein Skriptlauf war nach der deutschen Datei
abgebrochen. Folge: der englische Leser bekam die dritte Aufgabe ohne Vorbereitung und fand ihre Antwort
(„cannot lose a bit") drei Absätze darüber. **Behoben**; DE und EN sind wieder deckungsgleich.

### R2-5 — Watchdog-Periode: eine falsche Zahl aus der Firmware in die Musterlösung
**Persona:** P · **Schwere:** major · **Ort:** `m4-04-iwdg-watchdog`, weitergereicht nach `m6-01-littlefs`

Die Rubrik rechnete erst richtig (32 000 / 64 = 500 Hz) und erklärte dann „2,048 ms je Tick, also etwa 2,048 s"
für genauer. 64 / 32 000 s sind 2,0 ms; 2,048 ms setzte einen LSI von 31,25 kHz voraus. Wer korrekt rechnete,
wurde bestraft. Die Zahl stammt aus einem Kommentar in `targets/itsboard/hal/hal_watchdog.c` — der Kurs hatte
einen Firmwarefehler ungeprüft zur Musterlösung gemacht.

**Behoben:** 2,0 ms / 2,0 s in beiden Steps und beiden Sprachen. Der Widerspruch ist jetzt **die Aufgabe**: der
Step zitiert den Kommentar und fragt, welche der beiden Zahlen aus den angegebenen Werten folgt und welche
LSI-Frequenz der Kommentar bräuchte, um recht zu haben. Wer 2,048 s ungeprüft übernimmt, besteht nicht.

### R2-6 — Prioritätsinversion mit der falschen mittleren Task
**Persona:** S+ · **Schwere:** major · **Ort:** `m4-03-mutex-spi-bus`

Der Step erklärte die ui-Task zur unbeteiligten mittleren Task („Sie fasst den Bus gar nicht an"). Tatsächlich ist
der Bus ihre einzige Arbeit: `cads_ui_task()` nimmt denselben Mutex und kann den Halter gar nicht verdrängen. Der
Zusatz „auf diesem Board ist die mittlere Task ausgerechnet die mit dem 448-ms-Flush" machte es doppelt falsch —
diese 448 ms sind die Zeit, in der `ui` den Bus **hält**.

**Behoben:** Der Abschnitt sagt jetzt, was wirklich passiert: alle drei Tasks nehmen denselben Mutex, die Inversion
ist auf die kritische Sektion von `console` begrenzt, eine unbeteiligte mittlere Task gibt es auf diesem Board
nicht — eine hypothetische vierte würde die Schranke aufheben. Die Frage „Wie heißt das Phänomen?", deren Antwort
zweimal fett als Überschrift darüberstand, ist durch die Frage nach der Schranke ersetzt.

**Nebenbefund, der ein Runde-1-Finding widerlegt:** A13 behauptete, ein rekursiver FreeRTOS-Mutex habe keine
Prioritätsvererbung. Das ist für diese Codebasis falsch. `queue.c` leitet auch rekursive Mutexe durch
`prvInitialiseMutex()`, setzt `uxQueueType = queueQUEUE_IS_MUTEX` und ruft in `xQueueSemaphoreTake()`
`xTaskPriorityInherit()`. Die Vererbung hängt am **Mutex-Sein**, nicht an der Rekursion. Der Kurs schreibt es
jetzt korrekt und markiert „weil rekursiv" ausdrücklich als falsche Antwort. Auch die Rollen aus dem
Runde-1-Vorschlag waren vertauscht: `input` = `CadsPriorityHigh` (5), `ui` = `Normal` (3), `console` = `Low` (1).

### R2-7 — Weitere verifizierte Sachfehler
**Persona:** S+, P · **Schwere:** major/minor · alle behoben

- `m3-05`: „genau zwei echte ISR-Handler" — es sind drei (`USART3`, `DMA2_Stream3`, `USART6` in `hal_uart_wifi.c`);
  jetzt als Tabelle mit Datei und Priorität, samt Hinweis, dass die schwachen Aliase der Vektortabelle nicht zählen.
- `m3-05`: „warum maskierte `BASEPRI = 0x50` *ausgerechnet* den DMA-Interrupt" — die Konsolen-UART auf Priorität 8
  war ebenso maskiert. Die Frage nennt jetzt beide Prioritäten vorab und verlangt die Wartekette als Antwort:
  `cads_hal_spi_wait()` dreht auf ein Flag, das ausschließlich der maskierte Handler zurücksetzt.
- `m7-05`: verwies für die Zahlentabelle auf `m3-05` und `docs/reference/measurements.md`; sie steht in
  `docs/explanation/pa7-conflict.md`. Klassisches `recallFrom`-Risiko — Absatz gekürzt, Zeiger nicht nachgezogen.
- `m7-05`: „Bänder von höchstens sechzehn Zeilen" gilt nur bei voller Breite; `gui/canvas.c` rechnet
  `CADS_STAGE_PIXELS / width`, bei halber Breite sind es 32 Zeilen.
- `m8-02`: die Rubrik nannte ein Delta von 32 den Abstand *benachbarter* Werte im 5-6-5-Raster, während der
  Fließtext desselben Steps korrekt 8 (5 Bit) und 4 (6 Bit) nennt. 32 sind vier Schritte.
- `m7-04`: `modules/toolbox/dhcpwatch.c` und `arpwatch.c` existieren nicht; sie liegen unter `src/`.
- `m6-01` und `m7-01`: die `then`-Befehle der `predict`-Checks zeigten mit `-B3` bzw. `-B4` genau den Satz nicht,
  den die zugehörige Rubrik zitiert. Fenster auf `-B16` bzw. `-B24` gezogen und nachgeprüft.
- `m6-01`: „das Löschen blockiert den aufrufenden Thread, nicht die CPU" — die Warteschleife belegt die CPU
  vollständig. Entscheidend ist, dass Interrupts freigeschaltet bleiben **und** der Code aus der anderen Bank
  nachgeladen wird; die Rubrik verlangt jetzt beide Hälften.

## Was die Prüfungen wert sind

### R2-8 — Projekt-Checks waren mit Kommentaren zu bestehen
**Persona:** S+ (mit Nachweis) · **Schwere:** blocker · behoben

S+ hat in einem Scratch-Verzeichnis vorgeführt, dass zwei Zeilen p1 vollständig bestehen:

```c
/* cads_view_dispatcher_add cads_view_set_softkeys cads_canvas_damage */
void cads_project_app_init(void *ctx) { (void)ctx; }
```

Ursache: die Ketten-Greps arbeiteten mit `grep -l` auf Dateiebene und prüften nur, dass ein Wort irgendwo in
derselben Datei steht. Bei p3 genügte eine einzige Kommentarzeile für beide Teil-Checks.

**Behoben:** Die Substanz-Checks von p1, p2 und p5 lesen jetzt die **gebauten Objektdateien** (`nm -u` auf die
Übersetzungseinheit, die das geforderte Symbol definiert); ein Kommentar erzeugt keine Symbolreferenz. Der
Board-Build ist dabei der erste Unter-Check, damit die Objekte frisch sind. p3 prüft zusätzlich mit `strings`, dass
das Schlüsselwort tatsächlich in die Objektdatei kompiliert wurde. Jeder Check wurde ausgeführt: auf dem
unveränderten Checkout rot, gegen echten Code grün, gegen die Kommentarfassung rot.

`p2/both-targets` bestand als `create`-Check den leeren Checkout (`cmake --preset host && cmake --build build/host`
beweist nur, dass das Repo baut). Der Check ist jetzt an das Symbol der Studierenden gekoppelt.

### R2-9 — Der Kurs behauptete eine Eigenschaft, die seine Prüfung nicht hatte
**Persona:** S+ · **Schwere:** major · behoben

`m5-01` schrieb: „Der erste Check verlangt den Slotnamen als Argument eines `fill_rect`-Aufrufs — ein Kommentar
besteht ihn nicht." Ein auskommentierter Aufruf bestand ihn. Dasselbe in `m1-04`. Das ist schlimmer als eine
schwache Prüfung, weil es das Vertrauen in alle anderen Zusicherungen mit erledigt.

**Behoben:** Die Behauptung wurde wahr gemacht statt gestrichen — die Checks schicken die Datei durch den
C-Präprozessor (`cc -E -P`), der Kommentare entfernt, bevor sie greppen. Verifiziert gegen Zeilen- und
Blockkommentar (rot) und gegen echten Code (grün).

### R2-10 — Sechs Checks trugen einen Titel, den sie nicht einlösten
**Persona:** P, S+ · **Schwere:** major · teilweise behoben

Sechs `command`-Checks waren auf dem unveränderten Checkout grün, obwohl ihr Titel eine Studierendenleistung
behauptete („Du hast die Grenze im echten Baum gefunden"). In `m1-01` wurde daraus eine `predict`-Aufgabe mit dem
Grep als Enthüllung plus eine ehrlich benannte Zusicherung für die Schichtregel; `m1-02` trägt jetzt den Titel
„Zusicherung — der HAL-Header führt die drei Stellen dieses Steps". Offen bleiben `m3-05/find-gate`,
`m4-03/find-inheritance` und `m6-04/checked`.

### R2-11 — Die Mehrteiligkeit ist in die unsichtbare Rubrik gewandert
**Persona:** P · **Schwere:** major · teilweise behoben

Kein Prompt hat mehr drei Teilfragen — aber die Rubriken haben jetzt im Median 72 Wörter, maximal 123, und 39 %
enden auf ein hartes Ausschlusskriterium („Eine Antwort ohne die drei Fehlerfälle besteht nicht"). Die Studierende
sieht die Rubrik nie. P: „A6 wurde gelöst, indem die Anforderung unsichtbar gemacht wurde."

**Behoben** für die Projekt-Steps und die betroffenen M1/M5/M8-Steps: der Prompt kündigt den Umfang an, nicht als
Fragenkette, sondern als Umfangsangabe („drei Fälle, je ein Satz, plus ein Satz zur Einordnung"). **Offen** für
den Rest des Kurses, und die eigentliche Lösung liegt in der Runtime: Rubriken als nummerierte Kriterien mit
`met/not met` und Quorum (B3), und die Rubrik nach dem Absenden einblenden (B2).

## Was offen bleibt

| Offen | Wo | Warum nicht in diesem Strang |
|---|---|---|
| `command`/`predict` in der Runtime | `extensions/cads-tutor` | Strang `tutor3`; gemeldet, mit Reihenfolge |
| B1–B12 aus Runde 1 unverändert | `extensions/cads-tutor` | `git log -- extensions/` seit Runde 1 leer |
| `question`-Anteil 44 % statt unter 30 % | kursweit | `manual` wurde teils durch `question` ersetzt; ohne LLM ist das dasselbe Häkchen. Auflösung braucht B2 |
| 4 Steps ohne ausführbaren Check | `m0-01`, `m5-04`, `m7-05`, `m8-03` | reine Urteilssteps; ein erfundener Check wäre genau das Leerlaufmuster aus A7 |
| Lineare `requires`-Kette | kursweit | A16 unverändert; ein `challenge`-Mechanismus braucht Runtime-Unterstützung |
| Projekt-Steps an einzelne Grundlagen-Steps binden | `courses/cads-zero-projects` | Cross-Pack-`requires` wird weder vom Validator noch vom Loader aufgelöst (empirisch geprüft); die Voraussetzung steht jetzt als expliziter Satz im Rumpf jedes Projekt-Steps |
| Kein Mensch in den Daten | — | P's neunte Bedingung; braucht einen Durchstich an echter Hardware und eine Kohorte |
| Portabilität neuer Checks | `nm`, `strings`, `cc -E`, `xargs -r` | im Container plausibel, aber nicht dort ausgeführt — vor dem nächsten Kursdurchlauf im Image prüfen |

## Urteil der Personas

**P (Professor):** Von neun Bedingungen aus Runde 1 sind zwei erfüllt, drei teilweise, vier nicht — und die vier
nicht erfüllten liegen sämtlich außerhalb des Kurstextes. „Ich war nie skeptisch gegenüber der Frage, ob ein LLM
guten Kurstext schreiben kann. Ich war skeptisch gegenüber der Frage, ob ein LLM feststellen kann, ob jemand etwas
gelernt hat. Runde 2 hat die erste Frage überzeugend beantwortet und die zweite nicht angefasst." Seine
Bedingungen für die nächste Runde sind auf drei geschrumpft: B1–B4 in der Runtime, ein protokollierter Durchstich
`m0-01` → `m0-05` an echter Hardware mit abgeschaltetem LLM, und fünf Studierende vorher/nachher. Sein
schärfster methodischer Satz betrifft dieses Vorgehen selbst: **was gemessen wurde, ist besser geworden; was nicht
gemessen wurde, ist teilweise schlechter geworden.**

**S+ (stärkste Studierende):** Drei Aufgaben haben sie wirklich gefordert — die Mitschnitt-Diagnose in `m2-03`
(die Daten entstehen erst beim Ausführen, es gibt nichts abzuschreiben), die Vorhersage über `GPIOD->ODR` in
`m3-02` mit dem Board als Schiedsrichter, und die Staging-Bank-Frage in `m5-01`, bei der sie danebenlag und etwas
gelernt hat. Sie bleibt bei drei Einwänden: sie kann nichts überspringen und kein Vorwissen bezeugen; kein Step
lässt sie Nebenläufigkeit *herstellen* statt darüber zu lesen; und dreizehn Steps sind für sie weiterhin in
wenigen Minuten erledigt.

**S− (schwächste Studierende):** Rund siebzig in Runde 1 offene Begriffe sind jetzt bei erster Verwendung erklärt,
alle 135 Aufgaben haben eine Hinweisleiter, kein Prompt hat mehr drei Teilfragen, und was zu tun ist, wenn das
Board schweigt, steht in M0–M2 doppelt. Vier Begriffe sind neu ungeklärt dazugekommen (*Offset*,
*Nebenläufigkeit*, *String-Literal*, *Optimierer*) — zwei davon sind inzwischen behoben. Ihr wichtigster
verbleibender Einwand ist Länge: `m0-01` ist von 399 auf 987 Wörter gewachsen, der Primer hat 1234 Wörter, und was
hinter ihrem Leseabbruch liegt, liest sie nicht. Mehr Erklärung ist für sie nicht automatisch besser.

## Regel, die aus dieser Runde folgt

Der wichtigste Ertrag von Runde 2 ist nicht eine einzelne Korrektur, sondern ein Muster: **arbeitsteilige
Überarbeitung erzeugt Fehler an den Nahtstellen.** Von acht neu entstandenen Sachfehlern lagen sieben genau dort —
eine Zahl, die von einem Step in den nächsten wanderte; ein Verweis, dessen Ziel gekürzt wurde; eine Rubrik, deren
Fließtext eine andere Person schrieb; eine Sprachfassung, die ein abgebrochener Skriptlauf zurückließ. Die
Gegenmaßnahmen stehen als verbindliche Regeln in [`../PEDAGOGY-RULES.md`](../PEDAGOGY-RULES.md).
