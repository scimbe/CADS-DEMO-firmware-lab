---
id: m7-02-udp-hello
title: Dein erstes UDP-Datagramm senden
bloom: apply
objectives: [firmware-tutorials-lwip-udp-hello]
requires: [m7-01-lwip-netif]
estimatedMinutes: 20
links:
  - { step: m7-03-dhcp-stack-lesson }
  - { doc: "docs/tutorials/lwip-udp-hello.md" }
  - { file: "modules/net/include/cads/net/net.h", line: 180 }
  - { file: "apps/bringup/explorer_ping_demo.c", line: 31 }
sources: [docs/tutorials/lwip-udp-hello.md, modules/net/include/cads/net/net.h, apps/bringup/explorer_ping_demo.c, docs/reference/lwip-udp-tutor-steps.json]
tasks:
  - id: add-send
    title: Die Ping-Demo sendet jetzt ein UDP-Hello
    check: { type: fileMatches, file: "apps/bringup/explorer_ping_demo.c", pattern: "cads_net_udp_send" }
  - id: build
    title: Die Firmware baut mit deiner Änderung
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: linked
    title: Der UDP-Sendepfad ist ins Image gelinkt
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_net_udp_send" }
socratic:
  - { trigger: "task:add-send:failed", question: { en: "The tutorial names an exact place for the new call. Which loop does it sit right after, and what is the first statement that follows that loop today?", de: "Das Tutorial nennt einen genauen Ort für den neuen Aufruf. Direkt hinter welcher Schleife sitzt er, und welche Anweisung folgt heute auf diese Schleife?" }, hints: [ { en: "Open apps/bringup/explorer_ping_demo.c and find the link-wait loop that polls until status.link_up.", de: "Öffne apps/bringup/explorer_ping_demo.c und finde die Link-Warteschleife, die pollt, bis status.link_up gilt." }, { en: "Insert the call after that loop and before 'char target_text[16];' - not inside the loop, and not before cads_net_init().", de: "Füge den Aufruf hinter dieser Schleife und vor 'char target_text[16];' ein - nicht in der Schleife und nicht vor cads_net_init()." }, { en: "cads_net_udp_send(laptop_ip, 41234u, hello_payload, sizeof(hello_payload) - 1u); with laptop_ip built as (192u<<24)|(168u<<16)|(33u<<8)|10u.", de: "cads_net_udp_send(laptop_ip, 41234u, hello_payload, sizeof(hello_payload) - 1u); mit laptop_ip als (192u<<24)|(168u<<16)|(33u<<8)|10u." } ] }
---
## Lernziel

Sende ein echtes UDP-Datagramm aus dem lwIP-Stack des Boards und empfange es auf deinem Laptop — mit der Link-Warteschleife, die jeder Netzwerkaufrufer in dieser Codebasis teilt.

## Ein Aufruf

Es gibt keinen eingebauten „Paket senden"-Befehl, aber `apps/bringup/explorer_ping_demo.c` erledigt bereits alles außer dem Senden: `cads_net_init()`, dann die Link-Warteschleife, dann den Ping. Die API für das fehlende Stück ist eine einzige Funktion (`modules/net/include/cads/net/net.h`):

```c
void cads_net_udp_send(uint32_t dst_ip, uint16_t dst_port,
                       const uint8_t* payload, uint16_t len);
```

`dst_ip` und `dst_port` sind Host-Byte-Order. Es gibt kein Socket-Objekt, keine Warteschlange und keinen Rückgabewert: ein vorübergehender Fehler verwirft genau dieses eine Datagramm, derselbe Fire-and-forget-Vertrag, den UDP selbst hat. Ist der Link nicht oben oder `dst_ip` gleich 0, tut die Funktion stillschweigend nichts, sodass ein Aufrufer vor jedem Senden keine eigene Link-Prüfung braucht. Der PCAP-Relay von `apps/marauder` ist der einzige bestehende Aufrufer.

## Die Änderung

Öffne `apps/bringup/explorer_ping_demo.c`. Nach `cads_net_init()` kommt die Link-Warteschleife — `cads_net_poll()`, `cads_net_status()`, Abbruch bei `link_up`, `cads_hal_delay_ms(10u)`, höchstens 3000 ms lang. Direkt hinter dieser Schleife, vor `char target_text[16];`, fügst du ein:

```c
    /* lwip-udp-hello: ein UDP-Datagramm an den Laptop */
    uint32_t laptop_ip = (192u << 24) | (168u << 16) | (33u << 8) | 10u; /* 192.168.33.10 */
    static const uint8_t hello_payload[] = "hello from cads-zero\n";
    cads_net_udp_send(laptop_ip, 41234u, hello_payload, sizeof(hello_payload) - 1u);
```

Das ist die ganze Lektion: die Adresse als Host-Order-Integer bauen, lwIP einen Puffer geben, fertig. Ändere das letzte Oktett, falls dein Laptop nicht `.10` hat.

## Den Laptop verkabeln

Das Board ist statisch auf `192.168.33.99/24`, gib deinem Laptop also eine freie Adresse in diesem `/24` auf der Schnittstelle, die zum Board führt (macOS: `sudo ifconfig en0 alias 192.168.33.10 255.255.255.0`), und lausche mit `nc -ul 41234`. Port 41234 ist willkürlich; er bleibt nur 37008 fern, den der Marauder-Relay schon benutzt.

## Abfeuern und prüfen

Baue für beide Targets — der Host-Build linkt einen Stub, der nie sendet; das ist erwartet, kein Fehler. Flashe, verlasse den App-Baum mit `scripts/board_key.py quit`, und führe den vorhandenen Ping-Befehl mit Ziel und Anzahl als **einem zitierten Argument** aus:

```
scripts/board_cmd.py P "c0a8210a 1" --timeout 5
```

`c0a8210a` ist `192.168.33.10` in Hex. Das Hello geht raus, sobald die Link-Warteschleife abbricht, noch bevor die Ping-Schleife beginnt — also unabhängig davon, ob dein Laptop ICMP beantwortet. `nc` sollte `hello from cads-zero` ausgeben. Kommt nichts an, deckt die Fehlertabelle des Tutorials jeden Fall ab — keiner davon ist ein Board-seitiger Fehler, dem du über SWD nachjagen müsstest.

## Deine Aufgabe

Nimm die Änderung vor, baue die Firmware und bestätige, dass der Sendepfad gelinkt ist. Flashe dann, feuere die Ping-Demo ab und sieh zu, wie das Datagramm in `nc` landet.
