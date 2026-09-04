---
id: m0-05-explorer
title: Die Bring-up-Explorer-Konsole
bloom: understand
objectives: [firmware-how-to-board-test]
requires: [m0-04-flash-console]
estimatedMinutes: 12
scaffold: faded
recallFrom: [m0-04-flash-console]
links:
  - { step: m1-01-module-layout }
  - { doc: "docs/reference/explorer-console.md" }
  - { doc: "docs/how-to/debug.md" }
sources: [docs/reference/explorer-console.md, docs/how-to/debug.md]
tasks:
  - id: list-commands
    title: Das Board druckt dir seine Befehlsliste
    check: { type: serialExpect, send: "?\n", pattern: "# commands", timeoutMs: 15000 }
  - id: tried-commands
    title: Der Task-Bericht des Boards kommt bei dir an
    check: { type: serialExpect, send: "k\n", pattern: "# tasks", timeoutMs: 15000 }
  - id: which-command
    title: Begründe, warum ein Befehl den Pin verrät und der andere nicht
    check: { type: question, prompt: { en: "Why does w reveal the pin a button is wired to, while i does not?", de: "Warum verrät dir w den Pin, an dem ein Taster hängt, und i nicht?" }, rubric: "Verlangt wird der Vergleich, nicht die Nennung eines Buchstabens: i liest die Eingaberegister genau einmal und liefert einen Momentwert, aus dem sich nicht ablesen lässt, welches Bit zum Taster gehört. w liest fortlaufend weiter und meldet Änderungen, sodass erst der Tastendruck selbst — der Unterschied zwischen vorher und nachher — den Pin verrät. Eine Antwort, die nur sagt, w beobachte und i nicht, ohne den Vorher-Nachher-Vergleich als Grund zu nennen, ist unvollständig.", bloom: understand }
socratic:
  - { trigger: "task:list-commands:failed", question: { en: "Is the board answering typed characters at all right now?", de: "Antwortet das Board gerade überhaupt auf getippte Zeichen?" }, hints: [ { en: "Most often the board is not listening because it is standing in the app tree after the flash — it then swallows typed commands on purpose and says nothing about it.", de: "Am häufigsten hört das Board nicht zu, weil es nach dem Flashen im App-Baum steht — dann verschluckt es getippte Befehle absichtlich und schweigt dazu." }, { en: "Open the board console with F1 and CaDS Board: Konsole öffnen, and type a single ? there followed by Enter as a test. Single-letter commands belong in that window and nowhere else.", de: "Öffne die Board-Konsole mit F1 und „CaDS Board: Konsole öffnen“ und tippe dort zur Probe ein einzelnes ? mit Enter. Ein-Buchstaben-Befehle gehören in dieses Fenster und in kein anderes." }, { en: "If it stays silent, the board is in the app tree. The way back to the prompt does not go through the console — see the section on the two windows you can type into, and the pitfall below it.", de: "Bleibt es still, steht das Board im App-Baum. Der Weg zurück zum Prompt führt nicht über die Konsole — siehe den Abschnitt „Zwei Fenster, in die man tippen kann“ und den Stolperstein darunter." } ] }
  - { trigger: "task:tried-commands:failed", question: { en: "Which of the two windows did you type into last?", de: "In welches der beiden Fenster hast du zuletzt getippt?" }, hints: [ { en: "Look at the bottom of the window: do you see a terminal? If not, open one with ☰ at the top left, then Terminal, then New Terminal. The script that ends the app tree runs there, not in the board console.", de: "Schau nach unten: siehst du ein Terminal-Fenster? Wenn nicht, öffne eins mit ☰ oben links, dann Terminal, dann New Terminal. Das Skript, das den App-Baum beendet, läuft dort — nicht in der Board-Konsole." }, { en: "In that terminal: python3 scripts/board_key.py quit, once, with Enter. Then back to the board console and press Check again - the check sends k itself.", de: "In diesem Terminal: python3 scripts/board_key.py quit, einmal, mit Enter. Danach zurück in die Board-Konsole und erneut auf Prüfen drücken - der Check sendet k selbst." }, { en: "If ? answers by now but k does not, the report scrolled past before the console was open — simply press Check again.", de: "Antwortet ? inzwischen, k aber nicht, lief der Bericht durch, bevor die Konsole offen war — drück einfach noch einmal auf Prüfen." } ] }
  - { trigger: "question:which-command:weak", question: { en: "Suppose you never press the button. What does a one-shot dump tell you about it then?", de: "Angenommen, du drückst den Taster gar nicht. Was sagt dir eine Einmal-Ausgabe dann über ihn?" }, hints: [ { en: "The most common answer names the right letter and leaves out the reason. Here the reason is the whole task.", de: "Die häufigste Antwort nennt den richtigen Buchstaben und lässt den Grund weg. Der Grund ist hier die ganze Aufgabe." }, { en: "Try both at the board: first i, then w, and press a button while w is running. The difference between the two outputs is the answer.", de: "Probier beides am Board: erst i, dann w, und drücke einen Taster, während w läuft. Der Unterschied zwischen beiden Ausgaben ist die Antwort." }, { en: "A single snapshot says nothing about which bit belongs to the button; that needs two states and the comparison between them.", de: "Ein einzelner Momentwert sagt nichts darüber, welches Bit zum Taster gehört; dafür braucht es zwei Zustände und den Vergleich dazwischen." } ] }
