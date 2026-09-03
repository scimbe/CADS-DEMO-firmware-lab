# Bridge-Strang – Arbeitsnotizen (cads-probe / cads-board-bridge)

Ergänzend zu `docs/SPEC.md` (§2, §3.1, §3.2). Hier stehen die empirischen Befunde, Messwerte und
Abweichungen von der Spezifikation mit Begründung.

## B0 – Machbarkeit (2026-09-02)

Testaufbau: `codercom/code-server:latest` (4.135.0, Code 1.135.0) auf `127.0.0.1:8085`, `--auth none`,
`--disable-workspace-trust`, beide VSIX per `code-server --install-extension`.

| Frage | Befund |
|---|---|
| Läuft eine Web-Extension (nur `browser`-Entry) in code-server im Web-Worker-Extension-Host? | **Ja.** `cads.probe.ping` liefert `worker: "function"` (`importScripts` vorhanden), `location: blob:http://127.0.0.1:8085/…`; der Host-iframe ist `…/webWorkerExtensionHostIframe.html?vscodeWebWorkerExtHostId=…` (same-origin). |
| Sind `navigator.usb` / `navigator.serial` / `navigator.hid` im Worker definiert? | **Ja**, alle drei `"object"` (Chromium 1228 headless, Google Chrome headed). |
| Erreicht die Node-Extension die Web-Extension per `executeCommand`? | **Ja.** `cads.bridge.ping` → `cads.probe.ping`: Round-Trip 16–18 ms (Node v24.18.1 im Container). |
| Existiert `workbench.experimental.requestUsbDevice` / `…requestSerialPort`? | Ja (kein „command not found“). Der Aufruf blockiert, bis der native Chooser bedient ist – in Playwright/Chromium-headless erscheint kein bedienbarer Dialog, der Promise bleibt hängen (>12 s, kein Toast). |
| Chooser-freie Freigabe (Automatisierung/B3) | **WebUSB: funktioniert per Chrome-Policy** `WebUsbAllowDevicesForUrls` (siehe unten): `navigator.usb.getDevices()` liefert im Hauptfenster `STM32 STLink`, VID 0x0483 / PID 0x374B, Serial `066FFF565282494867161033`, ohne Chooser. |
| Chooser-Automatisierung per CDP `DeviceAccess` | **Nicht reproduzierbar**: weder in Chrome headed noch in Chromium-headless-shell (dort sofort `NotFoundError: No device selected`) noch in Chrome `--headless=new` (Timeout) hat `DeviceAccess.deviceRequestPrompted` gefeuert. Nicht weiter verfolgt, da die Policy-Route für USB trägt. |

**Entscheidung:** Architektur wie Spec §2 (Treiber im Web-Worker-Extension-Host). Der Webview-Fallback (§2.1)
wird nicht benötigt. Der Treiber bleibt trotzdem frei von VS-Code-/DOM-Abhängigkeiten.

### Chrome-Policies auf macOS (Automatisierung)

