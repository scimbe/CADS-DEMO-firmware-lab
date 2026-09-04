---
id: m7-02-udp-hello
title: Dein erstes UDP-Datagramm senden
bloom: apply
objectives: [firmware-tutorials-lwip-udp-hello]
requires: [m7-01-lwip-netif]
estimatedMinutes: 20
scaffold: faded
links:
  - { step: m7-03-dhcp-stack-lesson }
  - { doc: "docs/tutorials/lwip-udp-hello.md" }
  - { file: "modules/net/include/cads/net/net.h", line: 180 }
  - { file: "apps/bringup/explorer_ping_demo.c", line: 31 }
sources: [docs/tutorials/lwip-udp-hello.md, modules/net/include/cads/net/net.h, apps/bringup/explorer_ping_demo.c, docs/reference/lwip-udp-tutor-steps.json]
misconceptions:
  - { pattern: "undefined reference to", question: { en: "The board build links and the host build does not, or the other way round. Which of the two implementations of this module were you linking against?", de: "Der Board-Build linkt und der Host-Build nicht, oder umgekehrt. Gegen welche der beiden Implementierungen dieses Moduls hast du gelinkt?" }, hints: [ { en: "modules/net has a board file and a sim file; CMake picks one by target, and both must export the same names.", de: "modules/net hat eine Board-Datei und eine Sim-Datei; CMake wählt je Target eine aus, und beide müssen dieselben Namen exportieren." }, { en: "If a name exists only on the board side, everything above the HAL that uses it stops building for the host.", de: "Existiert ein Name nur auf der Board-Seite, baut alles oberhalb der HAL, das ihn benutzt, für den Host nicht mehr." }, { en: "Read which target the failing link line belongs to before changing any code - the two builds fail for different reasons.", de: "Lies, zu welchem Target die scheiternde Link-Zeile gehört, bevor du Code änderst - die beiden Builds scheitern aus verschiedenen Gründen." } ] }
tasks:
  - id: add-send
    title: Die Ping-Demo ruft cads_net_udp_send auf
    check: { type: command, cwd: ".", command: "grep -nE 'cads_net_udp_send[[:space:]]*\\([a-zA-Z_]' apps/bringup/explorer_ping_demo.c", expectExitCode: 0, bloom: apply }
  - id: build
    title: Die Firmware baut mit deiner Änderung
    check: { type: task, label: "CaDS: Build", expectExitCode: 0, bloom: apply }
  - id: no-link
    title: Verhalten ohne Link
    check: { type: question, prompt: { en: "What happens to your datagram if the link is still down when the call runs?", de: "Was geschieht mit deinem Datagramm, wenn der Link beim Aufruf noch unten ist?" }, rubric: "Nichts, und zwar stillschweigend: cads_net_udp_send() tut nichts, wenn der Link nicht oben ist oder dst_ip 0 ist, und hat keinen Rückgabewert, über den es das melden könnte - derselbe Fire-and-forget-Vertrag, den UDP selbst hat. Ein Aufrufer braucht deshalb vor jedem Senden keine eigene Link-Prüfung, muss den Aufruf aber hinter die Link-Warteschleife setzen, wenn das Datagramm wirklich hinausgehen soll. Bestanden nur, wenn beide Hälften auftauchen: das stumme Nichtstun und die Folge für die Platzierung.", bloom: apply }
socratic:
  - { trigger: "task:add-send:failed", question: { en: "The tutorial names an exact place for the new call. Which loop does it sit right after, and what is the first statement that follows that loop today?", de: "Das Tutorial nennt einen genauen Ort für den neuen Aufruf. Direkt hinter welcher Schleife sitzt er, und welche Anweisung folgt heute auf diese Schleife?" }, hints: [ { en: "Open apps/bringup/explorer_ping_demo.c and find the link-wait loop that polls until status.link_up.", de: "Öffne apps/bringup/explorer_ping_demo.c und finde die Link-Warteschleife, die pollt, bis status.link_up gilt." }, { en: "The call belongs after that loop and before the ping's own setup - not inside the loop, and not before cads_net_init().", de: "Der Aufruf gehört hinter diese Schleife und vor die Vorbereitung des Pings - nicht in die Schleife und nicht vor cads_net_init()." }, { en: "The check requires the function name followed by an opening parenthesis and an argument, so a declaration or a comment does not satisfy it; the signature is in modules/net/include/cads/net/net.h.", de: "Der Check verlangt den Funktionsnamen gefolgt von einer offenen Klammer und einem Argument, eine Deklaration oder ein Kommentar genügt also nicht; die Signatur steht in modules/net/include/cads/net/net.h." } ] }
  - { trigger: "task:build:failed", question: { en: "Which target failed - the board one or the host one? The answer decides where to look.", de: "Welches Target ist gescheitert - das Board- oder das Host-Target? Die Antwort entscheidet, wo du suchst." }, hints: [ { en: "The payload is a byte array, and the length argument is a count of bytes, not of elements plus terminator.", de: "Die Nutzlast ist ein Byte-Array, und das Längenargument ist eine Byte-Anzahl, nicht Elemente plus Abschlusszeichen." }, { en: "The address argument is a plain 32-bit integer in host byte order, so no conversion function belongs there.", de: "Das Adressargument ist eine schlichte 32-Bit-Zahl in Host-Bytereihenfolge, dort gehört also keine Konvertierungsfunktion hin." }, { en: "Compare the argument types against the declaration in the header; four arguments, and only one of them is a pointer.", de: "Vergleich die Argumenttypen mit der Deklaration im Header; vier Argumente, und nur eines davon ist ein Zeiger." } ] }
  - { trigger: "question:no-link:weak", question: { en: "The function returns nothing. What is the only way it can react to a problem, and what does that say about who is responsible for the link?", de: "Die Funktion gibt nichts zurück. Wie kann sie überhaupt auf ein Problem reagieren, und was sagt das darüber, wer für den Link verantwortlich ist?" }, hints: [ { en: "Read the contract paragraph in modules/net/include/cads/net/net.h above the declaration.", de: "Lies den Vertragsabsatz in modules/net/include/cads/net/net.h über der Deklaration." }, { en: "UDP itself has the same property: a datagram that is not delivered produces no notification anywhere.", de: "UDP selbst hat dieselbe Eigenschaft: ein nicht zugestelltes Datagramm erzeugt nirgends eine Meldung." }, { en: "Your answer needs the consequence for the placement of your call, not only the behaviour of the function.", de: "Deine Antwort braucht die Folge für die Platzierung deines Aufrufs, nicht nur das Verhalten der Funktion." } ] }
