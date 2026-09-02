---
id: m7-02-udp-hello
title: Send your first UDP datagram
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
    title: The ping demo now sends a UDP hello
    check: { type: fileMatches, file: "apps/bringup/explorer_ping_demo.c", pattern: "cads_net_udp_send" }
  - id: build
    title: The firmware builds with your change
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: linked
    title: The UDP send path is linked into the image
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_net_udp_send" }
socratic:
  - { trigger: "task:add-send:failed", question: { en: "The tutorial names an exact place for the new call. Which loop does it sit right after, and what is the first statement that follows that loop today?", de: "Das Tutorial nennt einen genauen Ort für den neuen Aufruf. Direkt hinter welcher Schleife sitzt er, und welche Anweisung folgt heute auf diese Schleife?" }, hints: [ { en: "Open apps/bringup/explorer_ping_demo.c and find the link-wait loop that polls until status.link_up.", de: "Öffne apps/bringup/explorer_ping_demo.c und finde die Link-Warteschleife, die pollt, bis status.link_up gilt." }, { en: "Insert the call after that loop and before 'char target_text[16];' - not inside the loop, and not before cads_net_init().", de: "Füge den Aufruf hinter dieser Schleife und vor 'char target_text[16];' ein - nicht in der Schleife und nicht vor cads_net_init()." }, { en: "cads_net_udp_send(laptop_ip, 41234u, hello_payload, sizeof(hello_payload) - 1u); with laptop_ip built as (192u<<24)|(168u<<16)|(33u<<8)|10u.", de: "cads_net_udp_send(laptop_ip, 41234u, hello_payload, sizeof(hello_payload) - 1u); mit laptop_ip als (192u<<24)|(168u<<16)|(33u<<8)|10u." } ] }
---
## Learning goal

Send one real UDP datagram from the board's own lwIP stack and receive it on your laptop, using the link-wait loop every network caller in this codebase shares.

## One call

There is no built-in "send a packet" command, but `apps/bringup/explorer_ping_demo.c` already does everything except the send: `cads_net_init()`, then the link-wait loop, then the ping. The API for the missing piece is a single function (`modules/net/include/cads/net/net.h`):

```c
void cads_net_udp_send(uint32_t dst_ip, uint16_t dst_port,
                       const uint8_t* payload, uint16_t len);
```

`dst_ip` and `dst_port` are host byte order. There is no socket object, no queue and no return value: a transient failure drops this one datagram, which is the same fire-and-forget contract UDP itself has. It silently does nothing if the link is not up or `dst_ip` is 0, so a caller needs no link check of its own before every send. `apps/marauder`'s PCAP relay is the one existing caller.

## The edit

Open `apps/bringup/explorer_ping_demo.c`. After `cads_net_init()` comes the link-wait loop — `cads_net_poll()`, `cads_net_status()`, break on `link_up`, `cads_hal_delay_ms(10u)`, for at most 3000 ms. Right after that loop, before `char target_text[16];`, add:

```c
    /* lwip-udp-hello: one UDP datagram to the laptop */
    uint32_t laptop_ip = (192u << 24) | (168u << 16) | (33u << 8) | 10u; /* 192.168.33.10 */
    static const uint8_t hello_payload[] = "hello from cads-zero\n";
    cads_net_udp_send(laptop_ip, 41234u, hello_payload, sizeof(hello_payload) - 1u);
```

That is the whole lesson: build the address as a host-order integer, hand lwIP a buffer, done. Change the last octet if your laptop's address is not `.10`.

## Wiring the laptop

The board is static at `192.168.33.99/24`, so give your laptop any free address in that `/24` on the interface cabled to the board (on macOS: `sudo ifconfig en0 alias 192.168.33.10 255.255.255.0`), then listen with `nc -ul 41234`. Port 41234 is arbitrary; it just stays clear of 37008, which the Marauder relay already uses.

## Fire and check

Build for both targets — the host build links a stub that never sends, which is expected, not a bug. Flash, leave the app tree with `scripts/board_key.py quit`, then run the existing ping command with target and count as **one quoted argument**:

```
scripts/board_cmd.py P "c0a8210a 1" --timeout 5
```

`c0a8210a` is `192.168.33.10` in hex. The hello leaves once the link-wait loop breaks, before the ping loop even starts, so it goes out whether or not your laptop answers ICMP. `nc` should print `hello from cads-zero`. If nothing arrives, the tutorial's troubleshooting table covers every case — none of them is a board-side bug to chase over SWD.

## Your task

Make the edit, build the firmware, and confirm the send path is linked. Then flash, fire the ping demo, and watch the datagram land in `nc`.
