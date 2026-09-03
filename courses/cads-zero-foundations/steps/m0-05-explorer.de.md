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
  - { trigger: "task:list-commands:failed", question: { en: "Is the board answering typed characters at all right now?", de: "Antwortet das Board gerade überhaupt auf getippte Zeichen?" }, hints: [ { en: "Most often the board is not listening because it is standing in the app tree after the flash — it then swallows typed commands on purpose and says nothing about it.", de: "Am häufigsten hört das Board nicht zu, weil es nach dem Flashen im App-Baum steht — dann verschluckt es getippte Befehle absichtlich und schweigt dazu." }, { en: "Open the board console with F1 and CaDS Board: Konsole öffnen, and type a single ? there followed by Enter. Single-letter commands belong in that window and nowhere else.", de: "Öffne die Board-Konsole mit F1 und „CaDS Board: Konsole öffnen“ und tippe dort ein einzelnes ? mit Enter. Ein-Buchstaben-Befehle gehören in dieses Fenster und in kein anderes." }, { en: "If it stays silent, the board is in the app tree. The way back to the prompt does not go through the console — see the section on where you type commands, and the pitfall below it.", de: "Bleibt es still, steht das Board im App-Baum. Der Weg zurück zum Prompt führt nicht über die Konsole — siehe den Abschnitt „Wo du Befehle eintippst“ und den Stolperstein darunter." } ] }
  - { trigger: "task:tried-commands:failed", question: { en: "Which of the two windows did you type into last?", de: "In welches der beiden Fenster hast du zuletzt getippt?" }, hints: [ { en: "Look at the bottom of the window: do you see a terminal? If not, open one with Terminal → New Terminal. The script that ends the app tree runs there, not in the board console.", de: "Schau nach unten: siehst du ein Terminal-Fenster? Wenn nicht, öffne eins mit Terminal → New Terminal. Das Skript, das den App-Baum beendet, läuft dort — nicht in der Board-Konsole." }, { en: "In that terminal: python3 scripts/board_key.py quit, once, with Enter. Then back to the board console and send k there.", de: "In diesem Terminal: python3 scripts/board_key.py quit, einmal, mit Enter. Danach zurück in die Board-Konsole und dort k senden." }, { en: "If ? answers by now but k does not, the report scrolled past before the console was open — simply send k again.", de: "Antwortet ? inzwischen, k aber nicht, lief der Bericht durch, bevor die Konsole offen war — schick k einfach noch einmal." } ] }
  - { trigger: "question:which-command:weak", question: { en: "Suppose you never press the button. What does a one-shot dump tell you about it then?", de: "Angenommen, du drückst den Taster gar nicht. Was sagt dir eine Einmal-Ausgabe dann über ihn?" }, hints: [ { en: "The most common answer names the right letter and leaves out the reason. Here the reason is the whole task.", de: "Die häufigste Antwort nennt den richtigen Buchstaben und lässt den Grund weg. Der Grund ist hier die ganze Aufgabe." }, { en: "Try both at the board: first i, then w, and press a button while w is running. The difference between the two outputs is the answer.", de: "Probier beides am Board: erst i, dann w, und drücke einen Taster, während w läuft. Der Unterschied zwischen beiden Ausgaben ist die Antwort." }, { en: "A single snapshot says nothing about which bit belongs to the button; that needs two states and the comparison between them.", de: "Ein einzelner Momentwert sagt nichts darüber, welches Bit zum Taster gehört; dafür braucht es zwei Zustände und den Vergleich dazwischen." } ] }
---
## Lernziel

Lerne, was die Bring-up-Explorer-Konsole ist, und baue dir eine Zuordnung von Symptom zu Befehl auf, damit du das Board direkt befragst, statt zu raten.

## Wo du Befehle eintippst

Ab hier gibt es zwei Fenster, in die man tippen kann, und sie hören auf völlig verschiedene Dinge. Verwechselt man sie, passiert nichts — ohne jede Fehlermeldung.

- Das **Terminal** läuft auf dem Server, auf dem diese Umgebung arbeitet. Du öffnest es über das Menü **Terminal → New Terminal**; es klappt unten im Fenster auf und zeigt eine Eingabezeile. Hier laufen Programme deines Arbeitsbereichs: Skripte, Compiler, `git`. Alles, was wie ein Dateiname mit Endung aussieht (`scripts/board_key.py`), gehört hierhin.
- Die **Board-Konsole** ist der Textkanal zum Board selbst; du öffnest sie mit `F1` und dem Befehl **CaDS Board: Konsole öffnen**. Hier liest die Firmware jedes Zeichen einzeln, und ein einzelner Buchstabe wie `k` ist bereits ein vollständiger Befehl.

