---
id: m7-02-udp-hello
title: Send your first UDP datagram
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
    title: The ping demo calls cads_net_udp_send
    check: { type: command, cwd: ".", command: "grep -nE 'cads_net_udp_send[[:space:]]*\\([a-zA-Z_]' apps/bringup/explorer_ping_demo.c", expectExitCode: 0, bloom: apply }
  - id: build
    title: The firmware builds with your change
    check: { type: task, label: "CaDS: Build", expectExitCode: 0, bloom: apply }
  - id: no-link
    title: Behaviour with no link
    check: { type: question, prompt: { en: "What happens to your datagram if the link is still down when the call runs?", de: "Was geschieht mit deinem Datagramm, wenn der Link beim Aufruf noch unten ist?" }, rubric: "Nothing, and silently: cads_net_udp_send() does nothing if the link is not up or dst_ip is 0, and it has no return value through which it could say so - the same fire-and-forget contract UDP itself has. A caller therefore needs no link check of its own before every send, but has to place the call after the link-wait loop if the datagram is really to go out. Passes only if both halves appear: the silent no-op and the consequence for placement.", bloom: apply }
socratic:
  - { trigger: "task:add-send:failed", question: { en: "The tutorial names an exact place for the new call. Which loop does it sit right after, and what is the first statement that follows that loop today?", de: "Das Tutorial nennt einen genauen Ort für den neuen Aufruf. Direkt hinter welcher Schleife sitzt er, und welche Anweisung folgt heute auf diese Schleife?" }, hints: [ { en: "Open apps/bringup/explorer_ping_demo.c and find the link-wait loop that polls until status.link_up.", de: "Öffne apps/bringup/explorer_ping_demo.c und finde die Link-Warteschleife, die pollt, bis status.link_up gilt." }, { en: "The call belongs after that loop and before the ping's own setup - not inside the loop, and not before cads_net_init().", de: "Der Aufruf gehört hinter diese Schleife und vor die Vorbereitung des Pings - nicht in die Schleife und nicht vor cads_net_init()." }, { en: "The check requires the function name followed by an opening parenthesis and an argument, so a declaration or a comment does not satisfy it; the signature is in modules/net/include/cads/net/net.h.", de: "Der Check verlangt den Funktionsnamen gefolgt von einer offenen Klammer und einem Argument, eine Deklaration oder ein Kommentar genügt also nicht; die Signatur steht in modules/net/include/cads/net/net.h." } ] }
  - { trigger: "task:build:failed", question: { en: "Which target failed - the board one or the host one? The answer decides where to look.", de: "Welches Target ist gescheitert - das Board- oder das Host-Target? Die Antwort entscheidet, wo du suchst." }, hints: [ { en: "The payload is a byte array, and the length argument is a count of bytes, not of elements plus terminator.", de: "Die Nutzlast ist ein Byte-Array, und das Längenargument ist eine Byte-Anzahl, nicht Elemente plus Abschlusszeichen." }, { en: "The address argument is a plain 32-bit integer in host byte order, so no conversion function belongs there.", de: "Das Adressargument ist eine schlichte 32-Bit-Zahl in Host-Bytereihenfolge, dort gehört also keine Konvertierungsfunktion hin." }, { en: "Compare the argument types against the declaration in the header; four arguments, and only one of them is a pointer.", de: "Vergleich die Argumenttypen mit der Deklaration im Header; vier Argumente, und nur eines davon ist ein Zeiger." } ] }
  - { trigger: "question:no-link:weak", question: { en: "The function returns nothing. What is the only way it can react to a problem, and what does that say about who is responsible for the link?", de: "Die Funktion gibt nichts zurück. Wie kann sie überhaupt auf ein Problem reagieren, und was sagt das darüber, wer für den Link verantwortlich ist?" }, hints: [ { en: "Read the contract paragraph in modules/net/include/cads/net/net.h above the declaration.", de: "Lies den Vertragsabsatz in modules/net/include/cads/net/net.h über der Deklaration." }, { en: "UDP itself has the same property: a datagram that is not delivered produces no notification anywhere.", de: "UDP selbst hat dieselbe Eigenschaft: ein nicht zugestelltes Datagramm erzeugt nirgends eine Meldung." }, { en: "Your answer needs the consequence for the placement of your call, not only the behaviour of the function.", de: "Deine Antwort braucht die Folge für die Platzierung deines Aufrufs, nicht nur das Verhalten der Funktion." } ] }
---
## Learning goal

Send one real UDP datagram from the board's own lwIP stack and receive it on your laptop, using the link-wait loop every network caller in this codebase shares.

## One call

There is no built-in "send a packet" command, but `apps/bringup/explorer_ping_demo.c` already does everything except the send: `cads_net_init()`, then the link-wait loop, then the ping. The API for the missing piece is a single function (`modules/net/include/cads/net/net.h`):

```c
void cads_net_udp_send(uint32_t dst_ip, uint16_t dst_port,
                       const uint8_t* payload, uint16_t len);
```

`dst_ip` and `dst_port` are host byte order. There is no socket object, no queue and **no return value** — the same fire-and-forget contract UDP itself has. What that means for a call that comes too early is in the contract paragraph above the declaration in `modules/net/include/cads/net/net.h`; the third task of this step asks about it. `apps/marauder`'s PCAP relay is the one existing caller.

## The edit

Open `apps/bringup/explorer_ping_demo.c`. After `cads_net_init()` comes the link-wait loop — `cads_net_poll()`, `cads_net_status()`, break on `link_up`, `cads_hal_delay_ms(10u)`, for at most 3000 ms. Right after that loop, before `char target_text[16];`, three lines belong. Two of them are here:

```c
    /* lwip-udp-hello: one UDP datagram to the laptop */
    uint32_t laptop_ip = (192u << 24) | (168u << 16) | (33u << 8) | 10u; /* 192.168.33.10 */
    static const uint8_t hello_payload[] = "hello from cads-zero\n";
```

The third is the call itself. Its signature is above in this step and in the header; port `41234` is an arbitrary choice, and the length argument is a **byte count** — think about whether the string literal's terminating zero should go on the wire. That is the whole lesson: build the address as a host-order integer, hand lwIP a buffer, done. Change the last octet if your laptop's address is not `.10`.

## Wiring the laptop

The board is static at `192.168.33.99/24`, so give your laptop any free address in that `/24` on the interface cabled to the board (on macOS: `sudo ifconfig en0 alias 192.168.33.10 255.255.255.0`), then listen with `nc -ul 41234`. Port 41234 is arbitrary; it just stays clear of 37008, which the Marauder relay already uses.

## Fire and check

Build for both targets — the host build links a stub that never sends, which is expected, not a bug. Flash, leave the app tree with `scripts/board_key.py quit`, then run the existing ping command with target and count as **one quoted argument**:

```
scripts/board_cmd.py P "c0a8210a 1" --timeout 5
```

`c0a8210a` is `192.168.33.10` in hex. The hello leaves once the link-wait loop breaks, before the ping loop even starts, so it goes out whether or not your laptop answers ICMP. `nc` should print `hello from cads-zero`. If nothing arrives, the tutorial's troubleshooting table covers every case — none of them is a board-side bug to chase over SWD.

## Your task

Make the edit and build the firmware for both targets. The first check requires the call with an argument — a declaration or a comment does not pass it. Then flash, fire the ping demo, and watch the datagram land in `nc`. Finally answer the question on what would happen to the datagram if the link were still down when the call runs.
