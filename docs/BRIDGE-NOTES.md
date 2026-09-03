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