Ein Python-Skript in die Board-Konsole zu tippen bewirkt deshalb nichts: die Firmware sieht nur eine Folge von Buchstaben, von denen sie keinen als Befehl kennt. Umgekehrt kennt das Terminal kein `k`.

## Eine Konsole, die älter ist als die GUI

`apps/bringup` baut einen zweiten Firmware-Einsprungpunkt, getrennt vom echten App-Baum: eine **Ein-Buchstaben-Befehlskonsole** über dieselbe USART, die die ST-Link als virtuellen COM-Port bereitstellt. Sie existiert, weil die meisten Subsysteme dieses Boards — der Ethernet-MAC und die PHY, die GPIO-Bänke des Adapters, der nur beschreibbare Displaybus — einem Menschen ihren Zustand nicht melden können, ohne dass ein Treiber bereits vertrauenswürdig ist. Diese Konsole hat jedes einzelne davon in Betrieb genommen und per Hardware-Gate abgesichert, bevor die GUI existierte, die es später umschloss.

Jeder Befehl ist ein Zeichen, optional gefolgt von ein oder zwei durch Leerraum getrennten Argumenten. Sende jederzeit `?`, um die vollständige Befehlsliste erneut auszugeben; sie beginnt mit der Zeile `# commands:` und führt danach je Zeile einen Befehl auf. Die Hilfezeichenkette der Firmware ist die maßgebliche Wahrheit, falls die Referenz je abweicht. Vollständiger Katalog: `docs/reference/explorer-console.md`.

## Von Symptom zu Befehl

Der Wert des Explorers liegt darin, dass es meist schneller ist, ein Subsystem direkt zu fragen, als einen Debugger anzuhängen. Einige Zuordnungen, die dir wieder begegnen (`docs/how-to/debug.md`):

| Symptom | Greife zu | Warum |
|---|---|---|
| Ein Taster tut nichts oder das Falsche | `w`, dann `i` | `w` beobachtet das Eingaberegister jedes Ports fortlaufend auf Änderungen; `i` gibt denselben Zustand genau einmal aus |
| Eine Task wirkt ausgehungert oder ein Stack knapp | `k` | Stack-Höchststände je Task, Task-Anzahl, Eingabezähler |
| Der Ethernet-Link verhält sich seltsam | `e`, `a`, `m` | sie sprechen die PHY über MDIO *unterhalb* von lwIP an, antworten also unabhängig davon, ob ein netif läuft |
| Der Display-Durchsatz wirkt daneben | `V` | misst den Vollbild-Flush-Durchsatz unter echter Scheduler- und Netzwerklast neu |

Zwei Begriffe aus der zweiten Zeile, weil sie ab hier ständig auftauchen: eine **Task** ist ein Programmstrang, der scheinbar gleichzeitig mit anderen läuft — das Betriebssystem im Chip schaltet reihum zwischen ihnen um. Der **Stack** ist der Speicherbereich, auf dem eine Task ihre Funktionsaufrufe und lokalen Variablen stapelt; läuft er über, überschreibt eine Task fremden Speicher. Genau deshalb meldet `k` je Task, wie viel davon im schlimmsten Fall noch frei war. Die Antwort kommt als eine einzige Zeile, die mit `# tasks` beginnt.

Ein Befehl, `z FAULT`, ist absichtlich destruktiv: er löst gezielt einen UsageFault aus und hält für immer an, um zu beweisen, dass der Fault-Handler funktioniert. Er verlangt das wörtliche Argument `FAULT`, damit ein Vertipper ihn nicht auslöst. Alles andere ist nur lesend oder von begrenzter Dauer.

## Ein Stolperstein, den du einmal triffst

Ein frisch geflashtes Board bootet direkt in den **App-Baum** — die Touchscreen-Oberfläche von der Startseite über das Menü bis in eine App (`boot.autostart = 1`). Diese Sitzung **ignoriert einfache getippte Bytes mit Absicht**: ein verirrter Konsolenbefehl tut nichts und druckt nichts, nicht einmal einen Fehler, was genau wie ein hängendes Board aussieht.

Zurück zum **Prompt** — der Stelle, an der die Konsole wieder auf Eingaben wartet — kommst du mit einem reservierten Byte, das kein Tastendruck ist. Es schickt dir ein Skript, und zwar aus einem **Terminal** (Menü *Terminal → New Terminal*), nicht aus der Board-Konsole:

```
python3 scripts/board_key.py quit
```

Danach werden deine einfachen Befehle in der Board-Konsole wieder gehört.

## Deine Aufgabe

Öffne die Board-Konsole, kehre bei Bedarf zum Prompt zurück und lass dir zwei Antworten vom Board geben: `?` für die Befehlsliste und `k` für den Task-Bericht. Begründe dann, warum von den beiden Befehlen zur Tastersuche nur einer den Pin verrät. Das nächste Modul öffnet, wie die Firmware tatsächlich strukturiert ist.