---
## Lernziel

Lerne, was die Bring-up-Explorer-Konsole ist, und baue dir eine Zuordnung von Symptom zu Befehl auf, damit du das Board direkt befragst, statt zu raten.

## Zwei Fenster, in die man tippen kann

Ab hier gibt es zwei Eingabefenster, und sie hören auf völlig verschiedene Dinge. Verwechselt man sie, passiert nichts — ohne jede Fehlermeldung. Beide liegen **unten** im Terminal-Bereich; `Strg`/`Cmd`+`J` klappt ihn auf und zu, und rechts im Bereich stehen alle offenen Terminals untereinander, sodass du zwischen ihnen wechselst.

- Das **Terminal** läuft auf dem Server, auf dem diese Umgebung arbeitet. Du öffnest es ohne Tastatur über **☰ → `Terminal` → `New Terminal`** (das Symbol mit den drei Strichen ganz oben links; eine sichtbare Menüleiste gibt es nicht). Hier laufen Programme deines Arbeitsbereichs: Skripte, Compiler, `git`. Alles, was wie ein Dateiname mit Endung aussieht (`scripts/board_key.py`), gehört hierhin.
- Die **Board-Konsole** ist der Textkanal zum Board selbst. Du öffnest sie mit **`F1`** und dem Palettenbefehl

```
CaDS Board: Konsole öffnen
```

Sie erscheint unten als Terminal mit dem Namen `CaDS Board Console`. Hier liest die Firmware jedes Zeichen einzeln, und ein einzelner Buchstabe wie `k` ist bereits ein vollständiger Befehl.

<!-- SHOT: two-input-windows | Der Terminal-Bereich unten, in der Terminalliste rechts zwei Eintraege nebeneinander: ein gewoehnliches Terminal und CaDS Board Console | HARDWARE -->

Ein Python-Skript in die Board-Konsole zu tippen bewirkt deshalb nichts: die Firmware sieht nur Buchstaben, von denen sie keinen als Befehl kennt. Umgekehrt kennt das Terminal kein `k`. Tut das Tastenkürzel für die Befehlspalette nichts, hat der Browser es abgefangen — `F1` geht immer. Und schließe kein Terminal, in dem gerade etwas läuft: das Kreuz beendet den Vorgang darin. Die Board-Konsole darfst du schließen, sie lässt sich mit demselben Befehl wieder öffnen.

## Eine Konsole, die älter ist als die GUI

`apps/bringup` baut einen zweiten Firmware-Einsprungpunkt, getrennt vom echten App-Baum: eine **Ein-Buchstaben-Befehlskonsole** über dieselbe USART, die die ST-Link als virtuellen COM-Port bereitstellt. Sie existiert, weil die meisten Subsysteme dieses Boards — Ethernet-MAC und PHY, die GPIO-Bänke des Adapters, der nur beschreibbare Displaybus — einem Menschen ihren Zustand nicht melden können, solange kein Treiber vertrauenswürdig ist. Diese Konsole hat jedes einzelne davon in Betrieb genommen, bevor die GUI existierte, die es später umschloss.