`defaults write com.google.Chrome …` landet auf macOS auf der Ebene **„Aktueller Nutzer / Empfohlen“**
(chrome://policy). Die Werte müssen typisiert sein (Integer, nicht String) – daher als XML-Plist schreiben:

```bash
defaults write com.google.Chrome WebUsbAllowDevicesForUrls '<array><dict><key>devices</key><array><dict><key>vendor_id</key><integer>1155</integer><key>product_id</key><integer>14155</integer></dict></array><key>urls</key><array><string>http://127.0.0.1:8085</string></array></dict></array>'
defaults write com.google.Chrome SerialAllowUsbDevicesForUrls '<array><dict><key>devices</key><array><dict><key>vendor_id</key><integer>1155</integer><key>product_id</key><integer>14155</integer></dict></array><key>urls</key><array><string>http://127.0.0.1:8085</string></array></dict></array>'
```

- `WebUsbAllowDevicesForUrls`: Status **Gültig** auf Ebene „Empfohlen“ – und wirksam (getDevices liefert den ST-Link).
- `SerialAllowUsbDevicesForUrls`: Status **Fehler – „Richtlinienebene wird nicht unterstützt“**. Diese Policy
  akzeptiert nur die Ebene „Obligatorisch“, die auf macOS nur über `/Library/Managed Preferences/…` (root/MDM)
  erreichbar ist. **Folge:** Der WebSerial-Pfad lässt sich ohne Operator (sudo oder einmaliger manueller Chooser-Klick
  in einem persistenten Chrome-Profil) nicht chooser-frei automatisieren. Der WebUSB-Pfad (Flash, Debug) schon.

Rücknahme: `defaults delete com.google.Chrome WebUsbAllowDevicesForUrls SerialAllowUsbDevicesForUrls`.

### Betriebsnotizen
- Docker Desktop hat hier nur ~1.9 GiB VM-RAM: zwei parallele Browser-Sitzungen gegen denselben code-server
  haben den Container per OOM beendet (`OOMKilled=true`). Tests deshalb sequenziell fahren.
- Ausgangszustand der Hardware: `st-info --probe` meldete `chipid 0x000` (Target nicht ansprechbar, ST-Link selbst ok);
  `st-info --probe --connect-under-reset` hat den Zustand aufgelöst (0x419, STM32F42x_F43x). NOD_F429ZI war gemountet
  → `diskutil unmount force /Volumes/NOD_F429ZI`. Board bootet danach normal (Selbsttest 10/10 PASS, Explorer-Prompt).

Screenshot: `docs/evidence/b0-chrome-8085.png` (Google Chrome, Ping-Toast nach `cads.bridge.ping`).

## B1 – cads-probe (Treiber-Port), 2026-09-03

Der WebUSB-ST-Link-Treiber ist nach `extensions/cads-probe/src/driver/` portiert (TypeScript strict,
worker-tauglich: kein `document`/`window`, Logger injizierbar, Lizenz-Header behalten). Aufbau:

| Datei | Inhalt |
|---|---|
| `stlinkusb.ts` | USB-Transport, Timeout pro Transfer (2 s Default), fatale Fehler „vergiften" die Verbindung |
| `stlinkv2.ts` | ST-Link/V2-API v2: Version/Voltage/Mode, SWD-Enter, READALLREGS, RW-Status, NRST |
| `cortexm.ts` | Halt/Run/Step (Step mit `C_MASKINTS`), Reset-Halt via `VC_CORERESET`, Register (DCRSR/DCRDR für xPSR/MSP/PSP/PRIMASK/BASEPRI/FAULTMASK/CONTROL), gechunkter Speicherzugriff, Halt-Grund aus DFSR |
| `stm32fs.ts` | STM32F2/F4-Sektor-Flash mit allen CADS-Fixes (**halt statt reset**, EOP/OPERR kein Fehler, RMW-Schreibzugriffe auf FLASH_CR, 4×-Erase-Marge). **Keine Mass-Erase-Funktion.** |
| `breakpoints.ts` | FPB v1/v2 (Flash) + SW-BKPT (RAM), DWT-Watchpoints |
| `serial.ts` | WebSerial-Konsole (open/write/close, Reader-Loop → `serial-data`) |
| `probe.ts` | `ProbeService`: Mutex-Serialisierung, `op`/`batch`, DHCSR-Poller (≤100 ms, nur `running`), Reconnect via `getDevices()`/`getPorts()`, Connect-under-Reset-Recovery, Flash nur 0x08000000–0x080FFFFF |

Der `flash`-Pfad erzwingt zusätzlich das Firmware-Fenster (Bank 1) und endet mit `reset halt`, damit der
Aufrufer den Folgezustand bestimmt. Unit-Tests: `extensions/cads-probe/test/` (17 Tests, node:test) gegen einen
simulierten ST-Link + STM32F429 (Register, Speicher, FPB/DWT, Flash mit Verify, USB-Timeout, Kabelabzug, Serial).

## B2 – cads-board-bridge (Node), 2026-09-03

- **RSP-Server** (`src/rsp/`): Paket-Parser/Encoder (Escapes, RLE, Ctrl-C), `GdbSession` mit qSupported/No-Ack,
  `target.xml` (m-profile + m-system), Memory-Map, `g/G/p/P/m/M/X`, `c/s/vCont`, `Z0–Z4`, `vFlash*`,
  `qRcmd reset|reset halt|halt`, Stop-Replies, Read-Cache während `halted`. **Memory-Map enthält Peripherie
  (0x40000000) und PPB/SCS (0xE0000000) als `ram`**, sonst blockiert GDB Register-/Peripherie-Reads
  (`mem-inaccessible-by-default`).
- **BoardController** (`board.ts`): Flash aus `.bin`/`.elf` (eigener ELF-Loader), Serial-Zeilen, `waitForSerial`,
  Events (`flash-done/failed`, `reset`, `debug-*`).
- **HTTP-Shim** (`http.ts`) auf 3335: `/status /probe /flash /reset /halt /op /command /log /serial`;
  `/erase` → 403 „not permitted".
- **Serial-TCP** 3334 + **socat-PTY** (nur wenn `socat` vorhanden).
- **extension.ts**: Commands `cads.board.*`, Statusleiste mit Menü, Pseudoterminal „CaDS Board Console",
  `DebugConfigurationProvider` für cortex-debug, Exports-API (Spec §3.2 + `connect`/`reset`).
- Tests: RSP-Layer + `GdbSession` gegen Mock-Probe **und echtes `arm-none-eabi-gdb`/`gdb-multiarch --batch`**
  (`target extended-remote`, `info registers`, hwbreak, `x/4xw`, `set {int}`, `stepi`, `monitor reset halt`,
  `detach`). 18 Tests. `spawnSync` blockiert den Event-Loop → Integrationstest nutzt async `spawn`.

## B3 – Hardware-Verifikation Ende-zu-Ende (real Chrome + WebUSB), 2026-09-03

Container `codercom/code-server:latest` auf 8085 mit `marus25.cortex-debug` (1.13.0-pre6), `gdb-multiarch`
(Debian 16.3), `socat`, den drei VSIX und `cads-zero.{elf,bin}` + SVD als Workspace. Browser: echtes Google
Chrome (Playwright `channel:'chrome'`), WebUSB per Policy freigegeben.

| Nachweis | Ergebnis |
|---|---|
| (a) Connect ohne Chooser | Beim Laden automatisch: `usb connected`, ST-Link V2-1 V2J33M25, STM32F42x/F43x (chip 0x419), 2048 KB Flash, 3.24 V. |
| (b) Flash `cads-zero.bin` + Verify + Boot | 327088 Bytes, **13.2–13.3 s**, verify ok; Board bootet (Selbsttest 10/10, `# RESULT: PASS`, `# EXPLORER ready`), gelesen auf der Mac-VCP `/dev/cu.usbmodem1303`. |
| (c) F5 cortex-debug | Stop an `main` (Callstack `main@0x0802310a main.c:13`, MI `state="stopped"`, `Cortex-M4 (halted)`); Register-Ansicht (r0…, sp=0x1000ffe8, msp/psp/control via DCRSR); Step Over → Callstack `cads_bringup_run@0x080235d4 bringup.c:253` → `main` (2 Frames), lokale Variablen; Breakpoint in `cads_explorer_app_demo` beim Boot getroffen; SCS-Read `0xE000ED00` = `0x410fc241` (CPUID); Continue; Stop (Shift+F5) → **Board läuft weiter** (Resume-on-Disconnect). Screenshots: `docs/evidence/b3-cortex-debug-stop-main.png`, `…-stepped-callstack.png`. |
| (d) Replug-Szenario | `device.close()` + Reconnect via `getDevices()` ohne Chooser: `usb connected` wieder da. |
| (e) `st-flash`-Shim-Pfad | `curl -X POST --data-binary @cads-zero.bin 'http://127.0.0.1:3335/flash?addr=0x08000000'` aus dem Container: 327088 Bytes, 13.3 s, Board bootet. |
| Kein ST-Link-Wedge | Während Chrome das Gerät hält: `st-info --probe` → „Found 0 stlink programmers" (erwartet, exklusiver Zugriff). Nach Extension-Disconnect (`device.close()`): `st-info --probe` → „Found 1 … chipid 0x419 … STM32F42x_F43x". Kein physischer Replug nötig. |

**Messwerte:** Flash 327088 Bytes verify: 13.2–13.3 s (≈24 KB/s über WebUSB). Probe-Op end-to-end über den
HTTP-Shim (curl→Bridge→executeCommand→Worker→WebUSB→ST-Link→zurück): 94–115 ms. Reiner
`executeCommand`-Round-Trip Node↔Worker (ohne USB): 16–23 ms. Step-Latenz: ≈100 ms.

### WebSerial-Konsole im Browser – Chooser nötig
Der Preferences-Weg (`serial_chooser_data` in `<profile>/Default/Preferences` mit
`chosen-objects:[{name,vendor-id:1155,product-id:14155,serial-number:…}]`) wurde umgesetzt und getestet:
`navigator.serial.getPorts()` liefert danach **`[]`** – Chrome stellt WebSerial-Freigaben nicht aus der
Preferences-Datei wieder her (anders als WebUSB, das über die identische Struktur unter `usb_chooser_data`
funktioniert und den ST-Link ohne Chooser liefert). Die WebUSB-Policy `WebUsbAllowDevicesForUrls` greift; die
Serial-Policy `SerialAllowUsbDevicesForUrls` nur auf Ebene „Obligatorisch" (root/MDM), nicht per `defaults`.

**Folge für den Betrieb:** Flash + Debug (WebUSB) laufen chooser-frei. Die serielle Konsole im Browser braucht
**einmalig** die manuelle Freigabe durch die studierende Person: Statusleiste „🔌 Board" → „Konsole öffnen",
im Chrome-Serial-Dialog den ST-Link-VCP (VID 0x0483) wählen; danach hält `getPorts()` den Port über Reloads.
Für die automatisierte E2E wurde der serielle Pfad mit Mocks vollständig abgedeckt (2 Tests: Datenfluss,
Schreiben, sauberes Schließen, Geräteverlust); der Boot-Beweis lief über die Mac-VCP.

### Stand des ST-Links am Sessionende (2026-09-03, wichtig)
Nach Abschluss aller B3-Nachweise, beim finalen Aufräumen vom Mac aus (`st-flash reset`, direkt nachdem Chrome
das USB-Gerät freigegeben hatte), ist der ST-Link in den bekannten Wedge-Zustand gelaufen: `st-flash reset`
→ `LIBUSB_ERROR_TIMEOUT` (DEBUG_EXIT), danach `st-info --probe` → `chipid 0x000`, auch
`--connect-under-reset` läuft in Timeout. Der VCP (`/dev/cu.usbmodem1303`) ist weiter enumeriert; nur die
SWD-Protokoll-Zustandsmaschine des ST-Links hängt. Gemäß den cads-zero-Regeln **nicht weiter probiert**.

Wichtig: Das ist **kein** Fehler des WebUSB-Pfads. Über den gesamten Lauf hat WebUSB (Flash, Debug,
Disconnect) den ST-Link **nie** gewedged; die B3-Nachweise liefen sauber, inkl. sauberem Disconnect, nach dem
`st-info` das Gerät wieder sah. Der Wedge entstand erst durch ein Mac-seitiges `st-flash reset`, das mit der
USB-Freigabe durch Chrome zusammenfiel (ST-Link-Wedge-Ursache #2 aus cads-zero/CLAUDE.md: Client-Zugriff, der
mit einem Übergang kollidiert). Die Firmware im Flash ist intakt (vielfach geflasht, verifiziert, gebootet).

**Recovery (Operator):** ST-Link einmal physisch ab- und wieder anstecken, dann
`diskutil list external` → `diskutil unmountDisk /dev/diskN` für `NOD_F429ZI`, danach
`st-flash write /Users/dev/Documents/git/cads-zero/build/itsboard/cads-zero.bin 0x08000000 && st-flash reset`
(oder nur `st-flash reset`, da die Firmware unverändert ist). Danach bootet das Board wieder normal.

## Regressionstest gegen next-dbfa3c5 (2026-09-03)

Testaufbau: `docker run -d --name hw-lab -p 127.0.0.1:8091:8080 -e PASSWORD=hw-test
ghcr.io/scimbe/cads-firmware-lab:next-dbfa3c5`. Das produktive Image bringt `cads.cads-probe-0.1.3`
und `cads.cads-board-bridge-0.1.3` mit – exakt die Versionen aus diesem Worktree, der Test ist also
1:1 gegen den Stand von B1–B3. Ausserdem enthalten: `marus25.cortex-debug` 1.13.0-pre6,
`mcu-debug.peripheral-viewer` 1.6.3, `mcu-debug.memory-view`, `gdb-multiarch`, `socat`.
Browser: echtes Google Chrome 152 (Playwright `channel:'chrome'`, headed, persistentes Profil),
WebUSB per Policy auf `http://127.0.0.1:8091` freigegeben.

### Vorlauf: Hardware nachweislich gesund

| Zeit | Schritt | Ergebnis |
|---|---|---|
| 08:26 | `diskutil unmountDisk /dev/disk4` | NOD_F429ZI war beim Start gemountet, unmount ok |
| 08:28 | `st-info --probe` | V2J33S25, SN 066FFF565282494867161033, **chipid 0x419**, STM32F42x_F43x |
| 08:29 | `st-flash reset` + serielle Mitschrift | Board bootet, `1..10`, `# 10/10 passed`, `# RESULT: PASS`, `# EXPLORER ready` |

Nebenbefund zur Konsole: direkt nach dem Anstecken war `/dev/cu.usbmodem1303` stumm. Das ist **kein**
Fehler – `boot.autostart=1` startet die App-Demo, und die ignoriert getippte Bytes bewusst
(siehe cads-zero `docs/reference/explorer-console.md`). Nach `st-flash reset` kam die volle
Boot-Ausgabe. Wer hier "Board tot" diagnostiziert, sitzt der Autostart-Falle auf.

### Befund: ST-Link im Wedge, bevor der eigentliche Test lief

Beim ersten WebUSB-Attach meldete die Bridge reproduzierbar:

```
[probe] probe attach failed: transferOut: timeout after 2000 ms
```

USB-Diagnose direkt im Seitenkontext (Extension-Handle vorher per
`POST /command {"command":"cads.board.disconnect"}` freigegeben):

| Schritt | Ergebnis |
|---|---|
| `navigator.usb.getDevices()` | liefert chooser-frei `STM32 STLink`, VID 1155 / PID 14155, SN 066FFF565282494867161033 |
| `open()`, `selectConfiguration(1)`, `claimInterface(0)` | alle ok |
| Endpunkte Interface 0 | `in1:bulk, out1:bulk, in2:bulk` – genau die Pipes 0x01/0x81 aus `DEV_TYPES` |
| `transferOut(1, GET_VERSION)` | **Timeout** |
| `clearHalt('out',1)` / `clearHalt('in',1)` | gehen durch, `transferOut` danach weiter Timeout |
| `device.reset()` | `NetworkError: Unable to reset the device` |

Nach sauberem Schliessen von Chrome (SIGTERM auf den Playwright-Prozess, **kein** `kill -9`; danach
hält kein Prozess mehr das Geraet) vom Mac aus zweimal bestaetigt:
`Failed to enter SWD mode`, `Found 1 stlink programmers`, `version: V2`, **`chipid: 0x000`**,
`dev-type: unknown`. Gemaess cads-zero/CLAUDE.md und `docs/SAFETY.md` ab hier **nicht weiter
probiert** – ein Wedge löst nur ein physischer Replug.

### Bewertung: kein Bridge-Bug nachweisbar

Der Wedge ist **nicht** WebUSB anzulasten, und ebenso wenig laesst sich WebUSB freisprechen –
die Beweislage traegt nur die schwaechere Aussage. Dafuer spricht:

- Der **allererste** `transferOut` lief ins Timeout. Es gab keine angefangene Transaktion, die der
  WebUSB-Pfad haette zerreissen koennen; der Treiber hat nur ein Kommando abgesetzt und nie eine
  Antwort bekommen.
- Zwischen dem letzten gesunden Nachweis (08:29, Board bootet) und dem ersten WebUSB-Zugriff (08:43)
  lagen 14 Minuten ohne jeden Zugriff – aber in diesem Fenster hat macOS **NOD_F429ZI erneut
  gemountet** (um 08:53 erneut vorgefunden, zweimal nachtraeglich unmounted). Das ist Wedge-Ursache
  (1) aus cads-zero/CLAUDE.md: macOS schreibt ungefragt Metadaten auf das MBED-Massenspeicher-Volume,
  und der ST-Link deutet Schreibzugriffe dort als Firmware fuer 0x08000000. Ein `st-flash reset`
  re-enumeriert das Geraet und loest genau dieses Auto-Mount aus – der Reset um 08:29 ist damit der
  plausibelste Ausloeser.
- Die Bridge selbst hat sich in jedem Punkt korrekt verhalten: Geraet gefunden, Interface geclaimt,
  Timeout mit `withTimeout` sauber abgefangen, Fehler als `probe attach failed` gemeldet, kein
  Haenger, kein Absturz, Status-JSON konsistent (`usb: "error"`, `lastError` gesetzt).

**Konsequenz fuer den Betrieb (neu):** `diskutil unmountDisk` fuer NOD_F429ZI ist nicht nur nach
jedem *Replug* noetig, sondern nach **jedem `st-flash reset`** – der Reset re-enumeriert den
Composite-Device und macOS mountet das Volume sofort wieder. In einer unbeaufsichtigten Testsitzung
gehoert deshalb ein Unmount unmittelbar hinter jeden Reset, sonst wedged der ST-Link irgendwann von
selbst, ohne dass ein Client etwas falsch gemacht hat.

### Ergebnis nach dem Replug: alle Nachweise gruen

Nach dem physischen Replug (`--connect-under-reset` löste den ersten, leichten Wedge sogar ohne
Replug auf) lief der komplette Test in **einer** durchgehenden Browser-Sitzung durch:

| Nachweis | Ergebnis |
|---|---|
| (a) Connect über die Statusleiste, chooser-frei | `Board: verbunden · läuft`; Menü vollständig (Flash, Reset, Anhalten, Konsole öffnen, Log anzeigen, Trennen). `/probe`: ST-Link V2-1 **V2J33M25**, SN 066FFF565282494867161033, 3.24 V; Target STM32F42x/F43x, chipId 0x419, coreId 0x2BA01477, 2048 KB Flash, 256 KB SRAM. |
| (b) Flash aus dem Board-Menü | Mac-Binary `cads-zero.bin`, 327088 Bytes (md5 ce03f3df347056cd18bc805cb5c0b4d0): **15019 ms** inkl. Verify. Zweiter Flash über den `st-flash`-Shim als `preLaunchTask`: 327076 Bytes in **14017 ms**. |
| (c) Boot nach dem Flash | Reset aus dem Board-Menü, mitgelesen auf `/dev/cu.usbmodem1303`: `CaDS Zero v0.1.0`, `1..10`, zehn `ok`-Zeilen, `# 10/10 passed`, `# RESULT: PASS`, `# EXPLORER ready`. |
| (d) F5 mit cortex-debug | Halt am Einsprungpunkt: Call-Stack `Paused on breakpoint`, `main@0x0802310a`, `targets/itsboard/main.c:13`; Variables mit Local/Global/Static/Registers; **XPERIPHERALS** aus der SVD (ADC1 @0x40012000, ADC2 @0x40012100, ADC3 @0x40012200, C_ADC @0x40012300, CAN1 @0x40006400); `core=halted`, `gdbClients=1`. |
| (e) Sauberes Beenden | Nach `Debug: Stop`: `core=running`, `gdbClients=0` – das Board läuft weiter (Resume-on-Disconnect wie in B3). |
| (f) Sauberes Trennen | `cads.board.disconnect` → `usb: absent`; danach sieht der Mac die ST-Link wieder. |

Die Messwerte decken sich mit B3 (13.2–13.3 s dort, 14.0–15.0 s hier; ≈22 KB/s über WebUSB).

Screenshots im Doku-Repo (`CADS-DEMO-firmware-lab-docs`, Commit b3f4dd9):
`assets/13-board-connected.png`, `14-flash-progress.png`, `15-debug-session.png`,
`16-board-console.png`.

### Gefunden und gefixt: `listen()` ohne Retry (EADDRINUSE)

Reproduzierbar und alltäglich: code-server hält einen Extension-Host nach dem Trennen des Browsers
für `VSCODE_RECONNECTION_GRACE_TIME` am Leben – **drei Stunden** per Default. Wer das Labor in einem
zweiten Fenster öffnet, bekommt einen zweiten Extension-Host, während der erste 3333/3334/3335 noch
hält:

```
[error] GDB server: listen EADDRINUSE: address already in use 127.0.0.1:3333
[error] serial tcp:  listen EADDRINUSE: address already in use 127.0.0.1:3334
[error] http:        listen EADDRINUSE: address already in use 127.0.0.1:3335
```

Der alte Host `<588>` gab die Ports um 07:48:25 frei, der neue `<2266>` hatte um 07:43:25 einmal
erfolglos gebunden und versuchte es **nie wieder** – Flash, Debug und Konsole blieben für die
ganze Sitzung tot, sichtbar nur als `Board-Bridge nicht aktiv` aus dem `st-flash`-Shim. Der
`SocatPty`-Supervisor daneben machte es längst richtig.

Fix: `src/listen.ts` (`listenWithRetry`) wiederholt bei EADDRINUSE mit demselben Backoff wie
`SocatPty` (1 s je Versuch, gedeckelt bei 30 s) und bindet, sobald der Port frei wird. Fehler, die
Warten nicht heilt (EACCES, unauflösbarer Host), werden weiterhin einmal gemeldet und nicht
wiederholt; `dispose()` beendet die Schleife. Vier Tests gegen echte Sockets, Suite jetzt 22 Tests.

### Betriebsregeln, die dieser Lauf teuer gelernt hat

Dreimal ist die ST-Link gewedged, mit drei verschiedenen Ursachen. Keine davon war ein Fehler des
WebUSB-Pfads:

1. **NOD_F429ZI nach jedem Reset unmounten**, nicht nur nach jedem Replug. Ein `st-flash reset`
   re-enumeriert das Composite-Device, macOS mountet das MBED-Volume sofort wieder und schreibt
   Metadaten, die die ST-Link als Firmware für 0x08000000 deutet.
2. **Nie den Browser oder den Container anfassen, solange das Board verbunden ist.** Chrome hart
   zu beenden, während der DHCSR-Poller läuft, reisst einen USB-Transfer mitten durch – das ist
   Wedge-Ursache (2) aus cads-zero/CLAUDE.md, und es gilt für den Container-Restart genauso, weil
   der den Extension-Host samt Worker mitnimmt. Erst `cads.board.disconnect`, auf `usb: absent`
   warten, dann schliessen.
3. **Keine Leerlaufzeit mit verbundenem Board.** Einmal kam der Timeout ohne jedes Zutun: Flash um
   08:03:59 fertig, dann neun Minuten Leerlauf, in denen nur der DHCSR-Poller alle 100 ms
   USB-Transfers fuhr – rund 5000 nutzlose Transfers –, und um 08:13:07 `USB failure: transferOut:
   timeout`. Das passt auf Ursache (4) der cads-zero-Doku (Degradation mit Sitzungsdauer und Last).
   Lange Testläufe deshalb als **ein** Skript ohne Wartepausen fahren.
4. Zur Diagnose: `--connect-under-reset` hilft nur beim leichten Wedge. Unterscheidungsmerkmal ist
   die Versionszeile – liest `st-info` noch `V2J33S25`, ist Recovery ohne Replug möglich; steht dort
   nur `V2`, hilft nur der physische Replug.

### WebSerial: weiterhin ein manueller Klick, jetzt auch per CDP widerlegt

Die Konsole im Browser braucht unverändert einen Chooser-Klick. Zusätzlich zu den Befunden aus B3
(Preferences-Seeding wirkungslos, `SerialAllowUsbDevicesForUrls` nur auf Ebene „Obligatorisch")
wurde diesmal die CDP-Route sauber ausgeschlossen: `DeviceAccess.enable` wird auf der **Page**-
Session akzeptiert (auf der Browser-Session gibt es die Domain nicht: `'DeviceAccess.enable' wasn't
found`), aber beim Auslösen von `cads.probe.requestDevices({serial:true})` feuert
`DeviceAccess.deviceRequestPrompted` nicht – VS Codes `workbench.experimental.requestSerialPort`
öffnet den Dialog an CDP vorbei. Damit ist die Automatisierung dieses einen Klicks endgültig
ausgeschlossen; `16-board-console.png` entstand deshalb über die Mac-VCP in einem Labor-Terminal,
und die Bildunterschrift in der Doku sagt das ausdrücklich.

## Board-Verfügbarkeit, Selbstheilung und Poller-Drosselung (2026-09-03)

Ausgelöst durch den Betrieb, nicht durch die Spezifikation: drei der vier Wege, auf denen dieses
Board unbenutzbar wurde, treffen Studierende genauso wie den Testlauf. Sie sind jetzt behandelt.

### 1. „Wer hält das Board?" – Web-Lock je Browserprofil

WebUSB ist exklusiv **je Browserprozess**. Ein zweiter Lab-Tab scheiterte deshalb mit
`NetworkError: Unable to claim interface` – ununterscheidbar von einem Hardwaredefekt. `cads-probe`
nimmt jetzt vor dem ersten USB-Zugriff einen Web-Lock, benannt nach dem konkreten Gerät
(`cads-board-<vendorId>-<productId>-<serial>`). Web-Locks gelten profilweit, also über alle Tabs
und Worker hinweg, und die Entscheidung fällt, **bevor** das Gerät geöffnet wird.

`ifAvailable: true` macht Prüfung und Erwerb zu einem Schritt. `navigator.locks.query()` wird nur
für die Diagnose benutzt – ein reines query-dann-open hätte ein Zeitfenster, in dem zwei Tabs
gleichzeitig zu dem Schluss kommen, das Board sei frei.

### 2. Fehlerklassifikation statt DOMException

`diagnoseOpenFailure()` bildet das rohe Scheitern auf einen Grund ab, `messages.ts` macht daraus
deutschen und englischen Text mit **Ursache und nächstem Schritt**:

| Grund | Woran erkannt | Was der Studierende liest (gekürzt) |
|---|---|---|
| `other-tab` | unser Web-Lock ist belegt | „…wird bereits in einem anderen Tab benutzt." → Tab schließen oder dort freigeben |
| `other-app` | `Unable to claim interface`, `Access denied`, `NetworkError` | „Ein anderes Programm hält das Board." → st-flash/st-util/CubeProgrammer beenden |
| `gone` | `NotFoundError`, `InvalidStateError`, „disconnected" | „Das Board ist nicht mehr da." → Kabel prüfen |
| `denied` | `SecurityError`, `NotAllowedError` | „Freigabe zurückgezogen." → erneut verbinden, im Dialog auswählen |
| `target-unresponsive` | core id / CPUID lesen 0 oder 0xffffffff | „Der Debug-Adapter reagiert nicht mehr." → Kabel neu stecken |

Wichtig: **`other-tab` und `other-app` erzeugen im Browser exakt dieselbe Exception.** Der
Web-Lock ist das einzige Signal, das sie trennt. Ohne ihn wäre die Unterscheidung geraten.

Der Treiber bleibt frei von UI-Texten – er liefert nur den Code. Die Shims (`st-flash`, `st-info`)
bekommen denselben Grund über `/status` und drucken ihn zweisprachig; `probeText()` behält dabei
`Found 0 stlink programmers` als erste Zeile, damit Skripte, die darauf greppen, weiter laufen.

### 3. Defensiver Wiedereinstieg statt Vertrauen auf sauberes Beenden

Der häufigste Alltagsfall ist der Tab, der einfach geschlossen wird – dabei läuft **kein**
Aufräumcode, in keinem Browser. Ein Sterbeprotokoll allein reicht deshalb nicht.

`identifyWithRecovery()` nimmt beim Verbinden grundsätzlich an, dass die letzte Sitzung unsauber
endete, und stellt den Zustand aktiv her (dieselbe Logik wie bei einer halboffenen
TCP-Verbindung: nicht auf den Abbau hoffen, sondern den definierten Zustand herstellen):

1. `leaveState()` + `enterDebugSwd()` + `readCoreId()` – die Software-Hälfte von
   `--connect-under-reset`.
2. Dasselbe mit **NRST auf low**, dazwischen `resetHalt()`, danach NRST wieder freigeben.
3. Danach Schluss: `target-unresponsive`, und die Meldung mit Schaltfläche „Erneut verbinden".

Höchstens zwei Versuche. Ein Treiber, der so etwas endlos wiederholt, hält nur einen kaputten
Adapter beschäftigt und verdeckt die eigentliche Ursache.

**Empirischer Stand, ehrlich:** Die Kette ist gegen den Mock verifiziert (Test „a desynchronised
ST-Link is repaired by re-entering SWD, without a replug"), am **echten** gewedgten Adapter aber
noch nicht durchgemessen – während dieses Laufs ist kein Wedge mehr aufgetreten. Was am realen
Gerät im schweren Fall schon belegt ist: `clearHalt` auf beiden Pipes läuft durch und ändert
nichts, `device.reset()` wirft `NetworkError: Unable to reset the device`, und
`st-info --probe --connect-under-reset` half beim **leichten** Wedge (Versionszeile noch
`V2J33S25`), beim schweren nicht (Versionszeile nur noch `V2`). Diese Versionszeile ist damit das
brauchbarste Unterscheidungsmerkmal, und sie steht so auch in der Troubleshooting-Doku.
`forget()` + erneutes `requestDevice()` ist ungetestet, weil es einen Chooser-Klick erfordert.

Zusätzlich: Freigabe bei `deactivate()`, bei `onDidChangeWindowState` (unfokussiert), und
optional nach Leerlauf (`cads.board.idleReleaseSeconds`, Default 0 = aus). `visibilitychange`
und `pagehide` sind im Web-Worker-Extension-Host **nicht** erreichbar – dort gibt es kein
`document`; `onDidChangeWindowState` ist das nächstliegende Äquivalent, das VS Code anbietet.

### 4. Poller-Drosselung

Der DHCSR-Poller lief mit festen 100 ms, solange ein Board verbunden war. In einer neunminütigen
Leerlaufphase waren das rund 5000 USB-Transfers ohne jede Aussage, und am Ende fiel die
Verbindung aus. **Zuordnung offen:** parallel dazu hat ein anderer Prozess mehrfach
`st-info --probe` auf denselben ST-Link abgesetzt, was denselben Effekt erklärt. Der Poller ist
damit *eine* plausible Ursache, nicht die bewiesene – sinnlos war der Verkehr in jedem Fall.

Neu: Leiter 100 ms → 500 ms → 2 s, jeweils nach `POLL_STEPS_PER_RUNG` Ticks ohne Zustandswechsel;
jeder Halt, Lockup oder `noteActivity()` setzt auf die schnellste Stufe zurück; unfokussiertes
Fenster stoppt den Poller ganz. `usbTransfers` steht in `ProbeStatus` und in der Flash-Logzeile,
damit sinnloser Verkehr künftig sichtbar ist, statt entdeckt zu werden, wenn es zu spät ist.

### 5. Flash bleibt unantastbar

`release()` verweigert die Arbeit, solange `isFlashing` gilt, und der Flash-Pfad setzt das Flag
zwischen erstem Erase und `resetHalt()` in einem `try/finally`. Kein Freigabepfad – Kommando,
Leerlauf-Timer, Fenster-Wechsel, Timeout-Recovery – kann ein halb geschriebenes Image hinterlassen.

Nach einem Transfer-Timeout wird **genau einmal** neu verbunden (`recoverAfterTimeout()`).
Scheitert das erneut, gilt das Board als getrennt und die Nutzerführung erscheint; endlose
Wiederholungen halten nur den Adapter beschäftigt.

### 6. Massenspeicher an der Wurzel

`scripts/setup-host-macos.sh` trägt idempotent `LABEL=NOD_F429ZI none msdos rw,noauto` in
`/etc/fstab` ein und nimmt das Volume von Spotlight aus; `--undo` nimmt beides zurück, und das
Skript zeigt jede Änderung vorher an. `scripts/60-cads-stlink.rules` macht dasselbe unter Linux
und erteilt zusätzlich die USB-Rechte, ohne die der Browser das Gerät nicht öffnen kann.
**Ausgeführt wurde das Skript hier nicht** – ein Eingriff in `/etc/fstab` gehört dem Besitzer des
Rechners.

Zur Adapter-Firmware ohne Massenspeicher: STs Upgrade-Werkzeug STSW-LINK007 bietet eine solche
Variante an. Auf diesem Rechner ist das Werkzeug **nicht installiert** (weder in `/Applications`
noch als `STLinkUpgrade` im Pfad), und ich habe die ST-Link-Firmware **nicht** angefasst. Ein
fehlgeschlagenes Adapter-Firmware-Update macht den Adapter unbrauchbar; das entscheidet der
Operator. In der Doku steht die Rangfolge Firmware ohne Massenspeicher > fstab-Eintrag >
Aushänge-Dienst, mit dem Firmware-Punkt ausdrücklich als „hier nicht verifiziert" markiert.

### Tests

`cads-probe` 35 (Lock-Konkurrenz, Namensstabilität, Verhalten ohne Web-Locks, fünf
Klassifikationsfälle, geglückte und aufgegebene Recovery, `release()` gibt den Lock frei,
Flash-Schutz, Poller-Backoff, Funkstille im Leerlauf), `cads-board-bridge` 34 (jede Meldung nennt
Ursache und Schritt in beiden Sprachen, keine DOMException-Formulierung dringt durch, Shim-Text
zweisprachig und leer bei verbundenem Board). Beide Extensions bauen.

### Offen: „Could not read registers; remote failure reply '01'" (2026-09-03)

Beim Beenden einer Debugsitzung erschien **einmal** eine rote Zeile in der Debug-Konsole:

```
Breakpoint 1, main () at /home/coder/workspace/cads-zero/targets/itsboard/main.c:14
14          cads_bringup_run();
Could not read registers; remote failure reply '01'
```

Sie ist in einem Screenshot festgehalten (das Bild wurde aus der Doku wieder entfernt – ein
Tutorialbild darf keinen Fehler zeigen, den der Text nicht erklärt). Die Sitzung selbst war in
Ordnung: Board danach `verbunden · läuft`, Firmware lief weiter.

**Ursache unbekannt.** Vier Reproduktionsversuche auf echter Hardware (ein voller
Launch-Zyklus, drei Attach-Zyklen mit absichtlich kurzem Abstand zwischen Continue und Stop)
blieben sauber, die Konsole endete jedes Mal mit `GDB session ended. exit-code: 0`.

Die naheliegende Erklärung ist **widerlegt**: `k` und `D` geben das Target frei, bevor sie den
Socket schließen, also schien ein Zeitfenster zu existieren, in dem GDBs letztes `g` auf einen
wieder laufenden Kern trifft und nur mit `E01` beantwortet werden kann. Das kann nicht passieren –
`feed()` reiht **jedes** Paket über `enqueue()` in eine einzige serialisierte Queue ein, ein
`g` wird also erst nach dem Ende des `k`-Handlers bearbeitet, und `send()` schweigt, sobald
`close()` gelaufen ist. Eine testweise Umstellung (erst schließen, dann freigeben) wurde deshalb
**zurückgenommen**: sie behebt nichts und macht das Resume-on-Disconnect unsicherer, weil ein in
diesem Moment abgeräumter Extension-Host den Kern angehalten zurücklassen könnte – genau das, was
der Resume verhindern soll.

Geblieben ist ein Charakterisierungstest (`GdbSession teardown answers nothing once it has
accepted a kill or detach`), der die Serialisierung festnagelt, damit niemand die widerlegte
Erklärung nachträglich wahr macht, indem er die Paketbearbeitung nebenläufig macht.

**Zweite Beobachtung, ebenfalls offen:** Im selben Lauf kam 130 ms *nach* `GDB client
disconnected` noch ein `event debug-stop {"reason":"halt","pc":3758157104}`. `3758157104` ist
`0xE000ED30`, die Adresse des DFSR – kein plausibler Programmzähler. Das sieht nach einem
verschobenen Lesevorgang aus (Antwort einer anderen Transaktion), also nach genau der Art von
Desynchronisation, die später als Datenmüll auffällt. Einmal gesehen, nicht reproduziert.

Beides ist bewusst als **offen** notiert statt als behoben: ein spekulativer Fix für ein
unverstandenes Symptom ist schlimmer als eine ehrliche Lücke.