---
## Lernziel

Sende ein echtes UDP-Datagramm aus dem lwIP-Stack des Boards und empfange es auf deinem Rechner — mit der Link-Warteschleife, die jeder Netzwerkaufrufer in dieser Codebasis teilt.

## Ein Aufruf

`apps/bringup/explorer_ping_demo.c` erledigt bereits alles außer dem Senden: `cads_net_init()`, dann die Link-Warteschleife, dann den Ping. Die API für das fehlende Stück ist eine einzige Funktion:

```c
void cads_net_udp_send(uint32_t dst_ip, uint16_t dst_port,
                       const uint8_t* payload, uint16_t len);
```

`dst_ip` und `dst_port` sind Host-Byte-Order. Es gibt kein Socket-Objekt, keine Warteschlange und **keinen Rückgabewert** — derselbe Fire-and-forget-Vertrag, den UDP selbst hat. Was das für einen zu frühen Aufruf bedeutet, steht über der Deklaration in `modules/net/include/cads/net/net.h`; die dritte Aufgabe fragt danach.

## Schritt 1 — die Änderung

Öffne die Datei: drücke `Strg`/`Cmd`+`P`, tippe `apps/bringup/explorer_ping_demo.c` und drücke Enter. Ohne Tastatur: ganz links in der schmalen Symbolleiste das oberste Symbol (der Datei-Explorer), dann durch den Baum klicken. Die Datei öffnet sich als Reiter in der Mitte, neben dem Steptext-Reiter `CaDS Tutor: <Titel>`.

Nach `cads_net_init()` kommt die Link-Warteschleife — `cads_net_poll()`, `cads_net_status()`, Abbruch bei `link_up`, höchstens 3000 ms lang. Direkt hinter diese Schleife, vor `char target_text[16];`, gehören drei Zeilen. Zwei davon stehen hier:

```c
    /* lwip-udp-hello: ein UDP-Datagramm an den Laptop */
    uint32_t laptop_ip = (192u << 24) | (168u << 16) | (33u << 8) | 10u; /* 192.168.33.10 */
    static const uint8_t hello_payload[] = "hello from cads-zero\n";
```

Die dritte ist der Aufruf selbst. Seine Signatur steht oben; Port `41234` ist willkürlich, und das Längenargument ist eine **Byte-Anzahl** — überlege, ob das Abschluss-Nullbyte des Literals mitgesendet werden soll. Speichere mit `Strg`/`Cmd`+`S`; der Punkt am Reiter verschwindet dabei.

## Schritt 2 — für beide Targets bauen

Board-Build: drücke **`F1`**, tippe `Tasks: Run Task`, drücke Enter, wähle **`CaDS: Build`** aus der Liste. Ohne Tastatur: das Symbol mit den drei Strichen (**☰**) ganz oben links, dann **`Terminal` → `Run Task...` → `CaDS: Build`**. Unten im Terminal-Bereich öffnet sich ein eigenes Terminal mit dem Namen `CaDS: Build`. Beim ersten Mal dauert es etwa eine Minute, danach Sekunden. Fertig ist er, wenn keine neuen Zeilen mehr kommen und wieder eine Eingabeaufforderung dasteht; Compilerfehler stehen zusätzlich im Reiter `PROBLEMS`.

**Reagiert die Palette gar nicht auf `F1` oder `Strg`/`Cmd`+`Umschalt`+`P`, hat der Browser das Tastenkürzel abgefangen** — `F1` ist der zuverlässige Weg, sonst nimm **☰ → `Terminal`**.

Host-Build: öffne ein Terminal mit **☰ → `Terminal` → `New Terminal`** (ist der Bereich zugeklappt, klappt ihn `Strg`/`Cmd`+`J` auf und wieder zu; das Arbeitsverzeichnis ist die Projektwurzel) und führe aus:

```
cmake --preset host && cmake --build build/host
```

Beide müssen sauber durchlaufen. Der Host-Build linkt einen Stub, der nie sendet — das ist erwartet, kein Fehler.

**Schließe das Terminal während des Baus nicht.** Das Kreuz am Terminal beendet den Prozess darin und bricht den Build ab; zum Wegklappen nimm `Strg`/`Cmd`+`J`, das lässt ihn weiterlaufen.

## Schritt 3 — flashen

Drücke **`F1`**, tippe `Tasks: Run Task`, drücke Enter, wähle **`CaDS: Flash`** aus der Liste. Ohne Tastatur: **☰ → `Terminal` → `Run Task...` → `CaDS: Flash`**. Willst du bauen und flashen in einem Zug, nimm stattdessen **`CaDS: Build + Flash`**; es führt beides hintereinander aus.

Während des Flashens erscheint oben rechts eine Fortschrittsmeldung, und es dauert etwa 15 Sekunden.

![Die Fortschrittsmeldung waehrend des Flashens](flash-progress.png)

Erfolg erkennst du an der Statusleiste unten: dort steht danach `Flash ok:` mit der Bytezahl und der Dauer.

![Die Statusleiste nach erfolgreichem Flashen, mit Bytezahl und Dauer](flash-ok.png)

## Schritt 4 — den Empfänger einrichten

**Achtung, hier verlässt du die Werkbank.** Das Ethernet-Kabel des Boards steckt an *deinem* Rechner, nicht im Container, in dem diese Werkbank läuft. Das Datagramm landet deshalb in einem Terminal **deines eigenen Rechners** — in einem Terminal der Werkbank kommt es nie an, und `nc` ist dort auch nicht installiert.

Öffne also ein Terminal auf deinem Rechner und gib der Schnittstelle zum Board eine freie Adresse im `/24` des Boards:

```
sudo ifconfig en0 alias 192.168.33.10 255.255.255.0
```

Lausche dann im selben Terminal:

```
nc -ul 41234
```

Es druckt nichts und blockiert — das ist richtig, es wartet. Lass es laufen.

<!-- SHOT: m7-nc-listener | Terminal auf dem eigenen Rechner: nc -ul 41234 blockiert, darunter die eingegangene Zeile hello from cads-zero | HARDWARE -->

## Schritt 5 — abfeuern

Zurück in der Werkbank. Öffne dort ein **zweites, eigenes** Terminal mit **☰ → `Terminal` → `New Terminal`**. Jedes Terminal ist ein eigenständiger Vorgang; rechts im Terminal-Bereich stehen alle offenen untereinander.

Ein frisch geflashtes Board startet im Touchscreen-App-Baum und überhört einzelne Buchstaben. Führe darum zuerst aus:

```
python3 scripts/board_key.py quit
```

Im Labor erreichen die Skripte das Board über den Konsolen-PTY des Bridge; findet der Aufruf keinen Port, gib ihn ausdrücklich an (`docs/SPEC.md`):

```
python3 scripts/board_key.py quit --port /home/coder/board-console
```

Dann der Ping-Befehl. Ziel und Anzahl sind **ein** zitiertes Argument, weil das Board `"<hex-ip> <anzahl>"` selbst aus einer einzigen Zeichenkette parst:

```
python3 scripts/board_cmd.py P "c0a8210a 1" --timeout 5
```

`c0a8210a` ist `192.168.33.10` in Hex, `1` die Ping-Anzahl. Das Hello geht raus, sobald die Link-Warteschleife abbricht — also unabhängig davon, ob dein Rechner ICMP beantwortet.

**Jetzt kommt der Fehler, den hier fast jeder macht: du suchst die Ausgabe im falschen Fenster.** Das Echo des Befehls steht im Werkbank-Terminal, in dem du ihn gestartet hast — `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts in der Liste wählst du das richtige Terminal. Die Zeile `hello from cads-zero` dagegen steht im `nc`-Terminal auf deinem eigenen Rechner, in keinem Fenster des Browsers. Kommt dort nichts an, deckt die Fehlertabelle in `docs/tutorials/lwip-udp-hello.md` jeden Fall ab; keiner davon ist ein Board-seitiger Fehler, dem du über SWD nachjagen müsstest.

## Deine Aufgaben

Die drei Aufgaben stehen unten im Steptext, dem Reiter in der Mitte, jede mit einem Knopf **Prüfen**; **Run all checks** oben startet alle drei. Der erste Check sucht den Aufruf mit Argument — eine Deklaration oder ein Kommentar besteht ihn nicht. Der zweite startet den Task `CaDS: Build` selbst; seine Ausgabe erscheint unten im Terminal mit dem Namen des Tasks. Der dritte ist eine Freitextfrage. Bleibt eine Aufgabe rot, hilft der Knopf **Hinweis anzeigen** daneben.

Die Bedienoberfläche ist englisch, der Kurstext deutsch — der Menüpunkt heißt also `Run Task...`, nicht „Aufgabe ausführen“.