Jeder Befehl ist ein Zeichen, optional gefolgt von ein oder zwei Argumenten. Das Zeichen `?` gibt die vollständige Befehlsliste aus; sie beginnt mit `# commands:`. Die Hilfezeichenkette der Firmware ist die maßgebliche Wahrheit, falls die Referenz je abweicht (`docs/reference/explorer-console.md`).

<!-- SHOT: explorer-console-commands | Die CaDS Board Console unmittelbar nach ?, mit der Zeile # commands: und den darunter aufgelisteten Ein-Buchstaben-Befehlen | HARDWARE -->

## Von Symptom zu Befehl

Der Wert des Explorers liegt darin, dass es meist schneller ist, ein Subsystem direkt zu fragen, als einen Debugger anzuhängen. Einige Zuordnungen, die dir wieder begegnen (`docs/how-to/debug.md`):

| Symptom | Greife zu | Warum |
|---|---|---|
| Ein Taster tut nichts oder das Falsche | `w`, dann `i` | `w` beobachtet das Eingaberegister jedes Ports fortlaufend auf Änderungen; `i` gibt denselben Zustand genau einmal aus |
| Eine Task wirkt ausgehungert oder ein Stack knapp | `k` | Stack-Höchststände je Task, Task-Anzahl, Eingabezähler |
| Der Ethernet-Link verhält sich seltsam | `e`, `a`, `m` | sie sprechen die PHY über MDIO *unterhalb* von lwIP an, antworten also unabhängig davon, ob ein netif läuft |
| Der Display-Durchsatz wirkt daneben | `V` | misst den Vollbild-Flush-Durchsatz unter echter Last neu |

Zwei Begriffe aus der zweiten Zeile, weil sie ab hier ständig auftauchen: eine **Task** ist ein Programmstrang, der scheinbar gleichzeitig mit anderen läuft — das Betriebssystem im Chip schaltet reihum zwischen ihnen um. Der **Stack** ist der Speicherbereich, auf dem eine Task ihre Funktionsaufrufe und lokalen Variablen stapelt; läuft er über, überschreibt eine Task fremden Speicher. Deshalb meldet `k` je Task, wie viel davon im schlimmsten Fall frei war, in einer Zeile, die mit `# tasks` beginnt.

Ein Befehl, `z FAULT`, ist absichtlich destruktiv: er löst einen UsageFault aus und hält für immer an, um zu beweisen, dass der Fault-Handler funktioniert. Er verlangt das wörtliche Argument, damit ein Vertipper ihn nicht auslöst.

## Ein Stolperstein, den du einmal triffst

Ein frisch geflashtes Board bootet direkt in den **App-Baum** — die Touchscreen-Oberfläche von der Startseite bis in eine App (`boot.autostart = 1`). Diese Sitzung **ignoriert einfache getippte Bytes mit Absicht**: ein verirrter Konsolenbefehl tut nichts und druckt nichts, nicht einmal einen Fehler, was genau wie ein hängendes Board aussieht.

Zurück zum **Prompt** — der Stelle, an der die Konsole wieder auf Eingaben wartet — kommst du mit einem reservierten Byte, das kein Tastendruck ist. Es schickt dir ein Skript, und zwar aus einem **Terminal** (**☰ → `Terminal` → `New Terminal`**), nicht aus der Board-Konsole. Tippe dort:

```
python3 scripts/board_key.py quit
```

Die Antwort des Skripts erscheint in genau diesem Terminal; die Antwort des Boards danach in `CaDS Board Console`.

## Deine Aufgabe

Öffne die Board-Konsole (`F1` → `CaDS Board: Konsole öffnen`) und kehre bei Bedarf wie oben zum Prompt zurück. Die beiden ersten Aufgaben tippst du **nicht** selbst: der Knopf **Prüfen** sendet `?` beziehungsweise `k` selbst an das Board und wartet bis zu 15 Sekunden auf die Antwortzeile. Du sorgst nur dafür, dass die Konsole offen ist und das Board am Prompt steht — und liest mit, was zurückkommt. Begründe dann im Feld der dritten Aufgabe, warum von den beiden Befehlen zur Tastersuche nur einer den Pin verrät. Das nächste Modul öffnet, wie die Firmware tatsächlich strukturiert ist.
